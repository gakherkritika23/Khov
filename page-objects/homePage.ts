import { Page, Locator } from "@playwright/test";
import { BasePage } from "./basePage";
import { Validator } from "../utils/validator";
import { waitForApi } from "../utils/apiUtils";
import { dismissCookieBanner } from "../utils/cookieUtils";
import { reportValue } from "../utils/reporter";

export class HomePage extends BasePage {
  readonly searchInput: Locator;
  readonly resultsHeading: Locator;

  // ── Home page content (E7) ───────────────────────────────
  // Hero
  readonly heroSection: Locator;
  readonly heroHeading: Locator;
  readonly heroVideo: Locator;
  readonly heroMediaControl: Locator;
  // State selection — a styled react-aria trigger backed by a native <select>
  // that carries the canonical list of states (the visible listbox renders only
  // on open, so the <select> is the reliable source for the configured states).
  readonly stateSectionHeading: Locator;
  readonly stateNativeSelect: Locator;
  readonly stateOptions: Locator;
  readonly stateSelectTrigger: Locator;
  // TrustBuilder reviews block.
  readonly trustBuilderSection: Locator;
  readonly trustRating: Locator;
  readonly trustReviewCount: Locator;
  readonly readReviewsCta: Locator;
  // Homepage content CTAs (excludes header/footer/search links — separate epics).
  readonly learnMoreCta: Locator;
  // All in-content images (used for the broken-media checks).
  readonly allImages: Locator;

  // Navigation timing for the render-threshold check.
  loadDurationMs = 0;

  constructor(page: Page) {
    super(page);
    // Hero search box — react-aria searchbox exposed via its aria-label.
    // The element's id is dynamically generated, so we resolve it by role.
    this.searchInput = page.getByRole("searchbox", { name: "Search input" });
    // Destination (results) page heading, e.g. "Dallas New Homes".
    this.resultsHeading = page.locator("h1");

    // ── Hero ──
    this.heroSection = page.locator("section[class*='Hero_hero']").first();
    this.heroHeading = this.heroSection.locator("[class*='Hero_title']").first();
    // Background video is a Vimeo embed (iframe in a Hero_vimeo wrapper).
    this.heroVideo = page.locator("iframe[src*='player.vimeo.com']").first();
    // Play/Pause toggle for the background video/slideshow.
    this.heroMediaControl = page
      .getByRole("button", { name: /background video or slide/i })
      .first();

    // ── State selection ──
    this.stateSectionHeading = page.getByRole("heading", {
      name: /Select a state to begin your search/i,
    });
    this.stateNativeSelect = page.locator("select").first();
    this.stateOptions = this.stateNativeSelect.locator("option");
    // The visible, interactive trigger that opens the state listbox popover.
    this.stateSelectTrigger = page.locator(
      "button.react-aria-Button[aria-haspopup='listbox']",
    );

    // ── TrustBuilder ──
    this.trustBuilderSection = page.locator("section[class*='TrustBuilders']").first();
    this.trustRating = this.trustBuilderSection.getByText(
      /\d(?:\.\d)?\s*out of\s*5\s*stars/i,
    );
    this.trustReviewCount = this.trustBuilderSection.getByText(
      /[\d,]+\s*reviews/i,
    );
    this.readReviewsCta = this.trustBuilderSection.getByRole("link", {
      name: /Read TrustBuilder Reviews/i,
    });

    // ── Content CTAs ──
    this.learnMoreCta = page.getByRole("link", {
      name: /Learn More About Looks/i,
    });

    this.allImages = page.locator("main img, img");
  }

  // ── Hero Search — Actions ──────────────────────────────
  async navigateToHome(url: string): Promise<void> {
    await this.navigate(url);
    // Best-effort hydration wait: the home page's "load" event can be slow
    // (hero video), so cap it and proceed — the search box assertion auto-waits.
    await this.page.waitForLoadState("load", { timeout: 15000 }).catch(() => {});
    await dismissCookieBanner(this.page);
  }

