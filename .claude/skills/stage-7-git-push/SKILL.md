---
name: stage-7-git-push
description: >
  Stage 7: Commit and push all generated files to the Git repository with a
  conventional commit message referencing the Jira story ID.
---

# Stage 7 — Git Push

## Purpose
Commit all generated automation artifacts to the project Git repository and
open a pull request. This is the final stage of the workflow.

---

## ⛔ REQUIRED PRECONDITION — Stage 6b Gate

**Do NOT proceed if Stage 6b returned "VIOLATIONS FOUND".**

Before running any git command, verify Stage 6b passed:
- Stage 6b output must read "Code Review — PASSED"
- If Stage 6b was skipped or returned violations, stop here and invoke `stage-6b-code-review` first

---

## Resuming an Interrupted Stage 7

If this stage was previously started (e.g., session was interrupted mid-push):

1. Navigate to the worktree: `cd "D:\Khov\.claude\worktrees\worktree-feat+{story-slug}"`
2. Run `git log --oneline -3` — check if a commit already exists
3. Run `git status` — check for unstaged changes
4. If commit exists and push hasn't happened → skip to the push step
5. If push already happened → skip to ExitWorktree

---

## Input

- Jira story ID (from metadata)
- List of all generated/modified files (from Stage 5/6)
- Stage 6b passing confirmation
- Branch name from Stage 4 worktree

---

## Files to Commit

| File | Path | Commit? |
|------|------|---------|
| POM TypeScript file | `page-objects/{pageName}Page.ts` | ✅ Always |
| Spec TypeScript file | `tests/{pageName}.spec.ts` | ✅ Always |
| Test data (if modified) | `utils/test_data.json` | ✅ If changed |
| Constants (if modified) | `utils/constants.json` | ✅ If changed |

### Never Stage These

```
NEVER commit:
  package-lock.json          ← dependency lockfile (not tracked in this repo)
  allure-results/            ← test output artifact
  playwright-report/         ← test output artifact
  results.xml                ← JUnit output artifact
  .env.*                     ← environment secrets
  {jira-id}-test-cases.csv  ← local Stage 1b artifact
  test-cases-{jira-id}.json ← intermediate Stage 1 artifact
  node_modules/              ← dependencies
```

If any of these appear in `git status`, warn the engineer explicitly and do NOT stage them.

---

## Step 1 — Final TypeScript Check

Run a clean type check before touching git. Abort if there are any errors.

```powershell
npx tsc --noEmit 2>&1 | grep -v "TS1149"
```

TS1149 casing warnings are pre-existing and can be ignored. All other errors must be fixed.

---

## Step 2 — Stage Files

Navigate into the worktree and stage only the automation files:

```powershell
# Navigate to worktree (not the main repo)
cd "D:\Khov\.claude\worktrees\worktree-feat+{story-slug}"

# Stage specific files only — NEVER use git add -A or git add .
git add page-objects/{pageName}Page.ts
git add tests/{pageName}.spec.ts
# Only if those files were modified during the workflow:
# git add utils/test_data.json
# git add utils/constants.json

# Review exactly what is staged before committing
git diff --staged
```

Display the `git diff --staged` output to the engineer and wait for acknowledgment before continuing.

---

## Step 3 — Verify Staged Files

```powershell
git diff --staged --name-only
```

Expected output — only automation files:
```
page-objects/{pageName}Page.ts
tests/{pageName}.spec.ts
```

If unexpected files appear (e.g., `package-lock.json`, `results.xml`), **unstage them** with `git restore --staged <file>` and warn the engineer.

---

## Step 4 — Commit

### Scope Naming Convention

`{scope}` = kebab-case page name:
- `home-page` — for home page tests
- `search-results` — for search results page
- `community-detail` — for community detail page
- `utils` — for shared utility changes only

If the commit covers multiple pages, use the primary page as the scope.

### Commit Format

```
test({scope}): {summary} [{JIRA-ID}]

- Add {block} locators and verification methods to {pageName}Page POM
- Add {block} action and data getter methods
- Implement X automated test cases (visibility, content, CTAs, forms)
- All X tests passing on dev environment

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### Commit Command (PowerShell here-string — REQUIRED on Windows)

The closing `'@` MUST be at column 0 — indenting it causes a parse error.

```powershell
git commit -m @'
test({scope}): {summary} [{JIRA-ID}]

- Add {block} locators and verification methods to {pageName}Page POM
- Implement X automated test cases covering {block}
- All X tests passing on dev environment

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

### Example

```powershell
git commit -m @'
test(home-page): add Hero Block and Contact Form tests [KHOV-394, KHOV-945]

