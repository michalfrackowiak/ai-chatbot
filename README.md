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

### Running the tests

The Playwright suite mocks the language models, so it needs only Postgres and `AUTH_SECRET` — no
API key:

```bash
docker compose up -d
pnpm db:migrate
pnpm exec playwright install chromium
pnpm test
```
## Income, expenses and AI usage

- Open **Income & expenses** from the chat workspace to add, edit or delete entries. **Load sample data** adds four example transactions to your own ledger. Totals are calculated independently for each currency.
- Ask the assistant in a private conversation to manage the ledger. For example, ask “Add a 45 PLN grocery expense for today.” The ledger refreshes as soon as the change is saved. A conversation that accesses the ledger stays private.
- Use **Download HTML** for a standalone report or **Print / save PDF** and choose **Save as PDF** in the browser print dialog. Both reports use the same layout and currency totals.
- Run `pnpm db:migrate` against your configured `POSTGRES_URL` before starting the app. To enable **AI usage**, set `AI_ADMIN_USER_IDS` to the comma-separated IDs of existing regular accounts from the `User` table, then restart. This grants access to the dashboard and limit controls at `/admin/usage`.
- The dashboard tracks model calls, tokens, generated images and estimated USD spend for the current UTC month. The monthly call limit applies to individual provider attempts, including title generation, artifacts and tool follow-ups. The monthly budget checks recorded spend before starting new calls. In-flight and unreported usage can increase the provider bill beyond the estimate.

At standard uncached rates, 1 million input tokens, 250,000 output tokens and 100 generated images cost about **$3.88**. The defaults are Grok 4.20 for text and Grok Imagine Image for image generation. The estimate uses reported token counts at standard rates and does not account for cache or high-context pricing. [Text model rates](https://docs.x.ai/developers/models/grok-4.20-0309-non-reasoning) · [Reasoning model rates](https://docs.x.ai/developers/models/grok-4.20-0309-reasoning) · [Image rates](https://docs.x.ai/developers/models/grok-imagine-image)

On Vercel Pro, an example starting total is **$23.88/month** with $20/month hosting plus the AI workload above. Database, file storage, optional Redis, infrastructure overages and taxes depend on the deployment. [Vercel pricing](https://vercel.com/pricing)
