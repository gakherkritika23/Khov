import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import path from "path";

const testEnv = process.env.TEST_ENV ?? "dev";
const envPath = path.resolve(process.cwd(), `environment/.env.${testEnv}`);
dotenv.config({ path: envPath });

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: undefined,
  reporter: [
    ["list"],
    ["junit", { outputFile: "results.xml" }],
    ["allure-playwright", { outputFolder: "allure-results" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "https://www.khov.com/",
    trace: "on-first-retry",
    browserName: (process.env.BROWSER ?? "chromium") as
      | "chromium"
      | "firefox"
      | "webkit",
    headless: true,
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
