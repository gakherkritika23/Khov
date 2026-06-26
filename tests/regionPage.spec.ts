import { expect } from "@playwright/test";
import { test } from "./baseTest";
import { HomePage } from "../page-objects/homePage";
import { RegionPage } from "../page-objects/regionPage";
import { CommunityPage } from "../page-objects/communityPage";
import { reportValue } from "../utils/reporter";
import { Validator } from "../utils/validator";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";

// Run the region spec WITHOUT the framework's demo pacing (config `slowMo: 200`).
// The map tests assert precise Google-Maps gestures (zoom/pan) and tile-fetch
// timing + marker actionability; slowMo injects mid-gesture delays that break
// those (zoom-out fetched 0 tiles; the marker click hung). These are functional
// tests, not a visual demo, so they don't need pacing — this restores the
// conditions under which they were certified green. (args mirror the config.)
test.use({
  launchOptions: {
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--start-maximized"],
    slowMo: 0,
  },
});

// Robust region-page entry. The home hero-search is React-hydration sensitive
// (keystrokes can be dropped before the suggestions API fires) and the heavy
// region page can be slow to populate its results rail — so reaching the page is
// the single flaky point. Rather than mask it with Playwright test-level retries,
// retry the WHOLE navigation in-code and gate on a real ready signal (heading +
// a rendered result card, via `waitForRegionReady`). Deterministic, no flakiness.
async function enterRegion(
  homePage: HomePage,
  regionPage: RegionPage,
  term: string,
  suggestion: string,
  expectedUrlPart: string,
): Promise<void> {
  const attempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await homePage.navigateToHome(constants.home_page.url);
      await homePage.searchAndSelectSuggestion(
        term,
        suggestion,
        testData.endpoint.search,
      );
      await regionPage.waitForRegionReady(expectedUrlPart);
      return;
    } catch (error) {
      lastError = error;
      console.log(
        `Region entry attempt ${attempt}/${attempts} failed: ${String(error).split("\n")[0]}`,
      );
    }
  }
  throw lastError;
}

// Multi-page journey (home → region → community detail) on a heavy site; raise
// the timeout at the describe level so it covers the beforeEach navigation too
// (incl. the in-code entry retry).
test.describe.configure({ timeout: 180000 });

test.describe("Region Page — Community Results", () => {
  let homePage: HomePage;
  let regionPage: RegionPage;
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    regionPage = new RegionPage(page);
    communityPage = new CommunityPage(page);
    // State view (search "Texas" → "Texas") — covers the state-level region page
    // + SB-01 (state-suggestion → region page). This test only loads the page and
    // clicks the first community (no heavy multi-card interaction), so the larger
    // state rail is fine here; the interaction-heavy Map/Filters blocks use Dallas.
    await enterRegion(
      homePage,
      regionPage,
      testData.region.term,
      testData.region.suggestion,
      constants.region.texas_url,
    );
  });

  test("TC-01 | Selecting the 'Texas' region then the first community opens its detail page @regression", async () => {
    await regionPage.verifyOnRegionPage(constants.region.texas_url);
    await regionPage.verifyCommunitiesSectionIsDisplayed();

    const firstCommunity = await regionPage.getFirstCommunityCardName();
    await reportValue(`First community: ${firstCommunity}`);

    await regionPage.clickFirstCommunity();

    await communityPage.verifyCommunityPageDisplayed(
      constants.region.community_detail_url_pattern,
      firstCommunity,
    );
    await reportValue(
      `Community detail heading: ${await communityPage.getHeading()}`,
    );
  });

  // TC-02 covers Items B (card metadata + images) and D (count accuracy).
  // Breadcrumbs and "Load more" are not present on the region page — all results
  // render in a single rail on load — so those are not asserted.
  test("TC-02 | Community results card metadata and images are valid @regression", async () => {
    await reportValue(`Page URL: ${await regionPage.getUrl()}`);
    // Verifies: reported count == rendered card count (D); every card in the
    // first 5 shows non-empty name, location/home-type, and starting price (B);
    // each card's community image returns HTTP 200 (B).
    await regionPage.verifyCardMetadataAndImages(5);
  });
});

