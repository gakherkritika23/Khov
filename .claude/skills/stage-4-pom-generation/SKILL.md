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
Convert the locator summary from Stage 3 into a clean, typed POM class (or update
an existing one) that spec files import to interact with khov.com pages.

---

## Input

The structured locator summary from Stage 3, including:
- Page name and POM file path
- Confirmed branch name (`feat/khov-{id}-{block-slug}`)
- Worktree path (from `EnterWorktree` output)
- New locators table (verified ✅ and unresolved ❌)
- List of locators already present in the existing POM (no action needed)

---

## ⛔ REQUIRED PRECONDITION — WORKTREE CHECK

Before writing ANY `.ts` files, verify you are inside a git worktree.

1. The worktree path was confirmed at the end of Stage 3. It is:
   ```
   D:\Khov\.claude\worktrees\worktree-feat+{slug}\
   ```
   Where `{slug}` = the story slug from your branch name (e.g. `khov-394-hero-block`).

2. If NOT already in a worktree, **STOP** and use the `EnterWorktree` tool:
   - Branch name: `feat/khov-{id}-{block-slug}` (confirmed in Stage 3)
   - Examples: `feat/khov-394-hero-block`, `feat/khov-945-contact-form`
   - The tool creates the worktree at `D:\Khov\.claude\worktrees\worktree-feat+{slug}\`

3. If a worktree already exists (resuming a session), use that same path.

### Absolute Paths for All File Writes

All `Write` tool calls MUST use absolute paths inside the worktree:

```
POM:       D:\Khov\.claude\worktrees\worktree-feat+{slug}\page-objects\{pageName}Page.ts
Spec:      D:\Khov\.claude\worktrees\worktree-feat+{slug}\tests\{pageName}.spec.ts
Test data: D:\Khov\.claude\worktrees\worktree-feat+{slug}\utils\test_data.json
Constants: D:\Khov\.claude\worktrees\worktree-feat+{slug}\utils\constants.json
```

**NEVER write to `D:\Khov\page-objects\` directly** — changes in the main repo
directory are not on the feature branch and will be overwritten.

---

## Step 1 — Read the Existing POM (Always First)

Before writing a single line, use the Read tool on the existing POM file:

```
Read: D:\Khov\.claude\worktrees\worktree-feat+{slug}\page-objects\{pageName}Page.ts
```

**If the file does not exist** → use Path B (Create New POM) below.

**If the file exists** → record:
- All `readonly` locator properties already declared (do NOT redeclare)
- All block sections already present (add new blocks AFTER the last one)
- The exact import block and class name to preserve

---

## Step 2 — Path A or Path B

### Path A — Updating an Existing POM

1. Locate the last block's `readonly` property group in the class body
2. Add new `readonly` properties **after** the last existing block's properties
3. Locate the last block's constructor assignments
4. Add new constructor assignments **after** the last existing block's assignments
5. Locate the last block's methods
6. Add new method sections **after** the last existing block's methods
7. Never remove or rename existing locators or methods

### Path B — Creating a New POM

Start from the POM template below. Replace all `{placeholders}` before writing.
Write to: `D:\Khov\.claude\worktrees\worktree-feat+{slug}\page-objects\{pageName}Page.ts`

---

## CRITICAL RULES

### File Organization
- **Location**: `page-objects/{pageName}Page.ts` inside the worktree (NOT `tests/pages/`)
- **One POM per page**: `homePage.ts` covers ALL blocks on the home page
- **NEVER create separate POM files per block or per Jira story**
- **ALWAYS update the existing POM** — read it first (Step 1), add new sections

### Class Structure
- **MUST extend `BasePage`** — inherits these methods (actual `basePage.ts`):
  ```
  navigate(url)          getTitle()             getUrl()
  getHref(locator)       verifyNavigation(url)
  click(locator, name?)  type(locator, text, name?)
  waitForVisible(locator, timeout?)              waitForHidden(locator, timeout?)
  waitForLoad()          scrollIntoView(locator)
  getText(locator)       isVisible(locator, timeout?)    isEnabled(locator)
  ```
  > ⚠️ `dismissCookies()` does **NOT** exist in `BasePage`. If a POM needs to
  > dismiss cookies, implement it directly using the site's specific locators.

- `page` property is **`protected`** (inherited) — never redeclare it as public
- All locators are **`readonly`** properties initialized in the constructor
- Import `Validator` from `../utils/validator`

### Three-Category Method Pattern (MANDATORY)

Every block MUST have methods in exactly these three categories:

```typescript
// ── Block Name — Verification ──────────────────────────────
/** Verify the block is visible on the page. */
async verifyBlockIsDisplayed(): Promise<void> {
  await Validator.requireVisible(this.blockContainer, "Block is not displayed");
}

