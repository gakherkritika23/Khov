import { Page, Locator, Response, expect } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import { reportValue } from "../utils/reporter";
import { waitForApi } from "../utils/apiUtils";

/**
 * The five "What are you interested in?" options on the Contact Us page. Each
 * one renders a DIFFERENT form (different field sets + dropdowns), so fields are
 * verified per interest.
 */
export type ContactInterest =
  | "I am shopping for a new home"
  | "I would like mortgage information"
  | "I am a real estate professional"
  | "I am a subcontractor"
  | "I am selling land";

interface FieldSpec {
  label: string;
  name: string; // the element's `name` attribute (stable)
  kind: "input" | "select" | "textarea" | "checkbox";
  // Valid value used when filling the form for a successful submit. For inputs/
  // textareas it's the text; for selects it's the option label. Email/Phone are
  // filled with dynamic/override values, so they omit this. Checkboxes omit it.
  value?: string;
}

/**
 * Contact Us page (`/contact-us/`). Reached via the footer "Contact Us" link.
 * The contact form is the same shared component used by the "Request
 * Information" form on QMI/floorplan detail pages — stable `name` attributes,
 * native (visually-hidden) `<select>`s, and react-aria (visually-hidden)
 * disclaimer checkboxes.
 *
 * Step 1 is a read-only audit: per interest, verify the form's fields exist and
 * log every dropdown's options. NO submission (so it is safe on every env,
 * including prod).
 */
export class ContactUsPage extends BasePage {
  readonly footerContactUsLink: Locator;
  readonly form: Locator;
  readonly nativeSelects: Locator;
  readonly submitButton: Locator;
  readonly fieldErrors: Locator;
  readonly successMessage: Locator;
  readonly turnstileToken: Locator;

  // Per-interest expected fields (from Stage 3 discovery). Hidden plumbing
  // inputs (cf-turnstile-response, IsDesignPriceLead) are intentionally omitted.
  private readonly fieldMap: Record<ContactInterest, FieldSpec[]>;

