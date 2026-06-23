# Region Page — Verification Coverage

_Last updated: 2026-06-16_

What the **region page** (the market-results / "New Home Communities" results page,
e.g. `/new-construction-homes/texas/`) automated tests verify today. Source files:
- Spec: `tests/regionPage.spec.ts` — three describe blocks: **Community Results**,
  **Map**, **Filters & Sort**.
- The region **"Request Information" form** lives in `tests/contactForms.spec.ts`
  ("Region Page — Request Information Form", CF-10) — see that block below.
- Page Objects: `page-objects/regionPage.ts` (region page); `page-objects/homePage.ts`
  (the hero-search entry point); `page-objects/communityPage.ts` (post-navigation
  community-detail check); `page-objects/requestInformationForm.ts` (shared form).
- Assertions: `utils/validator.ts` (`Validator`); value logging: `utils/reporter.ts`.

## How the page is reached
Every test reaches the page through the **hero search**, not a direct URL — a cold
direct navigation to a state/market URL loads an essentially empty page (the results
rail + map populate only via the search-driven flow). Entry goes through a robust
helper, `enterRegion()`, which **retries the whole navigation in-code** (the hero
search is React-hydration sensitive) and gates on a real ready signal —
`RegionPage.waitForRegionReady()` waits for the correct URL + the "New Home
Communities" heading **+ a rendered result card** (the rail actually populated, not
just the heading). This removes the per-test entry flakiness without test-level retries.

Entry goes through `enterRegion`, and the blocks are split to cover **both** the
state and city views:
- **Community Results**: `enterRegion` with **"Texas"** → the **state** region page
  `/new-construction-homes/texas/`. Covers SB-01 (state-suggestion → region page) +
  the state-level page. Light here (loads + one card click), so the larger state rail
  is fine.
- **Map** & **Filters & Sort**: `enterRegion` with **"Dallas"** → the **city** results
  `/new-construction-homes/texas/dallas-tx/`. Map needs individual markers (the state
  view clusters into "N cities" pills, RG-06 needs pins); Filters & Sort use the city
  view because the ~47-community state rail is heavy enough to stall the multi-step
  interactions on a degraded dev. Same rail component either way.

The cookie/consent banner is dismissed by `BasePage.navigate` / `handlePagePopups` /
`dismissCookieBanner` on first navigation (best-effort).

## The map is in-page (not an iframe)
The region map is the **Google Maps JS API rendered into the page DOM** (not a
cross-origin iframe), so its markers, zoom/pan controls, and the marker→card link
are all assertable. Two consequences shape the locators:
- The page renders **one map + one results rail per breakpoint** (desktop + mobile),
  so map / rail / filter locators are scoped with **`:visible`** (the first DOM match
  is often the hidden mobile variant).
- The results rail is driven by **`POST /api/search/`** (the same endpoint as the
  hero search), so filter/sort actions wait on it. The **"N results"** count streams
  in (e.g. 41 → 47), so count reads poll until the value settles.

## Environments & pacing
Verified on **dev** and **prod**. All region checks are read-only interactions (no
leads). The region Request-Information form (CF-10) is prod-safe: filled but **not
submitted** on prod. _Note: a degraded dev environment can intermittently time out
the Filters & Sort tests under long serial runs; they pass in isolation and on prod._

This spec overrides the framework's visual-demo pacing — it runs with
`launchOptions.slowMo: 0` (the global config uses `slowMo: 200`). The map tests
assert precise Google-Maps gestures (zoom/pan) and tile-fetch timing, which
mid-gesture pacing delays break; region tests are functional, not a visual demo,
so they run at full speed. The contact-forms specs keep the global pacing.

## Verification types
| Type | Helper | Meaning |
|------|--------|---------|
| **VISIBLE** | `Validator.requireVisible` | element rendered & visible (20–25s timeouts for prod) |
| **URL contains** | `Validator.requireUrlContains` | the page URL matches the expected pattern |
| **TRUE** | `Validator.requireTrue` | a computed condition holds (count > 0, result reduced/restored, order changed, names match) |
| **camera moved** | tile-fetch / transform | a map interaction changed the view — proven by a `maps.googleapis.com` tile fetch and/or the Google tile-layer CSS transform changing |
| **logged** | `reportValue` | value printed as a Test-body step (terminal + Allure) |

Every assertion runs inside a boxed `test.step(message)`, so report steps read as
plain English rather than locator code.

---

## Block 1 — Community Results  _(Texas state view)_

### TC-01 | Selecting the 'Texas' region then the first community opens its detail page  `@regression`
_(Texas state region page — covers SB-01 + the state-level page.)_
| # | Verification | How |
|---|--------------|-----|
| 1 | Reach the region page | `enterRegion` (search "Texas", await `/api/search`, select the "Texas" suggestion, retry-on-flake); URL contains `/new-construction-homes/texas/` |
| 2 | **"New Home Communities" section** shown | VISIBLE — section heading |
| 3 | **First community name** captured | Read from the first community card's `data-card-element`; **logged** |
| 4 | **First community card opens its detail page** | Click the card's zero-size "stretched link" via a DOM click (`clickViaScript`; the card list re-renders as the map loads); lands on a community detail URL (`new-construction-homes/texas/[^/]+/[^/]+`) with a level-1 heading naming that community; heading **logged** |

