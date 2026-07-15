# Environment setup (read this if your tests can't find `BASE_URL`)

Env files (`dev.env`, `uat.env`, `stage.env`, `prod.env`) are **no longer tracked in
git** — they hold secrets (e.g. `RP_API_KEY`) and are now gitignored. Only
`example.env` is committed, as the template.

## ⚠️ If you pulled the change that untracked these files

Git may have **deleted your local `*.env` files** when you pulled (a file that a
commit untracks is removed from your working tree). You'll now see:

```
Error: BASE_URL is not set. Define BASE_URL in environment/<env>.env.
```

Recreate them (see below). Nothing is lost that the template + the table can't restore.

## First-time / recovery setup

Copy the template once per environment you run against and fill in the values:

```bash
cp environment/example.env environment/dev.env
# repeat for uat / stage / prod as needed
```

Set `BASE_URL` per environment:

| File | `BASE_URL` |
| --- | --- |
| `dev.env` | `https://www-dev.khov.com` |
| `uat.env` | `https://www-uat.khov.com` |
| `stage.env` | `https://www-stg.khov.com` |
| `prod.env` | `https://www.khov.com/` |

## ReportPortal (optional, local)

Reporting turns on only when `RP_API_KEY` is set. Leave it blank to run without
ReportPortal. If you use a local RP instance, also set `RP_ENDPOINT` and
`RP_PROJECT` (see `example.env`). **Never commit a real key** — the files are
gitignored for this reason.

## Command changes (projects are now browsers, suites use --grep)

The Playwright projects were restructured. Update any saved commands:

| Old | New |
| --- | --- |
| `--project=Chrome` | `--project=chromium` |
| `--project=smoke` | `--grep @smoke` |
| `--project=regression` | `--grep @regression` |

The npm scripts already reflect this: `npm run test:<env>`, `npm run smoke:<env>`,
`npm run regression:<env>` for `<env>` in `dev` / `uat` / `stage` / `prod`.
Note: tests now run **headless** (the old headed/demo mode is retired).
