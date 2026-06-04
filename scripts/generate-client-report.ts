import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

type TestStatus = "passed" | "failed" | "skipped" | "timedOut" | "interrupted" | "expected" | "unexpected" | "flaky" | string;

type PlaywrightResult = {
  status?: TestStatus;
  duration?: number;
  error?: { message?: string };
  errors?: { message?: string }[];
  steps?: { title?: string; duration?: number; error?: { message?: string } }[];
};

type PlaywrightTest = {
  title: string;
  expectedStatus?: string;
  outcome?: string;
  annotations?: { type: string; description?: string }[];
  results?: PlaywrightResult[];
  projectName?: string;
};

type PlaywrightSuite = {
  title?: string;
  file?: string;
  specs?: {
    title: string;
    tests?: PlaywrightTest[];
  }[];
  suites?: PlaywrightSuite[];
};

type PlaywrightJson = {
  config?: {
    projects?: { name: string }[];
  };
  stats?: {
    startTime?: string;
    duration?: number;
    expected?: number;
    unexpected?: number;
    flaky?: number;
    skipped?: number;
  };
  suites?: PlaywrightSuite[];
};

type ClientTest = {
  id: string;
  title: string;
  feature: string;
  story: string;
  page: string;
  severity: string;
  browser: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  error?: string;
  steps: { title: string; status: "passed" | "failed"; durationMs: number }[];
};

const rootDir = process.cwd();
const jsonPath = path.join(rootDir, "test-results", "playwright-results.json");
const outputDir = path.join(rootDir, "client-report");
const outputPath = path.join(outputDir, "index.html");

const testEnv = (process.env.TEST_ENV ?? "dev").toLowerCase();
dotenv.config({ path: path.join(rootDir, "environment", `${testEnv}.env`) });

export default class ClientHtmlReporter implements Reporter {
  private config?: FullConfig;
  private tests: ClientTest[] = [];
  private startTime = new Date();

  onBegin(config: FullConfig): void {
    this.config = config;
    this.startTime = new Date();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.tests.push(toClientTestFromReporter(test, result));
  }

  onEnd(result: FullResult): void {
    writeClientReport({
      results: {
        config: {
          projects: this.config?.projects.map((project) => ({ name: project.name })) ?? [],
        },
        stats: {
          startTime: this.startTime.toISOString(),
          duration: result.duration,
        },
      },
      tests: this.tests,
    });
  }
}

