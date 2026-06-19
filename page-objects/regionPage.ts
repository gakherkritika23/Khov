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

  // Opens the first community card's Request Information modal and resolves to
  // whether the modal's FORM became visible. Returns `false` (rather than
  // throwing) when the form never renders.
  async openRequestInformationModal(): Promise<boolean> {
    // Reaching this page via the SPA search-navigation leaves the app in a state
    // where the card CTA will NOT mount the modal — the click sets the modal
    // deep-link on the URL but the modal component never renders (verified: the
    // URL updates yet the modal element count stays 0). A FULL page load renders
    // the modal from the CTA reliably, so reload the results page first to swap
    // the SPA-nav state for a clean full-load state, then interact.
    await this.page
      .reload({ waitUntil: "domcontentloaded", timeout: 60000 })
      .catch(() => {});
    await this.handlePagePopups();
    await this.scrollIntoView(this.firstCommunityCard.first());
    const cta = this.requestInfoCta.first();
    await cta.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});

    // The CTA is a react-aria pressable on an asynchronously-hydrated card. The
    // full pointer sequence is dispatched in-page atomically (no slowMo gap for
    // the card to detach into — more reliable than a Playwright click). Retry
    // only while the modal CONTAINER has not appeared, and never re-press once it
    // has: a second react-aria press resets the loading spinner so the form never
    // renders. The 8s wait is generous enough that a slow-but-successful open is
    // never re-pressed.
    let opened = false;
    for (let attempt = 1; attempt <= 3 && !opened; attempt++) {
      await this.pressAtomically(cta);
      console.log(
        `Clicked on: Request Information CTA (first community card) — attempt ${attempt}`,
      );
      opened = await this.isVisible(this.requestInfo.modal, 8000);
    }
    if (!opened) return false;

    // Form-loaded gate: the first input renders only after the remote form fetch
    // completes. Container/spinner being up is not enough. true → form usable;
    // false → fetch never resolved (genuine remote block).
    return await this.requestInfo.firstName
      .waitFor({ state: "visible", timeout: 40000 })
      .then(() => true)
      .catch(() => false);
  }
}
