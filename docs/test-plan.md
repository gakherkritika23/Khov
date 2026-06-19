# khov.com — Test Automation Plan

_Last updated: 2026-06-08_

This is the master backlog for automating khov.com end-to-end coverage. Each
epic below maps to one Page Object (`page-objects/*.ts`) and one spec
(`tests/*.spec.ts`), and lists candidate test cases with a proposed tag.

Status legend: ✅ Done · 🟡 Partial / in progress · ⬜ Not started

> Many items are conditional ("if applicable" — promo rate, was/now pricing,
> hero gallery 2.0, QMI sticker, etc.). Those require seeding a known community /
> QMI / floorplan that exhibits the feature. **Open data questions** are tracked
> per epic and in `progress.md`.

---

## Target pages & file map

| Epic | Page | POM (`page-objects/`) | Spec (`tests/`) | Status |
|------|------|-----------------------|-----------------|--------|
| E0 | Framework / shared helpers | `basePage.ts` | — | ✅ |
| E1 | Search bar | `homePage.ts` | `homePage.spec.ts` | 🟡 (core ✅; SB-04/05 pending) |
| E2 | Region page | `regionPage.ts` | `regionPage.spec.ts` | ✅ (RG-01..06, RG-08..11; RG-07 deferred — data limitation) |
| E3 | Community page | `communityPage.ts` | `communityPage.spec.ts` | ✅ (header, floorplan, QMI) |
| E4 | QMI details page | `qmiPage.ts` | `qmiPage.spec.ts` | 🟡 (QD-01/02/03/04/06/07/09/10/11 ✅; QD-05/08 deferred) |
| E5 | Floorplan details page | `planDetailPage.ts` | `planDetailPage.spec.ts` | ✅ (FD-01..FD-09; Request Info lives in `contactForms.spec.ts`) |
| E6 | Contact forms (site-wide) | `contactUsPage.ts` + `requestInformationForm.ts` _(shared)_ | `contactForms.spec.ts` | ✅ |

The thin navigation-verification POM was **renamed `communityDetailPage.ts` →
`communityPage.ts`** and extended for E3 (it's the single Community-page POM,
also reused by `homePage`/`regionPage` specs for the post-navigation check).

---

## E0 — Framework & shared helpers ✅

Done as part of the first two specs:

- `BasePage.typeSequentially()` — real-keystroke typing for react-aria autocomplete
  inputs (`fill()` does not trigger the suggestion handler).
- `BasePage.clickViaScript()` — programmatic DOM click for zero-size "stretched
  link" overlay anchors (community cards).
- `waitForApi(page, endpoint, timeout?)` — optional timeout for bounded waits.
- `environment/.env.prod`, `utils/test_data.json` created.

---

## E1 — Search bar 🟡

> "Navigate to a community page from the Search bar (search for a region, community)."

| ID | Test case | Tag | Status |
|----|-----------|-----|--------|
| SB-01 | Search a state/region term → select region suggestion → land on region page | @smoke | ✅ (`regionPage.spec.ts` TC-01 covers the region-suggestion path) |
| SB-02 | Search a market/city term → select suggestion → land on results page | @smoke | ✅ (`homePage.spec.ts` TC-01 — Texas → Dallas) |
| SB-03 | Search a **community name** → select community suggestion → land directly on that **community page** | @smoke | ✅ (`homePage.spec.ts` TC-02 — "River Ranch Trails") |
| SB-04 | Suggestion list groups/renders for partial input (markets, counties, communities) | @regression | ⬜ |
| SB-05 | Empty / no-match query shows appropriate state | @regression | ⬜ |

**Notes:** Suggestions are fetched via `POST /api/search` and only render on real
keystrokes after React hydration (handled by `searchAndSelectSuggestion`).

---

## E2 — Region page ✅

> "Maps: load behavior, zoom, pan, marker selection, scattered lots. Community
> Filters. Community Sort. Navigating to community page from a region page."

> The map is the Google Maps **JS API rendered into the page DOM** (NOT a
> cross-origin iframe), so its markers, zoom controls and marker→card linkage are
> all assertable. The page renders one map + one results rail **per breakpoint**
> (desktop + mobile), so map/rail/filter locators are scoped with `:visible`.
> The results rail is driven by **POST `/api/search/`** (the same endpoint as the
> hero search), so filter/sort applies wait on it.