function readResults(): PlaywrightJson {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Playwright JSON report not found at ${jsonPath}. Run tests before generating the client report.`);
  }

  return JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as PlaywrightJson;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function collectTests(suites: PlaywrightSuite[] = [], parents: string[] = []): ClientTest[] {
  return suites.flatMap((suite) => {
    const suiteTitle = suite.title && !suite.file ? suite.title : "";
    const nextParents = suiteTitle ? [...parents, suiteTitle] : parents;
    const specTests =
      suite.specs?.flatMap((spec) =>
        spec.tests?.map((test) => toClientTest(test, spec.title, nextParents, suite.file)) ?? [],
      ) ?? [];

    return [...specTests, ...collectTests(suite.suites, nextParents)];
  });
}

function toClientTest(test: PlaywrightTest, specTitle: string, parents: string[], file?: string): ClientTest {
  const latestResult = test.results?.[test.results.length - 1] ?? {};
  const rawStatus = latestResult.status ?? test.outcome ?? "skipped";
  const status = normalizeStatus(rawStatus);
  const cleanTitle = stripTags(specTitle);
  const titleParts = cleanTitle.split("|").map((part) => part.trim());
  const id = titleParts[0]?.match(/[A-Z]{1,5}[-_ ]?\d+/i)?.[0]?.replace(/\s+/g, "_") ?? "TC";
  const title = titleParts[1] ?? cleanTitle;
  const feature = parents[0]?.replace(/\s+[—-]\s+.*$/, "") || titleFromFile(file);
  const story = parents[0] ?? feature;
  const severity = getAnnotation(test, "severity") ?? inferSeverity(cleanTitle);

  return {
    id,
    title,
    feature,
    story,
    page: feature,
    severity,
    browser: test.projectName ?? process.env.BROWSER ?? "Chrome",
    status,
    durationMs: latestResult.duration ?? 0,
    error: latestResult.error?.message ?? latestResult.errors?.[0]?.message,
    steps: (latestResult.steps ?? []).map((step) => ({
      title: step.title ?? "Step",
      status: step.error ? "failed" : "passed",
      durationMs: step.duration ?? 0,
    })),
  };
}

function toClientTestFromReporter(test: TestCase, result: TestResult): ClientTest {
  const parents = getReporterParents(test);
  const cleanTitle = stripTags(test.title);
  const titleParts = cleanTitle.split("|").map((part) => part.trim());
  const id = titleParts[0]?.match(/[A-Z]{1,5}[-_ ]?\d+/i)?.[0]?.replace(/\s+/g, "_") ?? "TC";
  const title = titleParts[1] ?? cleanTitle;
  const feature = parents[0]?.replace(/\s+[-]\s+.*$/, "") || titleFromFile(test.location.file);
  const story = parents[0] ?? feature;
  const severity = getReporterAnnotation(test, "severity") ?? inferSeverity(cleanTitle);

  return {
    id,
    title,
    feature,
    story,
    page: feature,
    severity,
    browser: test.parent.project()?.name ?? process.env.BROWSER ?? "Chrome",
    status: normalizeStatus(result.status),
    durationMs: result.duration,
    error: result.error?.message,
    steps: (result.steps ?? []).map((step) => ({
      title: step.title,
      status: step.error ? "failed" : "passed",
      durationMs: step.duration,
    })),
  };
}

function getReporterParents(test: TestCase): string[] {
  const parents: string[] = [];
  let parent: Suite | undefined = test.parent;

  while (parent) {
    if (parent.title) {
      parents.unshift(parent.title);
    }
    parent = parent.parent;
  }

  return parents.filter((title) => !title.endsWith(".spec.ts"));
}

function getReporterAnnotation(test: TestCase, type: string): string | undefined {
  return test.annotations.find((annotation) => annotation.type.toLowerCase() === type)?.description;
}

function normalizeStatus(status: string): ClientTest["status"] {
  if (status === "passed" || status === "expected" || status === "flaky") {
    return "passed";
  }
  if (status === "skipped") {
    return "skipped";
  }
  return "failed";
}

function stripTags(title: string): string {
  return title.replace(/@\w+/g, "").trim();
}

function titleFromFile(file?: string): string {
  if (!file) {
    return "Automation";
  }

  return path
    .basename(file, path.extname(file))
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getAnnotation(test: PlaywrightTest, type: string): string | undefined {
  return test.annotations?.find((annotation) => annotation.type.toLowerCase() === type)?.description;
}

function inferSeverity(title: string): string {
  return /critical|checkout|payment|login|lead|submit/i.test(title) ? "Critical" : "Normal";
}

function formatDate(date?: string): string {
  const value = date ? new Date(date) : new Date();
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase();
}

function formatSeconds(ms: number): string {
  return `${Math.round(ms / 1000)}s`;
}

function percent(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function renderReport(results: PlaywrightJson, tests: ClientTest[]): string {
  const total = tests.length;
  const passed = tests.filter((test) => test.status === "passed").length;
  const failed = tests.filter((test) => test.status === "failed").length;
  const skipped = tests.filter((test) => test.status === "skipped").length;
  const duration = tests.reduce((sum, test) => sum + test.durationMs, 0);
  const average = total ? duration / total : 0;
  const startDate = formatDate(results.stats?.startTime);
  const browser = tests[0]?.browser ?? results.config?.projects?.[0]?.name ?? "Chrome";
  const baseUrl = process.env.BASE_URL ?? "Not configured";
  const critical = tests.filter((test) => test.severity.toLowerCase() === "critical").length;
  const normal = Math.max(total - critical, 0);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>K. Hovnanian Automation Report</title>
  <style>
    :root {
      --ink: #07182f;
      --muted: #49637f;
      --line: #cfdbe6;
      --panel: #ffffff;
      --wash: #f3f6f9;
      --soft: #e9eef3;
      --brand: #1f4a73;
      --green: #16895a;
      --red: #c94038;
      --gold: #8b6f23;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--wash);
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.45;
    }

    main {
      width: min(1180px, calc(100% - 32px));
      margin: 16px auto 40px;
    }

    section, header.report-hero {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 6px;
      box-shadow: 0 8px 24px rgba(13, 38, 66, 0.06);
      margin-bottom: 18px;
      padding: 22px;
    }

    .report-hero {
      border-left: 5px solid var(--brand);
    }

    .client-name {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 27px; margin-top: 14px; }
    h2 { font-size: 19px; margin-bottom: 16px; }
    h3 { font-size: 16px; }

    .meta-grid, .overview-grid, .chart-grid, .detail-meta {
      display: grid;
      gap: 12px;
    }

    .meta-grid { grid-template-columns: repeat(4, 1fr); margin-top: 16px; }
    .overview-grid, .chart-grid { grid-template-columns: repeat(4, 1fr); }
    .detail-meta { grid-template-columns: repeat(4, 1fr); margin: 14px 0; }

    .meta-card, .stat-card, .chart-card, .detail-field, .test-card, .step {
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fbfcfd;
    }

    .meta-card {
      background: var(--soft);
      min-height: 66px;
      padding: 12px;
    }

    .label {
      color: var(--muted);
      display: block;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .value { font-weight: 700; overflow-wrap: anywhere; }

    .stat-card {
      min-height: 94px;
      padding: 18px;
    }

    .stat-number {
      font-size: 31px;
      font-weight: 800;
      letter-spacing: 0;
    }

    .passed { color: var(--green); }
    .failed { color: var(--red); }
    .skipped { color: var(--gold); }

    .chart-card {
      min-height: 302px;
      padding: 18px;
    }

    .donut {
      align-items: center;
      background: conic-gradient(var(--green) ${percent(passed, total)}%, var(--red) 0 ${percent(passed + failed, total)}%, var(--gold) 0);
      border-radius: 50%;
      display: flex;
      font-weight: 800;
      height: 104px;
      justify-content: center;
      margin: 14px auto 24px;
      width: 104px;
    }

    .donut::after {
      align-items: center;
      background: #fbfcfd;
      border-radius: 50%;
      content: "${percent(passed, total)}%";
      display: flex;
      height: 68px;
      justify-content: center;
      width: 68px;
    }

    .bar-row {
      align-items: center;
      display: grid;
      gap: 10px;
      grid-template-columns: 64px 1fr 42px;
      margin: 16px 0;
    }

    .bar-track {
      background: #dfe7ee;
      border-radius: 999px;
      height: 13px;
      overflow: hidden;
    }

    .bar-fill {
      border-radius: 999px;
      display: block;
      height: 100%;
    }

    .trend {
      align-items: end;
      display: flex;
      gap: 8px;
      height: 92px;
      margin-top: 14px;
    }

    .trend span {
      border-radius: 4px 4px 0 0;
      display: block;
      width: 100%;
    }

    .behaviors p { margin: 6px 0; }
    .behaviors ul { margin: 6px 0 0 18px; padding: 0; }

    .test-card {
      margin-top: 12px;
      padding: 18px;
      position: relative;
    }

    .status-pill {
      border-radius: 999px;
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      padding: 6px 12px;
      position: absolute;
      right: 18px;
      top: 14px;
      text-transform: uppercase;
    }

    .detail-field {
      min-height: 42px;
      padding: 10px;
    }

    .steps-title { font-weight: 800; margin: 12px 0; }

    .step {
      display: grid;
      gap: 12px;
      grid-template-columns: 26px 1fr;
      margin-top: 8px;
      padding: 12px;
    }

    .step-icon {
      align-items: center;
      border-radius: 50%;
      color: #fff;
      display: flex;
      font-weight: 800;
      height: 22px;
      justify-content: center;
      width: 22px;
    }

    .error {
      background: #fff1f0;
      border: 1px solid #f1b6b2;
      border-radius: 6px;
      color: #861f18;
      margin-top: 10px;
      padding: 10px;
      white-space: pre-wrap;
    }

    @media (max-width: 900px) {
      .meta-grid, .overview-grid, .chart-grid, .detail-meta {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 560px) {
      main { width: min(100% - 20px, 1180px); }
      section, header.report-hero { padding: 16px; }
      .meta-grid, .overview-grid, .chart-grid, .detail-meta {
        grid-template-columns: 1fr;
      }
      .status-pill {
        display: inline-block;
        margin-top: 10px;
        position: static;
      }
    }
  </style>
</head>
<body>
  <main>
    <header class="report-hero">
      <div class="client-name">K. Hovnanian Homes</div>
      <h1>K. Hovnanian Automation Report</h1>
      <div class="meta-grid">
        ${renderMetaCard("Environment", testEnv)}
        ${renderMetaCard("Browser", browser)}
        ${renderMetaCard("Platform", "Desktop")}
        ${renderMetaCard("Base URL", baseUrl)}
      </div>
    </header>

    <section>
      <h2>Overview</h2>
      <div class="overview-grid">
        ${renderStatCard("Total", total, "")}
        ${renderStatCard("Passed", passed, "passed")}
        ${renderStatCard("Failed", failed, "failed")}
        ${renderStatCard("Skipped", skipped, "skipped")}
      </div>
    </section>

    <section>
      <h2>Charts</h2>
      <div class="chart-grid">
        <div class="chart-card">
          <span class="label">Status Chart</span>
          <div class="donut"></div>
          ${renderBar("Passed", passed, total, "var(--green)")}
          ${renderBar("Failed", failed, total, "var(--red)")}
          ${renderBar("Skipped", skipped, total, "var(--gold)")}
        </div>
        <div class="chart-card">
          <span class="label">Trend Chart</span>
          <div class="trend">
            <span style="height: ${Math.max(percent(passed, total), 6)}%; background: var(--green);"></span>
            <span style="height: ${Math.max(percent(failed, total), failed ? 6 : 0)}%; background: var(--red);"></span>
            <span style="height: ${Math.max(percent(skipped, total), skipped ? 6 : 0)}%; background: var(--gold);"></span>
          </div>
          <p class="label">${startDate}</p>
        </div>
        <div class="chart-card">
          <span class="label">Duration Chart</span>
          <p class="value">${formatSeconds(duration)}</p>
          <p style="margin-top: 16px;">Total run duration</p>
          <p class="label" style="margin-top: 16px;">Average Test: ${formatSeconds(average)}</p>
        </div>
        <div class="chart-card">
          <span class="label">Severity Chart</span>
          ${renderBar("Critical", critical, total, "#1f7aa5")}
          ${renderBar("Normal", normal, total, "var(--green)")}
        </div>
      </div>
    </section>

    <section class="behaviors">
      <h2>Behaviors</h2>
      ${renderBehaviors(tests)}
    </section>

    <section>
      <h2>Categories</h2>
      ${failed ? `<p class="failed value">${failed} failed test${failed === 1 ? "" : "s"}.</p>` : `<p class="passed value">No failed categories.</p>`}
    </section>

    <section>
      <h2>Test Details</h2>
      ${tests.map(renderTestCard).join("") || "<p>No tests found.</p>"}
    </section>
  </main>
</body>
</html>`;
}

