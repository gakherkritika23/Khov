import { Page, Locator } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import { RequestInformationForm } from "./requestInformationForm";

export class RegionPage extends BasePage {
  readonly communitiesHeading: Locator;
  readonly communityCards: Locator;
  readonly firstCommunityCard: Locator;
  readonly firstCommunityLink: Locator;
  readonly firstCommunityName: Locator;
  readonly requestInfoCta: Locator;
  readonly requestInfo: RequestInformationForm;

  constructor(page: Page) {
    super(page);
    // "New Home Communities" section heading on the region page. The page can
    // render more than one matching heading (e.g. a visually-hidden + visible
    // one), so scope to the first to avoid a strict-mode violation.
    this.communitiesHeading = page
      .getByRole("heading", {
        name: "New Home Communities",
      })
      .first();
    // Each result is a Community card (CSS-module class — match by stable prefix).
    this.communityCards = page.locator("[class*='Community_card']");
    this.firstCommunityCard = this.communityCards.first();
    // The whole card is navigable via a zero-size "stretched link" anchor.
    this.firstCommunityLink = this.firstCommunityCard.locator(
      "[class*='Community_stretched-link']",
    );
    this.firstCommunityName = this.firstCommunityCard.locator(
      "[class*='Community_name']",
    );
    // "Request Information" CTA on the first community card — opens the shared
    // Request Information modal (same component as the detail pages).
    this.requestInfoCta = this.firstCommunityCard
      .getByRole("button", { name: /Request Information/i })
      .or(
        this.firstCommunityCard.getByRole("link", {
          name: /Request Information/i,
        }),
      )
      .first();
    this.requestInfo = new RequestInformationForm(page);
  }

  // ── New Home Communities — Actions ─────────────────────
  async navigateToRegion(url: string): Promise<void> {
    await this.navigate(url);
    await this.page.waitForLoadState("load");
  }

  // ── New Home Communities — Verification ────────────────
  async verifyOnRegionPage(expectedUrlPart: string): Promise<void> {
    await Validator.requireUrlContains(
      this.page,
      expectedUrlPart,
      `URL should contain "${expectedUrlPart}" on the region page`,
    );
  }

  async verifyCommunitiesSectionIsDisplayed(): Promise<void> {
    // The region page is heavy (map + many cards); allow generous time on prod.
    await Validator.requireVisible(
      this.communitiesHeading,
      "The 'New Home Communities' section should be visible",
      25000,
    );
  }

  // ── New Home Communities — Actions ─────────────────────
  async clickFirstCommunity(): Promise<void> {
    // No scrollIntoView: the region card list re-renders as the map/data load,
    // which makes the first card "unstable". clickViaScript does a DOM click
    // (re-resolving the locator), so the element need not be in the viewport.
    await this.clickViaScript(this.firstCommunityLink, "first community card");
  }

  // ── New Home Communities — Data Getters ────────────────
  async getFirstCommunityName(): Promise<string> {
    // Cards can render slightly after the section heading on a slow prod load.
    await this.firstCommunityName
      .first()
      .waitFor({ state: "visible", timeout: 25000 });
    return await this.getText(this.firstCommunityName.first());
  }

  // ── Request Information — Actions ──────────────────────
  async verifyRequestInfoCtaIsDisplayed(): Promise<void> {
    await this.scrollIntoView(this.firstCommunityCard.first());
    await Validator.requireVisible(
      this.requestInfoCta,
      "'Request Information' CTA should be visible on the first community card",
      20000,
    );
  }

  async openRequestInformationModal(): Promise<void> {
    // The results page can show a prod-only promo/lead modal whose `Modal_overlay`
    // intercepts pointer events over the card CTA. The CTA is a react-aria
    // pressable (needs a REAL pointer event — a DOM .click() won't fire it), so
    // rather than a DOM click we let the real click reach it by disabling the
    // overlay's pointer-events first. No-op on envs without the promo (e.g. dev).
    await this.handlePagePopups();
    await this.scrollIntoView(this.firstCommunityCard.first());
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (await this.requestInfo.modal.isVisible().catch(() => false)) {
        return;
      }
      // A prod-only promo `Modal_overlay` can intercept pointer events over the
      // CTA; let the real click pass through it. The CTA is a react-aria
      // pressable (needs a real pointer event — a DOM .click() won't fire it),
      // and opening the modal covers the button, so force:true (skips the
      // post-click actionability wait) avoids a hang.
      await this.letClicksPassThroughOverlay();
      await this.requestInfoCta.first().click({ force: true }).catch(() => {});
      console.log("Clicked on: Request Information CTA (first community card)");
      // Did the press register? The modal request is reflected in the URL. If
      // so, wait for the form WITHOUT re-clicking (a second press resets the
      // modal's loading spinner); only re-press when the click didn't take.
      const pressRegistered = await this.page
        .waitForURL(/modalKey=request-information/, { timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (pressRegistered) {
        await Validator.requireVisible(
          this.requestInfo.modal,
          "Request Information modal should open from the first community card",
          25000,
        );
        return;
      }
    }
    await Validator.requireVisible(
      this.requestInfo.modal,
      "Request Information modal should open from the first community card",
      10000,
    );
  }

  // Disables pointer-events on any visible promo/lead `Modal_overlay` so a real
  // pointer click reaches the (react-aria pressable) card CTA behind it. Targets
  // only the generic Modal_overlay backdrop, never the Request Information modal.
  private async letClicksPassThroughOverlay(): Promise<void> {
    await this.page
      .evaluate(() => {
        document
          .querySelectorAll("[class*='Modal_overlay']")
          .forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              (el as HTMLElement).style.pointerEvents = "none";
            }
          });
      })
      .catch(() => {});
  }
}
