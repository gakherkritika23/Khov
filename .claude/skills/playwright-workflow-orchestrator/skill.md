---
name: playwright-workflow-orchestrator
description: >
  Master orchestrator for a 7-stage Playwright + TypeScript automation workflow
  for khov.com. Use this skill whenever the user mentions Playwright tests,
  test automation, writing specs, or working with Jira stories and test coverage —
  even if they don't say "workflow" or "orchestrator". Triggers include: "write a
  test for this story", "automate this scenario", "generate Playwright specs",
  "run the test pipeline", "create a POM", "find locators", "push test files to
  Git", or any request involving end-to-end test creation from requirements to
  committed code. Each stage is composable — the user can enter at any point.
---

# Playwright Automation Workflow — khov.com

## Overview

An 8-stage composable workflow for building production-quality Playwright tests,
from a Jira user story all the way to a committed branch.

```
Jira Story
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  Stage 1: Test Case Generation                      │
│  Input:  Jira story text                            │
│  Output: {jira-id}-test-cases.json                  │
│  Skill:  stage-1-test-generation/SKILL.md           │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  Stage 2: Human Review  ⛔ HARD GATE               │
│  Input:  test-cases.json                            │
│  Output: {jira-id}-approved-plan.json               │
│  Skill:  stage-2-human-review/SKILL.md              │
└────────────────────────┬────────────────────────────┘
                         │ (requires explicit YES)
              ┌──────────┘
              │   OR ──────────────────────────────────────────┐
              │                                               ▼
              │                         ┌─────────────────────────────────────────────────────┐
              │                         │  Stage 1b: CSV Export  📄 TERMINAL                  │
              │                         │  Alternative to Stage 2 — does NOT feed Stage 3+    │
              │                         │  Input:  test-cases.json                            │
              │                         │  Output: {jira-id}-test-cases.csv (local only)      │
              │                         │  Skill:  stage-1b-csv-export/SKILL.md               │
              │                         └─────────────────────────────────────────────────────┘
              ▼
┌─────────────────────────────────────────────────────┐
│  Stage 3: Locator Discovery                         │
│  Input:  approved-plan.json (automated_cases)       │
│  Output: locator discovery summary (verified         │
│          selectors table) + confirmed branch name   │
│  Skill:  stage-3-locator-discovery/SKILL.md         │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  ⛔ WORKTREE GATE (between Stage 3 and Stage 4)     │
│  REQUIRED before any .ts files are written          │
│  Create a git worktree:                             │
│    EnterWorktree → feat/khov-{id}-{block-slug}      │
│    e.g. feat/khov-394-hero-block                    │
│  All Stages 4–7 run inside the worktree             │
│  NEVER write POM/spec files to main repo directly   │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  Stage 4: POM Generation                            │
│  Input:  discovered locators                        │
│  Output: page-objects/{Name}Page.ts (updated)       │
│  Skill:  stage-4-pom-generation/SKILL.md            │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  Stage 5: Spec File Creation                        │
│  Input:  POM files + approved-plan.json             │
│  Output: tests/{pageName}.spec.ts (updated)         │
│  Skill:  stage-5-spec-generation/SKILL.md           │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  Stage 6: Test Execution                            │
│  Input:  spec file + POM files                      │
│  Output: pass/fail report + suggested fixes         │
│  Skill:  stage-6-test-execution/SKILL.md            │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  Stage 6b: Code Review  ⛔ PRE-COMMIT GATE         │
│  Input:  POM + spec + test data files               │
│  Output: pass/fail with violation list              │
│  Skill:  stage-6b-code-review/SKILL.md              │
└────────────────────────┬────────────────────────────┘
                         │ (must pass before commit)
                         ▼
┌─────────────────────────────────────────────────────┐
│  Stage 7: Git Push                                  │
│  Input:  all generated files                        │
│  Output: committed branch on remote                 │
│  Skill:  stage-7-git-push/SKILL.md                  │
└─────────────────────────────────────────────────────┘
```

## Data Flow Summary

| From Stage | Output Passed Forward              | To Stage |
|------------|------------------------------------|----------|
| Stage 1    | `test_cases`, `metadata`           | Stage 2  |
| Stage 2    | `automated_cases`, `metadata`      | Stage 3  |
| Stage 3    | locator summary table, confirmed branch name, worktree path, unresolved list | Stage 4  |
| Stage 4    | POM file path, class name, new method names, unresolved stubs list | Stage 5  |
| Stage 5    | Spec file path, automated TC count, manual TC list | Stage 6  |
| Stage 6    | POM + spec + data file paths, pass/fail results, manual TC count | Stage 6b |
| Stage 6b   | Pass/fail verdict + violation list | Stage 7  |

## Project File Structure (Actual)

