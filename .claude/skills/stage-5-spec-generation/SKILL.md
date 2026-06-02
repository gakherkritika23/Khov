---
name: stage-5-spec-generation
description: >
  Stage 5: Generate Playwright .spec.ts test code using POM classes from Stage 4.
  Follows the Khov framework pattern: one spec per page, test.describe per
  block, beforeEach navigation, Validator in POM not spec, TC-XX naming with
  inline @smoke/@regression tags.
---

# Stage 5 — Spec File Creation

## Purpose
Produce test code that uses the POM classes from Stage 4 to implement all approved
automated test cases.

## Input
- `automated_cases` from Stage 2 (or test-cases JSON)
- POM Generation Complete output from Stage 4 (method names, unresolved stubs list)

---

## ⛔ REQUIRED PRECONDITION — WORKTREE CHECK

Write the spec file to the **same worktree** used in Stage 4.

The worktree path is:
```
D:\Khov\.claude\worktrees\worktree-feat+{slug}\
```
Where `{slug}` = the story slug from the branch name (e.g. `khov-394-hero-block`).

If no worktree was created yet (Stage 4 was skipped), use `EnterWorktree` now before
writing any files.

### Absolute Paths for All File Writes

All `Write` tool calls MUST use absolute paths inside the worktree:

```
Spec:      D:\Khov\.claude\worktrees\worktree-feat+{slug}\tests\{pageName}.spec.ts
Test data: D:\Khov\.claude\worktrees\worktree-feat+{slug}\utils\test_data.json
Constants: D:\Khov\.claude\worktrees\worktree-feat+{slug}\utils\constants.json
```

**NEVER write to `D:\Khov\tests\` directly** — changes in the main repo directory are
not on the feature branch and will be lost.

---

## Step 1 — Read Existing Spec (Always First)

Before writing a single line, use the Read tool on the existing spec file:

```
Read: D:\Khov\.claude\worktrees\worktree-feat+{slug}\tests\{pageName}.spec.ts
```

**If the file does not exist** → use Path B (Create New Spec) in Step 2.

**If the file exists** → record:
- All existing `import` statements (do NOT duplicate them)
- All existing `test.describe` block names (do NOT create a block with the same name)
- The highest TC-XX number used in each describe block
  (new tests in the same block must continue the sequence, or restart at TC-01 for a
  new describe block)

---

## Step 2 — Path A or Path B

### Path A — Adding to an Existing Spec

1. Append the new `test.describe` block **after** the last closing `});` in the file
2. Do NOT duplicate any existing `import` statements — only add imports for new symbols
3. TC numbering **restarts at TC-01** for each new `test.describe` block
4. Do NOT modify any existing test blocks

### Path B — Creating a New Spec File

Start from the full spec template below (includes import block).

Write to:
```
D:\Khov\.claude\worktrees\worktree-feat+{slug}\tests\{pageName}.spec.ts
```

---

## Before Writing Imports

### Check `test_data.json`

`utils/test_data.json` may not exist yet. Check before importing it:

```
Read: D:\Khov\.claude\worktrees\worktree-feat+{slug}\utils\test_data.json
```

- **File exists** → import it and use it normally
- **File does not exist AND the spec has form tests or API calls** → create it first:
  ```json
  {
    "endpoint": {},
    "{pageKey}": {}
  }
  ```
  Write to: `D:\Khov\.claude\worktrees\worktree-feat+{slug}\utils\test_data.json`
- **File does not exist AND the spec has no form tests or API calls** → omit the
  `testData` import entirely; do NOT create an empty file just to satisfy the import

---

## Unresolved Locators — Skip in Spec

For every locator the Stage 4 output marked as unresolved (stub with `TODO`):

1. Find all test cases in `approved_cases` that depend on that element
2. Do NOT generate automated test code for them
3. Add a commented-out placeholder:
   ```typescript
   // TODO: TC-12 | Video Modal opens @regression — MANUAL
   // Reason: videoModal locator unresolved in Stage 3. Enable after selector is confirmed.
   ```
4. List all skipped TCs in the Stage 6 handoff output

---

## CRITICAL RULES

### File Organization
- **Location**: `tests/{pageName}.spec.ts` inside the worktree (NOT `tests/specs/`)
- **One spec per page**: ALL blocks for a page go in the SAME spec file
- **NEVER create separate spec files per block or per Jira story**
- **Add new `test.describe` blocks** to the existing spec file (Path A above)

### Import Pattern (exact order)
```typescript
import { test, expect } from "@playwright/test";
import { HomePage } from "../page-objects/homePage";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";
```

**Do NOT import `Validator` or `waitForApi` in spec files.** These belong in the POM only.

Only import what the spec actually uses. If the spec has no form tests, omit `testData`.

### constants.json — When and How to Use

Use `constants` for: page titles, expected static text, navigation link text, and page URLs.

Structure: `constants.{page_key}.{property}`

```typescript
// Page title assertion
expect(title).toBe(constants.home_page.title);

