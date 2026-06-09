---
name: stage-6-test-execution
description: >
  Stage 6: Run generated Playwright specs, capture results, report pass/fail
  with suggested fixes for failures. Maximum 3 fix iterations.
---

# Stage 6 — Test Execution

## Purpose
Execute the Playwright spec file, parse results, and provide an actionable
failure report with suggested fixes.

## Input
- Spec file absolute path from Stage 5 (e.g., `D:\Khov\.claude\worktrees\worktree-feat+{slug}\tests\{pageName}.spec.ts`)
- POM file absolute path from Stage 4 (e.g., `D:\Khov\.claude\worktrees\worktree-feat+{slug}\page-objects\{pageName}Page.ts`)
- Manual TC list from Stage 5 (TCs skipped due to unresolved locators)

---

## Step 1 — Navigate into the Worktree

**All commands in this stage run from inside the worktree directory.**

```powershell
cd "D:\Khov\.claude\worktrees\worktree-feat+{slug}"
```

Never run Playwright or tsc from `D:\Khov` directly — the main repo's `tests/`
directory has no spec files and tsc won't find the worktree source files.

---

## Step 2 — TypeScript Compilation Check

Run from inside the worktree:

```powershell
npx tsc --noEmit 2>&1 | grep -v "TS1149"
```

> Stage 5 should have already run this before handoff. This is a safety net —
> if Stage 5 confirmed `tsc --noEmit: PASSED`, you may skip this step.
> If any errors appear, fix them before running tests.

TS1149 casing warnings are pre-existing and can be ignored. All other errors must be fixed.

---

## Step 3 — Verify Test Data

Ensure any new entries needed by the spec exist in:
- `utils/test_data.json` — form inputs, API endpoints
- `utils/constants.json` — expected text values, page URLs

Both files are read from the worktree copy.

---

## Step 4 — Environment Selection

Env files live at `environment/{env}.env` (`dev`, `uat`, `stage`, `prod`). Config
falls back to `dev` if `TEST_ENV` is unset. Base URLs: dev `www-dev.khov.com`,
uat `www-uat.khov.com`, stage `www-stg.khov.com`, prod `www.khov.com`.

```
Use prod: REQUIRED for specs pinned to prod-only data (e.g. the community-page
          specs are pinned to River Ranch Trails, which exists only on prod)
Use dev:  default for environment-agnostic specs
Use uat/stage: if dev is unreachable or for env-specific certification
```

Switch envs only for infrastructure errors (`ERR_CONNECTION_REFUSED`, SSL errors,
maintenance page) — not to mask test failures.

---

## Step 5 — Execute Tests (Two-Phase Strategy)

Run smoke first. Only run regression after smoke passes. This isolates structural
failures (navigation, block visibility) from deeper data/interaction failures and
cuts debug time significantly.

### Phase 1 — Smoke Tests

```powershell
npm run smoke:dev -- tests/{pageName}.spec.ts --reporter=list
```

If smoke fails → fix the failures before running regression (Gap 5 pattern below).

### Phase 2 — Regression Tests

```powershell
npm run regression:dev -- tests/{pageName}.spec.ts --reporter=list
```

### Run a Single Spec (All Tests)

```powershell
npm run test:dev -- tests/{pageName}.spec.ts --project=Chrome --reporter=list
```

### Run Specific Test Cases by grep

```powershell
npm run test:dev -- tests/{pageName}.spec.ts --project=Chrome --reporter=list --grep "TC-01|TC-02"
```

### Available npm scripts (reference)

```
npm run test:dev        # Full suite, dev
npm run test:uat        # Full suite, UAT
npm run smoke:dev       # @smoke tests, dev
npm run regression:dev  # @regression tests, dev
```

---

## Step 5b — Execution Scope (iterate narrow, finalize on the class)

**While iterating on a scenario, run ONLY the test you are editing.** Re-running
more than that after every edit is slow and, against a live site, throttles it,
which itself causes flaky failures. **At finalization, run only the corresponding
class (the spec file you worked on) — NOT the whole suite.**

- **Iterate:** after editing a test body, or a locator/method used **only** by that
  test, run just that test:
  ```
  npm run test:dev -- tests/{pageName}.spec.ts --project=Chrome --grep "TC-01"
  # or pin by line:
  npm run test:dev -- tests/{pageName}.spec.ts:42 --project=Chrome
  ```
- **Finalize (default) — run the full corresponding class only**, right before
  Stage 7 (commit), as the regression gate for that page:
  ```
  npm run test:dev -- tests/{pageName}.spec.ts --project=Chrome
  ```
