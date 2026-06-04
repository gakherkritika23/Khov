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
| **Search bar → community page** (SB-03) | `tests/homePage.spec.ts` (TC-02, "River Ranch Trails"); reuses `HomePage` + `CommunityDetailPage` POMs | ✅ prod, stable (~15s) |
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
| E3 | Community page | ⬜ Not started | Listings, floorplan section, QMI section |
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

POMs: `basePage`, `homePage`, `regionPage`, `communityDetailPage`.

---

## Next up

1. **E3** — Community page POM + spec (listing header: name/starting price/address/sales office hours/consultant modal; floorplan section; QMI section).
2. **E4 / E5** — QMI & floorplan details pages (reached from E3).
3. Resolve cross-cutting data questions (example communities with promo/was-now/hero-gallery-2.0/QMI sticker).

---

## Decisions & log

- **2026-06-03** — Scope for the first two tests was Stages 1→6 (no worktree, no commit); ran against **prod** (`https://www.khov.com`).
- **2026-06-03** — Search input is a react-aria `searchbox` (aria-label "Search input"; dynamic `id`). The "Search by market, city, state, community" text is a label, not the placeholder attribute. Suggestions need real keystrokes + survive a React hydration reset (retry logic in `searchAndSelectSuggestion`).
- **2026-06-03** — Region community cards navigate via a zero-size "stretched link" anchor whose overlay paints behind content; click handled by `clickViaScript` (programmatic DOM click).
- **2026-06-03** — Region-page community assertions are kept **robust** (URL pattern + heading naming the clicked community) so they don't break when the "Featured" ordering changes.
- **2026-06-03** — Renamed `stateSearchPage` → `regionPage` to match the "Region page" terminology in the coverage plan.
- **2026-06-04** — SB-03 added (`homePage.spec.ts` TC-02): searching a community name surfaces it as a suggestion link; selecting it navigates straight to the community page (`/texas/dayton/river-ranch-trails/`). Reused existing `searchAndSelectSuggestion` + `CommunityDetailPage` — no new POM. Note: pinned to "River Ranch Trails" (currently featured) — will break if that community is removed; swap the term in `test_data.community_search` if so.
- **2026-06-03** — `playwright.config.ts` now sources `baseURL` **only** from `process.env.BASE_URL` (the `.env.{TEST_ENV}` file); removed the hardcoded `https://www.khov.com/` fallback and added a fail-fast guard that throws if `BASE_URL` is unset. Consequence: every env needs its own `environment/.env.{env}` file — `test:dev`/`test:uat` now error clearly until `.env.dev`/`.env.uat` exist.
- **2026-06-03 — OPEN CAVEAT** — `playwright.config.ts` has an uncommitted change `headless: true → false` (not made as part of test work). Forcing headed mode would also affect CI. Recommend reverting before Stage 7. _Awaiting decision._
