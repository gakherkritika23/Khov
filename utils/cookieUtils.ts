import { Page } from "@playwright/test";

/**
 * Best-effort dismissal of the cookie consent banner ("By browsing, you accept
 * our privacy policy and cookies." → "OK"). Fresh browser contexts have no
 * consent cookie, so the banner appears on first navigation. Safe to call even
 * when the banner is absent — it just continues.
 *
 * The banner is injected by an async third-party consent script, so on a slow
 * cold load (headed + maximized renders the full-resolution page) it can paint
 * several seconds after navigation. We wait for the DOM to be ready, then allow
 * generous time for the accept button to appear — the wait resolves as soon as
 * it's visible (fresh contexts always show it), so the larger timeout is just a
 * cap for slow loads, not a fixed delay.
 */
export async function dismissCookieBanner(
  page: Page,
  timeout = 15000,
): Promise<void> {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  const okButton = page.locator("button.accept_all").first();
  const visible = await okButton
    .waitFor({ state: "visible", timeout })
    .then(() => true)
    .catch(() => false);
  if (visible) {
    await okButton.click().catch(() => {});
    // Confirm it's gone so a lingering overlay can't intercept later clicks.
    await okButton.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    console.log("Dismissed cookie consent banner");
  }
}
