# khov.com Test Automation — Docs

This folder tracks the Playwright + TypeScript automation effort for **khov.com**.

| File | Purpose |
|------|---------|
| [`test-plan.md`](./test-plan.md) | Master test plan — full coverage backlog broken into epics → TC IDs, mapped to POM/spec files, with ✅/⬜ status per case. |
| [`progress.md`](./progress.md) | Living progress tracker — what's done, key decisions, and a dated changelog. |
| [`region-page-verifications.md`](./region-page-verifications.md) | Detailed per-test assertion reference for the region page (what each TC checks and how). |
| [`community-page-verifications.md`](./community-page-verifications.md) | Same reference for the community page. |
| [`contact-us-verifications.md`](./contact-us-verifications.md) | Same reference for the contact/lead forms. |
| `coverage-summary.md` | Human-readable summary of what is and isn't automated (gitignored — generated locally, not committed). |

## How work is produced

Each coverage area is built through the project's staged workflow (see the
`playwright-workflow-orchestrator` skill):

```
Stage 1  Generate test cases        Stage 5  Spec generation
Stage 2  Human review  (HARD GATE)  Stage 6  Test execution
Stage 3  Locator discovery (live)   Stage 6b Code review (PRE-COMMIT GATE)
Stage 4  POM generation             Stage 7  Git push
```

## Framework quick reference

- **Specs** live in `tests/`, import `test` from `./baseTest` (ReportPortal hooks).
- **POMs** live in `page-objects/`, extend `BasePage`, assert via `Validator`.
- All `Validator` / `waitForApi` calls live in POMs — never in specs.
- Test data → `utils/test_data.json`; expected text/URLs → `utils/constants.json`.
- Run against prod: `npm run test:prod` · smoke only: `npm run smoke:prod` · regression: `npm run regression:prod`.

See the root `CLAUDE.md` for the complete framework standards.

## Glossary

| Term | Meaning |
|------|---------|
| **QMI** | Quick Move-In home (a built/near-complete inventory home) |
| **IFP** | Interactive Floor Plan |
| **Was/Now pricing** | Discounted price shown alongside the original ("was" struck through, "now" highlighted) |
| **Hero Gallery 2.0** | Newer media-gallery component variant with section navigation |
| **Community / Region page** | Region listing page, e.g. `/new-construction-homes/texas/` |
