import { Page, Locator } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import { reportValue } from "../utils/reporter";
import constants from "../utils/constants.json";
import { RequestInformationForm } from "./requestInformationForm";

/**
 * Shared "Calculate your mortgage" modal — a cohesive unit for the modal's
 * locators + interactions, so they live in one place rather than scattered across
 * `PlanDetailPage`. The page-specific flow for *revealing / opening* the modal
 * stays on `PlanDetailPage.openMortgageCalculator` (hovering the detail-page info
 * icon); everything that operates on the already-open modal lives here.
 *
 * `inputs` are the editable text fields in order:
 *   0 = Price · 1 = Down Payment % · 2 = Down Payment $ · 3 = Interest Rate.
 *
 * Exposed as `planPage.mortgageCalculator`; exercised by
 * tests/planDetailPage.spec.ts Pricing TC-02.
 */
export class MortgageCalculator {
  // "Mortgage Calculator" CTA that surfaces in the mortgage-info popover (the
  // page object clicks this as the last step of its reveal flow).
  readonly cta: Locator;
  // "Calculate your mortgage" modal heading + its dialog container.
  readonly heading: Locator;
  readonly modal: Locator;
  // Top "Estimated Payment" amount — first standalone "$…" value in the modal.
  readonly estimatedPayment: Locator;
  // Editable text inputs: 0=Price, 1=Down Payment %, 2=Down Payment $, 3=Interest.
  readonly inputs: Locator;
  readonly closeButton: Locator;

  constructor(private readonly page: Page) {
    this.cta = page.getByRole("button", { name: /Mortgage Calculator/i });
    this.heading = page.getByRole("heading", {
      name: /Calculate your mortgage/i,
    });
    this.modal = page
      .locator("[class*='Modal_dialog']")
      .filter({ hasText: "Calculate your mortgage" });
    this.estimatedPayment = this.modal.getByText(/^\$[\d,]+$/).first();
    this.inputs = this.modal.locator("input[type='text']");
    this.closeButton = page.locator(
      "[class*='Modal_dialog'] [class*='CircleIconButton']",
    );
  }

  // Assert the calculator modal opened. Called by the page object after it
  // reveals and clicks the CTA via its page-specific flow.
  async verifyOpen(): Promise<void> {
    await Validator.requireVisible(
      this.heading.first(),
      "Mortgage calculator modal should open",
      15000,
    );
  }

  // Set a text input by index (0=Price, 1=Down Payment %, 2=Down Payment $,
  // 3=Interest Rate); the Tab blur triggers recalculation.
  async setField(index: number, value: string, name: string): Promise<void> {
    const input = this.inputs.nth(index);
    await input.click();
    await input.fill(value);
    await input.press("Tab"); // blur → triggers recalculation
    await reportValue(`Set ${name} = ${value}`);
  }

  // Select the 15- or 30-year loan term.
  async selectLoanTerm(years: "15" | "30"): Promise<void> {
    await this.modal.getByText(`${years} Year Loan`).first().click();
    console.log(`Clicked on: ${years} Year Loan`);
  }

  // Close the modal via its (X) control and confirm it is hidden.
  async close(): Promise<void> {
    await this.closeButton.first().click();
    console.log("Clicked on: Close mortgage calculator");
    await Validator.requireHidden(
      this.heading.first(),
      "Mortgage calculator should close",
      10000,
    );
  }

  // Parse the modal's top "Estimated Payment" amount to a number.
  async getEstimatedPayment(): Promise<number> {
    const text = (await this.estimatedPayment.innerText()).trim();
    return Number(text.replace(/[^0-9.]/g, ""));
  }

  // Read a text input's current numeric value (strips $/commas).
  async getFieldValue(index: number): Promise<number> {
    const raw = (await this.inputs.nth(index).inputValue()).trim();
    return Number(raw.replace(/[^0-9.]/g, ""));
  }

