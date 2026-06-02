import { Page, Locator, expect } from "@playwright/test";

export class BasePage {
  protected readonly page: Page;
  protected readonly cookieBanner: Locator;
  protected readonly cookieAcceptButton: Locator;
  protected readonly cookieCloseButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cookieBanner = page.locator("#onetrust-consent-sdk");
    this.cookieAcceptButton = page.locator("#onetrust-accept-btn-handler");
    this.cookieCloseButton = page
      .locator(
        "#onetrust-close-btn-container button, #onetrust-close-btn-container",
      )
      .first();
  }

  /* ================= NAVIGATION ================= */
  async navigate(url: string): Promise<void> {
    await this.page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async getUrl(): Promise<string> {
    return this.page.url();
  }

  async getHref(locator: Locator): Promise<string> {
    await locator.waitFor({ state: "attached" });
    return (await locator.getAttribute("href")) ?? "";
  }

  async verifyNavigation(expectedUrl: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(expectedUrl));
  }

  /* ================= BASIC ACTIONS ================= */
  async click(locator: Locator, name?: string): Promise<void> {
    await expect(locator).toBeVisible();
    await locator.click();
    console.log(`Clicked on: ${name ?? "element"}`);
  }

  async type(locator: Locator, text: string, name?: string): Promise<void> {
    await this.waitForVisible(locator);
    await locator.fill(text);
    console.log(`Typed in: ${name ?? "input"} → ${text}`);
  }

  /* ================= WAITS ================= */
  async waitForVisible(locator: Locator, timeout = 5000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  async waitForHidden(locator: Locator, timeout = 5000): Promise<void> {
    await expect(locator).toBeHidden({ timeout });
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState("domcontentloaded");
  }

  /* ================= UTILITIES ================= */
  async scrollIntoView(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  async getText(locator: Locator): Promise<string> {
    await this.waitForVisible(locator);
    return (await locator.textContent()) ?? "";
  }

  async isVisible(locator: Locator, timeout = 5000): Promise<boolean> {
    try {
      await locator.waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  async isEnabled(locator: Locator): Promise<boolean> {
    return locator.isEnabled();
  }

  /* ================= COOKIE HANDLING ================= */
  async dismissCookies(): Promise<void> {
    if (await this.cookieBanner.isVisible().catch(() => false)) {
      if (await this.cookieAcceptButton.isVisible().catch(() => false)) {
        await this.cookieAcceptButton.click({ force: true }).catch(() => null);
      } else if (await this.cookieCloseButton.isVisible().catch(() => false)) {
        await this.cookieCloseButton.click({ force: true }).catch(() => null);
      }
      await expect(this.cookieBanner)
        .toBeHidden({ timeout: 5000 })
        .catch(() => null);
    }
  }
}
