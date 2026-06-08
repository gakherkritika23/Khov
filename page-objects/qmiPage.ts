import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import { escapeRegExp, normalizeText } from "../utils/stringUtils";

export interface QmiCardData {
  heading?: string;
  address?: string;
  keyFacts?: string;
  pricing?: string;
  availability?: string;
  promo?: string;
  href?: string;
  rawText: string;
}

/**
 * Quick Move-In (QMI) details page — E4 in docs/test-plan.md.
 *
 * Pinned (via the spec) to a feature-rich, deterministic QMI home at River Ranch
 * Trails so the conditional checks are stable; if that pinned home is no longer
 * listed it falls back to a random available QMI home (see `navigateToQmi` /
 * `resolveQmiTarget`). The page composes a hero gallery ("hero gallery 2.0" →
 * `GalleryTwoModal`), a key-facts detail header, a pricing card with an estimated
 * monthly payment + mortgage-calculator popover, an interactive floor plan (IFP)
 * iframe, and the site-wide CTAs.
 */
export class QmiPage extends BasePage {
  readonly quickMoveInNavTab: Locator;
  readonly qmiSectionHeading: Locator;
  private selectedCardData?: QmiCardData;
  readonly pageHeading: Locator;
  readonly detailHeader: Locator;
  readonly keyFacts: Locator;
  readonly availability: Locator;
  readonly viewGalleryButton: Locator;
  readonly galleryModal: Locator;
  readonly gallerySectionButtons: Locator;
  readonly galleryImage: Locator;
  readonly monthlyPayment: Locator;
  readonly mortgageInfoTrigger: Locator;
  readonly mortgagePopover: Locator;
  readonly floorplanIframe: Locator;
  readonly qmiDetailNavBar: Locator;
  readonly requestTourCta: Locator;
  readonly requestInfoCta: Locator;
  readonly requestInformationModal: Locator;
  readonly requestInformationModalHeading: Locator;

  constructor(page: Page) {
    super(page);
    // Community-page entry points used to reach the QMI detail page.
    this.quickMoveInNavTab = page.getByRole("link", {
      name: /Quick Move-in|Move-In Homes/i,
    });
    this.qmiSectionHeading = page.getByRole("heading", {
      name: /Quick Move-in Homes Available/i,
    });
    // Header / key facts. h1 is the floorplan name ("Passionflower II"); the
    // DetailHeader container carries the address, sq ft, beds, baths and the
    // "Available Now" availability tag.
    this.pageHeading = page.locator("h1");
    this.detailHeader = page.locator("[class*='DetailHeader_container']");
    // The amenities row holds the at-a-glance facts: "… Sq ft … Beds … Baths …".
    this.keyFacts = page.locator("[class*='DetailHeader_amenities']");
    this.availability = page.getByText(
      /Available (Now|January|February|March|April|May|June|July|August|September|October|November|December)/i,
    );
    // Media gallery. "View Gallery (n)" opens the hero-gallery-2.0 modal whose
    // section buttons (e.g. "Unfurnished Interior", "Home Exterior") jump
    // between image groups.
    this.viewGalleryButton = page.getByRole("button", {
      name: /View Gallery/i,
    });
    this.galleryModal = page
      .locator("[class*='Modal_overlay']")
      .or(page.getByRole("dialog"));
    this.gallerySectionButtons = page.locator("[class*='GalleryTwoModal_btn']");
    this.galleryImage = this.galleryModal.locator("img, picture");
    // Pricing. Two `Card_price` nodes exist (monthly payment + total price);
    // scope the monthly one by its "/mo." suffix. The mortgage-info trigger
    // opens a popover headed "Mortgage Calculator".
    this.monthlyPayment = page
      .locator("[class*='Card_price']")
      .filter({ hasText: /\/mo\./i })
      .or(page.getByText(/\$[\d,]+\/mo\./i));
    this.mortgageInfoTrigger = page
      .getByRole("heading", { name: /Monthly payment as low as/i })
      .locator("xpath=following::button[1]")
      .or(
        page.getByRole("button", {
          name: /Mortgage calculation information|Info icon/i,
        }),
      );
    this.mortgagePopover = page
      .locator("[class*='Popover_popover']")
      .or(page.getByText(/Mortgage Calculator|Principal and Interest|APR/i));
    // Interactive Floor Plan — embedded ml3ds-cloud iframe (the lot-detail map
    // is a separate iframe, so scope by the `/floorplan/` path).
    this.floorplanIframe = page.locator("iframe[src*='/floorplan/']");
    // QMI detail content nav CTAs. These are the nav-bar actions displayed after
    // the detail page loads, distinct from duplicate CTAs elsewhere on the page.
    this.qmiDetailNavBar = page.locator(
      "nav[class*='ContentNavigation_content-nav'], nav[class*='ContentNavigation_actions-nav']",
    );
    this.requestTourCta = this.qmiDetailNavBar.getByRole("button", {
      name: "Request a Tour",
    });
    this.requestInfoCta = this.qmiDetailNavBar.getByRole("button", {
      name: "Request Information",
    });
    this.requestInformationModal = page
      .locator("[class*='request-information_modal']")
      .or(page.locator("[class*='Modal_modal']").filter({
        hasText: /Request Information/i,
      }))
      .first();
    this.requestInformationModalHeading = this.requestInformationModal
      .getByRole("heading", {
        name: /Request Information for/i,
      })
      .first();
  }