function renderMetaCard(label: string, value: string): string {
  return `<div class="meta-card"><span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span></div>`;
}

function renderStatCard(label: string, value: number, className: string): string {
  return `<div class="stat-card"><span class="label">${escapeHtml(label)}</span><span class="stat-number ${className}">${String(value).padStart(2, "0")}</span></div>`;
}

function renderBar(label: string, value: number, total: number, color: string): string {
  const width = percent(value, total);
  return `<div class="bar-row">
    <strong>${escapeHtml(label)}</strong>
    <span class="bar-track"><span class="bar-fill" style="width: ${width}%; background: ${color};"></span></span>
    <span>${width}%</span>
  </div>`;
}

function renderBehaviors(tests: ClientTest[]): string {
  const groups = new Map<string, Map<string, ClientTest[]>>();
  for (const test of tests) {
    const featureGroup = groups.get(test.feature) ?? new Map<string, ClientTest[]>();
    const storyTests = featureGroup.get(test.story) ?? [];
    storyTests.push(test);
    featureGroup.set(test.story, storyTests);
    groups.set(test.feature, featureGroup);
  }

  return [...groups.entries()]
    .map(([feature, stories]) => `<p><strong>Epic:</strong> K. Hovnanian Automation</p>
      <p><strong>Feature:</strong> ${escapeHtml(feature)}</p>
      ${[...stories.entries()]
        .map(([story, storyTests]) => `<p style="margin-left: 18px;"><strong>Story:</strong> ${escapeHtml(story)}</p>
          <ul>${storyTests.map((test) => `<li>${escapeHtml(test.id)} - ${escapeHtml(test.title)}</li>`).join("")}</ul>`)
        .join("")}`)
    .join("");
}

