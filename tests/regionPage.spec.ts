import { test } from "./baseTest";
import { HomePage } from "../page-objects/homePage";
import { RegionPage } from "../page-objects/regionPage";
import { CommunityPage } from "../page-objects/communityPage";
import { reportValue } from "../utils/reporter";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";

test.describe("Region Page — Community Results", () => {
  let homePage: HomePage;
  let regionPage: RegionPage;
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    regionPage = new RegionPage(page);
    communityPage = new CommunityPage(page);
    await homePage.navigateToHome(constants.home_page.url);
  });

  test("TC-01 | Selecting 'Texas' suggestion then the first community opens its detail page @regression", async () => {
    // Multi-page journey on prod (home → region page → community detail);
    // give it headroom over the 30s default to absorb network variance.
    test.setTimeout(90000);

    await homePage.searchAndSelectSuggestion(
      testData.region.term,
      testData.region.suggestion,
      testData.endpoint.search,
    );

    await regionPage.verifyOnRegionPage(constants.region.texas_url);
    await regionPage.verifyCommunitiesSectionIsDisplayed();

    const firstCommunity = await regionPage.getFirstCommunityName();
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
});
