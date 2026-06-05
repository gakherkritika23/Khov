import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import path from "path";

const testEnv = process.env.TEST_ENV ?? "dev";
const envPath = path.resolve(process.cwd(), `environment/.env.${testEnv}`);
dotenv.config({ path: envPath });

// if (!process.env.BASE_URL) {
//   throw new Error(
//     `BASE_URL is not set. Create environment/.env.${testEnv} (copy environment/.env.example) and define BASE_URL.`,
//   );
// }

export default defineConfig({
  testDir: "./tests",
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
    ["allure-playwright", { outputFolder: "allure-results" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.BASE_URL,
    trace: "on-first-retry",
    browserName: (process.env.BROWSER ?? "chromium") as
      | "chromium"
      | "firefox"
      | "webkit",
    headless: false,
    screenshot: "on-first-failure",
    video: "retain-on-failure",
    launchOptions: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "smoke",
      use: { ...devices["Desktop Chrome"] },
      grep: /@smoke/,
    },
    {
      name: "regression",
      use: { ...devices["Desktop Chrome"] },
      grep: /@regression/,
    },
  ],
});