// ── Block Name — Actions ───────────────────────────────────
/** Click the CTA button. */
async clickBlockCTA(): Promise<void> {
  await this.scrollIntoView(this.blockCTA);
  await this.blockCTA.click({ force: true });
  console.log("Clicked Block CTA");
}

// ── Block Name — Data Getters ──────────────────────────────
/** Return the block's title text. */
async getBlockTitle(): Promise<string> {
  return await this.getText(this.blockTitle);
}
```

### Assertion Pattern — Validator vs raw expect

Use **`Validator`** for: visibility checks, hidden checks, and text content assertions.
Use **raw `expect()`** for: count checks, regex, attribute comparisons, numeric/boolean.

```typescript
// ✓ Validator — visibility
await Validator.requireVisible(this.block, "Block not displayed");
await Validator.requireHidden(this.button, "Button should be hidden");

// ✓ Validator — text content
await Validator.requireText(this.title, "Expected text", "Title mismatch");

// ✓ raw expect — count
const count = await this.blockContainer.locator("li").count();
expect(count, "No items displayed").toBeGreaterThan(0);

// ✓ raw expect — attribute comparison
const href = await this.link.getAttribute("href");
expect(href, "Link href mismatch").toContain("/expected-path");

// ✗ WRONG — raw expect for visibility (use Validator instead)
await expect(this.block).toBeVisible();
```

`expect` must be imported: `import { Page, Locator, expect } from "@playwright/test";`

---

## Step 3 — Handle Unresolved Locators

For every locator marked `❌ unresolved` in the Stage 3 summary:

**1. Declare the property with a TODO comment:**
```typescript
// TODO: locator not found during Stage 3 discovery — needs manual DOM inspection
readonly videoModal: Locator;
```

**2. In the constructor, use a sentinel that won't throw at import time:**
```typescript
// TODO: update selector after manual DOM inspection on {URL}
this.videoModal = page.locator("UNRESOLVED_SELECTOR");
```

**3. Stub the verification method with a warning:**
```typescript
async verifyVideoModalIsDisplayed(): Promise<void> {
  // TODO: locator unresolved — update selector before enabling this assertion
  console.warn("videoModal locator not yet resolved — test case requires manual execution");
}
```

**4. List all unresolved locators in the Stage 4 output** so Stage 5 marks the
corresponding test cases as `@manual`.

---

## POM Template (Path B — New POM)

```typescript
import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";

export class {PageName}Page extends BasePage {
  /* ================= {BLOCK NAME} ({KHOV-XXXX}) ================= */
  readonly blockContainer: Locator;
  readonly blockTitle: Locator;
  readonly blockCTA: Locator;

  constructor(page: Page) {
    super(page);  // MUST call super — BasePage sets this.page

    /* ================= {BLOCK NAME} ================= */
    // Block container — section#{block-id} (verified live on {PageName} page)
    this.blockContainer = page.locator("section#{block-id}");
    // Block title — h2 scoped to block container
    this.blockTitle = this.blockContainer.locator("h2");
    // Primary CTA — a[data-testid="cta-button"] inside block
    this.blockCTA = this.blockContainer.locator('a[data-testid="cta-button"]');
  }

  // ── {Block Name} — Verification ──────────────────────────────

