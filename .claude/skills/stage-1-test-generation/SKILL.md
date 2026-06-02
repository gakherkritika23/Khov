---
name: stage-1-test-generation
description: >
  Generates structured test cases (test-cases.json) from Jira stories,
  requirements, images, and content mapping tables for khov.com.
  Use this skill whenever the user says "Stage 1", "generate test cases",
  "call skill 1", "create test cases", or provides a Jira story, requirements,
  or screenshots and wants test cases out of them. Accepts any combination of:
  plain text stories, pasted requirements, uploaded images of Jira tickets,
  UI screenshots, and content mapping tables. Always asks clarifying questions
  before generating if key information is missing.
---

# Stage 1: Test Case Generation

Generate a `test-cases.json` file from Jira stories, requirements, and/or images.
This is the entry point of the workflow — output feeds Stage 2 (human review)
or Stage 1b (CSV export).

---

## Input — Accept Any Combination

Users work in different ways. Accept whatever they provide:

| Input type | How to handle |
|---|---|
| Plain text Jira story | Extract page, block, content model, AC, implementation notes |
| Pasted requirements | Use as-is; infer missing fields from context |
| Images of Jira tickets / content mapping tables | Read field names, mapped-to values, and notes from the image — do not ask the user to retype them |
| UI screenshots | Use to infer layout, visible fields, CTAs, and block structure |
| Mix of the above | Combine all sources; images take priority over text if they conflict |

**Never ask the user to retype content that is visible in an uploaded image.**
Tables in Jira break when copy-pasted — images are the preferred input format.

---

## Step 1 — Extract Requirements

From all provided inputs, extract:

- **Jira ID** — from ticket header or URL (e.g. `KHOV-1298`); use `UNKNOWN` if not visible
- **Page** — which page the block lives on (e.g. Home Page, Community Page)
- **Block** — the specific block being tested (e.g. Hero Block, Intro Block)
- **Content Model** — the CMS model driving the block (if applicable)
- **Field mappings** — Field name → Mapped to (from content mapping table)
- **Acceptance criteria** — numbered or bulleted requirements
- **Implementation notes** — conditional logic, ordering rules, fallback chains, edge cases
- **UI layout** — from screenshots: image positions, CTA labels, text hierarchy

---

## Step 2 — Brainstorm & Analyze Requirements

**STOP before generating any test cases.** First, brainstorm on the requirements
and present your analysis to the user. This step is mandatory — never skip it.

### 2a — Summarize What You Understood

Present a structured summary of what you extracted from the inputs:

- **Story scope**: What is being built/changed, in one sentence
- **Page & block**: Where this lives on the site
- **Key field mappings**: List the CMS fields → UI display mappings you found
- **Business rules**: Conditional logic, ordering, fallbacks, caps, deduplication
- **CTAs identified**: Buttons/links and their expected behaviour (if known)
- **What's NOT covered**: Anything explicitly out of scope or not mentioned

Format this as a clear, scannable list — not a wall of text.

### 2b — Identify Gaps, Risks & Assumptions

Think critically about the requirements. Call out:

- **Ambiguities**: Where the requirements could be interpreted multiple ways
- **Missing information**: Fields, behaviours, or edge cases not addressed
- **Assumptions you would make**: State them explicitly so the user can confirm or correct
- **Potential edge cases**: Scenarios the story doesn't mention but that could break
- **Dependencies**: Other blocks, pages, or features this relies on

**Be specific.** Don't say "there might be edge cases" — say exactly what they are.
Don't invent requirements that aren't there. Only flag what is genuinely unclear
or missing based on the provided inputs.

### 2c — Ask Clarifying Questions

Based on gaps identified in 2b, ask targeted questions. Rules:

- Do NOT ask questions that can be answered from the images or requirements already provided
- Do NOT hallucinate or assume information not present in the inputs
- Only ask about things that are genuinely missing or ambiguous
- Group questions by theme (e.g., "About the CTA", "About empty states")
- Maximum 5 questions per round
- Use the AskUserQuestion tool with button options where possible

Common question categories:

- **CTA behaviour**: "What does the '[CTA Label]' button do — open a modal, navigate to a new page, or expand inline?"
- **Empty/missing field behaviour**: "Should we test cases where [field] is empty, or is it always populated?"
- **Fallback chains**: "Should each fallback level be a separate test case, or one combined scenario?"
- **Edge cases**: "What should happen when [condition] — is this defined or out of scope?"
- **Scope boundaries**: "Is [related feature] in scope for this story or handled separately?"
- **Data constraints**: "Are there character limits, required formats, or validation rules for [field]?"

### 2d — Wait for User Confirmation

After presenting your analysis and questions, **wait for the user to respond**
before proceeding to test case generation. Do NOT generate test cases until
the user confirms the analysis is correct or provides answers to your questions.

