---
name: stage-6b-code-review
description: >
  Stage 6b: Review generated POM and spec code against the Khov framework
  standards before committing. Checks file organization, POM structure, spec
  patterns, locator strategy, and common anti-patterns. Must pass before
  Stage 7 (git push). Use when code is written and tests pass but hasn't been
  committed yet. Trigger with "review code", "code review", "check standards",
  or before any git commit of test automation code.
---

# Stage 6b — Code Review (Pre-Commit Gate)

## Purpose
Automated code review that catches framework violations before code is committed.
Run after Stage 6 (tests passing) and before Stage 7 (git push).

## Input
- POM file(s) modified/created in Stage 4
- Spec file(s) modified/created in Stage 5
- Test data files modified (`utils/test_data.json`, `utils/constants.json`)

---

## Review Process

### Worktree Path Reference

All generated files live inside the worktree — NOT in the main repo. Read files from:

```
D:\Khov\.claude\worktrees\worktree-feat+{slug}\page-objects\{pageName}Page.ts
D:\Khov\.claude\worktrees\worktree-feat+{slug}\tests\{pageName}.spec.ts
D:\Khov\.claude\worktrees\worktree-feat+{slug}\utils\test_data.json    (if modified)
D:\Khov\.claude\worktrees\worktree-feat+{slug}\utils\constants.json    (if modified)
```

**`{slug}` = everything after `feat/` in the confirmed branch name.**

```
Branch: feat/khov-394-hero-block  →  slug: khov-394-hero-block
Branch: feat/khov-945-contact-form  →  slug: khov-945-contact-form
Branch: feat/hero-block  (no Jira ID)  →  slug: hero-block
```

**NEVER read from `D:\Khov\page-objects\` or `D:\Khov\tests\` — those directories
contain the base scaffold only, not the generated files.**

### How to Review

Read every file listed above, then check against each checklist below. Report
violations with the absolute file path, line number, the offending code, and the
correct replacement.

---

## Checklist 1: File Organization

| Rule | Check | Violation Example |
|------|-------|-------------------|
| One POM per page | No separate POM files per block/story | `homeHeroBlock.ts` ← WRONG |
| POM location | Files in `page-objects/` | `tests/pages/ContactPage.ts` ← WRONG |
| One spec per page | No separate spec files per block/story | `homeHeroBlock.spec.ts` ← WRONG |
| Spec location | Files in `tests/` | `tests/specs/form.spec.ts` ← WRONG |
| No leftover files | No temp/helper scripts committed | `export_csv.py` ← WRONG |

**How to check (use Glob tool — no bash commands on Windows):**
```
Glob pattern: page-objects/**/*.ts
  → Flag any file whose name does not match {pageName}Page.ts

Glob pattern: tests/**/*.spec.ts
  → Flag any spec file that duplicates an existing page spec
    (e.g. homeHeroBlock.spec.ts when homePage.spec.ts already exists)
```

---

## Checklist 2: POM Structure

| Rule | Check |
|------|-------|
| Extends BasePage | Class must have `extends BasePage` |
| Calls super(page) | Constructor must call `super(page)` |
| No public page property | `page` is inherited as `protected` — never redeclare |
| Readonly locators | All locators declared as `readonly` in class body |
| Locators in constructor | All locator assignments in `constructor()`, not in methods |
| Validator import | Must import `Validator` from `../utils/validator` |
| waitForApi import | If POM has `verifyNetworkRequest()`, must import `waitForApi` from `../utils/apiUtils` |
| Three-category methods | Each block has Verification / Actions / Data Getters sections |

### Verification Methods
```typescript
// CORRECT — uses Validator
async verifyPriceRangeIsDisplayed(): Promise<void> {
  await Validator.requireVisible(this.priceRange, "Price Range not displayed");
}

// VIOLATION — raw expect in POM
async assertPriceRangeVisible(): Promise<void> {
  await expect(this.priceRange).toBeVisible();
}
```

### Data Getter Methods
```typescript
// CORRECT — wraps getText
async getPriceRange(): Promise<string> {
  return await this.getText(this.priceRange);
}

// VIOLATION — no getter exists, spec calls getText directly
// (detected in spec review, but fix goes in POM)
```

### Method Naming
| Pattern | Convention | Example |
|---------|-----------|---------|
| Visibility check | `verify{Element}IsDisplayed()` | `verifyPriceRangeIsDisplayed()` |
| Text getter | `get{Element}Text()` or `get{Block}{Element}()` | `getHeroBlockHeadline()` |
| Boolean check | `is{Condition}()` | `isFieldInvalid()` |
| Action | `click{Element}()`, `fill{Form}()` | `clickFormSubmit()` |

---

## Checklist 3: Spec Structure

| Rule | Check |
|------|-------|
| Import order | `@playwright/test` → page objects → utils → constants → testData |
| No Validator in spec | Spec calls POM `verify*()` methods, never `Validator.requireVisible()` directly |
| No raw getText in spec | Spec calls POM `get*()` methods, never `page.getText(locator)` |
| No raw locator access for assertions | Spec doesn't pass `page.someLocator` to `Validator` |
| TC-XX naming | Test names follow `TC-XX \| Description @tag` format |
| Inline tags | Tags at end of test name string, not `{ tag: [...] }` annotation |
| TC numbering per block | Each `test.describe` restarts at TC-01 |
| `@form` tag on form tests | Any test inside a form `test.describe` must include `@form` before `@smoke`/`@regression` |
| POM in beforeEach | Page objects instantiated in `beforeEach`, never in test body |
| No afterEach screenshots | Already handled by config — don't add redundant afterEach |

### test.step Rules

```typescript
// VIOLATION — single assertion wrapped in test.step
test("TC-01 | Block visible @smoke", async () => {
  await test.step("Verify block", async () => {  // ← REMOVE
    await homePage.verifyHeroBlockIsDisplayed();
  });
});