### TC-02 | Community results card metadata and images are valid  `@regression`
_(Texas state view — covers Items B + D)_
| # | Verification | How |
|---|--------------|-----|
| 1 | **Reported count = rendered cards** | Read "N results" (polled until stable) and count visible `[class*='Community_card']:visible` DOM elements — assert equal (D: count accuracy). The page loads all results in a single rail; no pagination / "Load more" present |
| 2 | **Per-card metadata (first 5 cards)** | For each of the first 5 visible cards: `data-card-element` name non-empty; `[class*='Community_details']` location+home-type non-empty; `[class*='Community_pricing']` starting-price non-empty. Beds/baths are not shown on rail cards. |
| 3 | **Per-card image HTTP 200 (first 5 cards)** | Read the `<picture> img` `src` for each of the first 5 cards; `page.request.get(url)` → assert status 200; URL + status **logged** |

> **Breadcrumbs**: not present on the region page (confirmed by spike across all breadcrumb selector patterns — none found). **Pagination**: not present — all results render in a single rail on load with no "Load more" button. Both are documented as N/A.

---

## Block 2 — Map  _(pinned to the Dallas city view)_

### TC-01 | Map loads with community markers  `@smoke`
| # | Verification | How |
|---|--------------|-----|
| 1 | Map renders | VISIBLE — `[class*='map_map-container']:visible` |
| 2 | **Markers present** | `gmp-advanced-marker` count > 0; count **logged** |

### TC-02 | Zoom in/out controls change the map view  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | Both zoom controls present | "Zoom in" and "Zoom out" buttons VISIBLE |
| 2 | **Zoom in** moves the camera | Click "Zoom in" → the view changes (fresh `maps.googleapis.com` tiles fetched and/or the tile-layer transform changes); transform-changed + tile count **logged** |
| 3 | **Zoom out** operates the control | Click "Zoom out" → confirm the map stays rendered with markers. A per-direction tile delta is best-effort here (zooming back to an already-visited level often serves cached tiles → 0 fetches), so it is **logged**, not asserted; zoom-in already proves the camera moves |
| 4 | **"Reset map" button visible and operable** | `button[class*='map_reset-map']` must be VISIBLE; click it → map stays rendered with markers (**logged** whether a tile/transform signal fired; after zoom-in → zoom-out the initial-view tiles are cached so 0 fetches is expected — same treatment as zoom-out) |

### TC-03 | Panning the map changes the view  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | Map present | (as TC-01) |
| 2 | **Drag-pan moves the camera** | The map renders **below the fold**, so it's first scrolled into the viewport (`scrollIntoView`) — a raw `mouse` drag uses absolute coordinates and, unlike Playwright's auto-scrolling `click()`, won't reach an off-screen map. Then drag between off-centre points (avoiding markers) → the map fetches fresh tiles for the new viewport (~35 requests). 3× retry for map-settle timing; tile count **logged** |

### TC-04 | Selecting a marker highlights the matching community card  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | **Marker selection** | Click the first **individual community** marker (`gmp-advanced-marker [data-marker-id^='community:']`); retry up to 3× (a click on a not-yet-settled map can be a no-op) |
| 2 | **Matching rail card highlighted** | A rail community card enters the **`rail_selected`** state (VISIBLE) |
| 3 | **It's the right card** | The highlighted card's `data-card-element` equals the clicked marker's community name; both **logged** (e.g. "Rolling Ridge → Rolling Ridge") |

> Keyboard/scroll-wheel panning are disabled on this map — **drag is the working
> input**, and that's what TC-03 uses.

---

## Block 3 — Filters & Sort  _(Dallas city view)_

### TC-01 | Price filter reduces the results and 'Clear all' restores them  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | **Baseline result count** | Read "N results" (`[class*='rail_results']`), polled until stable; **logged** |
| 2 | **Filter reduces results** | Open the **"Price Range"** filter (`[role='dialog'][aria-label='Price Range']`), set **Maximum = 300000**, click **"Apply filters"**, await `/api/search` → result count is lower than baseline; **logged** |
| 3 | **Per-result price validation** | Read every visible card's starting-price text (e.g. "Starting from the upper $200s") and parse it to a dollar ordinal; assert **every card's price ≤ $300,000** — not just the count; **logged** |
| 4 | **"Clear all" restores results** | Reopen the dialog, click **"Clear all"** + apply → result count returns (≥ baseline, and greater than the filtered count); **logged** |
| 5 | **Beds & Baths filter dialog interaction** | Open the **"Bed & Baths"** filter (`[role='dialog'][aria-label='Bed & Baths']`), select **Beds "3+"** (first occurrence — the dialog has Beds then Bathrooms, each with Any/1+/2+/…), apply → result count ≥ 1; **logged** with baseline context. _Note: bed/bath counts are not displayed on rail cards and the filter sets no URL params — per-result bed validation from the rail is not possible. A count that matches the baseline is correct behaviour when every community in the market offers ≥ the threshold (all Dallas communities offer ≥3 beds)._ |
| 6 | **Beds "Clear all" restores results** | Reopen the Bed & Baths dialog, clear, apply → result count ≥ baseline; **logged** |