// Navigate using constants URL (resolves against playwright.config.ts baseURL)
await homePage.navigate(constants.home_page.url);  // "/" → https://www.khov.com/
```

If the needed constant key does not exist yet, add it to:
```
D:\Khov\.claude\worktrees\worktree-feat+{slug}\utils\constants.json
```
under the appropriate page key before referencing it in the spec.

**Do NOT hardcode expected text strings directly in spec assertions. Always use constants.**

### Test Describe Block Structure

Each block gets its own `test.describe` with its own `test.beforeEach`.

```typescript
/* ================================================================
   KHOV-XXXX — Block Name
   Page Name
   ================================================================ */
test.describe("Page Name — Block Name", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigate(constants.home_page.url);
  });

  // ── Block Rendering ─────────────────────────────────────────────

  test("TC-01 | Block is visible on the page @smoke", async () => {
    await homePage.verifyBlockIsDisplayed();
    console.log("Block verified visible");
  });

  // ── Content Mapping ──────────────────────────────────────────────

  test("TC-02 | Headline is present and non-empty @smoke", async () => {
    await homePage.verifyHeadlineIsDisplayed();
    const text = await homePage.getHeadlineText();
    console.log(`Headline: ${text}`);
  });
});
```

> ⚠️ **`dismissCookies()` does NOT exist in `BasePage`** — never call it in `beforeEach`.
> If a specific page requires cookie dismissal, the POM must implement it with the page's
> own locators. The `beforeEach` template above is the correct baseline.

**Navigation pattern varies by page** — always read the existing spec's `beforeEach`
first (Step 1) and match its navigation pattern exactly.

### Deep-Page Navigation (Community Detail, Floor Plan, Model Home)

Do NOT hardcode a specific community URL in the spec or in `constants.json`.
A fixed URL targets the same data every run — it hides content issues that only appear
on communities with different data sets.

Instead, navigate to the **listing page first** and have the POM click a **random**
community card so each run exercises different data:

```typescript
test.beforeEach(async ({ page }) => {
  searchPage = new SearchResultsPage(page);
  communityPage = new CommunityDetailPage(page);
  await searchPage.navigate(constants.search_results.url);
  await searchPage.clickRandomCommunityCard();
  // now on a randomly selected live community detail page
});
```

The POM implements `clickRandomCommunityCard()` by counting all visible community
cards, picking one at a random index, and clicking it:

```typescript
async clickRandomCommunityCard(): Promise<void> {
  const cards = this.communityCards;
  const count = await cards.count();
  expect(count, "No community cards found on listing page").toBeGreaterThan(0);
  const index = Math.floor(Math.random() * count);
  await cards.nth(index).click();
  console.log(`Clicked community card at index ${index} of ${count}`);
}
```

> **Stage 3 note:** Stage 3 still navigates to a specific example URL to inspect the
> DOM and discover locators — that URL is a throwaway tool for discovery and is never
> stored in `constants.json` or referenced in the spec.

### Section Comments Within Describe Blocks
Group related tests with `// ── Category ─────` comments inside the describe block:

```typescript
test.describe("Home Page — Hero Block", () => {
  // ── Block Rendering ──────────────────────────────────────────────
  test("TC-01 | Block is rendered @smoke", ...);

  // ── Content Mapping ──────────────────────────────────────────────
  test("TC-02 | Headline is present @smoke", ...);
  test("TC-03 | Description is present @smoke", ...);

  // ── CTAs ─────────────────────────────────────────────────────────
  test("TC-07 | Primary CTA is visible @smoke", ...);
});
```

