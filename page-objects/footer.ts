import { Page, Locator } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";

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
    await this.requireClickable(this.navLinkFindYourHome, "Footer nav: Find Your Home");
    await this.requireClickable(this.navLinkHomeBuyingProcess, "Footer nav: Home Buying Process");
    await this.requireClickable(this.navLinkFinanceYourHome, "Footer nav: Finance Your Home");
    await this.requireClickable(this.navLinkWhyKHovnanian, "Footer nav: Why K. Hovnanian");
    await this.requireClickable(this.navLinkContactUs, "Footer nav: Contact Us");
    await this.requireClickable(this.navLinkHomeownerServices, "Footer nav: Homeowner Services");
    await this.requireClickable(this.navLinkInvestorRelations, "Footer nav: Investor Relations");
    await this.requireClickable(this.navLinkCareers, "Footer nav: Careers");
    await this.requireClickable(this.navLinkBlog, "Footer nav: Blog");
    await this.requireClickable(this.navLinkSitemap, "Footer nav: Sitemap");
  }

  async verifySocialLinksClickable(): Promise<void> {
    await this.requireClickable(this.socialLinkFacebook, "Footer social: Facebook");
    await this.requireClickable(this.socialLinkPinterest, "Footer social: Pinterest");
    await this.requireClickable(this.socialLinkYouTube, "Footer social: YouTube");
    await this.requireClickable(this.socialLinkInstagram, "Footer social: Instagram");
  }

  async verifyUtilityLinksClickable(): Promise<void> {
    await this.requireClickable(this.utilityLinkPrivacyPolicy, "Footer utility: Privacy Policy");
    await this.requireClickable(this.utilityLinkTermsAndConditions, "Footer utility: Terms & Conditions");
    await this.requireClickable(this.utilityLinkAccessibility, "Footer utility: Accessibility");
    await this.requireClickable(this.utilityLinkEqualHousingOpportunity, "Footer utility: Equal Housing Opportunity");
    await this.requireClickable(this.utilityLinkManagePreferences, "Footer utility: Manage Preferences");
  }

  // ── Verification — Navigation ────────────────────────────
  // Internal links: click → verify URL → go back.
  // External / new-tab links: verify href attribute only (clicking would leave the
  // domain or open a new tab, neither of which suits a sequential navigation test).

  async verifyNavLinkNavigations(): Promise<void> {
    await this.clickAndVerifyNavigation(this.navLinkFindYourHome, "/new-construction-homes/", "Find Your Home");
    await this.clickAndVerifyNavigation(this.navLinkHomeBuyingProcess, "/home-buying-process/", "Home Buying Process");
    await this.clickAndVerifyNavigation(this.navLinkWhyKHovnanian, "/why-choose-k-hovnanian/", "Why K. Hovnanian");
    await this.clickAndVerifyNavigation(this.navLinkContactUs, "/contact-us/", "Contact Us");
    await this.clickAndVerifyNavigation(this.navLinkHomeownerServices, "/homeowner-services/", "Homeowner Services");
    await this.clickAndVerifyNavigation(this.navLinkInvestorRelations, "/investor-relations/", "Investor Relations");
    await this.clickAndVerifyNavigation(this.navLinkCareers, "/careers/", "Careers");
    await this.clickAndVerifyNavigation(this.navLinkBlog, "/blog/", "Blog");
    await this.clickAndVerifyNavigation(this.navLinkSitemap, "/sitemap/", "Sitemap");
  }

  async verifyFinanceYourHomeHref(): Promise<void> {
    const href = await this.getHref(this.navLinkFinanceYourHome);
    await Validator.requireTrue(
      href.includes("khovmortgage.com"),
      "Finance Your Home link should point to khovmortgage.com",
    );
  }

  async verifySocialLinkHrefs(): Promise<void> {
    const facebook = await this.getHref(this.socialLinkFacebook);
    await Validator.requireTrue(facebook.includes("facebook.com"), "Facebook link should point to facebook.com");

    const pinterest = await this.getHref(this.socialLinkPinterest);
    await Validator.requireTrue(pinterest.includes("pinterest.com"), "Pinterest link should point to pinterest.com");

    const youtube = await this.getHref(this.socialLinkYouTube);
    await Validator.requireTrue(youtube.includes("youtube.com"), "YouTube link should point to youtube.com");

    const instagram = await this.getHref(this.socialLinkInstagram);
    await Validator.requireTrue(instagram.includes("instagram.com"), "Instagram link should point to instagram.com");
  }

  async verifyUtilityLinkNavigations(): Promise<void> {
    await this.clickAndVerifyNavigation(this.utilityLinkPrivacyPolicy, "/privacy-policy/", "Privacy Policy");
    await this.clickAndVerifyNavigation(this.utilityLinkTermsAndConditions, "/terms-and-conditions/", "Terms & Conditions");
    await this.clickAndVerifyNavigation(this.utilityLinkAccessibility, "/accessibility/", "Accessibility");
    await this.clickAndVerifyNavigation(this.utilityLinkEqualHousingOpportunity, "/equal-housing-opportunity/", "Equal Housing Opportunity");
    // Manage Preferences (href="#") triggers the OneTrust consent modal — no page navigation expected
  }

  // ── Data Getters ────────────────────────────────────────

  async getCopyrightText(): Promise<string> {
    return await this.getText(this.copyrightText);
  }

  // ── Private Helpers ─────────────────────────────────────

  private async requireClickable(locator: Locator, label: string): Promise<void> {
    await Validator.requireVisible(locator, `${label} should be visible`);
    await Validator.requireEnabled(locator, `${label} should be enabled`);
  }

  private async clickAndVerifyNavigation(link: Locator, expectedUrl: string, label: string): Promise<void> {
    await this.scrollIntoView(link);
    await this.click(link, label);
    await Validator.requireUrlContains(
      this.page,
      expectedUrl,
      `${label} should navigate to a URL containing "${expectedUrl}"`,
    );
    await this.page.goBack();
    await this.page.waitForLoadState("domcontentloaded");
  }
}