  // Assert a positive estimated payment is shown and every input is pre-populated.
  async verifyFieldsHaveData(): Promise<void> {
    await Validator.requireVisible(
      this.estimatedPayment,
      "Calculator estimated payment should be shown at the top",
      10000,
    );
    const payment = await this.getEstimatedPayment();
    await Validator.requireTrue(
      payment > 0,
      "Estimated payment should be a positive amount",
    );
    const fieldCount = await this.inputs.count();
    for (let i = 0; i < fieldCount; i++) {
      const value = (await this.inputs.nth(i).inputValue()).trim();
      await Validator.requireNotEmpty(
        value,
        `Calculator field ${i + 1} should have a value (got "${value}")`,
      );
    }
    await reportValue(
      `Calculator estimated payment $${payment}; ${fieldCount} fields populated`,
    );
  }

  // Capture the estimated payment, run an edit, then assert it recalculated to a
  // new valid amount in the expected direction (after focus change).
  async verifyPaymentRecalculates(
    label: string,
    edit: () => Promise<void>,
    direction: "up" | "down",
  ): Promise<void> {
    const before = await this.getEstimatedPayment();
    await edit();
    let after = before;
    for (let i = 0; i < 20 && after === before; i++) {
      await this.page.waitForTimeout(400);
      after = await this.getEstimatedPayment();
    }
    await reportValue(`${label}: $${before} → $${after}`);
    await Validator.requireTrue(
      after > 0 && after !== before,
      `${label}: estimated payment should recalculate (was $${before}, now $${after})`,
    );
    await Validator.requireTrue(
      direction === "up" ? after > before : after < before,
      `${label}: estimated payment should move ${direction} ($${before} → $${after})`,
    );
  }
}

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
 * The mortgage calculator's modal interactions live in the `MortgageCalculator`
 * unit (above), exposed as `planPage.mortgageCalculator`; this page object only
 * owns the page-specific flow that reveals/opens that modal.
 *
 * Consumers (where the public methods are exercised):
 *   - tests/planDetailPage.spec.ts — Overview (TC-01–03), Media gallery
 *     (TC-01–02), Pricing (TC-01–03).
 *   - tests/contactForms.spec.ts — Request Information form on the floorplan page.
 */
export class PlanDetailPage extends BasePage {
  readonly pageHeading: Locator;
  readonly startingPriceBlock: Locator;
  readonly startingPriceTitle: Locator;
  readonly startingPriceValue: Locator;
  readonly monthlyPayment: Locator;
  readonly mortgageInfoTrigger: Locator;
  readonly mortgageCalculator: MortgageCalculator;
  readonly viewGalleryButton: Locator;
  readonly galleryModal: Locator;
  readonly galleryImage: Locator;
  readonly floorplanIframe: Locator;
  readonly detailNavBar: Locator;
  readonly requestTourCta: Locator;
  readonly requestTourModal: Locator;
  readonly requestInfoCta: Locator;
  readonly requestInfo: RequestInformationForm;

