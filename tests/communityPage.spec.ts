import { Page } from "@playwright/test";
import { test } from "./baseTest";
import { CommunityPage } from "../page-objects/communityPage";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";

/**
 * The community spec is pinned to a specific, feature-rich community (River
 * Ranch Trails) so the conditional-feature checks (promo rate, was/now pricing,
 * quick move-in homes) are deterministic. We navigate directly to it for
 * reliability; the search-bar route to a community is covered by SB-03
 * (homePage.spec.ts). If this community is ever retired, update
 * `constants.community.river_ranch_trails_url`.
 */
async function openCommunity(page: Page): Promise<CommunityPage> {
  const communityPage = new CommunityPage(page);
  await communityPage.navigateToCommunity(
    constants.community.river_ranch_trails_url,
  );
  return communityPage;
}

test.describe("Community Page — Listing Header", () => {
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    communityPage = await openCommunity(page);
  });

  test("TC-01 | Community page loads with name, starting price, location, sales team and office hours @smoke", async () => {
    await communityPage.verifyHeaderIsDisplayed(
      constants.community.river_ranch_trails_heading,
    );
    await communityPage.verifyStartingPriceIsDisplayed();
    await communityPage.verifyCommunityLocationIsDisplayed();
    await communityPage.verifyOnsiteSalesTeamIsDisplayed();
    console.log(
      `Community: ${await communityPage.getHeading()} | ${await communityPage.getStartingPriceText()}`,
    );

    // Sales office hours are present (days + timings) and logged.
    await communityPage.verifySalesOfficeHoursNotEmpty();

    // "Your Onsite Sales Team" opens the contact modal — every section present.
    await communityPage.openSalesTeamModal();
    await communityPage.verifySalesTeamModalDetails();
    await communityPage.closeSalesTeamModal();
  });
});

test.describe("Community Page — Floorplan & Home Cards", () => {
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    communityPage = await openCommunity(page);
  });

  test("TC-01 | Floorplan/home cards render with specs and pricing @smoke", async () => {
    await communityPage.verifyHomeCardsAreDisplayed();
    console.log(`Home/floorplan cards: ${await communityPage.getHomeCardCount()}`);
  });

  test("TC-02 | Floorplan/home card images are displayed @regression", async () => {
    await communityPage.verifyCardImagesAreDisplayed();
  });

  test("TC-03 | Image carousel is displayed @regression", async () => {
    await communityPage.verifyCarouselIsDisplayed();
  });

  test("TC-04 | 'View Home Details' opens a floorplan/home detail page @regression", async () => {
    await communityPage.openFirstHomeDetails();
    await communityPage.verifyHomeDetailOpened(
      constants.community.home_detail_url_pattern,
    );
    console.log(`Opened detail page: ${await communityPage.getUrl()}`);
  });
});

test.describe("Community Page — Quick Move-In Homes", () => {
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    communityPage = await openCommunity(page);
  });

  test("TC-01 | Quick move-in homes section shows homes with availability @smoke", async () => {
    await communityPage.verifyQmiSectionIsDisplayed();
  });

  test("TC-02 | Quick move-in promo rate is displayed @regression", async () => {
    await communityPage.verifyPromoRateIsDisplayed();
  });

  test("TC-03 | Quick move-in was/now (discounted) pricing is displayed @regression", async () => {
    await communityPage.verifyWasNowPricingIsDisplayed();
  });

  test("TC-04 | Quick move-in home card opens its detail page @regression", async () => {
    await communityPage.openFeaturedQmiHome();
    await communityPage.verifyHomeDetailOpened(
      constants.community.home_detail_url_pattern,
    );
    console.log(`Opened QMI detail: ${await communityPage.getUrl()}`);
  });
});

test.describe("Community Page — Floorplan Mortgage Calculator", () => {
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    communityPage = await openCommunity(page);
  });

  test("TC-01 | Floorplan mortgage calculator opens, validates fields, recalculates and closes @regression", async () => {
    // Random floorplan → info icon → "Mortgage Calculator" → modal.
    await communityPage.openRandomFloorplanMortgageCalculator();

    // Every field has data and the estimated payment shows at the top.
    await communityPage.verifyCalculatorFieldsHaveData();

    // Edit each input; the top price recalculates in the expected direction.
    await communityPage.verifyPaymentRecalculates(
      "Down Payment % up",
      () =>
        communityPage.setCalculatorField(
          1,
          testData.mortgage_calculator.downPaymentPercent,
          "Down Payment %",
        ),
      "down",
    );
    await communityPage.verifyPaymentRecalculates(
      "Interest Rate up",
      () =>
        communityPage.setCalculatorField(
          3,
          testData.mortgage_calculator.interestRate,
          "Interest Rate",
        ),
      "up",
    );
    await communityPage.verifyPaymentRecalculates(
      "Price up",
      () =>
        communityPage.setCalculatorField(
          0,
          testData.mortgage_calculator.price,
          "Price",
        ),
      "up",
    );
    await communityPage.verifyPaymentRecalculates(
      "15-year term",
      () => communityPage.selectLoanTerm("15"),
      "up",
    );

    await communityPage.closeMortgageCalculator();
  });
});
