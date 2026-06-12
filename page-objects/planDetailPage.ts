import { Page, Locator, Response, expect } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import { waitForApi } from "../utils/apiUtils";
import type { RequestInformationFormData } from "./qmiPage";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";

// Shared form "user data" lives in utils/test_data.json so it is reused across
// every page object that exposes the Request Information form. The `{{timestamp}}`
// placeholder in the email is swapped for a unique value so repeated submissions
// don't collide with lead de-duplication.
const DEFAULT_REQUEST_INFORMATION_DATA: RequestInformationFormData = {
    ...testData.request_information.valid,
    preferredContactMethod: testData.request_information.valid
        .preferredContactMethod as RequestInformationFormData["preferredContactMethod"],
    email: testData.request_information.valid.email.replace(
        "{{timestamp}}",
        String(Date.now()),
    ),
};

/**
 * Floorplan details page — E5 in docs/test-plan.md.
 *
 * Pinned (via the spec) to a deterministic floorplan — Clyde II at River Ranch
 * Trails (`constants.floorplan.detail_url`). Unlike a QMI home, this page shows
 * a floorplan-level **Starting price** (not a fixed home price) and uses a plain
 * media gallery (no hero-gallery-2.0 section nav / Interior-Exterior tabs).
 *
 * It otherwise shares the same design-system components as the QMI page
 * (`qmiPage.ts`): the "Monthly payment as low as" + mortgage-calculator popover,
 * the `/floorplan/` Interactive Floor Plan iframe, the ContentNavigation CTAs,
 * and the identical Request Information form (same field names + contact-us API).
 */
export class PlanDetailPage extends BasePage {
    readonly pageHeading: Locator;
    readonly startingPriceBlock: Locator;
    readonly startingPriceTitle: Locator;
    readonly startingPriceValue: Locator;
    readonly monthlyPayment: Locator;
    readonly mortgageInfoTrigger: Locator;
    readonly viewGalleryButton: Locator;
    readonly galleryModal: Locator;
    readonly galleryImage: Locator;
    readonly floorplanIframe: Locator;
    readonly detailNavBar: Locator;
    readonly requestTourCta: Locator;
    readonly requestInfoCta: Locator;
    readonly requestInformationModal: Locator;
    readonly requestInformationModalHeading: Locator;
    readonly requestInfoFirstName: Locator;
    readonly requestInfoLastName: Locator;
    readonly requestInfoEmail: Locator;
    readonly requestInfoPhone: Locator;
    readonly requestInfoContactMethod: Locator;
    readonly requestInfoDisclaimerCheckbox: Locator;
    readonly requestInfoTextDisclaimerCheckbox: Locator;
    readonly requestInfoSubmitButton: Locator;
    readonly requestInfoFieldErrors: Locator;
    readonly requestInfoSuccessMessage: Locator;

