import { test as base } from "@playwright/test";

/**
 * Shared test fixture. All spec files import `test` from here (never from
 * `@playwright/test` directly) so the import stays stable if per-test behaviour
 * is added later. `expect` is imported separately from `@playwright/test` in
 * specs, since this module does not re-export it.
 *
 * ReportPortal reporting needs NO per-test hooks here:
 *   - Failure screenshot + error context are captured by Playwright natively
 *     (`screenshot: "on-first-failure"` in playwright.config.ts) and forwarded
 *     to RP deterministically by the agent in onTestEnd.
 *   - The last error is surfaced into the RP test description via the agent's
 *     `extendTestDescriptionWithLastError` option.
 *   - Step tree comes from test.step() (Validator + reportValue) via the clean
 *     wrapper reporter; per-action narration comes from console.log, which the
 *     agent forwards as test logs.
 *
 * An earlier version drove these via the agent's ReportingApi in before/after
 * hooks, but ReportingApi emits over stdout and Playwright's attribution of hook
 * stdout to a test is unreliable across a multi-test run (the hook logs landed
 * for only ~1/3 of tests), so that approach was removed in favour of the native
 * paths above.
 */
export const test = base.extend({});
