# khov.com — Automation Progress

_Last updated: 2026-06-03_

Tracks delivered work, current status per epic, and key decisions. See
[`test-plan.md`](./test-plan.md) for the full backlog and test-case IDs.

---

## ✅ Delivered

| Item | Files | Verified |
|------|-------|----------|
| Framework helpers | `page-objects/basePage.ts` (`typeSequentially`, `clickViaScript`), `utils/apiUtils.ts` (`waitForApi` timeout), `environment/.env.prod`, `utils/test_data.json` | 2026-06-03 |
| **Search bar → market results** (SB-02) | `page-objects/homePage.ts`, `tests/homePage.spec.ts` (TC-01: Texas → Dallas) | ✅ prod, 3 runs stable (~12s) |
| **Search bar → region page** + **Region → community detail** (SB-01, RG-01, RG-02) | `page-objects/regionPage.ts`, `page-objects/communityDetailPage.ts`, `tests/regionPage.spec.ts` (TC-01) | ✅ prod, stable (~17–27s, 60s timeout) |
| **Search bar → community page** (SB-03) | `tests/homePage.spec.ts` (TC-02, "River Ranch Trails"); reuses `HomePage` + `CommunityPage` POMs | ✅ prod, stable (~15s) |
| **Community page header** (CP-01, CP-02) | `page-objects/communityPage.ts`, `tests/communityPage.spec.ts` (Listing Header TC-01 name/price/location, TC-02 onsite sales team + hours) | ✅ prod |
| **Community floorplan/home cards** (CP-10, CP-12, CP-13, CP-14) | `communityPage.spec.ts` Floorplan & Home Cards (cards, images, carousel, CTA→detail) | ✅ prod |
| **Community QMI section** (CP-20, CP-21, CP-22, CP-23) | `communityPage.spec.ts` Quick Move-In Homes (availability, promo rate, was/now, card→QMI detail) | ✅ prod, full suite 13/13 stable |
| Rename `communityDetailPage` → `communityPage` | `communityPage.ts`; updated `homePage`/`regionPage` specs (`verifyCommunityPageDisplayed`) | ✅ |
| Rename `stateSearchPage` → `regionPage` | `regionPage.ts` / `regionPage.spec.ts`; `state_search` → `region` keys in `constants.json` / `test_data.json` | ✅ re-run passing |
| Code review (pre-commit) | All POM/spec/util files | ✅ passed (1 caveat — see Decisions) |

**Not yet committed** — work is in the main working tree; Stage 7 (git push) pending.

---

## Status matrix

| Epic | Area | Status | Notes |
|------|------|--------|-------|
| E0 | Framework / helpers | ✅ Done | `typeSequentially`, `clickViaScript`, `waitForApi` timeout |
| E1 | Search bar | 🟡 Partial | SB-01, SB-02, SB-03 done; SB-04 (suggestion grouping) / SB-05 (no-match) pending |
| E2 | Region page | 🟡 Partial | RG-01, RG-02 done; maps/filters/sort (RG-03…RG-11) pending |
| E3 | Community page | 🟡 Nearly done | Header (CP-01/02) ✅; floorplan/home cards + images + carousel (CP-10/12/13/14) ✅; QMI section (CP-20–23) ✅. Remaining: CP-03 (consultant modal — need a community that has it); CP-11 (calculator modal → moved to E5) |
| E4 | QMI details page | ⬜ Not started | Gallery, pricing, IFP, sticker, CTAs |
| E5 | Floorplan details page | ⬜ Not started | Gallery, pricing, IFP, CTAs |
| E6 | Contact form (site-wide) | ⬜ Not started | Shared component, `@form` tests |

---

## Test inventory (current)

| Spec | Test | Tag | Page(s) exercised |
|------|------|-----|-------------------|
| `tests/homePage.spec.ts` | TC-01 — search 'Texas' → select 'Dallas' → Dallas homes page | @smoke | Home / search bar → market results |
| `tests/homePage.spec.ts` | TC-02 — search 'River Ranch Trails' → select community → community page | @smoke | Home / search bar → community page |
| `tests/regionPage.spec.ts` | TC-01 — search 'Texas' → select 'Texas' → first community → detail | @regression | Home → region page → community detail |
| `tests/communityPage.spec.ts` | Listing Header TC-01/02 — loads (name/price/location); sales team + hours | @smoke / @regression | Community page header |
| `tests/communityPage.spec.ts` | Floorplan & Home Cards TC-01–04 — cards render; images; carousel; "View Home Details" → detail | @smoke / @regression | Community floorplan/home cards |
| `tests/communityPage.spec.ts` | Quick Move-In Homes TC-01–04 — availability; promo rate; was/now; card → QMI detail | @smoke / @regression | Community QMI section |

All community-page tests are pinned to **River Ranch Trails** (navigated directly).
POMs: `basePage`, `homePage`, `regionPage`, `communityPage`.

---

## Next up

