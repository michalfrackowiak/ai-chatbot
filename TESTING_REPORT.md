# Testing and Feature Comparison Report

Generated 2026-11-27 from the recorded run on branch `test-results-v2-hy4`.

## 1. Executive summary

Six candidate branches implementing the same income/expense feature were tested with the same unit and browser suites. In total **75 checks** were recorded: **62 passed**, **9 failed**, **4 skipped**, supported by **43 screenshots**.

3 implementations passed every applicable check: **PR #4 (GPT 6.2 Sol), PR #3 (GPT 6.2 Astra), PR #1 (Copilot Fusion GPT 6 Luna)**. PR #5 (Tencent Hy4), PR #2 (Open Code Big Pickle) each had a single failed check. Nemotron was the weakest implementation: its natural-language parser returns `null` and its finance/admin routes render a Next.js build error.

The strongest implementation overall was **PR #4 (GPT 6.2 Sol)**, with **13/13 checks passing** and 9 screenshots covering the full flow, including HTML reports, authenticated admin spend and a saved usage limit.

## 2. Scope and requirements

| ID | Requirement |
| --- | --- |
| R1 | Income and expenses can be added and listed |
| R2 | The assistant can manage them and the list updates right away |
| R3 | Sample data is available |
| R4 | Reports can be exported as HTML or PDF |
| R5 | It is possible to estimate the running cost of the app |
| R6 | Admin panel shows AI spend and allows setting usage limits |

## 3. Test tools and environment

| Area | Tool | Version / detail |
| --- | --- | --- |
| Test runner (unit) | Node.js built-in `node:test`, executed via `tsx --test` | 4.23.15 (tsx) / 26.13.1 (Node) |
| Test runner (browser) | Playwright Test | 1.65.1 |
| Browser | Chromium headless shell | revision 1255 |
| Runtime | Node.js | 26.13.1 |
| Package manager | pnpm | 9.12.3 |
| Application server | Next.js dev server (Webpack, not Turbopack) | 15.3.0-canary.31 |
| Database | Local PostgreSQL on port 5433, one `fcmp_*` database per branch | postgres client 3.4.9 |
| Schema setup | Drizzle Kit (`db:migrate` with `db:push --force` fallback) | 0.25.0 |
| Admin identity seeding | bcrypt-ts password hash + direct SQL insert | 5.0.3 |
| Orchestration | PowerShell `comparison/run.ps1` | Windows PowerShell |
| Model calls | Application test provider (mocked) — no live model API key | — |

## 4. Methodology

1. Each PR branch is fetched into a detached worktree under `%TEMP%\ai-chatbot-comparison`; candidate code is never edited or merged.
2. Each branch gets an isolated PostgreSQL database (`fcmp_*`). Migrations are applied with `db:migrate`, falling back to `drizzle-kit push --force` when a reused database already has the schema.
3. A single known administrator is seeded into every database and exposed through the branch-specific admin allowlist (`ADMIN_EMAILS`, `AI_ADMIN_USER_IDS`, `FINANCE_ADMIN_IDS`).
4. The app is started with its Webpack dev server on a dedicated port (3111–3116). No Redis instance or live model API key is needed.
5. Unit checks import each branch's own pure domain helpers from its worktree and exercise money conversion, validation, pricing and natural-language parsing.
6. Browser checks walk a human-like journey: type a natural-language expense into chat, open the finance screen, add an entry through the form, create an entry through the API, load sample data, request HTML/PDF reports, sign in as admin, view spend and save a usage limit. Screenshots are captured at each reached step.
7. Every check is recorded with a pass/fail/skip status and an optional failure detail in `comparison-results/<branch>/{unit,browser}-results.json`.
8. `comparison/report.mjs` produces the matrix and `comparison/full-report.mjs` produces this document directly from those JSON files.

## 5. Feature comparison matrix