    constructor(page: Page) {
        super(page);
        // h1 is the floorplan name (e.g. "Clyde II").
        this.pageHeading = page.locator("h1");
        // Starting price lives in an InfoBlockAlt column: a "Starting price" title
        // (floor-plan-info_payment-title) + its value (floor-plan-info_payment-value).
        this.startingPriceBlock = page
            .locator("[class*='InfoBlockAlt_column']")
            .filter({ hasText: /Starting price/i })
            .first();
        this.startingPriceTitle = page
            .locator("[class*='floor-plan-info_payment-title']")
            .filter({ hasText: /Starting price/i })
            .first();
        this.startingPriceValue = this.startingPriceBlock
            .locator("[class*='floor-plan-info_payment-value']")
            .first();
        // Estimated monthly payment ("$2,226/mo") + the mortgage-info trigger that
        // reveals the "Mortgage Calculator" CTA on hover (same as the QMI page).
        this.monthlyPayment = page.getByText(/\$[\d,]+\/mo\.?/i).first();
        this.mortgageInfoTrigger = page
            .getByRole("heading", { name: /Monthly payment as low as/i })
            .locator("xpath=following::button[1]")
            .or(
                page.getByRole("button", {
                    name: /Mortgage calculation information|Info icon/i,
                }),
            );
        // Media gallery — plain Gallery modal ("View Gallery", no count suffix).
        this.viewGalleryButton = page
            .getByRole("button", { name: /View Gallery/i })
            .or(page.locator("button").filter({ hasText: /View Gallery/i }));
        this.galleryModal = page
            .locator("[class*='Modal_overlay']")
            .or(page.getByRole("dialog"));
        this.galleryImage = this.galleryModal.locator("img, picture");
        // Interactive Floor Plan — embedded ml3ds-cloud iframe (scope by /floorplan/).
        this.floorplanIframe = page.locator("iframe[src*='/floorplan/']");
        // Content-nav CTAs displayed once the detail page loads.
        this.detailNavBar = page.locator(
            "nav[class*='ContentNavigation_content-nav'], nav[class*='ContentNavigation_actions-nav']",
        );
        this.requestTourCta = this.detailNavBar.getByRole("button", {
            name: "Request a Tour",
        });
        this.requestInfoCta = this.detailNavBar.getByRole("button", {
            name: "Request Information",
        });
        // Request Information modal + form (identical component to the QMI page).
        this.requestInformationModal = page
            .locator("[class*='request-information_modal']")
            .or(
                page.locator("[class*='Modal_modal']").filter({
                    hasText: /Request Information/i,
                }),
            )
            .first();
        this.requestInformationModalHeading = this.requestInformationModal
            .getByRole("heading", { name: /Request Information for/i })
            .first();
        this.requestInfoFirstName = this.requestInformationModal.locator(
            "input[name='FirstName']",
        );
        this.requestInfoLastName = this.requestInformationModal.locator(
            "input[name='LastName']",
        );
        this.requestInfoEmail = this.requestInformationModal.locator(
            "input[name='Email']",
        );
        this.requestInfoPhone = this.requestInformationModal.locator(
            "input[name='Phone']",
        );
        this.requestInfoContactMethod = this.requestInformationModal.locator(
            "select[name='PreferredContactMethod']",
        );
        this.requestInfoDisclaimerCheckbox = this.requestInformationModal.locator(
            "input[name='Disclaimer']",
        );
        this.requestInfoTextDisclaimerCheckbox =
            this.requestInformationModal.locator(
                "input[name='TextMessageDisclaimerCheckbox']",
            );
        this.requestInfoSubmitButton = this.requestInformationModal.locator(
            "button[type='submit']",
        );
        this.requestInfoFieldErrors = this.requestInformationModal.locator(
            "[class*='shared_error']",
        );
        this.requestInfoSuccessMessage = page
            .getByText(/Thank you for your message/i)
            .or(page.getByText(/Online Community Specialist will be in touch/i))
            .first();
    }

    // ── Navigation — Actions ───────────────────────────────
    static async openFloorplan(page: Page): Promise<PlanDetailPage> {
        const planPage = new PlanDetailPage(page);
        await planPage.navigateToFloorplan(constants.floorplan.detail_url);
        return planPage;
    }

    async navigateToFloorplan(detailUrl: string): Promise<void> {
        await this.navigate(this.resolveUrl(detailUrl));
        await this.page.waitForLoadState("domcontentloaded");
        await this.handlePagePopups();
    }

    // ── Overview — Verification ────────────────────────────
    async verifyPageLoaded(): Promise<void> {
        await Validator.requireVisible(
            this.pageHeading.first(),
            "Floorplan name heading should be visible",
            20000,
        );
        await Validator.requireVisible(
            this.startingPriceValue,
            "Starting price should be visible on the floorplan page",
            20000,
        );
    }

    // ── Starting Price — Verification ──────────────────────
    async verifyStartingPriceDisplayed(): Promise<void> {
        await Validator.requireVisible(
            this.startingPriceTitle,
            "'Starting price' label should be displayed",
            20000,
        );
        await Validator.requireVisible(
            this.startingPriceValue,
            "Starting price value should be displayed",
            20000,
        );
        await expect(
            this.startingPriceValue,
            "Starting price should show a dollar amount",
        ).toHaveText(/\$[\d,]+/);
    }

