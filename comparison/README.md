# Expense feature comparison

This branch contains a shared Playwright comparison suite and branch-specific unit
checks for the six expense implementations. The candidate implementations remain
untouched: the runner checks them out in detached worktrees and stores test output
and screenshots here.

| PR | Model / branch | Finance screen | Reports | Sample data API | AI spend / usage controls |
| --- | --- | --- | --- | --- | --- |
| [#6](https://github.com/michalfrackowiak/ai-chatbot/pull/6) | Nemotron 3.5 Lightning — `expenses-nemotron-3-5-lightning` | `/expenses` | None discovered | No | Admin panel includes usage totals and monthly/weekly limits |
| [#5](https://github.com/michalfrackowiak/ai-chatbot/pull/5) | Tencent Hy4 — `expenses-hy4` | `/finance` | HTML and PDF | `PUT /api/transactions` | Cost calculator, per-user monthly cost/token caps |
| [#4](https://github.com/michalfrackowiak/ai-chatbot/pull/4) | GPT 6.2 Sol — `expenses-gpt-6-2-sol` | Ledger panel on `/` | HTML and print-to-PDF | `POST /api/ledger` | Model spend and operating-cost example; global monthly call/budget limits |
| [#3](https://github.com/michalfrackowiak/ai-chatbot/pull/3) | GPT 6.2 Astra — `expenses-gpt-6-2-astra` | Ledger panel on `/` | HTML / browser print | `POST /api/ledger` | Model spend and cost example; global daily model-call limit |
| [#2](https://github.com/michalfrackowiak/ai-chatbot/pull/2) | Open Code Big Pickle — `expenses-big-pickle` | `/transactions` | HTML and PDF | No dedicated sample API | Cost estimate documentation; global and per-user limits |
| [#1](https://github.com/michalfrackowiak/ai-chatbot/pull/1) | Copilot Fusion GPT 6 Luna — `expenses-copilot-luna-6` | `/expenses` | HTML / browser print | `POST /api/transactions/sample` | Per-account AI budget and usage dashboard |

The unit suite imports each branch's own pure domain helper (money parsing,
validation, currency formatting, or model pricing). Big Pickle also ships a
`test:unit` script, which the runner executes when present. The browser suite
walks through chat, opens the finance and admin routes, submits a transaction via
the form, checks the list/API and report output, and loads sample data where an
endpoint exists. Admin routes are visited as a guest; role-gated branches may
redirect to the finance screen, so administrator-only pages and limit-save actions
are not exercised in these screenshots. Tool-backed chat writes use the application
test provider, not a live model; the prompt is captured and submitted, but a
model-driven financial write is not treated as a verified transaction.

## Run locally (Windows PowerShell)

Requirements: Node.js, pnpm 9, a local PostgreSQL server, and Chromium. Docker
Compose from the repository root provides PostgreSQL on port 5433:

```powershell
docker compose up -d postgres
$env:POSTGRES_ADMIN_URL = 'postgres://postgres:postgres@localhost:5433/postgres'
pnpm exec playwright install chromium
.\comparison\run.ps1
```

`run.ps1` creates six isolated databases (`fcmp_*`), fetches the PR branches,
creates detached worktrees under `%TEMP%\ai-chatbot-comparison`, applies each
branch's migrations (falling back to `db:push` if migrations fail), runs unit and
browser tests, and writes screenshots and a summary under `comparison-results/`.
It starts Next.js with its default Webpack dev server to avoid a Turbopack package
resolution failure with shared dependency links. Existing worktrees, databases,
and screenshots are reused; no candidate branch is merged or modified.
`POSTGRES_ADMIN_URL` also provides the host and credentials for the per-branch app
database URLs. No model API key or Redis instance is required.

For a single branch, pass its exact remote branch name:

```powershell
.\comparison\run.ps1 -Branches expenses-hy4
```

Screenshots are named by flow (`01-chat-prompt.png`, `02-finance.png`,
`02a-transaction-form.png`, `02b-transaction-added.png`, `03-admin.png`) inside
each `comparison-results/<branch>/` directory. `comparison-results/run-summary.md`
contains per-branch process exit codes; a non-zero code is a test finding, not a
reason to discard the screenshots. Server logs are retained under
`%TEMP%\ai-chatbot-comparison-logs\`.

## Recorded results

The checked-in results are from one run against all six detached PR worktrees.
Hy4 was the only branch with all applicable unit and browser checks passing.
The branch-specific findings below distinguish feature failures from browser
flows that could not reach a control:

| Branch | Result |
| --- | --- |
| `expenses-nemotron-3-5-lightning` | Both natural-language parser unit cases returned `null`; browser flow could not find the Expenses screen, so API and sample-data checks were skipped. Two screenshots. |
| `expenses-hy4` | Domain unit test and all three browser flows passed, including form submission, HTML/PDF reports, and sample data. Five screenshots. |
| `expenses-gpt-6-2-sol` | Domain unit test, report/API check, and sample-data check passed; the submitted transaction did not appear in the UI list. Three screenshots. |
| `expenses-gpt-6-2-astra` | Domain unit test, report/API check, and sample-data check passed; the form flow stalled on an `Income & expenses` summary outside the viewport before submission. Two screenshots. |
| `expenses-big-pickle` | All 16 native unit tests and the added domain check passed; chat/navigation passed, but the report endpoint returned a non-success response and sample-data check was skipped. Five screenshots. |
| `expenses-copilot-luna-6` | Domain unit test, report/API check, and sample-data check passed. The migration failed because `Chat.title` already existed; isolated `db:push` fallback succeeded. The form flow could not find `#type`. Two screenshots. |

Each screenshot directory includes the chat prompt and finance screen; further
form, saved-entry, and admin-route screenshots are captured only when the flow
reaches those steps. Admin screens were visited as a guest, so administrator-only
usage totals and limit editing are not validated by these results. The exact
process exit codes and artifact links are in `comparison-results/run-summary.md`.