// The region map is the Google Maps JS API rendered into the page DOM (not an
// iframe), so the markers, zoom controls, pan, and marker→card linkage are all
// assertable. Pinned to a CITY view (search "Dallas" → "Dallas") because the
// state view clusters communities into "N cities" pills; a city view renders
// individual community markers, which RG-06 needs.
// RG-07 (scattered-lots rendering) is deferred — it needs a community/zoom level
// that exhibits individual scattered lots, which the market view does not show.
test.describe("Region Page — Map", () => {
  let homePage: HomePage;
  let regionPage: RegionPage;

  // Home search + heavy results page + Google Maps tile loading; headroom covers
  // the in-code entry retry.
  test.describe.configure({ timeout: 360000 });

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    regionPage = new RegionPage(page);
    await enterRegion(
      homePage,
      regionPage,
      testData.region_request_info.term,
      testData.region_request_info.suggestion,
      constants.home_search.dallas_results_url,
    );
  });

  test("TC-01 | Map loads with community markers @smoke", async () => {
    await reportValue(`Page URL: ${await regionPage.getUrl()}`);
    await regionPage.verifyMapLoadsWithMarkers();
  });

  test("TC-02 | Zoom in/out controls change the map view @regression", async () => {
    await regionPage.verifyMapLoadsWithMarkers();
    await regionPage.verifyZoomChangesView();
  });

  test("TC-03 | Panning the map changes the view @regression", async () => {
    await regionPage.verifyMapLoadsWithMarkers();
    await regionPage.verifyPanChangesView();
  });

  test("TC-04 | Selecting a marker highlights the matching community card @regression", async () => {
    await regionPage.verifyMarkerSelectionHighlightsCommunityCard();
  });
});