- **Shared-file exception:** if you touched a file used by **every** spec —
  `utils/validator.ts`, base-page / navigation helpers (`navigateToHome` /
  `navigateToCommunity`), or `playwright.config.ts` — run the full corresponding
  class **plus one representative test (first `@smoke` / TC-01) from each other
  spec** as a per-file sanity check, instead of the whole suite:
  ```
  # full class you worked on
  npm run test:dev -- tests/{pageName}.spec.ts --project=Chrome
  # one representative test per OTHER spec
  npm run test:dev -- tests/{otherSpec}.spec.ts --project=Chrome --grep "TC-01"
  ```
- **Never** run the complete suite (all tests of all classes) as the routine
  finalization gate.

---

## Result Analysis

### Identify Failure Source

For each failing test, determine which category applies:

| Category | Description | Action |
|----------|-------------|--------|
| **Test code issue** | Wrong locator, bad assertion, missing wait | Fix POM or spec |
| **Navigation flakiness** | Transient timing, inconsistent page load | Rerun with `--retries=1` to confirm |
| **Site issue** | Actual content bug on the page | Document, do not fix test |
| **Infrastructure** | VPN needed, SSL error, site down | Check network, switch to UAT |

### Common Error Patterns

| Error | Cause | Fix |
|-------|-------|-----|
| `Element is outside of the viewport` | Element not scrolled into view | Add `scrollIntoView` or retry |
| `TimeoutError: locator.click()` | Element not found or wrong selector | Re-inspect DOM, update locator |
| `strict mode violation` | Locator matches multiple elements | Scope to parent or use `.filter()` |
| `intercepts pointer events` | Sticky header covers element | Use `{ force: true }` on click |
| `expect(received).toBe(expected)` | Data mismatch | Verify expected values against live site |
| `ERR_CONNECTION_REFUSED` / `SSL_ERROR` | Site unreachable or VPN required | Check network, switch to `npm run smoke:uat` |
| `net::ERR_NAME_NOT_RESOLVED` | DNS failure / no network | Restore network connection |

### Fix Iteration Process

1. **Apply fixes to the worktree files only:**
   ```
   D:\Khov\.claude\worktrees\worktree-feat+{slug}\page-objects\{pageName}Page.ts
   D:\Khov\.claude\worktrees\worktree-feat+{slug}\tests\{pageName}.spec.ts
   ```
   **NEVER edit files in `D:\Khov\page-objects\` or `D:\Khov\tests\` directly.**

2. **Rerun only the failing tests:**
   ```powershell
   npm run test:dev -- tests/{pageName}.spec.ts --project=Chrome --reporter=list --grep "TC-XX|TC-YY"
   ```

3. **If still failing — re-inspect the live site** using Playwright MCP browser tools.
   Navigate to the same URL used in `beforeEach`, re-run DOM inspection on the
   failing element, update the locator if it has changed.

4. **Investigating suspected flakiness:**
   ```powershell
   # Add --retries=1 (local default is 0)
   npm run test:dev -- tests/{pageName}.spec.ts --retries=1 --grep "TC-XX" --reporter=list
   # Passes on retry → flaky (timing issue, add explicit wait in POM)
   # Fails twice → real failure (fix the test or document as site bug)
   ```

5. **Maximum 3 fix iterations.** If a test still fails after 3 iterations, flag it:
   ```
   TC-XX: Unresolved after 3 iterations
   Reason: [describe what was tried]
   Recommendation: Manual investigation required — mark as @manual for now
   ```

---

## Reporting

### Summary Format

```
Test Execution Results — {pageName}.spec.ts
───────────────────────────────────────────
Environment: dev (https://www.khov.com/)
Total automated: XX tests
  Passed:  XX
  Failed:  XX  → [TC-XX, TC-YY]
Duration: Xm Xs

Manual (skipped — unresolved locators from Stage 4):
  XX TCs  → [TC-XX, TC-YY]

Failures:
  TC-XX: [error summary] — [fix applied / suggested fix]
  TC-YY: [error summary] — [fix applied / suggested fix]
```

### For Flaky Navigation Failures

If failures are in `beforeEach` navigation, rerun with `--retries=1` to confirm:

```
Note: TC-XX failed due to transient navigation timing.
Confirmed passing on retry. Not a test code issue.
No fix applied — Playwright retries handle this in CI (retries: 2).
```

---

## Handoff

When all automated tests pass (or flaky-only failures confirmed), **automatically
invoke Stage 6b — Code Review**. Do not wait for user instruction.

Pass to Stage 6b:
- POM file absolute path
- Spec file absolute path
- Any test data files modified during this stage

After Stage 6b completes and all violations are resolved, proceed to Stage 7:

```
Code review complete. Ready for Stage 7 — Git Push.

Files to commit:
  page-objects/{pageName}Page.ts
  tests/{pageName}.spec.ts
  utils/test_data.json     ← if modified
  utils/constants.json     ← if modified

Automated tests: XX passing
Manual TCs:      XX (listed above)
```