1. **CP-03** — find a community with a sales-consultant modal, then add the test pinned to it.
2. **Verification enrichment** — the user will provide the detailed verifications to layer onto the community-page baseline tests.
3. **E4 / E5** — QMI & floorplan details pages (reached from E3). Includes CP-11 (calculator modal) which lives on the detail pages.

---

## Decisions & log

- **2026-06-03** — Scope for the first two tests was Stages 1→6 (no worktree, no commit); ran against **prod** (`https://www.khov.com`).
- **2026-06-03** — Search input is a react-aria `searchbox` (aria-label "Search input"; dynamic `id`). The "Search by market, city, state, community" text is a label, not the placeholder attribute. Suggestions need real keystrokes + survive a React hydration reset (retry logic in `searchAndSelectSuggestion`).
- **2026-06-03** — Region community cards navigate via a zero-size "stretched link" anchor whose overlay paints behind content; click handled by `clickViaScript` (programmatic DOM click).
- **2026-06-03** — Region-page community assertions are kept **robust** (URL pattern + heading naming the clicked community) so they don't break when the "Featured" ordering changes.
- **2026-06-03** — Renamed `stateSearchPage` → `regionPage` to match the "Region page" terminology in the coverage plan.
- **2026-06-05** — Fixed carousel image over-count + logging: count is now the **slide count** (`li[class*='Carousel_slide']`) — matches the site (Clyde II 3 elevation / 4 gallery, Passionflower 3 / 6); previously aggregating `img.currentSrc` across nav steps inflated it (placeholder→real swaps + callout). Collect **one image URL per slide** (skip the no-image "View Gallery" callout) and **log every URL + HTTP status**. Hardened `getHomeCardCount` to poll until > 0 (was logging a racy `0`).
- **2026-06-05** — Floorplan carousels (CP-13 full): for all 8 floorplans, both carousels (elevation + gallery = the two `[class*='Multiple_carousel']` per `FloorPlan_floor-plan` block) — verify arrow states (next active/prev inactive initially → both active after a tap → next inactive/prev active at last image; state is the `disabled` attr, inactive arrow is opacity:0 so visibility can't be used) and that every slide image URL returns 200 (`page.request.get`). Folded into the merged Floorplan Section test (600s timeout; ~1.4 min). Hardened shared `BasePage.scrollIntoView` to retry/swallow lazy-render "element not attached" detaches (best-effort; assertions still auto-wait) — fixed an intermittent early-step failure. Full suite 9/9. (Note: the separate `StaticFloorPlan` 2D plan image is not part of these two carousels.)
- **2026-06-05** — Merged all floorplan-section tests into ONE: `communityPage.spec.ts` → "Community Page — Floorplan Section" TC-01 covers cards (render/images/carousel), every floorplan's meta data, the mortgage calculator (open/validate/recalculate/close), and the "View Home Details" → detail navigation (run last, since it leaves the page). Replaces the separate Floorplan & Home Cards / Mortgage Calculator / Meta Data blocks. 120s timeout; full suite 9/9.
- **2026-06-05** — CP-15 floorplan meta-data test added (`communityPage.spec.ts` "Floorplan Meta Data"): iterates all 8 floorplans and asserts each shows complete, non-empty/non-zero meta data — Sq ft, Story, Beds, Baths (decimal allowed), Cars, Estimated payment, Mortgage-calc info, Starting price, lot-premium disclaimer. Values parsed from each block (lazy-render → scroll each into view) and logged. Full suite 14/14.
- **2026-06-05** — CP-11 mortgage calculator added (`communityPage.spec.ts` "Floorplan Mortgage Calculator"). It IS reachable from the community page: a floorplan's "Estimated payment" info icon (`TitleBlock_popover-trigger`) → popover "Mortgage Calculator" CTA → modal. Test: open a **random** floorplan's calculator, assert all fields populated + top estimated payment, then edit Down Payment %/Interest Rate/Price + 15-yr toggle and assert the top price **recalculates in the expected direction** (capture-before → edit → blur), then close. Open mechanism: the floorplan blocks lazy-render (trigger detaches on scroll) and the popover is hover/tap-only → retry `scrollIntoViewIfNeeded` + `click` until the CTA appears. Added `Validator.requireTrue` (boxed) for the direction assertions. CP-11 reclassified from "deferred to E5" → ✅.
- **2026-06-05** — Clean report steps: set `allure-playwright` `detail: false` in `playwright.config.ts`. Playwright auto-instruments every locator action/expect as a step (locator code + file:line + snippet); `detail: false` makes Allure keep only named `test.step()` verifications (+ attachments), dropping all `pw:api`/`expect` steps. Verified: Allure now records only the human messages. Note: the **Playwright HTML report** has no such toggle and stays verbose — use the **Allure** report for clean client-facing steps.
- **2026-06-05** — Dismiss the cookie consent banner ("By browsing… → OK", `button.accept_all`) on first navigation via `utils/cookieUtils.ts` (`dismissCookieBanner`), called from `navigateToHome`/`navigateToCommunity` (best-effort). Community TC-01 now also **closes** the onsite sales team modal after verifying it (close = `[class*='Modal_dialog'] [class*='CircleIconButton']`; assert hidden). Hardened `openSalesTeamModal` to wait for the modal after clicking (not instant-poll) so it doesn't re-click into the open overlay.
- **2026-06-05** — Extended community-page TC-01 with two verifications: (a) sales-office hours non-empty — iterates schedule `<li>` rows asserting day + `<time>` non-empty and logs each `day: time`; (b) "Your Onsite Sales Team" modal — opens it and asserts every section (Our Onsite Team, phone, address, hours, consultant name(s), consultant photo(s)) is present & non-empty, logging the values (added `Validator.requireNotEmpty`). Modal open uses a hydration-safe click retry (it's a JS-only link). Capped `waitForLoadState("load")` to 15s in `navigateToHome`/`navigateToCommunity` (catch) — the heavy home/community pages can otherwise hang the `beforeEach` past the test timeout.
- **2026-06-04** — Completed the community-page baseline coverage (10 tests): added floorplan card images (CP-12), image carousel displayed (CP-13), and the QMI section — availability (CP-20), promo rate (CP-21), was/now pricing (CP-22), QMI card → detail (CP-23). Pinned the whole community spec to **River Ranch Trails via direct navigation** (deterministic for conditional features; the search-bar route is covered by SB-03). Card-image locator uses `:visible` to skip lazy/hidden carousel slides. `navigateToCommunity` waits for `load` so link clicks don't race hydration. CP-11 (calculator modal) reclassified to **E5** (community page only shows a tooltip). CP-03 (consultant modal) still needs a community that has one.
- **2026-06-04** — CP-14 ("View Home Details" → detail page) made reliable: assert only the detail URL (one segment deeper) — the robust proof of navigation — and dropped the post-click `h1` content check, which raced the navigation and flaked in full-suite runs (both detail-page types do have an h1 on direct load; the issue was timing, not a missing element). Also added `waitForLoadState("load")` after the card click.
- **2026-06-04** — Client-friendly reporting: `Validator` now wraps every assertion in a boxed `test.step(message, …, { box: true })`, so Allure/HTML reports show plain-English steps (e.g. "Community name should be visible") instead of raw locator code (`getByRole(...).first()`) + `validator.ts` source lines.
- **2026-06-04** — Set `workers: 1` (serial). The suite drives one live site (khov.com); parallel spec files caused browser contention → timeouts and `0ms` worker crashes. Serial = 7/7 stable (~2 min). Also removed the `scrollIntoView` from `RegionPage.clickFirstCommunity` (region card list re-renders → "element not stable"); `clickViaScript` re-resolves the locator and needs no viewport.
- **2026-06-04** — E3 floorplan/home cards (CP-10/14) added (`communityPage.spec.ts` "Floorplan & Home Cards"). Community page intermixes floorplan + QMI homes under one `Card_specifications`/`Card_pricing` component with a shared "View Home Details" CTA; covered generically. Detail pages are 4 URL segments vs the community's 3 — used as the community-agnostic nav assertion. CP-11/12/13 (calculator modal, static images, carousel) deferred to E5 (the community-page mortgage figure is a tooltip; rich gallery lives on the detail page).
- **2026-06-04** — E3 header (CP-01/02) added (`communityPage.spec.ts`). Renamed `communityDetailPage` → `communityPage` (now the single Community-page POM; method `verifyCommunityDetailDisplayed` → `verifyCommunityPageDisplayed`). Community-page specs reach the page via the region listing + first-community click (framework rule: no hardcoded deep URL). CP-03 (sales-consultant modal) deferred — not present on River Ranch Trails.
- **2026-06-04** — Hardened timeouts for prod under parallel execution: added optional `timeout` to `Validator.requireUrlContains` (default 10s); community InfoBlock (location, sales team) checks use 20–25s (loads via follow-up request); multi-page specs use a 90s test timeout. Full suite now 5/5 stable across repeated runs. Root cause: `workers: undefined` runs spec files in parallel against one prod site, amplifying load.
- **2026-06-04** — SB-03 added (`homePage.spec.ts` TC-02): searching a community name surfaces it as a suggestion link; selecting it navigates straight to the community page (`/texas/dayton/river-ranch-trails/`). Reused existing `searchAndSelectSuggestion` + `CommunityDetailPage` — no new POM. Note: pinned to "River Ranch Trails" (currently featured) — will break if that community is removed; swap the term in `test_data.community_search` if so.
- **2026-06-03** — `playwright.config.ts` now sources `baseURL` **only** from `process.env.BASE_URL` (the `.env.{TEST_ENV}` file); removed the hardcoded `https://www.khov.com/` fallback and added a fail-fast guard that throws if `BASE_URL` is unset. Consequence: every env needs its own `environment/.env.{env}` file — `test:dev`/`test:uat` now error clearly until `.env.dev`/`.env.uat` exist.
- **2026-06-03 — OPEN CAVEAT** — `playwright.config.ts` has an uncommitted change `headless: true → false` (not made as part of test work). Forcing headed mode would also affect CI. Recommend reverting before Stage 7. _Awaiting decision._
