import { Page, expect } from "@playwright/test";
import { test } from "./baseTest";
import { ContactUsPage } from "../page-objects/contactUsPage";
import { QmiPage } from "../page-objects/qmiPage";
import { PlanDetailPage } from "../page-objects/planDetailPage";
import { CommunityPage } from "../page-objects/communityPage";
import { HomePage } from "../page-objects/homePage";
import { RegionPage } from "../page-objects/regionPage";
import { reportValue } from "../utils/reporter";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";

/**
 * All contact-form verification across khov.com lives in this spec. The surfaces
 * share the same underlying form component but are reached differently, so each
 * gets its own describe block + navigation:
 *   1. Contact Us page (footer "Contact Us" link) — the 5 "What are you
 *      interested in?" interest forms (field audit, validation, submit).
 *   2. QMI details page — the "Request Information" modal form.
 *   3. Floorplan details page — the "Request Information" modal form.
 *   4. Community details page — the header "Request Information" modal form.
 *   5. Region (market results) page — the first community card's "Request
 *      Information" modal form.
 *
 * Submission never creates a real lead on prod: each submit path fills the form
 * but skips the actual submit there, asserting success + the API only on non-prod.
 */

// ── 1. Contact Us page — 5 interest forms ──────────────────────────────
// Reached via the footer "Contact Us" link. One test per interest (the 5 forms
// differ). Each test:
//   1. select interest → verify fields exist → log dropdown options (Step 1)
//   2. required-field validation (submit empty)            — all envs
//   3. invalid email/phone validation                      — all envs
//   4. fill valid data → submit → success + /api/contact-us/ 200 (non-prod);
//      on PROD the form is filled but NOT submitted (no real lead).
test.describe("Contact Us — Field & Dropdown Audit", () => {
  let contactUsPage: ContactUsPage;

  test.beforeEach(async ({ page }) => {
    // Footer nav + field audit + validation + fill + submit (Turnstile) per test.
    test.setTimeout(180000);
    contactUsPage = new ContactUsPage(page);
    await contactUsPage.navigateToContactViaFooter(constants.home_page.url);
    await contactUsPage.verifyContactPageDisplayed();
  });

  test("TC-01 | Shopping for a new home — fields exist + dropdown options @form @smoke", async () => {
    await reportValue(`Page URL: ${await contactUsPage.getUrl()}`);
    await contactUsPage.selectInterest("I am shopping for a new home");
    await contactUsPage.verifyFieldsForInterest("I am shopping for a new home");
    await contactUsPage.logDropdownOptions("I am shopping for a new home");
    await contactUsPage.verifyRequiredFieldValidation("I am shopping for a new home");
    await contactUsPage.verifyInvalidEmailPhoneValidation("I am shopping for a new home");
    const resp = await contactUsPage.submitForm(
      "I am shopping for a new home",
      testData.endpoint.contact_us,
    );
    if (resp) await contactUsPage.verifySubmissionSuccess("I am shopping for a new home");
  });

  test("TC-02 | Mortgage information — fields exist + dropdown options @form @regression", async () => {
    await reportValue(`Page URL: ${await contactUsPage.getUrl()}`);
    await contactUsPage.selectInterest("I would like mortgage information");
    await contactUsPage.verifyFieldsForInterest("I would like mortgage information");
    await contactUsPage.logDropdownOptions("I would like mortgage information");
    await contactUsPage.verifyRequiredFieldValidation("I would like mortgage information");
    await contactUsPage.verifyInvalidEmailPhoneValidation("I would like mortgage information");
    const resp = await contactUsPage.submitForm(
      "I would like mortgage information",
      testData.endpoint.contact_us,
    );
    if (resp) await contactUsPage.verifySubmissionSuccess("I would like mortgage information");
  });

  test("TC-03 | Real estate professional — fields exist + dropdown options @form @regression", async () => {
    await reportValue(`Page URL: ${await contactUsPage.getUrl()}`);
    await contactUsPage.selectInterest("I am a real estate professional");
    await contactUsPage.verifyFieldsForInterest("I am a real estate professional");
    await contactUsPage.logDropdownOptions("I am a real estate professional");
    await contactUsPage.verifyRequiredFieldValidation("I am a real estate professional");
    await contactUsPage.verifyInvalidEmailPhoneValidation("I am a real estate professional");
    const resp = await contactUsPage.submitForm(
      "I am a real estate professional",
      testData.endpoint.contact_us,
    );
    if (resp) await contactUsPage.verifySubmissionSuccess("I am a real estate professional");
  });

  test("TC-04 | Subcontractor — fields exist + dropdown options @form @regression", async () => {
    await reportValue(`Page URL: ${await contactUsPage.getUrl()}`);
    await contactUsPage.selectInterest("I am a subcontractor");
    await contactUsPage.verifyFieldsForInterest("I am a subcontractor");
    await contactUsPage.logDropdownOptions("I am a subcontractor");
    await contactUsPage.verifyRequiredFieldValidation("I am a subcontractor");
    await contactUsPage.verifyInvalidEmailPhoneValidation("I am a subcontractor");
    const resp = await contactUsPage.submitForm(
      "I am a subcontractor",
      testData.endpoint.contact_us,
    );
    if (resp) await contactUsPage.verifySubmissionSuccess("I am a subcontractor");
  });

  test("TC-05 | Selling land — fields exist + dropdown options @form @regression", async () => {
    await reportValue(`Page URL: ${await contactUsPage.getUrl()}`);
    await contactUsPage.selectInterest("I am selling land");
    await contactUsPage.verifyFieldsForInterest("I am selling land");
    await contactUsPage.logDropdownOptions("I am selling land");
    await contactUsPage.verifyRequiredFieldValidation("I am selling land");
    await contactUsPage.verifyInvalidEmailPhoneValidation("I am selling land");
    const resp = await contactUsPage.submitForm(
      "I am selling land",
      testData.endpoint.contact_us,
    );
    if (resp) await contactUsPage.verifySubmissionSuccess("I am selling land");
  });
});

