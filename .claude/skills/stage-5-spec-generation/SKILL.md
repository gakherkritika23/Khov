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
- POM class from Stage 4

## ⛔ REQUIRED PRECONDITION — WORKTREE CHECK

Write the spec file to the **same worktree** used in Stage 4:
- Path: `D:\Khov\.claude\worktrees\<branch-name>\tests\`
- If no worktree was created yet (Stage 4 was skipped), use `EnterWorktree` now before writing
- **NEVER write spec files to the main repository directory**

## CRITICAL RULES

### File Organization
- **Location**: `tests/{pageName}.spec.ts` (NOT `tests/specs/`)
- **One spec per page**: ALL blocks for a page go in the SAME spec file
- **NEVER create separate spec files per block or per Jira story**
- **Add new `test.describe` blocks** to the existing spec file

### Import Pattern (exact order)
```typescript
import { test, expect } from "@playwright/test";
import { HomePage } from "../page-objects/homePage";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";
```

**Do NOT import `Validator` or `waitForApi` in spec files.** These belong in the POM only.
Only import the POM classes, `constants`, and `testData` that the spec actually uses.

### Test Describe Block Structure

Each block gets its own `test.describe` with its own `test.beforeEach`. Multiple
describe blocks live in the same spec file — separated by block-level comments.

```typescript
/* ================================================================
   KHOV-XXXX — Block Name
   Page Name
   ================================================================ */
test.describe("Page Name — Block Name", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigate(process.env.BASE_URL ?? "https://www.khov.com/");
    await homePage.dismissCookies();
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

**Navigation pattern varies by page — always read the existing spec's `beforeEach` first and match its navigation pattern exactly.**

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
- **Form tests** must also include `@form` tag — any test inside a form-related
  describe block must have `@form` before the `@smoke`/`@regression` tag
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
The spec calls it after `clickSubmit()` — never use `waitForApi` or `waitForTimeout` directly in the spec.

```typescript
// CORRECT — POM-encapsulated network check
test("TC-01 | Submit contact form @form @smoke", async () => {
  await formPage.fillPersonalInfo(testData.contactUs.first_name, testData.contactUs.last_name);
  await formPage.clickSubmit();
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
  const videoVisible = await homePage.isVisible(
    homePage.videoCTA, 3000,
  );
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
use when explicitly needed (e.g., lazy-loaded content).

### POM instantiation
**Standard**: instantiate in `beforeEach`, not in the test body.

**Exception**: when a `test.describe` block contains tests that each navigate to a
specific hardcoded URL (not the standard navigation flow), create POMs inline inside the
test. In this case there is no `beforeEach` block at all.

### afterEach
Do NOT add `afterEach` for screenshots — this is already handled by
`baseTest.ts` and `playwright.config.ts` (`screenshot: "on-first-failure"`).

## Test Data
- Form data: `utils/test_data.json` under a named key
- Expected text: `utils/constants.json` under page-specific keys
- API endpoints: `utils/test_data.json` under `endpoint`

## Output
Provide the complete test code to add to the existing spec file. Specify which
`test.describe` blocks are new.

## Handoff
Pass the spec file path to **Stage 6 — Test Execution**.
