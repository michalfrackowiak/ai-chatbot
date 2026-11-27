<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Chat SDK</h1>
</a>

<p align="center">
    Chat SDK is a free, open-source template built with Next.js and the AI SDK that helps you quickly build powerful chatbot applications.
</p>

<p align="center">
  <a href="https://chat-sdk.dev"><strong>Read Docs</strong></a> ·
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports xAI (default), OpenAI, Fireworks, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [Auth.js](https://authjs.dev)
  - Simple and secure authentication

## Model Providers

This template ships with [xAI](https://x.ai) `grok-2-1212` as the default chat model. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.

## Deploy Your Own

You can deploy your own version of the Next.js AI Chatbot to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot&env=AUTH_SECRET&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https%3A%2F%2Fgithub.com%2Fvercel%2Fai-chatbot%2Fblob%2Fmain%2F.env.example&demo-title=AI+Chatbot&demo-description=An+Open-Source+AI+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&demo-url=https%3A%2F%2Fchat.vercel.ai&products=%5B%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22ai%22%2C%22productSlug%22%3A%22grok%22%2C%22integrationSlug%22%3A%22xai%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22neon%22%2C%22integrationSlug%22%3A%22neon%22%7D%2C%7B%22type%22%3A%22integration%22%2C%22protocol%22%3A%22storage%22%2C%22productSlug%22%3A%22upstash-kv%22%2C%22integrationSlug%22%3A%22upstash%22%7D%2C%7B%22type%22%3A%22blob%22%7D%5D)

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run Next.js AI Chatbot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various AI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000).

### Local Postgres and Redis with Docker

If you'd rather not point at a hosted database, `docker-compose.yml` brings up the Postgres and
Redis this app needs. Postgres is published on host port **5433** so it doesn't collide with an
existing local Postgres on 5432.

```bash
docker compose up -d
```

Then put these in `.env.local` (it is gitignored):

```bash
AUTH_SECRET=any-random-string
POSTGRES_URL=postgres://postgres:postgres@localhost:5433/ai_chatbot
REDIS_URL=redis://localhost:6379
```

Apply the schema, then start the app:

```bash
pnpm db:migrate
pnpm dev
```

`REDIS_URL` is optional — without it, resumable streams are disabled and everything else works.
Add `XAI_API_KEY` to talk to a real model.

## Income, expenses and AI spend

This branch adds a small personal-finance layer on top of the chatbot.

### Managing money

- **`/finance`** lists income and expenses with income / expense / balance cards, filters and
  add / edit / delete forms. Amounts are stored as integer cents in USD.
- **In chat**, just talk to the assistant: “I spent 42.50 on groceries yesterday”,
  “how much did I spend on rent?”, “delete my last taxi expense”. The assistant uses
  `addTransaction`, `listTransactions`, `editTransaction` and `removeTransaction` tools.
  When a tool changes data, the sidebar finance widget and the `/finance` list re-fetch
  immediately through a shared SWR key.
- **Sample data**: click **Load sample data** on `/finance` (idempotent), or run
  `pnpm db:seed` to create a `demo@chat.local` / `demo1234` account with 22 sample entries.
- **Reports**: `/api/reports?format=html` and `/api/reports?format=pdf` produce a printable
  HTML report and a dependency-free PDF with totals, category breakdown and all rows.
  Buttons for both are on `/finance`.

### Cost of running the app

`lib/ai/pricing.ts` holds the per-million-token rates used for cost accounting, e.g.
`grok-2-1212` / `grok-2-vision-1212` at **$2 in / $10 out** and `grok-3-mini-beta` at
**$0.30 in / $0.50 out** (verify at <https://docs.x.ai/developers/pricing>). Every chat
generation and title generation records prompt tokens, completion tokens and computed cost
in the `AiUsage` table.

The **admin panel** at `/admin` shows month-to-date AI spend, tokens, requests, spend by
model, a daily chart, and a calculator for estimating monthly cost from message volume.
Access is granted by adding your email to `ADMIN_EMAILS` (comma-separated) and signing in
with that account. These figures cover AI tokens only — hosting, Postgres, Blob and Redis
are billed separately.

### Usage limits

Chat requests are checked against a monthly cost cap and token cap. Defaults are $5 /
2M tokens per month for registered users and $1 / 400k for guests. Admins can raise,
lower or disable limits per user in `/admin`; overrides live in the `UsageLimit` table.

Apply the new tables with `pnpm db:migrate`.

### Running the tests

The Playwright suite mocks the language models, so it needs only Postgres and `AUTH_SECRET` — no
API key:

```bash
docker compose up -d
pnpm db:migrate
pnpm exec playwright install chromium
pnpm test
```
