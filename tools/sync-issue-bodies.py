#!/usr/bin/env python3
"""Syncs full descriptions, verifications, and references from tickets.toml to GitHub issues."""

import json
import re
import subprocess
import time
import tomllib
import urllib.error
import urllib.request
from pathlib import Path

REPO = "tk-reawakened/rpgtoolkit-reawakened"

EPIC_AREA_MAP = {
    "epic-platform-baseline": "tooling",
    "epic-legacy-formats": "formats",
    "epic-tk2-support": "core",
    "epic-rpgcode-vm": "core",
    "epic-board-rendering": "core",
    "epic-movement-triggers": "core",
    "epic-audio-synth": "synth",
    "epic-rpgcode-first-class-functions": "core",
    "epic-rpgcode-platform": "core",
    "epic-actors": "core",
    "epic-media-objects": "synth",
}


def get_gh_token() -> str:
    res = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, check=True)
    return res.stdout.strip()


def gh_patch_issue(issue_num: int, body: str, token: str) -> bool:
    url = f"https://api.github.com/repos/{REPO}/issues/{issue_num}"
    payload = json.dumps({"body": body}).encode("utf-8")
    req = urllib.request.Request(url, data=payload)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "tkr-body-syncer")
    req.method = "PATCH"

    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return True
        except urllib.error.HTTPError as e:
            if e.code in (403, 429):
                retry_after = int(e.headers.get("Retry-After", "10"))
                print(f"[Rate limit] HTTP {e.code}, sleeping {retry_after}s...", flush=True)
                time.sleep(retry_after)
                continue
            body_err = e.read().decode("utf-8")
            print(f"Error patching #{issue_num}: HTTP {e.code}: {body_err}", flush=True)
            return False
        except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
            wait_time = 2 * (attempt + 1)
            print(f"[Network error] {e}, retrying in {wait_time}s...", flush=True)
            time.sleep(wait_time)
            continue
    return False


def main():
    token = get_gh_token()
    root = Path(__file__).resolve().parent.parent
    initiative_dir = root / "_bmad-output/initiative-rpgtoolkit-reawakened"

    epics = [p for p in initiative_dir.iterdir() if p.is_dir() and (p / "tickets.toml").is_file()]
    epics.sort()

    updated = 0
    total = 0

    for epic_dir in epics:
        epic_name = epic_dir.name
        area = EPIC_AREA_MAP.get(epic_name, "core")
        toml_path = epic_dir / "tickets.toml"

        with toml_path.open("rb") as f:
            data = tomllib.load(f)

        entries = data.get("entry", [])
        for e in entries:
            tracker_id = str(e.get("tracker_id", "")).strip()
            if not tracker_id.startswith("#"):
                continue
            issue_num = int(tracker_id.removeprefix("#"))
            total += 1

            desc = e.get("description", "")
            verify = e.get("verify", "")
            refs = e.get("references", [])
            covers = e.get("covers", [])
            after = e.get("after", [])

            lines = [f"## Goal & Description\n{desc}\n"]
            if verify:
                lines.append(f"## Acceptance Criteria / Verification\n{verify}\n")
            if refs or covers:
                lines.append("## References")
                for c in covers:
                    lines.append(f"- Spine capability: `{c}`")
                for r in refs:
                    lines.append(f"- {r}")
                lines.append("")
            if after:
                lines.append(f"## Prerequisites\n- Depends on: {', '.join(str(a) for a in after)}\n")
            lines.append("## Guard-Rails (docs/guardrails.md)")
            lines.append("- [x] **G7 Clean-Room**: Implemented from `docs/` only. No legacy GPL source consulted.")
            if area == "core":
                lines.append("- [ ] **G1 Step-Machine**: Script VM state remains plain JSON data.")
                lines.append("- [ ] **G2/G3 Core Boundaries**: `core` touches no I/O, DOM, Node, or non-deterministic APIs.")

            body = "\n".join(lines)
            if gh_patch_issue(issue_num, body, token):
                updated += 1
                if updated % 20 == 0 or updated == total:
                    print(f"Synced {updated} issue bodies...", flush=True)
            time.sleep(0.3)

    print(f"\nAll done! Updated {updated}/{total} issue bodies.", flush=True)


if __name__ == "__main__":
    main()