  // Builds all element locators for the floorplan detail page. Called once per
  // page object construction (via `openFloorplan`). Notable scoping: the starting
  // price lives in an InfoBlockAlt column; `monthlyPayment` is the "$…/mo." text;
  // `floorplanIframe` is scoped to the `/floorplan/` iframe; the `calculator*`
  // locators are scoped to the shared "Calculate your mortgage" modal (same
  // component as communityPage), with `calculatorInputs` in order 0=Price,
  // 1=Down Payment %, 2=Down Payment $, 3=Interest Rate.
  constructor(page: Page) {
    super(page);
    this.pageHeading = page.locator("h1");
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
    // Monthly payment shares the `floor-plan-info_payment-value` class with the
    // starting price, so scope by that class AND the "/mo" suffix (rather than a
    // page-wide $-text match) to avoid binding to any other dollar value.
    this.monthlyPayment = page
      .locator("[class*='floor-plan-info_payment-value']")
      .filter({ hasText: /\$[\d,]+\/mo/i })
      .first();
    this.mortgageInfoTrigger = page
      .getByRole("heading", { name: /Monthly payment as low as/i })
      .locator("xpath=following::button[1]")
      .or(
        page.getByRole("button", {
          name: /Mortgage calculation information|Info icon/i,
        }),
      );
    this.mortgageCalculator = new MortgageCalculator(page);
    this.viewGalleryButton = page
      .getByRole("button", { name: /View Gallery/i })
      .or(page.locator("button").filter({ hasText: /View Gallery/i }));
    this.galleryModal = page
      .locator("[class*='Modal_overlay']")
      .or(page.getByRole("dialog"));
    this.galleryImage = this.galleryModal.locator("img, picture");
    this.floorplanIframe = page.locator("iframe[src*='/floorplan/']");
    this.detailNavBar = page.locator(
      "nav[class*='ContentNavigation_content-nav'], nav[class*='ContentNavigation_actions-nav']",
    );
    this.requestTourCta = this.detailNavBar.getByRole("button", {
      name: "Request a Tour",
    });
    // "Request a Tour" opens a scheduling modal (role=dialog) headed "Select a
    // date and time for a tour"; keyed on that tour-specific text with a
    // class-based fallback.
    this.requestTourModal = page
      .getByRole("dialog")
      .filter({ hasText: /Select a date and time for a tour/i })
      .or(page.locator("[class*='request-a-tour_modal']"));
    this.requestInfoCta = this.detailNavBar.getByRole("button", {
      name: "Request Information",
    });
    this.requestInfo = new RequestInformationForm(page);
  }

  // ── Navigation — Actions ───────────────────────────────
  // Factory: construct the page object and navigate to the pinned floorplan.
  // Used by: the `beforeEach` in tests/planDetailPage.spec.ts and
  // tests/contactForms.spec.ts.
  static async openFloorplan(page: Page): Promise<PlanDetailPage> {
    const planPage = new PlanDetailPage(page);
    await planPage.navigateToFloorplan(constants.floorplan.detail_url);
    return planPage;
  }

  // Navigate to the given floorplan detail URL and dismiss any popups.
  // Internal helper for `openFloorplan`.
  private async navigateToFloorplan(detailUrl: string): Promise<void> {
    await this.navigate(this.resolveUrl(detailUrl));
    await this.page.waitForLoadState("domcontentloaded");
    await this.handlePagePopups();
  }

  // ── Overview — Verification ────────────────────────────
  // Assert the floorplan loaded: name heading is visible and the "Starting price"
  // label + value are displayed with a dollar amount (the starting-price checks
  // live here so the Pricing section doesn't reload the page just to re-verify
  // the same value). Used by: tests/planDetailPage.spec.ts Overview TC-01.
  async verifyPageLoaded(): Promise<void> {
    await Validator.requireVisible(
      this.pageHeading.first(),
      "Floorplan name heading should be visible",
      20000,
    );
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
    const priceText = (await this.getText(this.startingPriceValue)).trim();
    await Validator.requireTrue(
      /\$[\d,]+/.test(priceText),
      `Starting price should show a dollar amount (got "${priceText}")`,
    );
    await reportValue(
      "Floorplan detail page loaded (heading + starting price verified)",
    );
  }

  // ── Media Gallery — Actions ────────────────────────────
  // Open the plain media gallery modal via "View Gallery". Retries up to 3 times
  // (re-dismissing popups between attempts) because the modal open is lazy and
  // can be slow under full-suite load. Used by: tests/planDetailPage.spec.ts
  // Media gallery (`beforeEach`).
  async openGalleryModal(): Promise<void> {
    await this.handlePagePopups();
    await this.scrollIntoView(this.viewGalleryButton.first());

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (await this.isVisible(this.viewGalleryButton.first(), 5000)) {
        await this.click(this.viewGalleryButton.first(), "View Gallery");
      }
      if (await this.isVisible(this.galleryModal.first(), 5000)) return;
      await this.handlePagePopups();
    }

