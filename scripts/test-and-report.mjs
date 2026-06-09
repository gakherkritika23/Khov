// Runs the Playwright suite, then generates and opens the Allure report.
//
// Usage (via npm scripts that set TEST_ENV):
//   npm run test:report:prod
//   npm run test:report:prod -- tests/communityPage.spec.ts --project=Chrome
//
// Any args after `--` are passed straight to `playwright test`. The report is
// generated + opened EVEN IF tests fail (a plain `&&` chain would skip it), and
// `allure open` prints the local server URL to view the report.
import { spawnSync } from "node:child_process";

const useShell = process.platform === "win32";
const run = (cmd, args) =>
  spawnSync(cmd, args, { stdio: "inherit", shell: useShell });

// 1. Run the suite with any passthrough args (spec, --project, --grep, ...).
const test = run("npx", ["playwright", "test", ...process.argv.slice(2)]);

// 2. Build the Allure report from this run's results (globalSetup cleared old
//    results before the run, so the report reflects only this run).
run("npm", ["run", "allure:generate"]);

// 3. Serve + open it — prints "Server started at http://127.0.0.1:<port>/" and
//    blocks until you press Ctrl+C.
run("npm", ["run", "allure:open"]);

// Preserve the test exit code for CI / chaining.
process.exit(test.status ?? 0);
