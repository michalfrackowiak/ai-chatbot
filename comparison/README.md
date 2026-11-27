# Expense feature comparison — v2

This branch adds a reusable comparison harness for the six pull requests that
implement the same income/expense feature with different models. Candidate
branches are never merged or modified: the runner checks them out into
detached worktrees, gives each one an isolated PostgreSQL database, runs the
same tests, and writes screenshots and machine-readable results here.

## What v2 adds over `test-results`

| Area | v1 | v2 |
| --- | --- | --- |
| Requirements | Implicit | Explicit `R1`–`R6` IDs attached to every check |
| Unit suite | One assertion group per branch | Multiple named cases (money, validation, limits, pricing) recorded as JSON, plus each branch's own `test:unit` when present |
| Admin coverage | Visited as a guest | A seeded administrator signs in on every branch; AI spend and **usage-limit changes** are exercised |
| Screenshots | 5 flow names | 10+ flow names including chat response, HTML report and limit form/save |
| Reporting | Exit codes + prose | `run-meta.json`, `unit-results.json`, `browser-results.json`, generated `COMPARISON.md` matrix and `run-summary.md` |
| Findings | Manual summary | Generated directly from executed checks |

## Requirements covered

- **R1** — income/expenses can be added and listed (finance screen, form, API)
- **R2** — the assistant accepts natural-language spending and the list updates
- **R3** — sample data can be loaded
- **R4** — HTML and PDF reports render the stored entries
- **R5** — the running cost can be estimated (pricing helpers/admin spend)
- **R6** — an admin panel shows AI spend and can set usage limits

## Layout

```
comparison/
  README.md              this document
  run.ps1                full runner (databases, worktrees, servers, suites, report)
  create-databases.mjs   creates the six isolated fcmp_* databases
  seed-admin.mjs         inserts one known admin identity into every database
  report.mjs             generates COMPARISON.md and run-summary.md from JSON
playwright.comparison.config.ts
tests/comparison/
  config.ts              observable UI/API surface of each candidate branch
  results.ts             JSON check recorder
  unit.test.ts           branch-specific domain unit checks
  features.spec.ts       human-like browser journeys
comparison-results/
  COMPARISON.md          requirement matrix + per-check findings
  run-summary.md         process exit codes and artifact links
  run-meta.json          raw runner metadata
  <branch>/
    unit-results.json
    browser-results.json
    *.png                screenshots of the flow
```

## Run locally (Windows PowerShell)

Requirements: Node.js, pnpm 9, a local PostgreSQL server and Playwright
Chromium. A local PostgreSQL on port 5433 is enough; no model API key or Redis
instance is needed because the chat model is mocked by the application's test
provider.

```powershell
$env:POSTGRES_ADMIN_URL = 'postgres://postgres:postgres@127.0.0.1:5433/postgres'
pnpm exec playwright install chromium
.\comparison\run.ps1
```

To run one branch:

```powershell
.\comparison\run.ps1 -Branches expenses-hy4
```

The runner creates/reuses databases `fcmp_*`, fetches PR branches into
`%TEMP%\ai-chatbot-comparison`, applies migrations (falling back to `db:push`),
seeds the admin user, starts each app with the default Webpack dev server on
ports 3111–3116, then runs the unit and browser suites. Server logs are kept
under `%TEMP%\ai-chatbot-comparison-logs\`.

### Admin identity

`seed-admin.mjs` creates `admin@comparison.local` with password
`ComparisonAdmin123!` and id `00000000-4000-4000-8000-000000000001`. The runner
exports that email through `ADMIN_EMAILS` and that id through
`AI_ADMIN_USER_IDS` / `FINANCE_ADMIN_IDS`, satisfying each branch's different
admin-gate implementation.

## Screenshots

Each branch directory contains screenshots named by flow:

- `01-chat-prompt.png` — the natural-language expense typed into chat
- `01b-chat-response.png` — the assistant's reply
- `02-finance.png` — finance/ledger screen with data
- `02a-transaction-form.png` — add-entry form filled in
- `02b-transaction-added.png` — entry visible after submission
- `03-report-html.png` — HTML report containing the entry
- `04-admin.png` — authenticated admin spend panel
- `04a-limit-form.png` — usage-limit control before saving
- `04b-limit-saved.png` — state after saving a limit

A screenshot is only captured when the flow reaches that step; the generated
`COMPARISON.md` and JSON results record which steps were not reached.

## Interpreting failures

A non-zero unit or browser exit code is a **finding**, not a harness error.
The comparison matrix distinguishes an implemented feature that fails a check
(`FAIL`) from a feature with no observable surface for that requirement
(`SKIP`). Details for every failed check are stored in the per-branch JSON
files and repeated in `COMPARISON.md`.