    // All attempts exhausted — assert so the failure names the real cause
    // ("modal never opened") instead of a misleading downstream error.
    await Validator.requireVisible(
      this.galleryModal.first(),
      "Media gallery modal should open after clicking View Gallery",
      5000,
    );
  }

  // ── Media Gallery — Verification ───────────────────────
  // Assert the gallery modal and at least one image are visible.
  // Used by: tests/planDetailPage.spec.ts Media gallery TC-01.
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
    await reportValue("Gallery modal is displayed with an image");
  }

  // Assert the gallery is navigable: scroll through the modal and confirm more
  // than one distinct image source is reachable (this gallery is a scroll/
  // carousel with no section nav). Used by: tests/planDetailPage.spec.ts Media
  // gallery TC-02.
  async verifyGalleryNavigatesImages(): Promise<void> {
    const distinctSources = await this.getScrolledGalleryImageCount();
    await Validator.requireTrue(
      distinctSources >= 3,
      `Gallery should expose multiple images to navigate through (saw ${distinctSources}, expected >= 3)`,
    );
    await reportValue(`Gallery navigable: ${distinctSources} distinct images`);
  }

  // ── Mortgage Calculator — Actions ──────────────────────
  // Open the shared "Calculate your mortgage" modal from the pricing card:
  // navigate to the Pricing section, scroll the monthly-payment + info icon into
  // view, reveal the "Mortgage Calculator" CTA from the hover/tap popover
  // (retried, as it is lazy and flaky headed), click it, and confirm the
  // calculator modal opens. Used by: tests/planDetailPage.spec.ts Pricing TC-02.
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

    const infoIcon = this.mortgageInfoTrigger.first();

    let ctaVisible = false;
    for (let attempt = 0; attempt < 4 && !ctaVisible; attempt++) {
      await infoIcon.scrollIntoViewIfNeeded().catch(() => {});
      await infoIcon.hover({ force: true }).catch(() => {});
      const iconBox = await infoIcon.boundingBox();
      if (iconBox) {
        await this.page.mouse
          .move(iconBox.x + iconBox.width / 2, iconBox.y + iconBox.height / 2)
          .catch(() => {});
      }
      ctaVisible = await this.mortgageCalculator.cta
        .first()
        .isVisible()
        .catch(() => false);
      if (!ctaVisible) {
        await infoIcon.click({ force: true }).catch(() => {});
        ctaVisible = await this.mortgageCalculator.cta
          .first()
          .isVisible()
          .catch(() => false);
      }
      if (!ctaVisible) await this.page.waitForTimeout(700);
    }

    await Validator.requireVisible(
      this.mortgageCalculator.cta.first(),
      "Mortgage Calculator CTA should appear after opening the mortgage information popover",
      15000,
    );

    await this.click(this.mortgageCalculator.cta.first(), "Mortgage Calculator");

    await this.mortgageCalculator.verifyOpen();
  }

  // ── Mortgage Calculator — Verification ─────────────────
  // Assert the estimated monthly payment is displayed on the pricing card.
  // Used by: tests/planDetailPage.spec.ts Pricing TC-01.
  async verifyMonthlyPaymentIsDisplayed(): Promise<void> {
    await this.scrollIntoView(this.monthlyPayment);
    await Validator.requireVisible(
      this.monthlyPayment,
      "Estimated monthly payment should be displayed",
      20000,
    );
    await reportValue(
      `Estimated monthly payment: ${(await this.getMonthlyPaymentText()).trim()}`,
    );
  }

  // ── Interactive Floor Plan (IFP) — Verification ─────────
  // Scroll the embedded floor-plan iframe into view and assert it is displayed.
  // Used by: tests/planDetailPage.spec.ts Overview TC-03.
  async verifyFloorplanIfpIsDisplayed(): Promise<void> {
    await this.scrollIntoView(this.floorplanIframe.first());
    await Validator.requireVisible(
      this.floorplanIframe.first(),
      "Interactive floor plan (IFP) iframe should be displayed",
      25000,
    );
    await reportValue(
      `IFP iframe src: ${await this.floorplanIframe.first().getAttribute("src")}`,
    );
  }

  // ── CTAs — Verification ────────────────────────────────
  // Assert the floorplan detail nav bar and its "Request a Tour" / "Request
  // Information" CTAs are visible. Used by: tests/planDetailPage.spec.ts Overview
  // TC-02 and tests/contactForms.spec.ts.
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
    await reportValue(
      "Floorplan CTAs visible: Request a Tour, Request Information",
    );
  }

  // ── Request Information Form — Actions ─────────────────
  // Open the "Request Information" modal from the floorplan detail nav CTA.
  // Retries the atomic pointer press until the modal mounts (a plain click
  // intermittently fails to fire the react-aria press under slowMo); never
  // re-presses once the modal is up. Used by: tests/contactForms.spec.ts.
  async openRequestInformationModal(): Promise<void> {
    await this.handlePagePopups();
    await this.scrollIntoView(this.requestInfoCta.first());
    const cta = this.requestInfoCta.first();
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.pressAtomically(cta);
      console.log(`Clicked on: Request Information CTA — attempt ${attempt}`);
      if (await this.isVisible(this.requestInfo.modal, 8000)) break;
    }
  }

  // ── Request a Tour — Actions & Verification ────────────
  // Open the "Request a Tour" scheduling modal from the floorplan detail nav CTA.
  // The CTA is a react-aria pressable (like Request Information), so retry the
  // atomic pointer press until the modal mounts. Used by:
  // tests/planDetailPage.spec.ts Overview TC-02.
  async openRequestTourModal(): Promise<void> {
    await this.handlePagePopups();
    await this.scrollIntoView(this.requestTourCta.first());
    const cta = this.requestTourCta.first();
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.pressAtomically(cta);
      console.log(`Clicked on: Request a Tour CTA — attempt ${attempt}`);
      if (await this.isVisible(this.requestTourModal.first(), 8000)) break;
    }
  }

  // Assert the "Request a Tour" scheduling modal is displayed.
  // Used by: tests/planDetailPage.spec.ts Overview TC-02.
  async verifyRequestTourModalIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.requestTourModal.first(),
      "'Request a Tour' scheduling modal should be displayed",
      20000,
    );
    await reportValue("'Request a Tour' scheduling modal is displayed");
  }

  // ── Data Getters ───────────────────────────────────────
  // Return the floorplan name heading (h1) text. Used by:
  // tests/planDetailPage.spec.ts Overview TC-01.
  async getHeading(): Promise<string> {
    return await this.getText(this.pageHeading.first());
  }

  // Return the starting price value text. Used by:
  // tests/planDetailPage.spec.ts Overview TC-01.
  async getStartingPriceText(): Promise<string> {
    return await this.getText(this.startingPriceValue);
  }

  // Return just the estimated monthly payment amount (e.g. "$2,225/mo"), stripping
  // the adjacent "Info icon" label carried in the element text. Used by:
  // tests/planDetailPage.spec.ts Pricing TC-01 (and internally).
  async getMonthlyPaymentText(): Promise<string> {
    const text = await this.getText(this.monthlyPayment);
    return text.match(/\$[\d,]+\/mo\.?/i)?.[0] ?? text.trim();
  }

  // ── Internal helpers ───────────────────────────────────
  // Scroll through the gallery modal and count the distinct, non-placeholder
  // image sources that become visible — used to prove the gallery is navigable.
  // Internal helper for `verifyGalleryNavigatesImages`.
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
      const step = Math.max(Math.floor(scrollContainer.clientHeight * 0.8), 300);

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