    // ── Media Gallery — Actions / Verification ─────────────
    async openGalleryModal(): Promise<void> {
        await this.handlePagePopups();
        await this.scrollIntoView(this.viewGalleryButton.first());
        await this.click(this.viewGalleryButton.first(), "View Gallery");

        if (!(await this.isVisible(this.galleryModal.first(), 3000))) {
            await this.handlePagePopups();
            await this.click(this.viewGalleryButton.first(), "View Gallery");
        }
    }

    async verifyGalleryModalIsDisplayed(): Promise<void> {
        await Validator.requireVisible(
            this.galleryModal.first(),
            "Media gallery modal should be displayed",
            20000,
        );
        await Validator.requireVisible(
            this.galleryImage.first(),
            "Gallery modal should show an image",
            20000,
        );
    }

    // The gallery is a scroll/carousel of images (no section nav). Confirm it is
    // navigable by collecting the distinct image sources exposed while scrolling
    // through the modal and asserting more than one image is reachable.
    async verifyGalleryNavigatesImages(): Promise<void> {
        const distinctSources = await this.getScrolledGalleryImageCount();
        expect(
            distinctSources,
            "Gallery should expose more than one image to navigate through",
        ).toBeGreaterThan(1);
    }

    // ── Pricing — Verification ─────────────────────────────
    async verifyMonthlyPaymentIsDisplayed(): Promise<void> {
        await this.scrollIntoView(this.monthlyPayment).catch(() => undefined);
        await Validator.requireVisible(
            this.monthlyPayment,
            "Estimated monthly payment should be displayed",
            20000,
        );
    }

    async getMonthlyPaymentText(): Promise<string> {
        return await this.getText(this.monthlyPayment);
    }

    // Opens the mortgage calculator the way the UI exposes it: navigate to the
    // Pricing section, hover the mortgage-info icon to reveal the "Mortgage
    // Calculator" CTA, click it, and confirm the calculator modal opens. Mirrors
    // the QMI page flow (qmiPage.openMortgageCalculator).
    async openMortgageCalculator(): Promise<void> {
        await this.page.waitForLoadState("domcontentloaded");

        const pricingTab = this.page
            .locator("a, button, [role='button']")
            .filter({ hasText: /^Pricing$/i })
            .first();

        if (await this.isVisible(pricingTab, 5000)) {
            await pricingTab.click();
            await this.page.waitForTimeout(1000);
        }

        await this.monthlyPayment.scrollIntoViewIfNeeded();
        await Validator.requireVisible(
            this.monthlyPayment,
            "Estimated monthly payment should be visible before opening mortgage calculator",
            20000,
        );

        await this.mortgageInfoTrigger.first().scrollIntoViewIfNeeded();
        await Validator.requireVisible(
            this.mortgageInfoTrigger.first(),
            "Mortgage information icon should be visible near estimated monthly payment",
            10000,
        );

        // The CTA only appears on hover, so hover the icon and pin the pointer to
        // its center before reaching for the CTA.
        const infoIcon = this.mortgageInfoTrigger.first();
        await infoIcon.hover({ force: true });

        const iconBox = await infoIcon.boundingBox();
        if (iconBox) {
            await this.page.mouse.move(
                iconBox.x + iconBox.width / 2,
                iconBox.y + iconBox.height / 2,
            );
        }

        const mortgageCalculatorCta = this.page
            .locator("button, a, [role='button']")
            .filter({ hasText: /Mortgage Calculator/i })
            .first();

        await Validator.requireVisible(
            mortgageCalculatorCta,
            "Mortgage Calculator CTA should appear after hovering the mortgage information icon",
            15000,
        );

        await this.click(mortgageCalculatorCta, "Mortgage Calculator CTA");
    }

