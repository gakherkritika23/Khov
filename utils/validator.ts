import { Locator, Page, expect, test } from "@playwright/test";

/**
 * Assertion helpers. Every check runs inside a boxed `test.step` named with a
 * plain-English message, so reports (Allure / HTML) show clean, client-readable
 * steps — e.g. "Community name should be visible" — instead of raw locator code
 * such as `getByRole('heading', …).first()`. `box: true` keeps the locator and
 * expect internals collapsed out of the step headline.
 */
export class Validator {
  static async requireVisible(
    locator: Locator,
    message: string,
    timeout = 10000,
  ): Promise<void> {
    await test.step(
      message,
      async () => {
        await expect(locator).toBeVisible({ timeout });
      },
      { box: true },
    );
  }

  static async requireHidden(
    locator: Locator,
    message: string,
    timeout = 10000,
  ): Promise<void> {
    await test.step(
      message,
      async () => {
        await expect(locator).toBeHidden({ timeout });
      },
      { box: true },
    );
  }

  static async requireEnabled(
    locator: Locator,
    message: string,
    timeout = 10000,
  ): Promise<void> {
    await test.step(
      message,
      async () => {
        await expect(locator).toBeEnabled({ timeout });
      },
      { box: true },
    );
  }

  static async requireText(
    locator: Locator,
    expected: string,
    message: string,
  ): Promise<void> {
    await test.step(
      message,
      async () => {
        await expect(locator).toHaveText(expected, { timeout: 10000 });
      },
      { box: true },
    );
  }

  static async requireUrlContains(
    page: Page,
    expected: string,
    message: string,
    timeout = 10000,
  ): Promise<void> {
    await test.step(
      message,
      async () => {
        await expect(page).toHaveURL(new RegExp(expected), { timeout });
      },
      { box: true },
    );
  }

  static async requireNotEmpty(value: string, message: string): Promise<void> {
    await test.step(
      message,
      async () => {
        expect(value.trim(), message).not.toBe("");
      },
      { box: true },
    );
  }

  static async requireTrue(condition: boolean, message: string): Promise<void> {
    await test.step(
      message,
      async () => {
        expect(condition, message).toBe(true);
      },
      { box: true },
    );
  }
}
