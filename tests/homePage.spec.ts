import { test } from "./baseTest";
import { HomePage } from "../page-objects/homePage";
import { CommunityPage } from "../page-objects/communityPage";
import { reportValue } from "../utils/reporter";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";

// The home page is heavy (headed, full-suite contention); the default 30s test
// timeout can be exceeded by the beforeEach navigation. Raise it at the describe
// level so it also covers the hooks.
test.describe.configure({ timeout: 90000 });

test.describe("Home Page — Hero Search", () => {
  let homePage: HomePage;
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    communityPage = new CommunityPage(page);
    await homePage.navigateToHome(constants.home_page.url);
  });

  test("TC-01 | Searching 'Texas' and selecting 'Dallas' opens the Dallas homes page @smoke", async () => {
    await homePage.verifySearchInputIsDisplayed();

    await homePage.searchAndSelectSuggestion(
      testData.home_search.term,
      testData.home_search.suggestion,
      testData.endpoint.search,
    );

    await homePage.verifyResultsPageDisplayed(
      constants.home_search.dallas_results_url,
      constants.home_search.dallas_results_heading,
    );

    const heading = await homePage.getResultsHeading();
    await reportValue(`Destination Heading: ${heading}`);
  });

  test("TC-02 | Searching a community name and selecting it opens the community page @smoke", async () => {
    await homePage.verifySearchInputIsDisplayed();

    await homePage.searchAndSelectSuggestion(
      testData.community_search.term,
      testData.community_search.suggestion,
      testData.endpoint.search,
    );

    await communityPage.verifyCommunityPageDisplayed(
      constants.community.river_ranch_trails_url,
      constants.community.river_ranch_trails_heading,
    );
    await reportValue(`Community heading: ${await communityPage.getHeading()}`);
  });
});

// ── E7: Home page content ──────────────────────────────────
test.describe("Home Page — Page Load", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    // Times the navigation (for the render-threshold check) and scrolls the full
    // page so lazy content/images render.
    await homePage.navigateAndScroll(constants.home_page.url);
  });

  test("TC-01 | Home page loads, hero heading is displayed and initial render is within threshold @smoke", async () => {
    await homePage.verifyHomePageLoaded(constants.home_page.title_contains);
    await homePage.verifyHeroHeadingIsDisplayed();
    await homePage.verifyInitialRenderWithin(constants.home_page.render_threshold_ms);
  });
});

test.describe("Home Page — Hero", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigateToHome(constants.home_page.url);
  });

  test("TC-01 | Hero section/video render, autoplay, load (200) and play/pause works @smoke", async () => {
    await homePage.verifyHeroSectionIsDisplayed();
    // Video render + reachable embed (200) covers the hero-assets-load check.
    await homePage.verifyHeroVideoIsDisplayed();
    await homePage.verifyHeroVideoAutoplays();
    // Real pause→play round-trip asserted via the Vimeo Player API.
    await homePage.verifyHeroMediaControlWorks();
  });
});

test.describe("Home Page — State Selection", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigateToHome(constants.home_page.url);
  });

  test("TC-01 | 'Select a State' section lists all states and selecting one navigates @smoke", async () => {
    await homePage.verifyStateSelectionIsDisplayed();
    await homePage.verifyAllConfiguredStatesPresent(
      constants.home_page.configured_states,
    );
    // Selecting a state navigates to its region page (assert last — leaves home).
    await homePage.selectStateAndVerifyNavigation(
      constants.home_page.state_nav.name,
      constants.home_page.state_nav.url_contains,
    );
  });
});

test.describe("Home Page — Testimonials (TrustBuilder)", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigateToHome(constants.home_page.url);
  });

  test("TC-01 | TrustBuilder section loads with rating, review count and Read Reviews CTA @smoke", async () => {
    await homePage.verifyTrustBuilderSectionLoaded();
    await homePage.verifyTrustRatingDisplayed();
    await homePage.verifyTrustReviewCountDisplayed();
    await homePage.verifyReadReviewsCtaWorks();
  });
});

test.describe("Home Page — Media", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    // Scrolls the full page so lazy media renders.
    await homePage.navigateAndScroll(constants.home_page.url);
  });

  test("TC-01 | All homepage images load without broken media @smoke", async () => {
    await homePage.verifyNoBrokenImages();
  });

  test("TC-02 | Lazy-loaded images render on scroll @regression", async () => {
    await homePage.verifyLazyImagesRender();
  });
});

test.describe("Home Page — Navigation CTAs", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigateToHome(constants.home_page.url);
  });

  test("TC-01 | 'Learn More' CTA navigates to the Looks page @regression", async () => {
    await homePage.verifyLearnMoreNavigates(constants.home_page.looks_url);
  });
});

test.describe("Home Page — Links", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigateToHome(constants.home_page.url);
  });

  test("TC-01 | All internal links return 200 @regression", async () => {
    await homePage.verifyInternalLinksReturn200();
  });
});
