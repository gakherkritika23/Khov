---
name: stage-1b-csv-export
description: >
  Converts a Playwright test-cases.json (output of Stage 1 test case generation)
  into a downloadable CSV file with columns: TCID, Priority, Summary, Steps,
  Expected Result. Use this skill whenever the user wants to export, download,
  or get a spreadsheet/CSV of their generated test cases. Triggers include:
  "export test cases to CSV", "give me a spreadsheet of these tests",
  "download the test cases", "turn the JSON into a CSV", or any request to
  convert Stage 1 output into a tabular format. This is a terminal stage —
  its output is not used as input for any other workflow stage.
---

# Stage 1b: CSV Export

Convert a `test-cases.json` file (from Stage 1) into a well-formatted CSV
ready to share with stakeholders or import into a test management tool.

## Input

A `test-cases.json` object with a `test_cases` array. Each item must have:
- `id` — test case ID (e.g. `TC-001`)
- `priority` — `high`, `medium`, or `low`
- `title` — short description of the test
- `steps` — array of step strings
- `expected_result` — string

The user may paste the JSON directly, upload the file, or reference it from
a previous message in the conversation.

## Output

A `.csv` file generated **locally in Claude** (not committed to the branch).
CSV is for local use or stakeholder sharing only —
it does not belong in the git repository.

Use `{jira-id}-test-cases.csv` as the filename and write it using the Write tool
directly (no Python script needed). Present the file path to the user when done.

## CSV Format

```
"TCID","Priority","Summary","Steps","Expected Result"
"TC-001","High","Block is visible on page","1. Navigate to page\n2. Locate block","Block is visible"
```

Rules:
- Header row is always first, exact column names: `TCID`, `Priority`, `Summary`, `Steps`, `Expected Result`
- `Priority` values are title-cased: `High`, `Medium`, `Low`
- `Steps` — join the steps array into a single string, numbered, separated by `\n` (literal backslash-n so it fits in one cell)
- All fields are double-quoted to safely handle commas and newlines
- Encoding: UTF-8

## Steps to Execute

1. Parse the `test_cases` array from the input JSON (from message context or uploaded file)
2. Use the Write tool to write the CSV directly to a local temp path (e.g. `C:\Users\kritika\Downloads\{jira-id}-test-cases.csv` or the current working directory)
3. Do NOT commit or stage the CSV file — it is local only
4. Tell the user the file path so they can open it

## Example

**Input (one test case):**
```json
{
  "id": "TC-001",
  "title": "Block is visible on the home page",
  "priority": "high",
  "steps": [
    "Navigate to the home page",
    "Scan the page for the hero block"
  ],
  "expected_result": "The hero block is visible on the page"
}
```

**Output row:**
```
"TC-001","High","Block is visible on the home page","1. Navigate to the home page\n2. Scan the page for the hero block","The hero block is visible on the page"
```

## Notes

- This is a **terminal stage** — the CSV is not used as input by any other stage
- If `steps` is missing or empty for a test case, write an empty string for that cell
- If `type` is `manual`, still include it — no rows are excluded
- Name the output file `{jira-id}-test-cases.csv` if a `metadata.jira_id` is present in the JSON, otherwise use `test-cases.csv`
