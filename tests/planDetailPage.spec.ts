import { test } from "./baseTest";
import { PlanDetailPage } from "../page-objects/planDetailPage";
import constants from "../utils/constants.json";

/**
 * Floorplan details page — E5 in docs/test-plan.md. Consolidated into 4 tests by
 * concern (each navigates a fresh, heavy detail page in beforeEach):
 *   TC-01 Overview (FD-01/06/05)  ·  TC-02 Media gallery (FD-02)
 *   TC-03 Pricing & calculator (FD-04/03a/03b)  ·  TC-04 Request Information (FD-07/08/09)
 *
 * Pinned to a deterministic floorplan — Clyde II at River Ranch Trails
 * (`constants.floorplan.detail_url`). If that floorplan is retired, update it.
 */
let planPage: PlanDetailPage;

test.describe.configure({ timeout: 150000 });

test.describe("Floorplan Details Page", () => {
    test.beforeEach(async ({ page }) => {
        planPage = await PlanDetailPage.openFloorplan(page);
    });

    test("TC-01 | Overview — name heading, starting price, CTAs, IFP (FD-01/06/05) @smoke", async () => {
        await planPage.verifyPageLoaded();
        console.log(
            `Floorplan: ${await planPage.getHeading()} | Starting price: ${await planPage.getStartingPriceText()}`,
        );
        await planPage.verifyCtasAreDisplayed();
        await planPage.verifyFloorplanIfpIsDisplayed();
    });

    test("TC-02 | Media gallery — modal opens and navigates between images (FD-02) @regression", async () => {
        await planPage.openGalleryModal();
        await planPage.verifyGalleryModalIsDisplayed();
        await planPage.verifyGalleryNavigatesImages();
    });

    test("TC-03 | Pricing & mortgage calculator (FD-04/03a/03b) @regression", async () => {
        await planPage.verifyStartingPriceDisplayed();
        await planPage.verifyMonthlyPaymentIsDisplayed();
        console.log(`Monthly payment: ${await planPage.getMonthlyPaymentText()}`);
        await planPage.openMortgageCalculator();
        await planPage.verifyMortgageCalculatorIsDisplayed();
    });

    test("TC-04 | Request Information form — fields, validation, submit (FD-07/08/09) @regression", async () => {
        await planPage.verifyCtasAreDisplayed();
        await planPage.openRequestInformationModal();
        await planPage.verifyRequestInformationModalIsDisplayed();
        await planPage.verifyRequestInformationModalFields();
        await planPage.verifyRequestInformationRequiredFieldValidation();
        await planPage.verifyRequestInformationInvalidValueValidation();

        // Never creates a real lead on prod — submitRequestInformationForm fills
        // the form but skips submission there (returns null). On non-prod it
        // captures the contact-us API response so we can assert it + the payload.
        const response = await planPage.submitRequestInformationForm(
            constants.floorplan.contact_us_api,
        );
        if (response) {
            await planPage.verifyRequestInformationApiSubmission(response);
            await planPage.verifyRequestInformationSubmissionSuccess();
        }
    });
});
