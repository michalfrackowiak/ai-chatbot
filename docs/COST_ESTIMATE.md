# What does it cost to run this app?

Estimates in USD, checked against published provider prices in November 2026. They are planning numbers, not quotes: check the linked pricing pages before committing to a budget.

## 1. Fixed infrastructure

| Item | Free / small scale | Paid / production |
| --- | --- | --- |
| Vercel hosting | Hobby: $0/month (non-commercial) | Pro: $20/month for one developer seat, including $20 of usage credit; extra deploying seats $20/month each ([Vercel pricing](https://vercel.com/pricing)) |
| Neon Postgres | Free: $0/month, 100 CU-hours and 1 GB per project | Launch: usage-based, $0.106/CU-hour + $0.35/GB-month, no minimum; Neon quotes ~$15/month for intermittent load with 1 GB ([Neon pricing](https://neon.com/pricing)) |
| Upstash Redis (optional, resumable streams) | Free tier | Usage-based if streams grow |
| Vercel Blob (optional, attachments) | Included allowance | Usage-based |

**Practical lower bound:** $0–$20/month for hosting and database at hobby/prototype scale. A small team on Vercel Pro with an intermittently active Neon database is roughly $20–$40/month plus any on-demand usage.

## 2. AI model usage

`lib/ai/pricing.ts` holds the rates used by the admin panel. They follow xAI's published per-1M-token prices ([xAI pricing](https://docs.x.ai/developers/pricing)):

| App model | Provider model | Input / 1M | Output / 1M |
| --- | --- | --- | --- |
| `chat-model` | grok-2-vision-1212 | $2.00 | $10.00 |
| `chat-model-reasoning` | grok-3-mini-beta | $0.30 | $0.50 |
| `title-model`, `artifact-model` | grok-2-1212 | $2.00 | $10.00 |

Cost per request = `(input tokens × input rate + output tokens × output rate) / 1,000,000`.

Example, assuming ~4,000 input tokens and 800 output tokens per turn (including chat history):

| Scenario | Cost per turn | 1,000 turns/month | 10,000 turns/month |
| --- | --- | --- | --- |
| All on `chat-model` | ~$0.016 | ~$16 | ~$160 |
| All on `chat-model-reasoning` | ~$0.0016 | ~$1.60 | ~$16 |
| 50/50 mix | ~$0.0088 | ~$8.80 | ~$88 |

Each new chat also generates a title with `grok-2-1212`; at ~500 input / 50 output tokens that is about $0.0015 per new chat.

Caveats: long-context tiers, cached-input discounts and image generation (`grok-2-image`) are not in the per-token table, so actual invoices can differ. The token counts used for the admin panel are what the AI SDK reports at the end of each streamed response.

## 3. Putting it together

| Usage profile | Infrastructure | AI | Total / month |
| --- | --- | --- | --- |
| Prototype, one developer, a few chats | $0–$20 | < $1 | ~$0–$21 |
| Small team, ~1,000 mixed turns/month | ~$20–$40 | ~$5–$20 | ~$25–$60 |
| Busy app, ~10,000 mixed turns/month | ~$40+ | ~$50–$160 | ~$90–$200+ |

## 4. Controlling the bill

- `/admin` shows per-user request counts, token totals and estimated spend for the current month and all time.
- Set a **global** daily-message and monthly-spend cap, then override individual users. Use `-1` for unlimited and leave a field blank to inherit the global default.
- The chat route checks the daily message cap before responding and the monthly spend cap before starting a stream. The existing per-user overrides take precedence over global settings.
- Out of the box, guests get 20 messages/day, signed-in users get 100, and everyone gets a $10/month estimated-spend cap. An admin can replace these with global defaults and per-user overrides.

To reconcile estimates with reality, compare the admin totals with the xAI console invoice at the end of each month and update `lib/ai/pricing.ts` if rates change.
