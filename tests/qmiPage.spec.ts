import { Page } from "@playwright/test";
import { test } from "./baseTest";
import { QmiPage } from "../page-objects/qmiPage";
import { reportValue } from "../utils/reporter";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";

/**
 * QMI (Quick Move-In) details page — E4 in docs/test-plan.md. Each test
 * navigates a fresh, heavy detail page in beforeEach. Grouped by concern:
 * TC ids restart per section (matching communityPage.spec.ts):
 *   Overview        — TC-01 heading & key facts · TC-02 availability & CTAs
 *                     TC-03 floorplan IFP
 *   Media gallery   — TC-01 modal/count/scroll · TC-02 category switch
 *   Pricing         — TC-01 monthly payment · TC-02 mortgage calculator
 *
 * The "Request Information" form test lives in
 * tests/contactForms.spec.ts alongside the other contact-form surfaces.
 *
 * Pinned to a deterministic, feature-rich QMI home at River Ranch Trails
 * (`constants.qmi.detail_url`) so the gallery, pricing, IFP and CTA checks are
 * stable. If that home is no longer listed, update `constants.qmi.detail_url`.
 * The community → QMI navigation path is covered by communityPage.spec.ts.
 *
 * Not automated here (no applicable data on River Ranch Trails QMI homes):
 *   QD-05 (was/now pricing) — these homes show only a current total price.
 *   QD-08 (QMI sticker breakdown) — no itemized "window sticker" element present.
 * Both remain open data questions in docs/test-plan.md.
 */
async function openQmi(page: Page): Promise<QmiPage> {
  const qmiPage = new QmiPage(page);
  await qmiPage.navigateToQmi(
    constants.qmi.community_url,
    constants.qmi.detail_url,
  );
  return qmiPage;
}

test.describe("QMI Details Page", () => {
  let qmiPage: QmiPage;

  test.describe.configure({ timeout: 150000 });

  test.beforeEach(async ({ page }) => {
    qmiPage = await openQmi(page);
    await reportValue(`Page URL: ${await qmiPage.getUrl()}`);
  });

  test.describe("Overview", () => {
    test("TC-01 | QMI detail page loads with heading and key facts (beds, baths, sq ft) @smoke", async () => {
      await qmiPage.verifyQmiDetailPageDisplayed();
      await qmiPage.verifyHeaderIsDisplayed();
      await qmiPage.verifyKeyFactsAreDisplayed();
      await reportValue(
        `QMI home: ${await qmiPage.getHeading()} | ${await qmiPage.getKeyFactsText()}`,
      );
    });

    test("TC-02 | Availability and CTAs are shown, and 'Request a Tour' opens its scheduling modal @regression", async () => {
      await qmiPage.verifyAvailabilityIsDisplayed();
      await qmiPage.verifyCtasAreDisplayed();
      // CTAs are not just present but functional: "Request a Tour" opens its
      // scheduling modal. (The "Request Information" flow is covered in
      // contactForms.spec.ts.)
      await qmiPage.openRequestTourModal();
      await qmiPage.verifyRequestTourModalIsDisplayed();
    });

    test("TC-03 | Interactive floor plan (IFP) is displayed @regression", async () => {
      await qmiPage.verifyFloorplanIfpIsDisplayed();
    });
  });

  test.describe("Media gallery", () => {
    // Every gallery test needs the modal open and confirmed displayed first.
    test.beforeEach(async () => {
      await qmiPage.openGalleryModal();
      await qmiPage.verifyGalleryModalIsDisplayed();
    });

    test("TC-01 | Gallery modal image count matches the page CTA and images can be scrolled through @regression", async () => {
      await qmiPage.verifyGalleryImageCountMatchesPageCta();
      await qmiPage.verifyGalleryImagesCanBeScrolledThrough();
    });

    test("TC-02 | Hero Gallery 2.0 section navigation switches image categories @regression", async () => {
      await qmiPage.verifyGallerySectionNavIsDisplayed();
      await qmiPage.verifyGalleryImagesChangeAfterCategorySwitch();
      await qmiPage.verifyGalleryModalIsDisplayed();
    });
  });

  test.describe("Pricing", () => {
    test("TC-01 | Estimated monthly payment is displayed @regression", async () => {
      await qmiPage.verifyMonthlyPaymentIsDisplayed();
    });

    test("TC-02 | Mortgage calculator recalculates the payment for each input change @regression", async () => {
      await qmiPage.openMortgageCalculator();
      await qmiPage.verifyCalculatorFieldsHaveData();
      await qmiPage.verifyPaymentRecalculates(
        "Down Payment % up",
        () =>
          qmiPage.setCalculatorField(
            1,
            testData.mortgage_calculator.downPaymentPercent,
            "Down Payment %",
          ),
        "down",
      );
      await qmiPage.verifyPaymentRecalculates(
        "Interest Rate up",
        () =>
          qmiPage.setCalculatorField(
            3,
            testData.mortgage_calculator.interestRate,
            "Interest Rate",
          ),
        "up",
      );
      // Bump the home's current price by a fixed delta so the "up" direction
      // holds regardless of the pinned home's base price.
      const currentPrice = await qmiPage.getCalculatorFieldValue(0);
      await qmiPage.verifyPaymentRecalculates(
        "Price up",
        () =>
          qmiPage.setCalculatorField(
            0,
            String(currentPrice + 50000),
            "Price",
          ),
        "up",
      );
      await qmiPage.verifyPaymentRecalculates(
        "15-year term",
        () => qmiPage.selectLoanTerm("15"),
        "up",
      );
      await qmiPage.closeMortgageCalculator();
    });
  });
});
