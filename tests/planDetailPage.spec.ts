import { test } from "./baseTest";
import { PlanDetailPage } from "../page-objects/planDetailPage";
import constants from "../utils/constants.json";

/**
 * Floorplan details page — E5 (FD-01..FD-06) in docs/test-plan.md.
 *
 * Pinned to a deterministic floorplan — Clyde II at River Ranch Trails
 * (`constants.floorplan.detail_url`) — so the gallery, pricing, IFP, CTA and
 * Request Information form checks are stable. If that floorplan is retired,
 * update `constants.floorplan.detail_url`.
 */
let planPage: PlanDetailPage;

test.describe.configure({ timeout: 150000 });

test.beforeEach(async ({ page }) => {
    planPage = await PlanDetailPage.openFloorplan(page);
});

test.describe("Floorplan Details Page — Overview", () => {
    test("FD-01 | Floorplan details page loads with name heading and starting price @smoke", async () => {
        await planPage.verifyPageLoaded();
        console.log(
            `Floorplan: ${await planPage.getHeading()} | Starting price: ${await planPage.getStartingPriceText()}`,
        );
    });

    test("FD-04 | Starting price is displayed @regression", async () => {
        await planPage.verifyStartingPriceDisplayed();
    });

    test("FD-06 | CTAs (Request a Tour / Request Information) are present @regression", async () => {
        await planPage.verifyCtasAreDisplayed();
    });
});

test.describe("Floorplan Details Page — Media Gallery", () => {
    test("FD-02 | Media gallery modal opens and navigates between images @regression", async () => {
        await planPage.openGalleryModal();
        await planPage.verifyGalleryModalIsDisplayed();
        await planPage.verifyGalleryNavigatesImages();
    });
});

test.describe("Floorplan Details Page — Pricing", () => {
    test("FD-03a | Estimated monthly payment is displayed @regression", async () => {
        await planPage.verifyMonthlyPaymentIsDisplayed();
        console.log(`Monthly payment: ${await planPage.getMonthlyPaymentText()}`);
    });

    test("FD-03b | Mortgage calculator modal opens @regression", async () => {
        await planPage.openMortgageCalculator();
        await planPage.verifyMortgageCalculatorIsDisplayed();
    });
});

test.describe("Floorplan Details Page — Interactive Floor Plan", () => {
    test("FD-05 | Interactive floor plan (IFP) is displayed @regression", async () => {
        await planPage.verifyFloorplanIfpIsDisplayed();
    });
});

test.describe("Floorplan Details Page — Request Information Form", () => {
    test("FD-07 | Request Information CTA opens modal with required fields @regression", async () => {
        await planPage.verifyCtasAreDisplayed();
        await planPage.openRequestInformationModal();
        await planPage.verifyRequestInformationModalIsDisplayed();
        await planPage.verifyRequestInformationModalFields();
    });

    test("FD-08 | Required fields reject invalid values and block submission @regression", async () => {
        await planPage.verifyCtasAreDisplayed();
        await planPage.openRequestInformationModal();
        await planPage.verifyRequestInformationModalIsDisplayed();
        await planPage.verifyRequestInformationInvalidValueValidation();
    });

    test("FD-09 | Request Information form submits successfully with valid values @regression", async () => {
        await planPage.verifyCtasAreDisplayed();
        await planPage.openRequestInformationModal();
        await planPage.verifyRequestInformationModalIsDisplayed();

        // Never creates a real lead on prod — submitRequestInformationForm fills the
        // form but skips submission there, returning null. On non-prod it captures
        // the contact-us API response so we can assert the API result and that the
        // posted payload matches what we entered.
        const response = await planPage.submitRequestInformationForm(
            constants.floorplan.contact_us_api,
        );
        if (response) {
            await planPage.verifyRequestInformationApiSubmission(response);
            await planPage.verifyRequestInformationSubmissionSuccess();
        }
    });
});