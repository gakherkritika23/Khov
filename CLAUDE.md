# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Commands

### Running Tests

All test commands use `cross-env` to set `TEST_ENV`, which determines which `.env` file is loaded:

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

### Running a Single Test File

```bash
npx playwright test tests/homePage.spec.ts
npx playwright test tests/homePage.spec.ts --project=chromium
```

### Running Tests with a Specific Tag

```bash
npx playwright test --grep @smoke
npx playwright test --grep @regression
```

### Running with a Specific Environment

```bash
cross-env TEST_ENV=uat npx playwright test tests/homePage.spec.ts
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
environment/    → .env.dev / .env.uat / .env.prod (base URLs, browser, timeout)
```

### Environment Configuration

`playwright.config.ts` reads `process.env.TEST_ENV` (set via npm scripts, defaults to `dev` when unset) and loads `environment/.env.{TEST_ENV}`. The env files expose `BASE_URL`, `BROWSER`, and `DEFAULT_TIMEOUT` into the Playwright config. Tests run headed locally and headless on CI.

### Allure Integration

`tests/baseTest.ts` extends Playwright's base test with Allure lifecycle hooks (environment properties, test descriptions, failure screenshots). **Note:** tests currently import `test` directly from `@playwright/test`, not from `baseTest.ts` — the base test hooks run via the config but the custom `test` export is not yet wired into spec files.

### Page Object Pattern

- `page-objects/basePage.ts` — Base class with reusable methods: `click()`, `type()`, `navigate()`, `dismissCookies()`, and wait utilities. All page objects extend this.
- Each page object defines `readonly Locator` fields in the constructor and exposes named action methods.

### Test Structure Pattern

Tests use `test.describe.serial()` with a shared `Page` instance created in `beforeAll` and torn down in `afterAll`. Test case IDs follow the convention `TC-XX | Description`.

### Test Data

- `utils/constants.json` — Expected text values, URLs, and API endpoint paths keyed by page name
- Add `utils/test_data.json` for form inputs or dynamic test data as needed

### Utilities

- `utils/validator.ts` — Static `Validator` class with assertion helpers (`requireVisible`, `requireText`, `assertDescendingNumbers`, etc.)
- `utils/stringUtils.ts` — Text normalization, currency parsing, number range formatting
- `utils/apiUtils.ts` — `waitForApi()` and `apiResponseData<T>()` for intercepting network responses

### Test Tagging

Tests are tagged in their description string with `@smoke` or `@regression`. The `playwright.config.ts` projects use `grep` to filter by tag for the corresponding npm scripts.

### Reporters

- **List** — console output
- **JUnit** — `results.xml` for CI integration
- **Allure** — detailed HTML reports written to `allure-results/`
- **HTML** — Playwright's built-in HTML report in `playwright-report/`
