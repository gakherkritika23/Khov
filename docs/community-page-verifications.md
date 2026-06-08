# Community Page — Verification Coverage

_Last updated: 2026-06-08_

What the **community page** automated tests verify today. Source files:
- Spec: `tests/communityPage.spec.ts`
- Page Object: `page-objects/communityPage.ts`
- Assertions: `utils/validator.ts` (`Validator`)

## How the page is reached
All community-page tests are **pinned to River Ranch Trails** and navigate to it
**directly** (`CommunityPage.navigateToCommunity` → `/new-construction-homes/texas/dayton/river-ranch-trails/`).
Pinning to a known, feature-rich community makes the conditional checks (promo rate,
was/now pricing, quick move-in homes) deterministic. Navigation waits for `load`
so link clicks don't race React hydration. The search-bar route to a community is
covered separately by SB-03 (`homePage.spec.ts`).

> If River Ranch Trails is ever retired, update `constants.community.river_ranch_trails_url`.

On first navigation the **cookie consent banner** ("By browsing… → OK") is
dismissed automatically (`utils/cookieUtils.ts` `dismissCookieBanner`, called from
`navigateToHome` / `navigateToCommunity`). It's best-effort — safe when absent.

## Verification types
| Type | Helper | Meaning |
|------|--------|---------|
| **VISIBLE** | `Validator.requireVisible` | element is rendered and visible (timeouts 20–25s for prod) |
| **URL contains** | `Validator.requireUrlContains` | the page URL matches the expected pattern |
| *(implicit)* | `BasePage.click` / `clickViaScript` | the action waits for the element to be visible/attached before clicking |

Every assertion runs inside a boxed `test.step(message)`, so report step names read
as plain English (e.g. "Starting price should be displayed…") rather than locator code.

---

## Block 1 — Listing Header

### TC-01 | Community page loads with name, starting price, location, sales team and office hours  `@smoke`
_One test covers the whole listing header._

| # | Verification | How |
|---|--------------|-----|
| 1 | Community **name** heading is shown | VISIBLE — level-1 heading "River Ranch Trails" |
| 2 | Community **subtitle** is shown | VISIBLE — `[class*='Hero_subtitle']` |
| 3 | **Starting price** line is shown | VISIBLE — hero subtitle containing "Starting" |
| 4 | **Community Location** block is shown | VISIBLE — "Community Location" |
| 5 | **Onsite sales team** label + sales-office line shown | VISIBLE — "Your Onsite Sales Team" and "Sales Office:" |
| 6 | **Sales office hours** are present & non-empty | VISIBLE schedule (`[class*='SalesCenterOperationHours']`); for each `<li>` row, day label + `<time>` are non-empty; **logs** each `day: time` (e.g. `Thursday to Saturday: 10:00 AM - 6:00 PM`) |
| 7 | **"Your Onsite Sales Team" modal** opens, every section has a value, then closes | Clicks the CTA → modal `[class*='Modal_bottom']`. Asserts VISIBLE + non-empty (and **logs**): "Our Onsite Team" heading, phone/Call link, community address, sales hours, ≥1 consultant name, ≥1 consultant photo. Fails if any section is empty. Then **closes the modal** (X / `CircleIconButton`) and asserts it's hidden. |

---

## Block 2 — Floorplan Section

One test covers the whole floorplan section, in order (detail navigation is last
since it leaves the page).

### TC-01 | Cards, images, carousel, meta data, mortgage calculator, detail nav  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | Floorplan/home **cards** render (specs + pricing) | VISIBLE — `[class*='Card_specifications']` + `[class*='Card_pricing']`; card count logged |
| 2 | Card **images** render | VISIBLE — `[class*='Card_'] picture:visible` |
| 3 | **Both carousels (elevation + gallery) of every floorplan** | For each floorplan's two `[class*='Multiple_carousel']`: next arrow active + prev inactive initially → both active after one tap → next inactive + prev active at the last image (state = `disabled`; the inactive arrow is opacity:0). **Image count = number of slides** (`li[class*='Carousel_slide']`, e.g. Clyde II 3 elevation / 4 gallery — the gallery's 4th slide is the "View Gallery" callout). Each slide's image URL is collected (one per slide; callout has none) and asserted **HTTP 200** via `page.request.get`; **every URL + status is logged**. |
| 4 | **Every floorplan's meta data** present & non-zero | Per floorplan (scrolled into view): Sq ft, Story/Stories, Beds, Baths (decimal ok), Cars, Estimated payment, "Mortgage calculation information", Starting price, lot-premium disclaimer — none empty/0/missing; values logged |
| 5 | **Mortgage calculator** opens (random floorplan) | Scroll info icon (`[class*='TitleBlock_popover-trigger']`) → tap → "Mortgage Calculator" CTA → modal "Calculate your mortgage" |
| 6 | Calculator **fields populated** | Top `$` estimated payment > 0; every text input non-empty; logged |
| 7 | **Recalculation + direction** | Down Payment % ↑ → payment down; Interest Rate ↑ → up; Price ↑ → up; 30→15-yr → up (capture → edit → blur; assert changed + direction) |
| 8 | Calculator **closes** | click X; assert hidden |
| 9 | Card **CTA → detail page** (last) | click "View Home Details"; URL one level deeper (`new-construction-homes/[^/]+/[^/]+/[^/]+/[^/]+`) |

