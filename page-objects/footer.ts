import { Page, Locator } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import constants from "../utils/constants.json";

export class GlobalFooter extends BasePage {
  // ── Structure
  readonly footer: Locator;
  readonly footerTop: Locator;
  readonly footerBottom: Locator;

  // ── Logo
  readonly logo: Locator;

  // ── Primary Navigation
  readonly navList: Locator;
  readonly navLinkFindYourHome: Locator;
  readonly navLinkHomeBuyingProcess: Locator;
  readonly navLinkFinanceYourHome: Locator;
  readonly navLinkWhyKHovnanian: Locator;
  readonly navLinkContactUs: Locator;
  readonly navLinkHomeownerServices: Locator;
  readonly navLinkInvestorRelations: Locator;
  readonly navLinkCareers: Locator;
  readonly navLinkBlog: Locator;
  readonly navLinkSitemap: Locator;

  // ── Social Media
  readonly socialList: Locator;
  readonly socialLinkFacebook: Locator;
  readonly socialLinkPinterest: Locator;
  readonly socialLinkYouTube: Locator;
  readonly socialLinkInstagram: Locator;

  // ── Utility / Legal
  readonly copyrightText: Locator;
  readonly utilityNavList: Locator;
  readonly utilityLinkPrivacyPolicy: Locator;
  readonly utilityLinkTermsAndConditions: Locator;
  readonly utilityLinkAccessibility: Locator;
  readonly utilityLinkEqualHousingOpportunity: Locator;
  readonly utilityLinkManagePreferences: Locator;

  constructor(page: Page) {
    super(page);

    // Root container and layout sections
    this.footer = page.locator("footer[class*='Footer_footer']");
    this.footerTop = page.locator("[class*='Footer_footer-top']");
    this.footerBottom = page.locator("[class*='Footer_footer-bottom']");

    // Logo — scoped to footer to avoid collision with the header logo
    this.logo = this.footer.locator("a[aria-label='K. Hovnanian Homes logo']");

    // Primary nav — all links scoped to the footer nav list
    this.navList = page.locator("[class*='Footer_nav-list']");
    this.navLinkFindYourHome = this.navList.getByRole("link", { name: "Find Your Home" });
    this.navLinkHomeBuyingProcess = this.navList.getByRole("link", { name: "Home Buying Process" });
    this.navLinkFinanceYourHome = this.navList.getByRole("link", { name: "Finance Your Home" });
    this.navLinkWhyKHovnanian = this.navList.getByRole("link", { name: "Why K. Hovnanian" });
    this.navLinkContactUs = this.navList.getByRole("link", { name: "Contact Us" });
    this.navLinkHomeownerServices = this.navList.getByRole("link", { name: "Homeowner Services" });
    this.navLinkInvestorRelations = this.navList.getByRole("link", { name: "Investor Relations" });
    this.navLinkCareers = this.navList.getByRole("link", { name: "Careers" });
    this.navLinkBlog = this.navList.getByRole("link", { name: "Blog" });
    this.navLinkSitemap = this.navList.getByRole("link", { name: "Sitemap" });

    // Social media links — scoped to social list
    this.socialList = page.locator("[class*='Footer_social-list']");
    this.socialLinkFacebook = this.socialList.getByRole("link", { name: "Facebook" });
    this.socialLinkPinterest = this.socialList.getByRole("link", { name: "Pinterest" });
    this.socialLinkYouTube = this.socialList.getByRole("link", { name: "YouTube" });
    this.socialLinkInstagram = this.socialList.getByRole("link", { name: "Instagram" });

    // Utility / legal strip
    this.copyrightText = page.locator("[class*='Footer_utility'] > div").first();
    this.utilityNavList = page.locator("[class*='Footer_utility-nav-list']");
    this.utilityLinkPrivacyPolicy = this.utilityNavList.getByRole("link", { name: "Privacy Policy" });
    this.utilityLinkTermsAndConditions = this.utilityNavList.getByRole("link", { name: "Terms & Conditions" });
    this.utilityLinkAccessibility = this.utilityNavList.getByRole("link", { name: "Accessibility" });
    this.utilityLinkEqualHousingOpportunity = this.utilityNavList.getByRole("link", { name: "Equal Housing Opportunity" });
    // Stable id used by the OneTrust consent manager to wire up its click handler
    this.utilityLinkManagePreferences = page.locator("#privacy-modal-link");
  }

  // ── Verification — Visible ──────────────────────────────

  async verifyFooterVisible(): Promise<void> {
    await Validator.requireVisible(this.footer, "Footer should be visible");
  }

  async verifyLogoVisible(): Promise<void> {
    await Validator.requireVisible(this.logo, "Footer logo should be visible");
  }