### TC-02 | Sorting the communities reorders the results  `@regression`
Sort is **client-side** (no `/api/search` POST on sort operations). Sorting is verified by parsing each visible card's starting-price text into a comparable dollar ordinal and asserting the sequence is ordered. A small tolerance (1 per 8 results) is allowed for communities whose displayed teaser band does not match their actual sort rank.
| # | Verification | How |
|---|--------------|-----|
| 1 | **Baseline count** | Read "N results" count before any sort; **logged** |
| 2 | **Low → High sort** | Open sort listbox, choose **"Price - Low to High"** → parse all visible card prices → assert sequence is **non-decreasing**; inversion count **logged** (e.g. "0 out-of-order pair(s) of 13") |
| 3 | **High → Low sort** | Choose **"Price - High to Low"** → parse all visible card prices → assert sequence is **non-increasing**; inversion count **logged** |
| 4 | **Featured restores count** | Choose **"Featured"** → assert result count ≥ baseline (the sort chain must not lose communities); count **logged** |

### TC-03 | First community 'Learn More' CTA opens its detail page  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | First community name captured | From the card's `data-card-element`; **logged** |
| 2 | **"Learn More" opens the detail page** | DOM-click the card's **"Learn More"** link (`clickViaScript` — the card re-renders as the rail streams in, leaving the link attached-but-not-"visible", which hangs a normal click) → lands on that community's detail page (URL pattern + level-1 heading matches the name); heading **logged** |

---

## Region "Request Information" form  _(CF-10 — in `contactForms.spec.ts`)_
Reached from the Home page: search **"Dallas"** → select "Dallas" → the results
page → the **first community card's "Request Information" CTA** opens the **shared**
`RequestInformationForm` modal. Verifies fields, required-field validation, invalid
email/phone validation, then fill + submit (success + `/api/contact-us/` 200 on
non-prod; **fill-only on prod**). **Best-effort:** the card CTA is a react-aria
pressable opened with a **single** click (a second click resets the modal's loading
spinner), and the modal's form is fetched remotely behind Cloudflare bot-protection,
which can throttle under heavy automation — so when the form doesn't render the test
`test.skip`s rather than fails. The form's fields/validation are still covered on
every env by the in-page QMI / Floorplan / Community surfaces.

---

## Currently NOT asserted / deferred

| Area | Status |
|------|--------|
| **Scattered-lots map rendering (RG-07)** | ⬜ **Deferred — confirmed data limitation.** An exhaustive prod sweep of all 13 state markets (AZ, CA, DE, FL, GA, MD, NJ, OH, PA, SC, TX, VA, WV) found only `community:<id>` map pins (+ "N cities" cluster pills) — no scattered-lot marker type, and "scatter"/"scattered" appears in no rendered DOM, `__NEXT_DATA__`, or network JSON anywhere. There is nothing to assert until a scattered-lot product is launched. |
| **Filter coverage** | **Price Range** and **Bed & Baths** are both exercised (the only two filters present in the live UI today). Price: per-result price ≤ max validated on every card. Beds: dialog interaction + count ≥ 1 (beds not on rail cards → per-result bed validation from the rail is not possible; no URL params either). Multi-filter combinations not exercised. |
| **Sort coverage** | **"Price - Low to High"** (non-decreasing), **"Price - High to Low"** (non-increasing), and **"Featured"** (count restore) are all exercised with real price-order assertions. "A - Z" and "Z - A" not yet exercised. |
| **Map** | Pan distance/direction (only that the camera moved); the cluster-pill drill-down (clicking an "N cities" pill); keyboard/wheel panning (disabled on this map). **"Reset map"**: now covered (TC-02, button visible + map healthy). **Bidirectional card→marker**: confirmed NOT implemented in the UI — clicking a rail card does not highlight the corresponding map marker (interaction is one-way: marker→card only, which TC-04 tests). |
| **Results count** | Count accuracy (reported = rendered cards) now asserted in Community Results TC-02. |
| **Breadcrumbs** | Not present on the region page — confirmed by exhaustive selector spike. N/A. |
| **Pagination / "Load more"** | Not present — all results render in a single rail with no pagination. N/A. |

## Notes
- **Two region pins:** the Community-Results and Filters-&-Sort blocks use the
  **Texas state** results (search "Texas"); the Map block uses the **Dallas city**
  results (search "Dallas") because individual community markers only render at a
  city view. If those markets change materially, update the search terms in
  `utils/test_data.json` (`region`, `region_request_info`) and
  `constants.home_search.dallas_results_url`.
- Community cards carry stable data attributes — `data-card-element` (community name)
  and `data-rail-community-id` — used for the sort/marker assertions.
- The map camera-change signal prefers the **tile fetch** (reliable for both zoom and
  pan) over the tile-layer CSS transform (reliable for zoom, unreliable for pan).
