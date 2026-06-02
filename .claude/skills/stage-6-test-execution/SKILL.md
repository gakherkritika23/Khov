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
- Spec file path from Stage 5 (e.g., `tests/homePage.spec.ts`)
- POM file path from Stage 4 (e.g., `page-objects/homePage.ts`)

## Pre-Execution

### 1. TypeScript Compilation Check
```bash
npx tsc --noEmit 2>&1 | grep -v "TS1149"
```
Fix any compilation errors before running tests. TS1149 casing warnings are
pre-existing and can be ignored.

### 2. Verify Test Data
Ensure `utils/test_data.json` and `utils/constants.json` have any new entries
needed by the test cases.

## Execution Commands

### Run the spec file against dev environment
```bash
npx cross-env TEST_ENV=dev npx playwright test tests/{specFile}.spec.ts --project=chromium --reporter=list
```

### Run specific test cases by grep
```bash
npx cross-env TEST_ENV=dev npx playwright test tests/{specFile}.spec.ts --project=chromium --reporter=list --grep "TC-01|TC-02"
```

### Run smoke tests only
```bash
npx cross-env TEST_ENV=dev npx playwright test tests/{specFile}.spec.ts --project=smoke --reporter=list
```

### Available npm scripts
```bash
npm run test:dev    # Full suite against dev
npm run test:uat    # Full suite against UAT
npm run smoke:dev   # Smoke tests against dev
```

## Result Analysis

### Identify Failure Source
For each failing test, determine if the failure is:
1. **Test code issue** — locator wrong, assertion incorrect, missing wait
2. **Navigation flakiness** — transient timing issue (retry confirms)
3. **Site issue** — actual bug on the page

### Common Error Patterns

| Error | Cause | Fix |
|-------|-------|-----|
| `Element is outside of the viewport` | Element not scrolled into view | Add `scrollIntoView` or retry |
| `TimeoutError: locator.click()` | Element not found or wrong selector | Re-inspect DOM, update locator |
| `strict mode violation` | Locator matches multiple elements | Add `.first()` or more specific selector |
| `intercepts pointer events` | Sticky header covers element | Use `{ force: true }` on click |
| `expect(received).toBe(expected)` | Data mismatch | Verify expected values against live site |

### Fix Iteration Process
1. Apply fixes to POM or spec
2. Rerun only failing tests: `--grep "TC-XX|TC-YY"`
3. If still failing, inspect live site again with Playwright MCP
4. Maximum 3 fix iterations before flagging for manual investigation

## Reporting

### Summary Format
```
Test Execution Results — {specFile}.spec.ts
───────────────────────────────────────────
Total: XX tests
Passed: XX
Failed: XX (list test IDs)
Duration: Xm Xs

Failures:
  TC-XX: [error summary] — [fix applied/suggested]
```

### For Flaky Navigation Failures
If failures are in `beforeEach` navigation, rerun those tests
to confirm they pass. Report as:
```
Note: X tests failed due to transient navigation flakiness.
Confirmed passing on rerun. Not a test code issue.
```

## Handoff
When all tests pass (or flaky-only failures confirmed), **always invoke Stage 6b — Code Review** before proceeding to Stage 7.

Invoke the `stage-6b-code-review` skill automatically at this point. Do not wait for user instruction.

After Stage 6b completes and any issues are resolved, proceed to Stage 7:
"Code review complete. Ready for **Stage 7 — Git Push**."

Provide the list of all files to commit:
- `page-objects/{pageName}Page.ts`
- `tests/{pageName}.spec.ts`
- `utils/test_data.json` (if modified)
- `utils/constants.json` (if modified)
