import { Page, Locator } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import { waitForApi } from "../utils/apiUtils";
import { dismissCookieBanner } from "../utils/cookieUtils";

export class HomePage extends BasePage {
  readonly searchInput: Locator;
  readonly resultsHeading: Locator;

  constructor(page: Page) {
    super(page);
    // Hero search box — react-aria searchbox exposed via its aria-label.
    // The element's id is dynamically generated, so we resolve it by role.
    this.searchInput = page.getByRole("searchbox", { name: "Search input" });
    // Destination (results) page heading, e.g. "Dallas New Homes".
    this.resultsHeading = page.locator("h1");
  }

  // ── Hero Search — Actions ──────────────────────────────
  async navigateToHome(url: string): Promise<void> {
    await this.navigate(url);
    // Best-effort hydration wait: the home page's "load" event can be slow
    // (hero video), so cap it and proceed — the search box assertion auto-waits.
    await this.page.waitForLoadState("load", { timeout: 15000 }).catch(() => {});
    await dismissCookieBanner(this.page);
  }

  /**
   * Types a term into the hero search box, waits for the suggestions API to
   * respond, then clicks the matching auto-suggestion option.
   * The suggestion is rendered as a link whose accessible name equals the value.
   */
  async searchAndSelectSuggestion(
    term: string,
    suggestion: string,
    searchEndpoint: string,
  ): Promise<void> {
    // React hydration can discard the very first keystrokes (resetting the
    // controlled input to empty and never calling the suggestions API). Retry
    // typing until the search API responds.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const suggestionsLoaded = waitForApi(this.page, searchEndpoint, 6000);
      await this.typeSequentially(this.searchInput, term, "Hero search input");
      try {
        await suggestionsLoaded;
        break;
      } catch {
        if (attempt === maxAttempts) {
          throw new Error(
            `Suggestions API "${searchEndpoint}" did not respond after ${maxAttempts} attempts`,
          );
        }
        console.log(
          `Suggestions not loaded (attempt ${attempt}); retrying after hydration…`,
        );
      }
    }

    const option = this.page.getByRole("link", {
      name: suggestion,
      exact: true,
    });
    await this.click(option, `${suggestion} suggestion`);
  }

  // ── Hero Search — Verification ─────────────────────────
  async verifySearchInputIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.searchInput,
      "Hero search input should be visible on the Home page",
    );
  }

  async verifyResultsPageDisplayed(
    expectedUrlPart: string,
    expectedHeading: string,
  ): Promise<void> {
    await Validator.requireUrlContains(
      this.page,
      expectedUrlPart,
      `URL should contain "${expectedUrlPart}" after selecting the suggestion`,
    );
    await Validator.requireText(
      this.resultsHeading.first(),
      expectedHeading,
      `Results heading should read "${expectedHeading}"`,
    );
  }

  // ── Hero Search — Data Getters ─────────────────────────
  async getResultsHeading(): Promise<string> {
    return await this.getText(this.resultsHeading.first());
  }
}