  async verifyBlockIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.blockContainer, "{Block Name} not displayed");
  }

  async verifyBlockTitleIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.blockTitle, "{Block Name} title not displayed");
  }

  // ── {Block Name} — Actions ────────────────────────────────────

  /** Click the CTA. Scrolls into view first to avoid sticky header interception. */
  async clickBlockCTA(): Promise<void> {
    await this.scrollIntoView(this.blockCTA);
    await this.blockCTA.click({ force: true });
    console.log("Clicked {Block Name} CTA");
  }

  // ── {Block Name} — Data Getters ───────────────────────────────

  async getBlockTitleText(): Promise<string> {
    return await this.getText(this.blockTitle);
  }
}
```

---

## Locator Patterns

### Comments in Constructor
Every locator assignment must have an inline comment:
```typescript
// Block container — section#hero-block (verified live on Home page)
this.heroBlock = page.locator("section#hero-block");
// Headline — h1 scoped to hero container
this.heroHeadline = this.heroBlock.locator("h1");
```

### Property Group Headers
```typescript
/* ================= HERO BLOCK (KHOV-1234) ================= */
readonly heroBlock: Locator;
readonly heroHeadline: Locator;

constructor(page: Page) {
  super(page);
  /* ================= HERO BLOCK ================= */
  this.heroBlock = page.locator("section#hero-block");
  this.heroHeadline = this.heroBlock.locator("h1");
}
```

### Click Pattern — Scroll + Force
```typescript
async clickCarouselNext(): Promise<void> {
  await this.scrollIntoView(this.carouselNextButton);
  await this.carouselNextButton.click({ force: true });
  console.log("Clicked carousel Next button");
}
```

### Complex DOM State — page.evaluate()
```typescript
async verifyCarouselNextIsDisabledOrAbsent(): Promise<void> {
  const result = await this.page.evaluate(() => {
    const btn = document.querySelector("section#block button.next");
    return !btn || btn.hasAttribute("disabled");
  });
  expect(result, "Next button should be disabled or absent on last slide").toBe(true);
}
```

### Filter by Text
```typescript
this.homeCount = this.statsBlock
  .locator("div.stat-item")
  .filter({ hasText: "HOMES" })
  .locator("span.count");
```

---

## Form-Specific Patterns

When the block under test is a form, add the following. Note the three separate
sections — class body, constructor, and methods — and where each belongs.

### Add to class body (with other readonly properties)
```typescript
/* ================= {FORM NAME} ({KHOV-XXXX}) ================= */
readonly formContainer: Locator;
readonly formFirstNameInput: Locator;
readonly formLastNameInput: Locator;
readonly formEmailInput: Locator;
readonly formPhoneInput: Locator;
readonly formCommentInput: Locator;
readonly formSubmitButton: Locator;
readonly formSuccessModal: Locator;
```

### Add to constructor
```typescript
/* ================= {FORM NAME} ================= */
// Form container — form#{form-id} (verified live on {PageName} page)
this.formContainer = page.locator("form#{form-id}");
this.formFirstNameInput = this.formContainer.locator('input[name="first_name"]');
this.formLastNameInput = this.formContainer.locator('input[name="last_name"]');
this.formEmailInput = this.formContainer.locator('input[name="email"]');
this.formPhoneInput = this.formContainer.locator('input[name="phone"]');
this.formCommentInput = this.formContainer.locator('textarea[name="comment"]');
this.formSubmitButton = this.formContainer.locator('button[type="submit"]');
// Success modal — confirm selector on live site after form submission
this.formSuccessModal = page.locator(".modal-body");
```

### Add as methods

```typescript
// ── {Form Name} — Verification ────────────────────────────────

async verifyFormIsDisplayed(): Promise<void> {
  await Validator.requireVisible(this.formContainer, "Form not displayed");
}

async verifySuccessModalisDisplayed(): Promise<void> {
  await Validator.requireVisible(this.formSuccessModal, "Success modal not displayed", 15000);
}

async verifySuccessModalText(): Promise<void> {
  // Import testData at top of file: import testData from "../utils/test_data.json";
  // {pageKey} = the top-level key for this page in test_data.json
  // e.g. testData.contactUs.success_message — add the key if it doesn't exist yet
  await Validator.requireText(
    this.formSuccessModal,
    testData.{pageKey}.success_message,
    "Success modal text mismatch",
  );
}

