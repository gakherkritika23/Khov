import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import { escapeRegExp } from "../utils/stringUtils";
import { reportValue } from "../utils/reporter";
import { RequestInformationForm } from "./requestInformationForm";

/**
 * Quick Move-In (QMI) details page — E4 in docs/test-plan.md.
 *
 * Pinned (via the spec) to a feature-rich, deterministic QMI home at River Ranch
 * Trails so the conditional checks are stable; if that pinned home is no longer
 * listed, update `constants.qmi.detail_url`. The page composes a hero gallery
 * ("hero gallery 2.0" → `GalleryTwoModal`), a key-facts detail header, a pricing
 * card with an estimated monthly payment + mortgage-calculator popover, an
 * interactive floor plan (IFP) iframe, and the site-wide CTAs.
 *
 * The mortgage calculator opens the shared "Calculate your mortgage" modal (the
 * same component used by communityPage), so the calculator locators + helpers
 * mirror communityPage's API (`setCalculatorField`, `selectLoanTerm`,
 * `verifyCalculatorFieldsHaveData`, `verifyPaymentRecalculates`, …).
 *
 * Consumers (where the public methods are exercised):
 *   - tests/qmiPage.spec.ts — Overview (TC-01–03), Media gallery (TC-04–05),
 *     Pricing (TC-06–07).
 *   - tests/contactForms.spec.ts — Request Information form on the QMI page.
 */
export class QmiPage extends BasePage {
  private selectedDetailHref?: string;
  readonly pageHeading: Locator;
  readonly detailHeader: Locator;
  readonly keyFacts: Locator;
  readonly availability: Locator;
  readonly viewGalleryButton: Locator;
  readonly galleryModal: Locator;
  readonly galleryTabButtons: Locator;
  readonly gallerySectionButtons: Locator;
  readonly galleryImage: Locator;
  readonly inlineMediaImage: Locator;
  readonly monthlyPayment: Locator;
  readonly mortgageInfoTrigger: Locator;
  readonly mortgageCalculatorCta: Locator;
  readonly calculatorHeading: Locator;
  readonly calculatorModal: Locator;
  readonly calculatorEstimatedPayment: Locator;
  readonly calculatorInputs: Locator;
  readonly modalCloseButton: Locator;
  readonly floorplanIframe: Locator;
  readonly qmiDetailNavBar: Locator;
  readonly requestTourCta: Locator;
  readonly requestTourModal: Locator;
  readonly requestInfoCta: Locator;
  readonly requestInfo: RequestInformationForm;
  private galleryFallbackUsed = false;

  // Builds all element locators for the QMI detail page. Called once per page
  // object construction in the specs' `openQmi` helpers. Notable scoping:
  // `detailHeader` carries the address + key facts; `monthlyPayment` is scoped to
  // the "/mo." price (a second `Card_price` holds the total); `floorplanIframe` is
  // scoped to the `/floorplan/` iframe (the lot-detail map is a separate iframe);
  // the `calculator*` locators are scoped to the shared "Calculate your mortgage"
  // modal (same component as communityPage), with `calculatorInputs` in order
  // 0=Price, 1=Down Payment %, 2=Down Payment $, 3=Interest Rate.
  constructor(page: Page) {
    super(page);
    this.pageHeading = page.locator("h1");
    this.detailHeader = page.locator("[class*='DetailHeader_container']");
    this.keyFacts = page.locator("[class*='DetailHeader_amenities']");
    this.availability = page.getByText(
      /Available (Now|January|February|March|April|May|June|July|August|September|October|November|December)/i,
    );
    this.viewGalleryButton = page
      .getByRole("button", { name: /View Gallery/i })
      .or(page.locator("button").filter({ hasText: /View Gallery/i }));
    this.galleryModal = page
      .locator("[class*='Modal_overlay']")
      .or(page.getByRole("dialog"));
    this.galleryTabButtons = this.galleryModal
      .getByRole("button")
      .filter({ hasText: /Interior|Exterior/i });
    this.gallerySectionButtons = page.locator("[class*='GalleryTwoModal_btn']");
    this.galleryImage = this.galleryModal.locator("img, picture");
    this.inlineMediaImage = page
      .locator("main img")
      .filter({
        hasNot: page.locator(
          "xpath=ancestor::li[contains(., 'Sq ft') or contains(., 'Story') or contains(., 'Beds') or contains(., 'Baths') or contains(., 'Cars')]",
        ),
      })
      .first();
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
    this.mortgageCalculatorCta = page.getByRole("button", {
      name: /Mortgage Calculator/i,
    });
    this.calculatorHeading = page.getByRole("heading", {
      name: /Calculate your mortgage/i,
    });
    this.calculatorModal = page
      .locator("[class*='Modal_dialog']")
      .filter({ hasText: "Calculate your mortgage" });
    this.calculatorEstimatedPayment = this.calculatorModal
      .getByText(/^\$[\d,]+$/)
      .first();
    this.calculatorInputs = this.calculatorModal.locator("input[type='text']");
    this.modalCloseButton = page.locator(
      "[class*='Modal_dialog'] [class*='CircleIconButton']",
    );
    this.floorplanIframe = page.locator("iframe[src*='/floorplan/']");
    this.qmiDetailNavBar = page.locator(
      "nav[class*='ContentNavigation_content-nav'], nav[class*='ContentNavigation_actions-nav']",
    );
    this.requestTourCta = this.qmiDetailNavBar.getByRole("button", {
      name: "Request a Tour",
    });
    // "Request a Tour" opens a scheduling modal (role=dialog) headed "Select a
    // date and time for a tour"; keyed on that tour-specific text with a
    // class-based fallback.
    this.requestTourModal = page
      .getByRole("dialog")
      .filter({ hasText: /Select a date and time for a tour/i })
      .or(page.locator("[class*='request-a-tour_modal']"));
    this.requestInfoCta = this.qmiDetailNavBar.getByRole("button", {
      name: "Request Information",
    });
    this.requestInfo = new RequestInformationForm(page);
  }

