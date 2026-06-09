import { Page } from "@playwright/test";
import { test } from "./baseTest";
import { CommunityPage } from "../page-objects/communityPage";
import { reportValue } from "../utils/reporter";
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
    await reportValue(`Page URL: ${await communityPage.getUrl()}`);
    await communityPage.verifyHeaderIsDisplayed(
      constants.community.river_ranch_trails_heading,
    );
    await communityPage.verifyStartingPriceIsDisplayed();
    await communityPage.verifyCommunityLocationIsDisplayed();
    await communityPage.verifyOnsiteSalesTeamIsDisplayed();
    await reportValue(
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
    test.setTimeout(600000);
    communityPage = await openCommunity(page);
  });

  test("TC-01 | Floorplan section — cards, carousels, meta data, mortgage calculator and detail navigation @regression", async () => {
    await reportValue(`Page URL: ${await communityPage.getUrl()}`);
    // Floorplan/home cards: render with specs + pricing, images.
    await communityPage.verifyHomeCardsAreDisplayed();
    await reportValue(
      `Home/floorplan cards: ${await communityPage.getHomeCardCount()}`,
    );
    await communityPage.verifyCardImagesAreDisplayed();

    // Every floorplan's two carousels (elevation + gallery): arrow states +
    // all image URLs return 200.
    await communityPage.verifyFloorplanCarousels();

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
    await reportValue(`Opened detail page: ${await communityPage.getUrl()}`);
  });
});

test.describe("Community Page — Quick Move-In Homes", () => {
  let communityPage: CommunityPage;

  test.beforeEach(async ({ page }) => {
    // All 12 QMI cards are walked (images, meta, calculator), so allow headroom.
    test.setTimeout(600000);
    communityPage = await openCommunity(page);
  });

  test("TC-01 | Quick move-in homes — cards, images, meta data, promo rate, mortgage calculator and detail navigation @smoke", async () => {
    await reportValue(`Page URL: ${await communityPage.getUrl()}`);
    // Section + availability.
    await communityPage.verifyQmiSectionIsDisplayed();

    // Load all quick move-in homes (paginated via "Load More").
    await communityPage.loadAllQmiHomes();

    // Every QMI card's single image renders and returns 200.
    await communityPage.verifyQmiCardImages();

    // Every QMI card shows complete, non-empty meta data (+ promo rate if shown).
    await communityPage.verifyAllQmiMetaData();

    // At least one QMI card shows was/now (discounted) pricing.
    await communityPage.verifyWasNowPricingIsDisplayed();

    // Mortgage calculator (random QMI card): opens, fields populated, recalculates.
    await communityPage.openRandomQmiMortgageCalculator();
    await communityPage.verifyCalculatorFieldsHaveData();
    await communityPage.verifyPaymentRecalculates(
      "Down Payment % up",
      () => communityPage.setCalculatorField(1, "60", "Down Payment %"),
      "down",
    );
    await communityPage.verifyPaymentRecalculates(
      "Interest Rate up",
      () => communityPage.setCalculatorField(3, "9", "Interest Rate"),
      "up",
    );
    await communityPage.verifyPaymentRecalculates(
      "Price up",
      () => communityPage.setCalculatorField(0, "400000", "Price"),
      "up",
    );
    await communityPage.verifyPaymentRecalculates(
      "15-year term",
      () => communityPage.selectLoanTerm("15"),
      "up",
    );
    await communityPage.closeMortgageCalculator();

    // QMI card CTA opens its detail page — LAST (it leaves the page).
    await communityPage.openFeaturedQmiHome();
    await communityPage.verifyHomeDetailOpened(
      constants.community.home_detail_url_pattern,
    );
    await reportValue(`Opened QMI detail: ${await communityPage.getUrl()}`);
  });
});
