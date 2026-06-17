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
const rpConfig = {
  apiKey: process.env.RP_API_KEY,
  endpoint: process.env.RP_ENDPOINT,
  project: process.env.RP_PROJECT,
  launch: 'KHOV Automation',
  attributes: [{ value: 'poc' }],
  description: 'KHov ReportPortal',

};

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
    // detail: false → Allure records only named test.step() verifications,
    // dropping low-level pw:api/expect steps (locator code, file:line, snippets).
    ["allure-playwright", { outputFolder: "allure-results", detail: false }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ['@reportportal/agent-js-playwright', rpConfig],
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