  async verifyNavLinksVisible(): Promise<void> {
    await Validator.requireVisible(this.navLinkFindYourHome, "Footer nav: Find Your Home");
    await Validator.requireVisible(this.navLinkHomeBuyingProcess, "Footer nav: Home Buying Process");
    await Validator.requireVisible(this.navLinkFinanceYourHome, "Footer nav: Finance Your Home");
    await Validator.requireVisible(this.navLinkWhyKHovnanian, "Footer nav: Why K. Hovnanian");
    await Validator.requireVisible(this.navLinkContactUs, "Footer nav: Contact Us");
    await Validator.requireVisible(this.navLinkHomeownerServices, "Footer nav: Homeowner Services");
    await Validator.requireVisible(this.navLinkInvestorRelations, "Footer nav: Investor Relations");
    await Validator.requireVisible(this.navLinkCareers, "Footer nav: Careers");
    await Validator.requireVisible(this.navLinkBlog, "Footer nav: Blog");
    await Validator.requireVisible(this.navLinkSitemap, "Footer nav: Sitemap");
  }

  async verifySocialLinksVisible(): Promise<void> {
    await Validator.requireVisible(this.socialLinkFacebook, "Footer social: Facebook");
    await Validator.requireVisible(this.socialLinkPinterest, "Footer social: Pinterest");
    await Validator.requireVisible(this.socialLinkYouTube, "Footer social: YouTube");
    await Validator.requireVisible(this.socialLinkInstagram, "Footer social: Instagram");
  }

  async verifyUtilityLinksVisible(): Promise<void> {
    await Validator.requireVisible(this.utilityLinkPrivacyPolicy, "Footer utility: Privacy Policy");
    await Validator.requireVisible(this.utilityLinkTermsAndConditions, "Footer utility: Terms & Conditions");
    await Validator.requireVisible(this.utilityLinkAccessibility, "Footer utility: Accessibility");
    await Validator.requireVisible(this.utilityLinkEqualHousingOpportunity, "Footer utility: Equal Housing Opportunity");
    await Validator.requireVisible(this.utilityLinkManagePreferences, "Footer utility: Manage Preferences");
  }

  // ── Verification — Clickable ─────────────────────────────
  // Checks each link is both visible and enabled (not aria-disabled).

  async verifyNavLinksClickable(): Promise<void> {
    await Validator.requireVisible(this.navLinkFindYourHome, "Footer nav: Find Your Home should be visible");
    await Validator.requireEnabled(this.navLinkFindYourHome, "Footer nav: Find Your Home should be enabled");
    await Validator.requireVisible(this.navLinkHomeBuyingProcess, "Footer nav: Home Buying Process should be visible");
    await Validator.requireEnabled(this.navLinkHomeBuyingProcess, "Footer nav: Home Buying Process should be enabled");
    await Validator.requireVisible(this.navLinkFinanceYourHome, "Footer nav: Finance Your Home should be visible");
    await Validator.requireEnabled(this.navLinkFinanceYourHome, "Footer nav: Finance Your Home should be enabled");
    await Validator.requireVisible(this.navLinkWhyKHovnanian, "Footer nav: Why K. Hovnanian should be visible");
    await Validator.requireEnabled(this.navLinkWhyKHovnanian, "Footer nav: Why K. Hovnanian should be enabled");
    await Validator.requireVisible(this.navLinkContactUs, "Footer nav: Contact Us should be visible");
    await Validator.requireEnabled(this.navLinkContactUs, "Footer nav: Contact Us should be enabled");
    await Validator.requireVisible(this.navLinkHomeownerServices, "Footer nav: Homeowner Services should be visible");
    await Validator.requireEnabled(this.navLinkHomeownerServices, "Footer nav: Homeowner Services should be enabled");
    await Validator.requireVisible(this.navLinkInvestorRelations, "Footer nav: Investor Relations should be visible");
    await Validator.requireEnabled(this.navLinkInvestorRelations, "Footer nav: Investor Relations should be enabled");
    await Validator.requireVisible(this.navLinkCareers, "Footer nav: Careers should be visible");
    await Validator.requireEnabled(this.navLinkCareers, "Footer nav: Careers should be enabled");
    await Validator.requireVisible(this.navLinkBlog, "Footer nav: Blog should be visible");
    await Validator.requireEnabled(this.navLinkBlog, "Footer nav: Blog should be enabled");
    await Validator.requireVisible(this.navLinkSitemap, "Footer nav: Sitemap should be visible");
    await Validator.requireEnabled(this.navLinkSitemap, "Footer nav: Sitemap should be enabled");
  }

  async verifySocialLinksClickable(): Promise<void> {
    await Validator.requireVisible(this.socialLinkFacebook, "Footer social: Facebook should be visible");
    await Validator.requireEnabled(this.socialLinkFacebook, "Footer social: Facebook should be enabled");
    await Validator.requireVisible(this.socialLinkPinterest, "Footer social: Pinterest should be visible");
    await Validator.requireEnabled(this.socialLinkPinterest, "Footer social: Pinterest should be enabled");
    await Validator.requireVisible(this.socialLinkYouTube, "Footer social: YouTube should be visible");
    await Validator.requireEnabled(this.socialLinkYouTube, "Footer social: YouTube should be enabled");
    await Validator.requireVisible(this.socialLinkInstagram, "Footer social: Instagram should be visible");
    await Validator.requireEnabled(this.socialLinkInstagram, "Footer social: Instagram should be enabled");
  }

