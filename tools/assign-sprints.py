#!/usr/bin/env python3
"""Assigns project items to their respective Sprints:
- 158 completed issues -> 'Completed Foundation (Epics 1-18)'
- 8 active Epic 19 issues -> 'Sprint 1 (Epic 19 - Platform)'
- Upcoming Epics 20 & 21 -> No Sprint (Backlog)
"""

import json
import subprocess
import time
import urllib.request
from pathlib import Path

PROJECT_ID = "PVT_kwDOFH0rD84Bnzfi"
SPRINT_FIELD_ID = "PVTIF_lADOFH0rD84BnzfizhmW1h8"

COMPLETED_SPRINT_ID = "c60da24d"
ACTIVE_SPRINT_ID = "b1b54d98"

EPIC_19_ACTIVE = {457, 458, 460, 461, 462, 463, 464, 465}


def get_token() -> str:
    return subprocess.check_output(["gh", "auth", "token"], text=True).strip()


def run_graphql(query: str, token: str) -> dict:
    url = "https://api.github.com/graphql"
    payload = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "tkr-sprint-assigner",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_all_project_items(token: str) -> list[dict]:
    items = []
    cursor = None
    while True:
        after_clause = f', after: "{cursor}"' if cursor else ""
        query = f"""
        query {{
          node(id: "{PROJECT_ID}") {{
            ... on ProjectV2 {{
              items(first: 100{after_clause}) {{
                nodes {{
                  id
                  fieldValueByName(name: "Sprint") {
                    ... on ProjectV2ItemFieldIterationValue {
                      iterationId
                    }
                  }
                  content {
                    ... on Issue {
                      number
                      state
                    }
                  }
                }}
                pageInfo {{
                  hasNextPage
                  endCursor
                }}
              }}
            }}
          }}
        }}
        """
        data = run_graphql(query, token)
        conn = data["data"]["node"]["items"]
        items.extend(conn["nodes"])
        if not conn["pageInfo"]["hasNextPage"]:
            break
        cursor = conn["pageInfo"]["endCursor"]
    return items


def main():
    token = get_token()
    print("Fetching all project items...", flush=True)
    items = get_all_project_items(token)
    print(f"Loaded {len(items)} items from project.", flush=True)

    completed_count = 0
    active_count = 0

    for idx, item in enumerate(items, 1):
        content = item.get("content") or {}
        num = content.get("number")
        state = content.get("state")
        if not num:
            continue

        item_id = item["id"]
        target_sprint = None

        if num in EPIC_19_ACTIVE:
            target_sprint = ACTIVE_SPRINT_ID
            active_count += 1
        elif state == "CLOSED":
            target_sprint = COMPLETED_SPRINT_ID
            completed_count += 1

        current_sprint = (item.get("fieldValueByName") or {}).get("iterationId")
        if target_sprint and current_sprint != target_sprint:
            mutation = f"""
            mutation {{
              updateProjectV2ItemFieldValue(input: {{
                projectId: "{PROJECT_ID}",
                itemId: "{item_id}",
                fieldId: "{SPRINT_FIELD_ID}",
                value: {{ iterationId: "{target_sprint}" }}
              }}) {{
                projectV2Item {{ id }}
              }}
            }}
            """
            run_graphql(mutation, token)
            print(f"Assigned #{num} to sprint {target_sprint}", flush=True)
            time.sleep(0.1)
    print(f"\nDone! Assigned {active_count} to Active Sprint 1 and {completed_count} to Completed Foundation.", flush=True)


if __name__ == "__main__":
    main()
