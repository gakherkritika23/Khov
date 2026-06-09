import { Page, Locator } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import { reportValue } from "../utils/reporter";
import { dismissCookieBanner } from "../utils/cookieUtils";

export class CommunityPage extends BasePage {
  readonly pageHeading: Locator;
  readonly heroSubtitle: Locator;
  readonly startingPrice: Locator;
  readonly communityLocation: Locator;
  readonly onsiteSalesTeam: Locator;
  readonly salesOfficeHours: Locator;
  readonly homeCards: Locator;
  readonly homeCardPricing: Locator;
  readonly viewHomeDetailsCta: Locator;
  readonly qmiSectionHeading: Locator;
  readonly availabilityBadge: Locator;
  readonly promoRateBadge: Locator;
  readonly wasPrice: Locator;
  readonly featuredHomeLink: Locator;
  readonly qmiSection: Locator;
  readonly qmiCards: Locator;
  readonly qmiCalcTriggers: Locator;
  readonly qmiLoadMore: Locator;
  readonly cardImage: Locator;
  readonly carousel: Locator;
  readonly floorplanBlocks: Locator;
  readonly salesOfficeSchedule: Locator;
  readonly salesOfficeRows: Locator;
  readonly salesTeamModal: Locator;
  readonly modalOnsiteTeamHeading: Locator;
  readonly modalCallLink: Locator;
  readonly modalAddress: Locator;
  readonly modalHours: Locator;
  readonly consultantNames: Locator;
  readonly consultantPhotos: Locator;
  readonly modalCloseButton: Locator;
  readonly floorplanCalcTriggers: Locator;
  readonly mortgageCalculatorCta: Locator;
  readonly calculatorHeading: Locator;
  readonly calculatorModal: Locator;
  readonly calculatorEstimatedPayment: Locator;
  readonly calculatorInputs: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.locator("h1");
    // "Single Family Homes • Starting from $X/mo. • City, State"
    this.heroSubtitle = page.locator("[class*='Hero_subtitle']");
    // Hero pricing copy varies by environment — prod: "Starting from $X/mo.",
    // dev: "from the mid $200s" — so match the $ amount, not the word "Starting".
    this.startingPrice = this.heroSubtitle.filter({ hasText: /\$\s?\d/ });
    // Community Location / address block (InfoBlock).
    this.communityLocation = page.getByText("Community Location");
    this.onsiteSalesTeam = page.getByText("Your Onsite Sales Team", {
      exact: true,
    });
    this.salesOfficeHours = page.getByText(/Sales Office:/);
    // Floorplan / home cards (shared Card component for floorplans + QMI homes).
    this.homeCards = page.locator("[class*='Card_specifications']");
    this.homeCardPricing = page.locator("[class*='Card_pricing']");
    this.viewHomeDetailsCta = page.getByRole("link", {
      name: "View Home Details",
    });
    // Quick Move-In (QMI) section.
    this.qmiSectionHeading = page.getByRole("heading", {
      name: /Quick Move-in Homes Available/i,
    });
    this.availabilityBadge = page.getByText("Available Now");
    this.promoRateBadge = page.getByText(/Promo Rate/i);
    this.wasPrice = page.locator("[class*='Card_old-price']");
    // The featured "Home of the Week" QMI card navigates via a stretched link.
    this.featuredHomeLink = page.locator("[class*='stretched-link']");
    // Quick Move-In section + its cards (scoped to avoid the floorplan section).
    // Each QMI card is a `Card_contents` block with one static image, a specs
    // row, pricing, and an estimated-payment info icon (`Card_tooltip-trigger`,
    // distinct from the floorplan `TitleBlock_popover-trigger`) whose popover
    // opens the SAME "Calculate your mortgage" modal as the floorplans.
    this.qmiSection = page.locator("section[class*='quick-move-in-container']");
    this.qmiCards = this.qmiSection.locator("[class*='Card_contents']");
    this.qmiCalcTriggers = this.qmiSection.locator(
      "[class*='Card_tooltip-trigger']",
    );
    this.qmiLoadMore = this.qmiSection.getByRole("button", {
      name: /load more/i,
    });
    // Media. `:visible` avoids lazy/zero-size or hidden carousel-slide images.
    this.cardImage = page.locator("[class*='Card_'] picture:visible");
    this.carousel = page.locator("[class*='FeaturedCarousel']");
    // Each floorplan block holds two image carousels (elevation + gallery).
    this.floorplanBlocks = page.locator("[class*='FloorPlan_floor-plan']");
    // On-page sales office hours schedule (day labels + time values).
    this.salesOfficeSchedule = page.locator(
      "[class*='SalesCenterOperationHours']",
    );
    // Each schedule row (<li>) holds a day label (<span>) + a <time> value.
    this.salesOfficeRows = page.locator(
      "[class*='SalesCenterOperationHours_content'] li",
    );
    // "Your Onsite Sales Team" contact modal and its detail sections.
    this.salesTeamModal = page.locator("[class*='Modal_bottom']");
    this.modalOnsiteTeamHeading = this.salesTeamModal.getByText(
      "Our Onsite Team",
    );
    this.modalCallLink = this.salesTeamModal.getByRole("link", {
      name: /^Call/i,
    });
    this.modalAddress = this.salesTeamModal.getByText(/,\s*(Texas|TX)\b/i);
    // Hours rows that carry both a weekday and a time range.
    this.modalHours = this.salesTeamModal.getByText(
      /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday).*(AM|PM)/i,
    );
    this.consultantNames = this.salesTeamModal.locator(
      "[class*='Modal_sales-agents'] p.b2",
    );
    this.consultantPhotos = this.salesTeamModal.locator(
      "[class*='Modal_avatar']",
    );
    // Close (X) control lives in the modal dialog wrapper (CircleIconButton is
    // reused across the page, so it MUST be scoped to the modal dialog).
    this.modalCloseButton = page.locator(
      "[class*='Modal_dialog'] [class*='CircleIconButton']",
    );
    // Floorplan mortgage calculator: each floorplan's "Estimated payment" info
    // icon (TitleBlock popover trigger) → tooltip "Mortgage Calculator" CTA →
    // "Calculate your mortgage" modal.
    this.floorplanCalcTriggers = page.locator(
      "[class*='TitleBlock_popover-trigger']",
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
    // Top "Estimated Payment" amount (e.g. $2,147) — first $-only value node.
    this.calculatorEstimatedPayment = this.calculatorModal
      .getByText(/^\$[\d,]+$/)
      .first();
    // Editable text inputs in order: 0=Price, 1=Down Payment %, 2=Down Payment $,
    // 3=Interest Rate, then computed/display fields.
    this.calculatorInputs = this.calculatorModal.locator("input[type='text']");
  }

  // ── Navigation — Actions ───────────────────────────────
  async navigateToCommunity(url: string): Promise<void> {
    await this.navigate(url);
    // Best-effort hydration wait: the community page's "load" event can be very
    // slow (galleries/video/maps), so cap it and proceed — assertions auto-wait
    // and click() waits for its target, so we don't need a guaranteed load.
    await this.page.waitForLoadState("load", { timeout: 15000 }).catch(() => {});
    await dismissCookieBanner(this.page);
  }

  // ── Navigation — Verification ──────────────────────────
  /**
   * Robust check that we landed on a community page: the URL is a community
   * detail path and a level-1 heading naming the community is visible.
   * Stays valid regardless of which community is featured first.
   */
  async verifyCommunityPageDisplayed(
    detailUrlPattern: string,
    communityName: string,
  ): Promise<void> {
    await Validator.requireUrlContains(
      this.page,
      detailUrlPattern,
      "Should be on a community detail page URL",
      20000,
    );
    const heading = this.page.getByRole("heading", {
      name: communityName,
      level: 1,
    });
    await Validator.requireVisible(
      heading.first(),
      `Community heading "${communityName}" should be visible`,
      20000,
    );
  }

  // ── Listing Header — Verification ──────────────────────
  async verifyHeaderIsDisplayed(communityName: string): Promise<void> {
    const heading = this.page.getByRole("heading", {
      name: communityName,
      level: 1,
    });
    await Validator.requireVisible(
      heading.first(),
      `Community name "${communityName}" should be visible`,
      20000,
    );
    await Validator.requireVisible(
      this.heroSubtitle.first(),
      "Community subtitle should be visible",
      20000,
    );
  }

  async verifyStartingPriceIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.startingPrice.first(),
      "Starting price should be displayed in the community subtitle",
      20000,
    );
  }

  async verifyCommunityLocationIsDisplayed(): Promise<void> {
    // The InfoBlock (location + sales office) populates via a follow-up request.
    await Validator.requireVisible(
      this.communityLocation.first(),
      "Community Location block should be visible",
      25000,
    );
  }

  async verifySalesOfficeHoursNotEmpty(): Promise<void> {
    await Validator.requireVisible(
      this.salesOfficeSchedule.first(),
      "Sales office hours block should be visible",
      25000,
    );
    await Validator.requireVisible(
      this.salesOfficeRows.first(),
      "Sales office schedule rows should be visible",
      25000,
    );

    const rowCount = await this.salesOfficeRows.count();
    for (let i = 0; i < rowCount; i++) {
      const row = this.salesOfficeRows.nth(i);
      const day = (await row.locator("> span").first().innerText()).trim();
      const time = (await row.locator("time").first().innerText()).trim();
      await Validator.requireNotEmpty(
        day,
        `Sales office day label (row ${i + 1}) should not be empty`,
      );
      await Validator.requireNotEmpty(
        time,
        `Sales office timing (row ${i + 1}) should not be empty`,
      );
      await reportValue(`Sales office hours — ${day}: ${time}`);
    }
  }

  // ── Onsite Sales Team Modal — Actions ──────────────────
  async openSalesTeamModal(): Promise<void> {
    // "Your Onsite Sales Team" is a JS-only link (no href) — it needs React
    // hydration to open the modal. Click, then WAIT for the modal (don't poll
    // instantly: that re-clicks while it animates in and the open overlay then
    // intercepts the click). Only retry if it genuinely didn't open.
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.click(
        this.onsiteSalesTeam.first(),
        attempt === 1
          ? "Your Onsite Sales Team"
          : "Your Onsite Sales Team (retry)",
      );
      const opened = await this.salesTeamModal
        .first()
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      if (opened) return;
      // Not hydrated yet — let it hydrate, then retry the click.
      await this.page.waitForLoadState("load", { timeout: 10000 }).catch(() => {});
    }
    await Validator.requireVisible(
      this.salesTeamModal.first(),
      "Onsite sales team modal should open",
      8000,
    );
  }

  // ── Onsite Sales Team Modal — Verification ─────────────
  /**
   * Validates every section of the contact modal is present AND carries a
   * value (no empty section), and logs the values.
   */
  async verifySalesTeamModalDetails(): Promise<void> {
    await Validator.requireVisible(
      this.modalOnsiteTeamHeading.first(),
      "Modal 'Our Onsite Team' heading should be visible",
    );
    await Validator.requireVisible(
      this.modalCallLink.first(),
      "Modal phone (Call) link should be visible",
    );
    await Validator.requireVisible(
      this.modalAddress.first(),
      "Modal community address should be visible",
    );
    await Validator.requireVisible(
      this.modalHours.first(),
      "Modal sales-office hours should be visible",
    );
    await Validator.requireVisible(
      this.consultantNames.first(),
      "At least one consultant name should be visible",
    );
    await Validator.requireVisible(
      this.consultantPhotos.first(),
      "At least one consultant photo should be visible",
    );

    const phone = (await this.modalCallLink.first().innerText()).trim();
    const address = (await this.modalAddress.first().innerText())
      .replace(/\s+/g, " ")
      .trim();
    const hours = (await this.modalHours.allInnerTexts())
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("; ");
    const names = (await this.consultantNames.allInnerTexts())
      .map((t) => t.trim())
      .filter(Boolean);

    await Validator.requireNotEmpty(phone, "Modal phone number should not be empty");
    await Validator.requireNotEmpty(address, "Modal address should not be empty");
    await Validator.requireNotEmpty(hours, "Modal sales hours should not be empty");
    await Validator.requireNotEmpty(
      names.join(""),
      "Modal consultant names should not be empty",
    );

    await reportValue(`Modal phone: ${phone}`);
    await reportValue(`Modal address: ${address}`);
    await reportValue(`Modal hours: ${hours}`);
    await reportValue(`Modal consultants: ${names.join(", ")}`);
    await reportValue(
      `Modal consultant photos: ${await this.consultantPhotos.count()}`,
    );
  }

  async closeSalesTeamModal(): Promise<void> {
    await this.click(this.modalCloseButton.first(), "Close onsite sales team modal");
    await Validator.requireHidden(
      this.salesTeamModal.first(),
      "Onsite sales team modal should close",
      10000,
    );
  }

  async verifyOnsiteSalesTeamIsDisplayed(): Promise<void> {
    // The sales-office InfoBlock populates after a follow-up request, so allow
    // generous time on prod.
    await Validator.requireVisible(
      this.onsiteSalesTeam.first(),
      "'Your Onsite Sales Team' should be visible",
      25000,
    );
    await Validator.requireVisible(
      this.salesOfficeHours.first(),
      "Sales office hours should be visible",
      25000,
    );
  }

  // ── Floorplan / Home Cards — Verification ──────────────
  async verifyHomeCardsAreDisplayed(): Promise<void> {
    await this.scrollIntoView(this.homeCards.first());
    await Validator.requireVisible(
      this.homeCards.first(),
      "Home / floorplan cards (name + specs) should render",
      25000,
    );
    await Validator.requireVisible(
      this.homeCardPricing.first(),
      "Home / floorplan card pricing should render",
      25000,
    );
  }

  async verifyHomeDetailOpened(detailUrlPattern: string): Promise<void> {
    // The detail URL (one path segment deeper than the community) is the robust
    // proof that the card CTA opened the detail page. A heading-content check
    // here proved flaky (post-navigation render race) without adding real value.
    await Validator.requireUrlContains(
      this.page,
      detailUrlPattern,
      "Should open a home / floorplan detail page (one level deeper)",
      20000,
    );
  }

  // ── Floorplan / Home Cards — Actions ───────────────────
  async openFirstHomeDetails(): Promise<void> {
    await this.scrollIntoView(this.viewHomeDetailsCta.first());
    await this.click(this.viewHomeDetailsCta.first(), "View Home Details (first card)");
    // No waitForLoadState: detail pages are heavy (galleries/IFP) and their
    // "load" event can take minutes. The URL assertion auto-waits for the
    // navigation, which is the verification we need.
  }

  // ── Quick Move-In (QMI) — Verification ─────────────────
  async verifyQmiSectionIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.qmiSectionHeading.first(),
      "'Quick Move-in Homes Available' section should be visible",
      25000,
    );
    await Validator.requireVisible(
      this.availabilityBadge.first(),
      "A quick move-in availability badge ('Available Now') should be visible",
      25000,
    );
  }

  async verifyPromoRateIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.promoRateBadge.first(),
      "A quick move-in promo-rate badge should be visible",
      25000,
    );
  }

  async verifyWasNowPricingIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.wasPrice.first(),
      "Discounted (was/now) pricing should be visible",
      25000,
    );
  }

  // ── Quick Move-In (QMI) — Actions ──────────────────────
  async openFeaturedQmiHome(): Promise<void> {
    await this.clickViaScript(
      this.featuredHomeLink.first(),
      "featured quick move-in home card",
    );
  }

  // Scroll the QMI section into view and poll until the card count settles (the
  // cards lazy-render, so an immediate count can race to 0).
  private async ensureQmiCardsRendered(): Promise<number> {
    await this.scrollIntoView(this.qmiSectionHeading.first());
    await this.page.waitForTimeout(800);
    let last = -1;
    let count = 0;
    for (let i = 0; i < 12; i++) {
      count = await this.qmiCards.count();
      if (count > 0 && count === last) break; // stable
      last = count;
      await this.page.waitForTimeout(500);
    }
    return count;
  }

  /**
   * Render all quick move-in homes. The list is paginated on the live site via a
   * "Load More" control; click it until it's gone (best-effort — in automation
   * all cards are often already present), then poll until the card count is
   * stable and report it.
   */
  async loadAllQmiHomes(): Promise<number> {
    await this.scrollIntoView(this.qmiSectionHeading.first());
    await this.page.waitForTimeout(800);
    for (let i = 0; i < 6; i++) {
      const more = this.qmiLoadMore.first();
      if (!(await more.isVisible().catch(() => false))) break;
      await more.scrollIntoViewIfNeeded().catch(() => {});
      await more.click().catch(() => {});
      await this.page.waitForTimeout(900);
    }
    const count = await this.ensureQmiCardsRendered();
    await reportValue(`Quick move-in homes loaded: ${count}`);
    return count;
  }

  // ── Quick Move-In (QMI) — Verification ─────────────────
  /**
   * Each QMI card shows a single static image (no carousel). For every card:
   * scroll it into view, assert the image is visible, then assert its URL
   * returns HTTP 200 and log every URL + status.
   */
  async verifyQmiCardImages(): Promise<void> {
    const count = await this.qmiCards.count();
    await Validator.requireTrue(
      count > 0,
      "Quick move-in homes should render at least one card",
    );
    let nonOk = 0;
    for (let i = 0; i < count; i++) {
      const card = this.qmiCards.nth(i);
      await this.scrollIntoView(card);
      await this.page.waitForTimeout(150);
      const img = card.locator("img").first();
      await Validator.requireVisible(
        img,
        `QMI card ${i + 1} image should be visible`,
        15000,
      );
      const url = await img
        .evaluate(
          (im) =>
            (im as HTMLImageElement).currentSrc || (im as HTMLImageElement).src,
        )
        .catch(() => "");
      const resp = url.startsWith("http")
        ? await this.page.request.get(url).catch(() => null)
        : null;
      const status = resp ? resp.status() : "ERR";
      if (status !== 200) nonOk++;
      await reportValue(`QMI card ${i + 1} image: ${status} ${url}`);
    }
    await Validator.requireTrue(
      nonOk === 0,
      `All ${count} QMI card images should return 200`,
    );
  }

  /**
   * For every QMI card, validate the meta data carries real values: Sq ft,
   * Story/Stories, Beds, Baths (decimal ok), Cars, Estimated payment, Current
   * total price — none empty/zero/missing. If a promo-rate badge is present on a
   * card, assert it's non-empty too. Values are parsed from each card's text
   * (cards lazy-render, so each is scrolled into view) and logged.
   */
  async verifyAllQmiMetaData(): Promise<void> {
    const count = await this.qmiCards.count();
    await reportValue(`Validating meta data for ${count} quick move-in homes`);
    for (let i = 0; i < count; i++) {
      const card = this.qmiCards.nth(i);
      await this.scrollIntoView(card);
      await this.page.waitForTimeout(150);
      const text = (await card.innerText().catch(() => ""))
        .replace(/\s+/g, " ")
        .trim();
      const label = `QMI #${i + 1}`;
      const numeric: Record<string, RegExpMatchArray | null> = {
        "Sq ft": text.match(/([\d,]+)\s*Sq ?ft/i),
        Story: text.match(/(\d+)\s*Stor(?:y|ies)/i),
        Beds: text.match(/(\d+(?:\.\d+)?)\s*Beds?/i),
        Baths: text.match(/(\d+(?:\.\d+)?)\s*Baths?/i),
        Cars: text.match(/(\d+)\s*Cars?/i),
        "Estimated payment": text.match(/Estimated payment\s*\$([\d,]+)/i),
        "Current total price": text.match(/Current total price\s*\$([\d,]+)/i),
      };
      const issues: string[] = [];
      for (const [key, match] of Object.entries(numeric)) {
        const value = match ? Number(match[1].replace(/,/g, "")) : NaN;
        if (!match || !(value > 0))
          issues.push(`${key}=${match ? match[1] : "missing"}`);
      }
      const promo = text.match(/Promo Rate[^*]*\*/i);
      await reportValue(
        `${label}: ${Object.entries(numeric)
          .map(([k, m]) => `${k}=${m ? m[1] : "?"}`)
          .join(", ")}${promo ? ` | ${promo[0]}` : ""}`,
      );
      if (promo)
        await Validator.requireNotEmpty(
          promo[0],
          `${label}: promo rate should not be empty`,
        );
      await Validator.requireTrue(
        issues.length === 0,
        `${label}: all meta data present & non-zero${issues.length ? ` — issues: ${issues.join("; ")}` : ""}`,
      );
    }
  }

  // ── Quick Move-In (QMI) Mortgage Calculator — Actions ──
  /**
   * Open the mortgage calculator for a random QMI card via its estimated-payment
   * info icon → "Mortgage Calculator" CTA → shared "Calculate your mortgage"
   * modal (same modal as the floorplan calculator, so the calculator
   * verification helpers are reused).
   */
  async openRandomQmiMortgageCalculator(): Promise<void> {
    const count = await this.qmiCalcTriggers.count();
    const index = Math.floor(Math.random() * Math.max(count, 1));
    await reportValue(
      `Opening mortgage calculator for quick move-in home #${index + 1}/${count}`,
    );
    const trigger = this.qmiCalcTriggers.nth(index);
    let opened = false;
    for (let attempt = 0; attempt < 4 && !opened; attempt++) {
      await trigger.scrollIntoViewIfNeeded().catch(() => {});
      await this.page.waitForTimeout(700);
      await trigger.click({ timeout: 4000 }).catch(() => {});
      await this.page.waitForTimeout(700);
      opened = await this.mortgageCalculatorCta
        .first()
        .isVisible()
        .catch(() => false);
    }
    await this.click(this.mortgageCalculatorCta.first(), "Mortgage Calculator");
    await Validator.requireVisible(
      this.calculatorHeading.first(),
      "Mortgage calculator modal should open",
      15000,
    );
  }

  // ── Media (images / carousel) — Verification ───────────
  async verifyCardImagesAreDisplayed(): Promise<void> {
    await this.scrollIntoView(this.cardImage.first());
    await Validator.requireVisible(
      this.cardImage.first(),
      "Floorplan/home card image should be visible",
      25000,
    );
  }

  async verifyCarouselIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.carousel.first(),
      "An image carousel should be displayed",
      25000,
    );
  }

  /**
   * For every floorplan, verify both image carousels (elevation + gallery):
   * arrow states (next active / prev inactive initially → both active after one
   * tap → next inactive / prev active at the last image) and that every image
   * URL returns HTTP 200. Arrow state is the `disabled` attribute (the inactive
   * arrow is opacity:0, which Playwright still treats as "visible").
   */
  async verifyFloorplanCarousels(): Promise<void> {
    const count = await this.floorplanBlocks.count();
    await reportValue(`Validating carousels for ${count} floorplans`);
    for (let i = 0; i < count; i++) {
      const block = this.floorplanBlocks.nth(i);
      await this.scrollIntoView(block);
      await this.page.waitForTimeout(500);
      const carousels = block.locator("[class*='Multiple_carousel']");
      const carouselCount = await carousels.count();
      for (let c = 0; c < carouselCount; c++) {
        // Each floorplan has two carousels in order: elevation (exterior) then
        // gallery (interior/lifestyle, whose last slide is the "View Gallery"
        // callout). Label them so the report clearly shows BOTH are verified.
        const kind = c === 0 ? "elevation" : c === 1 ? "gallery" : `gallery ${c}`;
        await this.verifyOneCarousel(
          carousels.nth(c),
          `Floorplan #${i + 1} ${kind}`,
        );
      }
    }
  }

  private async verifyOneCarousel(
    carousel: Locator,
    label: string,
  ): Promise<void> {
    const next = carousel.locator("[aria-label='Next slide']").first();
    const prev = carousel.locator("[aria-label='Previous slide']").first();
    const slides = carousel.locator("li[class*='Carousel_slide']");

    // 1. Initial: next active, prev inactive.
    await Validator.requireTrue(
      !(await next.isDisabled()),
      `${label}: next arrow is active initially`,
    );
    await Validator.requireTrue(
      await prev.isDisabled(),
      `${label}: prev arrow is inactive initially`,
    );

    // 2. After one tap on next: both arrows active.
    await next.click();
    await this.page.waitForTimeout(500);
    await Validator.requireTrue(
      !(await next.isDisabled()) && !(await prev.isDisabled()),
      `${label}: both arrows active after first next`,
    );

    // 3. Navigate to the last image: next inactive, prev active.
    for (let i = 0; i < 25; i++) {
      if (await next.isDisabled().catch(() => true)) break;
      await next.click().catch(() => {});
      await this.page.waitForTimeout(350);
    }
    await Validator.requireTrue(
      await next.isDisabled(),
      `${label}: next arrow is inactive at the last image`,
    );
    await Validator.requireTrue(
      !(await prev.isDisabled()),
      `${label}: prev arrow is active at the last image`,
    );

    // 4. Count = number of carousel slides; collect ONE image URL per slide
    // (skip a no-image slide, e.g. the "View Gallery" callout), then assert each
    // returns 200 and log every URL with its status.
    const slideCount = await slides.count();
    const urls: string[] = [];
    for (let i = 0; i < slideCount; i++) {
      const img = slides.nth(i).locator("img").first();
      if ((await img.count()) === 0) continue;
      const url = await img
        .evaluate(
          (im) =>
            (im as HTMLImageElement).currentSrc || (im as HTMLImageElement).src,
        )
        .catch(() => "");
      if (url && url.startsWith("http")) urls.push(url);
    }
    let nonOk = 0;
    for (let i = 0; i < urls.length; i++) {
      const resp = await this.page.request.get(urls[i]).catch(() => null);
      const status = resp ? resp.status() : "ERR";
      if (status !== 200) nonOk++;
      await reportValue(
        `${label} image ${i + 1}/${urls.length}: ${status} ${urls[i]}`,
      );
    }
    await reportValue(
      `${label}: ${slideCount} slides, ${urls.length} images, ${nonOk} non-200`,
    );
    await Validator.requireTrue(
      nonOk === 0,
      `${label}: all ${urls.length} image URLs return 200`,
    );
  }

  // ── Floorplan Mortgage Calculator — Actions ────────────
  async openRandomFloorplanMortgageCalculator(): Promise<void> {
    const count = await this.floorplanCalcTriggers.count();
    const index = Math.floor(Math.random() * Math.max(count, 1));
    await reportValue(
      `Opening mortgage calculator for floorplan #${index + 1}/${count}`,
    );
    const trigger = this.floorplanCalcTriggers.nth(index);

    // The floorplan blocks lazy-render, so the info-icon trigger can detach on
    // scroll. Re-resolve each attempt: scroll the block into view (stabilizes
    // it), tap the icon, and check the popover's "Mortgage Calculator" CTA.
    let opened = false;
    for (let attempt = 0; attempt < 4 && !opened; attempt++) {
      await trigger.scrollIntoViewIfNeeded().catch(() => {});
      await this.page.waitForTimeout(900);
      await trigger.click({ timeout: 4000 }).catch(() => {});
      await this.page.waitForTimeout(900);
      opened = await this.mortgageCalculatorCta
        .first()
        .isVisible()
        .catch(() => false);
    }
    await this.click(this.mortgageCalculatorCta.first(), "Mortgage Calculator");
    await Validator.requireVisible(
      this.calculatorHeading.first(),
      "Mortgage calculator modal should open",
      15000,
    );
  }

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

  async selectLoanTerm(years: "15" | "30"): Promise<void> {
    await this.click(
      this.calculatorModal.getByText(`${years} Year Loan`).first(),
      `${years} Year Loan`,
    );
  }

  async closeMortgageCalculator(): Promise<void> {
    await this.click(this.modalCloseButton.first(), "Close mortgage calculator");
    await Validator.requireHidden(
      this.calculatorHeading.first(),
      "Mortgage calculator should close",
      10000,
    );
  }

  // ── Floorplan Mortgage Calculator — Verification ───────
  async getEstimatedPayment(): Promise<number> {
    const text = (await this.calculatorEstimatedPayment.innerText()).trim();
    return Number(text.replace(/[^0-9.]/g, ""));
  }

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

  /**
   * Capture the top price, run an edit, then assert it recalculated to a new
   * valid amount in the expected direction (after focus change).
   */
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

  // ── Floorplan Meta Data — Verification ─────────────────
  /**
   * For every floorplan, validate the meta data is displayed with real values:
   * Sq ft, Story, Beds, Baths (may be decimal), Cars, Estimated payment,
   * Mortgage-calc info, Starting price, and the lot-premium disclaimer — none
   * empty, zero, or missing. Values are parsed from each floorplan block (the
   * blocks lazy-render, so we scroll each into view) and logged.
   */
  async verifyAllFloorplanMetaData(): Promise<void> {
    const count = await this.floorplanCalcTriggers.count();
    await reportValue(`Validating meta data for ${count} floorplans`);
    for (let i = 0; i < count; i++) {
      const trigger = this.floorplanCalcTriggers.nth(i);
      let text = "";
      for (let attempt = 0; attempt < 3 && !text; attempt++) {
        await trigger.scrollIntoViewIfNeeded().catch(() => {});
        await this.page.waitForTimeout(400);
        text = await trigger
          .evaluate((el) => {
            let block = el as HTMLElement;
            for (let k = 0; k < 6 && block.parentElement; k++) {
              block = block.parentElement;
              if (
                /Sq ?ft/i.test(block.textContent || "") &&
                /Starting price/i.test(block.textContent || "")
              )
                break;
            }
            return (block.textContent || "").replace(/\s+/g, " ").trim();
          })
          .catch(() => "");
      }
      await Validator.requireVisible(
        trigger,
        `Floorplan #${i + 1} meta block should be displayed`,
        15000,
      );

      const name = (text.match(/^(.+?)(?=[\d,]+\s*Sq)/) || [, `#${i + 1}`])[1].trim();
      const numeric: Record<string, RegExpMatchArray | null> = {
        "Sq ft": text.match(/([\d,]+)\s*Sq ?ft/i),
        Story: text.match(/(\d+)\s*Stor(?:y|ies)/i),
        Beds: text.match(/(\d+(?:\.\d+)?)\s*Beds?/i),
        Baths: text.match(/(\d+(?:\.\d+)?)\s*Baths?/i),
        Cars: text.match(/(\d+)\s*Cars?/i),
        "Estimated payment": text.match(/Estimated payment\s*\$([\d,]+)/i),
        "Starting price": text.match(/Starting price\s*\$([\d,]+)/i),
      };
      const issues: string[] = [];
      for (const [label, match] of Object.entries(numeric)) {
        const value = match ? Number(match[1].replace(/,/g, "")) : NaN;
        if (!match || !(value > 0)) issues.push(`${label}=${match ? match[1] : "missing"}`);
      }
      if (!/Mortgage calculation information/i.test(text))
        issues.push("Mortgage calculation information missing");
      if (!/Starting price may include lot premium/i.test(text))
        issues.push("lot-premium disclaimer missing");

      await reportValue(
        `${name}: ${Object.entries(numeric)
          .map(([k, m]) => `${k}=${m ? m[1] : "?"}`)
          .join(", ")}`,
      );
      await Validator.requireTrue(
        issues.length === 0,
        `${name}: all meta data present & non-zero${issues.length ? ` — issues: ${issues.join("; ")}` : ""}`,
      );
    }
  }

  // ── Data Getters ───────────────────────────────────────
  async getHeading(): Promise<string> {
    return await this.getText(this.pageHeading.first());
  }

  async getHomeCardCount(): Promise<number> {
    // The cards lazy-render, so an immediate count() can race to 0; poll briefly.
    for (let i = 0; i < 10; i++) {
      const n = await this.homeCards.count();
      if (n > 0) return n;
      await this.page.waitForTimeout(500);
    }
    return await this.homeCards.count();
  }

  async getStartingPriceText(): Promise<string> {
    return await this.getText(this.startingPrice.first());
  }
}
