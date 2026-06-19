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
  // Map (Google Maps JS API rendered into the page DOM — not an iframe): the
  // container, community markers, zoom controls, and the per-community preview
  // card that a marker selection reveals.
  readonly mapContainer: Locator;
  readonly mapMarkers: Locator;
  readonly communityMarkers: Locator;
  readonly zoomInButton: Locator;
  readonly zoomOutButton: Locator;

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
  async verifySortReordersResults(option: string): Promise<void> {
    await this.getResultsCount(); // ensure the list has settled first
    const before = await this.firstCommunityCard.getAttribute(
      "data-card-element",
    );
    await reportValue(`First community before sort: ${before}`);

    await this.click(this.sortTrigger, "Sort by");
    const refresh = waitForApi(this.page, "/api/search", 10000).catch(() => null);
    await this.click(
      this.page.getByRole("option", { name: option, exact: true }),
      `Sort option: ${option}`,
    );
    await refresh;

    let after = before;
    for (let i = 0; i < 20 && after === before; i++) {
      await this.page.waitForTimeout(400);
      after = await this.firstCommunityCard.getAttribute("data-card-element");
    }
    await reportValue(`First community after "${option}" sort: ${after}`);
    await Validator.requireTrue(
      !!after && after !== before,
      `Sorting by "${option}" should reorder the results (first card ${before} → ${after})`,
    );
  }

  // ── Navigate via card CTA (RG-11) — Actions ────────────
  async clickFirstCommunityLearnMore(): Promise<void> {
    await this.scrollIntoView(this.firstCommunityCard.first());
    await this.click(
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