  constructor(page: Page) {
    super(page);
    this.footerContactUsLink = page
      .locator("footer")
      .getByRole("link", { name: /Contact Us/i })
      .first();
    // Single contact form on the page; scope ALL field/dropdown queries to it
    // ("Email"/"Contact" text also appears in the footer/nav).
    this.form = page
      .locator("form")
      .filter({ has: page.locator("input[name='Email']") })
      .first();
    this.nativeSelects = this.form.locator("select");
    this.submitButton = this.form.locator("button[type='submit']");
    // Inline per-field validation messages: "Please complete the required field"
    // (empty) / "Please correct the required field" (invalid value).
    this.fieldErrors = this.form.locator("[class*='shared_error']");
    // On success the form swaps for a thank-you panel — scope at page level.
    this.successMessage = page
      .getByText(/Thank you for your message/i)
      .or(page.getByText(/Online Community Specialist will be in touch/i))
      .first();
    // Cloudflare Turnstile token (must be populated before a real submit).
    this.turnstileToken = page.locator("input[name='cf-turnstile-response']");

    // Common to every form. Email/Phone are filled dynamically in fillForm.
    const contact: FieldSpec[] = [
      { label: "First Name", name: "FirstName", kind: "input", value: "Test" },
      { label: "Last Name", name: "LastName", kind: "input", value: "Automation" },
      { label: "Email", name: "Email", kind: "input" },
      { label: "Phone", name: "Phone", kind: "input" },
    ];
    const address: FieldSpec[] = [
      { label: "Address 1", name: "Address1", kind: "input", value: "123 Test Street" },
      { label: "Address 2", name: "Address2", kind: "input", value: "Suite 100" },
      { label: "City", name: "City", kind: "input", value: "Dayton" },
      { label: "Zip", name: "Zip", kind: "input", value: "77535" },
    ];
    const comments: FieldSpec = { label: "Comments / Questions", name: "CommentsQuestions", kind: "textarea", value: "Automated test — please ignore." };
    const disclaimer: FieldSpec = { label: "Disclaimer checkbox", name: "Disclaimer", kind: "checkbox" };
    const state: FieldSpec = { label: "State", name: "State", kind: "select", value: "Texas" };
    const stateOfInterest: FieldSpec = { label: "State of Interest", name: "StateOfInterest", kind: "select", value: "Texas" };

    // Field sets confirmed identical on prod and dev (Stage 3 discovery v2).
    this.fieldMap = {
      "I am shopping for a new home": [
        ...contact,
        { label: "Preferred Contact Method", name: "PreferredContactMethod", kind: "select", value: "Email" },
        stateOfInterest,
        comments,
        disclaimer,
        { label: "Text-message disclaimer checkbox", name: "TextMessageDisclaimerCheckbox", kind: "checkbox" },
      ],
      "I would like mortgage information": [
        ...contact,
        ...address,
        state,
        stateOfInterest,
        comments,
        disclaimer,
      ],
      "I am a real estate professional": [
        ...contact,
        ...address,
        { label: "Company Name", name: "CompanyName", kind: "input", value: "Test Automation Co" },
        { label: "Company Position", name: "CompanyPosition", kind: "input", value: "QA Engineer" },
        state, // NOTE: real-estate has State only — no State of Interest
        comments,
        disclaimer,
      ],
      "I am a subcontractor": [
        ...contact,
        ...address,
        { label: "Company Name", name: "CompanyName", kind: "input", value: "Test Automation Co" },
        state,
        { label: "Service / Trade", name: "ServiceTrade", kind: "select", value: "Plumbing" },
        { label: "Years in Business", name: "YearsInBusiness", kind: "select", value: "5 to 10 years" },
        stateOfInterest,
        comments,
        disclaimer,
      ],
      "I am selling land": [
        ...contact,
        { label: "Lot Acres", name: "LotAcres", kind: "input", value: "5" },
        { label: "Lot City", name: "LotCity", kind: "input", value: "Dayton" },
        { label: "Lot County", name: "LotCounty", kind: "input", value: "Liberty" },
        { label: "Price", name: "Price", kind: "input", value: "100000" },
        { label: "Zoning", name: "Zoning", kind: "input", value: "Residential" },
        { label: "Entitlements", name: "Entitlements", kind: "input", value: "None" },
        { label: "Owner Name", name: "OwnerName", kind: "input", value: "Test Owner" },
        { label: "Owner Phone", name: "OwnerPhone", kind: "input", value: "7325551234" },
        state,
        { label: "Lot Description", name: "LotDescription", kind: "textarea", value: "Automated test land listing — please ignore." },
        disclaimer,
      ],
    };
  }

  // ── Navigation — Actions ───────────────────────────────
  /**
   * Reach the Contact Us page by clicking the footer "Contact Us" link from the
   * home page (proves the footer route). Hydration-safe: scroll the link into
   * view, click, and wait for the URL — retry if the click raced hydration.
   */
  async navigateToContactViaFooter(homeUrl: string): Promise<void> {
    await this.navigate(homeUrl); // gotoWithRetry + cookie/popup dismissal
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.scrollIntoView(this.footerContactUsLink);
      await this.click(
        this.footerContactUsLink,
        attempt === 1 ? "footer Contact Us link" : "footer Contact Us link (retry)",
      );
      const landed = await this.page
        .waitForURL(/\/contact-us\//, { timeout: 15000 })
        .then(() => true)
        .catch(() => false);
      if (landed) break;
      await this.page.waitForLoadState("load", { timeout: 10000 }).catch(() => {});
    }
    await this.page.waitForLoadState("load", { timeout: 15000 }).catch(() => {});
    await this.handlePagePopups();
  }

  // ── Navigation — Verification ──────────────────────────
  async verifyContactPageDisplayed(): Promise<void> {
    await Validator.requireUrlContains(
      this.page,
      "/contact-us/",
      "Should land on the Contact Us page (via footer link)",
      20000,
    );
    // Assert the contact FORM rendered (env-proof) rather than a specific heading
    // — the page heading markup differs across environments.
    await Validator.requireVisible(
      this.form.locator("input[name='FirstName']").first(),
      "Contact form should be loaded on the Contact Us page",
      25000,
    );
  }

