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
| **Community floorplan/home cards** (CP-10, CP-14) | `communityPage.ts` + `communityPage.spec.ts` (Floorplan & Home Cards TC-01 cards render, TC-02 "View Home Details" → detail page) | ✅ prod, full suite 7/7 stable (×2) |
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
| E3 | Community page | 🟡 Partial | Header (CP-01/02) ✅; floorplan/home cards (CP-10/14) ✅; CP-03 modal + CP-11/12/13 deferred; QMI section (CP-20–23) pending |
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
| `tests/communityPage.spec.ts` | Listing Header TC-01 — community page loads (name/price/location) | @smoke | Region → community page header |
| `tests/communityPage.spec.ts` | Listing Header TC-02 — onsite sales team + office hours displayed | @regression | Community page header |
| `tests/communityPage.spec.ts` | Floorplan & Home Cards TC-01 — cards render (specs + pricing) | @smoke | Community page floorplan/home cards |
| `tests/communityPage.spec.ts` | Floorplan & Home Cards TC-02 — "View Home Details" → detail page | @regression | Community → home/floorplan detail |

POMs: `basePage`, `homePage`, `regionPage`, `communityPage`.

---

## Next up

1. **E3 QMI section** (CP-20…CP-23) — QMI cards/availability, promo rate, was/now pricing, clickable card/CTA → QMI details. (The "12 Quick Move-in Homes Available" section + `Card_price-last` was/now pricing were observed during discovery.)
2. **E4 / E5** — QMI & floorplan details pages (reached from E3). Pick up the deferred CP-11/12/13 (calculator modal, gallery/carousel) on the detail pages.
3. **CP-03** — find a community with a sales-consultant modal (deferred).
4. Resolve cross-cutting data questions (example communities with promo/was-now/hero-gallery-2.0/QMI sticker).

---

## Decisions & log

- **2026-06-03** — Scope for the first two tests was Stages 1→6 (no worktree, no commit); ran against **prod** (`https://www.khov.com`).
- **2026-06-03** — Search input is a react-aria `searchbox` (aria-label "Search input"; dynamic `id`). The "Search by market, city, state, community" text is a label, not the placeholder attribute. Suggestions need real keystrokes + survive a React hydration reset (retry logic in `searchAndSelectSuggestion`).
- **2026-06-03** — Region community cards navigate via a zero-size "stretched link" anchor whose overlay paints behind content; click handled by `clickViaScript` (programmatic DOM click).
- **2026-06-03** — Region-page community assertions are kept **robust** (URL pattern + heading naming the clicked community) so they don't break when the "Featured" ordering changes.
- **2026-06-03** — Renamed `stateSearchPage` → `regionPage` to match the "Region page" terminology in the coverage plan.
- **2026-06-04** — Client-friendly reporting: `Validator` now wraps every assertion in a boxed `test.step(message, …, { box: true })`, so Allure/HTML reports show plain-English steps (e.g. "Community name should be visible") instead of raw locator code (`getByRole(...).first()`) + `validator.ts` source lines.
- **2026-06-04** — Set `workers: 1` (serial). The suite drives one live site (khov.com); parallel spec files caused browser contention → timeouts and `0ms` worker crashes. Serial = 7/7 stable (~2 min). Also removed the `scrollIntoView` from `RegionPage.clickFirstCommunity` (region card list re-renders → "element not stable"); `clickViaScript` re-resolves the locator and needs no viewport.
- **2026-06-04** — E3 floorplan/home cards (CP-10/14) added (`communityPage.spec.ts` "Floorplan & Home Cards"). Community page intermixes floorplan + QMI homes under one `Card_specifications`/`Card_pricing` component with a shared "View Home Details" CTA; covered generically. Detail pages are 4 URL segments vs the community's 3 — used as the community-agnostic nav assertion. CP-11/12/13 (calculator modal, static images, carousel) deferred to E5 (the community-page mortgage figure is a tooltip; rich gallery lives on the detail page).
- **2026-06-04** — E3 header (CP-01/02) added (`communityPage.spec.ts`). Renamed `communityDetailPage` → `communityPage` (now the single Community-page POM; method `verifyCommunityDetailDisplayed` → `verifyCommunityPageDisplayed`). Community-page specs reach the page via the region listing + first-community click (framework rule: no hardcoded deep URL). CP-03 (sales-consultant modal) deferred — not present on River Ranch Trails.
- **2026-06-04** — Hardened timeouts for prod under parallel execution: added optional `timeout` to `Validator.requireUrlContains` (default 10s); community InfoBlock (location, sales team) checks use 20–25s (loads via follow-up request); multi-page specs use a 90s test timeout. Full suite now 5/5 stable across repeated runs. Root cause: `workers: undefined` runs spec files in parallel against one prod site, amplifying load.
- **2026-06-04** — SB-03 added (`homePage.spec.ts` TC-02): searching a community name surfaces it as a suggestion link; selecting it navigates straight to the community page (`/texas/dayton/river-ranch-trails/`). Reused existing `searchAndSelectSuggestion` + `CommunityDetailPage` — no new POM. Note: pinned to "River Ranch Trails" (currently featured) — will break if that community is removed; swap the term in `test_data.community_search` if so.
- **2026-06-03** — `playwright.config.ts` now sources `baseURL` **only** from `process.env.BASE_URL` (the `.env.{TEST_ENV}` file); removed the hardcoded `https://www.khov.com/` fallback and added a fail-fast guard that throws if `BASE_URL` is unset. Consequence: every env needs its own `environment/.env.{env}` file — `test:dev`/`test:uat` now error clearly until `.env.dev`/`.env.uat` exist.
- **2026-06-03 — OPEN CAVEAT** — `playwright.config.ts` has an uncommitted change `headless: true → false` (not made as part of test work). Forcing headed mode would also affect CI. Recommend reverting before Stage 7. _Awaiting decision._
