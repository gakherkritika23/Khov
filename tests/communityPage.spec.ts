import { test } from "./baseTest";
import { RegionPage } from "../page-objects/regionPage";
import { CommunityPage } from "../page-objects/communityPage";
import constants from "../utils/constants.json";

test.describe("Community Page — Listing Header", () => {
  let regionPage: RegionPage;
  let communityPage: CommunityPage;
  let communityName: string;

  test.beforeEach(async ({ page }) => {
    // Multi-page journey on prod (region listing → community page); give it
    // headroom over the 30s default. Set before navigation so it covers the hook.
    test.setTimeout(90000);
    regionPage = new RegionPage(page);
    communityPage = new CommunityPage(page);

    // Reach a community page via the region listing (not a hardcoded deep URL).
    await regionPage.navigateToRegion(constants.region.texas_url);
    await regionPage.verifyCommunitiesSectionIsDisplayed();
    communityName = await regionPage.getFirstCommunityName();
    await regionPage.clickFirstCommunity();
  });

  test("TC-01 | Community page loads with name, starting price and location @smoke", async () => {
    await communityPage.verifyHeaderIsDisplayed(communityName);
    await communityPage.verifyStartingPriceIsDisplayed();
    await communityPage.verifyCommunityLocationIsDisplayed();
    console.log(
      `Community: ${communityName} | ${await communityPage.getStartingPriceText()}`,
    );
  });

  test("TC-02 | Onsite sales team and office hours are displayed @regression", async () => {
    await communityPage.verifyOnsiteSalesTeamIsDisplayed();
  });
});

test.describe("Community Page — Floorplan & Home Cards", () => {
  let regionPage: RegionPage;
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    regionPage = new RegionPage(page);
    communityPage = new CommunityPage(page);

    // Reach a community page via the region listing (not a hardcoded deep URL).
    await regionPage.navigateToRegion(constants.region.texas_url);
    await regionPage.verifyCommunitiesSectionIsDisplayed();
    await regionPage.clickFirstCommunity();
  });

  test("TC-01 | Floorplan/home cards render with specs and pricing @smoke", async () => {
    await communityPage.verifyHomeCardsAreDisplayed();
    console.log(`Home/floorplan cards: ${await communityPage.getHomeCardCount()}`);
  });

  test("TC-02 | 'View Home Details' opens a floorplan/home detail page @regression", async () => {
    await communityPage.openFirstHomeDetails();
    await communityPage.verifyHomeDetailOpened(
      constants.community.home_detail_url_pattern,
    );
    console.log(`Opened detail page: ${await communityPage.getUrl()}`);
  });
});
