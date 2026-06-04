import { test } from "./baseTest";
import { HomePage } from "../page-objects/homePage";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";

test.describe("Home Page — Hero Search", () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.navigateToHome(constants.home_page.url);
  });

  test("@smoke TC-01 | Searching 'Texas' and selecting 'Dallas' opens the Dallas homes page", async () => {
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
});