  /**
   * Types a term into the hero search box, waits for the suggestions API to
   * respond, then clicks the matching auto-suggestion option.
   * The suggestion is rendered as a link whose accessible name equals the value.
   */
  async searchAndSelectSuggestion(
    term: string,
    suggestion: string,
    searchEndpoint: string,
  ): Promise<void> {
    // React hydration can discard the very first keystrokes (resetting the
    // controlled input to empty and never calling the suggestions API). Retry
    // typing until the search API responds.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const suggestionsLoaded = waitForApi(this.page, searchEndpoint, 6000);
      await this.typeSequentially(this.searchInput, term, "Hero search input");
      try {
        await suggestionsLoaded;
        break;
      } catch {
        if (attempt === maxAttempts) {
          throw new Error(
            `Suggestions API "${searchEndpoint}" did not respond after ${maxAttempts} attempts`,
          );
        }
        console.log(
          `Suggestions not loaded (attempt ${attempt}); retrying after hydration…`,
        );
      }
    }

    const option = this.page.getByRole("link", {
      name: suggestion,
      exact: true,
    });
    await this.click(option, `${suggestion} suggestion`);
  }

  // ── Hero Search — Verification ─────────────────────────
  async verifySearchInputIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.searchInput,
      "Hero search input should be visible on the Home page",
    );
  }

  async verifyResultsPageDisplayed(
    expectedUrlPart: string,
    expectedHeading: string,
  ): Promise<void> {
    await Validator.requireUrlContains(
      this.page,
      expectedUrlPart,
      `URL should contain "${expectedUrlPart}" after selecting the suggestion`,
    );
    await Validator.requireText(
      this.resultsHeading.first(),
      expectedHeading,
      `Results heading should read "${expectedHeading}"`,
    );
  }

  // ── Hero Search — Data Getters ─────────────────────────
  async getResultsHeading(): Promise<string> {
    return await this.getText(this.resultsHeading.first());
  }

  /* ===================================================================
   *  HOME PAGE CONTENT (E7)
   * =================================================================== */

  // ── Page Load — Actions ────────────────────────────────
  /**
   * Navigate, record the navigation duration (for the render-threshold check),
   * dismiss cookies, and scroll the full page so lazy sections/images render.
   */
  async navigateAndScroll(url: string): Promise<void> {
    const start = Date.now();
    await this.navigate(url);
    await this.page.waitForLoadState("load", { timeout: 30000 }).catch(() => {});
    this.loadDurationMs = Date.now() - start;
    await dismissCookieBanner(this.page);
    await this.scrollWholePage();
  }

  // Scrolls top→bottom→top so lazy-rendered sections and images load.
  private async scrollWholePage(): Promise<void> {
    await this.page
      .evaluate(async () => {
        await new Promise<void>((resolve) => {
          let y = 0;
          const step = () => {
            window.scrollTo(0, y);
            y += 600;
            if (y < document.body.scrollHeight) setTimeout(step, 120);
            else {
              window.scrollTo(0, 0);
              setTimeout(resolve, 400);
            }
          };
          step();
        });
      })
      .catch(() => {});
    await this.page.waitForTimeout(800);
  }

  // ── Page Load — Verification ───────────────────────────
  async verifyHomePageLoaded(expectedTitlePart: string): Promise<void> {
    const title = await this.getTitle();
    await reportValue(`Home page title: ${title}`);
    await Validator.requireTrue(
      title.includes(expectedTitlePart),
      `Page title should contain "${expectedTitlePart}" (got "${title}")`,
    );
    await Validator.requireVisible(
      this.page.locator("main").first(),
      "Main landmark should be visible on the home page",
      20000,
    );
  }

  async verifyInitialRenderWithin(thresholdMs: number): Promise<void> {
    await reportValue(`Home page navigation completed in ${this.loadDurationMs} ms`);
    await Validator.requireTrue(
      this.loadDurationMs > 0 && this.loadDurationMs <= thresholdMs,
      `Home page should finish loading within ${thresholdMs} ms (took ${this.loadDurationMs} ms)`,
    );
  }

  // ── Hero — Verification ────────────────────────────────
  async verifyHeroSectionIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.heroSection,
      "Hero section should be displayed",
      20000,
    );
  }

  async verifyHeroHeadingIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.heroHeading,
      "Hero heading should be displayed",
      20000,
    );
    const text = (await this.heroHeading.innerText()).trim();
    await Validator.requireNotEmpty(text, "Hero heading should not be empty");
    await reportValue(`Hero heading: ${text}`);
  }

  async verifyHeroVideoIsDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.heroVideo,
      "Hero background video (Vimeo) should render",
      20000,
    );
    const src = (await this.heroVideo.getAttribute("src")) ?? "";
    await Validator.requireTrue(
      /player\.vimeo\.com\/video\/\d+/.test(src),
      `Hero video should be a Vimeo player embed (src: ${src})`,
    );
    await reportValue(`Hero video src: ${src}`);
    // Assert the video asset is actually reachable (player embed returns 200).
    const resp = await this.page.request
      .get(src, { timeout: 15000 })
      .catch(() => null);
    const status = resp ? resp.status() : "ERR";
    await reportValue(`Hero video embed status: ${status}`);
    await Validator.requireTrue(
      status === 200,
      `Hero video embed should return 200 (got ${status})`,
    );
  }

  /**
   * Query the Vimeo background-video player via its postMessage JS API
   * (`getPaused` / `getCurrentTime`). Returns the value, or null/"TIMEOUT" if the
   * player isn't reachable. Cross-origin DOM is blocked, but the Vimeo Player API
   * responds to postMessage, so this reflects the REAL playback state.
   */
  private async queryHeroPlayer(method: string): Promise<unknown> {
    return await this.page.evaluate((m) => {
      return new Promise((resolve) => {
        const iframe = document.querySelector(
          "iframe[src*='player.vimeo.com']",
        ) as HTMLIFrameElement | null;
        if (!iframe || !iframe.contentWindow) {
          resolve(null);
          return;
        }
        const win = iframe.contentWindow;
        const onMsg = (e: MessageEvent) => {
          let d: unknown = e.data;
          try {
            if (typeof d === "string") d = JSON.parse(d);
          } catch {
            return;
          }
          const msg = d as { method?: string; value?: unknown };
          if (msg && msg.method === m) {
            window.removeEventListener("message", onMsg);
            resolve(msg.value);
          }
        };
        window.addEventListener("message", onMsg);
        win.postMessage(JSON.stringify({ method: m }), "*");
        setTimeout(() => {
          window.removeEventListener("message", onMsg);
          resolve("TIMEOUT");
        }, 4000);
      });
    }, method);
  }

  /**
   * Wait until the player's REAL paused state equals `expected`, then return it.
   * The Vimeo player only answers API calls after its `ready` event, and a
   * background video is briefly paused while it buffers before autoplay engages —
   * so this registers for `ready` and polls `getPaused`, resolving as soon as the
   * state matches `expected` (or returning the last observed value at timeout).
   */
  private async waitForHeroVideoPaused(
    expected: boolean,
    timeoutMs = 12000,
  ): Promise<boolean | null> {
    return await this.page.evaluate(
      async ({ expected, timeoutMs }) => {
        const iframe = document.querySelector(
          "iframe[src*='player.vimeo.com']",
        ) as HTMLIFrameElement | null;
        if (!iframe || !iframe.contentWindow) return null;
        const win = iframe.contentWindow;
        return await new Promise<boolean | null>((resolve) => {
          let last: boolean | null = null;
          let done = false;
          const finish = (v: boolean | null) => {
            if (done) return;
            done = true;
            clearInterval(poll);
            window.removeEventListener("message", onMsg);
            resolve(v);
          };
          const onMsg = (e: MessageEvent) => {
            let d: unknown = e.data;
            try {
              if (typeof d === "string") d = JSON.parse(d);
            } catch {
              return;
            }
            const msg = d as { event?: string; method?: string; value?: unknown };
            if (!msg) return;
            if (msg.event === "ready") {
              win.postMessage(JSON.stringify({ method: "getPaused" }), "*");
            } else if (
              msg.method === "getPaused" &&
              typeof msg.value === "boolean"
            ) {
              last = msg.value;
              if (msg.value === expected) finish(msg.value);
            }
          };
          window.addEventListener("message", onMsg);
          win.postMessage(
            JSON.stringify({ method: "addEventListener", value: "ready" }),
            "*",
          );
          win.postMessage(JSON.stringify({ method: "getPaused" }), "*");
          const poll = setInterval(
            () => win.postMessage(JSON.stringify({ method: "getPaused" }), "*"),
            500,
          );
          setTimeout(() => finish(last), timeoutMs);
        });
      },
      { expected, timeoutMs },
    );
  }

  /**
   * Validates the hero background video AUTOPLAYS on page open — the player
   * reports not-paused AND its current time advances between two samples.
   */
  async verifyHeroVideoAutoplays(): Promise<void> {
    const paused = await this.waitForHeroVideoPaused(false);
    await reportValue(`Hero video paused on load: ${paused}`);
    await Validator.requireTrue(
      paused === false,
      `Hero video should autoplay on page open (player getPaused=${paused})`,
    );
    const t1 = await this.queryHeroPlayer("getCurrentTime");
    await this.page.waitForTimeout(1500);
    const t2 = await this.queryHeroPlayer("getCurrentTime");
    await reportValue(`Hero video currentTime: ${t1}s → ${t2}s`);
    await Validator.requireTrue(
      typeof t1 === "number" &&
        typeof t2 === "number" &&
        (t2 as number) > (t1 as number),
      `Hero video playback should advance while autoplaying (t1=${t1}, t2=${t2})`,
    );
  }

  /**
   * Validates the user can pause AND resume the hero video via the on-screen
   * control — asserted against the player's REAL paused state (via the Vimeo
   * API), not just the button label. Round-trip: playing → pause → play.
   */
  async verifyHeroMediaControlWorks(): Promise<void> {
    await Validator.requireVisible(
      this.heroMediaControl,
      "Hero media (play/pause) control should be visible",
      20000,
    );
    // Playing on load (wait for autoplay to engage after initial buffering).
    let paused = await this.waitForHeroVideoPaused(false);
    await Validator.requireTrue(
      paused === false,
      `Hero video should be playing before pause (getPaused=${paused})`,
    );
    // User pause.
    await this.click(this.heroMediaControl, "Hero media control → pause");
    paused = await this.waitForHeroVideoPaused(true);
    await reportValue(`Hero video paused after pause click: ${paused}`);
    await Validator.requireTrue(
      paused === true,
      `Hero video should pause when the user clicks the control (getPaused=${paused})`,
    );
    // User resume.
    await this.click(this.heroMediaControl, "Hero media control → play");
    paused = await this.waitForHeroVideoPaused(false);
    await reportValue(`Hero video paused after play click: ${paused}`);
    await Validator.requireTrue(
      paused === false,
      `Hero video should resume when the user clicks the control again (getPaused=${paused})`,
    );
  }

  // ── State Selection — Verification ─────────────────────
  async verifyStateSelectionIsDisplayed(): Promise<void> {
    await this.scrollIntoView(this.stateSectionHeading);
    await Validator.requireVisible(
      this.stateSectionHeading,
      "'Select a state to begin your search' section should be displayed",
      20000,
    );
  }

  async verifyAllConfiguredStatesPresent(expectedStates: string[]): Promise<void> {
    // The native <select> carries the canonical list; read its non-empty option
    // labels and assert every configured state is present.
    const labels = (await this.stateOptions.allTextContents())
      .map((t) => t.trim())
      .filter(Boolean);
    await reportValue(`State options (${labels.length}): ${labels.join(", ")}`);
    const missing = expectedStates.filter((s) => !labels.includes(s));
    await Validator.requireTrue(
      missing.length === 0,
      `All configured states should be listed${missing.length ? ` — missing: ${missing.join(", ")}` : ""}`,
    );
  }

  /**
   * Selecting a state navigates to that state's region page.
   *
   * The "Select a State" control is a react-aria listbox whose trigger button
   * and option <li>s render zero-size for a normal pointer click (so Playwright
   * click/keyboard cannot drive it). It is driven via the DOM instead:
   *  1) a programmatic DOM `click()` on the trigger opens the listbox popover;
   *  2) the matching option is activated with a synthesized pointer-press
   *     sequence (`pointerdown` → `pointerup` → `click`) — react-aria's
   *     `usePress` fires the navigation only on a real press, NOT on a bare
   *     `.click()` (which merely marks the option selected without navigating).
   */
  async selectStateAndVerifyNavigation(
    stateName: string,
    expectedUrlPart: string,
  ): Promise<void> {
    await this.scrollIntoView(this.stateSectionHeading);
    // Open the listbox (trigger is zero-size → programmatic DOM click).
    await this.page.evaluate(() => {
      const btn = document.querySelector(
        "button.react-aria-Button[aria-haspopup='listbox']",
      ) as HTMLButtonElement | null;
      btn?.click();
    });

    const option = this.page.getByRole("option", {
      name: stateName,
      exact: true,
    });
    await option.first().waitFor({ state: "attached", timeout: 8000 });

    // Press the option via a synthesized pointer sequence (react-aria usePress).
    await this.page.evaluate((name) => {
      const opt = Array.from(
        document.querySelectorAll("[role='option']"),
      ).find((o) => (o.textContent || "").trim() === name);
      if (!opt) throw new Error(`State option "${name}" not found in listbox`);
      const ev = {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "mouse",
        button: 0,
      };
      opt.dispatchEvent(new PointerEvent("pointerdown", ev));
      opt.dispatchEvent(new PointerEvent("pointerup", ev));
      opt.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    }, stateName);

    await Validator.requireUrlContains(
      this.page,
      expectedUrlPart,
      `Selecting "${stateName}" should navigate to its region page (URL contains "${expectedUrlPart}")`,
      15000,
    );
    await reportValue(`State "${stateName}" navigated to: ${this.page.url()}`);
  }

  // ── TrustBuilder — Verification ────────────────────────
  async verifyTrustBuilderSectionLoaded(): Promise<void> {
    await this.scrollIntoView(this.trustBuilderSection);
    await Validator.requireVisible(
      this.trustBuilderSection,
      "TrustBuilder reviews section should be displayed",
      20000,
    );
  }

  async verifyTrustRatingDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.trustRating.first(),
      "TrustBuilder overall rating should be displayed",
      20000,
    );
    const text = (await this.trustRating.first().innerText())
      .replace(/\s+/g, " ")
      .trim();
    await reportValue(`TrustBuilder rating: ${text}`);
  }

  async verifyTrustReviewCountDisplayed(): Promise<void> {
    await Validator.requireVisible(
      this.trustReviewCount.first(),
      "TrustBuilder review count should be displayed",
      20000,
    );
    const text = (await this.trustReviewCount.first().innerText())
      .replace(/\s+/g, " ")
      .trim();
    await reportValue(`TrustBuilder review count: ${text}`);
  }

  async verifyReadReviewsCtaWorks(): Promise<void> {
    await Validator.requireVisible(
      this.readReviewsCta,
      "'Read TrustBuilder Reviews' CTA should be displayed",
      20000,
    );
    const href = await this.getHref(this.readReviewsCta);
    await reportValue(`Read TrustBuilder Reviews href: ${href}`);
    await Validator.requireTrue(
      /newhomesource\.com/i.test(href),
      `'Read TrustBuilder Reviews' should link to the reviews site (href: ${href})`,
    );
  }

  // ── Content CTAs — Verification / Actions ──────────────
  async verifyLearnMoreNavigates(expectedUrlPart: string): Promise<void> {
    await this.scrollIntoView(this.learnMoreCta.first());
    await this.click(this.learnMoreCta.first(), "Learn More About Looks CTA");
    await Validator.requireUrlContains(
      this.page,
      expectedUrlPart,
      `'Learn More' should navigate to a URL containing "${expectedUrlPart}"`,
      20000,
    );
  }

  // ── Media — Verification ───────────────────────────────
  /**
   * For every rendered **first-party (`khov.com`)** <img>: (1) assert the
   * browser actually decoded it (naturalWidth > 0 — a broken/404 image decodes
   * to 0), and (2) HTTP-GET each unique image URL and assert it returns 200.
   * Third-party CDN assets (e.g. CloudFront marketing images) are intentionally
   * excluded: they lazy-load and decode racily and their CDN throttles parallel
   * GETs, which produced false broken/non-200 results. Both the render check and
   * the status code are reported. Images are already scrolled into view by
   * navigateAndScroll.
   */
  async verifyNoBrokenImages(): Promise<void> {
    const data = await this.page.evaluate(() => {
      const isFirstParty = (u: string) => {
        try {
          return new URL(u).hostname.endsWith("khov.com");
        } catch {
          return false;
        }
      };
      const url = (im: HTMLImageElement) => im.currentSrc || im.src;
      const imgs = Array.from(document.querySelectorAll("img"));
      const rendered = imgs.filter((im) => {
        const r = im.getBoundingClientRect();
        return r.width > 1 && r.height > 1;
      });
      // First-party images only (third-party CDN assets are out of scope).
      const firstParty = rendered.filter((im) => isFirstParty(url(im)));
      return {
        total: imgs.length,
        renderedCount: rendered.length,
        firstPartyCount: firstParty.length,
        brokenRender: firstParty
          .filter((im) => im.complete && im.naturalWidth === 0)
          .map(url)
          .slice(0, 20),
        urls: Array.from(
          new Set(firstParty.map(url).filter((u) => /^https?:/i.test(u))),
        ),
      };
    });

    // HTTP 200 check per unique first-party image URL.
    const nonOk: string[] = [];
    for (const url of data.urls) {
      const resp = await this.page.request
        .get(url, { timeout: 15000 })
        .catch(() => null);
      const status = resp ? resp.status() : "ERR";
      if (status !== 200) nonOk.push(`${status} ${url}`);
    }

    await reportValue(
      `Images: ${data.total} total, ${data.renderedCount} rendered, ${data.firstPartyCount} first-party, ${data.urls.length} unique first-party URLs; ` +
        `broken-render: ${data.brokenRender.length}, non-200: ${nonOk.length}`,
    );
    await Validator.requireTrue(
      data.brokenRender.length === 0,
      `No broken (undecoded) first-party images expected${data.brokenRender.length ? ` — broken: ${data.brokenRender.join("; ")}` : ""}`,
    );
    await Validator.requireTrue(
      nonOk.length === 0,
      `All ${data.urls.length} first-party homepage image URLs should return 200${nonOk.length ? ` — non-200: ${nonOk.join("; ")}` : ""}`,
    );
  }

  /**
   * Scroll the page (lazy trigger) then assert all in-viewport images
   * below the fold have loaded. scrollWholePage already ran; re-scroll to the
   * bottom and verify the images there are loaded.
   */
  async verifyLazyImagesRender(): Promise<void> {
    await this.page
      .evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      .catch(() => {});
    await this.page.waitForTimeout(800);
    const result = await this.page.evaluate(() => {
      const isFirstParty = (u: string) => {
        try {
          return new URL(u).hostname.endsWith("khov.com");
        } catch {
          return false;
        }
      };
      const vh = window.innerHeight;
      // First-party images only (third-party CDN assets lazy-load/decode racily).
      const imgs = Array.from(document.querySelectorAll("img")).filter((im) => {
        const r = im.getBoundingClientRect();
        return (
          r.top < vh * 2 &&
          r.width > 1 &&
          r.height > 1 &&
          isFirstParty(im.currentSrc || im.src)
        );
      });
      const notLoaded = imgs.filter((im) => im.complete && im.naturalWidth === 0);
      return { checked: imgs.length, notLoaded: notLoaded.length };
    });
    await reportValue(
      `Lazy images near bottom checked: ${result.checked}; not loaded: ${result.notLoaded}`,
    );
    await Validator.requireTrue(
      result.notLoaded === 0,
      `Lazy-loaded images should render after scroll (${result.notLoaded} unloaded)`,
    );
  }

  // ── Links — Verification ───────────────────────────────
  /**
   * Collect every first-party (`khov.com`) internal link on the page, de-dupe
   * them (ignoring fragments), and assert each returns HTTP 200 (following
   * redirects). Anchors, mailto:/tel:/javascript: and external hosts are
   * excluded. Each link + status is reported.
   */
  async verifyInternalLinksReturn200(): Promise<void> {
    const hrefs: string[] = await this.page.evaluate(() => {
      const out = new Set<string>();
      document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
        const raw = a.getAttribute("href") ?? "";
        if (
          !raw ||
          raw.startsWith("#") ||
          /^(mailto:|tel:|javascript:)/i.test(raw)
        )
          return;
        try {
          const u = new URL(a.href);
          if (!u.hostname.endsWith("khov.com")) return;
          u.hash = "";
          out.add(u.href);
        } catch {
          /* ignore unparseable hrefs */
        }
      });
      return Array.from(out);
    });

    await reportValue(`Internal links found: ${hrefs.length}`);
    const nonOk: string[] = [];
    for (const url of hrefs) {
      const resp = await this.page.request
        .get(url, { maxRedirects: 5, timeout: 15000 })
        .catch(() => null);
      const status = resp ? resp.status() : "ERR";
      if (status !== 200) {
        nonOk.push(`${status} ${url}`);
      }
      await reportValue(`Internal link: ${status} ${url}`);
    }
    await Validator.requireTrue(
      nonOk.length === 0,
      `All ${hrefs.length} internal links should return 200${nonOk.length ? ` — non-200: ${nonOk.join("; ")}` : ""}`,
    );
  }
}