function renderTestCard(test: ClientTest): string {
  const statusColor = test.status === "passed" ? "var(--green)" : test.status === "failed" ? "var(--red)" : "var(--gold)";
  const steps = test.steps.length
    ? test.steps
    : [{ title: test.status === "failed" ? "Test ended with failure" : "Test completed", status: test.status === "failed" ? "failed" as const : "passed" as const, durationMs: test.durationMs }];

  return `<article class="test-card">
    <h3>${escapeHtml(test.id)} - ${escapeHtml(test.title)}</h3>
    <span class="status-pill" style="background: ${statusColor};">${escapeHtml(test.status)}</span>
    <div class="detail-meta">
      <div class="detail-field"><strong>Page:</strong> ${escapeHtml(test.page)}</div>
      <div class="detail-field"><strong>Severity:</strong> ${escapeHtml(test.severity)}</div>
      <div class="detail-field"><strong>Browser:</strong> ${escapeHtml(test.browser)}</div>
      <div class="detail-field"><strong>Execution Time:</strong> ${formatSeconds(test.durationMs)}</div>
    </div>
    <p class="steps-title">Execution Steps</p>
    ${steps.map((step, index) => renderStep(step, index)).join("")}
    ${test.error ? `<pre class="error">${escapeHtml(test.error)}</pre>` : ""}
  </article>`;
}

function renderStep(step: ClientTest["steps"][number], index: number): string {
  const isPassed = step.status === "passed";
  return `<div class="step">
    <span class="step-icon" style="background: ${isPassed ? "var(--green)" : "var(--red)"};">${isPassed ? "OK" : "!"}</span>
    <div><strong>Step ${index + 1}:</strong> ${escapeHtml(step.title)}<br><span class="label">${formatSeconds(step.durationMs)}</span></div>
  </div>`;
}

function generateClientReport(): void {
  const results = readResults();
  const tests = collectTests(results.suites);

  writeClientReport({ results, tests });
}

function writeClientReport({ results, tests }: { results: PlaywrightJson; tests: ClientTest[] }): void {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, renderReport(results, tests));

  console.log(`Client report generated: ${outputPath}`);
}

if (process.argv[1]?.endsWith("generate-client-report.ts")) {
  try {
    generateClientReport();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}