If the user says "looks good" or "proceed", move to Step 3.
If the user corrects something, update your understanding and re-confirm if needed.

---

## Step 3 — Generate Test Cases

### Test Case Rules

- Cover each field mapping with at least one test case verifying correct data display
- Cover all conditional logic and business rules (ordering, fallbacks, deduplication, caps)
- Cover all CTAs — visibility and behaviour
- Cover layout/structure when a UI screenshot is provided
- Mark as `manual` when: requires physical device, visual inspection of animations,
  CMS asset setup that can't be automated, or behaviour depends on external systems
- Default to `automated` for all data mapping, visibility, navigation, and logic tests

### What NOT to Generate

- **No accessibility test cases** — do not generate test cases for ARIA labels,
  colour contrast, screen reader behaviour, keyboard navigation, or any other
  accessibility/a11y concerns. These are out of scope for this workflow.

### Priority Assignment

| Condition | Priority |
|---|---|
| Core field mapping (title, image, description) | `high` |
| CTA visibility and behaviour | `high` |
| Conditional display logic (show/hide, deduplication) | `high` |
| Fallback chains | `high` |
| Layout / structural correctness | `high` |
| Edge cases with specific data setup | `medium` |
| Cross-page consistency | `medium` |
| Device-specific behaviour (mobile call, carousel) | `medium` |

### JSON Output Format

```json
{
  "metadata": {
    "jira_id": "KHOV-XXXX",
    "story_title": "Page Name: Block Name",
    "page": "Page Name",
    "block": "Block Name",
    "content_model": "ContentModelName",
    "generated_at": "YYYY-MM-DD",
    "total_cases": 0,
    "automated_count": 0,
    "manual_count": 0
  },
  "test_cases": [
    {
      "id": "TC-001",
      "title": "Short descriptive title",
      "type": "automated",
      "priority": "high",
      "steps": [
        "Step one",
        "Step two",
        "Step three"
      ],
      "expected_result": "Clear, specific expected outcome",
      "manual_reason": "Only include this field for manual test cases"
    }
  ]
}
```

### Step writing rules

- Steps should be concrete and sequential
- Each step is a string in the array — no numbering inside the string (numbering is added at export)
- Start with any required data setup steps (e.g. "Set a value in [Field] in the content model")
- End with the observation step (e.g. "Check the displayed value")
- Keep steps concise — one action per step

---

## Step 4 — End with Next Stage Prompt

After outputting the JSON, always end with:

> **Summary:** X test cases — Y automated, Z manual.
>
> Where would you like to go next?
> - ✅ **YES** → Stage 2 (human review & approval)
> - 📄 **CSV** → Stage 1b (export to CSV)

---

## General Patterns to Apply

These patterns commonly recur — apply them proactively:

**Content mapping tests**: Always generate one test case per field mapping row
verifying the displayed value matches the CMS field.

**Image position tests**: When multiple images are mapped to specific positions
(top, bottom-left, bottom-right), test each position independently AND test the
full layout together.

**Conditional display logic**: When the same values can be equal or different
(e.g. two addresses), always generate:
- One TC for when they are the same (deduplication behaviour)
- One TC for when they are different (both shown)

**Fallback chains** (e.g. phone number from different sources):
Generate one separate TC per fallback level, not a single combined TC.

**CTA modals**: Split by what the test checks:
- **`automated`**: CTA opens modal — verify the modal container is visible in
  the DOM and contains at least one element
- **`automated`**: Close button dismisses modal — verify the container is no
  longer visible after clicking close
- **`manual`**: When the test requires visual inspection of modal layout,
  animation, or exact rendered content

**Text format changes**: When a story updates displayed text format, always include
a TC that verifies the old format is gone and the new format is present.

**Phone number / call initiation on mobile**: Always `manual` — requires a
physical device.

**Text color / CSS styling**: Do not generate automated test cases for CSS color
values or computed style properties. Mark as `manual` if needed.

**Alignment / positioning**: Do not generate automated test cases that verify
visual alignment or layout. Mark as `manual` if needed.

**Toggle-OFF hidden state**: Generate toggle-OFF tests (e.g., "CTA not shown
when toggle is OFF") — they are valid. Note in Stage 2 that reviewers may reject
them if the team tests toggled-ON states only.

**CMS configuration steps inside test steps**: When a test case requires CMS
changes as part of execution, mark as `manual`. Generate the related FE-only test
as a separate `automated` case. Always produce both where applicable:
- `manual` — CMS change + FE verification combined
- `automated` — FE-only: assume CMS is pre-configured, verify the rendered result

**CSV export**: Steps use `\n` as separator between numbered steps.
This is intentional — test management importers require this format.
