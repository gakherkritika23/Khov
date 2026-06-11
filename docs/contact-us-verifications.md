# Contact Us — Verification Coverage

_Last updated: 2026-06-11_

What the **Contact Us** automated tests verify today (Step 1 — read-only field &
dropdown audit). Source files:
- Spec: `tests/contactUsPage.spec.ts`
- Page Object: `page-objects/contactUsPage.ts`
- Assertions: `utils/validator.ts` (`Validator`); value logging: `utils/reporter.ts`

## How the page is reached
Every test reaches the page through the **footer "Contact Us" link** (not a direct
URL): `navigate(home)` → scroll the footer link into view → click → wait for
`/contact-us/`. This proves the footer route on each test. The cookie/consent
banner is dismissed by `BasePage.navigate` / `handlePagePopups`.

The contact form is the **same shared component** used by the "Request
Information" form on QMI/floorplan detail pages (stable `name` attributes; native,
visually-hidden `<select>`s; react-aria visually-hidden disclaimer checkboxes).

## Environments & submission
Tests are **env-agnostic** (relative `/contact-us/` + config `BASE_URL`) and run on
dev/uat/stage/prod. **Step 1 performs NO form submission**, so it is safe on prod.
(Future submission steps must skip the actual submit on prod via `isProdEnv()`.)

## Verification types
| Type | Helper | Meaning |
|------|--------|---------|
| **VISIBLE** | `Validator.requireVisible` | field is rendered & visible (inputs/selects/textareas) |
| **EXISTS** | `Validator.requireTrue(count>0)` | element present in DOM — used for the react-aria disclaimer checkboxes, which are visually hidden |
| **URL contains** | `Validator.requireUrlContains` | landed on `/contact-us/` |
| **logged** | `reportValue` | value printed as a Test-body step (terminal + Allure) |

Each test's first step logs `Page URL: <url>`.

---

## "What are you interested in?" — 5 options (5 forms)
Selecting an option re-renders the form with a **different field set**. Each test
selects one radio (react-aria; click the label, confirm `toBeChecked`), verifies
its fields exist, and logs every dropdown's options.

### TC-01 | I am shopping for a new home  `@form @smoke`
| Verification | How |
|--------------|-----|
| Fields exist | First Name, Last Name, Email, Phone (VISIBLE); Preferred Contact Method, State of Interest (VISIBLE selects); Comments / Questions (VISIBLE textarea); Disclaimer + Text-message disclaimer checkboxes (EXISTS); Submit (VISIBLE) |
| Dropdown options logged | **Preferred Contact Method**: Text, Email, Phone · **State of Interest** (13): Arizona…West Virginia |

### TC-02 | I would like mortgage information  `@form @regression`
| Verification | How |
|--------------|-----|
| Fields exist | First/Last/Email/Phone (VISIBLE); Address 1, Address 2, City, Zip (VISIBLE); State, State of Interest (VISIBLE selects); Comments / Questions (VISIBLE textarea); Disclaimer (EXISTS); Submit (VISIBLE) |
| Dropdown options logged | **State** (full US list incl. territories) · **State of Interest** (13) |

### TC-03 | I am a real estate professional  `@form @regression`
| Verification | How |
|--------------|-----|
| Fields exist | First/Last/Email/Phone, Address 1/2, City, Zip, **Company Name**, **Company Position** (VISIBLE); **State** (VISIBLE select — *no* State of Interest); Comments / Questions (VISIBLE textarea); Disclaimer (EXISTS); Submit (VISIBLE) |
| Dropdown options logged | **State** (full US list incl. territories) |

### TC-04 | I am a subcontractor  `@form @regression`
| Verification | How |
|--------------|-----|
| Fields exist | First/Last/Email/Phone, Address 1/2, City, Zip, **Company Name** (VISIBLE); State, **Service / Trade**, **Years in Business**, State of Interest (VISIBLE selects); Comments / Questions (VISIBLE textarea); Disclaimer (EXISTS); Submit (VISIBLE) |
| Dropdown options logged | **State** (full US list) · **Service / Trade** (Appliances…Other) · **Years in Business** (1–2 … 15+ years) · **State of Interest** (13) |

### TC-05 | I am selling land  `@form @regression`
| Verification | How |
|--------------|-----|
| Fields exist | First/Last/Email/Phone (VISIBLE); Lot Acres, Lot City, Lot County, Price, Zoning, Entitlements, Owner Name, Owner Phone (VISIBLE); Lot Description (VISIBLE textarea); State (VISIBLE select); Disclaimer (EXISTS); Submit (VISIBLE) |
| Dropdown options logged | **State** (13): Arizona…West Virginia |

---

## Currently NOT asserted (later E6 steps)
Step 1 is a presence/existence + dropdown-option baseline. It does **not** yet:
- fill or **submit** any form (and must never submit on prod);
- assert **required-field validation** messages (`[class*='shared_error']`);
- assert **invalid email/phone** rejection;
- assert the **success** panel / `waitForApi` on the submit endpoint;
- handle the Cloudflare **Turnstile** token (only needed for submission).

## Notes
- All dropdowns are **native `<select>`** (no custom comboboxes), so options are
  read directly from `<option>` (works even though `PreferredContactMethod` is
  visually hidden).
- Hidden plumbing inputs (`cf-turnstile-response`, `IsDesignPriceLead`) are
  intentionally excluded from field verification.
