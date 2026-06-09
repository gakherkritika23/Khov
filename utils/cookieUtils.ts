import { Page } from "@playwright/test";

/**
 * Best-effort dismissal of the cookie consent banner ("By browsing, you accept
 * our privacy policy and cookies." → "OK"). Fresh browser contexts have no
 * consent cookie, so the banner appears on first navigation. Safe to call even
 * when the banner is absent — it just continues.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const okButton = page.locator("button.accept_all").first();
  const visible = await okButton
    .waitFor({ state: "visible", timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (visible) {
    await okButton.click().catch(() => {});
    console.log("Dismissed cookie consent banner");
  }
}
