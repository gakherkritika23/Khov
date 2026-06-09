import fs from "fs";
import path from "path";

/**
 * Runs once before the whole test run. Wipes `allure-results/` so the generated
 * Allure report reflects ONLY the current run — otherwise allure-playwright
 * appends a result file per test on every run and stale runs (old projects,
 * earlier executions) keep showing up in the report.
 *
 * Note: `allure-report/` (the generated HTML) is already refreshed by
 * `allure generate --clean`, so only the raw results need clearing here.
 */
export default function globalSetup(): void {
  const resultsDir = path.resolve(process.cwd(), "allure-results");
  fs.rmSync(resultsDir, { recursive: true, force: true });
}
