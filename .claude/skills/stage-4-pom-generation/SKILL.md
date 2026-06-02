---
name: stage-4-pom-generation
description: >
  Stage 4: Generate or update TypeScript Page Object Model (POM) classes from
  discovered locators. POMs extend BasePage, use Validator for assertions, and
  follow the project's three-category method pattern. MUST update existing POM
  files — never create separate files per block.
---

# Stage 4 — POM Generation

## Purpose
Convert discovered locators into a clean, typed POM class (or update an existing
one) that spec files import to interact with khov.com pages.

## Input
Locator discovery output from Stage 3.

## ⛔ REQUIRED PRECONDITION — WORKTREE CHECK

Before writing ANY `.ts` files, verify you are inside a git worktree:

1. The working directory must be inside `D:\Khov\.claude\worktrees\<branch-name>\`
2. If NOT already in a worktree, **STOP** and use the `EnterWorktree` tool first:
   - Branch name: `feat/<story-slug>` (e.g., `feat/footer-tests`, `feat/home-hero-block`)
   - The `EnterWorktree` tool will create the worktree at `.claude/worktrees/worktree-feat+<story-slug>`
3. ALL file writes (POM `.ts`, spec `.spec.ts`, test data JSON) go inside the worktree
4. **NEVER write generated files to the main repository directory** — they will be lost if the session is interrupted

If you are resuming a session and a worktree already exists for this branch, continue writing to that same worktree path.

## CRITICAL RULES

### File Organization
- **Location**: `page-objects/{pageName}Page.ts` (NOT `tests/pages/`)
- **One POM per page**: `homePage.ts` covers ALL blocks on the home page
- **NEVER create separate POM files per block or per Jira story**
- **ALWAYS update the existing POM** — read it first, add new sections

### Class Structure
- **MUST extend `BasePage`** — inherits `click()`, `type()`, `navigate()`,
  `getText()`, `isVisible()`, `waitForVisible()`, `scrollIntoView()`, `dismissCookies()`
- `page` property is **`protected`** (inherited from BasePage) — never redeclare as public
- All locators are **`readonly`** properties initialized in the constructor
- Import `Validator` from `../utils/validator`

### Three-Category Method Pattern (MANDATORY)

Every block MUST have methods organized into these three categories:

```typescript
// ── Block Name — Verification ──────────────────────────────
/** Verify the block is visible on the page. */
async verifyBlockIsDisplayed(): Promise<void> {
  await Validator.requireVisible(this.locator, "Block is not displayed");
}

// ── Block Name — Actions ───────────────────────────────────
/** Click the CTA button. */
async clickSomething(): Promise<void> {
  await this.click(this.locator, "Something");
}

// ── Block Name — Data Getters ──────────────────────────────
/** Return the block's title text. */
async getBlockTitle(): Promise<string> {
  return await this.getText(this.locator);
}
```

### Assertion Pattern — Validator vs raw expect

Use **`Validator`** for: visibility checks, hidden checks, and text content assertions.
Use **raw `expect()`** for: count checks, regex pattern matching, attribute value comparisons,
numeric/boolean comparisons, and anything `Validator` doesn't cover.

```typescript
// ✓ Validator — visibility
await Validator.requireVisible(this.block, "Block not displayed");
await Validator.requireHidden(this.button, "Button should be hidden");

// ✓ Validator — text content
await Validator.requireText(this.title, "Expected text", "Title mismatch");

// ✓ raw expect — count
const count = await this.items.count();
expect(count, "No items displayed").toBeGreaterThan(0);

// ✓ raw expect — regex match on attribute
const placeholder = await this.input.getAttribute("placeholder");
expect(placeholder, "Required field missing *").toMatch(/\*$/);

// ✓ raw expect — attribute comparison
const href = await this.link.getAttribute("href");
expect(href, "Link href mismatch").toContain("/expected-path");

// ✓ raw expect — numeric equality
expect(displayed, `Count mismatch — expected ${expected}`).toBe(expected);

// ✗ WRONG — raw expect() for visibility (use Validator instead)
await expect(this.block).toBeVisible(); // ← use Validator.requireVisible
```

`expect` must be imported: `import { Page, Locator, expect } from "@playwright/test";`

## POM Template

```typescript
import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";

export class {PageName}Page extends BasePage {
  /* ================= BLOCK NAME (KHOV-XXXX) ================= */
  readonly blockContainer: Locator;
  readonly blockTitle: Locator;
  readonly blockCTA: Locator;

  constructor(page: Page) {
    super(page);  // MUST call super — BasePage sets this.page

    /* ================= BLOCK NAME ================= */
    // Block container — section#block-id (verified live on PageName page)
    this.blockContainer = page.locator("section#block-id");
    // Block title — h2 scoped to container
    this.blockTitle = this.blockContainer.locator("h2");
    // CTA button
    this.blockCTA = this.blockContainer.locator('a[data-testid="cta-button"]');
  }

  // ── Block Name — Verification ─────────────────────────────

