import { Page, Locator } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";

export class CommunityDetailPage extends BasePage {
  readonly pageHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.locator("h1");
  }

  // ── Community Detail — Verification ────────────────────
  /**
   * Robust check that we landed on a community detail page:
   *  - the URL is a community detail path (two segments deeper than the state
   *    listing, e.g. /new-construction-homes/texas/<city>/<community>/), and
   *  - a level-1 heading naming the clicked community is visible.
   * Stays valid regardless of which community is featured first.
   */
  async verifyCommunityDetailDisplayed(
    detailUrlPattern: string,
    communityName: string,
  ): Promise<void> {
    await Validator.requireUrlContains(
      this.page,
      detailUrlPattern,
      "Should navigate to a community detail page URL",
    );
    const heading = this.page.getByRole("heading", {
      name: communityName,
      level: 1,
    });
    await Validator.requireVisible(
      heading.first(),
      `Community detail heading "${communityName}" should be visible`,
    );
  }

  // ── Community Detail — Data Getters ────────────────────
  async getHeading(): Promise<string> {
    return await this.getText(this.pageHeading.first());
  }
}