    async verifyMortgageCalculatorIsDisplayed(): Promise<void> {
        const mortgageCalculatorModal = this.page
            .locator(
                "[role='dialog'], [class*='MortgageCalculator'], [class*='mortgage'], [class*='Calculator']",
            )
            .filter({
                hasText:
                    /Calculate your mortgage|Estimated Payment|15 Year Loan|30 Year Loan/i,
            })
            .first();

        await Validator.requireVisible(
            mortgageCalculatorModal,
            "Mortgage calculator modal should open after clicking the Mortgage Calculator CTA",
            15000,
        );
        await Validator.requireVisible(
            mortgageCalculatorModal.locator("text=/\\$[\\d,]+/").first(),
            "Mortgage calculator modal should display an estimated payment amount",
            10000,
        );
    }

    // ── Interactive Floor Plan (IFP) — Verification ─────────
    async verifyFloorplanIfpIsDisplayed(): Promise<void> {
        await this.scrollIntoView(this.floorplanIframe.first());
        await Validator.requireVisible(
            this.floorplanIframe.first(),
            "Interactive floor plan (IFP) iframe should be displayed",
            25000,
        );
    }

    // ── CTAs — Verification ────────────────────────────────
    async verifyCtasAreDisplayed(): Promise<void> {
        await this.page.waitForLoadState("load");
        await Validator.requireVisible(
            this.detailNavBar.first(),
            "Floorplan detail nav bar should be visible",
            20000,
        );
        await Validator.requireVisible(
            this.requestTourCta.first(),
            "'Request a Tour' CTA should be visible in the floorplan detail nav bar",
            20000,
        );
        await Validator.requireVisible(
            this.requestInfoCta.first(),
            "'Request Information' CTA should be visible in the floorplan detail nav bar",
            20000,
        );
    }

    // ── Request Information Form — Actions ─────────────────
    async openRequestInformationModal(): Promise<void> {
        await this.handlePagePopups();
        await this.scrollIntoView(this.requestInfoCta.first());
        await this.click(this.requestInfoCta.first(), "Request Information CTA");
    }

    async fillRequestInformationForm(
        data: RequestInformationFormData = DEFAULT_REQUEST_INFORMATION_DATA,
    ): Promise<void> {
        await this.type(this.requestInfoFirstName, data.firstName, "First Name");
        await this.type(this.requestInfoLastName, data.lastName, "Last Name");
        await this.type(this.requestInfoEmail, data.email, "Email Address");
        await this.type(this.requestInfoPhone, data.phone, "Mobile Number");

        if (data.preferredContactMethod) {
            await this.requestInfoContactMethod.selectOption(
                data.preferredContactMethod,
                { force: true },
            );
        }

        await this.checkRequestInfoBox(
            this.requestInfoDisclaimerCheckbox,
            "Terms & Conditions disclaimer",
        );
        await this.checkRequestInfoBox(
            this.requestInfoTextDisclaimerCheckbox,
            "Text message disclaimer",
        );
    }

    // Fills with valid data and submits, unless the target is production — we
    // never create real leads on prod. Captures the contact-us API response so
    // callers can assert on it; returns null when submission is skipped on prod.
    async submitRequestInformationForm(
        apiEndpoint: string,
        data: RequestInformationFormData = DEFAULT_REQUEST_INFORMATION_DATA,
    ): Promise<Response | null> {
        await this.fillRequestInformationForm(data);

        if (this.isProdEnv()) {
            console.warn(
                "Skipping Request Information form submission on prod to avoid " +
                "creating a real lead (form was filled but not submitted).",
            );
            return null;
        }

        await this.waitForTurnstileToken();

        const responsePromise = waitForApi(this.page, apiEndpoint, 30000);
        await this.click(
            this.requestInfoSubmitButton.first(),
            "Send Request (submit)",
        );
        return await responsePromise;
    }

    // The disclaimer checkboxes are visually-hidden react-aria inputs — a forced
    // click on the input doesn't flip the state, so toggle via focus + Space.
    private async checkRequestInfoBox(
        input: Locator,
        name: string,
    ): Promise<void> {
        if (await input.isChecked().catch(() => false)) {
            return;
        }

        await input.focus();
        await input.press("Space");
        await expect(input, `${name} checkbox should be checked`).toBeChecked({
            timeout: 5000,
        });
    }

