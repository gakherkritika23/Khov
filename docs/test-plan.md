# khov.com — Test Automation Plan

_Last updated: 2026-06-03_

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
| E2 | Region page | `regionPage.ts` | `regionPage.spec.ts` | 🟡 |
| E3 | Community page | `communityPage.ts` | `communityPage.spec.ts` | 🟡 (header ✅) |
| E4 | QMI details page | `qmiDetailPage.ts` _(new)_ | `qmiDetailPage.spec.ts` _(new)_ | ⬜ |
| E5 | Floorplan details page | `floorplanDetailPage.ts` _(new)_ | `floorplanDetailPage.spec.ts` _(new)_ | ⬜ |
| E6 | Contact form (site-wide) | `contactForm.ts` _(new, shared)_ | `contactForm.spec.ts` _(new)_ | ⬜ |

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

## E2 — Region page 🟡

> "Maps: load behavior, zoom, pan, marker selection, scattered lots. Community
> Filters. Community Sort. Navigating to community page from a region page."

| ID | Test case | Tag | Status |
|----|-----------|-----|--------|
| RG-01 | Region page loads with "New Home Communities" section + results count | @smoke | ✅ (`regionPage.spec.ts` TC-01) |
| RG-02 | Click first community card → navigate to its community detail page | @regression | ✅ (`regionPage.spec.ts` TC-01) |
| RG-03 | Map loads (tiles render, markers present) | @smoke | ⬜ |
| RG-04 | Map zoom in/out controls | @regression | ⬜ |
| RG-05 | Map pan behavior | @regression | ⬜ |
| RG-06 | Marker selection highlights / scrolls to the matching community card | @regression | ⬜ |
| RG-07 | Scattered-lots rendering on the map | @regression | ⬜ |
| RG-08 | Community filters (Price Range, Bed & Baths, Home Availability, Home Type, Community Type) update results | @regression | ⬜ |
| RG-09 | "Reset All" clears filters | @regression | ⬜ |
| RG-10 | Community Sort ("Sort by: Featured" → other options) reorders results | @regression | ⬜ |
| RG-11 | Navigate to community via CTA (e.g. "Learn More") as well as the card | @regression | ⬜ |

**Notes / open questions:** map is a Google Maps embed (iframe) — confirm whether
zoom/pan can be asserted via DOM or only via control buttons. Filter URL params
to be captured during Stage 3.

---

## E3 — Community page ⬜

> "Community listings load correctly (Starting Price, address, Sales office Hours,
> sales consultant modals). Floorplan section. QMI section."

### Listing / header
| ID | Test case | Tag | Status |
|----|-----------|-----|--------|
| CP-01 | Community page loads (name heading, starting price, location) | @smoke | ✅ (`communityPage.spec.ts` TC-01) |
| CP-02 | Onsite sales team + sales office hours displayed | @regression | ✅ (`communityPage.spec.ts` TC-02) |
| CP-03 | Sales consultant modal opens / closes with expected content | @regression | ⬜ deferred — no distinct consultant modal on River Ranch Trails (only Call / Request a Tour / Self Tour / Contact Us). Needs a community that has one. |

### Floorplan section
> On the community page, floorplan and QMI homes share one `Card` component
> ("View Home Details" CTA), and there's no distinct "Floorplans" heading. CP-10/14
> are covered generically as **home/floorplan cards**. The mortgage figure on the
> community page is an info **tooltip** (not a calculator modal) — the real
> calculator modal lives on the detail pages, so **CP-11 moves to E5**.

| ID | Test case | Tag | Status |
|----|-----------|-----|--------|
| CP-10 | Floorplan/home cards render (name, specs, pricing) | @smoke | ✅ (`communityPage.spec.ts` Floorplan & Home Cards TC-01) |
| CP-12 | Floorplan/home card image(s) render | @regression | ✅ (Floorplan & Home Cards TC-02) |
| CP-13 | Image carousel is displayed | @regression | ✅ baseline (Floorplan & Home Cards TC-03); next/prev navigation TBD |
| CP-14 | Card CTA ("View Home Details") opens a floorplan/home detail page | @regression | ✅ (Floorplan & Home Cards TC-04) |
| CP-11 | Pricing / Mortgage calculator modal opens, computes, closes | @regression | ➡️ moved to **E5** — only a tooltip on the community page; real modal is on the detail page |

