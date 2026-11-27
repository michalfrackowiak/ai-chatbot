# Expense feature comparison (v2)

Every cell is the result of checks that were executed against that branch,
not a manual review. `FAIL (n/m)` means n of m checks for that requirement
failed; `PASS` means all executed checks passed; `SKIP` means the branch
exposes no observable surface for that requirement.

| Requirement | `expenses-nemotron-3-5-lightning` | `expenses-hy4` | `expenses-gpt-6-2-sol` | `expenses-gpt-6-2-astra` | `expenses-big-pickle` | `expenses-copilot-luna-6` |
| --- | --- | --- | --- | --- | --- | --- |
| **R1** Income and expenses can be added and listed | FAIL (3/4) | PASS (5/5) | PASS (5/5) | PASS (4/4) | PASS (4/4) | PASS (3/3) |
| **R2** The assistant can manage them and the list updates | FAIL (1/2) | PASS (1/1) | PASS (1/1) | PASS (1/1) | PASS (1/1) | PASS (1/1) |
| **R3** Sample data is available | SKIP (1) | PASS (1/1) | PASS (1/1) | PASS (1/1) | SKIP (1) | PASS (1/1) |
| **R4** Reports can be exported as HTML or PDF | SKIP (1) | PASS (1/1) | PASS (1/1) | PASS (1/1) | FAIL (1/1) | PASS (1/1) |
| **R5** Running cost can be estimated | FAIL (1/2) | PASS (2/2) | PASS (2/2) | PASS (2/2) | PASS (2/2) | PASS (2/2) |
| **R6** Admin panel shows AI spend and can set usage limits | FAIL (2/2) | FAIL (1/4) | PASS (3/3) | PASS (3/3) | PASS (3/3) | PASS (4/4) |

## Findings by branch

### [#6](6) Nemotron 3.5 Lightning — `expenses-nemotron-3-5-lightning`

Screenshots: [expenses-nemotron-3-5-lightning](expenses-nemotron-3-5-lightning)

| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| natural expense phrase parses | R2 | FAIL | Expected values to be strictly deep-equal: + actual - expected  + null - { -   amount: '24.50', -   description: 'coffee', -   type: 'expense' - }  |
| natural income phrase parses | R1 | FAIL | Expected values to be strictly deep-equal: + actual - expected  + null - { -   amount: '1200.50', -   description: 'salary', -   type: 'income' - }  |
| cost/usage schema is present | R5 | PASS |  |
| assistant accepts a natural expense | R2 | PASS |  |
| finance screen lists income and expenses | R1 | FAIL | [2mexpect([22m[31mlocator[39m[2m).not.[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed  Locator: locator('body') Expected pattern: not [32m/build error\|internal server error\|app |
| an entry can be added through the form | R1 | FAIL | locator.evaluate: Timeout 10000ms exceeded. Call log: [2m  - waiting for getByText('Expenses', { exact: true }).first()[22m  |
| admin panel renders spend and usage | R6 | FAIL | [2mexpect([22m[31mpage[39m[2m).[22mtoHaveURL[2m([22m[32mexpected[39m[2m)[22m failed  Expected pattern: [32m/\/admin/[39m Received string:  [31m"http://localhost:3111/api/auth/guest?redi |
| admin exposes a running cost estimate | R5 | FAIL | [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed  Locator: locator('body') Timeout: 10000ms Expected pattern: [32m/cost\|spend\|\$\|usd/i[39m Re |
| a usage limit can be set | R6 | FAIL | locator.fill: Timeout 10000ms exceeded. Call log: [2m  - waiting for locator('input[placeholder="e.g., 50"]')[22m  |
| no finance API on this branch | R1 | SKIP |  |
| no report API on this branch | R4 | SKIP |  |
| no sample-data API discovered | R3 | SKIP |  |

### [#5](5) Tencent Hy4 — `expenses-hy4`

Screenshots: [expenses-hy4](expenses-hy4)

| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| dollars convert to cents | R1 | PASS |  |
| transaction input is validated | R1 | PASS |  |
| usage limit input is validated | R6 | PASS |  |
| pricing and formatting work | R5 | PASS |  |
| assistant accepts a natural expense | R2 | PASS |  |
| finance screen lists income and expenses | R1 | PASS |  |
| an entry can be added through the form | R1 | PASS |  |
| administrator can sign in | R6 | FAIL | [2mexpect([22m[31mreceived[39m[2m).[22mtoBe[2m([22m[32mexpected[39m[2m) // Object.is equality[22m  Expected: [32m"admin@comparison.local"[39m Received: [31m"guest-1795795587192"[39m  C |
| admin panel renders spend and usage | R6 | PASS |  |
| admin exposes a running cost estimate | R5 | PASS |  |
| a usage limit can be set | R6 | PASS |  |
| API creates an entry that appears in the list | R1 | PASS |  |
| HTML and PDF reports render the new entry | R4 | PASS |  |
| sample data loads into the ledger | R3 | PASS |  |

### [#4](4) GPT 6.2 Sol — `expenses-gpt-6-2-sol`

Screenshots: [expenses-gpt-6-2-sol](expenses-gpt-6-2-sol)

| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| entry amounts use minor units | R1 | PASS |  |
| invalid precision is rejected | R1 | PASS |  |
| cost helpers are present | R5 | PASS |  |
| assistant accepts a natural expense | R2 | PASS |  |
| finance screen lists income and expenses | R1 | PASS |  |
| an entry can be added through the form | R1 | PASS |  |
| administrator can sign in | R6 | PASS |  |
| admin panel renders spend and usage | R6 | PASS |  |
| admin exposes a running cost estimate | R5 | PASS |  |
| a usage limit can be set | R6 | PASS |  |
| API creates an entry that appears in the list | R1 | PASS |  |
| HTML and PDF reports render the new entry | R4 | PASS |  |
| sample data loads into the ledger | R3 | PASS |  |

### [#3](3) GPT 6.2 Astra — `expenses-gpt-6-2-astra`

Screenshots: [expenses-gpt-6-2-astra](expenses-gpt-6-2-astra)

| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| money formats positive and negative values | R1 | PASS |  |
| usage module is present | R5 | PASS |  |
| assistant accepts a natural expense | R2 | PASS |  |
| finance screen lists income and expenses | R1 | PASS |  |
| an entry can be added through the form | R1 | PASS |  |
| administrator can sign in | R6 | PASS |  |
| admin panel renders spend and usage | R6 | PASS |  |
| admin exposes a running cost estimate | R5 | PASS |  |
| a usage limit can be set | R6 | PASS |  |
| API creates an entry that appears in the list | R1 | PASS |  |
| HTML and PDF reports render the new entry | R4 | PASS |  |
| sample data loads into the ledger | R3 | PASS |  |

### [#2](2) Open Code Big Pickle — `expenses-big-pickle`

Screenshots: [expenses-big-pickle](expenses-big-pickle)

| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| rounding and conversion are exact | R1 | PASS |  |
| pricing module is present | R5 | PASS |  |
| assistant accepts a natural expense | R2 | PASS |  |
| finance screen lists income and expenses | R1 | PASS |  |
| an entry can be added through the form | R1 | PASS |  |
| administrator can sign in | R6 | PASS |  |
| admin panel renders spend and usage | R6 | PASS |  |
| admin exposes a running cost estimate | R5 | PASS |  |
| a usage limit can be set | R6 | PASS |  |
| API creates an entry that appears in the list | R1 | PASS |  |
| HTML and PDF reports render the new entry | R4 | FAIL | apiRequestContext.get: Timeout 30000ms exceeded. Call log: [2m  - → GET http://localhost:3115/api/reports?format=html[22m [2m    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/ |
| no sample-data API discovered | R3 | SKIP |  |

### [#1](1) Copilot Fusion GPT 6 Luna — `expenses-copilot-luna-6`

Screenshots: [expenses-copilot-luna-6](expenses-copilot-luna-6)

| Check | Requirement | Result | Detail |
| --- | --- | --- | --- |
| model pricing is correct | R5 | PASS |  |
| admin cap overrides personal cap | R6 | PASS |  |
| assistant accepts a natural expense | R2 | PASS |  |
| finance screen lists income and expenses | R1 | PASS |  |
| an entry can be added through the form | R1 | PASS |  |
| administrator can sign in | R6 | PASS |  |
| admin panel renders spend and usage | R6 | PASS |  |
| admin exposes a running cost estimate | R5 | PASS |  |
| a usage limit can be set | R6 | PASS |  |
| API creates an entry that appears in the list | R1 | PASS |  |
| HTML and PDF reports render the new entry | R4 | PASS |  |
| sample data loads into the ledger | R3 | PASS |  |