  // ── Interest selection — Actions ───────────────────────
  /**
   * Select a "What are you interested in?" radio. The radios are react-aria
   * native inputs that are visually hidden, so we click the visible label text;
   * if already selected (the default), it's a no-op. Confirms via `toBeChecked`.
   */
  async selectInterest(interest: ContactInterest): Promise<void> {
    const radio = this.page.getByRole("radio", { name: interest, exact: true });
    const alreadyChecked = await radio.isChecked().catch(() => false);
    if (!alreadyChecked) {
      await this.page
        .getByText(interest, { exact: true })
        .first()
        .click({ timeout: 8000 })
        .catch(async () => {
          await radio.check({ force: true }).catch(() => {});
        });
    }
    await expect(radio).toBeChecked({ timeout: 8000 });
    // The form re-renders on interest change; give it a moment to settle.
    await this.page.waitForTimeout(500);
    await reportValue(`Interest selected: ${interest}`);
  }

  // ── Fields — Verification ──────────────────────────────
  /**
   * Verify every expected field for the given interest EXISTS. Visible fields
   * (inputs / selects / textareas) are asserted visible; the disclaimer
   * checkboxes are react-aria (visually hidden) so they're asserted present
   * (attached) instead. Submit button is always checked.
   */
  async verifyFieldsForInterest(interest: ContactInterest): Promise<void> {
    for (const field of this.fieldMap[interest]) {
      const selector =
        field.kind === "select"
          ? `select[name='${field.name}']`
          : field.kind === "textarea"
            ? `textarea[name='${field.name}']`
            : `input[name='${field.name}']`;
      const locator = this.form.locator(selector).first();
      if (field.kind === "checkbox") {
        // Visually-hidden react-aria input — assert it exists, not visible.
        await Validator.requireTrue(
          (await locator.count()) > 0,
          `${interest} — ${field.label} should exist`,
        );
      } else {
        await Validator.requireVisible(
          locator,
          `${interest} — ${field.label} field should be visible`,
          15000,
        );
      }
    }
    await Validator.requireVisible(
      this.submitButton.first(),
      `${interest} — Submit button should be visible`,
      15000,
    );
  }

  // ── Dropdowns — Data Getters / logging ─────────────────
  /**
   * For every native <select> in the active form, log the field name + all of
   * its option texts (skipping the empty placeholder). Asserts each dropdown has
   * options. All dropdowns on this form are native selects (no custom combos).
   */
  async logDropdownOptions(interest: ContactInterest): Promise<void> {
    const count = await this.nativeSelects.count();
    await reportValue(`${interest}: ${count} dropdown(s) found`);
    for (let i = 0; i < count; i++) {
      const select = this.nativeSelects.nth(i);
      const name = (await select.getAttribute("name")) || `select ${i + 1}`;
      const options = (await select.locator("option").allInnerTexts())
        .map((o) => o.trim())
        .filter(Boolean);
      await Validator.requireTrue(
        options.length > 0,
        `${interest} — '${name}' dropdown should have options`,
      );
      await reportValue(`${interest} | ${name} options: ${options.join(", ")}`);
    }
  }

  // ── Form fill + submit (Step 2) ────────────────────────
  private fieldLocator(field: FieldSpec): Locator {
    const selector =
      field.kind === "select"
        ? `select[name='${field.name}']`
        : field.kind === "textarea"
          ? `textarea[name='${field.name}']`
          : `input[name='${field.name}']`;
    return this.form.locator(selector).first();
  }

  /**
   * Fill every field of the given interest's form with valid values. Email/Phone
   * use a unique synthetic value unless overridden (used to inject invalid values
   * for validation). Selects are set with selectOption (force — native select is
   * visually hidden); disclaimers are toggled the react-aria way.
   */
  private async fillForm(
    interest: ContactInterest,
    overrides: { email?: string; phone?: string } = {},
  ): Promise<void> {
    const email = overrides.email ?? `test.automation+${Date.now()}@ex2india.com`;
    const phone = overrides.phone ?? "7325551234";
    for (const field of this.fieldMap[interest]) {
      const locator = this.fieldLocator(field);
      if (field.kind === "checkbox") {
        await this.checkBox(locator, field.label);
      } else if (field.name === "Email") {
        await this.type(locator, email, "Email");
      } else if (field.name === "Phone" || field.name === "OwnerPhone") {
        await this.type(locator, phone, field.label);
      } else if (field.kind === "select") {
        await locator.selectOption(field.value ?? "", { force: true });
      } else {
        await this.type(locator, field.value ?? "Test", field.label);
      }
    }
  }

