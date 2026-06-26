import { Page, Locator } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import constants from "../utils/constants.json";

export class GlobalHeader extends BasePage {
  // ── Logo
  readonly headerLogoLink: Locator;

  // ── Mobile / nav toggle
  readonly headerNavMenuToggleButton: Locator;

  // ── Search
  readonly headerSearchButton: Locator;
  readonly headerSearchInputContainer: Locator;
  readonly headerSearchInput: Locator;
  readonly headerSearchCloseButton: Locator;

  // ── Auth / Sign In
  readonly headerSignInButton: Locator;
  readonly headerSignInDropdown: Locator;
  readonly headerSignInWarrantyPortalLink: Locator;
  readonly headerSignInDesignPriceToolLink: Locator;
  readonly headerSignInMortgageBuyerPortalLink: Locator;

  // ── Off-canvas nav panel
  readonly headerNavOverlay: Locator;
  readonly headerNavPanel: Locator;
  readonly headerNavItemList: Locator;

  // ── Primary nav items
  readonly headerNavNewConstructionHomesButton: Locator;
  readonly headerNavActiveLifestyleLink: Locator;
  readonly headerNavHomebuyingProcessLink: Locator;
  readonly headerNavFinancialServicesLink: Locator;
  readonly headerNavWhyChooseUsLink: Locator;
  readonly headerNavInvestorRelationsLink: Locator;
  readonly headerNavContactUsLink: Locator;
  readonly headerNavHomeownerServicesLink: Locator;
  readonly headerNavCareersLink: Locator;
  readonly headerNavLooksLink: Locator;

  // ── Promo banner (inside nav panel)
  readonly headerNavPromoBanner: Locator;
  readonly headerNavPromoExploreLooksLink: Locator;

  // ── New Construction Homes sub-nav
  readonly headerSubNavBackButton: Locator;
  readonly headerSubNavViewAllLocationsLink: Locator;

  // ── Root (kept last — used only for the header-visible assertion)
  readonly headerRoot: Locator;

  constructor(page: Page) {
    super(page);

    this.headerRoot = page.locator("header[class*='Header_header']");

    // Logo — scoped to header to avoid collision with the footer logo
    this.headerLogoLink = this.headerRoot.locator("a[aria-label='K. Hovnanian Homes logo']");

    // Hamburger toggle (opens / closes the off-canvas nav panel)
    this.headerNavMenuToggleButton = this.headerRoot.locator("button[aria-label='Menu']");

    // Search — button in the actions group; input container hidden by default
    this.headerSearchButton = this.headerRoot.locator("button[class*='Header_search-button']");
    this.headerSearchInputContainer = this.headerRoot.locator("[class*='Header_search-input-container']");
    this.headerSearchInput = this.headerSearchInputContainer.locator("input[type='search']");
    this.headerSearchCloseButton = this.headerSearchInputContainer.locator("button[class*='Header_close-button']");

    // Auth toggle and sign-in dropdown
    this.headerSignInButton = this.headerRoot.locator("button[class*='auth-actions_auth-toggle-button']");
    this.headerSignInDropdown = this.headerRoot.locator("[class*='dropdown-menu_dropdown-menu']");
    this.headerSignInWarrantyPortalLink = this.headerSignInDropdown.getByRole("link", { name: "Warranty Portal" });
    this.headerSignInDesignPriceToolLink = this.headerSignInDropdown.getByRole("link", { name: "Design & Price Tool" });
    this.headerSignInMortgageBuyerPortalLink = this.headerSignInDropdown.getByRole("link", { name: "K. Hovnanian Mortgage Buyer Portal" });

    // Off-canvas nav panel
    this.headerNavOverlay = this.headerRoot.locator("[class*='Header_nav-overlay']");
    this.headerNavPanel = this.headerRoot.locator("nav[class*='Header_nav']");
    this.headerNavItemList = this.headerNavPanel.locator("[class*='navigation_list']");

    // Primary nav — "New Construction Homes" is a button (it has a sub-menu);
    // all other top-level items are plain links
    this.headerNavNewConstructionHomesButton = this.headerNavItemList.getByRole("button", { name: "New Construction Homes" });
    this.headerNavActiveLifestyleLink = this.headerNavItemList.getByRole("link", { name: "Active Lifestyle" });
    this.headerNavHomebuyingProcessLink = this.headerNavItemList.getByRole("link", { name: "Homebuying Process" });
    this.headerNavFinancialServicesLink = this.headerNavItemList.getByRole("link", { name: "Financial Services" });
    this.headerNavWhyChooseUsLink = this.headerNavItemList.getByRole("link", { name: "Why Choose Us" });
    this.headerNavInvestorRelationsLink = this.headerNavItemList.getByRole("link", { name: "Investor Relations" });
    this.headerNavContactUsLink = this.headerNavItemList.getByRole("link", { name: "Contact Us" });
    this.headerNavHomeownerServicesLink = this.headerNavItemList.getByRole("link", { name: "Homeowner Services" });
    this.headerNavCareersLink = this.headerNavItemList.getByRole("link", { name: "Careers" });
    this.headerNavLooksLink = this.headerNavItemList.getByRole("link", { name: "Looks" });

    // Promo banner at the bottom of the nav panel
    this.headerNavPromoBanner = this.headerNavPanel.locator("[class*='navigation_promo-banner']");
    this.headerNavPromoExploreLooksLink = this.headerNavPromoBanner.getByRole("link", { name: "Explore Looks" });

    // Sub-nav elements (visible after expanding "New Construction Homes")
    this.headerSubNavBackButton = this.headerNavPanel.locator("button[class*='navigation_back-btn']");
    this.headerSubNavViewAllLocationsLink = this.headerNavPanel.getByRole("link", { name: "View All Locations" });
  }