| Requirement | #6 Nemotron 3.5 Lightning | #5 Tencent Hy4 | #4 GPT 6.2 Sol | #3 GPT 6.2 Astra | #2 Open Code Big Pickle | #1 Copilot Fusion GPT 6 Luna |
| --- | --- | --- | --- | --- | --- | --- |
| **R1** Income and expenses can be added and listed | FAIL (3/4) | PASS (5/5) | PASS (5/5) | PASS (4/4) | PASS (4/4) | PASS (3/3) |
| **R2** The assistant can manage them and the list updates right away | FAIL (1/2) | PASS (1/1) | PASS (1/1) | PASS (1/1) | PASS (1/1) | PASS (1/1) |
| **R3** Sample data is available | SKIP (1/1) | PASS (1/1) | PASS (1/1) | PASS (1/1) | SKIP (1/1) | PASS (1/1) |
| **R4** Reports can be exported as HTML or PDF | SKIP (1/1) | PASS (1/1) | PASS (1/1) | PASS (1/1) | FAIL (1/1) | PASS (1/1) |
| **R5** It is possible to estimate the running cost of the app | FAIL (1/2) | PASS (2/2) | PASS (2/2) | PASS (2/2) | PASS (2/2) | PASS (2/2) |
| **R6** Admin panel shows AI spend and allows setting usage limits | FAIL (2/2) | FAIL (1/4) | PASS (3/3) | PASS (3/3) | PASS (3/3) | PASS (4/4) |

## 6. Test results summary

