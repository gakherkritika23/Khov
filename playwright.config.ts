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

if (!process.env.BASE_URL) {
  throw new Error(
    `BASE_URL is not set. Define BASE_URL in environment/${testEnv}.env.`,
  );
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: undefined,
  reporter: [
    ["list"],
    ["junit", { outputFile: "results.xml" }],
    ["json", { outputFile: "test-results/playwright-results.json" }],
    ["./scripts/generate-client-report.ts"],
    ["allure-playwright", { outputFolder: "allure-results" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.BASE_URL,
    trace: "on-first-retry",
    headless: false,
    viewport: null,
    screenshot: "on-first-failure",
    video: "retain-on-failure",
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
