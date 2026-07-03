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
npm run smoke:stage
npm run smoke:prod

# Run only regression-tagged tests
npm run regression:dev
npm run regression:uat
npm run regression:stage
npm run regression:prod
```

> There are `dev`/`uat`/`stage`/`prod` npm scripts for each of `test`/`smoke`/`regression`.

### Projects and suites

Projects are **browsers**, not suites. `playwright.config.ts` defines one active
project — **`chromium`** — with `firefox`/`webkit` stubbed (commented) for later.
**Suite selection is done with `--grep`** against the `@smoke` / `@regression` tags,
not with a project. This decouples browser from suite so any browser can run any suite:

```bash
npx playwright test --project=chromium                 # whole suite, chromium
npx playwright test --project=chromium --grep @smoke   # smoke only
npx playwright test --project=chromium --grep @regression
```

### Running a Single Test File

```bash
npx playwright test tests/homePage.spec.ts --project=chromium
# one test by tag/title or line:
npx playwright test tests/homePage.spec.ts --project=chromium --grep "TC-01"
npx playwright test tests/homePage.spec.ts:42 --project=chromium
```

### Running with a Specific Environment

```bash
# via npm script (uses cross-env from node_modules):
npm run test:prod -- tests/homePage.spec.ts --project=chromium

# or set TEST_ENV inline (macOS/Linux). `cross-env` is NOT installed globally,
# so prefix the variable directly rather than calling `cross-env`:
TEST_ENV=stage npx playwright test tests/homePage.spec.ts --project=chromium
```

### CI (GitHub Actions)

`.github/workflows/e2e-tests.yml` runs the suite in CI. It is `workflow_dispatch`
(manual) with inputs **environment** (dev/stage/prod), **suite** (smoke/regression/all),
and **browser** (chromium; firefox/webkit ready to enable). Config (`BASE_URL`, `RP_*`)
comes from **GitHub Environments** (Variables + the `RP_API_KEY` Secret), not from
`environment/*.env` files. CI sets `CI=true`, which switches the config to capture
trace + video on failure; those plus the HTML report and JUnit XML are uploaded as
artifacts. Runs on `ubuntu-latest`; add browsers by uncommenting the projects in
`playwright.config.ts` and the `firefox`/`webkit` options in the workflow.

### Viewing Reports

**ReportPortal (primary).** Set `RP_API_KEY`, `RP_ENDPOINT`, `RP_PROJECT` in the
active `environment/{TEST_ENV}.env`; the agent then reports each run live. Open
the launches page printed at the end of the run (e.g. `http://localhost:8080`),
or use the convenience script which opens it for you:

```bash
npm run test:report:dev    # runs the suite, then opens the RP launches page
```

**Allure (retired, kept as a transition fallback).** The reporter is commented
out in `playwright.config.ts`; re-enable that line to use it, then:

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
environment/    → example.env (tracked template) + local dev.env/uat.env/stage.env/prod.env (gitignored)
```

### Environment Configuration

`playwright.config.ts` reads `process.env.TEST_ENV` (set via npm scripts; falls back to `dev` if unset/unknown, with a warning) and loads `environment/{TEST_ENV}.env`. Supported envs: `dev`, `uat`, `stage`, `prod`. Each env file defines `ENV` and `BASE_URL`; `baseURL` comes **only** from `BASE_URL` (the config throws fail-fast if it's unset). Base URLs: dev `www-dev`, uat `www-uat`, stage `www-stg`, prod `www.khov.com`.

**Env files are gitignored** (they hold secrets like `RP_API_KEY`); only `environment/example.env` is tracked as the template — copy it to `dev.env` etc. and fill real values. In CI these come from GitHub Environments instead (see the CI section). Because `dotenv.config()` does not override already-set `process.env`, a local file feeds local runs while injected CI values feed CI runs; a missing file is a harmless no-op.

Tests run **headless** (`headless: true` in config). CI (`CI=true`) additionally captures `trace`/`video` `retain-on-failure`; locally those stay light (`trace: on-first-retry`, `video: off`).

> The community-page specs are pinned to the River Ranch Trails community, which is available on dev, uat, and prod — they can run against any environment.

### ReportPortal Integration

`tests/baseTest.ts` extends Playwright's base test with ReportPortal lifecycle hooks (per-test description, start/end markers, and on-failure screenshot + reason) via the agent's `ReportingApi`. Run/environment metadata (env, base URL, OS, Node) is attached at the **launch** level via the agent's `attributes` in `playwright.config.ts`. All spec files must import `test` from `./baseTest` — importing directly from `@playwright/test` bypasses these hooks. `expect` is imported separately from `@playwright/test` since `baseTest.ts` does not re-export it:

**Step tree.** The agent's `includeTestSteps: true` is required for `test.step()` calls (every `Validator` assertion + `reportValue`) to appear in RP — without it the step tree is dropped entirely. Because the agent then reports ALL Playwright steps (incl. raw `pw:api`/`expect` lines exposing locators/methods, with no `detail: false` equivalent), the RP reporter is wrapped by `reporters/reportPortalReporter.ts`, which forwards only `test.step` + `hook` categories and drops `pw:api`/`expect`/`fixture`. This yields the clean, named-steps-only view (the Allure `detail: false` equivalent) and also suppresses the benign caught-timeout error logs from best-effort waits. The config points at the wrapper, not the agent package directly.

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
- **ReportPortal** — primary report; agent pushes live to the RP server (enabled when `RP_API_KEY` is set)
- **Allure** — retired; reporter commented out in `playwright.config.ts`, kept as a transition fallback
- **HTML** — Playwright's built-in HTML report in `playwright-report/`
