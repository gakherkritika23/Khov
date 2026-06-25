import PptxGenJS from "pptxgenjs";

const pptx = new PptxGenJS();

// ── Theme ──────────────────────────────────────────────────────────────
const DARK  = "1A1A2E";
const MID   = "16213E";
const NAVY  = "0F3460";
const RED   = "E94560";
const WHITE = "FFFFFF";
const LIGHT = "A8B2D8";
const GRAY  = "F8FAFF";
const TEXT  = "333333";
const MONO  = "Courier New";

pptx.layout  = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pptx.author  = "ExSquared QA";
pptx.subject = "K. Hovnanian Test Automation Framework";
pptx.title   = "Test Automation Framework Overview";

// ── Helper: section header bar ─────────────────────────────────────────
function addHeader(slide, text) {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.7, fill: { color: NAVY } });
  slide.addText(text, {
    x: 0.4, y: 0.05, w: 12, h: 0.6,
    fontSize: 18, bold: true, color: WHITE, fontFace: "Calibri",
  });
}

// ── Helper: red left-border accent line ───────────────────────────────
function addAccent(slide, y, h) {
  slide.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 0.06, h, fill: { color: RED } });
}

// ── Helper: simple bullet row ─────────────────────────────────────────
function bullet(text, options = {}) {
  return {
    text,
    options: {
      fontSize: 13,
      color: TEXT,
      bullet: { type: "bullet" },
      paraSpaceAfter: 4,
      fontFace: "Calibri",
      ...options,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();

  // background gradient (two rects)
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: DARK } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.06, fill: { color: RED } });

  s.addText("K. HOVNANIAN HOMES · QA AUTOMATION", {
    x: 0.7, y: 1.5, w: 12, h: 0.4,
    fontSize: 11, bold: true, color: RED, charSpacing: 4, fontFace: "Calibri",
  });

  s.addText("Test Automation\nFramework Overview", {
    x: 0.7, y: 2.0, w: 12, h: 1.8,
    fontSize: 40, bold: true, color: WHITE, fontFace: "Calibri", lineSpacingMultiple: 1.1,
  });

  s.addText("Contact Forms End-to-End Testing — Architecture & Flow Guide", {
    x: 0.7, y: 3.85, w: 11, h: 0.5,
    fontSize: 16, color: LIGHT, fontFace: "Calibri",
  });

  s.addShape(pptx.ShapeType.rect, { x: 0.7, y: 4.5, w: 3.5, h: 0.06, fill: { color: RED } });

  s.addText("Framework: Playwright + TypeScript", {
    x: 0.7, y: 4.7, w: 8, h: 0.4,
    fontSize: 13, color: LIGHT, fontFace: "Calibri",
  });

  s.addText("June 2026", {
    x: 0.7, y: 5.1, w: 4, h: 0.4,
    fontSize: 13, color: LIGHT, fontFace: "Calibri",
  });
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 2 — WHAT WE BUILT
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: WHITE } });
  addHeader(s, "1 · What We Built");

  addAccent(s, 0.9, 1.6);
  s.addText(
    "A production-grade end-to-end automation framework for khov.com that validates every customer-facing contact form across four surfaces:",
    { x: 0.6, y: 0.9, w: 12, h: 0.7, fontSize: 14, color: TEXT, fontFace: "Calibri", wrap: true }
  );

  const surfaces = [
    "Contact Us page (5 interest forms)",
    "QMI detail pages",
    "Floorplan detail pages",
    "Community detail pages",
  ];
  s.addText(
    surfaces.map((t) => ({ text: t, options: { bullet: { type: "bullet" }, paraSpaceAfter: 6, fontSize: 14, color: TEXT, fontFace: "Calibri" } })),
    { x: 0.8, y: 1.65, w: 11, h: 1.4 }
  );

  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 3.2, w: 12.5, h: 1.3, fill: { color: "FFF5F7" }, line: { color: RED, width: 1 } });
  s.addText("Production Safe", { x: 0.7, y: 3.3, w: 5, h: 0.35, fontSize: 13, bold: true, color: RED, fontFace: "Calibri" });
  s.addText(
    "Forms are fully filled and all validations exercised on every environment — but submission is intentionally skipped on prod so no real leads are ever created. API assertions run only on non-prod.",
    { x: 0.7, y: 3.65, w: 12, h: 0.7, fontSize: 12, color: TEXT, fontFace: "Calibri", wrap: true }
  );

  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 4.7, w: 12.5, h: 1.0, fill: { color: "EFF6FF" }, line: { color: NAVY, width: 1 } });
  s.addText(
    "Tests run headed (visible browser) against dev, UAT, stage, or production with a single command. Results published live to a ReportPortal dashboard.",
    { x: 0.7, y: 4.75, w: 12, h: 0.85, fontSize: 12, color: NAVY, fontFace: "Calibri", wrap: true }
  );
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 3 — TECH STACK
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: WHITE } });
  addHeader(s, "2 · Tech Stack");

  const items = [
    { badge: "Playwright 1.58", desc: "Browser automation engine — navigate, click, fill, assert, intercept network" },
    { badge: "TypeScript 6",    desc: "Compile-time type safety for page objects, locators, and test data" },
    { badge: "Node.js",         desc: "Runtime environment" },
    { badge: "Chromium (headed)", desc: "Headed, maximised browser — slowMo 200ms so every action is visible" },
    { badge: "ReportPortal",    desc: "Live test reporting dashboard with step trees, screenshots on failure" },
    { badge: "dotenv / cross-env", desc: "Per-environment config — BASE_URL, env name, RP credentials" },
  ];

  items.forEach((item, i) => {
    const y = 0.9 + i * 0.88;
    s.addShape(pptx.ShapeType.roundRect, { x: 0.4, y, w: 2.5, h: 0.55, fill: { color: "F0F4FF" }, line: { color: "C7D2FE", width: 1 }, rectRadius: 0.1 });
    s.addText(item.badge, { x: 0.4, y: y + 0.08, w: 2.5, h: 0.4, fontSize: 11, bold: true, color: NAVY, align: "center", fontFace: "Calibri" });
    s.addText(item.desc,  { x: 3.1, y: y + 0.06, w: 9.7, h: 0.45, fontSize: 12, color: TEXT, fontFace: "Calibri", wrap: true });
  });
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 4 — ARCHITECTURE LAYERS
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: WHITE } });
  addHeader(s, "3 · Architecture Layers");

  const layers = [
    { label: "npm script",             desc: "Entry point — sets TEST_ENV, invokes Playwright CLI, passes project/file filters" },
    { label: "playwright.config.ts",   desc: "Loads environment/{env}.env → sets baseURL. Configures reporters, projects, slowMo, retries" },
    { label: "tests/baseTest.ts",      desc: "Extends Playwright's base test with afterEach failure screenshot. All specs import from here" },
    { label: "tests/*.spec.ts",        desc: "Test specs — beforeEach navigation → test body actions → Validator assertions" },
    { label: "page-objects/",          desc: "Page Object Model classes. Locators as readonly Locator fields; actions as named methods" },
    { label: "page-objects/basePage.ts", desc: "Parent class — click(), type(), navigate(), waitForVisible(), popup dismissal" },
    { label: "utils/",                 desc: "Validator (assertions), apiUtils (network intercept), testDataUtils, constants.json" },
  ];

  layers.forEach((layer, i) => {
    const y = 0.85 + i * 0.78;
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 3.0, h: 0.5, fill: { color: "E8EEFF" }, line: { color: NAVY, width: 0.5 } });
    s.addText(layer.label, { x: 0.4, y: y + 0.07, w: 3.0, h: 0.38, fontSize: 10, bold: true, color: NAVY, align: "center", fontFace: MONO });
    s.addText("→", { x: 3.45, y: y + 0.08, w: 0.35, h: 0.35, fontSize: 14, bold: true, color: RED, align: "center" });
    s.addText(layer.desc, { x: 3.85, y: y + 0.07, w: 9.3, h: 0.4, fontSize: 11, color: TEXT, fontFace: "Calibri", wrap: true });
  });

  // arrow at bottom
  s.addText("↓  Browser (Chromium) → khov.com", {
    x: 0.4, y: 6.4, w: 6, h: 0.35, fontSize: 11, bold: true, color: NAVY, fontFace: "Calibri",
  });
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 5 — RUNNING THE DEMO
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: WHITE } });
  addHeader(s, "4 · Running the Demo — Step-by-Step");

  // command box
  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 0.85, w: 12.5, h: 0.6, fill: { color: DARK } });
  s.addText("npm run smoke:dev  --  tests/contactForms.spec.ts", {
    x: 0.6, y: 0.87, w: 12, h: 0.55, fontSize: 14, color: "A5D6A7", fontFace: MONO, bold: true,
  });

  const steps = [
    { n: "1", t: "cross-env sets TEST_ENV=dev before Playwright starts — works on macOS, Linux, Windows." },
    { n: "2", t: "playwright.config.ts loads environment/dev.env → sets baseURL=https://www-dev.khov.com. Throws immediately if BASE_URL is missing." },
    { n: "3", t: "The smoke project (grep: /@smoke/) filters to tests tagged @smoke only." },
    { n: "4", t: "-- tests/contactForms.spec.ts scopes the run to that single file." },
    { n: "5", t: "Chromium launches headed, maximised, slowMo 200ms. One worker — serial execution, no contention on the live site." },
    { n: "6", t: "beforeEach navigates; test body calls page object methods; Validator wraps each assertion in a named step for clean reports." },
    { n: "7", t: "afterEach captures a screenshot on failure and attaches it to the test result (ReportPortal + HTML)." },
  ];

  steps.forEach((step, i) => {
    const y = 1.6 + i * 0.68;
    s.addShape(pptx.ShapeType.ellipse, { x: 0.4, y: y + 0.04, w: 0.3, h: 0.3, fill: { color: RED } });
    s.addText(step.n, { x: 0.4, y: y + 0.04, w: 0.3, h: 0.3, fontSize: 10, bold: true, color: WHITE, align: "center", fontFace: "Calibri" });
    s.addText(step.t, { x: 0.82, y, w: 12.1, h: 0.55, fontSize: 11, color: TEXT, fontFace: "Calibri", wrap: true });
  });
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 6 — SMOKE TESTS TABLE
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: WHITE } });
  addHeader(s, "4 · Smoke Tests That Execute");

  const rows = [
    [{ text: "Test ID", options: { bold: true, color: WHITE } }, { text: "Suite", options: { bold: true, color: WHITE } }, { text: "What it verifies", options: { bold: true, color: WHITE } }],
    ["TC-01", "Contact Us — Field Audit", "Shopping for a new home — fields, dropdown options, validation, submit"],
    ["TC-01", "Contact Us — Local Information", "All K. Hovnanian regions appear once (no duplicates) in state dropdown"],
    ["TC-02", "Contact Us — Local Information", "Send us a text message modal — fields, validation, fill/submit"],
    ["TC-01", "QMI Details", "Request Information modal — fields, validation, submit"],
    ["TC-01", "Community Details", "Request Information modal — fields, validation, submit"],
  ];

  s.addTable(rows, {
    x: 0.4, y: 0.9, w: 12.5,
    colW: [1.0, 3.5, 8.0],
    border: { type: "solid", color: "DDEDF8", pt: 0.5 },
    fill: { color: WHITE },
    fontFace: "Calibri",
    fontSize: 12,
    rowH: 0.55,
    autoPage: false,
    headerRowProps: { fill: { color: NAVY } },
  });

  s.addText("5 smoke tests · ~5.5 minutes on prod · 10/10 pass ✓", {
    x: 0.4, y: 4.6, w: 12.5, h: 0.5, fontSize: 13, bold: true, color: NAVY,
    align: "center", fontFace: "Calibri",
  });
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 7 — TEST LIFECYCLE
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: WHITE } });
  addHeader(s, "5 · Test Lifecycle");

  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 0.85, w: 12.5, h: 5.6, fill: { color: DARK }, rectRadius: 0.1 });
  s.addText(
`// 1. Import from baseTest (never @playwright/test directly)
import { test } from "./baseTest";
import { expect } from "@playwright/test";
import { ContactUsPage } from "../page-objects/contactUsPage";

// 2. Describe block groups related tests
test.describe("Contact Us — Field & Dropdown Audit", () => {
  let contactUsPage: ContactUsPage;

  // 3. beforeEach: fresh navigation before every test
  test.beforeEach(async ({ page }) => {
    contactUsPage = new ContactUsPage(page);
    await contactUsPage.navigateToContactViaFooter(constants.home_page.url);
  });

  // 4. Test body: page object actions → Validator assertions
  test("TC-01 | Shopping for a new home @smoke", async () => {
    await contactUsPage.selectInterest("I am shopping for a new home");
    await contactUsPage.verifyFieldsForInterest("I am shopping for a new home");
    await contactUsPage.verifyRequiredFieldValidation(...);
    const resp = await contactUsPage.submitForm(...);  // null on prod
    if (resp) await contactUsPage.verifySubmissionSuccess(...);
  });

  // 5. afterEach (baseTest.ts): page.screenshot() attached on failure
});`,
    {
      x: 0.6, y: 0.95, w: 12.2, h: 5.4,
      fontSize: 10, color: "A8D8EA", fontFace: MONO, valign: "top", wrap: true,
    }
  );
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 8 — PAGE OBJECT MODEL
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: WHITE } });
  addHeader(s, "6 · Page Object Model");

  s.addText(
    "Every page gets its own class extending BasePage. Locators are readonly Locator fields declared in the constructor — never hardcoded in tests. Methods describe user actions, so tests read like a specification.",
    { x: 0.4, y: 0.85, w: 12.5, h: 0.7, fontSize: 13, color: TEXT, fontFace: "Calibri", wrap: true }
  );

  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.65, w: 12.5, h: 2.7, fill: { color: DARK } });
  s.addText(
`export class ContactUsPage extends BasePage {
  private readonly interestRadio: Locator;
  private readonly firstNameInput: Locator;
  private readonly submitButton:   Locator;

  constructor(page: Page) {
    super(page);
    this.interestRadio = page.locator('input[name="interest"]');
    this.firstNameInput = page.getByLabel("First Name");
    this.submitButton   = page.getByRole("button", { name: "Submit" });
  }

  async selectInterest(interest: ContactInterest): Promise<void> { ... }
  async verifyFieldsForInterest(interest: ContactInterest): Promise<void> { ... }
  async submitForm(interest: ContactInterest, endpoint: string): Promise<Response | null> { ... }
}`,
    { x: 0.6, y: 1.72, w: 12.2, h: 2.55, fontSize: 10, color: "A8D8EA", fontFace: MONO, valign: "top", wrap: true }
  );

  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 4.5, w: 12.5, h: 1.1, fill: { color: "EFF6FF" }, line: { color: NAVY, width: 1 } });
  s.addText("Shared Form Component", { x: 0.7, y: 4.58, w: 5, h: 0.35, fontSize: 12, bold: true, color: NAVY, fontFace: "Calibri" });
  s.addText(
    "The Request Information modal (QMI, floorplan, community) is extracted into RequestInformationForm and composed into each page object as this.requestInfo — no duplicated modal logic.",
    { x: 0.7, y: 4.9, w: 12, h: 0.55, fontSize: 11, color: TEXT, fontFace: "Calibri", wrap: true }
  );
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 9 — COVERAGE
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: WHITE } });
  addHeader(s, "7 · What contactForms.spec.ts Covers");

  const rows = [
    [
      { text: "Surface",       options: { bold: true, color: WHITE } },
      { text: "Tags",          options: { bold: true, color: WHITE } },
      { text: "What's tested", options: { bold: true, color: WHITE } },
    ],
    ["Contact Us\n(5 interest forms)", "@smoke @regression",
      "Shopping, Mortgage, Real Estate, Subcontractor, Selling Land — fields, dropdowns, required validation, invalid email/phone, fill & submit"],
    ["Contact Us\nLocal Information", "@smoke",
      "State dropdown lists all 13 regions exactly once. Text message modal: fields, validation, submit"],
    ["QMI Details", "@smoke",
      "Request Information modal — fields, required validation, invalid validation, fill + submit, API 200 assertion (non-prod)"],
    ["Floorplan Details", "@regression",
      "Same modal flow — Clyde II floorplan at River Ranch Trails"],
    ["Community Details", "@smoke",
      "Request Information via header CTA on River Ranch Trails — same modal flow + API assertion"],
  ];

  s.addTable(rows, {
    x: 0.4, y: 0.9, w: 12.5,
    colW: [2.2, 2.0, 8.3],
    border: { type: "solid", color: "DDEDF8", pt: 0.5 },
    fill: { color: WHITE },
    fontFace: "Calibri",
    fontSize: 11,
    rowH: 0.9,
    autoPage: false,
    headerRowProps: { fill: { color: NAVY } },
  });
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 10 — PRODUCTION SAFETY
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: WHITE } });
  addHeader(s, "8 · Production Safety");

  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 0.85, w: 12.5, h: 1.0, fill: { color: "FFF5F7" }, line: { color: RED, width: 1.5 } });
  s.addText("No real leads are ever created on production.", {
    x: 0.7, y: 0.9, w: 12, h: 0.45, fontSize: 14, bold: true, color: RED, fontFace: "Calibri",
  });
  s.addText(
    "Every form is fully filled and all field validations are exercised on every environment — but the actual HTTP submit call is skipped on prod.",
    { x: 0.7, y: 1.3, w: 12, h: 0.4, fontSize: 12, color: TEXT, fontFace: "Calibri", wrap: true }
  );

  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 2.05, w: 12.5, h: 3.1, fill: { color: DARK } });
  s.addText(
`// Non-prod: submit and assert API response
const response = await qmiPage.requestInfo.submit(constants.qmi.contact_us_api);
if (response) {
  await qmiPage.requestInfo.verifyApiSubmission(response);  // HTTP 200 + payload
  await qmiPage.requestInfo.verifySubmissionSuccess();      // success message on page
}
// On prod → response is null → if-block skipped → no lead created`,
    { x: 0.6, y: 2.12, w: 12.2, h: 2.95, fontSize: 11, color: "A8D8EA", fontFace: MONO, valign: "top", wrap: true }
  );

  s.addShape(pptx.ShapeType.rect, { x: 0.4, y: 5.3, w: 12.5, h: 0.9, fill: { color: "EFF6FF" }, line: { color: NAVY, width: 1 } });
  s.addText(
    "On dev and UAT: submission goes through. The framework intercepts /api/contact-us/ via waitForApi(), asserts HTTP 200, and inspects the JSON payload to confirm the form data was correctly posted.",
    { x: 0.7, y: 5.35, w: 12, h: 0.8, fontSize: 11, color: NAVY, fontFace: "Calibri", wrap: true }
  );
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 11 — REPORTING
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: WHITE } });
  addHeader(s, "9 · Reporting");

  const reporters = [
    {
      name: "ReportPortal",
      out: "Live dashboard (browser)",
      desc: "Primary report. Named step tree, failure screenshots, per-launch attributes (env, OS, Node version). Enabled when RP_API_KEY is set.",
      color: "FFF5F7",
      border: RED,
    },
    {
      name: "HTML",
      out: "playwright-report/",
      desc: "Local review. Full step details, traces, screenshots. Open after a run with npx playwright show-report.",
      color: "F0F4FF",
      border: NAVY,
    },
    {
      name: "List",
      out: "Console",
      desc: "Real-time console output while tests run.",
      color: GRAY,
      border: "CCCCCC",
    },
  ];

  reporters.forEach((r, i) => {
    const y = 0.9 + i * 1.75;
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 12.5, h: 1.55, fill: { color: r.color }, line: { color: r.border, width: 1 } });
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 0.08, h: 1.55, fill: { color: r.border } });
    s.addText(r.name, { x: 0.65, y: y + 0.1, w: 3, h: 0.4, fontSize: 14, bold: true, color: r.border === RED ? RED : NAVY, fontFace: "Calibri" });
    s.addText(r.out,  { x: 0.65, y: y + 0.48, w: 12, h: 0.3, fontSize: 11, color: "666666", fontFace: MONO });
    s.addText(r.desc, { x: 0.65, y: y + 0.82, w: 12, h: 0.6, fontSize: 11, color: TEXT, fontFace: "Calibri", wrap: true });
  });
}

