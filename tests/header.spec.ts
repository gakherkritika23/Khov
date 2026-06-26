import { test } from "./baseTest";
import { GlobalHeader } from "../page-objects/header";
import { HomePage } from "../page-objects/homePage";
import { reportValue } from "../utils/reporter";
import constants from "../utils/constants.json";

// Navigation tests click through multiple links with a goBack between each;
// raise the timeout at the describe level to cover the heaviest test.
test.describe.configure({ timeout: 180000 });

test.describe("Global Header", () => {
  let header: GlobalHeader;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    header = new GlobalHeader(page);
    homePage = new HomePage(page);
    await homePage.navigateToHome(constants.home_page.url);
  });

  // ── Header Elements ────────────────────────────────────

  test.describe("Header Elements", () => {
    test("TC-01 | Header renders with logo, search button, and sign-in button @smoke", async () => {
      await header.verifyHeaderIsDisplayed();
      await header.verifyLogoIsDisplayed();
      await header.verifySearchButtonIsDisplayed();
      await header.verifySignInButtonIsDisplayed();
    });

    test("TC-02 | Logo click navigates to the home page @smoke", async ({ page }) => {
      await reportValue(`Start URL: ${page.url()}`);
      await header.verifyLogoNavigatesToHome();
      await reportValue(`End URL: ${page.url()}`);
    });
  });

  // ── Hamburger Menu / Nav Panel ─────────────────────────

  test.describe("Hamburger Menu", () => {
    test("TC-01 | Hamburger menu button opens the off-canvas nav panel @smoke", async () => {
      await header.openMenu();
      await header.verifyNavPanelIsDisplayed();
      await reportValue("Nav panel opened via hamburger menu button");
    });

    test("TC-02 | All primary nav links are visible and enabled @smoke", async () => {
      await header.openMenu();
      await header.verifyNavLinksClickable();
      await reportValue("All primary nav links passed visible + enabled check");
    });

    test("TC-03 | Promo banner is visible inside the open nav panel @smoke", async () => {
      await header.openMenu();
      await header.verifyNavPromoBannerIsDisplayed();
      await reportValue("Promo banner and Explore Looks link visible in open nav panel");
    });

    test("TC-04 | Clicking the overlay backdrop closes the nav panel @regression", async () => {
      await header.openMenu();
      await header.closeMenu();
      await header.verifyNavPanelIsHidden();
      await reportValue("Nav panel hidden after overlay backdrop click");
    });

    test("TC-05 | Primary nav links navigate to their correct destination pages @regression", async ({ page }) => {
      await header.openMenu();
      await reportValue(`Start URL: ${page.url()}`);
      await header.verifyNavLinkNavigations();
      await reportValue("All primary nav link navigations verified");
    });

    test("TC-06 | New Construction Homes button expands a state-level sub-menu @regression", async () => {
      await header.openMenu();
      await header.expandNewConstructionHomes();
      await header.verifySubNavIsDisplayed();
      await reportValue("New Construction Homes sub-menu expanded — back button and View All Locations visible");
    });

    test("TC-07 | View All Locations link in sub-nav points to the correct URL @regression", async () => {
      await header.openMenu();
      await header.expandNewConstructionHomes();
      await header.verifySubNavViewAllLocationsHref();
      await reportValue(`View All Locations href verified: ${constants.header.nav_links.new_construction_homes_url}`);
    });

    test("TC-08 | Back button in sub-nav returns to the primary nav list @regression", async () => {
      await header.openMenu();
      await header.expandNewConstructionHomes();
      await header.goBackFromSubNav();
      await header.verifyNavLinksAreDisplayed();
      await reportValue("Back button returned user to primary nav list");
    });
  });

  // ── Sign In ────────────────────────────────────────────

  test.describe("Sign In", () => {
    test("TC-01 | Sign-in button opens the dropdown and all portal options are visible and enabled @smoke", async () => {
      await header.openSignIn();
      await header.verifySignInDropdownIsDisplayed();
      await header.verifySignInOptionsAreClickable();
      await reportValue("Sign-in dropdown opened — all 3 portal options visible and enabled");
    });

    test("TC-02 | Design and Price Tool navigates to the login page @regression", async ({ page }) => {
      await header.openSignIn();
      await reportValue(`Start URL: ${page.url()}`);
      await header.verifyDesignPriceToolNavigation();
      await reportValue(`End URL: ${page.url()}`);
    });

    test("TC-03 | Warranty Portal link points to the correct external URL @regression", async () => {
      await header.openSignIn();
      await header.verifyWarrantyPortalHref();
      await reportValue(`Warranty Portal href verified: ${constants.header.sign_in.warranty_portal_url}`);
    });

    test("TC-04 | Mortgage Buyer Portal link points to the correct external URL @regression", async () => {
      await header.openSignIn();
      await header.verifyMortgageBuyerPortalHref();
      await reportValue(`Mortgage Buyer Portal href verified: ${constants.header.sign_in.mortgage_buyer_portal_url}`);
    });
  });

  // ── Search ─────────────────────────────────────────────

  test.describe("Search", () => {
    test("TC-01 | Search button reveals the search input field @smoke", async () => {
      await header.openSearch();
      await header.verifySearchInputIsDisplayed();
      await reportValue("Search input visible after clicking the search button");
    });

    test("TC-02 | Close button dismisses the search input @regression", async () => {
      await header.openSearch();
      await header.verifySearchInputIsDisplayed();
      await header.closeSearch();
      await header.verifySearchInputIsHidden();
      await reportValue("Search input hidden after clicking the close button");
    });
  });
});