| PR | Branch | Migration | Unit pass/fail | Browser pass/fail | Skips | Screenshots | Overall |
| ---: | --- | --- | ---: | ---: | ---: | ---: | --- |
| [#6](https://github.com/michalfrackowiak/ai-chatbot/pull/6) | `expenses-nemotron-3-5-lightning` | passed | 1/2 | 1/5 | 3 | 2 | FAIL (7) |
| [#5](https://github.com/michalfrackowiak/ai-chatbot/pull/5) | `expenses-hy4` | passed | 4/0 | 9/1 | 0 | 8 | FAIL (1) |
| [#4](https://github.com/michalfrackowiak/ai-chatbot/pull/4) | `expenses-gpt-6-2-sol` | passed | 3/0 | 10/0 | 0 | 9 | PASS |
| [#3](https://github.com/michalfrackowiak/ai-chatbot/pull/3) | `expenses-gpt-6-2-astra` | passed | 2/0 | 10/0 | 0 | 9 | PASS |
| [#2](https://github.com/michalfrackowiak/ai-chatbot/pull/2) | `expenses-big-pickle` | passed | 2/0 | 8/1 | 1 | 7 | FAIL (1) |
| [#1](https://github.com/michalfrackowiak/ai-chatbot/pull/1) | `expenses-copilot-luna-6` | failed; schema push succeeded | 2/0 | 10/0 | 0 | 8 | PASS |

## 7. Branch-by-branch results

### PR #6 — Nemotron 3.5 Lightning (`expenses-nemotron-3-5-lightning`)

2 passed, 7 failed, 3 skipped across 12 recorded checks.

#### Unit tests

| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| natural expense phrase parses | R2 | FAIL | Expected values to be strictly deep-equal: + actual - expected + null - { - amount: '24.50', - description: 'coffee', - type: 'expense' - } |
| natural income phrase parses | R1 | FAIL | Expected values to be strictly deep-equal: + actual - expected + null - { - amount: '1200.50', - description: 'salary', - type: 'income' - } |
| cost/usage schema is present | R5 | PASS | — |

#### Functional tests


| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| assistant accepts a natural expense | R2 | PASS | — |
| finance screen lists income and expenses | R1 | FAIL | expect(locator).not.toContainText(expected) failed Locator: locator('body') Expected pattern: not /build error\|internal server error\|application error/i Received string: "01 Issue1/1Next.js 15.3.0-canary.31 (outdated)Build ErrorError: x You're importing a component that needs `useState`. This React hook only works in… |
| an entry can be added through the form | R1 | FAIL | locator.evaluate: Timeout 10000ms exceeded. Call log: - waiting for getByText('Expenses', { exact: true }).first() |
| admin panel renders spend and usage | R6 | FAIL | expect(page).toHaveURL(expected) failed Expected pattern: /\/admin/ Received string: "http://localhost:3111/api/auth/guest?redirectUrl=http%3A%2F%2Flocalhost%3A3111%2Fadmin" Timeout: 15000ms Call log: - Expect "toHaveURL" with timeout 15000ms 32 × locator resolved to <html>…</html> - unexpected value "http://localhost:… |
| admin exposes a running cost estimate | R5 | FAIL | expect(locator).toContainText(expected) failed Locator: locator('body') Timeout: 10000ms Expected pattern: /cost\|spend\|\$\|usd/i Received string: "01 Issue1/1Next.js 15.3.0-canary.31 (outdated)Build ErrorError: x You're importing a component that needs `useState`. This React hook only works in a client component. To … |
| a usage limit can be set | R6 | FAIL | locator.fill: Timeout 10000ms exceeded. Call log: - waiting for locator('input[placeholder="e.g., 50"]') |
| no finance API on this branch | R1 | SKIP | — |
| no report API on this branch | R4 | SKIP | — |
| no sample-data API discovered | R3 | SKIP | — |

#### Screenshots

| Screenshot | Flow step |
| --- | --- |
| ![01-chat-prompt.png](comparison-results/expenses-nemotron-3-5-lightning/01-chat-prompt.png) | `01-chat-prompt.png` — Natural-language expense typed into the chat composer |
| ![01b-chat-response.png](comparison-results/expenses-nemotron-3-5-lightning/01b-chat-response.png) | `01b-chat-response.png` — Assistant response to the typed expense |

#### Findings

- **natural expense phrase parses** (R2, `u-parse-expense`): Expected values to be strictly deep-equal: + actual - expected + null - { - amount: '24.50', - description: 'coffee', - type: 'expense' - }
- **natural income phrase parses** (R1, `u-parse-income`): Expected values to be strictly deep-equal: + actual - expected + null - { - amount: '1200.50', - description: 'salary', - type: 'income' - }
- **finance screen lists income and expenses** (R1, `b-finance-list`): expect(locator).not.toContainText(expected) failed Locator: locator('body') Expected pattern: not /build error\|internal server error\|application error/i Received string: "01 Issue1/1Next.js 15.3.0-canary.31 (outdated)Build ErrorError: x You're importing a component that needs `useState`. This React hook only works in…
- **an entry can be added through the form** (R1, `b-form-submit`): locator.evaluate: Timeout 10000ms exceeded. Call log: - waiting for getByText('Expenses', { exact: true }).first()
- **admin panel renders spend and usage** (R6, `b-admin-panel`): expect(page).toHaveURL(expected) failed Expected pattern: /\/admin/ Received string: "http://localhost:3111/api/auth/guest?redirectUrl=http%3A%2F%2Flocalhost%3A3111%2Fadmin" Timeout: 15000ms Call log: - Expect "toHaveURL" with timeout 15000ms 32 × locator resolved to <html>…</html> - unexpected value "http://localhost:…
- **admin exposes a running cost estimate** (R5, `b-admin-cost`): expect(locator).toContainText(expected) failed Locator: locator('body') Timeout: 10000ms Expected pattern: /cost\|spend\|\$\|usd/i Received string: "01 Issue1/1Next.js 15.3.0-canary.31 (outdated)Build ErrorError: x You're importing a component that needs `useState`. This React hook only works in a client component. To …
- **a usage limit can be set** (R6, `b-admin-limits`): locator.fill: Timeout 10000ms exceeded. Call log: - waiting for locator('input[placeholder="e.g., 50"]')

### PR #5 — Tencent Hy4 (`expenses-hy4`)

13 passed, 1 failed, 0 skipped across 14 recorded checks.

#### Unit tests

| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| dollars convert to cents | R1 | PASS | — |
| transaction input is validated | R1 | PASS | — |
| usage limit input is validated | R6 | PASS | — |
| pricing and formatting work | R5 | PASS | — |

#### Functional tests


| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| assistant accepts a natural expense | R2 | PASS | — |
| finance screen lists income and expenses | R1 | PASS | — |
| an entry can be added through the form | R1 | PASS | — |
| administrator can sign in | R6 | FAIL | expect(received).toBe(expected) // Object.is equality Expected: "admin@comparison.local" Received: "guest-1795795587192" Call Log: - Timeout 20000ms exceeded while waiting on the predicate |
| admin panel renders spend and usage | R6 | PASS | — |
| admin exposes a running cost estimate | R5 | PASS | — |
| a usage limit can be set | R6 | PASS | — |
| API creates an entry that appears in the list | R1 | PASS | — |
| HTML and PDF reports render the new entry | R4 | PASS | — |
| sample data loads into the ledger | R3 | PASS | — |

#### Screenshots

| Screenshot | Flow step |
| --- | --- |
| ![01-chat-prompt.png](comparison-results/expenses-hy4/01-chat-prompt.png) | `01-chat-prompt.png` — Natural-language expense typed into the chat composer |
| ![01b-chat-response.png](comparison-results/expenses-hy4/01b-chat-response.png) | `01b-chat-response.png` — Assistant response to the typed expense |
| ![02-finance.png](comparison-results/expenses-hy4/02-finance.png) | `02-finance.png` — Income/expense screen with entries |
| ![02a-transaction-form.png](comparison-results/expenses-hy4/02a-transaction-form.png) | `02a-transaction-form.png` — Add-entry form filled in as a user would |
| ![02b-transaction-added.png](comparison-results/expenses-hy4/02b-transaction-added.png) | `02b-transaction-added.png` — Submitted entry visible in the list |
| ![03-report-html.png](comparison-results/expenses-hy4/03-report-html.png) | `03-report-html.png` — HTML report rendered with the submitted entry |
| ![04-admin.png](comparison-results/expenses-hy4/04-admin.png) | `04-admin.png` — Authenticated admin panel with AI spend |
| ![04b-limit-saved.png](comparison-results/expenses-hy4/04b-limit-saved.png) | `04b-limit-saved.png` — State after saving the usage limit |

#### Findings

- **administrator can sign in** (R6, `b-admin-login`): expect(received).toBe(expected) // Object.is equality Expected: "admin@comparison.local" Received: "guest-1795795587192" Call Log: - Timeout 20000ms exceeded while waiting on the predicate

### PR #4 — GPT 6.2 Sol (`expenses-gpt-6-2-sol`)

13 passed, 0 failed, 0 skipped across 13 recorded checks.

#### Unit tests

| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| entry amounts use minor units | R1 | PASS | — |
| invalid precision is rejected | R1 | PASS | — |
| cost helpers are present | R5 | PASS | — |

#### Functional tests


| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| assistant accepts a natural expense | R2 | PASS | — |
| finance screen lists income and expenses | R1 | PASS | — |
| an entry can be added through the form | R1 | PASS | — |
| administrator can sign in | R6 | PASS | — |
| admin panel renders spend and usage | R6 | PASS | — |
| admin exposes a running cost estimate | R5 | PASS | — |
| a usage limit can be set | R6 | PASS | — |
| API creates an entry that appears in the list | R1 | PASS | — |
| HTML and PDF reports render the new entry | R4 | PASS | — |
| sample data loads into the ledger | R3 | PASS | — |

#### Screenshots

| Screenshot | Flow step |
| --- | --- |
| ![01-chat-prompt.png](comparison-results/expenses-gpt-6-2-sol/01-chat-prompt.png) | `01-chat-prompt.png` — Natural-language expense typed into the chat composer |
| ![01b-chat-response.png](comparison-results/expenses-gpt-6-2-sol/01b-chat-response.png) | `01b-chat-response.png` — Assistant response to the typed expense |
| ![02-finance.png](comparison-results/expenses-gpt-6-2-sol/02-finance.png) | `02-finance.png` — Income/expense screen with entries |
| ![02a-transaction-form.png](comparison-results/expenses-gpt-6-2-sol/02a-transaction-form.png) | `02a-transaction-form.png` — Add-entry form filled in as a user would |
| ![02b-transaction-added.png](comparison-results/expenses-gpt-6-2-sol/02b-transaction-added.png) | `02b-transaction-added.png` — Submitted entry visible in the list |
| ![03-report-html.png](comparison-results/expenses-gpt-6-2-sol/03-report-html.png) | `03-report-html.png` — HTML report rendered with the submitted entry |
| ![04-admin.png](comparison-results/expenses-gpt-6-2-sol/04-admin.png) | `04-admin.png` — Authenticated admin panel with AI spend |
| ![04a-limit-form.png](comparison-results/expenses-gpt-6-2-sol/04a-limit-form.png) | `04a-limit-form.png` — Usage-limit control before saving |
| ![04b-limit-saved.png](comparison-results/expenses-gpt-6-2-sol/04b-limit-saved.png) | `04b-limit-saved.png` — State after saving the usage limit |

#### Findings

No failed checks for this branch.

### PR #3 — GPT 6.2 Astra (`expenses-gpt-6-2-astra`)

12 passed, 0 failed, 0 skipped across 12 recorded checks.

#### Unit tests

| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| money formats positive and negative values | R1 | PASS | — |
| usage module is present | R5 | PASS | — |

#### Functional tests


| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| assistant accepts a natural expense | R2 | PASS | — |
| finance screen lists income and expenses | R1 | PASS | — |
| an entry can be added through the form | R1 | PASS | — |
| administrator can sign in | R6 | PASS | — |
| admin panel renders spend and usage | R6 | PASS | — |
| admin exposes a running cost estimate | R5 | PASS | — |
| a usage limit can be set | R6 | PASS | — |
| API creates an entry that appears in the list | R1 | PASS | — |
| HTML and PDF reports render the new entry | R4 | PASS | — |
| sample data loads into the ledger | R3 | PASS | — |

#### Screenshots

| Screenshot | Flow step |
| --- | --- |
| ![01-chat-prompt.png](comparison-results/expenses-gpt-6-2-astra/01-chat-prompt.png) | `01-chat-prompt.png` — Natural-language expense typed into the chat composer |
| ![01b-chat-response.png](comparison-results/expenses-gpt-6-2-astra/01b-chat-response.png) | `01b-chat-response.png` — Assistant response to the typed expense |
| ![02-finance.png](comparison-results/expenses-gpt-6-2-astra/02-finance.png) | `02-finance.png` — Income/expense screen with entries |
| ![02a-transaction-form.png](comparison-results/expenses-gpt-6-2-astra/02a-transaction-form.png) | `02a-transaction-form.png` — Add-entry form filled in as a user would |
| ![02b-transaction-added.png](comparison-results/expenses-gpt-6-2-astra/02b-transaction-added.png) | `02b-transaction-added.png` — Submitted entry visible in the list |
| ![03-report-html.png](comparison-results/expenses-gpt-6-2-astra/03-report-html.png) | `03-report-html.png` — HTML report rendered with the submitted entry |
| ![04-admin.png](comparison-results/expenses-gpt-6-2-astra/04-admin.png) | `04-admin.png` — Authenticated admin panel with AI spend |
| ![04a-limit-form.png](comparison-results/expenses-gpt-6-2-astra/04a-limit-form.png) | `04a-limit-form.png` — Usage-limit control before saving |
| ![04b-limit-saved.png](comparison-results/expenses-gpt-6-2-astra/04b-limit-saved.png) | `04b-limit-saved.png` — State after saving the usage limit |

#### Findings

No failed checks for this branch.

### PR #2 — Open Code Big Pickle (`expenses-big-pickle`)

10 passed, 1 failed, 1 skipped across 12 recorded checks.

#### Unit tests

| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| rounding and conversion are exact | R1 | PASS | — |
| pricing module is present | R5 | PASS | — |

#### Functional tests


| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| assistant accepts a natural expense | R2 | PASS | — |
| finance screen lists income and expenses | R1 | PASS | — |
| an entry can be added through the form | R1 | PASS | — |
| administrator can sign in | R6 | PASS | — |
| admin panel renders spend and usage | R6 | PASS | — |
| admin exposes a running cost estimate | R5 | PASS | — |
| a usage limit can be set | R6 | PASS | — |
| API creates an entry that appears in the list | R1 | PASS | — |
| HTML and PDF reports render the new entry | R4 | FAIL | apiRequestContext.get: Timeout 30000ms exceeded. Call log: - → GET http://localhost:3115/api/reports?format=html - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/159.0.8154.6 Safari/537.36 - accept: */* - accept-encoding: gzip,deflate,br - cookie: authjs.callback-url… |
| no sample-data API discovered | R3 | SKIP | — |

#### Screenshots

| Screenshot | Flow step |
| --- | --- |
| ![01-chat-prompt.png](comparison-results/expenses-big-pickle/01-chat-prompt.png) | `01-chat-prompt.png` — Natural-language expense typed into the chat composer |
| ![01b-chat-response.png](comparison-results/expenses-big-pickle/01b-chat-response.png) | `01b-chat-response.png` — Assistant response to the typed expense |
| ![02-finance.png](comparison-results/expenses-big-pickle/02-finance.png) | `02-finance.png` — Income/expense screen with entries |
| ![02a-transaction-form.png](comparison-results/expenses-big-pickle/02a-transaction-form.png) | `02a-transaction-form.png` — Add-entry form filled in as a user would |
| ![02b-transaction-added.png](comparison-results/expenses-big-pickle/02b-transaction-added.png) | `02b-transaction-added.png` — Submitted entry visible in the list |
| ![04-admin.png](comparison-results/expenses-big-pickle/04-admin.png) | `04-admin.png` — Authenticated admin panel with AI spend |
| ![04b-limit-saved.png](comparison-results/expenses-big-pickle/04b-limit-saved.png) | `04b-limit-saved.png` — State after saving the usage limit |

#### Findings

- **HTML and PDF reports render the new entry** (R4, `b-reports`): apiRequestContext.get: Timeout 30000ms exceeded. Call log: - → GET http://localhost:3115/api/reports?format=html - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/159.0.8154.6 Safari/537.36 - accept: */* - accept-encoding: gzip,deflate,br - cookie: authjs.callback-url…

### PR #1 — Copilot Fusion GPT 6 Luna (`expenses-copilot-luna-6`)

12 passed, 0 failed, 0 skipped across 12 recorded checks.

#### Unit tests

| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| model pricing is correct | R5 | PASS | — |
| admin cap overrides personal cap | R6 | PASS | — |

#### Functional tests


| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| assistant accepts a natural expense | R2 | PASS | — |
| finance screen lists income and expenses | R1 | PASS | — |
| an entry can be added through the form | R1 | PASS | — |
| administrator can sign in | R6 | PASS | — |
| admin panel renders spend and usage | R6 | PASS | — |
| admin exposes a running cost estimate | R5 | PASS | — |
| a usage limit can be set | R6 | PASS | — |
| API creates an entry that appears in the list | R1 | PASS | — |
| HTML and PDF reports render the new entry | R4 | PASS | — |
| sample data loads into the ledger | R3 | PASS | — |

#### Screenshots

| Screenshot | Flow step |
| --- | --- |
| ![01-chat-prompt.png](comparison-results/expenses-copilot-luna-6/01-chat-prompt.png) | `01-chat-prompt.png` — Natural-language expense typed into the chat composer |
| ![01b-chat-response.png](comparison-results/expenses-copilot-luna-6/01b-chat-response.png) | `01b-chat-response.png` — Assistant response to the typed expense |
| ![02-finance.png](comparison-results/expenses-copilot-luna-6/02-finance.png) | `02-finance.png` — Income/expense screen with entries |
| ![02a-transaction-form.png](comparison-results/expenses-copilot-luna-6/02a-transaction-form.png) | `02a-transaction-form.png` — Add-entry form filled in as a user would |
| ![02b-transaction-added.png](comparison-results/expenses-copilot-luna-6/02b-transaction-added.png) | `02b-transaction-added.png` — Submitted entry visible in the list |
| ![03-report-html.png](comparison-results/expenses-copilot-luna-6/03-report-html.png) | `03-report-html.png` — HTML report rendered with the submitted entry |
| ![04-admin.png](comparison-results/expenses-copilot-luna-6/04-admin.png) | `04-admin.png` — Authenticated admin panel with AI spend |
| ![04b-limit-saved.png](comparison-results/expenses-copilot-luna-6/04b-limit-saved.png) | `04b-limit-saved.png` — State after saving the usage limit |

#### Findings

No failed checks for this branch.

## 8. Cross-cutting findings and recommendations

- **Data-entry and API flows are broadly sound.** Five of six branches passed the form, list and API checks; the chat composer worked on every branch.
- **Reports are the least consistent surface.** Big Pickle's report route fails to compile because `pdfkit` is not installed; Nemotron exposes no HTTP report endpoint.
- **Admin coverage requires allowlist configuration.** Branches gate admin access either by e-mail or by user id. The harness seeds one identity and configures all four mechanisms so the admin panel and limit changes are genuinely exercised rather than visited as a guest.
- **UI sign-in is flaky on some branches.** A server-action sign-in sometimes stays in its loading state; a NextAuth credentials API fallback keeps the admin checks meaningful, and the UI attempt remains a recorded check.
- **Sample data exists on four branches** (Hy4, Sol, Astra, Luna). Nemotron and Big Pickle have no discoverable sample-data endpoint.
- **Nemotron needs the most work:** the natural-language parser returns `null`, and `components/expenses/expenses-overview.tsx` uses `useState` without a client directive, which breaks the finance and admin routes.
- **Big Pickle needs a single dependency fix:** add `pdfkit` to make its HTML/PDF report route compile.

## 9. Reproducing this report

```powershell
$env:POSTGRES_ADMIN_URL = 'postgres://postgres:postgres@127.0.0.1:5433/postgres'
pnpm exec playwright install chromium
.\comparison\run.ps1
node comparison\report.mjs
node comparison\full-report.mjs
```

`run.ps1 -Branches expenses-hy4` limits the run to one branch. Generated artifacts are written under `comparison-results/` and server logs under `%TEMP%\ai-chatbot-comparison-logs\`.

## Appendix A — artifact inventory

| Path | Contents |
| --- | --- |
| `comparison/run.ps1` | Full runner: databases, worktrees, migrations, admin seed, servers, suites |
| `comparison/create-databases.mjs` | Creates the six isolated `fcmp_*` databases |
| `comparison/seed-admin.mjs` | Seeds the known administrator identity |
| `comparison/report.mjs` | Generates `run-summary.md` and `COMPARISON.md` |
| `comparison/full-report.mjs` | Generates this report |
| `playwright.comparison.config.ts` | Playwright configuration for the browser suite |
| `tests/comparison/config.ts` | Per-branch UI/API surface definitions |
| `tests/comparison/unit.test.ts` | Domain unit checks |
| `tests/comparison/features.spec.ts` | Human-like browser journeys |
| `tests/comparison/results.ts` | JSON check recorder |
| `comparison-results/<branch>/*.png` | Screenshots of the captured flow |
| `comparison-results/<branch>/*-results.json` | Raw pass/fail/skip results |