  // react-aria checkbox: a forced click doesn't flip state — focus + Space.
  private async checkBox(input: Locator, name: string): Promise<void> {
    if (await input.isChecked().catch(() => false)) return;
    await input.focus();
    await input.press("Space");
    await expect(input, `${name} should be checked`).toBeChecked({ timeout: 5000 });
  }

  // Cloudflare Turnstile injects a token into a hidden input once it resolves;
  // submitting before it's present silently fails. Wait for it (non-prod).
  private async waitForTurnstileToken(timeout = 20000): Promise<void> {
    await expect
      .poll(
        async () => (await this.turnstileToken.inputValue().catch(() => "")).length,
        { message: "Cloudflare Turnstile token should populate before submit", timeout },
      )
      .toBeGreaterThan(0);
  }

  private isProdEnv(): boolean {
    const env = (process.env.TEST_ENV ?? "").toLowerCase();
    const baseUrl = process.env.BASE_URL ?? "";
    return env === "prod" || /^https?:\/\/(www\.)?khov\.com/i.test(baseUrl);
  }

  /**
   * Required-field validation (safe on all envs — client-side, no POST):
   * submit the empty form and assert a "Please complete the required field"
   * error appears and the success panel does not.
   */
  async verifyRequiredFieldValidation(interest: ContactInterest): Promise<void> {
    await this.click(this.submitButton.first(), "Submit (empty form)");
    await Validator.requireVisible(
      this.fieldErrors.filter({ hasText: /Required field/i }).first(),
      `${interest} — empty submit should show a 'Required field' error`,
      10000,
    );
    await Validator.requireHidden(
      this.successMessage,
      `${interest} — no success panel should appear for an empty submit`,
      4000,
    );
  }

  /**
   * Invalid email/phone validation (safe on all envs — client-side blocks the
   * POST): fill the form valid except an invalid email + phone, submit, and
   * assert both are flagged aria-invalid with a "correct the required field"
   * error and no success panel.
   */
  async verifyInvalidEmailPhoneValidation(interest: ContactInterest): Promise<void> {
    await this.fillForm(interest, { email: "not-an-email", phone: "123" });
    await this.click(this.submitButton.first(), "Submit (invalid email/phone)");
    await expect(this.fieldLocator({ label: "Email", name: "Email", kind: "input" })).toHaveAttribute(
      "aria-invalid",
      "true",
      { timeout: 10000 },
    );
    await expect(this.fieldLocator({ label: "Phone", name: "Phone", kind: "input" })).toHaveAttribute(
      "aria-invalid",
      "true",
      { timeout: 10000 },
    );
    await Validator.requireVisible(
      this.fieldErrors.filter({ hasText: /Invalid format/i }).first(),
      `${interest} — invalid email/phone should show an 'Invalid format' error`,
      10000,
    );
    await Validator.requireHidden(
      this.successMessage,
      `${interest} — no success panel should appear with invalid values`,
      4000,
    );
  }

  /**
   * Fill the form with valid data and submit it — UNLESS on prod, where we fill
   * but never submit (no real lead). Returns the contact-us API Response on
   * non-prod, or null when submission was skipped on prod.
   */
  async submitForm(
    interest: ContactInterest,
    apiEndpoint: string,
  ): Promise<Response | null> {
    await this.fillForm(interest);

    if (this.isProdEnv()) {
      await reportValue(
        `${interest}: prod — form filled but NOT submitted (no lead created)`,
      );
      await Validator.requireTrue(
        await this.submitButton.first().isEnabled(),
        `${interest} — form should be filled & ready (submit not clicked on prod)`,
      );
      return null;
    }

    await this.waitForTurnstileToken();
    // Arm the listener before clicking so the POST isn't missed (308 → 200).
    const responsePromise = waitForApi(this.page, apiEndpoint, 30000);
    await this.click(this.submitButton.first(), `${interest} — Submit (valid)`);
    return await responsePromise;
  }

  async verifySubmissionSuccess(interest: ContactInterest): Promise<void> {
    await Validator.requireVisible(
      this.successMessage,
      `${interest} — success / thank-you panel should be displayed after submit`,
      20000,
    );
  }
}