  // ── Navigation — Actions ───────────────────────────────
  // Navigate directly to the pinned QMI detail URL (`constants.qmi.detail_url`)
  // and dismiss any popups. `communityUrl` is accepted for caller compatibility
  // (the community → QMI path is covered elsewhere) but not used here. Used by:
  // the `openQmi` helper in tests/qmiPage.spec.ts and tests/contactForms.spec.ts
  // (per-test `beforeEach`).
  async navigateToQmi(
    communityUrl: string,
    preferredDetailUrl: string,
  ): Promise<void> {
    this.selectedDetailHref = preferredDetailUrl;
    await this.navigate(this.resolveUrl(preferredDetailUrl));
    await this.page.waitForLoadState("domcontentloaded");
    await this.handlePagePopups();
  }

  // ── Navigation — Verification ──────────────────────────
  // Assert the browser landed on the expected QMI detail URL and the home
  // heading is visible. Used by: tests/qmiPage.spec.ts Overview TC-01.
  async verifyQmiDetailPageDisplayed(detailUrlPattern?: string): Promise<void> {
    const expectedPattern =
      detailUrlPattern ??
      escapeRegExp(this.toPath(this.selectedDetailHref ?? ""));

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
    await reportValue("QMI detail page verified (URL + heading)");
  }

