---
name: stage-2-human-review
description: >
  Stage 2: Present Stage 1 test cases for human review. Allow the engineer to
  approve, reject, or edit test cases and mark each as automated vs manual.
  HARD GATE — Stage 3 cannot begin without explicit approval.
---

# Stage 2 — Human Review (Hard Gate)

## Purpose
Present generated test cases for review. Collect human decisions. Produce an
approved test plan that feeds Stage 3.

## Input
The JSON output from Stage 1 (`test_cases` array + `metadata`).

## Review Presentation

### Summary Table
```
| ID     | Title                          | Priority | Type      |
|--------|-------------------------------|----------|-----------|
| TC-001 | Valid form submission          | high     | automated |
| TC-002 | Missing required email field   | high     | automated |
| TC-003 | Modal opens on CTA click       | high     | manual    |
```

### Decision Options Per Test Case
1. **APPROVE as-is** — include in automation
2. **APPROVE as manual** — include in plan, exclude from automation
3. **EDIT** — engineer provides updated steps/expected result/priority
4. **REJECT** — exclude entirely

### Collecting Decisions
Support bulk and per-case:
- "Approve all, set TC-003 and TC-007 to manual"
- Per-case: `TC-001: approve`, `TC-004: edit -> [changes]`, `TC-005: reject`

## Approval Output Schema

```json
{
  "metadata": {
    "jira_id": "KHOV-XXX",
    "story_title": "string",
    "approved_at": "ISO8601",
    "total_approved": 0,
    "to_automate": 0,
    "manual_only": 0,
    "rejected": 0
  },
  "automated_cases": [ /* approved test case objects */ ],
  "manual_cases": [ /* manual test case objects */ ],
  "rejected_cases": [ { "id": "TC-005", "reason": "string" } ]
}
```

## Common Rejection Patterns

Use this table to triage test cases quickly during review:

| Test type | Typical decision | Common reason |
|---|---|---|
| Text color / CSS styling | **Reject** | "Color/styling automation out of scope" |
| Alignment / visual positioning | **Reject** | "Alignment validation out of scope for automation" |
| Toggle-OFF hidden state | **Reviewer call** | May be rejected: "FE verified with toggles ON only" |
| Test steps require CMS interaction (login, toggle, set field) | **Approve as manual** | Can't automate CMS |
| Related FE-only version (assume CMS pre-configured) | **Approve as automated** | Navigate + verify rendered result |
| Modal DOM-visibility check (container visible / not visible) | **Approve as automated** | Confirmed pattern |
| Modal visual layout / animation / exact content | **Approve as manual** | Requires visual inspection |

## Final Gate

Before proceeding, ask explicitly:
> "X test cases approved for automation, Y manual, Z rejected.
> **Are you ready to proceed to Stage 3?** Type YES to continue."

Only proceed after explicit YES.

## Handoff
Pass `automated_cases` array to **Stage 3 — Locator Discovery**.
