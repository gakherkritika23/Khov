import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import path from "path";

// Available environments, mapped to their env files in environment/.
const SUPPORTED_ENVS = ["dev", "uat", "stage", "prod"] as const;
const FALLBACK_ENV = "dev";

const requestedEnv = process.env.TEST_ENV?.toLowerCase();
const testEnv = (
  requestedEnv && SUPPORTED_ENVS.includes(requestedEnv as (typeof SUPPORTED_ENVS)[number])
    ? requestedEnv
    : FALLBACK_ENV
) as (typeof SUPPORTED_ENVS)[number];

if (requestedEnv && testEnv !== requestedEnv) {
  console.warn(
    `[playwright.config] Unknown TEST_ENV "${requestedEnv}". Falling back to "${FALLBACK_ENV}". ` +
      `Supported: ${SUPPORTED_ENVS.join(", ")}.`,
  );
}

const envPath = path.resolve(process.cwd(), `environment/${testEnv}.env`);
dotenv.config({ path: envPath });

// ReportPortal is enabled only when RP_API_KEY is present (POC: opt-in, so
// normal runs are unaffected when RP_* is not configured).
const reportPortalEnabled = !!process.env.RP_API_KEY;

// CI mode (GitHub Actions sets CI=true). Used to enable heavier failure
// artifacts (trace + video) only in CI so local runs stay fast.
const isCI = !!process.env.CI;

if (!process.env.BASE_URL) {
  throw new Error(
    `BASE_URL is not set. Define BASE_URL in environment/${testEnv}.env.`,
  );
}

export default defineConfig({
  testDir: "./tests",
  // Clears allure-results/ once before the run so the report shows only this run.
  globalSetup: "./global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // No retries: a test must pass on the first attempt rather than relying on a
  // re-run to occasionally go green. (If the app-side Request-Information modal
  // mount flake proves intolerable, revisit per-spec.)
  retries: 0,
  // Serial execution: this suite drives one live external site (khov.com).
  // Running spec files in parallel makes multiple browsers contend for the same
  // prod pages, causing timeouts and worker crashes. One worker = reliable.
  workers: 1,
  reporter: [
    ["list"],
    ["junit", { outputFile: "results.xml" }],
    // Allure is being retired in favour of ReportPortal. Kept disabled (deps +
    // global-setup retained) as a transition fallback — uncomment to flip back.
    // detail: false → Allure records only named test.step() verifications,
    // dropping low-level pw:api/expect steps (locator code, file:line, snippets).
    // ["allure-playwright", { outputFolder: "allure-results", detail: false }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    // ReportPortal — primary report. Only added when RP_API_KEY is set.
    ...(reportPortalEnabled
      ? [
          [
            // Wrapper around @reportportal/agent-js-playwright that drops
            // pw:api/expect/fixture steps so RP shows only our named steps.
            "./reporters/reportPortalReporter.ts",
            {
              apiKey: process.env.RP_API_KEY,
              endpoint: process.env.RP_ENDPOINT,
              project: process.env.RP_PROJECT,
              launch: `khov-${testEnv}`,
              // Launch-level run metadata (replaces the old Allure
              // environment.properties file).
              attributes: [
                { key: "env", value: testEnv },
                { key: "baseURL", value: process.env.BASE_URL ?? "" },
                { key: "os", value: process.platform },
                { key: "node", value: process.version },
              ],
              description: "End to End tests",
              // Report test.step() calls as nested steps in RP. Without this the
              // agent drops ALL steps (Validator assertions, reportValue) — only
              // logs/pass-fail would show. Required for the full step tree.
              includeTestSteps: true,
              // Surface the last error into the RP test description (reliable,
              // unlike ReportingApi-in-hooks which races on stdout attribution).
              extendTestDescriptionWithLastError: true,
            },
          ] as const,
        ]
      : []),
  ],
  use: {
    baseURL: process.env.BASE_URL,
    // Trace: in CI keep a trace whenever a test fails (primary debugging artifact,
    // works with retries:0). Locally, only on the first retry to avoid overhead.
    trace: isCI ? "retain-on-failure" : "on-first-retry",
    // Headless everywhere now that the demo phase is over. A headless runner has
    // no display, so this is required for CI and keeps local runs fast.
    headless: true,
    // Deterministic viewport (replaces the old headed `viewport: null` +
    // `--start-maximized`) so layout-dependent assertions are stable headless.
    viewport: { width: 1920, height: 1080 },
    // Failure screenshots are captured explicitly in tests/baseTest.ts afterEach
    // (reliable even when a test fails right after a navigation). Native capture
    // is off to avoid duplicate screenshots in the report.
    screenshot: "off",
    // No video capture — failure screenshots (tests/baseTest.ts afterEach) are
    // enough. Flip to "retain-on-failure" if video is ever needed.
    video: "off",
    launchOptions: {
      // --no-sandbox / --disable-setuid-sandbox are required to run Chromium on
      // CI Linux runners. (--start-maximized dropped: a no-op in headless.)
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },
  // Projects are BROWSERS (not suites). Suite selection is done with Playwright's
  // --grep flag against the @smoke / @regression tags in test titles, e.g.:
  //   npx playwright test --project=chromium --grep @smoke
  // This decouples browser from suite so any browser can run any suite. Firefox
  // and WebKit are stubbed below — uncomment (and add the CI input option) to
  // enable them; no other refactor is needed.
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use our deterministic viewport rather than the device's 1280x720.
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: undefined,
      },
    },
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"], viewport: { width: 1920, height: 1080 } },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"], viewport: { width: 1920, height: 1080 } },
    // },
  ],
});