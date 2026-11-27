# AI Chatbot

AI Chatbot is a web-based conversational assistant built with the Next.js App Router and Vercel AI SDK. It combines streaming chat with persistent conversation history and an artifact workspace for creating and editing content.

## Features

- Guest and email/password authentication, with private and shareable public chats.
- Streaming responses, chat history, and resumable generations when Redis is configured.
- Chat and reasoning model choices, powered by xAI models in the application configuration.
- AI-generated text, code, image, and spreadsheet artifacts, with document suggestions and edits.
- Weather lookup and JPEG/PNG image uploads (up to 5 MB; uploads use Vercel Blob).
- PostgreSQL persistence for users, chats, messages, documents, votes, and streams.

## Technology

- Next.js App Router, React, TypeScript, and Tailwind CSS.
- Vercel AI SDK and xAI provider.
- Auth.js credentials authentication.
- PostgreSQL accessed with Drizzle ORM; optional Redis for resumable streams.
- Playwright for route and browser end-to-end tests.

## Getting started

### Requirements

- Node.js
- pnpm 9.12.3 (the version specified by `package.json`)
- Docker Compose for the local PostgreSQL and Redis services

### Configure the environment

Copy `.env.example` to `.env.local` and set the values:

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Secret used by Auth.js |
| `POSTGRES_URL` | PostgreSQL connection string |
| `XAI_API_KEY` | xAI API key for live model responses |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for image uploads |
| `REDIS_URL` | Optional Redis connection for resumable streams |

For local development, the included Compose file starts PostgreSQL on host port `5433` and Redis on `6379`. Use the following local database and Redis URLs in `.env.local`:

```dotenv
POSTGRES_URL=postgres://postgres:postgres@localhost:5433/ai_chatbot
REDIS_URL=redis://localhost:6379
```

Set a local `AUTH_SECRET` and a valid `XAI_API_KEY` as well. A Blob token is only needed to use image uploads. Without Redis, chat works but resumable streams are disabled.

### Install and run

```bash
docker compose up -d
pnpm install
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

The Playwright suite contains API route and browser end-to-end tests. It selects mock language models when run with the test environment enabled, so tests do not require an xAI API key.

```bash
docker compose up -d
pnpm db:migrate
pnpm exec playwright install chromium
pnpm test
```

## Project layout

- `app/` — application pages, authentication, and API routes.
- `components/` — chat interface, editors, and UI components.
- `lib/ai/` — model configuration, prompts, and AI tools.
- `lib/artifacts/` and `artifacts/` — artifact handlers and client/server renderers.
- `lib/db/` — Drizzle schema, migrations, queries, and database utilities.
- `tests/` — Playwright route and end-to-end tests.
