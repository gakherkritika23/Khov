import RPReporter from "@reportportal/agent-js-playwright";
import type { TestCase, TestResult, TestStep } from "@playwright/test/reporter";

/**
 * ReportPortal reporter wrapper that reports a clean, client-readable step tree.
 *
 * The stock agent (with includeTestSteps) reports EVERY Playwright step — incl.
 * raw `pw:api`/`expect` lines that expose locators and methods
 * (`Click getByRole(...)`, `Fill ...`, `Expect "toBeVisible" ...`, `Navigate`,
 * `Wait for selector`) and `fixture` plumbing (`Launch browser`, `Create
 * context`). That is the low-level noise the suite hid in Allure via
 * `detail: false`, and it has no config equivalent in the agent.
 *
 * This wrapper forwards only:
 *   - `test.step`  — our own named steps (every Validator assertion + reportValue)
 *   - `hook`       — the Before/After-hook containers that PARENT named steps
 *                    created inside beforeEach; the agent drops a nested step
 *                    whose parent step was never reported, so we must keep these.
 *
 * It drops `pw:api`, `expect`, and `fixture`. Dropping `pw:api`/`expect` also
 * removes the benign caught-timeout "errors" the agent would otherwise log for
 * best-effort waits (consent popup, Turnstile poll, scrollIntoView retries),
 * since those errors live on the dropped steps.
 */
const FORWARDED_STEP_CATEGORIES = new Set(["test.step", "hook"]);

// Playwright split TestStep into TestStep + TestStepWithId in a later release;
// the RP agent was written against the old shape where `id` was on TestStep.
// The cast below is safe — Playwright still attaches `id` at runtime; only the
// declared type changed.
type StepWithId = TestStep & { id: string };

export default class CleanReportPortalReporter extends RPReporter {
  onStepBegin(test: TestCase, result: TestResult, step: TestStep): void {
    if (!FORWARDED_STEP_CATEGORIES.has(step.category)) return;
    super.onStepBegin(test, result, step as StepWithId);
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep): Promise<void> {
    if (!FORWARDED_STEP_CATEGORIES.has(step.category)) return Promise.resolve();
    return super.onStepEnd(test, result, step as StepWithId);
  }
}
