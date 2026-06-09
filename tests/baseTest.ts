import { test as base } from "@playwright/test";
import { description, attachment } from "allure-js-commons";
import fs from "fs";
import path from "path";

function createEnvFile(browser: string) {
  const resultsDir = path.join(process.cwd(), "allure-results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }

  const envData = `
Project=K. Hovnanian Homes Automation
Environment=${process.env.TEST_ENV}
Browser=${browser}
BaseURL=${process.env.BASE_URL}
OS=${process.platform}
Node=${process.version}
`;
  fs.writeFileSync(
    path.join(resultsDir, "environment.properties"),
    envData.trim(),
  );
}

export const test = base.extend({});

test.beforeAll(async ({ browserName }) => {
  createEnvFile(browserName);
});

test.beforeEach(async ({}, testInfo) => {
  description(testInfo.title);
  attachment(
    "Test Start",
    `Started: ${testInfo.title}\nTime: ${new Date().toISOString()}`,
    "text/plain",
  );
});

test.afterEach(async ({ page }, testInfo) => {
  if (page && testInfo.status !== testInfo.expectedStatus) {
    const screenshot = await page.screenshot();
    attachment("Failure Screenshot", screenshot, "image/png");
    attachment(
      "Failure Reason",
      testInfo.error?.message || "Unknown Error",
      "text/plain",
    );
  }
  attachment(
    "Test End",
    `Status: ${testInfo.status}\nFinished: ${new Date().toISOString()}`,
    "text/plain",
  );
});