  // ── Navigation — Actions ───────────────────────────────
  // Pinned-with-fallback navigation. We prefer a specific, feature-rich QMI home
  // (Passionflower II at River Ranch Trails — `constants.qmi.detail_url`) so the
  // gallery / pricing / IFP / CTA checks are deterministic. If that home is no
  // longer listed (sold/retired), we fall back to a random available QMI home so
  // the suite keeps running instead of 404-ing — see `resolveQmiTarget`.
  async navigateToQmi(
    communityUrl: string,
    preferredDetailUrl: string,
  ): Promise<void> {
    await this.navigateToCommunity(communityUrl);
    await this.openQuickMoveInTabFromNavBar();

    const detailUrl = await this.resolveQmiTarget(preferredDetailUrl);
    this.selectedCardData = await this.getQmiCardData(detailUrl);
    await this.openQmiCard(detailUrl);
    await this.page.waitForLoadState("domcontentloaded");
    await this.handlePagePopups();
    await this.verifyCardDataMatchesDetailPage(this.selectedCardData);
  }

  // Prefer the pinned home for determinism; if it is not present in the QMI
  // section, fall back to a random available home. A fallback home may lack some
  // conditional features (gallery / monthly payment / IFP), so feature-specific
  // tests can legitimately fail after a fallback — the warning below flags that
  // the pin needs updating in `constants.qmi.detail_url`.
  private async resolveQmiTarget(preferredDetailUrl: string): Promise<string> {
    const hrefs = await this.getQmiHrefs();

    if (hrefs.length === 0) {
      throw new Error("No QMI homes found in the Quick Move-In section.");
    }

    const preferredSlug = this.getLastPathSegment(preferredDetailUrl);
    const pinned = hrefs.find(
      (href) => this.getLastPathSegment(href) === preferredSlug,
    );

    if (pinned) {
      return pinned;
    }

    const fallback = hrefs[Math.floor(Math.random() * hrefs.length)];
    console.warn(
      `Pinned QMI home "${preferredSlug}" not found in the QMI section; ` +
      `falling back to random home "${this.getLastPathSegment(fallback)}". ` +
      `Update constants.qmi.detail_url to re-pin.`,
    );

    return fallback;
  }

  async navigateToCommunity(url: string): Promise<void> {
    await this.navigate(this.resolveUrl(url));
    await this.page.waitForLoadState("domcontentloaded");
    await this.handlePagePopups();
  }

