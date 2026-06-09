import { Page, Locator, expect } from "@playwright/test";

export class BasePage {
  protected readonly page: Page;
  

  constructor(page: Page) {
    this.page = page;
  }

  /* ================= NAVIGATION ================= */
  async navigate(url: string): Promise<void> {
    await this.gotoWithRetry(url);
    await this.handlePagePopups();
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
  async scrollIntoView(locator: Locator, timeout = 15000): Promise<void> {
    await locator.waitFor({ state: "visible", timeout });
    await locator.scrollIntoViewIfNeeded({ timeout });
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

  /* ================= POPUP HANDLERS ================= */
  async handlePagePopups(timeout = 8000): Promise<void> {
    await this.handleConsentPopup(timeout);
    await this.handleOneTrustPopup(timeout);
  }

  async handleConsentPopup(timeout = 8000): Promise<void> {
    if (await this.clickConsentButtonViaDom()) {
      await this.page.waitForTimeout(500);

      if (!(await this.isConsentPopupVisible())) {
        return;
      }
    }

    const consentButtons = [
      this.page.locator("aside.dg-consent-banner button", { hasText: /^OK$/i }).first(),
      this.page.locator("button.dg-button.accept_all").first(),
      this.page.locator("aside.dg-consent-banner button.dg-button.accept_all").first(),
      this.page.locator("button", { hasText: /^OK$/i }).first(),
      this.page.getByRole("button", { name: /^OK$/i }).first(),
      this.page.getByRole("button", { name: /Accept All|Accept|I Accept|Agree/i }).first(),
    ];

    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      for (const button of consentButtons) {
        const remaining = Math.max(deadline - Date.now(), 0);

        if (remaining === 0) return;

        if (await this.isVisible(button, Math.min(remaining, 500))) {
          await button.click({ force: true });
          await this.page.waitForTimeout(500);

          if (!(await this.isConsentPopupVisible())) {
            return;
          }
        }
      }

      await this.page.waitForTimeout(250);
    }
  }

  async handleOneTrustPopup(timeout = 3000): Promise<void> {
    const acceptButton = this.page.locator("#onetrust-accept-btn-handler").first();

    if (await this.isVisible(acceptButton, timeout)) {
      await acceptButton.click({ force: true });
    }
  }

  async isConsentPopupVisible(): Promise<boolean> {
    const consentBanner = this.page
      .locator("aside.dg-consent-banner, [class*='dg-consent-banner']")
      .first();

    return this.isVisible(consentBanner, 500);
  }

  private async clickConsentButtonViaDom(): Promise<boolean> {
    return this.page.evaluate(() => {
      const collectVisibleButtons = (root: Document | ShadowRoot): HTMLButtonElement[] => {
        const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
        const shadowButtons = Array.from(root.querySelectorAll<HTMLElement>("*"))
          .flatMap((element) => element.shadowRoot ? collectVisibleButtons(element.shadowRoot) : []);

        return [...buttons, ...shadowButtons].filter((button) => {
          const style = window.getComputedStyle(button);
          const rect = button.getBoundingClientRect();

          return (
            style.visibility !== "hidden" &&
            style.display !== "none" &&
            rect.width > 0 &&
            rect.height > 0
          );
        });
      };

      const consentButton = collectVisibleButtons(document).find((button) => {
        const text = button.textContent?.trim() ?? "";

        return (
          button.classList.contains("accept_all") ||
          /^OK$/i.test(text) ||
          /Accept All|Accept|I Accept|Agree/i.test(text)
        );
      });

      if (!consentButton) return false;

      consentButton.click();
      return true;
    }).catch(() => false);
  }

  private async gotoWithRetry(url: string): Promise<void> {
    const attempts = 2;
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await this.page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });
        return;
      } catch (error) {
        lastError = error;

        if (attempt === attempts || !this.isRetryableNavigationError(error)) {
          throw error;
        }

        await this.page.waitForTimeout(2000);
      }
    }

    throw lastError;
  }

  private isRetryableNavigationError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);

    return /ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ERR_TIMED_OUT|Timeout/i.test(
      message,
    );
  }
}
