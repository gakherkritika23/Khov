# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Commands

### Running Tests

All test commands use `cross-env` to set `TEST_ENV`, which determines which environment file (`environment/{TEST_ENV}.env`) is loaded. Supported envs: `dev`, `uat`, `stage`, `prod` (config falls back to `dev` if `TEST_ENV` is unset/unknown):

```bash
# Run full suite against an environment
npm run test:dev
npm run test:uat
npm run test:prod

# Run only smoke-tagged tests
npm run smoke:dev
npm run smoke:uat
npm run smoke:prod

# Run only regression-tagged tests
npm run regression:dev
npm run regression:uat
npm run regression:prod
```

> Note: there are npm scripts for `dev`/`uat`/`prod` only. For `stage`, set
> `TEST_ENV=stage` directly (see below).

### Projects

`playwright.config.ts` defines three projects:
- **`Chrome`** — Chromium, runs every test (use this to run a whole spec).
- **`smoke`** — `grep` `@smoke` only.
- **`regression`** — `grep` `@regression` only.

There is no `chromium` project — use `--project=Chrome`.

### Running a Single Test File

```bash
npx playwright test tests/homePage.spec.ts --project=Chrome
# one test by tag/title or line:
npx playwright test tests/homePage.spec.ts --project=Chrome --grep "TC-01"
npx playwright test tests/homePage.spec.ts:42 --project=Chrome
```

### Running Tests with a Specific Tag

```bash
npx playwright test --project=smoke
npx playwright test --project=regression
```

### Running with a Specific Environment

```bash
# via npm script (uses cross-env from node_modules):
npm run test:prod -- tests/homePage.spec.ts --project=Chrome

# or set TEST_ENV inline (macOS/Linux). `cross-env` is NOT installed globally,
# so prefix the variable directly rather than calling `cross-env`:
TEST_ENV=stage npx playwright test tests/homePage.spec.ts --project=Chrome
```

### Viewing Allure Reports

```bash
npx allure generate allure-results --clean
npx allure open
```

## Architecture

### Layer Structure

```
tests/          → Test specs (.spec.ts), consume page objects and utils
page-objects/   → Page Object Model classes
utils/          → Shared helpers (validation, API, string, constants)
scripts/        → Tooling (e.g. generate-client-report.ts)
environment/    → dev.env / uat.env / stage.env / prod.env (per-env BASE_URL)
```

### Environment Configuration

`playwright.config.ts` reads `process.env.TEST_ENV` (set via npm scripts; falls back to `dev` if unset/unknown, with a warning) and loads `environment/{TEST_ENV}.env`. Supported envs: `dev`, `uat`, `stage`, `prod`. Each env file defines `ENV` and `BASE_URL`; `baseURL` comes **only** from `BASE_URL` (the config throws fail-fast if it's unset). Base URLs: dev `www-dev`, uat `www-uat`, stage `www-stg`, prod `www.khov.com`. Tests run **headed** (`headless: false` in config).

> The community-page specs are pinned to a **prod**-only community (River Ranch Trails), so run them with `TEST_ENV=prod`.

### Allure Integration

`tests/baseTest.ts` extends Playwright's base test with Allure lifecycle hooks (environment properties, test descriptions, failure screenshots). All spec files must import `test` from `./baseTest` — importing directly from `@playwright/test` bypasses these hooks and produces incomplete Allure reports. `expect` is imported separately from `@playwright/test` since `baseTest.ts` does not re-export it:

```typescript
import { expect } from "@playwright/test";
import { test } from "./baseTest";
```

### Page Object Pattern

- `page-objects/basePage.ts` — Base class with reusable methods: `click()`, `type()`, `navigate()`, `getText()`, `isVisible()`, `waitForVisible()`, `scrollIntoView()`, and related utilities. All page objects extend this. Note: `dismissCookies()` has been removed — pages that need cookie dismissal implement it directly.
- Each page object defines `readonly Locator` fields in the constructor and exposes named action methods.

### Test Structure Pattern

Tests use `test.describe()` with a fresh `Page` instance created per test in `beforeEach`. `playwright.config.ts` sets `fullyParallel: false` so tests within a file run sequentially. Test case IDs follow the convention `TC-XX | Description @tag`.

### Test Data

- `utils/constants.json` — Expected text values, URLs, and API endpoint paths keyed by page name
- Add `utils/test_data.json` for form inputs or dynamic test data as needed

### Utilities

- `utils/validator.ts` — Static `Validator` class with assertion helpers: `requireVisible`, `requireHidden`, `requireEnabled`, `requireText`, `requireUrlContains`
- `utils/stringUtils.ts` — Text normalization helpers: `escapeRegExp`, `normalizeText`
- `utils/apiUtils.ts` — `waitForApi(page, endpoint)` for intercepting network responses (checks status 200 in predicate)

### Test Tagging

Tests are tagged in their description string with `@smoke` or `@regression`. The `playwright.config.ts` projects use `grep` to filter by tag for the corresponding npm scripts.

### Reporters

- **List** — console output
- **JUnit** — `results.xml` for CI integration
- **Allure** — detailed HTML reports written to `allure-results/`
- **HTML** — Playwright's built-in HTML report in `playwright-report/`
