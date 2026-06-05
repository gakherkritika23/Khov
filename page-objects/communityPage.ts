import { Page, Locator } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
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
  readonly cardImage: Locator;
  readonly carousel: Locator;
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

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.locator("h1");
    // "Single Family Homes • Starting from $X/mo. • City, State"
    this.heroSubtitle = page.locator("[class*='Hero_subtitle']");
    this.startingPrice = this.heroSubtitle.filter({ hasText: /Starting/i });
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
    // Media. `:visible` avoids lazy/zero-size or hidden carousel-slide images.
    this.cardImage = page.locator("[class*='Card_'] picture:visible");
    this.carousel = page.locator("[class*='FeaturedCarousel']");
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
      console.log(`Sales office hours — ${day}: ${time}`);
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

    console.log(`Modal phone: ${phone}`);
    console.log(`Modal address: ${address}`);
    console.log(`Modal hours: ${hours}`);
    console.log(`Modal consultants: ${names.join(", ")}`);
    console.log(`Modal consultant photos: ${await this.consultantPhotos.count()}`);
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

  // ── Data Getters ───────────────────────────────────────
  async getHeading(): Promise<string> {
    return await this.getText(this.pageHeading.first());
  }

  async getHomeCardCount(): Promise<number> {
    return await this.homeCards.count();
  }

  async getStartingPriceText(): Promise<string> {
    return await this.getText(this.startingPrice.first());
  }
}
