import { Page } from "@playwright/test";
import { test } from "./baseTest";
import { QmiPage } from "../page-objects/qmiPage";
import constants from "../utils/constants.json";

/**
 * QMI (Quick Move-In) details page — E4 in docs/test-plan.md. Consolidated into
 * 3 tests by concern (each navigates a fresh, heavy detail page in beforeEach):
 *   TC-01 Overview  ·  TC-02 Media gallery
 *   TC-03 Pricing & calculator
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
  });

  test("TC-01 | Overview — heading, key facts, availability, CTAs, IFP @smoke", async () => {
    await qmiPage.verifyQmiDetailPageDisplayed();
    await qmiPage.verifyHeaderIsDisplayed();
    await qmiPage.verifyKeyFactsAreDisplayed();
    console.log(
      `QMI home: ${await qmiPage.getHeading()} | ${await qmiPage.getKeyFactsText()}`,
    );
    await qmiPage.verifyAvailabilityIsDisplayed();
    await qmiPage.verifyCtasAreDisplayed();
    await qmiPage.verifyFloorplanIfpIsDisplayed();
  });

  test("TC-02 | Media gallery — modal navigation + Hero Gallery 2.0 category switch @regression", async () => {
    await qmiPage.openGalleryModal();
    await qmiPage.verifyGalleryModalIsDisplayed();
    await qmiPage.verifyGalleryImageCountMatchesPageCta();
    await qmiPage.verifyGalleryImagesCanBeScrolledThrough();
    await qmiPage.verifyGallerySectionNavIsDisplayed();
    await qmiPage.verifyGalleryImagesChangeAfterCategorySwitch();
    await qmiPage.verifyGalleryModalIsDisplayed();
  });

  test("TC-03 | Pricing & mortgage calculator @regression", async () => {
    await qmiPage.verifyMonthlyPaymentIsDisplayed();
    console.log(`Monthly payment: ${await qmiPage.getMonthlyPaymentText()}`);
    await qmiPage.openMortgageCalculator();
    await qmiPage.verifyMortgageCalculatorValuesUpdate();
  });
});
