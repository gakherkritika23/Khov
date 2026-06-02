---
name: stage-3-locator-discovery
description: >
  Stage 3: Navigate to live khov.com pages, inspect the DOM, and extract
  robust locators for all elements referenced in approved test cases. Uses
  Playwright MCP browser tools to inspect the actual site. Also derives and
  validates the git branch name and sets up the worktree gate before Stage 4.
---

# Stage 3 — Locator Discovery

## Purpose
Inspect the live khov.com site and produce locators for every element
referenced in approved automated test cases. At the end of this stage,
derive the branch name and create the git worktree before handing off to Stage 4.

---

## ⛔ REQUIRED PRECONDITION — Stage 2 Gate

Stage 3 requires an **approved** test case list from Stage 2.

- Input must be an `automated_cases` array from a completed Stage 2 review
- If you only have raw `test-cases.json` with no human review, stop and invoke
  `stage-2-human-review` first — unless the engineer explicitly says to skip review

---

## Input

`automated_cases` array from Stage 2 approval. Each case must include the page
and block it targets so the correct URL can be navigated to.

---

## Step 1 — Derive and Confirm Branch Name

Before any browser navigation, derive the git branch name from the Jira metadata.

### Branch Naming Convention

```
feat/{jira-id-lowercase}-{block-slug}
```

**Rules:**
- All lowercase — no uppercase letters
- Jira ID: lowercase with hyphen separator (`khov-394`, NOT `KHOV394` or `khov_394`)
- Block slug: kebab-case description of the block under test (`hero-block`, `contact-form`, `community-detail`)
- No spaces, no underscores, no special characters (only `-` separators)
- Maximum 60 characters total
- If the story ID is not known, use `feat/{block-slug}` only

**Examples:**
```
feat/khov-394-hero-block
feat/khov-945-contact-form
feat/khov-1298-community-detail-page
feat/khov-394-search-results-page
```

**Multi-story commits:** Use the primary story ID only in the branch name.
All Jira IDs appear in the commit message body (Stage 7).

### Present for Confirmation

Display the derived branch name to the engineer before continuing:

```
Branch name derived from story metadata:

  feat/khov-{id}-{block-slug}

Confirm this branch name, or provide an alternative:
```

Wait for confirmation or correction before proceeding. Store the confirmed
branch name — it is used in the worktree gate at the end of this stage.

**Validation rules to enforce on the engineer's answer:**
- Must start with `feat/`
- No uppercase letters
- No spaces or underscores
- No consecutive hyphens (`--`)
- Maximum 60 characters

---

## Step 2 — Read Existing Page Objects

Before any browser navigation, ALWAYS read the existing page object file first:

```
page-objects/{relevantPage}Page.ts
page-objects/basePage.ts
```

Many locators may already exist. Only discover what is genuinely missing.
Record which locators are already defined so the Stage 4 handoff is accurate.

---

## Step 3 — Resolve the Target URL

Do NOT guess or construct URLs. Use this resolution order:

1. Check `approved_cases[].steps` for any URL or page name clues
2. Check `utils/constants.json` for existing page URLs under the relevant key
3. If the URL is still unclear, ask the engineer:

   ```
   What is the URL for the {page} you want to test?
   Example: https://www.khov.com/new-homes/california/san-jose
   ```

4. For deep pages (community detail, floor plan, model home), always ask for
   a specific example URL — do NOT attempt to navigate there by clicking through
   the site, as random navigation will produce locators tied to a random data set

---

## Step 4 — Navigate to the Live Site

Use Playwright MCP browser tools:

1. Navigate to the resolved URL
2. **Cookie banner**: If `#onetrust-consent-sdk` is visible, click
   `#onetrust-accept-btn-handler` to dismiss it. This matches the
   `basePage.ts` `dismissCookies()` pattern.
3. Dismiss any modal overlays (promo, newsletter) if present
4. Wait for the target block/section to be visible before inspecting

### Confirm You Are on the Correct Page

After navigating, take a snapshot to verify:

```
browser_snapshot  (or browser_take_screenshot)
```

Verify:
- Page title matches the expected page
- At least one known landmark element is visible (header, footer, target block)
- The target section is present in the viewport or reachable by scrolling

**If the wrong page loaded**, do NOT proceed with DOM inspection — re-navigate
or ask the engineer for the correct URL.

---

## Step 5 — Multi-Page Discovery

If `approved_cases` reference more than one page, group by page and
discover locators **one page at a time** — complete all locators for Page A
before navigating to Page B.

Track progress with a running checklist:

```
Page: Home Page (https://www.khov.com/)
  ✅ heroBlock
  ✅ heroHeadline
  ⏳ videoCTA — checking...

Page: Community Page (https://www.khov.com/new-homes/.../community-name)
  ⏳ communityCard — not started
```

---

## Step 6 — Extract DOM Structure

Use `browser_evaluate` to extract element structure for each target element:

```javascript
// Get all attributes of an element
document.querySelector('section#hero-block').getAttributeNames()

// Check if an ID exists
!!document.querySelector('#hero-block')

// Get all class names on an element
document.querySelector('.hero').className

// Inspect form fields
Array.from(document.querySelectorAll('input')).map(el => ({
  name: el.name, type: el.type, placeholder: el.placeholder
}))
```

