import { Locator, Page, expect } from "@playwright/test";

export class Validator {
  static async requireVisible(
    locator: Locator,
    message: string,
    timeout = 10000,
  ): Promise<void> {
    await expect(locator, message).toBeVisible({ timeout });
  }

  static async requireHidden(
    locator: Locator,
    message: string,
    timeout = 10000,
  ): Promise<void> {
    await expect(locator, message).toBeHidden({ timeout });
  }

  static async requireEnabled(
    locator: Locator,
    message: string,
    timeout = 10000,
  ): Promise<void> {
    await expect(locator, message).toBeEnabled({ timeout });
  }

  static async requireText(
    locator: Locator,
    expected: string,
    message: string,
  ): Promise<void> {
    await expect(locator, message).toHaveText(expected, { timeout: 10000 });
  }

  static async requireUrlContains(
    page: Page,
    expected: string,
    message: string,
    timeout = 10000,
  ): Promise<void> {
    await expect(page, message).toHaveURL(new RegExp(expected), { timeout });
  }
}
