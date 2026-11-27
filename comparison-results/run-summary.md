# Comparison run results

| Branch | Migration | Unit suite exit | Browser suite exit | Screenshots |
| --- | --- | ---: | ---: | --- |
| `expenses-nemotron-3-5-lightning` | passed | 1 | 1 | [comparison-results/expenses-nemotron-3-5-lightning](comparison-results/expenses-nemotron-3-5-lightning) |
| `expenses-hy4` | passed | 0 | 0 | [comparison-results/expenses-hy4](comparison-results/expenses-hy4) |
| `expenses-gpt-6-2-sol` | passed | 0 | 1 | [comparison-results/expenses-gpt-6-2-sol](comparison-results/expenses-gpt-6-2-sol) |
| `expenses-gpt-6-2-astra` | passed | 0 | 1 | [comparison-results/expenses-gpt-6-2-astra](comparison-results/expenses-gpt-6-2-astra) |
| `expenses-big-pickle` | passed | 0 | 1 | [comparison-results/expenses-big-pickle](comparison-results/expenses-big-pickle) |
| `expenses-copilot-luna-6` | failed; schema push succeeded | 0 | 1 | [comparison-results/expenses-copilot-luna-6](comparison-results/expenses-copilot-luna-6) |

## Findings

- **Nemotron:** both parser unit cases returned `null`; browser flow could not find the Expenses screen, so the API and sample-data cases were skipped.
- **Hy4:** domain unit and all three browser cases passed, including transaction form, report formats, and sample data.
- **Sol:** domain unit, report/API, and sample-data cases passed; a transaction submitted through the UI did not appear in the list.
- **Astra:** domain unit, report/API, and sample-data cases passed; the form flow stalled on an `Income & expenses` summary outside the viewport.
- **Big Pickle:** all 16 native unit tests and the added domain check passed; chat/navigation passed, but the report endpoint returned a non-success status and the sample-data case was skipped.
- **Luna:** domain unit, report/API, and sample-data cases passed. Migration failed because `Chat.title` already existed; isolated `db:push` fallback succeeded. The form flow could not find `#type`.

All six branches have chat and finance screenshots. Additional form, saved-entry,
and admin-route screenshots exist only when that step completed. Admin screens
were visited as a guest; role-gated usage totals and limit editing were not
validated.
