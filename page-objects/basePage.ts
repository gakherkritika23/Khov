import { Page, Locator, expect } from "@playwright/test";
import { Validator } from "../utils/validator";

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

  protected async clickAndVerifyNavigation(
    link: Locator,
    expectedUrl: string,
    label: string,
  ): Promise<void> {
    await link.scrollIntoViewIfNeeded();
    await expect(link).toBeVisible();
    await link.click();
    console.log(`Clicked on: ${label}`);
    await Validator.requireUrlContains(
      this.page,
      expectedUrl,
      `${label} should navigate to a URL containing "${expectedUrl}"`,
    );
    await this.page.goBack();
    await this.page.waitForLoadState("domcontentloaded");
  }

  /* ================= BASIC ACTIONS ================= */
  async click(locator: Locator, name?: string): Promise<void> {
    await expect(locator).toBeVisible();
    await locator.click();
    console.log(`Clicked on: ${name ?? "element"}`);
  }

  // Types character-by-character (not an instant fill) so the values are visibly
  // entered into the form during the headed demo run.
  async type(locator: Locator, text: string, name?: string): Promise<void> {
    await this.waitForVisible(locator);
    const current = await locator.inputValue().catch(() => "");
    if (current === text) {
      console.log(`Skipped (already filled): ${name ?? "input"} → ${text}`);
      return;
    }
    await locator.click();
    await locator.fill("");
    await locator.pressSequentially(text, { delay: 50 });
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

  // Fires a complete pointer-press sequence (pointerdown → pointerup → click) on
  // the element synchronously in the page, centred on it so react-aria's
  // "released over target" check passes. Unlike a Playwright click there is no
  // inter-event delay for slowMo to stretch (which lets a re-rendering element
  // detach mid-press), and unlike a bare `el.click()` it gives react-aria's
  // usePress the pointer events it listens for. Use for react-aria pressables
  // (e.g. the Request Information modal CTAs) that a normal click intermittently
  // fails to trigger under slowMo.
  protected async pressAtomically(locator: Locator): Promise<void> {
    await locator
      .first()
      .evaluate((el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const base: PointerEventInit = {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
          button: 0,
          clientX: x,
          clientY: y,
          view: window,
        };
        el.dispatchEvent(new PointerEvent("pointerdown", { ...base, buttons: 1 }));
        el.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0 }));
        el.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            composed: true,
            button: 0,
            clientX: x,
            clientY: y,
            view: window,
          }),
        );
      })
      .catch(() => {});
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
  // Holds the current screen briefly so the demo audience can read it (e.g. the
  // success / thank-you panel before the test tears down).
  async demoHold(ms = 4000): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  // Best-effort: pages lazy-render, so the target can detach mid-scroll. Retry
  // (re-resolving the locator) and don't throw — callers follow with an
  // auto-waiting assertion/action.
  async scrollIntoView(locator: Locator): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await locator.scrollIntoViewIfNeeded({ timeout: 5000 });
        return;
      } catch {
        await this.page.waitForTimeout(500);
      }
    }
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

  /* ================= FORM HELPERS ================= */
  // react-aria visually-hidden checkboxes: a forced click doesn't flip component
  // state — focus the input and press Space the way react-aria expects.
  protected async checkBox(input: Locator, name: string): Promise<void> {
    if (await input.isChecked().catch(() => false)) {
      console.log(`Checkbox already checked: ${name}`);
      return;
    }
    await input.focus();
    await input.press("Space");
    await expect(input, `${name} checkbox should be checked`).toBeChecked({ timeout: 5000 });
    console.log(`Checked: ${name}`);
  }

  // The contact forms are gated by Cloudflare Turnstile. The widget injects a
  // token into a hidden input once it resolves; submitting before the token is
  // present silently fails. When a modal is open alongside the main form, pass
  // the modal-scoped locator so we poll the right input.
  protected async waitForTurnstileToken(
    timeout = 15000,
    token?: Locator,
  ): Promise<void> {
    console.log("Waiting for Cloudflare Turnstile security token...");
    const t = token ?? this.page.locator("input[name='cf-turnstile-response']").first();
    await expect
      .poll(
        async () => (await t.inputValue().catch(() => "")).length,
        { message: "Cloudflare Turnstile token should be populated before submit", timeout },
      )
      .toBeGreaterThan(0);
    console.log("Turnstile token received — form is ready to submit");
  }

  // Production is the live www.khov.com domain (env subdomains: www-dev /
  // www-uat / www-stg). Both TEST_ENV=prod and that URL pattern count as prod.
  protected isProdEnv(): boolean {
    const env = (process.env.TEST_ENV ?? "").toLowerCase();
    const baseUrl = process.env.BASE_URL ?? "";
    return env === "prod" || /^https?:\/\/(www\.)?khov\.com/i.test(baseUrl);
  }

  // Resolves a relative path against BASE_URL so POMs can store either form
  // and always navigate correctly.
  protected resolveUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    return new URL(url, process.env.BASE_URL ?? "https://www.khov.com/").href;
  }

  /* ================= POPUP HANDLERS ================= */
  async handlePagePopups(timeout = 8000): Promise<void> {
    await this.handleConsentPopup(timeout);
    // Use the OneTrust probe's own short default — do NOT pass the consent
    // timeout, which made this wait the full 8s for a OneTrust banner that
    // never appears.
    await this.handleOneTrustPopup();
  }

  async handleConsentPopup(timeout = 8000): Promise<void> {
    if (await this.clickConsentButtonViaDom()) {
      await this.page.waitForTimeout(500);

      if (!(await this.isConsentPopupVisible())) {
        return;
      }
    } else if (!(await this.isConsentPopupVisible())) {
      // No consent banner on the page — return immediately instead of polling
      // out the full timeout. This handler runs on every navigation and every
      // modal-open, so spinning ~8s here each time (with nothing to dismiss) was
      // the bulk of the long pause before the Request Information tap.
      return;
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

  async handleOneTrustPopup(timeout = 1500): Promise<void> {
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