// ── {Form Name} — Actions ──────────────────────────────────────

async fillAndSubmitForm(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  comment?: string;
}): Promise<void> {
  await this.formFirstNameInput.fill(data.firstName);
  await this.formLastNameInput.fill(data.lastName);
  await this.formEmailInput.fill(data.email);
  if (data.phone) await this.formPhoneInput.fill(data.phone);
  if (data.comment) await this.formCommentInput.fill(data.comment);
  await this.formSubmitButton.click();
}

async clickFormSubmit(): Promise<void> {
  await this.formSubmitButton.click();
}

// ── {Form Name} — Network ──────────────────────────────────────

// Import at top of file: import { waitForApi } from "../utils/apiUtils";
// Note: waitForApi already checks status === 200 — no extra expect needed.
async verifyNetworkRequest(endpoint: string): Promise<void> {
  await waitForApi(this.page, endpoint);
}

// ── {Form Name} — Validation Helpers ──────────────────────────

formFieldError(fieldLocator: Locator): Locator {
  // TODO: confirm the error span selector on the live site
  return fieldLocator.locator("..").locator("span.error-message");
}

async isFieldInvalid(fieldLocator: Locator): Promise<boolean> {
  const parent = fieldLocator.locator("..");
  const classes = (await parent.getAttribute("class")) ?? "";
  return classes.includes("error") || classes.includes("invalid");
}

async verifyFieldValidationError(fieldLocator: Locator): Promise<void> {
  await Validator.requireVisible(this.formFieldError(fieldLocator), "Validation error not shown");
}

async getFieldErrorText(fieldLocator: Locator): Promise<string> {
  return await this.getText(this.formFieldError(fieldLocator));
}

// ── {Form Name} — Data Getters ─────────────────────────────────

async getFormTitle(): Promise<string> {
  return await this.getText(this.formContainer.locator("h2, h3").first());
}
```

### Required imports for forms
```typescript
import { waitForApi } from "../utils/apiUtils";
import testData from "../utils/test_data.json";
```

---

## Locator Naming Convention
- camelCase with block prefix: `heroBlockHeadline`, `formFirstNameInput`
- Descriptive suffixes: `CTA`, `Input`, `Button`, `Icon`, `Modal`, `Block`, `Container`
- Group by block with property group headers

---

## Step 4 — TypeScript Compilation Check

After writing the POM, run immediately (from the worktree directory):

```bash
npx tsc --noEmit 2>&1 | grep -v "TS1149"
```

Fix all errors before handing off to Stage 5. Common causes:
- Missing import (`Validator`, `waitForApi`, `testData`)
- Locator used in a method but not declared as a `readonly` property
- Return type mismatch on getter method
- `super()` not called in constructor
- `this.items` or other undeclared property reference

Do NOT proceed to Stage 5 with TypeScript errors outstanding.

---

## Output — Report After Writing POM

Present this summary to the engineer before calling Stage 5:

```
POM Generation Complete
──────────────────────────────────────────────────
POM file:   D:\Khov\.claude\worktrees\worktree-feat+{slug}\page-objects\{pageName}Page.ts
Class name: {PageName}Page
Branch:     feat/khov-{id}-{block-slug}
Action:     [Created new / Updated existing — added {block} section]

New methods added:
  Verification:  verify{Block}IsDisplayed(), verify{Field}IsDisplayed()
  Actions:       click{Block}CTA(), fillAndSubmit{Form}()
  Data Getters:  get{Block}Title(), get{Field}Text()

Unresolved stubs (Stage 5 must mark as @manual):
  {locatorName} — selector not found, stub added with TODO comment

tsc --noEmit: PASSED ✅  (or list errors if FAILED ❌)
──────────────────────────────────────────────────
```

---

## Handoff to Stage 5

Pass to Stage 5 — Spec File Creation:
- Worktree POM file path (absolute)
- Class name (e.g. `HomePage`)
- Full list of new method names (so Stage 5 calls the right ones)
- List of unresolved stubs (so Stage 5 marks those TCs as `@manual`)
- Confirmation that `tsc --noEmit` passed