### Test Case Naming
- Format: `TC-XX | Description @tag`
- TC numbering **restarts at TC-01** per `test.describe` block
- Tags at END of string: `@smoke` or `@regression`
- **Form tests** must also include `@form` tag — before the `@smoke`/`@regression` tag
- NEVER use Playwright `{ tag: [...] }` annotation syntax

```typescript
// CORRECT — non-form test
test("TC-01 | Hero Block is rendered @smoke", async () => {

// CORRECT — form test (includes @form tag)
test("TC-01 | Form title is displayed @form @regression", async () => {

// WRONG — form test missing @form tag
test("TC-01 | Form title is displayed @regression", async () => {

// WRONG — do not use annotation syntax
test("TC-01 | Hero Block is rendered", { tag: ['@smoke'] }, async () => {
```

### test.step Usage
- ONLY for multi-step tests (e.g., responsive viewport changes, multi-stage flows)
- Do NOT wrap single assertions in `test.step`

```typescript
// CORRECT — direct call for simple tests
test("TC-01 | Block is visible @smoke", async () => {
  await homePage.verifyHeroBlockIsDisplayed();
});

// CORRECT — test.step for multi-stage test
test("TC-26 | Responsive layout @regression", async ({ page }) => {
  await test.step("Desktop", async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await homePage.verifyHeroBlockIsDisplayed();
  });
  await test.step("Mobile", async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await homePage.verifyHeroBlockIsDisplayed();
  });
});

// WRONG — unnecessary test.step wrapping
test("TC-01 | Block is visible @smoke", async () => {
  await test.step("Verify block", async () => {  // ← NEVER DO THIS
    await homePage.verifyHeroBlockIsDisplayed();
  });
});
```

### Assertion Pattern — Validator in POM, NOT in Spec
```typescript
// CORRECT — call POM verify method
await homePage.verifyPriceRangeIsDisplayed();
const priceText = await homePage.getPriceRange();
expect(priceText).toMatch(/\$[\d,]+/);

// WRONG — calling Validator directly in spec
await Validator.requireVisible(homePage.priceRange, "...");
const priceText = await homePage.getText(homePage.priceRange);
```

### Form Submission — verifyNetworkRequest in POM, NEVER waitForTimeout in spec
The POM encapsulates `waitForApi` inside a `verifyNetworkRequest(endpoint)` method.
The spec calls it after `clickSubmit()` — never use `waitForApi` or `waitForTimeout`
directly in the spec.

```typescript
// CORRECT — POM-encapsulated network check
test("TC-01 | Submit contact form @form @smoke", async () => {
  await formPage.fillAndSubmitForm({
    firstName: testData.contactUs.first_name,
    lastName:  testData.contactUs.last_name,
    email:     testData.contactUs.email,
  });
  await formPage.verifyNetworkRequest(testData.endpoint.submit_form);
  await formPage.verifySuccessModalisDisplayed();
  await formPage.verifySuccessModalText();
});

// WRONG — waitForTimeout
await formPage.clickSubmit();
await page.waitForTimeout(2000);  // ← NEVER DO THIS
```

### Success Modal Verification — Always two calls
After every form submission, call both POM methods in order:

```typescript
// CORRECT
await formPage.verifySuccessModalisDisplayed();
await formPage.verifySuccessModalText();
```

### Conditional Tests (for elements that may not exist on all pages)
```typescript
// CORRECT — isVisible check with console.log for skipped branch
test("TC-12 | Video CTA displayed @regression", async () => {
  const videoVisible = await homePage.isVisible(homePage.videoCTA, 3000);
  if (videoVisible) {
    const ctaText = await homePage.getText(homePage.videoCTA);
    expect(ctaText).toContain("Watch");
    console.log(`Video CTA text: ${ctaText}`);
  } else {
    console.log("Video CTA not displayed on this page");
  }
});
```

### console.log for Reporting
Always log key values for Allure observability:
```typescript
console.log(`Page Title: ${title}`);
console.log(`Price Range: ${priceText}`);
console.log(`Items in carousel: ${itemCount}`);
console.log("Form submitted successfully with required fields only");
```

### scrollIntoView
Do NOT add `scrollIntoView` before every test. Playwright auto-scrolls. Only
use when explicitly needed (e.g., lazy-loaded content below the fold).

