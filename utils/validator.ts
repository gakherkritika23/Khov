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
  ): Promise<void> {
    await expect(page, message).toHaveURL(new RegExp(expected));
  }

  static assertDescendingNumbers(values: number[]): void {
    expect(values.length).toBeGreaterThan(0);
    const sortedValues = [...values].sort((a, b) => b - a);
    expect(values).toEqual(sortedValues);
  }

  static assertDescendingNumbersWithEmptyLast(
    values: Array<number | null>,
  ): void {
    expect(values.length).toBeGreaterThan(0);
    const numericValues: number[] = [];
    let emptyValueFound = false;

    for (const value of values) {
      if (value === null) {
        emptyValueFound = true;
        continue;
      }
      expect(
        emptyValueFound,
        "Cards without price should appear only after priced cards",
      ).toBe(false);
      numericValues.push(value);
    }

    const sortedValues = [...numericValues].sort((a, b) => b - a);
    expect(numericValues).toEqual(sortedValues);
  }
}
