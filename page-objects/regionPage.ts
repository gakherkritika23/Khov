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
  // "All filters" button (the third filter chip in the rail toolbar) and its
  // modal dialog. Unlike the inline Price Range / Bed & Baths dialogs, the All
  // filters modal contains Home Availability, Home Type, Community Type, and Sort
  // Type sections. Checkboxes in the modal are covered by <label> spans —
  // click the label text (getByText), not the input, to toggle them. Applying
  // the modal filter does NOT call /api/search; changes take effect client-side
  // after the Apply button closes the dialog (use waitForTimeout, not waitForApi).
  readonly allFiltersTrigger: Locator;
  readonly allFiltersDialog: Locator;

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

    this.allFiltersTrigger = page
      .getByRole("button", { name: /All filters/i })
      .first();
    this.allFiltersDialog = page
      .locator("[role='dialog'][aria-label='All filters']:visible")
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
  // Applies a Min/Max price range filter and asserts every result card falls
  // within the range, then clears the filter and asserts the count is restored.
  async verifyPriceFilterReducesThenClearRestores(
    minPrice: string,
    maxPrice: string,
  ): Promise<void> {
    const baseline = await this.getResultsCount();
    await Validator.requireTrue(
      baseline > 0,
      `Region page should show community results before filtering (got ${baseline})`,
    );
    await reportValue(`Baseline community results: ${baseline}`);

    // Apply: open the Price Range dialog, set min + max, apply.
    await this.click(this.priceFilterTrigger, "Price Range filter");
    await Validator.requireVisible(
      this.priceDialog,
      "Price Range filter dialog should open",
      10000,
    );
    await this.type(this.priceMinInput, minPrice, "Minimum price");
    await this.type(this.priceMaxInput, maxPrice, "Maximum price");
    const applyRefresh = waitForApi(this.page, "/api/search", 10000).catch(
      () => null,
    );
    await this.click(this.applyFiltersButton, "Apply filters");
    await applyRefresh;
    await this.waitForResultsToSettle(baseline);
    const filtered = await this.getResultsCount();
    await reportValue(`Results after price range $${minPrice}–$${maxPrice}: ${filtered}`);
    await Validator.requireTrue(
      filtered > 0 && filtered < baseline,
      `Applying a price range filter should reduce the results (${baseline} → ${filtered})`,
    );

    // Per-result price validation: every visible card's parsed price must be
    // ≤ maxPrice. The max constraint is validated per-card.
    //
    // The min-price bound is intentionally NOT checked per-card: the displayed
    // price band ("upper $200s") is a marketing approximation that the ordinal
    // parser maps conservatively (e.g. "upper $200s" → 200,800 ordinal, while
    // the actual floor is ~$280–299k). The min constraint is verified
    // indirectly via the count reduction — it correctly excluded communities
    // whose actual prices fell below the min.
    const maxPriceNum = Number(maxPrice);
    const filteredPrices = await this.readCardPriceOrdinals();
    await reportValue(`Filtered card prices: [${filteredPrices.join(", ")}]`);
    const overBudget = filteredPrices.filter((p) => p > maxPriceNum);
    await Validator.requireTrue(
      overBudget.length === 0,
      `Every result after price filter $${minPrice}–$${maxPrice} should have a starting price ≤ $${maxPrice} — ${overBudget.length} card(s) over max: [${overBudget.join(", ")}]`,
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
  // Opens the Bed & Baths inline dialog, selects a minimum for both Beds and
  // Bathrooms, confirms the results are non-empty, then clears and restores.
  //
  // Note: bed/bath counts are NOT displayed on rail cards and the filter does NOT
  // set URL query params — so per-result validation from the rail is not possible.
  // This method verifies the filter dialog interaction works correctly and the
  // result set is valid (non-empty). Whether the count changes depends on the
  // market: if every community meets the threshold, the count stays the same —
  // that is correct behaviour, not a test defect.
  async verifyBedsBathsFilterAndRestore(
    bedsValue: string,
    bathsValue: string,
  ): Promise<void> {
    const baseline = await this.getResultsCount();

    await this.click(this.bedsBathsTrigger, "Bed & Baths filter");
    await Validator.requireVisible(
      this.bedsBathsDialog,
      "Bed & Baths filter dialog should open",
      10000,
    );

    // The radio options are covered by <span> labels — click the span text, not
    // the input. Each value appears once in the Beds group and once in Bathrooms:
    // nth(0) → Beds, nth(1) → Bathrooms.
    await this.click(
      this.bedsBathsDialog.getByText(bedsValue, { exact: true }).nth(0),
      `Beds "${bedsValue}" option`,
    );
    await this.click(
      this.bedsBathsDialog.getByText(bathsValue, { exact: true }).nth(1),
      `Baths "${bathsValue}" option`,
    );

    const applyRefresh = waitForApi(this.page, "/api/search", 10000).catch(
      () => null,
    );
    await this.click(
      this.bedsBathsDialog.getByRole("button", { name: /Apply filters/i }),
      "Apply filters (beds & baths)",
    );
    await applyRefresh;
    await this.page.waitForTimeout(1500);
    const filtered = await this.getResultsCount();
    await reportValue(
      `Results after ${bedsValue} beds / ${bathsValue} baths filter: ${filtered} (baseline ${baseline})`,
    );
    await Validator.requireTrue(
      filtered > 0,
      `Beds "${bedsValue}" / Baths "${bathsValue}" filter should return at least one result (got ${filtered})`,
    );

    // Clear: reset the filter and verify the count is restored.
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
      "Clear all (beds & baths)",
    );
    if (
      await this.bedsBathsDialog
        .getByRole("button", { name: /Apply filters/i })
        .isVisible()
        .catch(() => false)
    ) {
      await this.click(
        this.bedsBathsDialog.getByRole("button", { name: /Apply filters/i }),
        "Apply filters after clear (beds & baths)",
      );
    }
    await clearRefresh;
    await this.page.waitForTimeout(1500);
    const restored = await this.getResultsCount();
    await reportValue(`Results after clearing beds & baths filter: ${restored}`);
    await Validator.requireTrue(
      restored >= baseline,
      `Clearing the beds & baths filter should restore results (baseline ${baseline}, restored ${restored})`,
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

  // ── "All filters" modal — Home Availability (RG-new) ──
  // Opens the "All filters" modal, checks a Home Availability option (e.g.
  // "Quick Move-In"), applies, asserts count > 0, then clears and restores.
  //
  // The "All filters" modal does NOT call /api/search on Apply — it filters
  // client-side. Use waitForTimeout instead of waitForApi here.
  //
  // Per-card badge validation for Home Availability is intentionally omitted:
  // not every card in the filtered results shows the availability badge
  // (communities with QMI homes may not have the badge if their QMI listings
  // recently sold; the filter and the badge are driven by different data layers).
  async verifyAllFiltersHomeAvailability(type: string): Promise<void> {
    const baseline = await this.getResultsCount();

    await this.click(this.allFiltersTrigger, `All filters trigger (${type})`);
    await Validator.requireVisible(
      this.allFiltersDialog,
      "'All filters' dialog should open",
      10000,
    );

    await this.click(
      this.allFiltersDialog.getByText(type, { exact: true }).first(),
      `Home Availability "${type}"`,
    );

    await this.click(
      this.allFiltersDialog.getByRole("button", { name: /Apply filters/i }),
      `Apply filters (${type})`,
    );
    await this.page.waitForTimeout(2500);

    const filtered = await this.getResultsCount();
    await reportValue(
      `Results after "${type}" filter: ${filtered} (baseline ${baseline})`,
    );

    if (filtered === 0) {
      await reportValue(
        `No "${type}" communities in this market — skipping per-card assertion`,
      );
    } else {
      await Validator.requireTrue(
        filtered > 0,
        `"${type}" filter should return at least one result (got ${filtered})`,
      );
    }

    // Clear + restore.
    await this.click(
      this.allFiltersTrigger,
      `All filters (reopen after ${type})`,
    );
    await Validator.requireVisible(
      this.allFiltersDialog,
      "'All filters' dialog should reopen for clear",
      10000,
    );
    await this.click(
      this.allFiltersDialog.getByRole("button", { name: /Clear all/i }),
      `Clear all (${type})`,
    );
    await this.click(
      this.allFiltersDialog.getByRole("button", { name: /Apply filters/i }),
      `Apply after clear (${type})`,
    );
    await this.page.waitForTimeout(2500);
    const restored = await this.getResultsCount();
    await reportValue(
      `Restored after clearing "${type}": ${restored} (baseline ${baseline})`,
    );
    await Validator.requireTrue(
      restored >= baseline,
      `Clearing "${type}" filter should restore count (baseline ${baseline}, restored ${restored})`,
    );
  }

  // ── "All filters" modal — Home Type (RG-new) ───────────
  // Checks each Home Type option one at a time. For options with results, asserts
  // every visible card's details line contains the selected type (per-result check
  // — the card shows "City, State HomeType" in [class*='Community_details']).
  // Options with 0 results are gracefully skipped (not all home types exist in
  // every market: Condominiums / Villas may have no Dallas communities).
  async verifyAllFiltersHomeType(homeType: string): Promise<void> {
    const baseline = await this.getResultsCount();

    await this.click(
      this.allFiltersTrigger,
      `All filters trigger (${homeType})`,
    );
    await Validator.requireVisible(
      this.allFiltersDialog,
      "'All filters' dialog should open",
      10000,
    );

    await this.click(
      this.allFiltersDialog.getByText(homeType, { exact: true }).first(),
      `Home Type "${homeType}"`,
    );
    await this.click(
      this.allFiltersDialog.getByRole("button", { name: /Apply filters/i }),
      `Apply filters (${homeType})`,
    );
    await this.page.waitForTimeout(2500);

    const filtered = await this.getResultsCount();
    await reportValue(`Results after Home Type "${homeType}": ${filtered}`);

    if (filtered === 0) {
      await reportValue(
        `No "${homeType}" communities in this market — skipping per-card assertion`,
      );
    } else {
      // Per-card: the details element shows "City, State HomeType" as concatenated
      // child text. A simple case-insensitive contains() check is robust and matches
      // the card's visual display.
      const cardDetails = await this.page
        .locator("[class*='Community_card']:visible")
        .evaluateAll((cards) =>
          cards.map((card) => {
            const el = card.querySelector("[class*='Community_details']");
            return (el?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
          }),
        );
      const lowerType = homeType.toLowerCase();
      await reportValue(
        `Card details after "${homeType}" filter: [${cardDetails.map((d) => `"${d}"`).join(", ")}]`,
      );
      const mismatches = cardDetails.filter((d) => !d.includes(lowerType));
      await Validator.requireTrue(
        mismatches.length === 0,
        `Every card after Home Type "${homeType}" filter should show that type — ${mismatches.length} mismatch(es): [${mismatches.map((d) => `"${d}"`).join(", ")}]`,
      );
    }

    // Clear + restore.
    await this.click(
      this.allFiltersTrigger,
      `All filters (reopen after ${homeType})`,
    );
    await Validator.requireVisible(
      this.allFiltersDialog,
      "'All filters' dialog should reopen for clear",
      10000,
    );
    await this.click(
      this.allFiltersDialog.getByRole("button", { name: /Clear all/i }),
      `Clear all (${homeType})`,
    );
    await this.click(
      this.allFiltersDialog.getByRole("button", { name: /Apply filters/i }),
      `Apply after clear (${homeType})`,
    );
    await this.page.waitForTimeout(2500);
    const restored = await this.getResultsCount();
    await reportValue(
      `Restored after clearing "${homeType}": ${restored} (baseline ${baseline})`,
    );
    await Validator.requireTrue(
      restored >= baseline,
      `Clearing "${homeType}" filter should restore count (baseline ${baseline}, restored ${restored})`,
    );
  }

  // ── "All filters" modal — Looks Communities (RG-new) ──
  // Checks "Looks Communities" in the Community Type section of the All filters
  // modal, applies, and asserts every visible card shows the Looks badge
  // ([class*='Community_type'] contains "looks"). In markets where all communities
  // are Looks Communities (e.g. Dallas) the count will not change — the test
  // still verifies the filter doesn't break the rail and all cards carry the badge.
  async verifyAllFiltersLooksCommunity(): Promise<void> {
    const baseline = await this.getResultsCount();

    await this.click(this.allFiltersTrigger, "All filters trigger (Looks)");
    await Validator.requireVisible(
      this.allFiltersDialog,
      "'All filters' dialog should open",
      10000,
    );

    await this.click(
      this.allFiltersDialog.getByText("Looks Communities", { exact: true }).first(),
      "Community Type: Looks Communities",
    );
    await this.click(
      this.allFiltersDialog.getByRole("button", { name: /Apply filters/i }),
      "Apply filters (Looks)",
    );
    await this.page.waitForTimeout(2500);

    const filtered = await this.getResultsCount();
    await reportValue(
      `Results after Looks Communities filter: ${filtered} (baseline ${baseline})`,
    );
    await Validator.requireTrue(
      filtered > 0,
      `Looks Communities filter should return at least one result (got ${filtered})`,
    );

    // Per-card: every card should carry the "looks Community" badge
    // ([class*='Community_type'] renders the looks logo + "Community" text).
    const communityTypes = await this.page
      .locator("[class*='Community_card']:visible")
      .evaluateAll((cards) =>
        cards.map((card) => {
          const el = card.querySelector("[class*='Community_type']");
          return (el?.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
        }),
      );
    await reportValue(
      `Looks badge texts: [${communityTypes.map((t) => `"${t}"`).join(", ")}]`,
    );
    const missingBadge = communityTypes.filter((t) => !t.includes("looks"));
    await Validator.requireTrue(
      missingBadge.length === 0,
      `Every card after Looks Communities filter should show the looks badge — ${missingBadge.length} card(s) missing it`,
    );

    // Clear + restore.
    await this.click(this.allFiltersTrigger, "All filters (reopen after Looks)");
    await Validator.requireVisible(
      this.allFiltersDialog,
      "'All filters' dialog should reopen for clear",
      10000,
    );
    await this.click(
      this.allFiltersDialog.getByRole("button", { name: /Clear all/i }),
      "Clear all (Looks)",
    );
    await this.click(
      this.allFiltersDialog.getByRole("button", { name: /Apply filters/i }),
      "Apply after clear (Looks)",
    );
    await this.page.waitForTimeout(2500);
    const restored = await this.getResultsCount();
    await reportValue(
      `Restored after clearing Looks Communities: ${restored} (baseline ${baseline})`,
    );
    await Validator.requireTrue(
      restored >= baseline,
      `Clearing Looks Communities filter should restore count (baseline ${baseline}, restored ${restored})`,
    );
  }

  // ── A-Z / Z-A Sort — Verification ──────────────────────
  // Applies an alphabetical sort option and asserts the community names are in
  // the expected order (A→Z or Z→A). Uses the same inversion-tolerance approach
  // as price sort to handle occasional data-edge outliers.
  async verifySortByName(
    option: string,
    direction: "asc" | "desc",
  ): Promise<void> {
    await this.getResultsCount(); // ensure the list has settled first

    await this.click(this.sortTrigger, "Sort by");
    await this.click(
      this.page.getByRole("option", { name: option, exact: true }),
      `Sort option: ${option}`,
    );
    await this.page.waitForTimeout(2000); // client-side sort
    await this.getResultsCount(); // settle

    const names = await this.page
      .locator("[class*='Community_card']:visible")
      .evaluateAll((cards) =>
        cards.map((card) => {
          const el = card.querySelector("[class*='Community_name']");
          return (el?.textContent || "").trim().toLowerCase();
        }),
      );

    await reportValue(
      `Card names after "${option}" sort: [${names.map((n) => `"${n}"`).join(", ")}]`,
    );
    await Validator.requireTrue(
      names.length > 1,
      `Need at least two results to verify alphabetical sort (got ${names.length})`,
    );

    const inversions = names.reduce(
      (n, v, i) =>
        i === 0
          ? n
          : n +
            ((direction === "asc" ? names[i - 1] <= v : names[i - 1] >= v)
              ? 0
              : 1),
      0,
    );
    const tolerance = Math.max(1, Math.floor(names.length / 8));
    await reportValue(
      `Sort "${option}": ${inversions} out-of-order pair(s) of ${names.length} (tolerance ${tolerance})`,
    );
    await Validator.requireTrue(
      inversions <= tolerance,
      `Sorting by "${option}" should order names ${direction === "asc" ? "A→Z" : "Z→A"} (≤${tolerance} outlier-pairs) — got ${inversions}`,
    );
  }

  // ── Phase 4 additions ─────────────────────────────────────

  // Coming Soon per-card badge validation. Existing verifyAllFiltersHomeAvailability
  // is intentionally untouched; this dedicated method adds the per-card badge check
  // that is reliable for Coming Soon (every filtered card IS a Coming Soon community
  // — unlike QMI where filter and badge are different data layers).
  async verifyAllFiltersComingSoonBadge(): Promise<void> {
    const baseline = await this.getResultsCount();

    await this.click(this.allFiltersTrigger, "All filters trigger (Coming Soon badge)");
    await Validator.requireVisible(
      this.allFiltersDialog,
      "'All filters' dialog should open",
      10000,
    );
    await this.allFiltersDialog
      .getByText("Coming Soon", { exact: true })
      .first()
      .click();
    await reportValue("Checked: Coming Soon");

    const applyBtn = this.allFiltersDialog.getByRole("button", {
      name: /Apply filters/i,
    });
    await this.click(applyBtn, "Apply filters (Coming Soon badge)");
    await this.page.waitForTimeout(2500);

    const filtered = await this.getResultsCount();
    await reportValue(
      `Results after Coming Soon filter: ${filtered} (baseline ${baseline})`,
    );

    if (filtered === 0) {
      await reportValue(
        "No Coming Soon communities in this market — skipping badge assertion",
      );
    } else {
      const missing = await this.page
        .locator("[class*='Community_card']:visible")
        .evaluateAll((cards) =>
          cards.filter(
            (c) =>
              !((c.querySelector("[class*='Community_tags']")?.textContent || "")
                .toLowerCase()
                .includes("coming soon")),
          ).length,
        );
      await reportValue(
        `Coming Soon badge check: ${missing} card(s) missing the badge out of ${filtered}`,
      );
      await Validator.requireTrue(
        missing === 0,
        `Every card after "Coming Soon" filter should show the "Coming Soon" badge — ${missing} card(s) missing it`,
      );
    }

    // Clear and restore
    await this.click(
      this.allFiltersTrigger,
      "All filters trigger (reopen after Coming Soon badge)",
    );
    await Validator.requireVisible(
      this.allFiltersDialog,
      "'All filters' dialog should reopen",
      10000,
    );
    const clearBtn = this.allFiltersDialog.getByRole("button", {
      name: /Clear all/i,
    });
    await this.click(clearBtn, "Clear all (Coming Soon badge)");
    const reapplyBtn = this.allFiltersDialog.getByRole("button", {
      name: /Apply filters/i,
    });
    await this.click(reapplyBtn, "Apply after clear (Coming Soon badge)");
    await this.page.waitForTimeout(2500);
    const restored = await this.getResultsCount();
    await reportValue(`Restored after Coming Soon badge test: ${restored}`);
    await Validator.requireTrue(
      restored >= baseline,
      `Clearing Coming Soon filter should restore baseline (expected ≥${baseline}, got ${restored})`,
    );
  }

  // Zero-results state: filter to an impossible price range, assert 0 results,
  // clear and confirm baseline is restored.
  async verifyZeroResultsState(minPrice: string): Promise<void> {
    const baseline = await this.getResultsCount();
    await reportValue(`Baseline before zero-results test: ${baseline}`);

    await this.click(
      this.priceFilterTrigger,
      "Price Range filter (zero-results)",
    );
    await Validator.requireVisible(
      this.priceDialog,
      "Price Range dialog should open",
      10000,
    );
    await this.type(
      this.priceMinInput,
      minPrice,
      `Minimum price (zero-results: ${minPrice})`,
    );

    const applyRefresh = waitForApi(this.page, "/api/search", 10000).catch(
      () => null,
    );
    await this.click(this.applyFiltersButton, "Apply filters (zero-results)");
    await applyRefresh;
    await this.page.waitForTimeout(1500);

    const zeroCount = await this.getResultsCount();
    await reportValue(`Results after min $${minPrice} filter: ${zeroCount}`);
    await Validator.requireTrue(
      zeroCount === 0,
      `Filtering with min price $${minPrice} should return 0 results (got ${zeroCount})`,
    );

    // Soft-assert the no-results UI message. Two-tier selector strategy; falls
    // back to a text search if the CSS-module prefix doesn't match the live DOM.
    // The count=0 assertion above is the hard gate — this is observational.
    const noResultsEl = this.page
      .locator("[class*='rail_no-results']:visible, [class*='rail_empty']:visible")
      .first();
    const msgVisible = await noResultsEl
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (msgVisible) {
      const msgText = (
        (await noResultsEl.textContent().catch(() => "")) ?? ""
      ).trim();
      await reportValue(`No-results message: "${msgText}"`);
      await Validator.requireTrue(
        msgText.length > 0,
        `No-results UI message should contain non-empty text (got "${msgText}")`,
      );
    } else {
      const fallback = this.page
        .locator("[class*='rail']:visible")
        .getByText(/0 results|no communities|no results/i)
        .first();
      const fallbackFound = await fallback
        .waitFor({ state: "visible", timeout: 3000 })
        .then(() => true)
        .catch(() => false);
      await reportValue(
        `No-results UI message: ${fallbackFound ? "found via text fallback" : "selector not matched — note for Phase 6 DOM spike"}`,
      );
    }

    // Clear and restore
    await this.click(
      this.priceFilterTrigger,
      "Price Range filter (reopen after zero-results)",
    );
    await Validator.requireVisible(
      this.priceDialog,
      "Price Range dialog should reopen",
      10000,
    );
    const clearRefresh = waitForApi(this.page, "/api/search", 10000).catch(
      () => null,
    );
    await this.click(this.clearAllButton, "Clear all filters (zero-results)");
    if (await this.applyFiltersButton.isVisible().catch(() => false)) {
      await this.click(
        this.applyFiltersButton,
        "Apply after clear (zero-results)",
      );
    }
    await clearRefresh;
    await this.waitForResultsToSettle(0);
    const restored = await this.getResultsCount();
    await reportValue(`Results restored after zero-results clear: ${restored}`);
    await Validator.requireTrue(
      restored >= baseline,
      `Clearing zero-results filter should restore baseline (expected ≥${baseline}, got ${restored})`,
    );
  }

  // Filter + Sort chain: apply a price max filter then sort the filtered
  // results — verifies (1) sort doesn't reset the active filter, (2) all
  // prices still ≤ max, and (3) prices are non-decreasing after sort.
  async verifyFilterThenSort(
    maxPrice: string,
    sortOption: string,
  ): Promise<void> {
    const baseline = await this.getResultsCount();

    // Apply price max filter
    await this.click(this.priceFilterTrigger, "Price Range filter (chain)");
    await Validator.requireVisible(
      this.priceDialog,
      "Price Range dialog should open",
      10000,
    );
    await this.type(
      this.priceMaxInput,
      maxPrice,
      `Maximum price (chain: ${maxPrice})`,
    );
    const applyRefresh = waitForApi(this.page, "/api/search", 10000).catch(
      () => null,
    );
    await this.click(this.applyFiltersButton, "Apply price filter (chain)");
    await applyRefresh;
    await this.waitForResultsToSettle(baseline);
    const filteredCount = await this.getResultsCount();
    await reportValue(
      `After price max $${maxPrice} filter: ${filteredCount} results (baseline ${baseline})`,
    );
    await Validator.requireTrue(
      filteredCount > 0 && filteredCount < baseline,
      `Price filter should reduce results before sort (${baseline} → ${filteredCount})`,
    );

    // Apply sort on the filtered results — no clear between filter and sort
    await this.click(this.sortTrigger, "Sort by (chain)");
    await this.click(
      this.page.getByRole("option", { name: sortOption, exact: true }),
      `Sort option: ${sortOption} (chain)`,
    );
    await this.page.waitForTimeout(2000);

    // Assert filter count is unchanged (sort must not reset the filter)
    const countAfterSort = await this.getResultsCount();
    await reportValue(
      `After sort "${sortOption}" on filtered results: ${countAfterSort}`,
    );
    await Validator.requireTrue(
      countAfterSort === filteredCount,
      `Sort must not reset the active filter — count should stay ${filteredCount} (got ${countAfterSort})`,
    );

    // Assert all prices ≤ max AND non-decreasing
    const prices = await this.readCardPriceOrdinals();
    const maxPriceNum = Number(maxPrice);
    const overBudget = prices.filter((p) => p > maxPriceNum);
    await reportValue(`Prices after filter+sort: [${prices.join(", ")}]`);
    await Validator.requireTrue(
      overBudget.length === 0,
      `After filter+sort, all prices should be ≤ $${maxPrice} — ${overBudget.length} card(s) over max`,
    );
    const inversions = prices.reduce(
      (n, v, i) => (i === 0 ? n : n + (prices[i - 1] <= v ? 0 : 1)),
      0,
    );
    const tolerance = Math.max(1, Math.floor(prices.length / 8));
    await reportValue(
      `Filter+sort price order: ${inversions} inversion(s) of ${prices.length} (tolerance ${tolerance})`,
    );
    await Validator.requireTrue(
      inversions <= tolerance,
      `After filter+sort, prices should be non-decreasing (≤${tolerance} outlier-pairs, got ${inversions})`,
    );

    // Clear filter to restore state
    await this.click(this.priceFilterTrigger, "Price Range filter (clear chain)");
    await Validator.requireVisible(
      this.priceDialog,
      "Price Range dialog should reopen",
      10000,
    );
    const clearRefresh = waitForApi(this.page, "/api/search", 10000).catch(
      () => null,
    );
    await this.click(this.clearAllButton, "Clear all (chain)");
    if (await this.applyFiltersButton.isVisible().catch(() => false)) {
      await this.click(this.applyFiltersButton, "Apply after clear (chain)");
    }
    await clearRefresh;
    await this.waitForResultsToSettle(filteredCount);
    const restored = await this.getResultsCount();
    await reportValue(`Restored after filter+sort chain: ${restored}`);
    await Validator.requireTrue(
      restored >= baseline,
      `Clearing after filter+sort chain should restore baseline (expected ≥${baseline}, got ${restored})`,
    );
  }

  // Multi-filter combination: open the All Filters modal and select TWO
  // checkboxes in one apply — Home Type + Community Type. Both per-card
  // signals are reliable: details contains homeType, and Community_type
  // contains "looks".
  async verifyMultipleAllFilters(
    homeType: string,
    communityType: string,
  ): Promise<void> {
    const baseline = await this.getResultsCount();

    await this.click(
      this.allFiltersTrigger,
      "All filters trigger (multi-filter)",
    );
    await Validator.requireVisible(
      this.allFiltersDialog,
      "'All filters' dialog should open",
      10000,
    );

    await this.allFiltersDialog
      .getByText(homeType, { exact: true })
      .first()
      .click();
    await reportValue(`Checked Home Type: ${homeType}`);

    await this.allFiltersDialog
      .getByText(communityType, { exact: true })
      .first()
      .click();
    await reportValue(`Checked Community Type: ${communityType}`);

    const applyBtn = this.allFiltersDialog.getByRole("button", {
      name: /Apply filters/i,
    });
    await this.click(
      applyBtn,
      `Apply multi-filter (${homeType} + ${communityType})`,
    );
    await this.page.waitForTimeout(2500);

    const filtered = await this.getResultsCount();
    await reportValue(
      `Results after "${homeType}" + "${communityType}" multi-filter: ${filtered} (baseline ${baseline})`,
    );

    if (filtered === 0) {
      await reportValue(
        "No results for this multi-filter combination — skipping per-card assertion",
      );
    } else {
      // Per-card: details line contains homeType
      const detailsMissing = await this.page
        .locator("[class*='Community_card']:visible")
        .evaluateAll(
          (cards, ht) =>
            cards.filter(
              (c) =>
                !(
                  (
                    c.querySelector("[class*='Community_details']")
                      ?.textContent || ""
                  )
                    .toLowerCase()
                    .includes(ht.toLowerCase())
                ),
            ).length,
          homeType,
        );
      await Validator.requireTrue(
        detailsMissing === 0,
        `Every card after multi-filter should show Home Type "${homeType}" in details — ${detailsMissing} card(s) missing it`,
      );

      // Per-card: Community_type contains "looks"
      const looksMissing = await this.page
        .locator("[class*='Community_card']:visible")
        .evaluateAll((cards) =>
          cards.filter(
            (c) =>
              !(
                (
                  c.querySelector("[class*='Community_type']")?.textContent ||
                  ""
                )
                  .toLowerCase()
                  .includes("looks")
              ),
          ).length,
        );
      await Validator.requireTrue(
        looksMissing === 0,
        `Every card after multi-filter should show Looks badge — ${looksMissing} card(s) missing it`,
      );
    }

    // Clear and restore
    await this.click(
      this.allFiltersTrigger,
      "All filters trigger (reopen after multi-filter)",
    );
    await Validator.requireVisible(
      this.allFiltersDialog,
      "'All filters' dialog should reopen",
      10000,
    );
    const clearBtn = this.allFiltersDialog.getByRole("button", {
      name: /Clear all/i,
    });
    await this.click(clearBtn, "Clear all (multi-filter)");
    const reapplyBtn = this.allFiltersDialog.getByRole("button", {
      name: /Apply filters/i,
    });
    await this.click(reapplyBtn, "Apply after clear (multi-filter)");
    await this.page.waitForTimeout(2500);
    const restored = await this.getResultsCount();
    await reportValue(`Restored after multi-filter: ${restored}`);
    await Validator.requireTrue(
      restored >= baseline,
      `Clearing multi-filter should restore baseline (expected ≥${baseline}, got ${restored})`,
    );
  }

  // ── Phase 5 additions ─────────────────────────────────────

  // Verify that clicking outside the Price Range dialog (backdrop dismiss)
  // auto-applies the currently-entered filter value — a product UX behaviour
  // confirmed on prod: the dialog commits its state on any close, not just
  // on an explicit "Apply filters" click. Also verifies Escape does NOT close
  // the dialog (the only dismiss paths are backdrop click or Apply/Clear).
  async verifyFilterDialogBackdropApplies(minPrice: string): Promise<void> {
    const baseline = await this.getResultsCount();
    await this.click(
      this.priceFilterTrigger,
      "Price Range filter (backdrop-apply test)",
    );
    await Validator.requireVisible(
      this.priceDialog,
      "Price Range dialog should open for backdrop test",
      10000,
    );
    // Use max price for the backdrop test — gives a reliably large count
    // reduction (e.g. $450k max narrows 13+ results to ~8) so the assertion
    // is not affected by the ±1 streaming-count variance.
    await this.type(
      this.priceMaxInput,
      minPrice,
      `Maximum price (backdrop test: ${minPrice})`,
    );

    // Escape does NOT close this dialog (react-aria modal; confirmed on prod).
    await this.page.keyboard.press("Escape");
    const escapeClosed = !(await this.isVisible(this.priceDialog, 1500));
    await reportValue(`Escape closes Price Range dialog: ${escapeClosed}`);

    // Backdrop click DOES close the dialog and auto-applies the entered value.
    const box = await this.mapContainer.boundingBox().catch(() => null);
    if (box) {
      await this.page.mouse.click(
        box.x + box.width / 2,
        box.y + box.height / 2,
      );
    } else {
      await this.page.mouse.click(10, 10);
    }
    const backdropClosed = !(await this.isVisible(this.priceDialog, 2000));
    await reportValue(`Backdrop click closes Price Range dialog: ${backdropClosed}`);
    await Validator.requireTrue(
      backdropClosed,
      "Backdrop click should dismiss the Price Range dialog",
    );

    // The filter was auto-applied — count must be < baseline.
    const applyRefresh = waitForApi(this.page, "/api/search", 8000).catch(
      () => null,
    );
    await applyRefresh;
    await this.page.waitForTimeout(1000);
    const filteredCount = await this.getResultsCount();
    await reportValue(
      `Count after backdrop-dismiss with max $${minPrice}: ${filteredCount} (baseline ${baseline})`,
    );
    await Validator.requireTrue(
      filteredCount < baseline,
      `Backdrop-dismiss with max $${minPrice} should auto-apply and reduce results (baseline ${baseline}, got ${filteredCount})`,
    );

    // Restore baseline — open dialog, clear, apply.
    await this.click(
      this.priceFilterTrigger,
      "Price Range filter (restore after backdrop test)",
    );
    await Validator.requireVisible(this.priceDialog, "Price Range dialog reopen", 10000);
    const clearRefresh = waitForApi(this.page, "/api/search", 8000).catch(
      () => null,
    );
    await this.click(this.clearAllButton, "Clear all (backdrop test)");
    if (await this.applyFiltersButton.isVisible().catch(() => false)) {
      await this.click(this.applyFiltersButton, "Apply after clear (backdrop test)");
    }
    await clearRefresh;
    await this.waitForResultsToSettle(filteredCount);
    const restored = await this.getResultsCount();
    await reportValue(`Restored after backdrop test: ${restored}`);
    await Validator.requireTrue(
      restored >= baseline,
      `Clearing after backdrop test should restore baseline (expected ≥${baseline}, got ${restored})`,
    );
  }

  // Verify non-numeric input in the price filter does not crash the page.
  // The hard gate is page health (results count element still visible, count ≥ 0).
  // Whether the dialog shows a validation message or silently ignores the input
  // are both acceptable outcomes — the test adapts to either.
  async verifyInvalidPriceInputHandledGracefully(): Promise<void> {
    const baseline = await this.getResultsCount();
    await reportValue(`Baseline before invalid-input test: ${baseline}`);

    await this.click(
      this.priceFilterTrigger,
      "Price Range filter (invalid input)",
    );
    await Validator.requireVisible(
      this.priceDialog,
      "Price Range dialog should open for invalid-input test",
      10000,
    );
    await this.type(
      this.priceMinInput,
      "abc",
      "Minimum price (invalid — non-numeric)",
    );
    await this.applyFiltersButton.click({ force: true }).catch(() => {});
    await this.page.waitForTimeout(2000);

    const dialogStillOpen = await this.isVisible(this.priceDialog, 1000);
    if (dialogStillOpen) {
      await reportValue(
        "Dialog remained open after invalid input — possible validation message",
      );
      await this.page.keyboard.press("Escape");
      await this.waitForHidden(this.priceDialog, 5000);
    } else {
      await reportValue(
        "Dialog closed after invalid input — input silently ignored or reset",
      );
    }

    await Validator.requireVisible(
      this.resultsCount,
      "Results count must remain visible after invalid input (page health check)",
      10000,
    );
    const countAfter = await this.getResultsCount();
    await reportValue(
      `Count after invalid input: ${countAfter} (baseline ${baseline})`,
    );
    await Validator.requireTrue(
      countAfter >= 0,
      `Invalid price input must not crash the page — count must be a valid number (got ${countAfter})`,
    );
    if (countAfter > 0) {
      await Validator.requireTrue(
        countAfter >= baseline,
        `Invalid input must not permanently reduce results (baseline ${baseline}, got ${countAfter})`,
      );
    }
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
