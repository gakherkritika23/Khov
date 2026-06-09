import { Page } from "@playwright/test";
import { test } from "./baseTest";
import { QmiPage } from "../page-objects/qmiPage";
import constants from "../utils/constants.json";

/**
 * QMI (Quick Move-In) details page — E4 (QD-01..QD-09) in docs/test-plan.md.
 *
 * Pinned to a deterministic, feature-rich QMI home at River Ranch Trails
 * (`constants.qmi.detail_url`) so the
 * gallery, pricing, IFP and CTA checks are stable. If that home is no longer
 * listed, update `constants.qmi.detail_url` to another gallery-capable QMI home.
 * The community → QMI navigation path is covered by communityPage.spec.ts
 * (CP-23).
 *
 * Not automated here (no applicable data on River Ranch Trails QMI homes):
 *   QD-05 (was/now pricing) — these homes show only a current total price, no
 *         discounted was/now. Needs a community/home that has it.
 *   QD-08 (QMI sticker breakdown) — no itemized "window sticker" element is
 *         present in the DOM for this home.
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

// Shared across every block: a fresh QMI detail page is opened before each test.
let qmiPage: QmiPage;

test.describe.configure({ timeout: 150000 });

test.beforeEach(async ({ page }) => {
  qmiPage = await openQmi(page);
});

test.describe("QMI Details Page — Overview", () => {
  test("QD-01 | QMI details page loads with heading and key facts @smoke", async () => {
    await qmiPage.verifyQmiDetailPageDisplayed();
    await qmiPage.verifyHeaderIsDisplayed();
    await qmiPage.verifyKeyFactsAreDisplayed();
    console.log(
      `QMI home: ${await qmiPage.getHeading()} | ${await qmiPage.getKeyFactsText()}`,
    );
  });

  test("QD-06 | Availability is displayed @regression", async () => {
    await qmiPage.verifyAvailabilityIsDisplayed();
  });

  test("QD-09 | Request Information CTA opens modal with required fields @regression", async () => {
    await qmiPage.verifyCtasAreDisplayed();
    await qmiPage.openRequestInformationModal();
    await qmiPage.verifyRequestInformationModalIsDisplayed();
    await qmiPage.verifyRequestInformationModalFields();
  });
});

test.describe("QMI Details Page — Request Information Form", () => {
  test("QD-10 | Required fields reject invalid values and block submission @regression", async () => {
    await qmiPage.verifyCtasAreDisplayed();
    await qmiPage.openRequestInformationModal();
    await qmiPage.verifyRequestInformationModalIsDisplayed();
    await qmiPage.verifyRequestInformationInvalidValueValidation();
  });

  test("QD-11 | Request Information form submits successfully with valid values @regression", async () => {
    await qmiPage.verifyCtasAreDisplayed();
    await qmiPage.openRequestInformationModal();
    await qmiPage.verifyRequestInformationModalIsDisplayed();

    // Never creates a real lead on prod — submitRequestInformationForm fills the
    // form but skips submission there, returning null. On non-prod it captures
    // the contact-us API response so we can assert the API result and that the
    // posted payload matches what we entered.
    const response = await qmiPage.submitRequestInformationForm(
      constants.qmi.contact_us_api,
    );
    if (response) {
      await qmiPage.verifyRequestInformationApiSubmission(response);
      await qmiPage.verifyRequestInformationSubmissionSuccess();
    }
  });
});

test.describe("QMI Details Page — Media Gallery", () => {
  test("QD-02 | Media gallery modal opens and navigates between images @regression", async () => {
    await qmiPage.openGalleryModal();
    await qmiPage.verifyGalleryModalIsDisplayed();
    await qmiPage.verifyGalleryImageCountMatchesPageCta();
    await qmiPage.verifyGalleryImagesCanBeScrolledThrough();
  });

  test("QD-03 | Hero Gallery 2.0 — change image category and validate images @regression", async () => {
    await qmiPage.openGalleryModal();
    await qmiPage.verifyGallerySectionNavIsDisplayed();
    await qmiPage.verifyGalleryImagesChangeAfterCategorySwitch();
    await qmiPage.verifyGalleryModalIsDisplayed();
  });
});

test.describe("QMI Details Page — Pricing", () => {
  test("QD-04a | Estimated monthly payment is displayed @regression", async () => {
    await qmiPage.verifyMonthlyPaymentIsDisplayed();
    console.log(`Monthly payment: ${await qmiPage.getMonthlyPaymentText()}`);
  });

  test("QD-04b | Mortgage calculator popover opens @regression", async () => {
    await qmiPage.openMortgageCalculator();
    await qmiPage.verifyMortgageCalculatorValuesUpdate();
  });
});

test.describe("QMI Details Page — Interactive Floor Plan", () => {
  test("QD-07 | Interactive floor plan (IFP) is displayed @regression", async () => {
    await qmiPage.verifyFloorplanIfpIsDisplayed();
  });
});