// ── 1b. Contact Us — "Find your local information" → Send us a text message ─
// The right-rail "Select a State" dropdown lists K. Hovnanian regions. Picking a
// region reveals local contact info incl. an "Or Send Us a Text Message" CTA that
// opens a "Send us a text message" modal. The dropdown is verified on every env;
// the modal flow runs end-to-end (dev submits, prod fills only) and best-effort
// skips if the selected region happens to surface no local-information results.
test.describe("Contact Us — Local Information & Text Message", () => {
  let contactUsPage: ContactUsPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(180000);
    contactUsPage = new ContactUsPage(page);
    await contactUsPage.navigateToContactViaFooter(constants.home_page.url);
    await contactUsPage.verifyContactPageDisplayed();
  });

  test("TC-01 | Find your local information — all regions appear exactly once (no duplicates) @form @smoke", async () => {
    await reportValue(`Page URL: ${await contactUsPage.getUrl()}`);
    await contactUsPage.verifyLocalInfoRegions(
      constants.contact_us.state_of_interest_options,
    );
  });

  test("TC-02 | Send us a text message — fields, validation, fill/submit @form @smoke", async () => {
    // Pick randomly from the single-occurrence states only. The duplicated
    // dropdown regions surface no local-information results, so a random pick
    // across the full list was flaky; every state in this set is verified to
    // have local info + a Send-us-a-text-message CTA.
    const states = testData.contact_us.local_information_states;
    const state = states[Math.floor(Math.random() * states.length)];
    await reportValue(`Local-information state: ${state}`);
    await contactUsPage.selectLocalInfoState(state);

    // The CTA + modal render only when the chosen region surfaces local-info
    // results. Treat a missing CTA/modal as a FAILURE (data expected to be
    // visible) rather than skipping.
    const opened = await contactUsPage.openTextMessageModal();
    expect(
      opened,
      "Selected region surfaced no local-information results (no Send-us-a-text-message CTA) — expected the local-information CTA + modal to be available.",
    ).toBeTruthy();

    await contactUsPage.verifyTextMessageModalFields();
    await contactUsPage.verifyTextMessageRequiredFieldValidation();
    await contactUsPage.verifyTextMessageInvalidEmailPhoneValidation();
    // Non-prod submits; prod fills only (no lead). On prod this is the typical
    // path since the modal is only reachable there.
    const resp = await contactUsPage.submitTextMessageForm(
      testData.endpoint.contact_us,
    );
    if (resp) await contactUsPage.verifyTextMessageSubmissionSuccess();
  });
});