  async openQuickMoveInTabFromNavBar(): Promise<void> {
    await this.click(this.quickMoveInNavTab.first(), "Quick Move-In nav tab");
    await Validator.requireVisible(
      this.qmiSectionHeading.first(),
      "'Quick Move-in Homes Available' section should be visible after nav click",
      25000,
    );
  }

  // Enumerate the QMI homes listed in the community's Quick Move-In section.
  // Polls briefly because the cards hydrate client-side after the section loads.
  private async getQmiHrefs(): Promise<string[]> {
    const deadline = Date.now() + 25000;

    while (Date.now() < deadline) {
      const hrefs = await this.qmiSectionLinks().evaluateAll((links) =>
        links
          .map((link) => link.getAttribute("href"))
          .filter((href): href is string => Boolean(href)),
      );
      const uniqueHrefs = [...new Set(hrefs)];

      if (uniqueHrefs.length > 0) {
        return uniqueHrefs;
      }

      await this.page.waitForTimeout(500);
    }

    return [];
  }

  // ── Navigation — Verification ──────────────────────────
  async verifyQmiDetailPageDisplayed(detailUrlPattern?: string): Promise<void> {
    const expectedPattern =
      detailUrlPattern ??
      escapeRegExp(this.toPath(this.selectedCardData?.href ?? ""));

    await Validator.requireUrlContains(
      this.page,
      expectedPattern,
      "Should be on the QMI home detail page URL",
      20000,
    );
    await Validator.requireVisible(
      this.pageHeading.first(),
      "QMI home heading should be visible",
      20000,
    );
  }

  async verifyCardDataMatchesDetailPage(cardData: QmiCardData): Promise<void> {
    if (cardData.href) {
      const detailPath = this.toPath(cardData.href);
      await Validator.requireUrlContains(
        this.page,
        escapeRegExp(detailPath),
        "QMI details page URL should match the clicked QMI card",
        20000,
      );
    }

    if (cardData.heading) {
      await Validator.requireVisible(
        this.pageHeading.first(),
        "QMI detail heading should be visible before card-data validation",
        20000,
      );
      expect(cardData.rawText).toContain(await this.getHeading());
    }

    if (cardData.availability) {
      await expect(this.detailHeader.first()).toContainText(
        cardData.availability,
        { timeout: 20000 },
      );
    }

    const detailHeaderText = normalizeText(
      await this.getText(this.detailHeader.first()),
    );
    for (const fact of this.extractComparableFacts(cardData.keyFacts ?? "")) {
      expect(detailHeaderText).toContain(normalizeText(fact));
    }

    const currentPrice = this.extractCurrentPrice(cardData.pricing ?? "");
    if (currentPrice) {
      await expect(this.page.locator("body")).toContainText(currentPrice, {
        timeout: 20000,
      });
    }
  }

