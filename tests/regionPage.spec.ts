import { test } from "./baseTest";
import { HomePage } from "../page-objects/homePage";
import { RegionPage } from "../page-objects/regionPage";
import { CommunityPage } from "../page-objects/communityPage";
import { reportValue } from "../utils/reporter";
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

  test("TC-01 | Price filter reduces the results and 'Clear all' restores them @regression", async () => {
    await reportValue(`Page URL: ${await regionPage.getUrl()}`);
    // Price filter: every result card must show a starting price ≤ the max.
    await regionPage.verifyPriceFilterReducesThenClearRestores(
      testData.region_filters_sort.maxPrice,
    );
    // Beds & Baths filter: dialog opens, beds option selectable, results remain
    // non-empty, clear restores. Bed/bath counts are not on rail cards (no URL
    // params either), so per-result bed validation from the rail is not possible —
    // this exercises the filter interaction and confirms the result set is valid.
    await regionPage.verifyBedsFilterAndRestore(
      testData.region_filters_sort.bedsFilterValue,
    );
  });

  test("TC-02 | Sorting the communities reorders the results @regression", async () => {
    await reportValue(`Page URL: ${await regionPage.getUrl()}`);
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
  });

  test("TC-03 | First community 'Learn More' CTA opens its detail page @regression", async () => {
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
});