// ── 2. QMI details page — Request Information form ─────────────────────
// Pinned to a deterministic, feature-rich QMI home at River Ranch Trails
// (`constants.qmi.detail_url`). If that home is no longer listed, update it.
async function openQmi(page: Page): Promise<QmiPage> {
  const qmiPage = new QmiPage(page);
  await qmiPage.navigateToQmi(
    constants.qmi.community_url,
    constants.qmi.detail_url,
  );
  return qmiPage;
}

test.describe("QMI Details — Request Information Form", () => {
  let qmiPage: QmiPage;

  test.describe.configure({ timeout: 150000 });

  test.beforeEach(async ({ page }) => {
    qmiPage = await openQmi(page);
  });

  test("TC-01 | Request Information form — fields, validation, submit @form @smoke", async () => {
    await qmiPage.verifyCtasAreDisplayed();
    await qmiPage.openRequestInformationModal();
    await qmiPage.requestInfo.verifyModalIsDisplayed();
    await qmiPage.requestInfo.verifyModalFields();
    await qmiPage.requestInfo.verifyRequiredFieldValidation();
    await qmiPage.requestInfo.verifyInvalidValueValidation();

    // Never creates a real lead on prod — submit() fills the form but skips
    // submission there (returns null). On non-prod it captures the contact-us
    // API response so we can assert the result + posted payload.
    const response = await qmiPage.requestInfo.submit(constants.qmi.contact_us_api);
    if (response) {
      await qmiPage.requestInfo.verifyApiSubmission(response);
      await qmiPage.requestInfo.verifySubmissionSuccess();
    }
  });
});

// ── 3. Floorplan details page — Request Information form ───────────────
// Pinned to a deterministic floorplan — Clyde II at River Ranch Trails
// (`constants.floorplan.detail_url`). If that floorplan is retired, update it.
test.describe("Floorplan Details — Request Information Form", () => {
  let planPage: PlanDetailPage;

  test.describe.configure({ timeout: 150000 });

  test.beforeEach(async ({ page }) => {
    planPage = await PlanDetailPage.openFloorplan(page);
  });

  test("TC-01 | Request Information form — fields, validation, submit @form @regression", async () => {
    await planPage.verifyCtasAreDisplayed();
    await planPage.openRequestInformationModal();
    await planPage.requestInfo.verifyModalIsDisplayed();
    await planPage.requestInfo.verifyModalFields();
    await planPage.requestInfo.verifyRequiredFieldValidation();
    await planPage.requestInfo.verifyInvalidValueValidation();

    // Never creates a real lead on prod — submit() fills the form but skips
    // submission there (returns null). On non-prod it captures the contact-us
    // API response so we can assert it + the payload.
    const response = await planPage.requestInfo.submit(
      constants.floorplan.contact_us_api,
    );
    if (response) {
      await planPage.requestInfo.verifyApiSubmission(response);
      await planPage.requestInfo.verifySubmissionSuccess();
    }
  });
});

// ── 4. Community details page — Request Information form ───────────────
// Pinned to River Ranch Trails (`constants.community.river_ranch_trails_url`).
// The header "Request Information" CTA opens the same shared form component.
async function openCommunity(page: Page): Promise<CommunityPage> {
  const communityPage = new CommunityPage(page);
  await communityPage.navigateToCommunity(
    constants.community.river_ranch_trails_url,
  );
  return communityPage;
}

