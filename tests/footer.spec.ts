import { expect } from "@playwright/test";
import { test } from "./baseTest";
import { GlobalFooter } from "../page-objects/footer";
import { HomePage } from "../page-objects/homePage";
import { reportValue } from "../utils/reporter";
import constants from "../utils/constants.json";

// Navigation tests click through multiple links with a goBack between each;
// raise the timeout at the describe level to cover the heaviest test.
test.describe.configure({ timeout: 180000 });

test.describe("Global Footer", () => {
  let footer: GlobalFooter;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    footer = new GlobalFooter(page);
    homePage = new HomePage(page);
    await homePage.navigateToHome(constants.home_page.url);
  });

  // ── Structure ──────────────────────────────────────────

  test("TC-01 | Footer renders with logo, nav, social, and utility sections @smoke", async () => {
    await footer.verifyFooterVisible();
    await footer.verifyLogoVisible();
    await footer.verifyNavLinksVisible();
    await footer.verifySocialLinksVisible();
    await footer.verifyUtilityLinksVisible();
  });

  // ── Primary Navigation ─────────────────────────────────

  test("TC-02 | All primary nav links are visible and clickable @smoke", async () => {
    await footer.verifyNavLinksClickable();
    await reportValue("All 10 primary nav links passed visible + enabled check");
  });

  test("TC-03 | Primary nav links navigate to their correct destination pages @regression", async ({ page }) => {
    await reportValue(`Start URL: ${page.url()}`);
    await footer.verifyNavLinkNavigations();
    await footer.verifyFinanceYourHomeHref();
    await reportValue("All primary nav link navigations verified");
  });

  // ── Social Media ───────────────────────────────────────

  test("TC-04 | Social media links are visible, clickable, and point to their platforms @smoke", async () => {
    await footer.verifySocialLinksClickable();
    await footer.verifySocialLinkHrefs();
    await reportValue("All 4 social links verified: visible, enabled, and correct href");
  });

  // ── Utility / Legal ────────────────────────────────────

  test("TC-05 | Utility and legal links are visible and clickable @regression", async () => {
    await footer.verifyUtilityLinksClickable();
    await reportValue("All 5 utility / legal links passed visible + enabled check");
  });

  test("TC-06 | Utility links navigate to their correct destination pages @regression", async ({ page }) => {
    await reportValue(`Start URL: ${page.url()}`);
    await footer.verifyUtilityLinkNavigations();
    await reportValue("All utility link navigations verified");
  });

  // ── Copyright ──────────────────────────────────────────

  test("TC-07 | Copyright text contains the brand name and rights notice @regression", async () => {
    const copyright = await footer.getCopyrightText();
    await reportValue(`Copyright text: ${copyright}`);
    // Year changes annually — assert the stable parts only
    expect(copyright, "Copyright should include 'K. Hovnanian'").toContain("K. Hovnanian");
    expect(copyright, "Copyright should include 'All Rights Reserved'").toContain("All Rights Reserved");
  });
});