  async verifyBlockIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.blockContainer, "Block not displayed");
  }

  async verifyBlockTitleIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.blockTitle, "Block title not displayed");
  }

  async verifyItemCountIsAboveZero(): Promise<void> {
    const count = await this.items.count();
    expect(count, "No items displayed in block").toBeGreaterThan(0);
  }

  // ── Block Name — Private Helpers ──────────────────────────

  /** Scroll container into view and wait for the element that lazy-loads. */
  private async waitForBlockReady(): Promise<void> {
    await this.scrollIntoView(this.blockContainer);
    await this.blockTitle.waitFor({ state: "visible", timeout: 10000 });
  }

  // ── Block Name — Actions ──────────────────────────────────

  /** Click the CTA. Scrolls into view first to avoid sticky header interception. */
  async clickBlockCTA(): Promise<void> {
    await this.scrollIntoView(this.blockCTA);
    await this.blockCTA.click({ force: true });
    console.log("Clicked Block CTA");
  }

  // ── Block Name — Data Getters ─────────────────────────────

  async getBlockTitleText(): Promise<string> {
    return await this.getText(this.blockTitle);
  }
}
```

### Locator Comments (constructor)
Every locator assignment must have an inline comment:
- What element it targets and which tag/selector was chosen
- `(verified live on PageName page)` when confirmed from DOM inspection

```typescript
// Block container — section#hero-block (verified live on Home page)
this.heroBlock = page.locator("section#hero-block");
// Headline — h1 scoped to hero container
this.heroHeadline = this.heroBlock.locator("h1");
```

### Property Group Headers
Use `/* ===== NAME (KHOV-XXXX) ===== */` for the readonly property declarations
and `/* ===== NAME ===== */` inside the constructor:

```typescript
/* ================= HERO BLOCK (KHOV-1234) ================= */
readonly heroBlock: Locator;
readonly heroHeadline: Locator;

constructor(page: Page) {
  super(page);
  /* ================= HERO BLOCK ================= */
  this.heroBlock = page.locator("section#hero-block");
}
```

### Action Methods — Click Pattern
Most click actions should scroll into view first, then force-click. Use `{ force: true }`
to bypass sticky header interception (common on sites with fixed headers):

```typescript
async clickCarouselNext(): Promise<void> {
  await this.scrollIntoView(this.carouselNextButton);
  await this.carouselNextButton.click({ force: true });
  console.log("Clicked carousel Next button");
}
```

### Complex DOM State — page.evaluate()
Use `page.evaluate()` when Playwright's built-in waiting would hang (e.g., carousel boundary state
where a button is removed from DOM rather than set to disabled):

```typescript
async verifyCarouselNextIsDisabledOrAbsent(): Promise<void> {
  const result = await this.page.evaluate(() => {
    const btn = document.querySelector("section#block button.carousel__next");
    return !btn || btn.hasAttribute("disabled");
  });
  expect(result, "Next button should be disabled or absent on last slide").toBe(true);
}
```

### Filter by Text — .filter({ hasText: "..." })
Use `.filter({ hasText: "..." })` to scope a locator to a specific list item when
items share the same selector but differ by visible text:

```typescript
this.homeCount = this.block
  .locator("div.stat-item")
  .filter({ hasText: "HOMES" })
  .locator("span.count");
```

## Form-Specific Patterns

For forms, create these additional helpers:

```typescript
// Fill and submit helper
async fillAndSubmitForm(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  comment?: string;
}) {
  await this.formFirstNameInput.fill(data.firstName);
  await this.formLastNameInput.fill(data.lastName);
  await this.formEmailInput.fill(data.email);
  if (data.phone) await this.formPhoneInput.fill(data.phone);
  if (data.comment) await this.formCommentInput.fill(data.comment);
  await this.formSubmitButton.click();
}

// Click submit without filling (for validation tests)
async clickFormSubmit(): Promise<void> {
  await this.formSubmitButton.click();
}

// Field validation error locator
formFieldError(fieldLocator: Locator): Locator {
  return fieldLocator.locator("..").locator("span.error-message");
}

// Check if field has validation-fail class
async isFieldInvalid(fieldLocator: Locator): Promise<boolean> {
  const parent = fieldLocator.locator("..");
  const classes = (await parent.getAttribute("class")) ?? "";
  return classes.includes("error") || classes.includes("invalid");
}

// Verify validation error is visible
async verifyFieldValidationError(fieldLocator: Locator): Promise<void> {
  const errorMsg = this.formFieldError(fieldLocator);
  await Validator.requireVisible(errorMsg, "Validation error not shown");
}

// Get validation error text
async getFieldErrorText(fieldLocator: Locator): Promise<string> {
  return await this.getText(this.formFieldError(fieldLocator));
}

// ── Success Modal ─────────────────────────────────────────────────────────────
readonly modal: Locator;

// In constructor:
// this.modal = page.locator(".modal-body");

async verifySuccessModalisDisplayed(): Promise<void> {
  await Validator.requireVisible(this.modal, "Success modal not displayed", 15000);
}

async verifySuccessModalText(): Promise<void> {
  await Validator.requireText(
    this.modal,
    testData.{pageKey}.success_message,
    "Success Modal Text",
  );
}

// ── Network Request ───────────────────────────────────────────────────────────
// Encapsulate waitForApi inside the POM — spec NEVER imports waitForApi directly.
async verifyNetworkRequest(endpoint: string): Promise<void> {
  const response = await waitForApi(this.page, endpoint);
  expect(response.status()).toBe(200);
}
```

## Locator Naming Convention
- camelCase with block prefix: `heroBlockHeadline`, `formFirstNameInput`
- Descriptive suffixes: `CTA`, `Input`, `Button`, `Icon`, `Modal`, `Block`
- Group by block with section comment headers

## Output
Provide the updated POM file. List which sections were added/modified.

## Handoff
Pass the POM file path and class name to **Stage 5 — Spec File Creation**.