// CORRECT — direct call
test("TC-01 | Block visible @smoke", async () => {
  await homePage.verifyHeroBlockIsDisplayed();
});

// CORRECT — test.step for multi-stage test
test("TC-26 | Responsive @regression", async ({ page }) => {
  await test.step("Desktop", async () => { ... });
  await test.step("Mobile", async () => { ... });
});
```

### Wait Patterns

```typescript
// VIOLATION — waitForTimeout for API calls
await page.waitForTimeout(2000);

// VIOLATION — waitForApi used directly in spec (must be in POM)
const apiPromise = waitForApi(page, testData.endpoint.submit_form);
await formPage.clickSubmit();
const response = await apiPromise;
expect(response.status()).toBe(200);

// CORRECT — verifyNetworkRequest encapsulated in POM, called after clickSubmit
await formPage.clickSubmit();
await formPage.verifyNetworkRequest(testData.endpoint.submit_form);
```

### Success Modal Pattern

```typescript
// VIOLATION — single combined method
await formPage.verifySuccessModal();

// CORRECT — two separate POM methods
await formPage.verifySuccessModalisDisplayed();
await formPage.verifySuccessModalText();
```

### scrollIntoView

```typescript
// VIOLATION — unnecessary scrollIntoView before every test
await homePage.scrollIntoView(homePage.contactForm);
await homePage.verifyFormTitleIsDisplayed();

// CORRECT — Playwright auto-scrolls, no scrollIntoView needed
await homePage.verifyFormTitleIsDisplayed();
```

---

## Checklist 4: Locator Quality

| Rule | Check |
|------|-------|
| No XPath | Unless matching existing code pattern |
| No nth-child/nth-of-type | Use specific selectors instead |
| No auto-generated IDs | IDs that may change between deploys |
| Scoped to parent | Locators scoped to block container, not page-wide |
| Consistent naming | camelCase with block prefix: `heroBlockHeadline`, `formFirstNameInput` |
| No `UNRESOLVED_SELECTOR` in active tests | Locators with value `"UNRESOLVED_SELECTOR"` must only appear in TODO-commented stub methods — never called by an active automated test |

**Locator priority check:**
```
#id > getByRole() > input[name] > [data-testid] > CSS class > :has-text() > .or()
```

---

## Checklist 5: Test Data

| Rule | Check |
|------|-------|
| Form data in test_data.json | Not hardcoded in spec |
| Expected text in constants.json | Reusable text values not inline |
| API endpoints in test_data.json | Under `endpoint` key |
| No sensitive data | No real emails, passwords, or PII |
| test_data.json exists if imported | If spec or POM imports `testData`, `utils/test_data.json` must exist in the worktree |

---

## Checklist 6: Navigation Setup

| Rule | Check |
|------|-------|
| Standard beforeEach | Follows the established navigation pattern for this page |
| Correct page objects initialized | All needed POMs created in beforeEach |
| Uses `constants.{page}.url` for navigation | Not `process.env.BASE_URL` — env is already handled by `playwright.config.ts` |
| No hardcoded deep-page URL | Community detail / floor plan specs must navigate via listing page + `clickRandom*()`, not a fixed URL string in `beforeEach` |

---

## Review Output Format

### If all checks pass:
```
Code Review — PASSED
────────────────────────────────────────
Files reviewed:
  D:\Khov\.claude\worktrees\worktree-feat+{slug}\page-objects\{pageName}Page.ts
  D:\Khov\.claude\worktrees\worktree-feat+{slug}\tests\{pageName}.spec.ts
  D:\Khov\.claude\worktrees\worktree-feat+{slug}\utils\test_data.json

All 6 checklists passed. Ready for Stage 7 (git push).
```

### If violations found:
```
Code Review — X VIOLATIONS FOUND
────────────────────────────────────────
Files reviewed:
  D:\Khov\.claude\worktrees\worktree-feat+{slug}\page-objects\{pageName}Page.ts
  D:\Khov\.claude\worktrees\worktree-feat+{slug}\tests\{pageName}.spec.ts

VIOLATIONS:

1. [Spec Structure] ...\tests\homePage.spec.ts:345
   Validator called directly in spec instead of POM verify method

   Current:
     await Validator.requireVisible(homePage.heroBlock, "...");

   Fix:
     await homePage.verifyHeroBlockIsDisplayed();

2. [Wait Pattern] ...\tests\homePage.spec.ts:520
   page.waitForTimeout used for form submission

   Current:
     await page.waitForTimeout(2000);

   Fix:
     await formPage.verifyNetworkRequest(testData.endpoint.submit_form);

────────────────────────────────────────
Fix all violations before proceeding to Stage 7.
```

### After Fixing
Re-run the review. Only proceed to Stage 7 when all checklists pass.

---

## Handoff
When review passes: "Code review passed. Ready for **Stage 7 — Git Push**."