Extract:
- Tag names, IDs, classes, attributes
- Form field `name` attributes and `placeholder` text
- Button text and `data-testid` attributes
- Section IDs and container selectors
- `aria-label` values on interactive elements

---

## Step 7 — Choose Locators

Follow this priority order strictly:

| Priority | Strategy | When to use | Example |
|----------|----------|-------------|---------|
| 1 | `#id` selector | Block containers with stable IDs | `page.locator('#hero-block')` |
| 2 | `getByRole()` | Buttons, headings, navigation links | `page.getByRole('heading', { name: 'Find a Home' })` |
| 3 | `input[name="..."]` | Form fields with `name` attributes | `form.locator('input[name="first_name"]')` |
| 4 | `[data-testid="..."]` | When `data-testid` is present | `page.locator('[data-testid="cta-button"]')` |
| 5 | CSS class selectors | Scoped to a stable parent container | `this.heroBlock.locator('span.headline')` |
| 6 | `:has-text()` filter | List items identified by visible text | `'li:has-text("Schedule a Tour")'` |
| 7 | `.or()` chaining | Fallback when markup varies | `getByRole('button').or(page.locator('.btn-primary'))` |

**NEVER use:**
- XPath (except where existing code already uses it)
- `nth-child` or `nth-of-type` positional selectors
- Auto-generated IDs (random alphanumeric strings that change between deploys)
- Page-wide class selectors with no parent scoping

---

## Step 8 — Verify Uniqueness

Every locator must resolve to exactly **one** element:

```javascript
// Must return 1
document.querySelectorAll('your-selector').length
```

If a locator matches more than one element, refine it:
- Scope to the parent container: `this.heroBlock.locator('h1')`
- Add a `.filter({ hasText: '...' })` clause
- Use a more specific attribute

---

## Step 9 — Handle Elements That Cannot Be Located

If a required element is not found in the DOM:

1. Scroll the full page — element may be below the fold or lazy-loaded
2. Try an interaction first (hover, click, scroll-into-view) — element may only render after trigger
3. Try a different instance of the page (different URL with different data)
4. After 3 attempts with no result, mark as **unresolved** and continue:

```
Unresolved: {locatorName}
Reason: Element not found in DOM at {URL}
Action: Stub in POM with TODO comment — do NOT block Stage 4
```

Do not let one unresolved element block discovery of all other locators.
List all unresolved elements in the Stage 4 handoff.

---

## Output — Locator Summary for Stage 4

**Do NOT write to any `.ts` files at this point.** The git worktree does not
exist yet — all file writes happen in Stage 4 and later.

Produce a structured locator summary to pass to Stage 4:

```
Locator Discovery Complete
──────────────────────────────────────────────────
Page:     {PageName}
POM file: page-objects/{pageName}Page.ts
Branch:   feat/khov-{id}-{block-slug}
URL used: {URL}

New locators to add:
┌──────────────────────────┬─────────────────────────────────────────────────┬────────────┐
│ Property name            │ Locator                                         │ Status     │
├──────────────────────────┼─────────────────────────────────────────────────┼────────────┤
│ heroBlock                │ page.locator('section#hero-block')              │ ✅ verified │
│ heroHeadline             │ this.heroBlock.locator('h1.headline')           │ ✅ verified │
│ ctaButton                │ page.locator('a[data-testid="cta-primary"]')    │ ✅ verified │
│ videoModal               │ page.locator('.modal-video')                    │ ❌ unresolved│
└──────────────────────────┴─────────────────────────────────────────────────┴────────────┘

Already in POM (no action needed):
  cookieBanner, cookieAcceptButton  ← inherited from BasePage

Unresolved — Stage 4 will add TODO stubs:
  videoModal: not present in DOM at {URL} after 3 attempts
──────────────────────────────────────────────────
```

---

## ⛔ WORKTREE GATE — Required Before Stage 4

After completing locator discovery and presenting the summary above, a git
worktree **must** be created before Stage 4 writes any `.ts` files.

### Steps:

1. Confirm branch name from Step 1 is finalized
2. Check if a worktree already exists for this branch:
   ```powershell
   git worktree list
   ```
3. **If no worktree exists** → use the `EnterWorktree` tool:
   - Branch: `feat/khov-{id}-{block-slug}` (the confirmed name from Step 1)
   - The tool creates the worktree at `D:\Khov\.claude\worktrees\worktree-feat+{slug}`
4. **If a worktree already exists** (resuming a previous session) → navigate
   into it and continue. Do NOT create a duplicate.
5. Confirm worktree path to the engineer before calling Stage 4

**ALL file writes in Stages 4–7 happen inside the worktree. Never write
generated `.ts` files to the main `D:\Khov` directory.**

---

## Handoff to Stage 4

Pass to Stage 4:
- The full locator summary table above
- The confirmed branch name
- The worktree path (from `EnterWorktree` output or `git worktree list`)
- The list of unresolved locators (for TODO stubs in POM)

Then invoke: **Stage 4 — POM Generation**
