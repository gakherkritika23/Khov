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
  retries: process.env.CI ? 2 : 0,
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
    trace: "on-first-retry",
    headless: false,
    viewport: null,
    screenshot: "on-first-failure",
    video: "off",
    launchOptions: {
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--start-maximized"],
      // Demo pacing: wait ~350ms before each browser action so the whole headed
      // run is watchable when presenting to the QA team / client.
      slowMo: 200,
    },
  },
  projects: [
    {
      name: 'Chrome',
      use: { browserName: 'chromium' },
    },
    // {
    //   name: 'Firefox',
    //   use: { browserName: 'firefox' },
    // },
    // {
    //   name: 'WebKit',
    //   use: { browserName: 'webkit' },
    // },
    {
      name: "smoke",
      use: { ...devices["Desktop Chrome"], viewport: null, deviceScaleFactor: undefined },
      grep: /@smoke/,
    },
    {
      name: "regression",
      use: { ...devices["Desktop Chrome"], viewport: null, deviceScaleFactor: undefined },
      grep: /@regression/,
    },
  ],
});