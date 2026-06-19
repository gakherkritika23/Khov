// Runs the Playwright suite, then points you at the report.
//
// Primary path: ReportPortal. When RP is configured (RP_API_KEY set in the
// active environment file), the agent reports the run live and this script opens
// the project's ReportPortal launches page afterwards.
//
// Fallback path: when RP is NOT configured, it generates + opens the Allure
// report (Allure is retired but kept available during the RP transition).
//
// Usage (via npm scripts that set TEST_ENV):
//   npm run test:report:dev
//   npm run test:report:prod -- tests/communityPage.spec.ts --project=Chrome
//
// Any args after `--` are passed straight to `playwright test`. The report is
// opened EVEN IF tests fail (a plain `&&` chain would skip it).
import { spawnSync } from "node:child_process";
import path from "node:path";
import * as dotenv from "dotenv";

const useShell = process.platform === "win32";
const run = (cmd, args) =>
  spawnSync(cmd, args, { stdio: "inherit", shell: useShell });

// Load the same env file playwright.config.ts uses, so we can read RP_* here.
const testEnv = (process.env.TEST_ENV ?? "dev").toLowerCase();
dotenv.config({ path: path.resolve(process.cwd(), `environment/${testEnv}.env`) });

// 1. Run the suite with any passthrough args (spec, --project, --grep, ...).
const test = run("npx", ["playwright", "test", ...process.argv.slice(2)]);

// 2. Open the report.
if (process.env.RP_API_KEY) {
  // ReportPortal: derive the UI launches page from the API endpoint + project.
  // RP_ENDPOINT is e.g. http://localhost:8080/api/v1 → UI base is the origin.
  const base = (process.env.RP_ENDPOINT ?? "").replace(/\/api\/v[0-9]+\/?$/, "");
  const project = process.env.RP_PROJECT ?? "";
  const launchesUrl = `${base}/ui/#${project}/launches/all`;
  console.log(`\nReportPortal launches: ${launchesUrl}`);
  const opener =
    process.platform === "darwin" ? "open" :
    process.platform === "win32" ? "start" : "xdg-open";
  run(opener, [launchesUrl]);
} else {
  // Fallback: Allure (kept during the RP transition).
  run("npm", ["run", "allure:generate"]);
  run("npm", ["run", "allure:open"]);
}

// Preserve the test exit code for CI / chaining.
process.exit(test.status ?? 0);
