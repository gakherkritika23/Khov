import { Page, Locator } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";

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
    await Validator.requireUrlContains(
      this.page,
      detailUrlPattern,
      "Should open a home / floorplan detail page (one level deeper)",
      20000,
    );
    await Validator.requireVisible(
      this.pageHeading.first(),
      "Detail page heading should be visible",
      20000,
    );
  }

  // ── Floorplan / Home Cards — Actions ───────────────────
  async openFirstHomeDetails(): Promise<void> {
    await this.scrollIntoView(this.viewHomeDetailsCta.first());
    await this.click(this.viewHomeDetailsCta.first(), "View Home Details (first card)");
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