  // ── Header / Key Facts — Verification (QD-01) ──────────
  async verifyHeaderIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.pageHeading.first(),
      "QMI floorplan heading should be visible",
      20000,
    );
    await Validator.requireVisible(
      this.detailHeader.first(),
      "QMI detail header (address / key facts) should be visible",
      20000,
    );
  }

  async verifyKeyFactsAreDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.keyFacts.first(),
      "Key facts (beds / baths / sq ft) should be visible",
      20000,
    );
  }

  // ── Availability — Verification (QD-06) ────────────────
  async verifyAvailabilityIsDisplayed(): Promise<void> {
    if (this.selectedCardData?.availability) {
      await expect(this.page.locator("body")).toContainText(
        this.selectedCardData.availability,
        { timeout: 20000 },
      );
      return;
    }

    await Validator.requireVisible(
      this.availability.first(),
      "Availability should be visible",
      20000,
    );
  }

  // ── Media Gallery — Actions (QD-02 / QD-03) ────────────
  async openGalleryModal(): Promise<void> {
    await this.scrollIntoView(this.viewGalleryButton.first());
    await this.click(this.viewGalleryButton.first(), "View Gallery");
    if (!(await this.isVisible(this.galleryModal.first(), 3000))) {
      await this.handlePagePopups();
      await this.click(this.viewGalleryButton.first(), "View Gallery");
    }
  }

  async jumpToGallerySection(index = 1): Promise<void> {
    // Section nav (hero gallery 2.0) — jump to another image group.
    if (!(await this.isVisible(this.gallerySectionButtons.nth(index), 5000))) {
      return;
    }

    await this.click(
      this.gallerySectionButtons.nth(index),
      "gallery section nav button",
    );
  }

  async closeGalleryModal(): Promise<void> {
    await this.page.keyboard.press("Escape");
  }

  // ── Media Gallery — Verification (QD-02 / QD-03) ───────
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

  async verifyGallerySectionNavIsDisplayed(): Promise<void> {
    if (!(await this.isVisible(this.gallerySectionButtons.first(), 5000))) {
      await this.verifyGalleryModalIsDisplayed();
      return;
    }

    await Validator.requireVisible(
      this.gallerySectionButtons.first(),
      "Hero gallery 2.0 section navigation should be displayed",
      20000,
    );
  }

  // ── Pricing — Actions (QD-04) ──────────────────────────
  async openMortgageCalculator(): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded");

    // Step 1: Go to Pricing section first
    const pricingTab = this.page
      .locator("a, button, [role='button']")
      .filter({ hasText: /^Pricing$/i })
      .first();

    if (await this.isVisible(pricingTab, 5000)) {
      await pricingTab.click();
      await this.page.waitForTimeout(1000);
    }

    // Step 2: Scroll monthly payment section into center of viewport
    await this.monthlyPayment.first().scrollIntoViewIfNeeded();

    await this.page.evaluate(() => {
      window.scrollBy(0, -180);
    });

    await Validator.requireVisible(
      this.monthlyPayment.first(),
      "Estimated monthly payment should be visible before opening mortgage calculator",
      20000,
    );

    // Step 3: Scroll and validate info icon near monthly payment
    await this.mortgageInfoTrigger.first().scrollIntoViewIfNeeded();

    await this.page.evaluate(() => {
      window.scrollBy(0, -120);
    });

    await Validator.requireVisible(
      this.mortgageInfoTrigger.first(),
      "Mortgage information icon should be visible near estimated monthly payment",
      10000,
    );

    // Step 4: Hover on info icon because Mortgage Calculator CTA appears only on hover
    const infoIcon = this.mortgageInfoTrigger.first();

    await infoIcon.hover({ force: true });

    const iconBox = await infoIcon.boundingBox();

    if (iconBox) {
      await this.page.mouse.move(
        iconBox.x + iconBox.width / 2,
        iconBox.y + iconBox.height / 2,
      );
    }

    // Step 5: Validate hover popover/CTA appears
    const mortgageCalculatorCta = this.page
      .locator("button, a, [role='button']")
      .filter({
        hasText: /Mortgage Calculator/i,
      })
      .first();

    await Validator.requireVisible(
      mortgageCalculatorCta,
      "Mortgage Calculator CTA should be displayed after hovering mortgage information icon",
      15000,
    );

    // Step 6: Click Mortgage Calculator CTA
    await this.click(
      mortgageCalculatorCta,
      "Mortgage Calculator CTA",
    );

    // Step 7: Validate mortgage calculator modal opens
    const mortgageCalculatorModal = this.page
      .locator(
        "[role='dialog'], [class*='MortgageCalculator'], [class*='mortgage'], [class*='Calculator']",
      )
      .filter({
        hasText: /Calculate your mortgage|Estimated Payment|15 Year Loan|30 Year Loan/i,
      })
      .first();

    await Validator.requireVisible(
      mortgageCalculatorModal,
      "Mortgage calculator modal should open after clicking Mortgage Calculator CTA",
      15000,
    );
  }

  // ── Pricing — Verification (QD-04) ─────────────────────
  async verifyMonthlyPaymentIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.monthlyPayment.first(),
      "Estimated monthly payment should be displayed",
      20000,
    );
  }

  // ── Pricing — Verification (QD-04) ─────────────────────
  async verifyMortgageCalculatorValuesUpdate(): Promise<void> {
    const mortgageCalculatorModal = this.page
      .locator("[role='dialog'], [class*='MortgageCalculator'], [class*='mortgage'], [class*='Calculator']")
      .filter({
        hasText: /Calculate your mortgage|Estimated Payment|15 Year Loan|30 Year Loan/i,
      })
      .first();

    await Validator.requireVisible(
      mortgageCalculatorModal,
      "Mortgage calculator modal should be displayed before updating values",
      15000,
    );

    const estimatedPayment = mortgageCalculatorModal
      .locator("text=/\\$[\\d,]+/")
      .first();

    await Validator.requireVisible(
      estimatedPayment,
      "Estimated payment should be displayed at the top of mortgage calculator modal",
      10000,
    );

    const initialEstimatedPayment = normalizeText(
      await this.getText(estimatedPayment),
    );

    // Validate Price field is displayed
    const priceField = mortgageCalculatorModal
      .locator("label", { hasText: /^Price$/i })
      .locator("..")
      .locator("input")
      .first()
      .or(
        mortgageCalculatorModal.locator(
          "input[name*='price' i], input[id*='price' i], input[placeholder*='price' i]",
        ).first(),
      );

    await Validator.requireVisible(
      priceField,
      "Price field should be displayed in mortgage calculator modal",
      10000,
    );

    // Change Price value
    await priceField.click();
    await priceField.press(
      process.platform === "darwin" ? "Meta+A" : "Control+A",
    );
    await priceField.fill("450000");
    await priceField.blur();

    // Validate top estimated payment changes after price update
    await expect
      .poll(
        async () => normalizeText(await this.getText(estimatedPayment)),
        {
          message:
            "Estimated payment should update after changing Price value",
          timeout: 10000,
        },
      )
      .not.toBe(initialEstimatedPayment);

    const paymentAfterPriceChange = normalizeText(
      await this.getText(estimatedPayment),
    );

    expect(paymentAfterPriceChange).toMatch(/\$[\d,]+/);

    // Loan term selector is a radiogroup of <label> options (each wrapping a
    // visually-hidden radio input + a span label) — NOT buttons. The modal
    // defaults to "30 Year Loan" (data-selected="30"), so we switch to whichever
    // term is *not* currently selected first to guarantee the payment changes.
    const loanTermGroup = mortgageCalculatorModal.locator(
      "[data-testid='loan-term']",
    );

    await Validator.requireVisible(
      loanTermGroup,
      "Loan term selector should be displayed in mortgage calculator modal",
      10000,
    );

    const fifteenYearLoanTab = loanTermGroup.locator("label", {
      hasText: /15 Year Loan/i,
    });
    const thirtyYearLoanTab = loanTermGroup.locator("label", {
      hasText: /30 Year Loan/i,
    });

    const initiallySelected = await loanTermGroup.getAttribute("data-selected");
    const [firstTab, secondTab] =
      initiallySelected === "30"
        ? [fifteenYearLoanTab, thirtyYearLoanTab]
        : [thirtyYearLoanTab, fifteenYearLoanTab];

    // Switch to the non-selected loan term and validate the payment updates
    await firstTab.click();

    await expect
      .poll(
        async () => normalizeText(await this.getText(estimatedPayment)),
        {
          message:
            "Estimated payment should update after switching the loan term",
          timeout: 10000,
        },
      )
      .not.toBe(paymentAfterPriceChange);

    const paymentAfterFirstSwitch = normalizeText(
      await this.getText(estimatedPayment),
    );

    expect(paymentAfterFirstSwitch).toMatch(/\$[\d,]+/);

    // Switch to the other loan term and validate the payment updates again
    await secondTab.click();

    await expect
      .poll(
        async () => normalizeText(await this.getText(estimatedPayment)),
        {
          message:
            "Estimated payment should update after switching the loan term back",
          timeout: 10000,
        },
      )
      .not.toBe(paymentAfterFirstSwitch);

    const paymentAfterSecondSwitch = normalizeText(
      await this.getText(estimatedPayment),
    );

    expect(paymentAfterSecondSwitch).toMatch(/\$[\d,]+/);
  }

  // ── Interactive Floor Plan (IFP) — Verification (QD-07) ─
  async verifyFloorplanIfpIsDisplayed(): Promise<void> {
    await this.scrollIntoView(this.floorplanIframe.first());
    await Validator.requireVisible(
      this.floorplanIframe.first(),
      "Interactive floor plan (IFP) iframe should be displayed",
      25000,
    );
  }

  // ── CTAs — Verification (QD-09) ────────────────────────
  async verifyCtasAreDisplayed(): Promise<void> {
    await this.page.waitForLoadState("load");
    await Validator.requireVisible(
      this.qmiDetailNavBar.first(),
      "QMI detail nav bar should be visible",
      20000,
    );
    await Validator.requireVisible(
      this.requestTourCta.first(),
      "'Request a Tour' CTA should be visible in the QMI detail nav bar",
      20000,
    );
    await Validator.requireVisible(
      this.requestInfoCta.first(),
      "'Request Information' CTA should be visible in the QMI detail nav bar",
      20000,
    );
  }

  async openRequestInformationModal(): Promise<void> {
    await this.handlePagePopups();
    await this.scrollIntoView(this.requestInfoCta.first());
    await this.click(this.requestInfoCta.first(), "Request Information CTA");
  }

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
      { name: "First Name", locator: this.requestInformationField(/First Name/i) },
      { name: "Last Name", locator: this.requestInformationField(/Last Name/i) },
      { name: "Email Address", locator: this.requestInformationField(/Email Address/i) },
      { name: "Mobile Number", locator: this.requestInformationField(/Mobile Number/i) },
      {
        name: "Preferred Method of Contact",
        locator: this.requestInformationModal
          .locator("select, [role='combobox'], input")
          .filter({ hasText: /Preferred Method of Contact/i })
          .or(this.requestInformationModal.getByText(/Preferred Method of Contact/i))
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
      this.requestInformationModal.getByText(/Real Estate Professional/i).first(),
      "Real Estate Professional checkbox should be visible",
      10000,
    );
    await Validator.requireVisible(
      this.requestInformationModal.getByText(/Terms and Conditions/i).first(),
      "Terms and Conditions consent text should be visible",
      10000,
    );
    await Validator.requireVisible(
      this.requestInformationModal.getByText(/Read Full Disclaimer/i).first(),
      "Read Full Disclaimer link should be visible",
      10000,
    );
  }

  // ── Data Getters ───────────────────────────────────────
  async getHeading(): Promise<string> {
    return await this.getText(this.pageHeading.first());
  }

  async getMonthlyPaymentText(): Promise<string> {
    return await this.getText(this.monthlyPayment.first());
  }

  async getKeyFactsText(): Promise<string> {
    return await this.getText(this.detailHeader.first());
  }

  private resolveUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    return new URL(url, process.env.BASE_URL ?? "https://www.khov.com/").href;
  }

  private qmiCardLink(targetDetailUrl?: string): Locator {
    if (targetDetailUrl) {
      const slug = this.getLastPathSegment(targetDetailUrl);
      return this.qmiSectionHeading.locator(
        `xpath=following::a[contains(@class, 'stretched-link') and contains(@href, '${slug}')]`,
      );
    }

    return this.qmiSectionLinks().first();
  }

  private qmiSectionLinks(): Locator {
    return this.qmiSectionHeading.locator(
      "xpath=following::a[contains(@class, 'stretched-link') and contains(@href, '/new-construction-homes/')]",
    );
  }

  private requestInformationField(name: RegExp): Locator {
    return this.requestInformationModal
      .getByPlaceholder(name)
      .or(this.requestInformationModal.getByLabel(name))
      .or(
        this.requestInformationModal
          .locator("input, select, textarea, [role='combobox']")
          .filter({ hasText: name }),
      )
      .first();
  }

  private async getQmiCardData(targetDetailUrl?: string): Promise<QmiCardData> {
    const link = this.qmiCardLink(targetDetailUrl).first();

    await link.waitFor({ state: "attached", timeout: 25000 });

    const href = await this.getHref(link);
    const rawText = await link.evaluate((anchor) => {
      const card = anchor.parentElement?.closest(
        "[class*='HomeOfTheWeek_card'], [class*='Card_']",
      );

      return (card?.textContent ?? anchor.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim();
    });

    return {
      rawText,
      href,
      heading: this.extractHeading(rawText),
      keyFacts: this.extractKeyFacts(rawText),
      pricing: this.extractPricing(rawText),
      availability: this.extractAvailability(rawText),
      promo: this.extractPromo(rawText),
    };
  }

  private async openQmiCard(targetDetailUrl?: string): Promise<void> {
    const link = this.qmiCardLink(targetDetailUrl).first();
    await link.waitFor({ state: "attached", timeout: 25000 });
    await this.clickViaScript(link, "quick move-in home card");
  }

  private getLastPathSegment(url: string): string {
    const parsed = new URL(this.resolveUrl(url));
    return parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
  }

  private extractHeading(text: string): string | undefined {
    const normalized = normalizeText(text);
    const address = this.extractAddress(normalized);
    const beforeAddress = address ? normalized.split(address)[0] : normalized;
    const sqFtIndex = beforeAddress.search(/Sq\.?\s*ft\.?/i);
    const beforeSpecs =
      sqFtIndex > -1
        ? beforeAddress.slice(0, sqFtIndex).replace(/\d[\d,]*\s*$/, "")
        : beforeAddress.split(/\d+\s*Story|\d+(?:\.\d+)?\s*Beds?|\$[\d,]+/i)[0];
    const candidate = beforeSpecs
      .replace(/Home of the Week/gi, "")
      .replace(/Available Now/gi, "")
      .replace(/Promo Rate[^$]*/gi, "")
      .replace(/\$[\d,]+(?:\s*\/mo\.)?/g, "")
      .trim();

    return candidate || undefined;
  }

  private extractAddress(text: string): string | undefined {
    return normalizeText(text).match(
      /\d+\s+(?!(?:Sq|Story|Beds?|Baths?|Cars?)\b)[A-Za-z0-9 .'-]+(?:Dr|Drive|Rd|Road|St|Street|Ave|Avenue|Ln|Lane|Way|Ct|Court|Blvd|Trail|Trl)\b/i,
    )?.[0];
  }

  private extractKeyFacts(text: string): string | undefined {
    return normalizeText(text).match(
      /\d[\d,]*\s*Sq\.?\s*ft\.?.*?\d+(?:\.\d+)?\s*Beds?.*?\d+(?:\.\d+)?\s*Baths?/i,
    )?.[0];
  }

  private extractPricing(text: string): string | undefined {
    const prices = text.match(/\$[\d,]+(?:\s*\/mo\.)?/g);
    return prices?.join(" ");
  }

  private extractAvailability(text: string): string | undefined {
    return text.match(
      /Available Now|Available\s+[A-Za-z]+(?:\s+\d{1,2},?)?\s+\d{4}/i,
    )?.[0];
  }

  private extractPromo(text: string): string | undefined {
    return text.match(/Promo Rate[^$]*/i)?.[0]?.trim();
  }

  private toPath(href: string): string {
    if (href.startsWith("http")) {
      return new URL(href).pathname;
    }

    return href;
  }

  private extractComparableFacts(text: string): string[] {
    const normalized = normalizeText(text);
    const facts = normalized.match(
      /\d[\d,]*\s*Sq\.?\s*ft\.?|\d+(?:\.\d+)?\s*Beds?|\d+(?:\.\d+)?\s*Baths?/gi,
    );

    return facts ?? [];
  }

  private extractCurrentPrice(text: string): string | undefined {
    const prices = text.match(/\$[\d,]+/g);
    return prices?.at(-1);
  }
}