| ID | Test case | Tag | Status |
|----|-----------|-----|--------|
| RG-01 | Region page loads with "New Home Communities" section + results count | @smoke | ✅ (`regionPage.spec.ts` "Community Results" TC-01) |
| RG-02 | Click first community card → navigate to its community detail page | @regression | ✅ (`regionPage.spec.ts` "Community Results" TC-01) |
| RG-03 | Map loads (markers present) | @smoke | ✅ (`regionPage.spec.ts` "Map" TC-01 — Google Maps `gmp-advanced-marker` pins) |
| RG-04 | Map zoom in/out controls | @regression | ✅ (`regionPage.spec.ts` "Map" TC-02 — "Zoom in"/"Zoom out" change the tile-layer transform + fetch tiles) |
| RG-05 | Map pan behavior | @regression | ✅ (`regionPage.spec.ts` "Map" TC-03 — a drag-pan fetches fresh map tiles for the new viewport). The map is draggable (open-hand cursor); it renders **below the fold**, so it's scrolled into the viewport before the raw mouse-drag (Playwright's auto-scrolling `click()` masks this; `mouse.move` uses absolute coords and won't reach an off-screen map). Verified by the tile-fetch signal (~35 tiles), with a small retry for map-settle timing. |
| RG-06 | Marker selection highlights the matching community card | @regression | ✅ (`regionPage.spec.ts` "Map" TC-04 — clicking a community pin adds `rail_selected` to the matching rail card; pinned to a **city** view so pins aren't clustered into "N cities" pills) |
| RG-07 | Scattered-lots rendering on the map | @regression | ⬜ deferred — **data limitation, confirmed by an exhaustive prod sweep of all 13 states** (AZ, CA, DE, FL, GA, MD, NJ, OH, PA, SC, TX, VA, WV): no state surfaces scattered lots — map markers are only `community:<id>` pins (+ "N cities" cluster pills; even well-populated FL/OH/SC/NJ showed no other type), and "scatter"/"scattered" appears in **no** rendered DOM, `__NEXT_DATA__`, or network JSON anywhere. The `/api/search` model is Market/County/City/Community pages only, and the live filter set is Price + Bed & Baths only (no Home/Community-Type filter). Blocked on data/feature existence, not framework capability (like QD-05/QD-08). Re-evaluate if/when a scattered-lot product is launched; needs product/content to name a market if one exists outside the public site. |
| RG-08 | Community filters (Price Range …) update results | @regression | ✅ (`regionPage.spec.ts` "Filters & Sort" TC-01 — a max-price filter reduces the "N results" count). **Note:** the live filter set (dev + prod) is currently only **Price Range** + **Bed & Baths** — the broader "Home Availability / Home Type / Community Type" filters in the original requirement are not present in the UI today. |
| RG-09 | "Clear all" clears filters | @regression | ✅ (`regionPage.spec.ts` "Filters & Sort" TC-01 — "Clear all" restores the result count; the in-dialog control is "Clear all", not "Reset All") |
| RG-10 | Community Sort ("Sort by: Featured" → other options) reorders results | @regression | ✅ (`regionPage.spec.ts` "Filters & Sort" TC-02 — "Price - Low to High" changes the first card) |
| RG-11 | Navigate to community via CTA ("Learn More") as well as the card | @regression | ✅ (`regionPage.spec.ts` "Filters & Sort" TC-03 — the card's visible "Learn More" link) |

**Notes:** RG-08/RG-09 are covered by one test (filter reduces → "Clear all"
restores). Result-count reads poll until the streaming "N results" settles.
Markers are Google `gmp-advanced-marker`s; individual community pins carry
`data-marker-id="community:<id>"` and only appear at a **city** view (state views
cluster them), so the Map block is pinned to the Dallas city results.

---

## E3 — Community page ✅

> "Community listings load correctly (Starting Price, address, Sales office Hours,
> sales consultant modals). Floorplan section. QMI section."

### Listing / header
| ID | Test case | Tag | Status |
|----|-----------|-----|--------|
| CP-01 | Community page loads (name heading, starting price, location) | @smoke | ✅ (`communityPage.spec.ts` TC-01) |
| CP-02 | Onsite sales team + sales office hours displayed | @regression | ✅ (`communityPage.spec.ts` TC-02) |
| CP-03 | Sales consultant modal opens / closes with expected content | @regression | ✅ (`communityPage.spec.ts` Listing Header TC-01) — the "Your Onsite Sales Team" → "Our Onsite Team" modal is the sales-consultant modal for this community; validated (heading, phone, address, hours, ≥1 consultant name + photo) and closed. River Ranch Trails has no separate per-consultant detail modal. |

### Floorplan section
> On the community page, floorplan and QMI homes share one `Card` component
> ("View Home Details" CTA). CP-10/14 are covered generically as **home/floorplan
> cards**. Each floorplan's "Estimated payment" info icon opens a popover whose
> **"Mortgage Calculator"** CTA opens the full calculator modal (CP-11).

> All floorplan-section checks below are covered by a **single** test:
> `communityPage.spec.ts` → **"Community Page — Floorplan Section" TC-01** `@regression`.

| ID | Test case | Status |
|----|-----------|--------|
| CP-10 | Floorplan/home cards render (name, specs, pricing) | ✅ |
| CP-11 | Mortgage calculator modal opens, fields populated, recalculates, closes | ✅ |
| CP-12 | Floorplan/home card image(s) render | ✅ |
| CP-13 | Image carousels (elevation + gallery, every floorplan): arrow states (next/prev active/inactive) + all image URLs return 200 | ✅ |
| CP-14 | Card CTA ("View Home Details") opens a floorplan/home detail page | ✅ |
| CP-15 | Every floorplan shows complete meta data (sq ft, story, beds, baths, cars, est. payment, starting price, disclaimer) — none empty/0 | ✅ |

### QMI (Quick Move-In) section
> All QMI checks below are covered by a **single** consolidated test:
> `communityPage.spec.ts` → **"Quick Move-In Homes" TC-01** `@regression` (cards,
> images, meta data, promo rate, mortgage calculator, detail nav).

| ID | Test case | Status |
|----|-----------|--------|
| CP-20 | QMI section shows homes with availability ("Available Now") | ✅ |
| CP-21 | Promo rate badge shown (per card, where present) | ✅ |
| CP-22 | Was/now (discounted) pricing on QMI card | ✅ |
| CP-23 | Clickable QMI card / CTA → QMI details page | ✅ |
| CP-24 | Every QMI card's single static image renders + returns 200 | ✅ |
| CP-25 | Every QMI card shows complete meta data (sq ft, story, beds, baths, cars, est. payment, current total price) — none empty/0 | ✅ |
| CP-26 | Mortgage calculator (random QMI card) opens, fields populated, recalculates, closes | ✅ |

> The community spec is **pinned to River Ranch Trails** (navigated directly) so
> the conditional features (promo rate, was/now, QMI homes) are deterministic.

**Open data questions:** none outstanding for the community page — CP-03 is
covered by the Onsite Sales Team modal (River Ranch Trails has no separate
per-consultant detail modal).

---

## E4 — QMI details page 🟡

> "Media Gallery modal (hero gallery 2.0 section nav). Pricing — monthly
> payment/calculator; was/now. Availability date. IFP. QMI sticker breakdown. CTAs."

> The QMI spec is **pinned to a deterministic QMI home** at River Ranch Trails
> (Passionflower II, 526 Samuel Ridge Dr — `constants.qmi.detail_url`) so the
> gallery / pricing / IFP / CTA checks are stable. Hero gallery 2.0 is confirmed
> in use (`GalleryTwoModal` with section nav). The "calculator" on this page is a
> mortgage-info **popover** (loan terms), not a full calculator modal — QD-04
> verifies the monthly payment + that popover.

| ID | Test case | Tag | Status |
|----|-----------|-----|--------|
| QD-01 | QMI details page loads (address/heading, key facts) | @smoke | ✅ (`qmiPage.spec.ts` Overview TC-01) |
| QD-02 | Media gallery modal opens and navigates between images | @regression | ✅ (Media Gallery TC-01) |
| QD-03 | Hero Gallery 2.0 — jump to a specific section _(if in use)_ | @regression | ✅ (Media Gallery TC-02) |
| QD-04 | Pricing: monthly payment + calculator modal | @regression | ✅ (Pricing TC-01/02 — payment + mortgage popover) |
| QD-05 | Was/Now pricing displayed _(if applicable)_ | @regression | ⬜ deferred — this QMI home shows only a current total price; needs a home with discounted was/now |
| QD-06 | Availability date shown | @regression | ✅ (Overview TC-02 — "Available Now") |
| QD-07 | Interactive Floor Plan (IFP) loads / is interactive | @regression | ✅ (Interactive Floor Plan TC-01) |
| QD-08 | QMI sticker breakdown _(if applicable)_ | @regression | ⬜ deferred — no itemized "window sticker" element present in the DOM for this home |
| QD-09 | CTAs (Request Info, Schedule a Tour, etc.) present / functional | @regression | ✅ (`qmiPage.spec.ts` Overview TC-01 — CTAs incl. Request a Tour / Request Information) |
| QD-10 | Request Information form rejects invalid values in required fields and blocks submission | @regression | ✅ (`contactForms.spec.ts` "QMI Details — Request Information Form" TC-01 — invalid email/phone → "Please correct the required field", no submit) |
| QD-11 | Request Information form submits successfully with valid values (UI thank-you + contact-us API success, payload matches input) | @regression | ✅ (`contactForms.spec.ts` "QMI Details — Request Information Form" TC-01 — submission **skipped on prod** to avoid real leads) |

---

## E5 — Floorplan details page 🟢

> "Media Gallery modal. Pricing — monthly payment/calculator; Starting Price.
> IFP. CTAs."

> The floorplan spec is **pinned to a deterministic floorplan** — Clyde II at
> River Ranch Trails (`constants.floorplan.detail_url`). Unlike a QMI home it
> shows a floorplan-level **Starting price** (not a fixed home price) and uses a
> plain media gallery (no hero-gallery-2.0 section nav / Interior-Exterior tabs).
> It otherwise reuses the same design-system components as the QMI page
> (`qmiPage.ts`): the mortgage-calculator popover, the `/floorplan/` IFP iframe,
> the ContentNavigation CTAs, and the identical Request Information form
> (same fields + contact-us API).

| ID | Test case | Tag | Status |
|----|-----------|-----|--------|
| FD-01 | Floorplan details page loads (name heading, starting price) | @smoke | ✅ (`planDetailPage.spec.ts` Overview TC-01) |
| FD-02 | Media gallery modal opens and navigates | @regression | ✅ (Media Gallery TC-01 — plain gallery; navigation verified by scroll-through image count) |
| FD-03 | Pricing: monthly payment + calculator modal | @regression | ✅ (Pricing TC-01/02 — payment displayed + mortgage calculator modal opens) |
| FD-04 | Starting price displayed | @regression | ✅ (Overview TC-02) |
| FD-05 | Interactive Floor Plan (IFP) loads / is interactive | @regression | ✅ (Interactive Floor Plan TC-01) |
| FD-06 | CTAs present / functional | @regression | ✅ (Overview TC-03 — Request a Tour / Request Information) |
| FD-07 | Request Information CTA opens modal with required fields | @regression | ✅ (`contactForms.spec.ts` "Floorplan Details — Request Information Form" TC-01) |
| FD-08 | Request Information form rejects invalid values in required fields and blocks submission | @regression | ✅ (`contactForms.spec.ts` "Floorplan Details — Request Information Form" TC-01 — invalid email/phone → "Please correct the required field", no submit) |
| FD-09 | Request Information form submits successfully with valid values (UI thank-you + contact-us API success, payload matches input) | @regression | ✅ (`contactForms.spec.ts` "Floorplan Details — Request Information Form" TC-01 — submission **skipped on prod** to avoid real leads) |

---

## E6 — Contact forms (site-wide) ✅

> "Contact form submissions across the site."

All contact-form surfaces live in one spec, **`tests/contactForms.spec.ts`**. Two
distinct form components are exercised:
- The **standalone Contact Us page** form (`page-objects/contactUsPage.ts`) — the 5
  "What are you interested in?" interest forms + the "Find your local information"
  region dropdown + the "Send us a text message" modal.
- The shared **"Request Information"** modal (`page-objects/requestInformationForm.ts`,
  `RequestInformationForm`) reused by the QMI / Floorplan / Community detail pages
  and the Region results card — each page object exposes a `requestInfo` instance
  and only owns its page-specific CTA + `openRequestInformationModal()`.

| ID | Test case | Tag | Status |
|----|-----------|-----|--------|
| CF-01 | Contact Us — 5 interest forms: fields exist + dropdown options logged | @form @smoke/@regression | ✅ (`Contact Us — Field & Dropdown Audit` TC-01..TC-05) |
| CF-02 | Contact Us — required-field validation ("Required field") per interest | @form @regression | ✅ (TC-01..TC-05) |
| CF-03 | Contact Us — invalid email/phone rejected ("Invalid format", `aria-invalid`) per interest | @form @regression | ✅ (TC-01..TC-05) |
| CF-04 | Contact Us — fill + submit (success + `/api/contact-us/` 200; **dev submits, prod fill-only**) | @form @regression | ✅ (TC-01..TC-05) |
| CF-05 | Contact Us — "Find your local information" "Select a State" dropdown lists all 13 regions **each exactly once (no duplicates)** | @form @regression | ✅ (`Local Information & Text Message` TC-01) — **fails on dev** (7 regions duplicated; surfaces the dev defect), passes prod |
| CF-06 | Contact Us — select random region → "Or Send Us a Text Message" → "Send us a text message" modal: fields, required + invalid validation, fill + submit (dev) / fill-only (prod) | @form @regression | ✅ (`Local Information & Text Message` TC-02 — best-effort skip if a region has no local-info results) |
| CF-07 | Request Information modal (shared) on **QMI** detail: fields, required + invalid validation, fill + submit + contact-us API (prod fill-only) | @form @regression | ✅ (`QMI Details — Request Information Form` TC-01) |
| CF-08 | Request Information modal (shared) on **Floorplan** detail | @form @regression | ✅ (`Floorplan Details — Request Information Form` TC-01) |
| CF-09 | Request Information modal (shared) on **Community** detail (header CTA) | @form @regression | ✅ (`Community Details — Request Information Form` TC-01) |
| CF-10 | Request Information modal (shared) from the **Region** results first-community card | @form @regression | ✅ (`Region Page — Request Information Form` TC-01 — single react-aria click; best-effort skip if the remote form fetch is throttled) |

**Notes:** synthetic/non-PII data (First "Test", Last "Automation", timestamped
`test.automation+<ts>@ex2india.com`, phone `7325551234`) inline in the POMs.
Submit endpoint is **`/api/contact-us/`** (asserted via `waitForApi`, status 200).
**Never submitted on prod** — `isProdEnv()` fills the form but skips the submit
click (no real lead); validation steps are client-side and run on every env. The
non-prod submit awaits the Cloudflare **Turnstile** token (the text-message modal
has its own token, so it polls the modal-scoped one). Tag order: `@form` before
`@smoke`/`@regression`. **Known dev defect:** the "Find your local information"
dropdown lists 7 regions twice on dev (CF-05 flags it).

---

## Suggested build order

1. **E1 SB-03** — search bar → community page (small, builds on existing HomePage). 
2. **E3 Community page** — unlocks the most downstream pages (floorplan & QMI links originate here).
3. **E4 / E5** — QMI & floorplan details (reached from E3).
4. ~~**E6 Contact form** — shared component, exercised across E3/E4/E5 surfaces.~~ ✅ done (`contactForms.spec.ts`).
5. ~~**E2 RG-03…RG-11** — maps/filters/sort (heaviest; map interactions need spike).~~ ✅ done (RG-05 pan via the tile-fetch signal; RG-07 scattered-lots deferred — confirmed data limitation).

Rationale: navigation flows naturally Home → Region → Community → (Floorplan |
QMI) → details. Building the community page early gives the entry points for the
detail-page epics and the contact form.

---

## Cross-cutting open questions

- A stable set of **example communities/QMIs/floorplans** that exhibit the
  conditional features (promo rate, was/now, hero gallery 2.0, QMI sticker, IFP).
- ~~Whether map **zoom/pan** is assertable via DOM or only via control clicks.~~
  **Resolved:** the map is the Google Maps JS API in the page DOM (not an iframe).
  Both zoom (controls) and pan (drag) are assertable via the map fetching fresh
  tiles. The only catch: the map renders below the fold, so a raw mouse-drag must
  scroll it into view first (Playwright's `click()` auto-scrolls, `mouse.move`
  does not). RG-04 and RG-05 are both full assertions.
- ~~Contact form **submit endpoint(s)** and whether prod submissions are safe to
  fire.~~ **Resolved:** endpoint is `/api/contact-us/`; prod is **never** submitted
  (fill-only via `isProdEnv()`), non-prod submit awaits the Cloudflare Turnstile token.
- Which environment(s) to certify against. Env files now exist for `dev`/`uat`/`stage`/`prod` (`environment/{env}.env`), pointing to `www-dev`/`www-uat`/`www-stg`/`www` respectively. Community-page specs are pinned to a **prod**-only community (River Ranch Trails).