### QMI (Quick Move-In) section
| ID | Test case | Tag | Status |
|----|-----------|-----|--------|
| CP-20 | QMI section shows homes with availability ("Available Now") | @smoke | ✅ (`communityPage.spec.ts` Quick Move-In Homes TC-01) |
| CP-21 | Promo rate badge shown | @regression | ✅ (Quick Move-In Homes TC-02) |
| CP-22 | Was/now (discounted) pricing on QMI card | @regression | ✅ (Quick Move-In Homes TC-03) |
| CP-23 | Clickable QMI card / CTA → QMI details page | @regression | ✅ (Quick Move-In Homes TC-04) |

> The community spec is **pinned to River Ranch Trails** (navigated directly) so
> the conditional features (promo rate, was/now, QMI homes) are deterministic.

**Open data questions:** still need a community that reliably has a **sales
consultant modal** (CP-03).

---

## E4 — QMI details page ⬜

> "Media Gallery modal (hero gallery 2.0 section nav). Pricing — monthly
> payment/calculator; was/now. Availability date. IFP. QMI sticker breakdown. CTAs."

| ID | Test case | Tag |
|----|-----------|-----|
| QD-01 | QMI details page loads (address/heading, key facts) | @smoke |
| QD-02 | Media gallery modal opens and navigates between images | @regression |
| QD-03 | Hero Gallery 2.0 — jump to a specific section _(if in use)_ | @regression |
| QD-04 | Pricing: monthly payment + calculator modal | @regression |
| QD-05 | Was/Now pricing displayed _(if applicable)_ | @regression |
| QD-06 | Availability date shown | @regression |
| QD-07 | Interactive Floor Plan (IFP) loads / is interactive | @regression |
| QD-08 | QMI sticker breakdown _(if applicable)_ | @regression |
| QD-09 | CTAs (Request Info, Schedule a Tour, etc.) present / functional | @regression |

---

## E5 — Floorplan details page ⬜

> "Media Gallery modal. Pricing — monthly payment/calculator; Starting Price.
> IFP. CTAs."

| ID | Test case | Tag |
|----|-----------|-----|
| FD-01 | Floorplan details page loads (name heading, starting price) | @smoke |
| FD-02 | Media gallery modal opens and navigates | @regression |
| FD-03 | Pricing: monthly payment + calculator modal | @regression |
| FD-04 | Starting price displayed | @regression |
| FD-05 | Interactive Floor Plan (IFP) loads / is interactive | @regression |
| FD-06 | CTAs present / functional | @regression |

---

## E6 — Contact form (site-wide) ⬜

> "Contact form submissions across the site."

Likely a shared component appearing on multiple page types → a shared
`ContactForm` POM consumed by the relevant page specs (or one dedicated spec
that exercises each surface).

| ID | Test case | Tag |
|----|-----------|-----|
| CF-01 | Form renders with all fields on a community page | @smoke @form |
| CF-02 | Required-field validation messages | @regression @form |
| CF-03 | Successful submit → success modal/state (assert via `waitForApi`, not timeouts) | @regression @form |
| CF-04 | Invalid email / phone formats rejected | @regression @form |
| CF-05 | Form present + submittable on each surface (QMI details, floorplan details, etc.) | @regression @form |

**Notes:** use synthetic/non-PII test data in `test_data.json`. Capture the
submit endpoint during Stage 3 for `verifyNetworkRequest()`. Tag form tests
`@form` (per framework convention) before `@smoke`/`@regression`.

---

## Suggested build order

1. **E1 SB-03** — search bar → community page (small, builds on existing HomePage). 
2. **E3 Community page** — unlocks the most downstream pages (floorplan & QMI links originate here).
3. **E4 / E5** — QMI & floorplan details (reached from E3).
4. **E6 Contact form** — shared component, exercised across E3/E4/E5 surfaces.
5. **E2 RG-03…RG-11** — maps/filters/sort (heaviest; map interactions need spike).

Rationale: navigation flows naturally Home → Region → Community → (Floorplan |
QMI) → details. Building the community page early gives the entry points for the
detail-page epics and the contact form.

---

## Cross-cutting open questions

- A stable set of **example communities/QMIs/floorplans** that exhibit the
  conditional features (promo rate, was/now, hero gallery 2.0, QMI sticker, IFP).
- Whether map **zoom/pan** is assertable via DOM or only via control clicks.
- Contact form **submit endpoint(s)** and whether prod submissions are safe to
  fire (may need a non-prod env or a test-mode flag).
- Which environment(s) to certify against (currently prod; no real `.env.dev/uat`).
