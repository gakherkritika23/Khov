import { test } from "./baseTest";
import { ContactUsPage } from "../page-objects/contactUsPage";
import { reportValue } from "../utils/reporter";
import constants from "../utils/constants.json";

/**
 * Contact Us form — Step 1 (read-only audit). Reached via the footer "Contact
 * Us" link. For each "What are you interested in?" option, select its radio,
 * verify that form's fields exist, and log every dropdown's options.
 *
 * No form submission in this step → safe on every environment (incl. prod).
 * One test per interest (the 5 forms differ).
 */
test.describe("Contact Us — Field & Dropdown Audit", () => {
  let contactUsPage: ContactUsPage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    contactUsPage = new ContactUsPage(page);
    await contactUsPage.navigateToContactViaFooter(constants.home_page.url);
    await contactUsPage.verifyContactPageDisplayed();
  });

  test("TC-01 | Shopping for a new home — fields exist + dropdown options @form @smoke", async () => {
    await reportValue(`Page URL: ${await contactUsPage.getUrl()}`);
    await contactUsPage.selectInterest("I am shopping for a new home");
    await contactUsPage.verifyFieldsForInterest("I am shopping for a new home");
    await contactUsPage.logDropdownOptions("I am shopping for a new home");
  });

  test("TC-02 | Mortgage information — fields exist + dropdown options @form @regression", async () => {
    await reportValue(`Page URL: ${await contactUsPage.getUrl()}`);
    await contactUsPage.selectInterest("I would like mortgage information");
    await contactUsPage.verifyFieldsForInterest("I would like mortgage information");
    await contactUsPage.logDropdownOptions("I would like mortgage information");
  });

  test("TC-03 | Real estate professional — fields exist + dropdown options @form @regression", async () => {
    await reportValue(`Page URL: ${await contactUsPage.getUrl()}`);
    await contactUsPage.selectInterest("I am a real estate professional");
    await contactUsPage.verifyFieldsForInterest("I am a real estate professional");
    await contactUsPage.logDropdownOptions("I am a real estate professional");
  });

  test("TC-04 | Subcontractor — fields exist + dropdown options @form @regression", async () => {
    await reportValue(`Page URL: ${await contactUsPage.getUrl()}`);
    await contactUsPage.selectInterest("I am a subcontractor");
    await contactUsPage.verifyFieldsForInterest("I am a subcontractor");
    await contactUsPage.logDropdownOptions("I am a subcontractor");
  });

  test("TC-05 | Selling land — fields exist + dropdown options @form @regression", async () => {
    await reportValue(`Page URL: ${await contactUsPage.getUrl()}`);
    await contactUsPage.selectInterest("I am selling land");
    await contactUsPage.verifyFieldsForInterest("I am selling land");
    await contactUsPage.logDropdownOptions("I am selling land");
  });
});