  async verifyUtilityLinksClickable(): Promise<void> {
    await Validator.requireVisible(this.utilityLinkPrivacyPolicy, "Footer utility: Privacy Policy should be visible");
    await Validator.requireEnabled(this.utilityLinkPrivacyPolicy, "Footer utility: Privacy Policy should be enabled");
    await Validator.requireVisible(this.utilityLinkTermsAndConditions, "Footer utility: Terms & Conditions should be visible");
    await Validator.requireEnabled(this.utilityLinkTermsAndConditions, "Footer utility: Terms & Conditions should be enabled");
    await Validator.requireVisible(this.utilityLinkAccessibility, "Footer utility: Accessibility should be visible");
    await Validator.requireEnabled(this.utilityLinkAccessibility, "Footer utility: Accessibility should be enabled");
    await Validator.requireVisible(this.utilityLinkEqualHousingOpportunity, "Footer utility: Equal Housing Opportunity should be visible");
    await Validator.requireEnabled(this.utilityLinkEqualHousingOpportunity, "Footer utility: Equal Housing Opportunity should be enabled");
    await Validator.requireVisible(this.utilityLinkManagePreferences, "Footer utility: Manage Preferences should be visible");
    await Validator.requireEnabled(this.utilityLinkManagePreferences, "Footer utility: Manage Preferences should be enabled");
  }

  // ── Verification — Navigation ────────────────────────────
  // Internal links: click → verify URL → go back.
  // External / new-tab links: verify href attribute only (clicking would leave the
  // domain or open a new tab, neither of which suits a sequential navigation test).

  async verifyNavLinkNavigations(): Promise<void> {
    const nav = constants.footer.nav_links;
    await this.clickAndVerifyNavigation(this.navLinkFindYourHome, nav.find_your_home_url, "Find Your Home");
    await this.clickAndVerifyNavigation(this.navLinkHomeBuyingProcess, nav.home_buying_process_url, "Home Buying Process");
    await this.clickAndVerifyNavigation(this.navLinkWhyKHovnanian, nav.why_k_hovnanian_url, "Why K. Hovnanian");
    await this.clickAndVerifyNavigation(this.navLinkContactUs, nav.contact_us_url, "Contact Us");
    await this.clickAndVerifyNavigation(this.navLinkHomeownerServices, nav.homeowner_services_url, "Homeowner Services");
    await this.clickAndVerifyNavigation(this.navLinkInvestorRelations, nav.investor_relations_url, "Investor Relations");
    await this.clickAndVerifyNavigation(this.navLinkCareers, nav.careers_url, "Careers");
    await this.clickAndVerifyNavigation(this.navLinkBlog, nav.blog_url, "Blog");
    await this.clickAndVerifyNavigation(this.navLinkSitemap, nav.sitemap_url, "Sitemap");
  }

  async verifyFinanceYourHomeHref(): Promise<void> {
    const href = await this.getHref(this.navLinkFinanceYourHome);
    await Validator.requireTrue(
      href.includes(constants.footer.nav_links.finance_your_home_url),
      "Finance Your Home link should point to khovmortgage.com",
    );
  }

  async verifySocialLinkHrefs(): Promise<void> {
    const social = constants.footer.social_links;

    const facebook = await this.getHref(this.socialLinkFacebook);
    await Validator.requireTrue(facebook.includes(social.facebook_url), "Facebook link should point to facebook.com");

    const pinterest = await this.getHref(this.socialLinkPinterest);
    await Validator.requireTrue(pinterest.includes(social.pinterest_url), "Pinterest link should point to pinterest.com");

    const youtube = await this.getHref(this.socialLinkYouTube);
    await Validator.requireTrue(youtube.includes(social.youtube_url), "YouTube link should point to youtube.com");

    const instagram = await this.getHref(this.socialLinkInstagram);
    await Validator.requireTrue(instagram.includes(social.instagram_url), "Instagram link should point to instagram.com");
  }

  async verifyUtilityLinkNavigations(): Promise<void> {
    const utility = constants.footer.utility_links;
    await this.clickAndVerifyNavigation(this.utilityLinkPrivacyPolicy, utility.privacy_policy_url, "Privacy Policy");
    await this.clickAndVerifyNavigation(this.utilityLinkTermsAndConditions, utility.terms_and_conditions_url, "Terms & Conditions");
    await this.clickAndVerifyNavigation(this.utilityLinkAccessibility, utility.accessibility_url, "Accessibility");
    await this.clickAndVerifyNavigation(this.utilityLinkEqualHousingOpportunity, utility.equal_housing_opportunity_url, "Equal Housing Opportunity");
    // Manage Preferences (href="#") triggers the OneTrust consent modal — no page navigation expected
  }

  // ── Data Getters ────────────────────────────────────────

  async getCopyrightText(): Promise<string> {
    return await this.getText(this.copyrightText);
  }

  // ── Verification — Copyright ─────────────────────────────

  async verifyCopyrightText(): Promise<void> {
    const expected = `©${new Date().getFullYear()} ${constants.footer.copyright_text}`;
    await Validator.requireText(
      this.copyrightText,
      expected,
      `Copyright text should read "${expected}"`,
    );
  }
}
