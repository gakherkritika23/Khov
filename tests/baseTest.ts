import { test as base } from "@playwright/test";

/**
 * Shared test fixture. All spec files import `test` from here (never from
 * `@playwright/test` directly) so the import stays stable if per-test behaviour
 * is added later. `expect` is imported separately from `@playwright/test` in
 * specs, since this module does not re-export it.
 *
 * On failure we attach a screenshot via `testInfo.attach` in afterEach. This is
 * deliberately explicit rather than relying on Playwright's `screenshot` config:
 * the native `on-first-failure` capture proved unreliable when a test fails right
 * after a client-side navigation (it silently skipped the capture). `testInfo`
 * attachments are forwarded to ReportPortal deterministically by the agent in
 * onTestEnd, and `extendTestDescriptionWithLastError` puts the error in the RP
 * description. The step tree comes from test.step() (Validator + reportValue)
 * via the wrapper reporter; per-action narration comes from console.log.
 *
 * (An earlier version drove this via the agent's ReportingApi in hooks, but that
 * emits over stdout whose per-test attribution is unreliable; testInfo.attach is
 * the reliable channel.)
 */
export const test = base.extend({});

test.afterEach(async ({ page }, testInfo) => {
  if (page && !page.isClosed() && testInfo.status !== testInfo.expectedStatus) {
    try {
      const screenshot = await page.screenshot({ timeout: 15000 });
      await testInfo.attach("failure-screenshot", {
        body: screenshot,
        contentType: "image/png",
      });
    } catch {
      // Page may be unresponsive at failure time; the Playwright error-context
      // (ARIA snapshot) is still captured as fallback evidence.
    }
  }
});