  // ── Actions ──────────────────────────────────────────────

  async openMenu(): Promise<void> {
    await this.headerNavMenuToggleButton.click();
    await this.headerNavPanel.waitFor({ state: "visible" });
  }

  async closeMenu(): Promise<void> {
    await this.headerNavOverlay.click();
    await this.headerNavPanel.waitFor({ state: "hidden" });
  }

  async openSearch(): Promise<void> {
    await this.headerSearchButton.click();
    await this.headerSearchInput.waitFor({ state: "visible" });
  }

  async closeSearch(): Promise<void> {
    await this.headerSearchCloseButton.click();
  }

  async openSignIn(): Promise<void> {
    await this.headerSignInButton.click();
    await this.headerSignInDropdown.waitFor({ state: "visible" });
  }

  async expandNewConstructionHomes(): Promise<void> {
    await this.headerNavNewConstructionHomesButton.click();
    await this.headerSubNavBackButton.waitFor({ state: "visible" });
  }

  async goBackFromSubNav(): Promise<void> {
    await this.headerSubNavBackButton.click();
    await this.headerNavNewConstructionHomesButton.waitFor({ state: "visible" });
  }

  // ── Verification — Header Elements ───────────────────────

  async verifyHeaderIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.headerRoot, "Header should be visible");
  }

  async verifyLogoIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.headerLogoLink, "Header logo should be visible");
  }

  async verifySearchButtonIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.headerSearchButton, "Header search button should be visible");
  }

  async verifySignInButtonIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.headerSignInButton, "Header sign-in button should be visible");
  }

  // ── Verification — Nav Panel ─────────────────────────────

  async verifyNavPanelIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.headerNavPanel, "Header nav panel should be visible");
  }

  async verifyNavPanelIsHidden(): Promise<void> {
    await Validator.requireHidden(this.headerNavPanel, "Header nav panel should be hidden");
  }

  async verifyNavLinksAreDisplayed(): Promise<void> {
    await Validator.requireVisible(this.headerNavNewConstructionHomesButton, "Nav: New Construction Homes should be visible");
    await Validator.requireVisible(this.headerNavActiveLifestyleLink, "Nav: Active Lifestyle should be visible");
    await Validator.requireVisible(this.headerNavHomebuyingProcessLink, "Nav: Homebuying Process should be visible");
    await Validator.requireVisible(this.headerNavFinancialServicesLink, "Nav: Financial Services should be visible");
    await Validator.requireVisible(this.headerNavWhyChooseUsLink, "Nav: Why Choose Us should be visible");
    await Validator.requireVisible(this.headerNavInvestorRelationsLink, "Nav: Investor Relations should be visible");
    await Validator.requireVisible(this.headerNavContactUsLink, "Nav: Contact Us should be visible");
    await Validator.requireVisible(this.headerNavHomeownerServicesLink, "Nav: Homeowner Services should be visible");
    await Validator.requireVisible(this.headerNavCareersLink, "Nav: Careers should be visible");
    await Validator.requireVisible(this.headerNavLooksLink, "Nav: Looks should be visible");
  }

  async verifyNavLinksClickable(): Promise<void> {
    await Validator.requireVisible(this.headerNavActiveLifestyleLink, "Nav: Active Lifestyle should be visible");
    await Validator.requireEnabled(this.headerNavActiveLifestyleLink, "Nav: Active Lifestyle should be enabled");
    await Validator.requireVisible(this.headerNavHomebuyingProcessLink, "Nav: Homebuying Process should be visible");
    await Validator.requireEnabled(this.headerNavHomebuyingProcessLink, "Nav: Homebuying Process should be enabled");
    await Validator.requireVisible(this.headerNavFinancialServicesLink, "Nav: Financial Services should be visible");
    await Validator.requireEnabled(this.headerNavFinancialServicesLink, "Nav: Financial Services should be enabled");
    await Validator.requireVisible(this.headerNavWhyChooseUsLink, "Nav: Why Choose Us should be visible");
    await Validator.requireEnabled(this.headerNavWhyChooseUsLink, "Nav: Why Choose Us should be enabled");
    await Validator.requireVisible(this.headerNavInvestorRelationsLink, "Nav: Investor Relations should be visible");
    await Validator.requireEnabled(this.headerNavInvestorRelationsLink, "Nav: Investor Relations should be enabled");
    await Validator.requireVisible(this.headerNavContactUsLink, "Nav: Contact Us should be visible");
    await Validator.requireEnabled(this.headerNavContactUsLink, "Nav: Contact Us should be enabled");
    await Validator.requireVisible(this.headerNavHomeownerServicesLink, "Nav: Homeowner Services should be visible");
    await Validator.requireEnabled(this.headerNavHomeownerServicesLink, "Nav: Homeowner Services should be enabled");
    await Validator.requireVisible(this.headerNavCareersLink, "Nav: Careers should be visible");
    await Validator.requireEnabled(this.headerNavCareersLink, "Nav: Careers should be enabled");
    await Validator.requireVisible(this.headerNavLooksLink, "Nav: Looks should be visible");
    await Validator.requireEnabled(this.headerNavLooksLink, "Nav: Looks should be enabled");
  }

  async verifyNavPromoBannerIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.headerNavPromoBanner, "Nav promo banner should be visible");
    await Validator.requireVisible(this.headerNavPromoExploreLooksLink, "Nav promo 'Explore Looks' link should be visible");
  }

  // ── Verification — Sub-nav ───────────────────────────────

  async verifySubNavIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.headerSubNavBackButton, "Sub-nav back button should be visible");
    await Validator.requireVisible(this.headerSubNavViewAllLocationsLink, "Sub-nav 'View All Locations' link should be visible");
    await this.verifySubNavStateListIsDisplayed();
  }

  async verifySubNavStateListIsDisplayed(): Promise<void> {
    for (const state of constants.contact_us.state_of_interest_options) {
      await Validator.requireVisible(
        this.headerNavPanel.getByRole("button", { name: state }),
        `Sub-nav: ${state} state button should be visible`,
      );
    }
  }

  async verifySubNavViewAllLocationsHref(): Promise<void> {
    const href = await this.getHref(this.headerSubNavViewAllLocationsLink);
    const expected = constants.header.nav_links.new_construction_homes_url;
    await Validator.requireTrue(
      href.includes(expected),
      `View All Locations href should contain "${expected}" (actual: "${href}")`,
    );
  }

  // ── Verification — Navigation ────────────────────────────

  async verifyLogoNavigatesToHome(): Promise<void> {
    await this.headerLogoLink.click();
    await Validator.requireUrlContains(this.page, constants.header.logo_url, "Logo should navigate to the home page");
  }

  async verifyNavLinkNavigations(): Promise<void> {
    const nav = constants.header.nav_links;
    await this.clickAndVerifyNavigation(this.headerNavActiveLifestyleLink, nav.active_lifestyle_url, "Active Lifestyle");
    await this.openMenu();
    await this.clickAndVerifyNavigation(this.headerNavHomebuyingProcessLink, nav.homebuying_process_url, "Homebuying Process");
    await this.openMenu();
    await this.clickAndVerifyNavigation(this.headerNavFinancialServicesLink, nav.financial_services_url, "Financial Services");
    await this.openMenu();
    await this.clickAndVerifyNavigation(this.headerNavWhyChooseUsLink, nav.why_choose_us_url, "Why Choose Us");
    await this.openMenu();
    await this.clickAndVerifyNavigation(this.headerNavContactUsLink, nav.contact_us_url, "Contact Us");
    await this.openMenu();
    await this.clickAndVerifyNavigation(this.headerNavHomeownerServicesLink, nav.homeowner_services_url, "Homeowner Services");
    await this.openMenu();
    await this.clickAndVerifyNavigation(this.headerNavCareersLink, nav.careers_url, "Careers");
    await this.openMenu();
    await this.clickAndVerifyNavigation(this.headerNavLooksLink, nav.looks_url, "Looks");
  }

  // ── Verification — Sign In ───────────────────────────────

  async verifySignInDropdownIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.headerSignInDropdown, "Sign-in dropdown should be visible");
  }

  async verifySignInOptionsAreClickable(): Promise<void> {
    await Validator.requireVisible(this.headerSignInWarrantyPortalLink, "Sign-in: Warranty Portal should be visible");
    await Validator.requireEnabled(this.headerSignInWarrantyPortalLink, "Sign-in: Warranty Portal should be enabled");
    await Validator.requireVisible(this.headerSignInDesignPriceToolLink, "Sign-in: Design & Price Tool should be visible");
    await Validator.requireEnabled(this.headerSignInDesignPriceToolLink, "Sign-in: Design & Price Tool should be enabled");
    await Validator.requireVisible(this.headerSignInMortgageBuyerPortalLink, "Sign-in: K. Hovnanian Mortgage Buyer Portal should be visible");
    await Validator.requireEnabled(this.headerSignInMortgageBuyerPortalLink, "Sign-in: K. Hovnanian Mortgage Buyer Portal should be enabled");
  }

  async verifyDesignPriceToolNavigation(): Promise<void> {
    await this.clickAndVerifyNavigation(
      this.headerSignInDesignPriceToolLink,
      constants.header.sign_in.design_price_tool_url,
      "Design & Price Tool",
    );
  }

  async verifyWarrantyPortalHref(): Promise<void> {
    const href = await this.getHref(this.headerSignInWarrantyPortalLink);
    const expected = constants.header.sign_in.warranty_portal_url;
    await Validator.requireTrue(
      href.includes(expected),
      `Warranty Portal href should contain "${expected}" (actual: "${href}")`,
    );
  }

  async verifyMortgageBuyerPortalHref(): Promise<void> {
    const href = await this.getHref(this.headerSignInMortgageBuyerPortalLink);
    const expected = constants.header.sign_in.mortgage_buyer_portal_url;
    await Validator.requireTrue(
      href.includes(expected),
      `Mortgage Buyer Portal href should contain "${expected}" (actual: "${href}")`,
    );
  }

  // ── Verification — Search ────────────────────────────────

  async verifySearchInputIsDisplayed(): Promise<void> {
    await Validator.requireVisible(this.headerSearchInput, "Header search input should be visible after opening search");
  }

  async verifySearchInputIsHidden(): Promise<void> {
    await Validator.requireHidden(this.headerSearchInput, "Header search input should be hidden after closing search");
  }
}