### POM Instantiation
**Standard**: instantiate in `beforeEach`, not in the test body.

**Exception**: when a `test.describe` block contains tests that each navigate to a
specific hardcoded URL (not the standard navigation flow), create POMs inline inside
the test. In this case there is no `beforeEach` block at all.

### afterEach
Do NOT add `afterEach` for screenshots — this is already handled by
`tests/baseTest.ts` and `playwright.config.ts` (`screenshot: "on-first-failure"`).

---

## Test Data

- Form inputs: `utils/test_data.json` under a named page key (e.g. `testData.contactUs.first_name`)
- Expected static text: `utils/constants.json` under page-specific keys
- API endpoints: `utils/test_data.json` under the `endpoint` key
- Page URLs: `utils/constants.json` under `{page_key}.url` or `{page_key}.example_url`

---

## Spec Template (Path B — New Spec File)

```typescript
import { test, expect } from "@playwright/test";
import { {PageName}Page } from "../page-objects/{pageName}Page";
import constants from "../utils/constants.json";
// import testData from "../utils/test_data.json";  // Uncomment if needed

/* ================================================================
   {KHOV-XXXX} — {Block Name}
   {Page Name}
   ================================================================ */
test.describe("{Page Name} — {Block Name}", () => {
  let {pageName}Page: {PageName}Page;

  test.beforeEach(async ({ page }) => {
    {pageName}Page = new {PageName}Page(page);
    await {pageName}Page.navigate(constants.{page_key}.url);
  });

  // ── Block Rendering ──────────────────────────────────────────────

  test("TC-01 | {Block} is visible on the page @smoke", async () => {
    await {pageName}Page.verify{Block}IsDisplayed();
    console.log("{Block} verified visible");
  });

  // ── Content Mapping ──────────────────────────────────────────────

  test("TC-02 | {Block} title is present and non-empty @smoke", async () => {
    await {pageName}Page.verify{Block}TitleIsDisplayed();
    const text = await {pageName}Page.get{Block}TitleText();
    expect(text.length).toBeGreaterThan(0);
    console.log(`{Block} title: ${text}`);
  });

  // ── CTAs ─────────────────────────────────────────────────────────

  test("TC-03 | {Block} CTA is visible and clickable @smoke", async () => {
    await {pageName}Page.verify{Block}CTAIsDisplayed();
    await {pageName}Page.click{Block}CTA();
    console.log("CTA clicked successfully");
  });
});
```

---

## Final Step — TypeScript Compilation Check

After writing the spec, run from the worktree directory:

```bash
npx tsc --noEmit 2>&1 | grep -v "TS1149"
```

Fix all errors before handing off to Stage 6. Common causes:
- Calling a POM method that does not exist (check exact names from Stage 4 output)
- Missing `import` (constants, testData, page object)
- Using `testData` import when `test_data.json` doesn't exist yet
- Wrong `async/await` usage (missing `await` before `verify*()` calls)
- Locator property name mismatch (e.g. `homePage.heroCta` vs `homePage.heroBlockCTA`)

Do NOT proceed to Stage 6 with TypeScript errors outstanding.

---

## Output — Report After Writing Spec

Present this summary to the engineer before calling Stage 6:

```
Spec Generation Complete
──────────────────────────────────────────────────
Spec file:  D:\Khov\.claude\worktrees\worktree-feat+{slug}\tests\{pageName}.spec.ts
Action:     [Created new / Added {block} describe block to existing file]
Branch:     feat/khov-{id}-{block-slug}

Test cases generated ({N} automated):
  Smoke (@smoke):       TC-01, TC-02, TC-03, TC-07
  Regression (@regression): TC-04, TC-05, TC-06, TC-08
  Form (@form):         TC-09, TC-10

Skipped — manual only ({M} TCs):
  TC-12 — videoModal locator unresolved (Stage 4 stub)
  [none — all TCs automated]

tsc --noEmit: PASSED ✅  (or list errors if FAILED ❌)
──────────────────────────────────────────────────
```

---

## Handoff to Stage 6

Pass to Stage 6 — Test Execution:
- Worktree spec file path (absolute)
- Total automated test count and tag breakdown
- List of skipped/manual TCs (for test counts in Stage 7 commit message)
- Confirmation that `tsc --noEmit` passed