> Pinned to River Ranch Trails. The random floorplan used for the calculator is
> logged. Price check = "recalculates + direction" (not exact formula; the site
> adds tax/insurance/HOA).

---

## Block 3 — Quick Move-In Homes

One consolidated test covers the whole QMI section, in order (detail navigation
is last since it leaves the page). QMI cards are at floorplan-section parity for
meta data, images, and the mortgage calculator — minus the carousel/gallery
(each QMI card has a single static image).

### TC-01 | QMI cards, images, meta data, promo rate, mortgage calculator and detail nav  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | **QMI section + availability** are shown | VISIBLE — "Quick Move-in Homes Available" heading + an "Available Now" badge |
| 2 | **All quick move-in homes loaded** | Best-effort "Load More" (the list is paginated), then poll until the card count is stable; count logged (12 on River Ranch Trails) |
| 3 | **Single card image** (every card) | Per card (scrolled into view): the one static image is VISIBLE and its URL returns **HTTP 200** (`page.request.get`); every URL + status logged. No carousel/gallery — QMI cards have a single image. |
| 4 | **Meta data** (every card) present & non-zero | Per card: Sq ft, Story/Stories, Beds, Baths (decimal ok), Cars, Estimated payment, **Current total price** — none empty/0/missing; values logged |
| 5 | **Promo rate** (where present) | If a card shows a "Promo Rate X% (Y% APR)" badge, it's asserted non-empty and logged. Conditional — only some cards carry it. |
| 6 | **Was/now (discounted) pricing** shown | VISIBLE — `[class*='Card_old-price']` (struck-through original price; at least one card) |
| 7 | **Mortgage calculator** (random QMI card) | Estimated-payment info icon (`[class*='Card_tooltip-trigger']`, distinct from the floorplan `TitleBlock_popover-trigger`) → "Mortgage Calculator" CTA → the **shared** "Calculate your mortgage" modal; fields populated; recalculates in all 4 directions (down-payment ↑→down, interest ↑→up, price ↑→up, 30→15-yr→up); closes |
| 8 | Card **CTA → detail page** (last) | Featured QMI card clicked (stretched-link via DOM); URL one level deeper (`new-construction-homes/[^/]+/[^/]+/[^/]+/[^/]+`) |

> Pinned to River Ranch Trails. The QMI calculator reuses the same modal and
> verification helpers as the floorplan calculator. The random card used is logged.

---

## Currently NOT asserted (candidates to add)
These tests are intentionally a **presence/visibility + navigation baseline**. They do
**not** yet assert values:

| Area | Not yet verified |
|------|------------------|
| Header | exact starting-price format, exact address text, page `<title>` |
| Sales team | actual hours values, phone, full address |
| Cards | beds/baths/sqft values, card count, price format |
| Images | image `src` / actually loaded (`naturalWidth > 0`), per-card coverage |
| Carousel | next/prev navigation, slide change, indicators |
| CTAs | whether the target is a *floorplan* (clean slug) vs *QMI* (homesite slug); detail-page heading text |
| QMI | availability **date**; exact was/now currency formatting (now < was) |
| Pricing | the now-price (with was), that now < was, currency formatting |

## Modals exercised on the community page
Both modals the community page exposes are opened and validated here:

- **Onsite Sales Team modal** *(the sales-consultant modal for this community)* —
  opened from "Your Onsite Sales Team" and validated in **Block 1** (heading,
  phone, address, hours, ≥1 consultant **name**, ≥1 consultant **photo**), then
  closed. River Ranch Trails has **no separate per-consultant detail modal**, so
  **CP-03** is covered by this modal (not deferred).
- **Mortgage calculator modal** — opened **on the community page** (not just a
  tooltip) from both the **floorplan** section (Block 2) and the **QMI** section
  (Block 3), via the estimated-payment info icon → "Mortgage Calculator" CTA.
  Fields, recalculation (4 directions), and close are all asserted. This
  supersedes the earlier note that **CP-11** was tooltip-only / deferred to E5.