- Add Hero Block locators and verification methods to homePage POM
- Add Contact Form locators and interaction methods
- Implement 12 Hero Block test cases (visibility, content, CTAs)
- Implement 10 Contact Form test cases (fields, submission, validation)
- All 22 automated tests passing on dev environment

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Step 5 — Verify the Commit

Run these immediately after committing — before pushing:

```powershell
git log --oneline -3
git show --stat HEAD
```

Confirm:
- The commit message is correct (Jira ID present, scope correct)
- Only the expected files appear in `--stat`
- No unexpected files were included

If the commit message or files are wrong, amend NOW (only safe before push):
```powershell
git commit --amend
```

---

## Step 6 — Pre-Push Confirmation

Display this summary to the engineer and wait for explicit YES:

```
Ready to push to remote. Please confirm:

  Branch:  worktree-feat+{story-slug}
  Files:   page-objects/{pageName}Page.ts
           tests/{pageName}.spec.ts
           [utils/test_data.json — if modified]
  Commit:  test({scope}): {summary} [{JIRA-ID}]
  Tests:   X passing on dev
  Target:  origin/worktree-feat+{story-slug}

Type YES to push, or NO to abort.
```

Only proceed after explicit YES.

---

## Step 7 — Push

```powershell
# First push — creates the remote tracking branch
git push -u origin worktree-feat+{story-slug}
```

---

## Step 8 — ExitWorktree

After a successful push, exit the worktree to return to the main repo context:

```
ExitWorktree tool
```

Or manually navigate back: `cd "D:\Khov"`

---

## Step 9 — Create Pull Request

### Detect the default branch first

```powershell
git remote show origin | Select-String "HEAD branch"
```

Use the detected branch name (may be `master` or `main`) — do not hardcode.

### PR creation command

Show the engineer the PR body below and ask them to confirm or edit it before creating:

```powershell
gh pr create `
  --base {default-branch} `
  --title "test({scope}): {summary} [{JIRA-ID}]" `
  --body @'
## Summary
- Adds automated Playwright tests for {block} on {page}
- {X} automated test cases, {Y} manual

## Jira Stories
- {JIRA-ID}

## Test Results
- All {X} tests passing on dev environment
- Smoke: {X} passed
- Regression: {Y} passed

## Files Changed
- `page-objects/{pageName}Page.ts` — added {block} locators and methods
- `tests/{pageName}.spec.ts` — added {N} test cases

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Error Recovery

### Push rejected — non-fast-forward
```powershell
# Remote branch has new commits — rebase and retry
git pull --rebase origin worktree-feat+{story-slug}
# Resolve any conflicts, then:
git push -u origin worktree-feat+{story-slug}
```

### Branch already exists remotely with different history (re-ran Stage 4)
```powershell
# Use force-with-lease — safer than --force (fails if remote has unexpected commits)
git push --force-with-lease origin worktree-feat+{story-slug}
```

### Pre-push hook failed
Read the hook output carefully. Fix the reported issue. Do NOT use `--no-verify` unless
the engineer explicitly instructs it.

### Commit hook failed
The commit did NOT happen. Fix the issue, re-stage, and create a **NEW commit** — do not amend.

### Permission denied / auth failure
Check SSH key or git credentials. Do not retry without resolving the auth issue first.

---

## Pre-Push Checklist

- [ ] Stage 6b returned "Code Review — PASSED"
- [ ] TypeScript compiles without errors (`tsc --noEmit` clean)
- [ ] `git diff --staged` reviewed and confirmed
- [ ] `git show --stat HEAD` verified — correct files, correct message
- [ ] No sensitive data in committed files
- [ ] Commit message references Jira ID
- [ ] Only automation files staged — no `package-lock.json`, no test output
- [ ] Engineer confirmed push with YES

---

## Post-Push Report

```
Git Push Complete
─────────────────────────────────────────
Branch:  worktree-feat+{story-slug}
Commit:  {short-sha} — test({scope}): {summary}
Files:   {count} files committed
PR:      {gh-pr-url}

Next steps:
  1. Link PR to Jira stories: {JIRA-ID}
  2. Request code review from team
  3. Merge after approval
```

---

## Workflow Complete

```
Playwright Automation Workflow Complete — {JIRA-IDs}
─────────────────────────────────────────────────────
Stage 1   Generated {N} test cases
Stage 2   Human review — {X} approved, {Y} manual, {Z} rejected
Stage 3   Locators discovered for {block} on {page}
Stage 4   POM updated: page-objects/{pageName}Page.ts
Stage 5   Spec created: tests/{pageName}.spec.ts
Stage 6   {N} tests passing on dev
Stage 6b  Code review passed
Stage 7   Committed and pushed — PR: {gh-pr-url}
```
