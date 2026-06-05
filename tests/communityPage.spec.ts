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

test.describe("Community Page — Floorplan Section", () => {
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    communityPage = await openCommunity(page);
  });

  test("TC-01 | Floorplan section — cards, images, carousel, meta data, mortgage calculator and detail navigation @regression", async () => {
    // Floorplan/home cards: render with specs + pricing, images, carousel.
    await communityPage.verifyHomeCardsAreDisplayed();
    console.log(`Home/floorplan cards: ${await communityPage.getHomeCardCount()}`);
    await communityPage.verifyCardImagesAreDisplayed();
    await communityPage.verifyCarouselIsDisplayed();

    // Every floorplan shows complete, non-empty meta data.
    await communityPage.verifyAllFloorplanMetaData();

    // Mortgage calculator: open a random floorplan's, validate fields,
    // recalculate per input (direction), then close.
    await communityPage.openRandomFloorplanMortgageCalculator();
    await communityPage.verifyCalculatorFieldsHaveData();
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

    // Card CTA opens a floorplan/home detail page — LAST (it leaves the page).
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
