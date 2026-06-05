# Community Page — Verification Coverage

_Last updated: 2026-06-04_

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

## Block — Floorplan Mortgage Calculator

### TC-01 | Calculator opens, fields populated, recalculates, closes  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | A **random floorplan's** mortgage calculator opens | Scroll a random floorplan info icon (`[class*='TitleBlock_popover-trigger']`) into view, tap it → popover "Mortgage Calculator" CTA → modal "Calculate your mortgage" |
| 2 | **All fields populated** + estimated payment shown | Top `$` estimated payment > 0; every modal text input (Price, Down Payment %/$, Interest Rate, Mortgage Amount, …) has a non-empty value; logged |
| 3 | **Down Payment % ↑ → payment decreases** | Capture top price, set Down Payment %, blur (Tab); assert recalculated to a new $ value that is lower |
| 4 | **Interest Rate ↑ → payment increases** | same pattern, higher |
| 5 | **Price ↑ → payment increases** | same pattern, higher |
| 6 | **30→15-year term → payment increases** | toggle 15-Year Loan; assert higher |
| 7 | **Modal closes** | click X; assert hidden |

> Pinned to River Ranch Trails; floorplan is chosen at random and logged. The
> price check is "recalculates + direction" (not exact-formula, since the site
> adds tax/insurance/HOA).

## Block 2 — Floorplan & Home Cards

### TC-01 | Floorplan/home cards render with specs and pricing  `@smoke`
| # | Verification | How |
|---|--------------|-----|
| 1 | Card **specs** (name + beds/baths/sqft) render | VISIBLE — `[class*='Card_specifications']` |
| 2 | Card **pricing** renders | VISIBLE — `[class*='Card_pricing']` |

### TC-02 | Floorplan/home card images are displayed  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | A card **image** is shown | VISIBLE — `[class*='Card_'] picture:visible` (`:visible` skips lazy/hidden carousel slides) |

### TC-03 | Image carousel is displayed  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | An **image carousel** is shown | VISIBLE — `[class*='FeaturedCarousel']` |

### TC-04 | "View Home Details" opens a floorplan/home detail page  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | The card **CTA** is clicked | *(implicit)* — "View Home Details" link visible & clicked |
| 2 | A **detail page** opens (one level deeper) | URL contains `new-construction-homes/[^/]+/[^/]+/[^/]+/[^/]+` |

---

## Block 3 — Quick Move-In Homes

### TC-01 | Quick move-in homes section shows homes with availability  `@smoke`
| # | Verification | How |
|---|--------------|-----|
| 1 | **QMI section** heading is shown | VISIBLE — "Quick Move-in Homes Available" |
| 2 | **Availability** badge is shown | VISIBLE — "Available Now" |

### TC-02 | Quick move-in promo rate is displayed  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | **Promo rate** badge is shown | VISIBLE — "Promo Rate" |

### TC-03 | Quick move-in was/now (discounted) pricing is displayed  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | **Discounted (was) price** is shown | VISIBLE — `[class*='Card_old-price']` (struck-through original price) |

### TC-04 | Quick move-in home card opens its detail page  `@regression`
| # | Verification | How |
|---|--------------|-----|
| 1 | The featured **QMI card** is clicked | *(implicit)* — stretched-link card clicked via DOM |
| 2 | A **detail page** opens (one level deeper) | URL contains `new-construction-homes/[^/]+/[^/]+/[^/]+/[^/]+` |

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
| QMI | availability **date**, number of QMI homes, exact promo rate/APR text |
| Pricing | the now-price (with was), that now < was, currency formatting |

## Not yet built (per test plan)
- **CP-03** — sales-consultant modal: River Ranch Trails has no consultant modal (only a generic help/contact modal). Needs a community that has one.
- **CP-11** — mortgage **calculator modal**: reclassified to **E5 (detail pages)** — the community page shows only a tooltip.
