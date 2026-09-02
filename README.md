# Dementia Clinical Coach

A clinical decision support web application for primary care providers. It assists in the recognition, evaluation, and diagnosis of dementia using evidence-based medical resources, grounded in the Ariadne Labs **Essential Communications Toolkit**.

This codebase is a **Next.js 15 + PostgreSQL + Drizzle + Better Auth** single-stack app, containerized for Docker. The previous Vite + Firebase architecture has been fully removed.

---

## Table of contents

- [Quick start (Docker)](#quick-start-docker)
- [Local development without Docker](#local-development-without-docker)
- [Environment variables](#environment-variables)
- [Project layout](#project-layout)
- [Database, migrations, and RAG](#database-migrations-and-rag)
- [Admin management](#admin-management)
- [Deployment](#deployment)
- [Key rotation runbook](#key-rotation-runbook)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [In collaboration with](#in-collaboration-with)
- [Security warning (PHI)](#security-warning-phi)

---

## Quick start (Docker)

This is the fastest way to get the app running locally for a new developer.

### 1. Prerequisites

- **Node.js 20+** (matches the Dockerfile)
- **Docker + Docker Compose v2** — `docker compose version` should print `v2.x`
- **One LLM provider key** — `HARVARD_OPENAI_KEY` (recommended). `GEMINI_API_KEY` is an optional fallback.

### 2. Clone and configure

```bash
git clone https://github.com/Arkoys/ai-essential-communication-for-dementia.git
cd ai-essential-communication-for-dementia

# Copy the template. NEVER commit a populated .env.local.
cp .env.example .env.local
```

Edit `.env.local` and fill in at least:

- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 48`
- `ADMIN_EMAILS` — comma-separated list of emails that should see the Admin panel
- One of `HARVARD_OPENAI_KEY`, `GEMINI_API_KEY`
- Set `NEXT_PUBLIC_ADMIN_EMAILS` to the same value as `ADMIN_EMAILS` (it's safe to ship to the browser — only used to gate the Admin button)

### 3. Boot the stack

```bash
docker compose up --build
```

This brings up three services:

| Service | Port | Purpose |
|---|---|---|
| `postgres` | 5432 | Postgres 16 with the `pgvector` extension |
| `migrate` | — | One-shot: applies Drizzle migrations on every stack boot |
| `next` | 3000 | Next.js dev server with hot reload |

Open **http://localhost:3000** and sign up for the first account.

### 4. Sanity check

```bash
npm run smoke     # inside the repo, with .env.local loaded
```

Verifies: env vars present, Postgres reachable, pgvector installed, every required table exists, migrations applied, and Better Auth's `account.issuer` shape is correct.

---

## Local development without Docker

If you already have Postgres + pgvector installed (or want to use a hosted instance like Neon):

```bash
# 1. Point your env at your own Postgres
echo 'DATABASE_URL=postgres://user:pass@localhost:5432/dementia_coach' >> .env.local

# 2. Install deps and run migrations
npm install
npm run db:migrate

# 3. Start the dev server
npm run dev
```

The app reads Postgres directly via `DATABASE_URL`. The rest of the env behaves identically to the Docker flow.

---
## Environment variables

All variables live in `.env.local` (Docker compose reads the same file). The full template is in [`.env.example`](./.env.example).

### Required

| Variable | Purpose | Used by |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | Drizzle, every API route |
| `BETTER_AUTH_SECRET` | HMAC secret for sessions (≥32 chars) | Better Auth cookie signing |
| `BETTER_AUTH_URL` | Public URL the app is served at | Better Auth trusted origins / cookies |
| `ADMIN_EMAILS` | Comma-separated admin allowlist | `lib/admin.ts` (RAG mutations) |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Mirror of `ADMIN_EMAILS` for the client | `lib/auth-client.ts` (UI gating) |
| `LLM_PROVIDER` | `harvard` \| `gemini` | `/api/chat` proxy |
| `HARVARD_OPENAI_KEY` (recommended) or `GEMINI_API_KEY` (optional fallback) | LLM provider credentials | `/api/chat`, `/api/knowledge-chunks` |

### Optional

| Variable | Default | Purpose |
|---|---|---|
| `HARVARD_MODEL` | `gpt-5.5` | Default Harvard model |
| `HARVARD_OPENAI_BASE_URL` | Harvard gateway URL | Override for testing |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Used by Better Auth client during SSR |
| `NODE_ENV` | `development` | Standard Next.js |

### Security rules

1. **Never** prefix a secret with `NEXT_PUBLIC_`. Next.js inlines `NEXT_PUBLIC_*` into the JS bundle and ships it to every browser. Keep API keys and the Better Auth secret server-side.
2. The `.env.example` file is committed; `.env.local` is git-ignored.
3. If a key ever leaks to a public surface, rotate immediately (see [Key rotation runbook](#key-rotation-runbook)).

---

## Project layout

```
.
├── docker-compose.yml          # Dev stack: postgres + migrate + next
├── docker-compose.prod.yml     # Prod stack: postgres + migrate + next + nginx
├── Dockerfile                  # Multi-stage Next.js standalone build
├── nginx/                      # Reverse proxy (SSL, gzip, SSE-friendly)
├── scripts/
│   ├── migrate.ts              # Idempotent Drizzle migration runner
│   └── smoke.ts                # `npm run smoke` — env/DB/table check
├── drizzle/                    # SQL migrations (committed)
│   ├── 0000_*.sql              # Initial schema (Better Auth + app + pgvector)
│   ├── 0001_prompt_settings_columns.sql
│   ├── 0002_message_lane.sql
│   └── meta/_journal.json      # drizzle-kit journal
├── lib/                        # Server-only modules (auth, db, admin)
│   ├── auth.ts                 # Better Auth instance
│   ├── auth-server.ts          # `requireUser()` helper for route handlers
│   ├── auth-client.ts          # React hooks + `isAdminFromSession()`
│   ├── admin.ts                # Server-side admin allowlist
│   ├── api-client.ts           # Client wrapper over /api/*
│   ├── db/
│   │   ├── index.ts            # Drizzle pool (HMR-safe singleton)
│   │   └── schema.ts           # All tables + enums
│   ├── env.ts                  # zod-validated server env
│   ├── prompt-settings-shared.ts
│   └── promptSettings.ts
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Renders the legacy App.tsx client island
│   │   ├── healthz/route.ts    # GET /healthz → 200 ok
│   │   ├── documents/page.tsx  # Static PDF viewer
│   │   └── api/                # All route handlers (see below)
│   ├── components/             # ChatWindow, NavigationMap, AdminPanel, …
│   ├── lib/                    # Client-side libs (llm.ts, rag.ts, classifier/, providers/)
│   ├── config/                 # safetyRules.json, classificationMatrix.json
│   └── App.tsx                 # Main client component (single island)
└── public/                     # Static assets (favicon, PDFs)
```

### API surface

All routes under `/api/` are Node runtime and require an authenticated session unless noted.

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/[...all]` | GET, POST | Better Auth handlers (sign-up, sign-in, sign-out, session) |
| `/api/healthz` | GET | Public — returns `200 ok` |
| `/api/conversations` | GET, POST | List / create conversations |
| `/api/conversations/[id]` | GET, PATCH, DELETE | Single conversation CRUD |
| `/api/conversations/[id]/messages` | GET, POST | List / append messages (idempotent via `clientId`) |
| `/api/prompt-settings` | GET, PUT, DELETE | Per-user prompt configuration |
| `/api/rag-config` | GET, PUT | Per-user RAG tuning |
| `/api/rag-search` | POST | Server-side RAG retrieval |
| `/api/knowledge-chunks` | GET, POST, DELETE | Admin-only RAG corpus management |
| `/api/chat` | POST | LLM proxy — dispatches to Harvard (default) / Gemini (fallback) |
| `/api/harvard` | POST | Direct Harvard gateway proxy (used by classifier) |
| `/api/harvard-responses` | POST | Harvard Responses API proxy |
| `/api/gemini` | POST | Direct Gemini proxy |

---

## Database, migrations, and RAG

### Schema overview

10 tables plus the `__migrations` tracker. The Drizzle source is in [`lib/db/schema.ts`](./lib/db/schema.ts).

```mermaid
erDiagram
    USER ||--o{ SESSION : owns
    USER ||--o{ ACCOUNT : owns
    USER ||--o{ CONVERSATION : owns
    CONVERSATION ||--o{ MESSAGE : contains
    USER ||--|| PROMPT_SETTINGS : "singleton"
    USER ||--|| RAG_CONFIG : "singleton"
    KNOWLEDGE_CHUNK }o..|| USER : "managed by admin"

    USER { text id PK; text email UK; bool is_admin; }
    SESSION { text id PK; text token UK; text user_id FK; timestamp expires_at; }
    ACCOUNT { text id PK; text user_id FK; text issuer; text account_id; }
    CONVERSATION { text id PK; text user_id FK; text title; enum type; enum current_phase; }
    MESSAGE { text id PK; text conversation_id FK; enum role; enum lane; bool is_stuck; }
    PROMPT_SETTINGS { text user_id PK FK; text provider; text system_prompt; jsonb suggested_prompts; }
    RAG_CONFIG { text user_id PK FK; int top_k; text min_similarity; bool enabled; }
    KNOWLEDGE_CHUNK { text id PK; text source; text content; vector embedding; }
```

### Migration commands

| Script | Purpose |
|---|---|
| `npm run db:generate` | Use `drizzle-kit` to scaffold a new migration after editing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations to the DB in `DATABASE_URL` |
| `npm run db:studio` | Open Drizzle Studio (web UI for the DB) |
| `npm run db:push` | Push schema directly without migration files (dev only) |
| `npm run smoke` | Verify env, connectivity, schema, and Better Auth table shapes |

The custom migration runner ([`scripts/migrate.ts`](./scripts/migrate.ts)) is **idempotent** — it splits each SQL file on drizzle's `--> statement-breakpoint` marker and tolerates `42710`/`42P07`/`42701`/`42P06` (already-exists) errors so re-runs are safe. The `__migrations` table tracks which files have been applied.

### Adding a new migration

After editing `lib/db/schema.ts`:

1. Run `npm run db:generate` — drizzle-kit produces a new `drizzle/NNNN_*.sql` file.
2. Verify the SQL by reading it. Manual edits are often needed for `CREATE INDEX CONCURRENTLY`, data backfills, etc.
3. Commit the SQL file.
4. On next deploy, the `migrate` service applies it automatically. Locally: `npm run db:migrate`.

### RAG pipeline

- `embedding` column is `vector(768)` — sized for `text-embedding-004`.
- Chunks are embedded via Gemini on the server when uploaded (admin endpoint).
- Retrieval is in-memory cosine similarity over the small toolkit corpus. If the corpus grows past ~200 chunks, swap to pgvector's `<=>` operator (see comments in `src/app/api/rag-search/route.ts`).
- `ragConfig` lets each user tune `topK`, `min_similarity`, and toggle RAG on/off.

---

## Admin management

The admin allowlist is **driven by env**, not by hardcoded emails or DB roles:

- **Server-side enforcement** — `lib/admin.ts` exports `isAdminEmail(email)`, used by `POST/DELETE /api/knowledge-chunks`. This is the source of truth — non-admins are blocked at the API boundary even if the UI is fooled.
- **Client-side UI gating** — `lib/auth-client.ts` exports `isAdminFromSession(session)`, which reads the `NEXT_PUBLIC_ADMIN_EMAILS` build-time env and shows the Admin panel button only to those users.

To grant admin access to a new user:

1. Add their email to `ADMIN_EMAILS` (comma-separated) and `NEXT_PUBLIC_ADMIN_EMAILS` (same value).
2. Redeploy the stack. (Build-time changes require a rebuild.)

The schema also has a `user.is_admin` boolean column reserved for a future per-user role, but it is not yet wired into the API.

---


## Deployment

### Development (default)

```bash
docker compose up
# Postgres on :5432, Next.js on http://localhost:3000
```

### Production (self-hosted, single host)

```bash
docker compose -f docker-compose.prod.yml up --build -d
# Nginx on :80 / :443, proxying to Next.js
```

`docker-compose.prod.yml` adds:

- **`nginx`** — SSL termination, gzip, rate limiting, SSE-friendly buffering
- **No dev server** — the `next` service runs `next start` against the built image
- **Healthchecks** — `/healthz` for the Next.js app, `/healthz` (nginx-local) for the proxy

Place SSL certs at `nginx/ssl/` and edit `nginx/nginx.conf` to set your `server_name` and TLS paths.

### Production (Ariadne Labs ECS)

The deployment is triggered by the `aria-deploy` workflow after pushing the `from-july-revamp` branch:

1. Push to `from-july-revamp`.
2. Open the [aria-deploy job](https://github.com/Arkoys/ai-essential-communication-for-dementia/actions) and click **Run workflow** on `aria deployment job`.
3. A successfully submitted deployment displays `Sucessfully submitted aria deployment job`.
4. Do not click the deployment link multiple times — each click starts a separate deployment job.
5. The updated version will be deployed within a few minutes and become available on the [EC Dementia site](https://ec-dementia-app.ariadnelabs.net/).

The future plan is to schedule this job nightly to auto-deploy the latest `from-july-revamp`.

### CI/CD secrets (what to provision in your deploy env)

- `BETTER_AUTH_SECRET` — same secret across all replicas
- `DATABASE_URL` — pointing at a managed Postgres (Neon, RDS, etc.)
- `BETTER_AUTH_URL` — public URL (e.g. `https://ec-dementia-app.ariadnelabs.net`)
- `ADMIN_EMAILS` and `NEXT_PUBLIC_ADMIN_EMAILS`
- `LLM_PROVIDER` plus the matching API key

---

## Key rotation runbook

The following values are real secrets. If any of them leaks (commit, log, screenshot, support ticket), rotate **immediately**.

| Secret | Where it's used | Rotation procedure |
|---|---|---|
| `BETTER_AUTH_SECRET` | Cookie HMAC; rotating invalidates all sessions | Generate new (`openssl rand -base64 48`), redeploy. All users will be signed out — expect a brief spike of re-logins |
| `DATABASE_URL` | All DB calls | Rotate DB password at the provider; update `DATABASE_URL`; redeploy |
| `GEMINI_API_KEY` | `/api/chat`, `/api/knowledge-chunks` (embeddings) | Create new key in Google AI Studio; set as `GEMINI_API_KEY`; revoke old key |
| `HARVARD_OPENAI_KEY` | `/api/chat` and `/api/harvard*` when provider is `harvard` | Request new key from HUIT; revoke old |

After rotating any LLM key, run `npm run smoke` (against a deployed environment) to confirm `/api/chat` still returns 200.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `lane_column_missing` warning on `/api/conversations/[id]/messages` | Migration `0002_message_lane.sql` not applied | `npm run db:migrate` |
| `auth/account.issuer column missing` on sign-up | Outdated DB schema (pre-better-auth@1.7) | Re-run all migrations; `pgvector/pgvector:pg16` recommended |
| `pgvector extension NOT installed` | Postgres image without pgvector | Use `pgvector/pgvector:pg16` (not `postgres:16`) |
| `BETTER_AUTH_URL` mismatch / cookies not set | Frontend URL ≠ env URL | Set `BETTER_AUTH_URL` to the exact origin (incl. scheme) |
| Admin panel button missing | Email not in `NEXT_PUBLIC_ADMIN_EMAILS` | Set env, rebuild (it's a build-time inlined value) |
| `401 unauthorized` on every API call | Session cookie expired / `BETTER_AUTH_SECRET` rotated | Sign in again |
| `harvard_not_configured` 503 | Missing `HARVARD_OPENAI_KEY` | Set the key; restart `next` |
| `gemini_not_configured` 503 | Missing `GEMINI_API_KEY` (only matters if RAG or Gemini fallback path is hit) | Set the key |
| `npm run smoke` exits non-zero | See the printed ✗ lines | Each tells you exactly what to fix |

---

## Roadmap

- **Drizzle journal** is now consistent (`0000`/`0001`/`0002`); `drizzle-kit generate` will not re-emit them as new files.
- **Per-user `is_admin`** column exists in the schema but is not yet read by the API. Wiring it would let admins be granted via SQL instead of env.
- **Streaming** for `/api/chat` is scaffolded (`/api/.+/stream` location in nginx, `stream: true` flag in the proxy) but not exposed in the client UI.
- **Compare-mode UI polish** — already functional but could use better empty-state copy.

---

## In collaboration with

This project is done in collaboration with the following schools and labs:

| EPFL | LIGHT LABORATORY | Harvard T.H. Chan School | Ariadne Labs |
| :---: | :---: | :---: | :---: |
| <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Logo_EPFL_2019.svg/1280px-Logo_EPFL_2019.svg.png" width="150" alt="EPFL"> | <img src="https://avatars.githubusercontent.com/u/62012557?s=200&v=4" width="150" alt="LIGHT LABORATORY"> | <img src="https://upload.wikimedia.org/wikipedia/en/1/18/Harvard_shield-Public_Health.png" width="150" alt="Harvard T.H. Chan School"> | <img src="https://www.ariadnelabs.org/wp-content/themes/ariadne-labs/assets/images/AL-logo-solo-white.svg" width="150" alt="Ariadne Labs"> |

---

## Security warning (PHI)

**Warning:** This tool is designed for general clinical decision support. Users **must never** input Protected Health Information (PHI) or identifiable patient data into the chat interface. All queries must be anonymized.

