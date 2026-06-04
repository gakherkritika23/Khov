import { Page, Locator, expect } from "@playwright/test";

export class BasePage {
  protected readonly page: Page;
  

  constructor(page: Page) {
    this.page = page;
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

  // Use for inputs that react to real keystrokes (e.g. autocomplete/typeahead
  // fields where fill() does not trigger the suggestion handler).
  async typeSequentially(
    locator: Locator,
    text: string,
    name?: string,
    delay = 100,
  ): Promise<void> {
    await this.waitForVisible(locator);
    await locator.click();
    await locator.fill("");
    await locator.pressSequentially(text, { delay });
    console.log(`Typed sequentially in: ${name ?? "input"} → ${text}`);
  }

  // Clicks an element programmatically via the DOM. Use for zero-size overlay
  // anchors (e.g. "stretched link" cards) that Playwright cannot click through
  // the normal actionability checks because the visible content sits on top.
  async clickViaScript(locator: Locator, name?: string): Promise<void> {
    const target = locator.first();
    await target.waitFor({ state: "attached" });
    await target.evaluate((el) => (el as HTMLElement).click());
    console.log(`Clicked (script) on: ${name ?? "element"}`);
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
}