    // The form is gated by a Cloudflare Turnstile widget that injects a token into
    // a hidden input once it resolves; submitting before it is present fails.
    private async waitForTurnstileToken(timeout = 15000): Promise<void> {
        const tokenInput = this.page.locator("input[name='cf-turnstile-response']");
        await expect
            .poll(
                async () => (await tokenInput.inputValue().catch(() => "")).length,
                {
                    message:
                        "Cloudflare Turnstile token should be populated before submit",
                    timeout,
                },
            )
            .toBeGreaterThan(0);
    }

    // ── Request Information Form — Verification ────────────
    async verifyRequestInformationModalIsDisplayed(): Promise<void> {
        await Validator.requireVisible(
            this.requestInformationModal,
            "Request Information modal should be displayed",
            20000,
        );
        await Validator.requireVisible(
            this.requestInformationModalHeading,
            "Request Information modal heading should be visible",
            20000,
        );
        await expect(this.requestInformationModalHeading).toContainText(
            /Request Information for/i,
        );
    }

    async verifyRequestInformationModalFields(): Promise<void> {
        const requiredFields = [
            { name: "First Name", locator: this.requestInfoFirstName },
            { name: "Last Name", locator: this.requestInfoLastName },
            { name: "Email Address", locator: this.requestInfoEmail },
            { name: "Mobile Number", locator: this.requestInfoPhone },
        ];

        for (const field of requiredFields) {
            await Validator.requireVisible(
                field.locator,
                `${field.name} field should be visible in Request Information modal`,
                10000,
            );
        }

        await Validator.requireVisible(
            this.requestInformationModal
                .getByText(/Preferred Method of Contact/i)
                .first(),
            "Preferred Method of Contact should be visible",
            10000,
        );
    }

    // Enters invalid values into the required fields and confirms the form blocks
    // submission with inline "Please correct the required field" errors. Never
    // creates a lead (client-side validation prevents the POST).
    // Submits the EMPTY form and confirms it is blocked with an inline required-
    // field error and no submission. Client-side only (no POST) — safe on every
    // environment.
    async verifyRequestInformationRequiredFieldValidation(): Promise<void> {
        await this.click(
            this.requestInfoSubmitButton.first(),
            "Send Request (submit empty form)",
        );
        await Validator.requireVisible(
            this.requestInfoFieldErrors
                .filter({ hasText: /complete the required field|Required field/i })
                .first(),
            "Empty submit should show a required-field error",
            10000,
        );
        await Validator.requireHidden(
            this.requestInfoSuccessMessage,
            "Success message should NOT appear when submitting an empty form",
            4000,
        );
    }

    async verifyRequestInformationInvalidValueValidation(): Promise<void> {
        const valid = DEFAULT_REQUEST_INFORMATION_DATA;
        const invalid = testData.request_information.invalid;
        await this.type(this.requestInfoFirstName, valid.firstName, "First Name");
        await this.type(this.requestInfoLastName, valid.lastName, "Last Name");
        await this.type(this.requestInfoEmail, invalid.email, "Email Address");
        await this.type(this.requestInfoPhone, invalid.phone, "Mobile Number");
        await this.requestInfoContactMethod.selectOption("Email", { force: true });
        await this.checkRequestInfoBox(
            this.requestInfoDisclaimerCheckbox,
            "Terms & Conditions disclaimer",
        );
        await this.checkRequestInfoBox(
            this.requestInfoTextDisclaimerCheckbox,
            "Text message disclaimer",
        );

        await this.click(
            this.requestInfoSubmitButton.first(),
            "Send Request (submit with invalid values)",
        );

        await expect(this.requestInfoEmail).toHaveAttribute(
            "aria-invalid",
            "true",
            { timeout: 10000 },
        );
        await expect(this.requestInfoPhone).toHaveAttribute(
            "aria-invalid",
            "true",
            { timeout: 10000 },
        );
        await Validator.requireVisible(
            this.requestInfoFieldErrors
                .filter({ hasText: /Please correct the required field/i })
                .first(),
            "Invalid required fields should show a 'Please correct the required field' error",
            10000,
        );

        await Validator.requireHidden(
            this.requestInfoSuccessMessage,
            "Success message should NOT appear when the form has invalid values",
            5000,
        );
    }