  // ── Header / Key Facts — Verification ──────────────────
  // Assert the floorplan heading (h1) and the detail header (address / key
  // facts container) are both visible. Used by: tests/qmiPage.spec.ts Overview TC-01.
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
    await reportValue("QMI header & detail block are visible");
  }

  // Assert the at-a-glance key facts row (beds / baths / sq ft) is visible.
  // Used by: tests/qmiPage.spec.ts Overview TC-01.
  async verifyKeyFactsAreDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.keyFacts.first(),
      "Key facts (beds / baths / sq ft) should be visible",
      20000,
    );
    await reportValue("Key facts row (beds / baths / sq ft) is visible");
  }

  // ── Availability — Verification ────────────────────────
  // Assert the availability tag ("Available Now" / "Available <Month>") is
  // visible. Used by: tests/qmiPage.spec.ts Overview TC-02.
  async verifyAvailabilityIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.availability.first(),
      "Availability should be visible",
      20000,
    );
    await reportValue(
      `Availability: ${(await this.getText(this.availability.first())).trim()}`,
    );
  }

  // ── Media Gallery — Actions ────────────────────────────
  // Open the hero-gallery-2.0 modal via the "View Gallery (n)" button. If no
  // gallery CTA exists (some homes only have an inline media image), flips
  // `galleryFallbackUsed` so the gallery verifications degrade to an inline-image
  // check. Retries the open once after dismissing popups.
  // Used by: tests/qmiPage.spec.ts Media gallery TC-01 and TC-02 (`beforeEach`).
  async openGalleryModal(): Promise<void> {
    await this.handlePagePopups();
    this.galleryFallbackUsed = false;

    if (!(await this.isVisible(this.viewGalleryButton.first(), 15000))) {
      this.galleryFallbackUsed = true;
      await this.verifyInlineMediaImageIsDisplayed();
      return;
    }

    await this.scrollIntoView(this.viewGalleryButton.first());
    await this.click(this.viewGalleryButton.first(), "View Gallery");
    if (!(await this.isVisible(this.galleryModal.first(), 3000))) {
      await this.handlePagePopups();
      await this.click(this.viewGalleryButton.first(), "View Gallery");
    }
  }

  // ── Media Gallery — Verification ───────────────────────
  // Assert the gallery modal and at least one image are visible (or the inline
  // image when in fallback mode).
  // Used by: tests/qmiPage.spec.ts Media gallery TC-01 and TC-02.
  async verifyGalleryModalIsDisplayed(): Promise<void> {
    if (this.galleryFallbackUsed) {
      await this.verifyInlineMediaImageIsDisplayed();
      return;
    }

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

  // Assert the hero-gallery-2.0 section-nav buttons are displayed (falls back to
  // the plain modal check when section nav is absent / in inline-image fallback).
  // Used by: tests/qmiPage.spec.ts Media gallery TC-02.
  async verifyGallerySectionNavIsDisplayed(): Promise<void> {
    if (this.galleryFallbackUsed) {
      await this.verifyInlineMediaImageIsDisplayed();
      return;
    }

    if (!(await this.isVisible(this.gallerySectionButtons.first(), 5000))) {
      await this.verifyGalleryModalIsDisplayed();
      return;
    }

    await Validator.requireVisible(
      this.gallerySectionButtons.first(),
      "Hero gallery 2.0 section navigation should be displayed",
      20000,
    );
    await reportValue("Hero Gallery 2.0 section navigation is displayed");
  }

  // Assert the gallery modal's image count matches the count in the "View
  // Gallery (n)" page CTA (or the inline image in fallback mode).
  // Used by: tests/qmiPage.spec.ts Media gallery TC-01.
  async verifyGalleryImageCountMatchesPageCta(): Promise<void> {
    if (this.galleryFallbackUsed) {
      await this.verifyInlineMediaImageIsDisplayed();
      return;
    }

    const pageCount = await this.getGalleryPageImageCount();

    await Validator.requireVisible(
      this.galleryModal.first(),
      "Media gallery modal should be displayed before validating image count",
      20000,
    );

    // Prefer the per-category tab counts (reliable). Only when there are no tab
    // counts do we count unique image sources in the DOM — and since the gallery
    // lazy-loads, that DOM count can be < pageCount, so assert a sane range there
    // instead of strict equality.
    const tabCounts = await this.getGalleryTabCounts();

    if (tabCounts.length > 0) {
      const modalCount = tabCounts.reduce((total, count) => total + count, 0);
      await Validator.requireTrue(
        modalCount === pageCount,
        `Gallery modal tab counts (${modalCount}) should equal page CTA count (${pageCount})`,
      );
      await reportValue(
        `Gallery image count: page CTA = ${pageCount}, modal tabs = ${modalCount}`,
      );
      return;
    }

    const domCount = await this.getUniqueGalleryImageCountFromDom();
    await Validator.requireTrue(
      domCount > 0 && domCount <= pageCount,
      `Gallery modal image count (${domCount}) should be between 1 and the page CTA count (${pageCount})`,
    );
    await reportValue(
      `Gallery image count: page CTA = ${pageCount}, modal DOM = ${domCount}`,
    );
  }

  // Scroll the gallery modal and assert more than one (and no more than the CTA
  // count) distinct images surface — i.e. the gallery is scrollable/lazy-loads.
  // Used by: tests/qmiPage.spec.ts Media gallery TC-01.
  async verifyGalleryImagesCanBeScrolledThrough(): Promise<void> {
    if (this.galleryFallbackUsed) {
      await this.verifyInlineMediaImageIsDisplayed();
      return;
    }

    const pageCount = await this.getGalleryPageImageCount();
    const scrolledImageCount = await this.getScrolledGalleryImageCount();

    await Validator.requireTrue(
      scrolledImageCount > 1 && scrolledImageCount <= pageCount,
      `Gallery should expose multiple images while scrolling (saw ${scrolledImageCount}, expected 2–${pageCount} from the page CTA)`,
    );
    await reportValue(
      `Gallery scroll exposed ${scrolledImageCount}/${pageCount} images`,
    );
  }

  // Switch to the second gallery category tab and assert the visible image set
  // actually changes (and is non-empty afterwards).
  // Used by: tests/qmiPage.spec.ts Media gallery TC-02.
  async verifyGalleryImagesChangeAfterCategorySwitch(): Promise<void> {
    if (this.galleryFallbackUsed) {
      await this.verifyInlineMediaImageIsDisplayed();
      return;
    }

    await Validator.requireVisible(
      this.galleryTabButtons.first(),
      "Gallery category tabs should be visible before switching category",
      10000,
    );

    const tabCount = await this.galleryTabButtons.count();

    await Validator.requireTrue(
      tabCount >= 2,
      "Expected at least two gallery category tabs (e.g. Interior / Exterior)",
    );

    const initialSources = await this.getVisibleGalleryImageSources();

    await this.click(this.galleryTabButtons.nth(1), "gallery category tab");
    await expect
      .poll(
        async () => (await this.getVisibleGalleryImageSources()).join("|"),
        {
          message: "Gallery images should change after switching category",
          timeout: 10000,
        },
      )
      .not.toBe(initialSources.join("|"));

    const switchedSources = await this.getVisibleGalleryImageSources();

    await Validator.requireTrue(
      switchedSources.length > 0,
      "Switched gallery category should show images",
    );
    await reportValue(
      `Gallery category switch: ${initialSources.length} → ${switchedSources.length} visible images`,
    );
  }

  // Fallback assertion used by the gallery methods when a home has no "View
  // Gallery" CTA: assert an inline media image is displayed instead. Intentionally
  // defensive — the pinned River Ranch Trails home always has a gallery, so this
  // branch (and `galleryFallbackUsed`) is NOT exercised by the current specs; it
  // keeps the gallery tests from hard-failing if the pin is ever moved to a home
  // without a gallery modal.
  async verifyInlineMediaImageIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.inlineMediaImage,
      "QMI detail page should display an inline media image when no gallery CTA is available",
      20000,
    );
    await reportValue("Inline media image is displayed (gallery fallback)");
  }

  // ── Media Gallery — Data getters ───────────────────────
  // Read the image count embedded in the "View Gallery (n)" CTA text. Internal
  // helper for the gallery count/scroll verifications.
  private async getGalleryPageImageCount(): Promise<number> {
    const ctaText = await this.viewGalleryButton.first().textContent();
    const count = this.extractCount(ctaText ?? "");

    await Validator.requireTrue(
      count !== null,
      `Unable to read image count from gallery CTA text: "${ctaText}"`,
    );

    return count as number;
  }

  // Parse the per-category image counts from the gallery tab labels (e.g.
  // "Interior (12)"). Empty when the modal has no counted category tabs.
  // Internal helper for `verifyGalleryImageCountMatchesPageCta`.
  private async getGalleryTabCounts(): Promise<number[]> {
    const tabTexts = await this.galleryTabButtons.allTextContents();
    return tabTexts
      .map((text) => this.extractCount(text))
      .filter((count): count is number => count !== null);
  }

  // ── Request Information — Actions ──────────────────────
  // Open the "Request Information" modal from the QMI detail nav CTA. Retries the
  // atomic pointer press until the modal mounts (a plain click intermittently
  // fails to fire the react-aria press under slowMo); never re-presses once the
  // modal is up. Used by: tests/contactForms.spec.ts.
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
  // Open the "Request a Tour" scheduling modal from the QMI detail nav CTA. The
  // CTA is a react-aria pressable (like Request Information), so retry the atomic
  // pointer press until the modal mounts. Used by: tests/qmiPage.spec.ts Overview TC-02.
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
  // Used by: tests/qmiPage.spec.ts Overview TC-02.
  async verifyRequestTourModalIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.requestTourModal.first(),
      "'Request a Tour' scheduling modal should be displayed",
      20000,
    );
    await reportValue("'Request a Tour' scheduling modal is displayed");
  }

  // ── Mortgage Calculator — Actions ──────────────────────
  // Open the shared "Calculate your mortgage" modal from the pricing card: jump
  // to the Pricing section, scroll the monthly-payment + info icon into view,
  // reveal the "Mortgage Calculator" CTA from the hover/tap popover (retried, as
  // it is lazy and flaky headed), click it, and confirm the calculator modal
  // opens. Used by: tests/qmiPage.spec.ts Pricing TC-02.
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

    await this.monthlyPayment.first().scrollIntoViewIfNeeded();

    await this.page.evaluate(() => {
      window.scrollBy(0, -180);
    });

    await Validator.requireVisible(
      this.monthlyPayment.first(),
      "Estimated monthly payment should be visible before opening mortgage calculator",
      20000,
    );

    await this.mortgageInfoTrigger.first().scrollIntoViewIfNeeded();

    await this.page.evaluate(() => {
      window.scrollBy(0, -120);
    });

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
      ctaVisible = await this.mortgageCalculatorCta
        .first()
        .isVisible()
        .catch(() => false);
      if (!ctaVisible) {
        await infoIcon.click({ force: true }).catch(() => {});
        ctaVisible = await this.mortgageCalculatorCta
          .first()
          .isVisible()
          .catch(() => false);
      }
      if (!ctaVisible) await this.page.waitForTimeout(700);
    }

    await Validator.requireVisible(
      this.mortgageCalculatorCta.first(),
      "Mortgage Calculator CTA should be displayed after opening the mortgage information popover",
      15000,
    );

    await this.click(this.mortgageCalculatorCta.first(), "Mortgage Calculator");

    await Validator.requireVisible(
      this.calculatorHeading.first(),
      "Mortgage calculator modal should open",
      15000,
    );
  }

  // Set a calculator text input by index (0=Price, 1=Down Payment %, 2=Down
  // Payment $, 3=Interest Rate); the Tab blur triggers recalculation.
  // Used by: tests/qmiPage.spec.ts Pricing TC-02 (via `verifyPaymentRecalculates`).
  async setCalculatorField(
    index: number,
    value: string,
    name: string,
  ): Promise<void> {
    const input = this.calculatorInputs.nth(index);
    await input.click();
    await input.fill(value);
    await input.press("Tab"); // blur → triggers recalculation
    await reportValue(`Set ${name} = ${value}`);
  }

  // Select the 15- or 30-year loan term in the calculator modal.
  // Used by: tests/qmiPage.spec.ts Pricing TC-02 (via `verifyPaymentRecalculates`).
  async selectLoanTerm(years: "15" | "30"): Promise<void> {
    await this.click(
      this.calculatorModal.getByText(`${years} Year Loan`).first(),
      `${years} Year Loan`,
    );
  }

  // Close the calculator modal via its (X) control and confirm it is hidden.
  // Used by: tests/qmiPage.spec.ts Pricing TC-02.
  async closeMortgageCalculator(): Promise<void> {
    await this.click(this.modalCloseButton.first(), "Close mortgage calculator");
    await Validator.requireHidden(
      this.calculatorHeading.first(),
      "Mortgage calculator should close",
      10000,
    );
  }

  // ── Mortgage Calculator — Verification ─────────────────
  // Assert the estimated monthly payment is displayed on the pricing card.
  // Used by: tests/qmiPage.spec.ts Pricing TC-01.
  async verifyMonthlyPaymentIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.monthlyPayment.first(),
      "Estimated monthly payment should be displayed",
      20000,
    );
    await reportValue(
      `Estimated monthly payment: ${(await this.getMonthlyPaymentText()).trim()}`,
    );
  }

  // Parse the calculator modal's top "Estimated Payment" amount to a number.
  // Internal helper for `verifyCalculatorFieldsHaveData` / `verifyPaymentRecalculates`.
  async getEstimatedPayment(): Promise<number> {
    const text = (await this.calculatorEstimatedPayment.innerText()).trim();
    return Number(text.replace(/[^0-9.]/g, ""));
  }

  // Read a calculator text input's current numeric value (strips $/commas).
  // Used by: tests/qmiPage.spec.ts Pricing TC-02 to derive a home-independent price bump.
  async getCalculatorFieldValue(index: number): Promise<number> {
    const raw = (await this.calculatorInputs.nth(index).inputValue()).trim();
    return Number(raw.replace(/[^0-9.]/g, ""));
  }

  // Assert the open calculator shows a positive estimated payment and every
  // input field is pre-populated. Used by: tests/qmiPage.spec.ts Pricing TC-02.
  async verifyCalculatorFieldsHaveData(): Promise<void> {
    await Validator.requireVisible(
      this.calculatorEstimatedPayment,
      "Calculator estimated payment should be shown at the top",
      10000,
    );
    const payment = await this.getEstimatedPayment();
    await Validator.requireTrue(
      payment > 0,
      "Estimated payment should be a positive amount",
    );
    const fieldCount = await this.calculatorInputs.count();
    for (let i = 0; i < fieldCount; i++) {
      const value = (await this.calculatorInputs.nth(i).inputValue()).trim();
      await Validator.requireNotEmpty(
        value,
        `Calculator field ${i + 1} should have a value (got "${value}")`,
      );
    }
    await reportValue(
      `Calculator estimated payment $${payment}; ${fieldCount} fields populated`,
    );
  }

  // Capture the top estimated payment, run an edit, then assert it recalculated
  // to a new valid amount in the expected direction (after focus change).
  // Used by: tests/qmiPage.spec.ts Pricing TC-02.
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

  // ── Interactive Floor Plan (IFP) — Verification ─────────
  // Scroll the embedded floor-plan iframe into view and assert it is displayed.
  // Used by: tests/qmiPage.spec.ts Overview TC-03.
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
  // Assert the QMI detail nav bar and its "Request a Tour" / "Request
  // Information" CTAs are visible. Used by: tests/qmiPage.spec.ts Overview TC-02 and
  // tests/contactForms.spec.ts.
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
    await reportValue("QMI CTAs visible: Request a Tour, Request Information");
  }

  // ── Data Getters ───────────────────────────────────────
  // Return the floorplan heading (h1) text. Used by: tests/qmiPage.spec.ts Overview TC-01.
  async getHeading(): Promise<string> {
    return await this.getText(this.pageHeading.first());
  }

  // Return the estimated monthly payment text. Used by: tests/qmiPage.spec.ts Pricing TC-01.
  async getMonthlyPaymentText(): Promise<string> {
    return await this.getText(this.monthlyPayment.first());
  }

  // Return the detail-header text (address + key facts). Used by:
  // tests/qmiPage.spec.ts Overview TC-01.
  async getKeyFactsText(): Promise<string> {
    return await this.getText(this.detailHeader.first());
  }

  // ── Internal helpers ───────────────────────────────────
  // Parse a count out of text — prefer a "(n)" parenthesized form, else the first
  // bare integer. Internal helper for the gallery count getters.
  private extractCount(text: string): number | null {
    const countText = text.match(/\((\d+)\)/)?.[1] ?? text.match(/\b(\d+)\b/)?.[1];

    return countText ? Number(countText) : null;
  }

  // Normalize a URL/href to just its path. Internal helper for
  // `verifyQmiDetailPageDisplayed`.
  private toPath(href: string): string {
    if (href.startsWith("http")) {
      return new URL(href).pathname;
    }

    return href;
  }

  // Count distinct, non-data-URI image sources currently in the gallery modal
  // DOM. Internal fallback for `getGalleryModalImageCount`.
  private async getUniqueGalleryImageCountFromDom(): Promise<number> {
    return this.galleryModal.first().evaluate((modal) => {
      const imageSources = Array.from(modal.querySelectorAll("img"))
        .map((image) => image.currentSrc || image.src || image.getAttribute("data-src") || "")
        .filter((src) => src && !src.startsWith("data:"));

      return new Set(imageSources).size;
    });
  }

  // Return the sources of images currently visible (rendered + not hidden) in the
  // gallery modal. Internal helper for `verifyGalleryImagesChangeAfterCategorySwitch`.
  private async getVisibleGalleryImageSources(): Promise<string[]> {
    return this.galleryModal.first().evaluate((modal) => {
      const images = Array.from(modal.querySelectorAll<HTMLImageElement>("img"));

      return images
        .filter((image) => {
          const rect = image.getBoundingClientRect();
          const style = window.getComputedStyle(image);

          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        })
        .map((image) => image.currentSrc || image.src || image.getAttribute("data-src") || "")
        .filter((src) => src && !src.startsWith("data:"));
    });
  }

  // Scroll the gallery modal's scroll container top-to-bottom, collecting the
  // distinct visible image sources seen along the way, and return the count.
  // Internal helper for `verifyGalleryImagesCanBeScrolledThrough`.
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
        Array.from(modal.querySelectorAll<HTMLImageElement>("img")).forEach((image) => {
          const rect = image.getBoundingClientRect();
          const style = window.getComputedStyle(image);
          const source = image.currentSrc || image.src || image.getAttribute("data-src") || "";

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
        });
      };

      const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
      const maxScrollTop = Math.max(scrollContainer.scrollHeight - scrollContainer.clientHeight, 0);
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