```
project-root/             ← <repo-root>
├── playwright.config.ts
├── tsconfig.json
├── package.json
├── environment/            ← dev.env / uat.env / stage.env / prod.env (per-env BASE_URL)
├── page-objects/           ← Page Object Model classes
│   ├── basePage.ts         ← Base class with click(), type(), navigate(), getText(), etc.
│   └── ...                 ← One POM per page
├── tests/                  ← Test spec files
│   ├── baseTest.ts         ← Extends Playwright test with Allure hooks (import test from here)
│   └── ...                 ← One spec per page (all blocks in one file)
└── utils/
    ├── validator.ts        ← Static Validator class (requireVisible, requireHidden, requireText, requireUrlContains)
    ├── apiUtils.ts         ← waitForApi(page, endpoint), apiResponseData<T>(page, endpoint)
    ├── stringUtils.ts      ← Text normalization: escapeRegExp, normalizeText
    ├── constants.json      ← Expected text values and page URLs keyed by page name
    └── test_data.json      ← Form inputs and API endpoints (create when first needed)
```

---

## How to Use

### Auto-Detect Entry Point

Before asking the user what stage to start at, inspect what they've provided:

| If the user provides…                                        | Start at… |
|--------------------------------------------------------------|-----------|
| A Jira story (plain text or ticket ID/URL)                   | Stage 1   |
| A `test-cases.json` + wants to review/approve                | Stage 2   |
| A `test-cases.json` + wants a CSV/spreadsheet export         | Stage 1b  |
| An `approved-plan.json` file                   | Stage 3   |
| A `locators.json` file                         | Stage 4   |
| POM `.ts` files                                | Stage 5   |
| A `.spec.ts` file                              | Stage 6   |
| All generated files, wants to push             | Stage 7   |

If it's ambiguous, ask: *"What do you have so far — a Jira story, JSON files, or generated TypeScript?"*

### Full Workflow (start to finish)

Provide a Jira user story and say "Run the full automation workflow." The
orchestrator will:
1. Load `stage-1-test-generation/SKILL.md` and generate test cases
2. Present for review (Stage 2) — **wait for explicit YES before continuing**
3. Proceed through Stages 3–7 sequentially, loading each stage's SKILL.md

### Jump to a Specific Stage

Enter at any stage by providing the required input artifact:
- "I have test cases JSON, go to Stage 2" → load `stage-2-human-review/SKILL.md`
- "Export test cases to CSV" → load `stage-1b-csv-export/SKILL.md` *(terminal — does not feed Stage 3+)*
- "I have the approved plan, run locator discovery" → load `stage-3-locator-discovery/SKILL.md`
- "Generate the POM from these locators" → load `stage-4-pom-generation/SKILL.md`
- "Write the spec" → load `stage-5-spec-generation/SKILL.md`
- "Run the tests" → load `stage-6-test-execution/SKILL.md`
- "Review code before commit" → load `stage-6b-code-review/SKILL.md`
- "Push to Git" → load `stage-7-git-push/SKILL.md`

### Re-running a Stage

Any stage can be re-run independently. Pass the correct input JSON and the stage
will produce updated output without affecting other stages.

---

## Example Jira Story Format

Stage 1 expects a user story in this form (paste as plain text):

```
Story: KHOV-142
As a homebuyer, I want to save a floor plan to my favorites
so that I can compare options later.

Acceptance Criteria:
- User must be logged in to save a floor plan
- A filled heart icon indicates a saved plan
- Saving is persisted across sessions
- User can remove a saved plan from the favorites list
```

Ticket ID, URL, or raw story text all work. The more acceptance criteria
provided, the richer the generated test cases.

---

## Loading Sub-Stage Skills

Each stage has its own SKILL.md with detailed instructions. When you reach a
stage, use the Read tool to load it before proceeding. Skills exist at both
project level (preferred) and user level:

```
Project-level (.claude/skills/):
  Read: .claude/skills/stage-1-test-generation/SKILL.md
  Read: .claude/skills/stage-1b-csv-export/SKILL.md
  Read: .claude/skills/stage-2-human-review/SKILL.md
  Read: .claude/skills/stage-3-locator-discovery/SKILL.md
  Read: .claude/skills/stage-4-pom-generation/SKILL.md
  Read: .claude/skills/stage-5-spec-generation/SKILL.md
  Read: .claude/skills/stage-6-test-execution/SKILL.md
  Read: .claude/skills/stage-6b-code-review/SKILL.md
  Read: .claude/skills/stage-7-git-push/SKILL.md

User-level fallback (~/.claude/skills/):
  Same folder names — use if project-level is unavailable
```

**If a sub-stage skill file is not found**, do not halt — proceed using the
constraints and best practices in this file, and note to the user that the
detailed stage skill wasn't available.

---

## Error Recovery

### Stage fails to produce valid JSON
Re-run the stage with a clarifying prompt. If it fails twice, ask the user to
provide the missing information directly (e.g., page URLs for locator discovery).

### Locators not found (Stage 3)
If a required element can't be located, flag it explicitly in `locators.json`
with `"status": "manual_required"` and continue. Stage 5 will skip automation
for that case and mark it as manual in the spec.

### TypeScript compilation errors (Stages 4–5)
Fix inline before moving to Stage 6. Run `tsc --noEmit` to validate. Do not
proceed to execution with broken types.

### Tests fail in Stage 6
Produce a fix plan: list each failing test, the likely cause, and the suggested
locator or logic fix. Apply fixes to the POM or spec, then re-run. Maximum 3
fix iterations before flagging for manual investigation.

