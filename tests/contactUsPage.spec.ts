import { test } from "./baseTest";
import { ContactUsPage } from "../page-objects/contactUsPage";
import { reportValue } from "../utils/reporter";
import constants from "../utils/constants.json";
import testData from "../utils/test_data.json";

/**
 * Contact Us form. Reached via the footer "Contact Us" link. One test per
 * interest (the 5 "What are you interested in?" forms differ). Each test:
 *   1. select interest → verify fields exist → log dropdown options (Step 1)
 *   2. required-field validation (submit empty)            — all envs
 *   3. invalid email/phone validation                      — all envs
 *   4. fill valid data → submit → success + /api/contact-us/ 200 (non-prod);
 *      on PROD the form is filled but NOT submitted (no real lead).
 */
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