    async verifyRequestInformationSubmissionSuccess(): Promise<void> {
        await Validator.requireVisible(
            this.requestInfoSuccessMessage,
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
    // sent matches the data we entered.
    async verifyRequestInformationApiSubmission(
        response: Response,
        data: RequestInformationFormData = DEFAULT_REQUEST_INFORMATION_DATA,
    ): Promise<void> {
        expect(response.status(), "contact-us API should return HTTP 200").toBe(
            200,
        );

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
        expect(
            payload.Email,
            "Submitted Email should match the entered value",
        ).toBe(data.email);
        expect(
            payload.Phone,
            "Submitted Phone should match the entered value",
        ).toBe(data.phone);
        if (data.preferredContactMethod) {
            expect(
                payload.PreferredContactMethod,
                "Submitted Preferred Contact Method should match the selected value",
            ).toBe(data.preferredContactMethod);
        }
    }

    // ── Data Getters ───────────────────────────────────────
    async getHeading(): Promise<string> {
        return await this.getText(this.pageHeading.first());
    }

    async getStartingPriceText(): Promise<string> {
        return await this.getText(this.startingPriceValue);
    }

    // ── Helpers ────────────────────────────────────────────
    private resolveUrl(url: string): string {
        if (/^https?:\/\//i.test(url)) {
            return url;
        }

        return new URL(url, process.env.BASE_URL ?? "https://www.khov.com/").href;
    }

    // Production is the live www.khov.com domain (env subdomains are www-dev /
    // www-uat / www-stg). We treat TEST_ENV=prod or that domain as "prod".
    private isProdEnv(): boolean {
        const env = (process.env.TEST_ENV ?? "").toLowerCase();
        const baseUrl = process.env.BASE_URL ?? "";
        const isProdUrl = /^https?:\/\/(www\.)?khov\.com/i.test(baseUrl);
        return env === "prod" || isProdUrl;
    }

    // Scrolls through the gallery modal and counts the distinct, non-placeholder
    // image sources that become visible — used to prove the gallery is navigable.
    private async getScrolledGalleryImageCount(): Promise<number> {
        return this.galleryModal.first().evaluate(async (modal) => {
            const scrollContainer =
                Array.from(modal.querySelectorAll<HTMLElement>("*")).find((element) => {
                    const style = window.getComputedStyle(element);

                    return (
                        /(auto|scroll)/.test(style.overflowY) &&
                        element.scrollHeight > element.clientHeight
                    );
                }) ?? (modal as HTMLElement);

            const seenSources = new Set<string>();
            const collectVisibleSources = () => {
                Array.from(modal.querySelectorAll<HTMLImageElement>("img")).forEach(
                    (image) => {
                        const rect = image.getBoundingClientRect();
                        const style = window.getComputedStyle(image);
                        const source =
                            image.currentSrc ||
                            image.src ||
                            image.getAttribute("data-src") ||
                            "";

                        if (
                            source &&
                            !source.startsWith("data:") &&
                            rect.width > 0 &&
                            rect.height > 0 &&
                            style.display !== "none" &&
                            style.visibility !== "hidden"
                        ) {
                            seenSources.add(source);
                        }
                    },
                );
            };

            const wait = (ms: number) =>
                new Promise((resolve) => window.setTimeout(resolve, ms));
            const maxScrollTop = Math.max(
                scrollContainer.scrollHeight - scrollContainer.clientHeight,
                0,
            );
            const step = Math.max(
                Math.floor(scrollContainer.clientHeight * 0.8),
                300,
            );

            for (let position = 0; position <= maxScrollTop; position += step) {
                scrollContainer.scrollTop = position;
                await wait(250);
                collectVisibleSources();
            }

            scrollContainer.scrollTop = maxScrollTop;
            await wait(250);
            collectVisibleSources();

            return seenSources.size;
        });
    }
}
