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

- **Community Results**: `enterRegion` with **"Texas"** → state region
  `/new-construction-homes/texas/` (only clicks the first community card, so the heavy
  state rail is fine here).
- **Map** & **Filters & Sort**: `enterRegion` with **"Dallas"** → the **city** results
  `/new-construction-homes/texas/dallas-tx/`. Both are pinned to the **city** view: the
  state view clusters communities into **"N cities"** pills (Map needs individual
  markers for RG-06), and the ~47-community state rail is heavy enough that the
  multi-step filter/sort/CTA interactions stall on a degraded dev — the lighter city
  rail behaves reliably.

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

## Block 1 — Community Results

### TC-01 | Selecting 'Texas' then the first community opens its detail page  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | Search → region page | Type "Texas", await `/api/search`, click the "Texas" suggestion; URL contains `/new-construction-homes/texas/` |
| 2 | **"New Home Communities" section** shown | VISIBLE — section heading |
| 3 | **First community name** captured | Read from the first community card; **logged** |
| 4 | **First community card opens its detail page** | Click the card's zero-size "stretched link" via a DOM click (`clickViaScript`; the card list re-renders as the map loads); lands on a community detail URL (`new-construction-homes/texas/[^/]+/[^/]+`) with a level-1 heading naming that community; heading **logged** |

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

## Block 3 — Filters & Sort  _(Texas region)_

### TC-01 | Price filter reduces the results and 'Clear all' restores them  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | **Baseline result count** | Read "N results" (`[class*='rail_results']`), polled until stable; **logged** |
| 2 | **Filter reduces results** | Open the **"Price Range"** filter (`[role='dialog'][aria-label='Price Range']`), set **Maximum = 300000**, click **"Apply filters"**, await `/api/search` → result count is lower than baseline; **logged** |
| 3 | **"Clear all" restores results** | Reopen the dialog, click **"Clear all"** + apply → result count returns (≥ baseline, and greater than the filtered count); **logged** |

### TC-02 | Sorting the communities reorders the results  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | **First community before sort** | Read the first card's `data-card-element`; **logged** |
| 2 | **Sort reorders** | Open the **"Sort by"** listbox (`rail_sort-trigger` → `role=option`), choose **"Price - Low to High"**, await `/api/search` → the first card's community **changes**; before/after **logged** (e.g. "River Ranch Trails → Piccolina") |

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
| **Filter coverage** | Only the **Price Range** filter is exercised. The live filter set is currently **Price Range + Bed & Baths** only — the "Home Availability / Home Type / Community Type" filters in the original requirement are **not present** in the UI today. The **Bed & Baths** filter is not yet exercised; neither are multi-filter combinations or exact result counts per value. |
| **Sort coverage** | Only "Price - Low to High" is exercised (asserts the first card changes). Other sort options and exact ordering are not verified. |
| **Map** | Pan distance/direction (only that the camera moved); the cluster-pill drill-down (clicking an "N cities" pill); the "Reset map" button; keyboard/wheel panning (disabled on this map). |
| **Results count** | Exact totals per region are not asserted (only relative reduce/restore for filtering). |

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