test.describe("Community Details — Request Information Form", () => {
  let communityPage: CommunityPage;

  // The community page is heavy (galleries/maps/video); allow extra headroom on
  // top of the modal + Turnstile + submit steps.
  test.describe.configure({ timeout: 180000 });

  test.beforeEach(async ({ page }) => {
    communityPage = await openCommunity(page);
  });

  test("TC-01 | Request Information form — fields, validation, submit @form @smoke", async () => {
    await communityPage.verifyRequestInfoCtaIsDisplayed();
    await communityPage.openRequestInformationModal();
    await communityPage.requestInfo.verifyModalIsDisplayed();
    await communityPage.requestInfo.verifyModalFields();
    await communityPage.requestInfo.verifyRequiredFieldValidation();
    await communityPage.requestInfo.verifyInvalidValueValidation();

    // Never creates a real lead on prod — submit() fills the form but skips
    // submission there (returns null). On non-prod it captures the contact-us
    // API response so we can assert the result + posted payload.
    const response = await communityPage.requestInfo.submit(
      constants.community.contact_us_api,
    );
    if (response) {
      await communityPage.requestInfo.verifyApiSubmission(response);
      await communityPage.requestInfo.verifySubmissionSuccess();
    }
  });
});

// ── 5. Region (market results) page — Request Information form ─────────
// Reached from the Home page: search "Dallas" → select the "Dallas" suggestion
// → the "New Home Communities" results page. The first community card carries a
// "Request Information" CTA that opens the same shared form component.
// test.describe("Region Page — Request Information Form", () => {
//   let homePage: HomePage;
//   let regionPage: RegionPage;

//   // Home search + heavy results page (map + cards) + modal/Turnstile/submit.
//   test.describe.configure({ timeout: 180000 });

//   test.beforeEach(async ({ page }) => {
//     homePage = new HomePage(page);
//     regionPage = new RegionPage(page);
//     await homePage.navigateToHome(constants.home_page.url);
//     await homePage.searchAndSelectSuggestion(
//       testData.region_request_info.term,
//       testData.region_request_info.suggestion,
//       testData.endpoint.search,
//     );
//     await homePage.verifyResultsPageDisplayed(
//       constants.home_search.dallas_results_url,
//       constants.home_search.dallas_results_heading,
//     );
//     await regionPage.verifyCommunitiesSectionIsDisplayed();
//   });

//   test("TC-01 | Request Information form — fields, validation, submit @form @regression", async () => {
//     await reportValue(`Page URL: ${await regionPage.getUrl()}`);
//     await regionPage.verifyRequestInfoCtaIsDisplayed();

//     // The card CTA opens a modal whose form is fetched remotely (unlike the
//     // detail-page forms, which are in-page). That fetch sits behind Cloudflare
//     // bot-protection, which can hang the modal on its loading spinner under
//     // repeated automation (it loads for real users — see the manual tap). Treat a
//     // form that never becomes visible as a FAILURE (data expected to be visible)
//     // rather than skipping.
//     const opened = await regionPage.openRequestInformationModal();
//     expect(
//       opened,
//       "Region-card Request Information modal form did not load (remote form fetch did not render the form) — expected the form to be visible.",
//     ).toBeTruthy();

//     await regionPage.requestInfo.verifyModalIsDisplayed();
//     await regionPage.requestInfo.verifyModalFields();
//     await regionPage.requestInfo.verifyRequiredFieldValidation();
//     await regionPage.requestInfo.verifyInvalidValueValidation();

//     // Never creates a real lead on prod — submit() fills the form but skips
//     // submission there (returns null). On non-prod it captures the contact-us
//     // API response so we can assert the result + posted payload.
//     const response = await regionPage.requestInfo.submit(
//       testData.endpoint.contact_us,
//     );
//     if (response) {
//       await regionPage.requestInfo.verifyApiSubmission(response);
//       await regionPage.requestInfo.verifySubmissionSuccess();
//     }
//   });
// });
