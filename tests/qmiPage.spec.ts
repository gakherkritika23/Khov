import { Page } from "@playwright/test";
import { test } from "./baseTest";
import { QmiPage } from "../page-objects/qmiPage";
import constants from "../utils/constants.json";

/**
 * QMI (Quick Move-In) details page — E4 in docs/test-plan.md. Consolidated into
 * 4 tests by concern (each navigates a fresh, heavy detail page in beforeEach):
 *   TC-01 Overview (QD-01/06/07)  ·  TC-02 Media gallery (QD-02/03)
 *   TC-03 Pricing & calculator (QD-04a/04b)  ·  TC-04 Request Information (QD-09/10/11)
 *
 * Pinned to a deterministic, feature-rich QMI home at River Ranch Trails
 * (`constants.qmi.detail_url`) so the gallery, pricing, IFP and CTA checks are
 * stable. If that home is no longer listed, update `constants.qmi.detail_url`.
 * The community → QMI navigation path is covered by communityPage.spec.ts (CP-23).
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

let qmiPage: QmiPage;

test.describe.configure({ timeout: 150000 });

test.describe("QMI Details Page", () => {
  test.beforeEach(async ({ page }) => {
    qmiPage = await openQmi(page);
  });

  test("TC-01 | Overview — heading, key facts, availability, CTAs, IFP (QD-01/06/07) @smoke", async () => {
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

  test("TC-02 | Media gallery — modal navigation + Hero Gallery 2.0 category switch (QD-02/03) @regression", async () => {
    await qmiPage.openGalleryModal();
    await qmiPage.verifyGalleryModalIsDisplayed();
    await qmiPage.verifyGalleryImageCountMatchesPageCta();
    await qmiPage.verifyGalleryImagesCanBeScrolledThrough();
    await qmiPage.verifyGallerySectionNavIsDisplayed();
    await qmiPage.verifyGalleryImagesChangeAfterCategorySwitch();
    await qmiPage.verifyGalleryModalIsDisplayed();
  });

  test("TC-03 | Pricing & mortgage calculator (QD-04a/04b) @regression", async () => {
    await qmiPage.verifyMonthlyPaymentIsDisplayed();
    console.log(`Monthly payment: ${await qmiPage.getMonthlyPaymentText()}`);
    await qmiPage.openMortgageCalculator();
    await qmiPage.verifyMortgageCalculatorValuesUpdate();
  });

  test("TC-04 | Request Information form — fields, validation, submit (QD-09/10/11) @regression", async () => {
    await qmiPage.verifyCtasAreDisplayed();
    await qmiPage.openRequestInformationModal();
    await qmiPage.verifyRequestInformationModalIsDisplayed();
    await qmiPage.verifyRequestInformationModalFields();
    await qmiPage.verifyRequestInformationRequiredFieldValidation();
    await qmiPage.verifyRequestInformationInvalidValueValidation();

    // Never creates a real lead on prod — submitRequestInformationForm fills the
    // form but skips submission there (returns null). On non-prod it captures the
    // contact-us API response so we can assert the result + posted payload.
    const response = await qmiPage.submitRequestInformationForm(
      constants.qmi.contact_us_api,
    );
    if (response) {
      await qmiPage.verifyRequestInformationApiSubmission(response);
      await qmiPage.verifyRequestInformationSubmissionSuccess();
    }
  });
});
