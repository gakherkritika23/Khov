import { test } from "./baseTest";
import { HomePage } from "../page-objects/homePage";
import { RegionPage } from "../page-objects/regionPage";
import { CommunityDetailPage } from "../page-objects/communityDetailPage";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";

test.describe("Region Page — Community Results", () => {
  let homePage: HomePage;
  let regionPage: RegionPage;
  let communityDetailPage: CommunityDetailPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    regionPage = new RegionPage(page);
    communityDetailPage = new CommunityDetailPage(page);
    await homePage.navigateToHome(constants.home_page.url);
  });

  test("@regression TC-01 | Selecting 'Texas' suggestion then the first community opens its detail page", async () => {
    // Multi-page journey on prod (home → region page → community detail);
    // give it headroom over the 30s default to absorb network variance.
    test.setTimeout(60000);

    await homePage.searchAndSelectSuggestion(
      testData.region.term,
      testData.region.suggestion,
      testData.endpoint.search,
    );

    await regionPage.verifyOnRegionPage(constants.region.texas_url);
    await regionPage.verifyCommunitiesSectionIsDisplayed();

    const firstCommunity = await regionPage.getFirstCommunityName();
    console.log(`First community: ${firstCommunity}`);

    await regionPage.clickFirstCommunity();

    await communityDetailPage.verifyCommunityDetailDisplayed(
      constants.region.community_detail_url_pattern,
      firstCommunity,
    );
    console.log(`Community detail heading: ${await communityDetailPage.getHeading()}`);
  });
});
