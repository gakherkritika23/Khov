import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import { reportValue } from "../utils/reporter";

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

    // Common to every form.
    const contact: FieldSpec[] = [
      { label: "First Name", name: "FirstName", kind: "input" },
      { label: "Last Name", name: "LastName", kind: "input" },
      { label: "Email", name: "Email", kind: "input" },
      { label: "Phone", name: "Phone", kind: "input" },
    ];
    const address: FieldSpec[] = [
      { label: "Address 1", name: "Address1", kind: "input" },
      { label: "Address 2", name: "Address2", kind: "input" },
      { label: "City", name: "City", kind: "input" },
      { label: "Zip", name: "Zip", kind: "input" },
    ];
    const comments: FieldSpec = { label: "Comments / Questions", name: "CommentsQuestions", kind: "textarea" };
    const disclaimer: FieldSpec = { label: "Disclaimer checkbox", name: "Disclaimer", kind: "checkbox" };
    const state: FieldSpec = { label: "State", name: "State", kind: "select" };
    const stateOfInterest: FieldSpec = { label: "State of Interest", name: "StateOfInterest", kind: "select" };

    // Field sets confirmed identical on prod and dev (Stage 3 discovery v2).
    this.fieldMap = {
      "I am shopping for a new home": [
        ...contact,
        { label: "Preferred Contact Method", name: "PreferredContactMethod", kind: "select" },
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
        { label: "Company Name", name: "CompanyName", kind: "input" },
        { label: "Company Position", name: "CompanyPosition", kind: "input" },
        state, // NOTE: real-estate has State only — no State of Interest
        comments,
        disclaimer,
      ],
      "I am a subcontractor": [
        ...contact,
        ...address,
        { label: "Company Name", name: "CompanyName", kind: "input" },
        state,
        { label: "Service / Trade", name: "ServiceTrade", kind: "select" },
        { label: "Years in Business", name: "YearsInBusiness", kind: "select" },
        stateOfInterest,
        comments,
        disclaimer,
      ],
      "I am selling land": [
        ...contact,
        { label: "Lot Acres", name: "LotAcres", kind: "input" },
        { label: "Lot City", name: "LotCity", kind: "input" },
        { label: "Lot County", name: "LotCounty", kind: "input" },
        { label: "Price", name: "Price", kind: "input" },
        { label: "Zoning", name: "Zoning", kind: "input" },
        { label: "Entitlements", name: "Entitlements", kind: "input" },
        { label: "Owner Name", name: "OwnerName", kind: "input" },
        { label: "Owner Phone", name: "OwnerPhone", kind: "input" },
        state,
        { label: "Lot Description", name: "LotDescription", kind: "textarea" },
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
}
