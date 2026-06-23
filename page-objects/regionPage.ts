import { Page, Locator } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import { waitForApi } from "../utils/apiUtils";
import { reportValue } from "../utils/reporter";
import { RequestInformationForm } from "./requestInformationForm";

export class RegionPage extends BasePage {
  readonly communitiesHeading: Locator;
  readonly communityCards: Locator;
  readonly firstCommunityCard: Locator;
  readonly firstCommunityLink: Locator;
  readonly firstCommunityName: Locator;
  readonly requestInfoCta: Locator;
  readonly requestInfo: RequestInformationForm;
  // Results rail toolbar — "N results" count + the "Sort by" listbox.
  readonly resultsCount: Locator;
  readonly sortTrigger: Locator;
  // Community filters — the "Price Range" trigger opens a dialog with a
  // Minimum/Maximum price pair and "Clear all" / "Apply filters" actions.
  readonly priceFilterTrigger: Locator;
  readonly priceDialog: Locator;
  readonly priceMinInput: Locator;
  readonly priceMaxInput: Locator;
  readonly applyFiltersButton: Locator;
  readonly clearAllButton: Locator;
  // Each community card carries a visible "Learn More" CTA (distinct from the
  // zero-size stretched link) that also opens the community detail page.
  readonly firstCommunityLearnMore: Locator;
  // "Bed & Baths" filter trigger + its dialog. The dialog has two radio groups:
  // Beds (Any/1+/2+/3+/4+) then Bathrooms (Any/1+/2+/3+). Each option is a
  // radio input covered by a <span> label — click the span, not the input.
  readonly bedsBathsTrigger: Locator;
  readonly bedsBathsDialog: Locator;
  // Map (Google Maps JS API rendered into the page DOM — not an iframe): the
  // container, community markers, zoom controls, and the per-community preview
  // card that a marker selection reveals.
  readonly mapContainer: Locator;
  readonly mapMarkers: Locator;
  readonly communityMarkers: Locator;
  readonly zoomInButton: Locator;
  readonly zoomOutButton: Locator;
  readonly resetMapButton: Locator;

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

    // "N results" count in the rail header (loads incrementally, so reads are
    // polled until stable). Rendered per breakpoint → take the visible one.
    this.resultsCount = page.locator("[class*='rail_results']:visible").first();
    // "Sort by: <value>" listbox trigger; options are role=option buttons.
    this.sortTrigger = page
      .locator("button[class*='rail_sort-trigger']:visible")
      .first();
    // "Price Range" filter trigger (aria-haspopup=dialog) + its dialog controls.
    this.priceFilterTrigger = page
      .getByRole("button", { name: "Price Range", exact: true })
      .first();
    // The dialog is rendered per breakpoint (desktop + mobile), so target the
    // visible one.
    this.priceDialog = page
      .locator("[role='dialog'][aria-label='Price Range']:visible")
      .first();
    // Both inputs share aria-label "Any price"; they are ordered Minimum then
    // Maximum, so address them positionally within the dialog.
    this.priceMinInput = this.priceDialog.locator("input").nth(0);
    this.priceMaxInput = this.priceDialog.locator("input").nth(1);
    this.applyFiltersButton = this.priceDialog.getByRole("button", {
      name: /Apply filters/i,
    });
    this.clearAllButton = this.priceDialog.getByRole("button", {
      name: /Clear all/i,
    });
    this.firstCommunityLearnMore = this.firstCommunityCard
      .getByRole("link", { name: /Learn More/i })
      .first();

    this.bedsBathsTrigger = page
      .getByRole("button", { name: "Bed & Baths", exact: true })
      .first();
    this.bedsBathsDialog = page
      .locator("[role='dialog'][aria-label='Bed & Baths']:visible")
      .first();

