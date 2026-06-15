import { Page, Locator, Response, expect } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import { waitForApi } from "../utils/apiUtils";

export interface RequestInformationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContactMethod?: "Text" | "Email" | "Phone";
}

// Sensible defaults for a successful submission; callers may override per test.
const DEFAULT_REQUEST_INFORMATION_DATA: RequestInformationFormData = {
  firstName: "Test",
  lastName: "Automation",
  email: `test.automation+${Date.now()}@ex2india.com`,
  phone: "7325551234",
  preferredContactMethod: "Email",
};

/**
 * Shared "Request Information" contact form. The same modal component is reused
 * across the community, QMI and floorplan detail pages — only the trigger CTA
 * differs per page, so each page object keeps its own CTA + open method and
 * delegates everything below (fields, validation, fill, submit, success, API)
 * to this helper.
 *
 * The modal is a page-global overlay, so all field locators are scoped to the
 * modal container (`[class*='request-information_modal']`) rather than to any
 * page-specific section.
 */
export class RequestInformationForm extends BasePage {
  readonly modal: Locator;
  readonly modalHeading: Locator;
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly phone: Locator;
  readonly contactMethod: Locator;
  readonly disclaimerCheckbox: Locator;
  readonly textDisclaimerCheckbox: Locator;
  readonly submitButton: Locator;
  readonly fieldErrors: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.modal = page
      .locator("[class*='request-information_modal']")
      .or(
        page.locator("[class*='Modal_modal']").filter({
          hasText: /Request Information/i,
        }),
      )
      .first();
    this.modalHeading = this.modal
      .getByRole("heading", {
        name: /Request Information for/i,
      })
      .first();
    // Request Information form controls. The inputs carry stable `name`
    // attributes (FirstName / LastName / Email / Phone); the preferred-contact
    // dropdown is backed by a native (visually-hidden) <select>. Two required
    // disclaimer checkboxes (general + text-message) gate submission.
    this.firstName = this.modal.locator("input[name='FirstName']");
    this.lastName = this.modal.locator("input[name='LastName']");
    this.email = this.modal.locator("input[name='Email']");
    this.phone = this.modal.locator("input[name='Phone']");
    this.contactMethod = this.modal.locator(
      "select[name='PreferredContactMethod']",
    );
    this.disclaimerCheckbox = this.modal.locator("input[name='Disclaimer']");
    this.textDisclaimerCheckbox = this.modal.locator(
      "input[name='TextMessageDisclaimerCheckbox']",
    );
    this.submitButton = this.modal.locator("button[type='submit']");
    // Inline per-field validation messages: "Please complete the required
    // field" (empty) / "Please correct the required field" (invalid value).
    this.fieldErrors = this.modal.locator("[class*='shared_error']");
    // On success the modal swaps the form for a thank-you panel (the
    // "Request Information" heading is gone), so scope this at page level.
    this.successMessage = page
      .getByText(/Thank you for your message/i)
      .or(page.getByText(/Online Community Specialist will be in touch/i))
      .first();
  }

  // ── Verification ───────────────────────────────────────
  async verifyModalIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.modal,
      "Request Information modal should be displayed",
      20000,
    );
    await Validator.requireVisible(
      this.modalHeading,
      "Request Information modal heading should be visible",
      20000,
    );
    await expect(this.modalHeading).toContainText(/Request Information for/i);
  }

  async verifyModalFields(): Promise<void> {
    const requiredFields = [
      { name: "First Name", locator: this.requestField(/First Name/i) },
      { name: "Last Name", locator: this.requestField(/Last Name/i) },
      { name: "Email Address", locator: this.requestField(/Email Address/i) },
      { name: "Mobile Number", locator: this.requestField(/Mobile Number/i) },
      {
        name: "Preferred Method of Contact",
        locator: this.modal
          .locator("select, [role='combobox'], input")
          .filter({ hasText: /Preferred Method of Contact/i })
          .or(this.modal.getByText(/Preferred Method of Contact/i))
          .first(),
      },
    ];

    for (const field of requiredFields) {
      await Validator.requireVisible(
        field.locator,
        `${field.name} field should be visible in Request Information modal`,
        10000,
      );
    }

    await Validator.requireVisible(
      this.modal.getByText(/Real Estate Professional/i).first(),
      "Real Estate Professional checkbox should be visible",
      10000,
    );
    await Validator.requireVisible(
      this.modal.getByText(/Terms and Conditions/i).first(),
      "Terms and Conditions consent text should be visible",
      10000,
    );
    await Validator.requireVisible(
      this.modal.getByText(/Read Full Disclaimer/i).first(),
      "Read Full Disclaimer link should be visible",
      10000,
    );
  }

  // Submits the EMPTY form and confirms it is blocked with an inline required-
  // field error and no submission. Client-side only (no POST) — safe on every
  // environment.
  async verifyRequiredFieldValidation(): Promise<void> {
    await this.click(
      this.submitButton.first(),
      "Send Request (submit empty form)",
    );
    await Validator.requireVisible(
      this.fieldErrors
        .filter({ hasText: /complete the required field|Required field/i })
        .first(),
      "Empty submit should show a required-field error",
      10000,
    );
    await Validator.requireHidden(
      this.successMessage,
      "Success message should NOT appear when submitting an empty form",
      4000,
    );
  }

  // Enters invalid values into the required fields and confirms the form blocks
  // submission with inline "Please correct the required field" errors. Never
  // creates a lead (client-side validation prevents the POST), so it is safe to
  // run in every environment.
  async verifyInvalidValueValidation(): Promise<void> {
    // Valid name + disclaimers so the only failures are the invalid email/phone.
    await this.type(this.firstName, "Test", "First Name");
    await this.type(this.lastName, "Automation", "Last Name");
    await this.type(this.email, "not-an-email", "Email Address");
    await this.type(this.phone, "123", "Mobile Number");
    await this.contactMethod.selectOption("Email", { force: true });
    await this.checkBox(this.disclaimerCheckbox, "Terms & Conditions disclaimer");
    await this.checkBox(this.textDisclaimerCheckbox, "Text message disclaimer");

    await this.click(
      this.submitButton.first(),
      "Send Request (submit with invalid values)",
    );

    // Invalid fields are flagged via aria-invalid and the "correct" error copy.
    await expect(this.email).toHaveAttribute("aria-invalid", "true", {
      timeout: 10000,
    });
    await expect(this.phone).toHaveAttribute("aria-invalid", "true", {
      timeout: 10000,
    });
    await Validator.requireVisible(
      this.fieldErrors
        .filter({ hasText: /Please correct the required field/i })
        .first(),
      "Invalid required fields should show a 'Please correct the required field' error",
      10000,
    );

    // The form must NOT have been submitted — no thank-you panel.
    await Validator.requireHidden(
      this.successMessage,
      "Success message should NOT appear when the form has invalid values",
      5000,
    );
  }

  async verifySubmissionSuccess(): Promise<void> {
    await Validator.requireVisible(
      this.successMessage,
      "Request Information thank-you / success message should be displayed after submission",
      20000,
    );
    await Validator.requireUrlContains(
      this.page,
      "modalKey=success",
      "URL should reflect the success modal after a successful submission",
      15000,
    );
  }

  // Asserts the contact-us API confirmed the submission AND that the payload it
  // sent matches the data we entered (FirstName/LastName/Email/Phone/contact
  // method) — i.e. the form posted what we filled, not stale/wrong values.
  async verifyApiSubmission(
    response: Response,
    data: RequestInformationFormData = DEFAULT_REQUEST_INFORMATION_DATA,
  ): Promise<void> {
    expect(response.status(), "contact-us API should return HTTP 200").toBe(200);

    const body = (await response.json()) as { status?: string; data?: string };
    expect(
      body.status,
      "contact-us API response should report status 'success'",
    ).toBe("success");
    expect(
      body.data,
      "contact-us API response should report data 'Submitted successfully'",
    ).toBe("Submitted successfully");

    const payload = JSON.parse(response.request().postData() ?? "{}") as Record<
      string,
      string
    >;
    expect(
      payload.FirstName,
      "Submitted First Name should match the entered value",
    ).toBe(data.firstName);
    expect(
      payload.LastName,
      "Submitted Last Name should match the entered value",
    ).toBe(data.lastName);
    expect(payload.Email, "Submitted Email should match the entered value").toBe(
      data.email,
    );
    expect(payload.Phone, "Submitted Phone should match the entered value").toBe(
      data.phone,
    );
    if (data.preferredContactMethod) {
      expect(
        payload.PreferredContactMethod,
        "Submitted Preferred Contact Method should match the selected value",
      ).toBe(data.preferredContactMethod);
    }
  }

  // ── Actions ────────────────────────────────────────────
  // Fills the required text fields, picks a preferred contact method, and ticks
  // the two required disclaimer checkboxes so the form is ready to submit.
  async fill(
    data: RequestInformationFormData = DEFAULT_REQUEST_INFORMATION_DATA,
  ): Promise<void> {
    await this.type(this.firstName, data.firstName, "First Name");
    await this.type(this.lastName, data.lastName, "Last Name");
    await this.type(this.email, data.email, "Email Address");
    await this.type(this.phone, data.phone, "Mobile Number");

    if (data.preferredContactMethod) {
      // The select is visually hidden (a styled button mirrors it), so bypass
      // the visibility actionability check.
      await this.contactMethod.selectOption(data.preferredContactMethod, {
        force: true,
      });
    }

    // Both disclaimers are required to submit.
    await this.checkBox(this.disclaimerCheckbox, "Terms & Conditions disclaimer");
    await this.checkBox(this.textDisclaimerCheckbox, "Text message disclaimer");
  }

  // Fills the form with valid data and submits it, unless the target is
  // production — we never create real leads on prod. Captures and returns the
  // `apiEndpoint` (contact-us) response so callers can assert on it; returns
  // `null` when submission was skipped on prod.
  async submit(
    apiEndpoint: string,
    data: RequestInformationFormData = DEFAULT_REQUEST_INFORMATION_DATA,
  ): Promise<Response | null> {
    await this.fill(data);

    if (this.isProdEnv()) {
      console.warn(
        "Skipping Request Information form submission on prod to avoid " +
          "creating a real lead (form was filled but not submitted).",
      );
      return null;
    }

    await this.waitForTurnstileToken();

    // Arm the response listener BEFORE clicking so we don't miss the POST.
    // The submit first hits `/api/contact-us` (308) then `/api/contact-us/`
    // (200); waitForApi's status-200 predicate skips the redirect.
    const responsePromise = waitForApi(this.page, apiEndpoint, 30000);
    await this.click(this.submitButton.first(), "Send Request (submit)");
    return await responsePromise;
  }

  // ── Private helpers ────────────────────────────────────
  // The disclaimer checkboxes are visually-hidden inputs driven by react-aria;
  // a forced click on the input doesn't flip the component state, so toggle them
  // the way react-aria expects — focus the input and press Space.
  private async checkBox(input: Locator, name: string): Promise<void> {
    if (await input.isChecked().catch(() => false)) {
      return;
    }

    await input.focus();
    await input.press("Space");
    await expect(input, `${name} checkbox should be checked`).toBeChecked({
      timeout: 5000,
    });
  }

  // The contact form is gated by a Cloudflare Turnstile widget that injects a
  // token into a hidden input once it resolves; submitting before the token is
  // present silently fails. Wait for it (best-effort) before clicking submit.
  private async waitForTurnstileToken(timeout = 15000): Promise<void> {
    const tokenInput = this.page.locator("input[name='cf-turnstile-response']");
    await expect
      .poll(async () => (await tokenInput.inputValue().catch(() => "")).length, {
        message: "Cloudflare Turnstile token should be populated before submit",
        timeout,
      })
      .toBeGreaterThan(0);
  }

  // Production is the live www.khov.com domain (env subdomains are www-dev /
  // www-uat / www-stg). We treat TEST_ENV=prod or that domain as "prod".
  private isProdEnv(): boolean {
    const env = (process.env.TEST_ENV ?? "").toLowerCase();
    const baseUrl = process.env.BASE_URL ?? "";
    const isProdUrl = /^https?:\/\/(www\.)?khov\.com/i.test(baseUrl);
    return env === "prod" || isProdUrl;
  }

  private requestField(name: RegExp): Locator {
    return this.modal
      .getByPlaceholder(name)
      .or(this.modal.getByLabel(name))
      .or(
        this.modal
          .locator("input, select, textarea, [role='combobox']")
          .filter({ hasText: name }),
      )
      .first();
  }
}
