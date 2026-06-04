import { test } from "./baseTest";
import { HomePage } from "../page-objects/homePage";
import { CommunityPage } from "../page-objects/communityPage";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";

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
    console.log(`Destination Heading: ${heading}`);
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
    console.log(`Community heading: ${await communityPage.getHeading()}`);
  });
});
