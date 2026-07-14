import { test } from "./baseTest";
import { PlanDetailPage } from "../page-objects/planDetailPage";
import { reportValue } from "../utils/reporter";
import testData from "../utils/test_data.json";

/**
 * Floorplan details page — E5 in docs/test-plan.md. Each test navigates a fresh,
 * heavy detail page in beforeEach. TC ids restart per section (matching
 * communityPage.spec.ts):
 *   Overview        — TC-01 name & starting price · TC-02 CTAs (+ Request a Tour)
 *                     TC-03 IFP
 *   Media gallery   — TC-01 modal & image · TC-02 navigates images
 *   Pricing         — TC-01 monthly payment · TC-02 mortgage calculator
 *
 * The "Request Information" form test lives in
 * tests/contactForms.spec.ts alongside the other contact-form surfaces.
 *
 * Pinned to a deterministic floorplan — Clyde II at River Ranch Trails
 * (`constants.floorplan.detail_url`). If that floorplan is retired, update it.
 */
test.describe("Floorplan Details Page", () => {
  let planPage: PlanDetailPage;

  test.describe.configure({ timeout: 150000 });

  test.beforeEach(async ({ page }) => {
    planPage = await PlanDetailPage.openFloorplan(page);
    await reportValue(`Page URL: ${await planPage.getUrl()}`);
  });

  test.describe("Overview", () => {
    test("TC-01 | Floorplan detail page loads with name heading and starting price @smoke", async () => {
      await planPage.verifyPageLoaded();
      await reportValue(
        `Floorplan: ${await planPage.getHeading()} | Starting price: ${await planPage.getStartingPriceText()}`,
      );
    });

    test("TC-02 | CTAs are shown, and 'Request a Tour' opens its scheduling modal @regression", async () => {
      await planPage.verifyCtasAreDisplayed();
      // CTAs are not just present but functional: "Request a Tour" opens its
      // scheduling modal. (The "Request Information" flow is covered in
      // contactForms.spec.ts.)
      await planPage.openRequestTourModal();
      await planPage.verifyRequestTourModalIsDisplayed();
    });

    test("TC-03 | Interactive floor plan (IFP) is displayed @regression", async () => {
      await planPage.verifyFloorplanIfpIsDisplayed();
    });
  });

  test.describe("Media gallery", () => {
    // Every gallery test needs the modal open first.
    test.beforeEach(async () => {
      await planPage.openGalleryModal();
    });

    test("TC-01 | Gallery modal opens and shows an image @regression", async () => {
      await planPage.verifyGalleryModalIsDisplayed();
    });

    test("TC-02 | Gallery navigates between images @regression", async () => {
      await planPage.verifyGalleryNavigatesImages();
    });
  });

  test.describe("Pricing", () => {
    test("TC-01 | Estimated monthly payment is displayed @regression", async () => {
      await planPage.verifyMonthlyPaymentIsDisplayed();
    });

    test("TC-02 | Mortgage calculator recalculates the payment for each input change @regression", async () => {
      await planPage.openMortgageCalculator();
      const calc = planPage.mortgageCalculator;
      await calc.verifyFieldsHaveData();
      await calc.verifyPaymentRecalculates(
        "Down Payment % up",
        () =>
          calc.setField(
            1,
            testData.mortgage_calculator.downPaymentPercent,
            "Down Payment %",
          ),
        "down",
      );
      await calc.verifyPaymentRecalculates(
        "Interest Rate up",
        () =>
          calc.setField(
            3,
            testData.mortgage_calculator.interestRate,
            "Interest Rate",
          ),
        "up",
      );
      // Bump the floorplan's current price by a fixed delta so the "up" direction
      // holds regardless of the pinned floorplan's starting price.
      const currentPrice = await calc.getFieldValue(0);
      await calc.verifyPaymentRecalculates(
        "Price up",
        () => calc.setField(0, String(currentPrice + 50000), "Price"),
        "up",
      );
      await calc.verifyPaymentRecalculates(
        "15-year term",
        () => calc.selectLoanTerm("15"),
        "up",
      );
      await calc.close();
    });
  });
});