// Filters, sort, and the per-card "Learn More" CTA on the region results rail.
// Pinned to the Dallas CITY view (like the Map block) — the Texas STATE rail has
// ~47 communities and is heavy enough that the multi-step filter/sort/CTA
// interactions intermittently stall on a degraded dev; the city rail is lighter
// and behaves reliably. The filter/sort controls + "Learn More" CTA are the same
// rail component on both. The rail is driven by POST /api/search/.
test.describe("Region Page — Filters & Sort", () => {
  let homePage: HomePage;
  let regionPage: RegionPage;
  let communityPage: CommunityPage;

  // Home search + results rail + multi-step filter/sort interactions; headroom
  // covers the in-code entry retry.
  test.describe.configure({ timeout: 360000 });

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    regionPage = new RegionPage(page);
    communityPage = new CommunityPage(page);
    await enterRegion(
      homePage,
      regionPage,
      testData.region_request_info.term,
      testData.region_request_info.suggestion,
      constants.home_search.dallas_results_url,
    );
  });

  test("TC-01 | Price + Beds & Baths filters reduce results and 'Clear all' restores them @regression", async () => {
    await reportValue(`Page URL: ${await regionPage.getUrl()}`);
    // Price filter (min + max): every result card must have a starting price
    // within the [minPrice, maxPrice] range.
    await regionPage.verifyPriceFilterReducesThenClearRestores(
      testData.region_filters_sort.minPrice,
      testData.region_filters_sort.maxPrice,
    );
    // Beds & Baths filter: dialog opens, both Beds and Bathrooms options are
    // selectable, results remain non-empty, clear restores. Bed/bath counts are
    // not on rail cards (no URL params either), so per-result validation from
    // the rail is not possible — this exercises the filter dialog interaction
    // and confirms the result set is valid.
    await regionPage.verifyBedsBathsFilterAndRestore(
      testData.region_filters_sort.bedsFilterValue,
      testData.region_filters_sort.bathsFilterValue,
    );
  });

  test("TC-02 | Sorting the communities reorders the results @regression", async () => {
    await reportValue(`Page URL: ${await regionPage.getUrl()}`);
    // Assert "Featured" is the default sort before any interaction.
    const sortLabel = await regionPage.sortTrigger.textContent();
    await Validator.requireTrue(
      (sortLabel ?? "").toLowerCase().includes("featured"),
      `Sort trigger should show "Featured" by default (got "${sortLabel?.trim()}")`,
    );
    await reportValue(`Sort default label: ${sortLabel?.trim()}`);
    // Read baseline so we can confirm Featured restores it.
    const baseline = await regionPage.getResultsCount();
    await reportValue(`Baseline community count: ${baseline}`);
    // Low → High: prices must be non-decreasing.
    await regionPage.verifySortReordersResults(
      testData.region_filters_sort.sortOption,
    );
    // High → Low: prices must be non-increasing.
    await regionPage.verifySortReordersResults(
      testData.region_filters_sort.sortOptionHighToLow,
      "desc",
    );
    // Featured: full count is restored to the pre-sort baseline.
    await regionPage.verifySortRestoresOnFeatured(
      testData.region_filters_sort.sortOptionFeatured,
      baseline,
    );
    // A → Z: community names must be alphabetically non-decreasing.
    await regionPage.verifySortByName(
      testData.region_filters_sort.sortOptionAtoZ,
      "asc",
    );
    // Z → A: community names must be reverse-alphabetically non-decreasing.
    await regionPage.verifySortByName(
      testData.region_filters_sort.sortOptionZtoA,
      "desc",
    );
  });

  test("TC-03 | All filters modal — Home Availability, Home Type, Looks Communities @regression", async () => {
    // 6 multi-step modal filter operations; raise ceiling so it doesn't race the describe-level limit
    test.setTimeout(720_000);
    await reportValue(`Page URL: ${await regionPage.getUrl()}`);
    // Home Availability — "Quick Move-In": count > 0 after filter; clear restores.
    // (Per-card badge not asserted: availability badges and filter criteria are
    // driven by different data layers — not every QMI-filtered card shows the badge.)
    await regionPage.verifyAllFiltersHomeAvailability("Quick Move-In");
    // Home Type — all four options; per-card assertion if results > 0, graceful
    // skip for types absent in this market (e.g. Condominiums, Villas on Dallas).
    for (const homeType of testData.region_filters_sort.homeTypes) {
      await regionPage.verifyAllFiltersHomeType(homeType);
    }
    // Looks Communities — per-card: every filtered card must show the Looks badge.
    await regionPage.verifyAllFiltersLooksCommunity();
  });

  test("TC-04 | First community 'Learn More' CTA opens its detail page @regression", async () => {
    const community = await regionPage.getFirstCommunityCardName();
    await reportValue(`First community: ${community}`);

    await regionPage.clickFirstCommunityLearnMore();

    await communityPage.verifyCommunityPageDisplayed(
      constants.region.community_detail_url_pattern,
      community,
    );
    await reportValue(
      `Community detail heading: ${await communityPage.getHeading()}`,
    );
  });

  test("TC-05 | Coming Soon badge, zero-results state, and multi-filter combination @regression", async () => {
    // Modal-heavy test — 3 All-filters round-trips + zero-results flow
    test.setTimeout(600_000);
    await reportValue(`Page URL: ${await regionPage.getUrl()}`);
    // Coming Soon per-card badge: dedicated method, existing TC-03 untouched.
    await regionPage.verifyAllFiltersComingSoonBadge();
    // Zero-results: min price $900k exceeds every Dallas community → 0 results;
    // clearing must restore the baseline.
    await regionPage.verifyZeroResultsState(
      testData.region_filters_sort.zeroResultsMinPrice,
    );
    // Multi-filter: two checkboxes in one All Filters apply (Home Type +
    // Community Type). Per-card: details contains homeType AND Looks badge present.
    await regionPage.verifyMultipleAllFilters(
      testData.region_filters_sort.homeTypes[0], // "Single Family Homes"
      "Looks Communities",
    );
  });

  test("TC-06 | Filter + Sort chain: price filter stays active after sorting @regression", async () => {
    await reportValue(`Page URL: ${await regionPage.getUrl()}`);
    // Apply price max filter → sort Low→High on the filtered set. Asserts:
    // (1) count unchanged after sort (filter not reset), (2) all prices ≤ max,
    // (3) prices non-decreasing.
    await regionPage.verifyFilterThenSort(
      testData.region_filters_sort.maxPrice,
      testData.region_filters_sort.sortOption,
    );
  });

  test("TC-07 | Price Range dialog auto-applies filter on backdrop click; Escape does not close it @regression", async () => {
    await reportValue(`Page URL: ${await regionPage.getUrl()}`);
    // Product UX behaviour: backdrop click (clicking outside the dialog)
    // auto-applies the entered filter — confirmed on prod. Escape does NOT
    // close the dialog. This test documents both behaviours and asserts the
    // backdrop-applied filter reduces results, then clears and restores.
    await regionPage.verifyFilterDialogBackdropApplies(
      testData.region_filters_sort.maxPrice,
    );
  });

  test("TC-08 | Non-numeric price input is handled gracefully without crashing @regression", async () => {
    await reportValue(`Page URL: ${await regionPage.getUrl()}`);
    // Type "abc" into the min price field and apply. Hard gate: page health
    // (results count element still visible, count ≥ baseline). Whether the
    // dialog shows validation or silently ignores the input are both acceptable.
    await regionPage.verifyInvalidPriceInputHandledGracefully();
  });
});