// ══════════════════════════════════════════════════════════════════════
// SLIDE 12 — SHARED UTILITIES
// ══════════════════════════════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: WHITE } });
  addHeader(s, "10 · Shared Utilities");

  const utils = [
    { name: "Validator",       file: "utils/validator.ts",      desc: "Static assertion helpers: requireVisible, requireHidden, requireEnabled, requireText, requireUrlContains — each wrapped in a named test.step for clean report output." },
    { name: "apiUtils",        file: "utils/apiUtils.ts",       desc: "waitForApi(page, endpoint) — intercepts a network response matching the URL + HTTP 200. Used to assert the /api/contact-us/ call on non-prod." },
    { name: "testDataUtils",   file: "utils/testDataUtils.ts",  desc: "Generates randomised test data: randomFirstName(), randomLastName(), randomPhone(), randomEmail(). Keeps form submissions unique across runs." },
    { name: "constants.json",  file: "utils/constants.json",    desc: "Static expected values: page URLs, headings, API paths, interest labels, state dropdown options. Single source of truth." },
    { name: "test_data.json",  file: "utils/test_data.json",    desc: "Dynamic test inputs: search terms, API endpoints, local-information states for the text-message modal test." },
  ];

  utils.forEach((u, i) => {
    const y = 0.9 + i * 1.1;
    s.addShape(pptx.ShapeType.rect, { x: 0.4, y, w: 0.06, h: 0.85, fill: { color: RED } });
    s.addText(u.name, { x: 0.65, y: y + 0.02, w: 2.5, h: 0.38, fontSize: 13, bold: true, color: NAVY, fontFace: "Calibri" });
    s.addText(u.file, { x: 0.65, y: y + 0.4,  w: 2.9, h: 0.3,  fontSize: 9,  color: "888888", fontFace: MONO });
    s.addText(u.desc, { x: 3.6,  y: y + 0.1,  w: 9.3, h: 0.7,  fontSize: 11, color: TEXT, fontFace: "Calibri", wrap: true });
  });
}

// ══════════════════════════════════════════════════════════════════════
// Write file
// ══════════════════════════════════════════════════════════════════════
await pptx.writeFile({ fileName: "docs/framework-overview.pptx" });
console.log("Done → docs/framework-overview.pptx");
