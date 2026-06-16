import { test } from "./baseTest";
import { PlanDetailPage } from "../page-objects/planDetailPage";

/**
 * Floorplan details page — E5 in docs/test-plan.md. Consolidated into 3 tests by
 * concern (each navigates a fresh, heavy detail page in beforeEach):
 *   TC-01 Overview  ·  TC-02 Media gallery
 *   TC-03 Pricing & calculator
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
  });

  test("TC-01 | Overview — name heading, starting price, CTAs, IFP @smoke", async () => {
    await planPage.verifyPageLoaded();
    console.log(
      `Floorplan: ${await planPage.getHeading()} | Starting price: ${await planPage.getStartingPriceText()}`,
    );
    await planPage.verifyCtasAreDisplayed();
    await planPage.verifyFloorplanIfpIsDisplayed();
  });

  test("TC-02 | Media gallery — modal opens and navigates between images @regression", async () => {
    await planPage.openGalleryModal();
    await planPage.verifyGalleryModalIsDisplayed();
    await planPage.verifyGalleryNavigatesImages();
  });

  test("TC-03 | Pricing & mortgage calculator @regression", async () => {
    await planPage.verifyStartingPriceDisplayed();
    await planPage.verifyMonthlyPaymentIsDisplayed();
    console.log(`Monthly payment: ${await planPage.getMonthlyPaymentText()}`);
    await planPage.openMortgageCalculator();
    await planPage.verifyMortgageCalculatorIsDisplayed();
  });
});