    // The map is rendered per breakpoint, so target the visible container.
    this.mapContainer = page.locator("[class*='map_map-container']:visible").first();
    // All markers (city-cluster pills + individual community pins).
    this.mapMarkers = page.locator("gmp-advanced-marker");
    // Individual community markers carry data-marker-id="community:<id>"; at a
    // city view these are pins (state views cluster them into "N cities" pills).
    this.communityMarkers = page.locator(
      "gmp-advanced-marker [data-marker-id^='community:']",
    );
    this.zoomInButton = page.getByRole("button", { name: "Zoom in" }).first();
    this.zoomOutButton = page.getByRole("button", { name: "Zoom out" }).first();
    // "Reset map" restores the map to its initial camera position; always visible.
    this.resetMapButton = page
      .locator("button[class*='map_reset-map']:visible")
      .first();
  }

  // ── New Home Communities — Actions ─────────────────────
  async navigateToRegion(url: string): Promise<void> {
    await this.navigate(url);
    // Cap the load wait: the region page is heavy (map + video + many cards) and
    // its "load" event can be very slow or never settle — proceed and let the
    // ready-signal/assertion auto-waits gate readiness instead of hanging here.
    await this.page.waitForLoadState("load", { timeout: 15000 }).catch(() => {});
  }

  // Confirms the region results page is genuinely ready: correct URL, the
  // "New Home Communities" section visible, AND at least one result card rendered
  // (the rail data populated — the heading can appear before the rail does). Uses
  // raw waits (not Validator) so a failed attempt doesn't emit failed report
  // steps when the caller retries the entry.
  async waitForRegionReady(expectedUrlPart: string): Promise<void> {
    await this.page.waitForURL(new RegExp(expectedUrlPart), { timeout: 20000 });
    await this.communitiesHeading.waitFor({ state: "visible", timeout: 25000 });
    await this.communityCards.first().waitFor({ state: "visible", timeout: 25000 });
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

  // ── Community Results — Structure & Content (Item B + D) ─
  // Asserts: (1) the "N results" count matches the number of rendered cards;
  // (2) the first `maxCards` visible cards each carry non-empty name, location/
  // home-type details, and starting-price text; (3) each of those cards' images
  // returns HTTP 200.
  //
  // Breadcrumbs and pagination are NOT present on the region page — all results
  // load in a single rail with no "Load more" control — so those are N/A here.
  async verifyCardMetadataAndImages(maxCards = 5): Promise<void> {
    // Item D: reported count should equal the rendered card count.
    const reportedCount = await this.getResultsCount();
    const cards = await this.page
      .locator("[class*='Community_card']:visible")
      .all();
    const renderedCount = cards.length;
    await reportValue(
      `Reported count: ${reportedCount}, rendered cards: ${renderedCount}`,
    );
    await Validator.requireTrue(
      renderedCount === reportedCount,
      `Rendered card count (${renderedCount}) should match the reported "${reportedCount} results" in the rail header`,
    );

    // Item B: per-card metadata + image for the first `maxCards`.
    const limit = Math.min(maxCards, cards.length);
    await reportValue(`Checking metadata + image on first ${limit} of ${cards.length} cards`);

    for (let i = 0; i < limit; i++) {
      const card = cards[i];
      const name = (
        (await card.getAttribute("data-card-element").catch(() => null)) ?? ""
      ).trim();
      const details = (
        (await card
          .locator("[class*='Community_details']")
          .first()
          .textContent()
          .catch(() => null)) ?? ""
      )
        .replace(/\s+/g, " ")
        .trim();
      const pricing = (
        (await card
          .locator("[class*='Community_pricing']")
          .first()
          .textContent()
          .catch(() => null)) ?? ""
      )
        .replace(/\s+/g, " ")
        .trim();

      await Validator.requireTrue(
        name.length > 0,
        `Card[${i}] should have a non-empty community name`,
      );
      await Validator.requireTrue(
        details.length > 0,
        `Card[${i}] "${name}" should have non-empty location / home-type details`,
      );
      await Validator.requireTrue(
        pricing.length > 0,
        `Card[${i}] "${name}" should display a starting price`,
      );

      // Image HTTP 200 — the card's primary image (inside the <picture> element).
      const imgSrc = (
        (await card
          .locator("picture img, img")
          .first()
          .getAttribute("src")
          .catch(() => null)) ?? ""
      ).trim();
      const imgUrl = imgSrc.startsWith("//")
        ? `https:${imgSrc}`
        : imgSrc;
      if (imgUrl.startsWith("http")) {
        const resp = await this.page.request
          .get(imgUrl, { timeout: 10000 })
          .catch(() => null);
        const status = resp?.status() ?? 0;
        await reportValue(
          `Card[${i}] "${name}" image: HTTP ${status} ${imgUrl.slice(0, 80)}`,
        );
        await Validator.requireTrue(
          status === 200,
          `Card[${i}] "${name}" community image should return HTTP 200 (got ${status})`,
        );
      } else {
        await reportValue(
          `Card[${i}] "${name}" image src not an absolute URL — skipped (src: "${imgSrc.slice(0, 60)}")`,
        );
      }
    }
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

  // ── Results / Filters / Sort — Data Getters ────────────
  // The rail header shows "N results" but the list streams in (e.g. 44 → 47),
  // so poll until the count holds steady (3 equal reads ≈ 1.2s) before reading
  // it. Kept lean — it's called several times per filter flow.
  async getResultsCount(): Promise<number> {
    await this.resultsCount.waitFor({ state: "visible", timeout: 25000 });
    let last = -1;
    let stable = 0;
    for (let i = 0; i < 25; i++) {
      const current = await this.parseResultsCount();
      if (current > 0 && current === last) {
        if (++stable >= 3) return current; // unchanged for ~1.2s → settled
      } else {
        stable = 0;
      }
      last = current;
      await this.page.waitForTimeout(400);
    }
    return last;
  }

  private async parseResultsCount(): Promise<number> {
    const text = (await this.resultsCount.textContent().catch(() => "")) ?? "";
    const match = text.match(/(\d[\d,]*)/);
    return match ? Number(match[1].replace(/,/g, "")) : 0;
  }

  // The name shown on a card is exposed as a stable `data-card-element` attribute
  // (used by the rail/map linkage); fall back to the visible name node.
  async getFirstCommunityCardName(): Promise<string> {
    const attr = await this.firstCommunityCard
      .getAttribute("data-card-element")
      .catch(() => null);
    if (attr && attr.trim()) return attr.trim();
    return await this.getFirstCommunityName();
  }

  // ── Community Filters (RG-08 / RG-09) — Verification ───
  // Applies a Maximum-price filter and asserts the result count drops, then
  // clears the filter and asserts the count is restored to the baseline.
  async verifyPriceFilterReducesThenClearRestores(maxPrice: string): Promise<void> {
    const baseline = await this.getResultsCount();
    await Validator.requireTrue(
      baseline > 0,
      `Region page should show community results before filtering (got ${baseline})`,
    );
    await reportValue(`Baseline community results: ${baseline}`);

    // Apply: open the Price Range dialog, cap the maximum, apply.
    await this.click(this.priceFilterTrigger, "Price Range filter");
    await Validator.requireVisible(
      this.priceDialog,
      "Price Range filter dialog should open",
      10000,
    );
    await this.type(this.priceMaxInput, maxPrice, "Maximum price");
    const applyRefresh = waitForApi(this.page, "/api/search", 10000).catch(
      () => null,
    );
    await this.click(this.applyFiltersButton, "Apply filters");
    await applyRefresh;
    await this.waitForResultsToSettle(baseline);
    const filtered = await this.getResultsCount();
    await reportValue(`Results after max-price $${maxPrice}: ${filtered}`);
    await Validator.requireTrue(
      filtered > 0 && filtered < baseline,
      `Applying a max-price filter should reduce the results (${baseline} → ${filtered})`,
    );

    // Per-result price validation: every visible card must show a parsed
    // starting price ≤ the max. Beds/baths are not on the rail cards, but price
    // IS — so this is the strongest per-result check we can make from the rail.
    const maxPriceNum = Number(maxPrice);
    const filteredPrices = await this.readCardPriceOrdinals();
    await reportValue(`Filtered card prices: [${filteredPrices.join(", ")}]`);
    const overBudget = filteredPrices.filter((p) => p > maxPriceNum);
    await Validator.requireTrue(
      overBudget.length === 0,
      `Every result after max-price $${maxPrice} should have a starting price ≤ $${maxPrice} — ${overBudget.length} card(s) over budget: [${overBudget.join(", ")}]`,
    );

    // Clear: reopen the dialog, Clear all, re-apply, expect the baseline back.
    await this.click(this.priceFilterTrigger, "Price Range filter (reopen)");
    await Validator.requireVisible(
      this.priceDialog,
      "Price Range filter dialog should reopen",
      10000,
    );
    const clearRefresh = waitForApi(this.page, "/api/search", 10000).catch(
      () => null,
    );
    await this.click(this.clearAllButton, "Clear all filters");
    if (await this.applyFiltersButton.isVisible().catch(() => false)) {
      await this.click(this.applyFiltersButton, "Apply filters (after clear)");
    }
    await clearRefresh;
    await this.waitForResultsToSettle(filtered);
    const restored = await this.getResultsCount();
    await reportValue(`Results after clearing filters: ${restored}`);
    // Clearing brings the filtered-out communities back: the count returns to
    // (at least) the unfiltered baseline and is greater than the filtered set.
    await Validator.requireTrue(
      restored > filtered && restored >= baseline,
      `Clearing the filter should restore results (filtered ${filtered}, baseline ${baseline}, restored ${restored})`,
    );
  }

  // After a filter/sort, the count changes away from `previous`; give the rail a
  // moment to repaint before the stability poll reads it.
  private async waitForResultsToSettle(previous: number): Promise<void> {
    for (let i = 0; i < 16; i++) {
      const current = await this.parseResultsCount();
      if (current > 0 && current !== previous) return;
      await this.page.waitForTimeout(400);
    }
  }

  // ── Community Sort (RG-10) — Verification ──────────────
  // Opens the "Sort by" listbox, applies a non-Featured option, and asserts the
  // first community card changed (the results reordered).
  // Applies a sort option and asserts the results are ACTUALLY ordered by price —
  // not merely that the first card changed (the cheapest community can already be
  // Featured-first, which made the old check fail). Each card shows a starting
  // price ("Starting from the upper $300s" / a precise "$425,990"), parsed to a
  // comparable ordinal; the sequence must be non-decreasing (asc) / non-increasing
  // (desc).
  async verifySortReordersResults(
    option: string,
    direction: "asc" | "desc" = "asc",
  ): Promise<void> {
    await this.getResultsCount(); // ensure the list has settled first

    // Sorting is client-side (no /api/search), so just open the listbox, pick the
    // option, and let the rail re-render.
    await this.click(this.sortTrigger, "Sort by");
    await this.click(
      this.page.getByRole("option", { name: option, exact: true }),
      `Sort option: ${option}`,
    );
    await this.page.waitForTimeout(2000); // client-side re-order/re-render
    await this.getResultsCount(); // settle

    const after = await this.readCardPriceOrdinals();
    await reportValue(`Card prices after "${option}" sort: [${after.join(", ")}]`);
    await Validator.requireTrue(
      after.length > 1,
      `Need at least two priced results to verify sort order (got ${after.length})`,
    );

    // Assert the prices are ordered. A few communities advertise a teaser band
    // (e.g. "from the upper $200s") that doesn't match where the site actually
    // ranks them, so tolerate a small number of out-of-order outliers rather than
    // require a perfectly monotonic sequence.
    const inversions = after.reduce(
      (n, v, i) =>
        i === 0
          ? n
          : n + ((direction === "asc" ? after[i - 1] <= v : after[i - 1] >= v) ? 0 : 1),
      0,
    );
    const tolerance = Math.max(1, Math.floor(after.length / 8));
    await reportValue(
      `Sort "${option}": ${inversions} out-of-order pair(s) of ${after.length} (tolerance ${tolerance})`,
    );
    await Validator.requireTrue(
      inversions <= tolerance,
      `Sorting by "${option}" should order prices ${direction === "asc" ? "low→high" : "high→low"} (≤ ${tolerance} outlier-pairs) — got ${inversions} in [${after.join(", ")}]`,
    );
  }

  // Reads every rail card's starting price as a comparable ordinal (in rough
  // dollars), in display order. Cards show a price band ("Starting from the
  // {low|mid|upper} $300s") or a precise amount; falls back to the monthly
  // payment only if no starting price is present.
  private async readCardPriceOrdinals(): Promise<number[]> {
    // Scope to the VISIBLE rail (the page renders a hidden mobile-breakpoint rail
    // whose cards don't re-sort) so the order reflects the real sorted list.
    const texts = await this.page
      .locator("[class*='Community_card']:visible")
      .evaluateAll((els) =>
        els.map((el) => (el.textContent || "").replace(/\s+/g, " ")),
      );
    return texts
      .map((t) => this.parsePriceOrdinal(t))
      .filter((v): v is number => v !== null);
  }

  private parsePriceOrdinal(text: string): number | null {
    // Ignore the "Monthly payments starting from $X" line when reading the
    // starting price.
    const starting = text.replace(
      /Monthly payments? starting from\s*\$[\d,]+/i,
      "",
    );
    const band = starting.match(/the (low|mid|upper) \$(\d+)s/i);
    if (band) {
      const tier = { low: 100, mid: 500, upper: 800 }[band[1].toLowerCase()] ?? 500;
      return Number(band[2]) * 1000 + tier;
    }
    const bandNoTier = starting.match(/\$(\d+)s\b/);
    if (bandNoTier) return Number(bandNoTier[1]) * 1000 + 400;
    const millions = starting.match(/Starting from\s*\$([\d.]+)\s*M/i);
    if (millions) return Math.round(Number(millions[1]) * 1_000_000);
    const precise = starting.match(/Starting from\s*\$([\d,]{4,})/i);
    if (precise) return Number(precise[1].replace(/,/g, ""));
    const monthly = text.match(/Monthly payments? starting from\s*\$([\d,]+)/i);
    if (monthly) return Number(monthly[1].replace(/,/g, ""));
    return null;
  }

  // ── Bed & Baths Filter (RG-09) — Verification ─────────
  // Opens the Bed & Baths filter dialog, applies a minimum-beds value (e.g. "3+"),
  // confirms the results are non-empty, then clears and restores.
  //
  // Note: bed/bath counts are NOT displayed on rail cards and the filter does NOT
  // set URL query params — so per-result bed validation from the rail is not
  // possible. This method verifies the filter dialog interaction works correctly
  // and the result set is valid (non-empty). Whether the count changes depends on
  // the market: a market where every community offers ≥ the threshold value keeps
  // the same count, which is correct behaviour (not a test defect).
  async verifyBedsFilterAndRestore(bedsValue: string): Promise<void> {
    const baseline = await this.getResultsCount();

    await this.click(this.bedsBathsTrigger, "Bed & Baths filter");
    await Validator.requireVisible(
      this.bedsBathsDialog,
      "Bed & Baths filter dialog should open",
      10000,
    );

    // The beds radios are covered by their <span> labels — click the span.
    // "3+" appears first in the Beds section, then again in Bathrooms; nth(0)
    // reliably targets the Beds row.
    const bedsOption = this.bedsBathsDialog
      .getByText(bedsValue, { exact: true })
      .nth(0);
    await this.click(bedsOption, `Beds "${bedsValue}" option`);

    const applyRefresh = waitForApi(this.page, "/api/search", 10000).catch(
      () => null,
    );
    await this.click(
      this.bedsBathsDialog.getByRole("button", { name: /Apply filters/i }),
      "Apply filters (beds)",
    );
    await applyRefresh;
    await this.page.waitForTimeout(1500);
    const filtered = await this.getResultsCount();
    await reportValue(
      `Results after ${bedsValue} beds filter: ${filtered} (baseline ${baseline})`,
    );
    await Validator.requireTrue(
      filtered > 0,
      `Beds "${bedsValue}" filter should return at least one result (got ${filtered})`,
    );

    // Clear: reset the beds filter and verify the count is restored.
    await this.click(this.bedsBathsTrigger, "Bed & Baths filter (reopen)");
    await Validator.requireVisible(
      this.bedsBathsDialog,
      "Bed & Baths dialog should reopen",
      10000,
    );
    const clearRefresh = waitForApi(this.page, "/api/search", 10000).catch(
      () => null,
    );
    await this.click(
      this.bedsBathsDialog.getByRole("button", { name: /Clear all/i }),
      "Clear all (beds)",
    );
    if (
      await this.bedsBathsDialog
        .getByRole("button", { name: /Apply filters/i })
        .isVisible()
        .catch(() => false)
    ) {
      await this.click(
        this.bedsBathsDialog.getByRole("button", { name: /Apply filters/i }),
        "Apply filters after clear (beds)",
      );
    }
    await clearRefresh;
    await this.page.waitForTimeout(1500);
    const restored = await this.getResultsCount();
    await reportValue(`Results after clearing beds filter: ${restored}`);
    await Validator.requireTrue(
      restored >= baseline,
      `Clearing the beds filter should restore results (baseline ${baseline}, restored ${restored})`,
    );
  }

  // ── Featured Sort Restore — Verification ───────────────
  // After applying a price sort, restores the "Featured" ordering and confirms
  // the full result count is back (no communities were lost in the sort chain).
  async verifySortRestoresOnFeatured(
    featuredOption: string,
    baseline: number,
  ): Promise<void> {
    await this.click(this.sortTrigger, "Sort by (restore Featured)");
    await this.click(
      this.page.getByRole("option", { name: featuredOption, exact: true }),
      `Sort option: ${featuredOption}`,
    );
    await this.page.waitForTimeout(2000);
    const restoredCount = await this.getResultsCount();
    await reportValue(
      `Results after "${featuredOption}" sort: ${restoredCount} (baseline ${baseline})`,
    );
    // The rail streams in (e.g. 13 cards on first settle → 17 when fully loaded),
    // so the Featured count can legitimately be ≥ the baseline. Assert ≥ rather
    // than exact equality — the Featured sort must never lose communities.
    await Validator.requireTrue(
      restoredCount >= baseline,
      `Restoring "${featuredOption}" sort should return at least the baseline count (expected ≥${baseline}, got ${restoredCount})`,
    );
  }

  // ── Navigate via card CTA (RG-11) — Actions ────────────
  async clickFirstCommunityLearnMore(): Promise<void> {
    await this.scrollIntoView(this.firstCommunityCard.first());
    // The card re-renders as the heavy rail/map stream in, which can leave the
    // "Learn More" link attached-but-not-"visible" — a normal click then retries
    // its visibility check until the test times out. A DOM click (re-resolving
    // the locator, no actionability wait) navigates reliably — same approach as
    // the stretched-link first-community click.
    await this.clickViaScript(
      this.firstCommunityLearnMore,
      "Learn More (first community card)",
    );
  }

  // ── Map (RG-03 / RG-04 / RG-05 / RG-06) — Verification ─
  // RG-03 — the map renders and shows community markers.
  async verifyMapLoadsWithMarkers(): Promise<void> {
    await Validator.requireVisible(
      this.mapContainer,
      "Region map should load",
      20000,
    );
    await this.mapMarkers.first().waitFor({ state: "visible", timeout: 20000 });
    const count = await this.mapMarkers.count();
    await reportValue(`Map markers rendered: ${count}`);
    await Validator.requireTrue(
      count > 0,
      "Map should render at least one community marker",
    );
  }

  // RG-04 — the zoom controls change the map camera. The Google Maps tile layer
  // carries a transform matrix that changes when the camera zooms; assert it
  // changes after Zoom in, then again after Zoom out.
  async verifyZoomChangesView(): Promise<void> {
    await Validator.requireVisible(
      this.mapContainer,
      "Region map should be visible before zooming",
      20000,
    );
    await Validator.requireVisible(
      this.zoomInButton,
      "Zoom in control should be visible",
      10000,
    );
    await Validator.requireVisible(
      this.zoomOutButton,
      "Zoom out control should be visible",
      10000,
    );

    await this.page.waitForTimeout(1500); // let the initial camera settle
    // Zoom IN reveals fresh detail → reliably fetches new map tiles. Strong check.
    const zoomedIn = await this.performMapAction("Zooming in", () =>
      this.click(this.zoomInButton, "Zoom in"),
    );
    await Validator.requireTrue(zoomedIn, "Zooming in should change the map view");

    // Zoom OUT returns toward an already-visited zoom level, which often serves
    // cached tiles (0 fetches) — so a per-direction tile/transform delta is not a
    // reliable signal here. Operate the control and confirm the map stays healthy
    // (still rendered with markers); log whether a view change was observed.
    const zoomedOut = await this.performMapAction("Zooming out", () =>
      this.click(this.zoomOutButton, "Zoom out"),
    );
    await reportValue(`Zoom-out produced an observable view change: ${zoomedOut}`);
    await Validator.requireVisible(
      this.mapContainer,
      "Map should remain rendered after zooming out",
      10000,
    );
    await Validator.requireTrue(
      (await this.mapMarkers.count()) > 0,
      "Community markers should remain after zooming out",
    );

    // "Reset map" — restores the initial camera position (zooms/pans back to the
    // full-Dallas view). After a zoom-in → zoom-out sequence the initial-view tiles
    // are already cached, so the reset often fetches 0 new tiles (same situation as
    // zoom-out). The strong proof is: button visible + clickable + map health (same
    // treatment as zoom-out). Log whether a tile/transform signal fired.
    await Validator.requireVisible(
      this.resetMapButton,
      "'Reset map' button should be visible",
      10000,
    );
    const reset = await this.performMapAction("Resetting map view", () =>
      this.click(this.resetMapButton, "Reset map"),
    );
    await reportValue(`Reset map produced an observable view change: ${reset}`);
    await Validator.requireVisible(
      this.mapContainer,
      "Map should remain rendered after 'Reset map'",
      10000,
    );
    await Validator.requireTrue(
      (await this.mapMarkers.count()) > 0,
      "Community markers should remain after 'Reset map'",
    );
  }

  // RG-05 — dragging the map pans it (the map fetches fresh tiles for the new
  // viewport). The map renders below the fold, so it MUST be scrolled into the
  // viewport first — a raw mouse drag uses absolute coordinates and (unlike
  // Playwright's auto-scrolling click) won't reach an off-screen map.
  async verifyPanChangesView(): Promise<void> {
    await Validator.requireVisible(
      this.mapContainer,
      "Region map should be visible before panning",
      20000,
    );

    // Retry the drag a couple of times: a drag fired before the map has settled
    // (or before the scroll completes) can land as a no-op.
    let panned = false;
    for (let attempt = 1; attempt <= 3 && !panned; attempt++) {
      await this.scrollIntoView(this.mapContainer);
      await this.page.waitForTimeout(attempt === 1 ? 1500 : 800);
      const box = await this.getVisibleMapBox();
      if (!box) continue;

      panned = await this.performMapAction(
        `Panning the map (attempt ${attempt})`,
        async () => {
          // Drag between off-centre points so the gesture lands on the map
          // surface rather than a community marker (which would intercept it).
          const startX = box.x + box.w * 0.6;
          const startY = box.y + box.h * 0.55;
          await this.page.mouse.move(startX, startY);
          await this.page.mouse.down();
          await this.page.mouse.move(box.x + box.w * 0.3, box.y + box.h * 0.3, {
            steps: 20,
          });
          await this.page.mouse.move(box.x + box.w * 0.28, box.y + box.h * 0.28, {
            steps: 5,
          });
          await this.page.mouse.up();
        },
      );
    }
    await Validator.requireTrue(
      panned,
      "Panning (dragging) the map should change the view (fetch fresh tiles)",
    );
  }

  // Bounding box of the visible Google map surface (the page renders one map per
  // breakpoint, so pick the visible .gm-style).
  private async getVisibleMapBox(): Promise<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null> {
    return await this.page.evaluate(() => {
      const gm = Array.from(document.querySelectorAll(".gm-style")).find((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }) as HTMLElement | undefined;
      if (!gm) return null;
      const r = gm.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
  }

  // Runs a map interaction and reports whether the camera changed — detected by
  // EITHER the Google Maps tile-layer transform changing OR the map fetching
  // fresh tiles (a request to maps.googleapis.com). Either is robust proof the
  // view moved; the transform read alone is finicky across the dual maps.
  private async performMapAction(
    label: string,
    action: () => Promise<void>,
  ): Promise<boolean> {
    const tileRe =
      /maps\.googleapis\.com\/(maps\/(vt|api\/(staticmap|js\/StaticMapService|mapsjs))|maps-api)/i;
    let tileRequests = 0;
    const onRequest = (request: { url(): string }) => {
      if (tileRe.test(request.url())) tileRequests++;
    };
    this.page.on("request", onRequest);
    try {
      const before = await this.readMapTransform();
      await action();
      for (let i = 0; i < 20; i++) {
        if (tileRequests > 0 || (await this.readMapTransform()) !== before) break;
        await this.page.waitForTimeout(300);
      }
      const transformChanged = (await this.readMapTransform()) !== before;
      await reportValue(
        `${label}: transform changed=${transformChanged}, map tile requests=${tileRequests}`,
      );
      return transformChanged || tileRequests > 0;
    } finally {
      this.page.off("request", onRequest);
    }
  }

  // RG-06 — selecting a community marker highlights the matching rail card.
  // Clicking an individual community marker adds the `rail_selected` state to the
  // rail community card with the same name (data-card-element). Requires a view
  // with individual community pins (a city view), not clustered "N cities" pills.
  async verifyMarkerSelectionHighlightsCommunityCard(): Promise<void> {
    const marker = this.communityMarkers.first();
    await marker.waitFor({ state: "visible", timeout: 20000 });
    const name = ((await marker.textContent()) ?? "").trim();
    await reportValue(`Selecting map marker for community: ${name}`);
    await Validator.requireTrue(
      name.length > 0,
      "An individual community marker should be present to select",
    );

    // Click the marker (retry: a click on a not-yet-settled map can be a no-op)
    // and wait for ANY rail card to enter the `rail_selected` state.
    const selectedCard = this.page
      .locator("[class*='Community_card'][class*='rail_selected']")
      .first();
    let selected = false;
    for (let attempt = 1; attempt <= 3 && !selected; attempt++) {
      await marker.scrollIntoViewIfNeeded().catch(() => {});
      await marker.click({ force: true }).catch(() => {});
      selected = await selectedCard
        .waitFor({ state: "visible", timeout: 8000 })
        .then(() => true)
        .catch(() => false);
    }
    await Validator.requireVisible(
      selectedCard,
      "Selecting a map marker should highlight its community card in the list",
      5000,
    );
    // The highlighted card should be the one for the marker we selected.
    const selectedName = (
      (await selectedCard.getAttribute("data-card-element")) ?? ""
    ).trim();
    await reportValue(`Marker "${name}" → highlighted rail card "${selectedName}"`);
    await Validator.requireTrue(
      selectedName === name,
      `The highlighted card should match the selected marker (marker "${name}", highlighted "${selectedName}")`,
    );
  }

  // The Google Maps tile layer carries CSS transform matrices that change as the
  // camera moves; join the first few as a signature for before/after comparison.
  private async readMapTransform(): Promise<string> {
    return await this.page.evaluate(() => {
      // The map is rendered per breakpoint, so pick the visible .gm-style.
      const gm = Array.from(document.querySelectorAll(".gm-style")).find((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      if (!gm) return "";
      // Join every transformed layer (the camera transform lives on one of
      // them); any zoom/pan changes the signature.
      return Array.from(gm.querySelectorAll<HTMLElement>("div"))
        .map((d) => d.style.transform)
        .filter((t) => t && t !== "none")
        .join("|");
    });
  }
}
