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

## Income and expenses

Open **Income & expenses** in the chat sidebar to record a dated USD transaction or load three sample entries. In a private conversation, try “Record $24.50 for groceries today”, then “Change that grocery expense to $21”. The standard chat model can list, add, edit and delete your entries. Financial details shared in a public conversation are visible to its readers.

Open **HTML / PDF report** for your full ledger with income, expenses and net totals. Download the HTML file or choose **Print / Save as PDF** and select your browser's PDF destination.

## Operating costs and limits

Run `pnpm db:migrate` and set `FINANCE_ADMIN_IDS` to the comma-separated database user UUIDs of your administrators. Open `/admin` for monthly model spend, usage that is still unpriced, and a global daily model-call limit. Each title, model step and artifact generation consumes a call. Failed or interrupted requests also consume a slot. The limit resets at midnight UTC.

The estimate uses $1.25 per million input tokens and $2.50 per million output tokens for Grok 4.3. For example, 10,000 interactions averaging 2,000 input and 500 output tokens across all their model calls cost **$37.50** in text generation. The app separately estimates image generation at $0.07 per successful image. Provider discounts, incomplete streams and price changes can affect billed totals. Add your actual hosting, Postgres, object storage, bandwidth and optional Redis charges to estimate your monthly operating cost. [xAI text pricing](https://docs.x.ai/developers/migration/may-15-retirement)

## Model Providers

The production language models use xAI Grok 4.3. The test environment uses the existing mock models.

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