### Git push rejected (Stage 7)
Pull with rebase, resolve conflicts, and retry. If the branch already exists
remotely, use `--force-with-lease` (never bare `--force`).

---

## Constraints & Best Practices

- **Hard gate**: Stage 3 never starts without explicit Stage 2 approval
- **Worktree gate**: Stage 4 never starts without creating a git worktree first using the `EnterWorktree` tool. Branch name: `feat/khov-{id}-{block-slug}` (e.g. `feat/khov-394-hero-block`). No Jira ID: `feat/{block-slug}`. All `.ts` file writes (POM, spec, test data) happen inside the worktree at `.claude/worktrees/worktree-feat+{slug}/`. This is MANDATORY — never write generated files to the main repo directory.
- **Conventional commits**: all Git messages follow `test(scope): message [JIRA-ID]`
- **No skipped tests**: if a case can't be automated, mark it `@manual` with a comment, don't skip

---

## Framework Standards (MANDATORY)

These standards are derived from the existing codebase and MUST be followed in
all generated code.

### File Organization

- **One POM per page**: `page-objects/homePage.ts` covers ALL blocks on the
  Home page
- **One spec per page**: `tests/homePage.spec.ts` contains ALL test describe
  blocks for that page. NEVER create separate spec files per block or per Jira story
- **Add new blocks** as new `test.describe()` blocks within the existing spec file
- **Page objects live in** `page-objects/`, NOT `tests/pages/`
- **Specs live in** `tests/`, NOT `tests/specs/`

### Page Object Pattern (Stage 4)

**Locator declarations**: All locators are `readonly` properties in the class,
initialized in the constructor.

**Locator strategy priority**: `#id` > `getByRole()` > `getByPlaceholder()` >
CSS class selectors > `filter({ hasText })`. No XPath unless unavoidable.

**Three method categories per block** (follow this exact structure):
```
// ── Block Name — Verification ──────────────
async verifyBlockIsDisplayed(): Promise<void> {
  await Validator.requireVisible(this.locator, "message");
}

// ── Block Name — Actions ───────────────────
async clickSomething(): Promise<void> {
  await this.click(this.locator, "Something");
}

// ── Block Name — Data Getters ──────────────
async getSomethingText(): Promise<string> {
  return await this.getText(this.locator);
}
```

**CRITICAL — Validator calls belong in page object, NEVER in spec files**:
- Every visibility assertion must be a `verify*()` method in the POM
- Every `getText()` call must be a `get*()` method in the POM
- The spec calls `await page.verifyTitleIsDisplayed()`,
  NOT `await Validator.requireVisible(page.title, ...)`

**Form interaction helpers**: Create a `fillAndSubmit*()` method that fills
all fields and clicks submit. Also create `clickFormSubmit()` for validation tests.

### Spec File Pattern (Stage 5)

**Import order**:
```typescript
import { expect } from "@playwright/test";   // expect only — NOT test
import { test } from "./baseTest";            // test from baseTest — includes Allure hooks
import { HomePage } from "../page-objects/homePage";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";
```

**Why `./baseTest` for `test`**: `baseTest.ts` wraps Playwright's test with Allure lifecycle
hooks. Importing `test` from `@playwright/test` directly silently bypasses all Allure
attachments and test descriptions. `expect` is imported separately because `baseTest.ts`
does not re-export it.

**NEVER import in spec files**: `Validator` or `waitForApi` — these belong in the POM only.
Only import the POM classes, `constants`, and `testData` the spec actually uses.

**Test structure** — each `test.describe` block has:
- `let` declarations for page objects
- `test.beforeEach` that navigates to the page
- Tests with `TC-XX |` prefix and `@smoke` / `@regression` tag at end

**TC numbering**: Restarts at TC-01 per `test.describe` block. Each block
is independent.

**test.step usage**: ONLY for multi-step tests (e.g., responsive layout with
viewport changes). Do NOT wrap single assertions in `test.step`.

**BAD** (unnecessary test.step wrapping):
```typescript
test("TC-01 | Block is visible @smoke", async () => {
  await test.step("Verify block is visible", async () => {  // ← WRONG
    await homePage.verifyHeroBlockIsDisplayed();
  });
});
```

**GOOD** (direct call):
```typescript
test("TC-01 | Block is visible @smoke", async () => {
  await homePage.verifyHeroBlockIsDisplayed();
});
```

**Form submission verification**: Use `waitForApi()` from `apiUtils.ts`.
NEVER use `page.waitForTimeout()` to wait for form submission.

**scrollIntoView**: Do NOT add `scrollIntoView` before every test. Playwright
auto-scrolls to elements. Only use it when explicitly needed (e.g., lazy-loading).

**console.log for reporting**: Always log key values for Allure observability:
```typescript
console.log(`Page Title: ${title}`);
console.log(`Price Range: ${priceText}`);
```

### Test Data

- Form test data goes in `utils/test_data.json`
- Expected text constants go in `utils/constants.json`
- API endpoints go in `utils/test_data.json` under `endpoint`
