#!/usr/bin/env python3
"""Links child story issues to parent Epic issues in GitHub:
- Epic 19 (#489): #451 - #465
- Epic 20 (#490): #466 - #479
- Epic 21 (#491): #480 - #487
"""

import json
import subprocess
import time
import urllib.request

REPO = "tk-reawakened/rpgtoolkit-reawakened"
PROJECT_ID = "PVT_kwDOFH0rD84Bnzfi"
SPRINT_FIELD_ID = "PVTIF_lADOFH0rD84BnzfizhmW1h8"
SPRINT_1_ID = "b1b54d98"
SPRINT_2_ID = "d62109c0"
SPRINT_3_ID = "62f3c52a"

EPIC_MAPPINGS = {
    489: (list(range(451, 466)), SPRINT_1_ID),  # Epic 19: 451-465 -> Sprint 1
    490: (list(range(466, 480)), SPRINT_2_ID),  # Epic 20: 466-479 -> Sprint 2
    491: (list(range(480, 488)), SPRINT_3_ID),  # Epic 21: 480-487 -> Sprint 3
}


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
            "User-Agent": "tkr-epic-linker",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get_issue_node_ids(numbers: list[int], token: str) -> dict[int, str]:
    # Query in batches of 50
    node_ids = {}
    for i in range(0, len(numbers), 40):
        chunk = numbers[i : i + 40]
        fields = "\n".join(f"issue_{num}: issue(number: {num}) {{ id }}" for num in chunk)
        q = f"""
        query {{
          repository(owner: "tk-reawakened", name: "rpgtoolkit-reawakened") {{
            {fields}
          }}
        }}
        """
        data = run_graphql(q, token)
        repo_data = data.get("data", {}).get("repository", {})
        for num in chunk:
            issue_data = repo_data.get(f"issue_{num}")
            if issue_data:
                node_ids[num] = issue_data["id"]
    return node_ids


def main():
    token = get_token()
    all_needed = list(EPIC_MAPPINGS.keys())
    for children, _ in EPIC_MAPPINGS.values():
        all_needed.extend(children)

    print("Fetching issue IDs...", flush=True)
    node_ids = get_issue_node_ids(all_needed, token)

    for epic_num, (children, sprint_id) in EPIC_MAPPINGS.items():
        epic_id = node_ids.get(epic_num)
        if not epic_id:
            print(f"Missing epic {epic_num} ID!")
            continue

        print(f"\nLinking Epic #{epic_num} with {len(children)} sub-issues...", flush=True)

        # 1. Add epic to project if not already
        add_q = f"""
        mutation {{
          addProjectV2ItemById(input: {{ projectId: "{PROJECT_ID}", contentId: "{epic_id}" }}) {{
            item {{ id }}
          }}
        }}
        """
        try:
            item_res = run_graphql(add_q, token)
            epic_item_id = item_res.get("data", {}).get("addProjectV2ItemById", {}).get("item", {}).get("id")
            if epic_item_id and sprint_id:
                # Set Sprint on Epic
                sprint_m = f"""
                mutation {{
                  updateProjectV2ItemFieldValue(input: {{
                    projectId: "{PROJECT_ID}",
                    itemId: "{epic_item_id}",
                    fieldId: "{SPRINT_FIELD_ID}",
                    value: {{ iterationId: "{sprint_id}" }}
                  }}) {{ projectV2Item {{ id }} }}
                }}
                """
                run_graphql(sprint_m, token)
        except Exception as e:
            print(f"Note on project add: {e}")

        # 2. Add each child sub-issue
        for child_num in children:
            child_id = node_ids.get(child_num)
            if not child_id:
                continue
            mutation = f"""
            mutation {{
              addSubIssue(input: {{ issueId: "{epic_id}", subIssueId: "{child_id}" }}) {{
                subIssue {{ number }}
              }}
            }}
            """
            try:
                run_graphql(mutation, token)
                print(f"Linked #{child_num} -> Epic #{epic_num}", flush=True)
            except Exception as e:
                # Might already be linked
                print(f"#{child_num} note: {e}", flush=True)
            time.sleep(0.15)

    print("\nAll Epics and Sub-issues linked successfully!", flush=True)


if __name__ == "__main__":
    main()
