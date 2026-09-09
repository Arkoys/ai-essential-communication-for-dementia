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
- [What's not yet wired](#whats-not-yet-wired)
- [Where to look first](#where-to-look-first)
- [Contributing & branches](#contributing--branches)
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

- `BETTER_AUTH_SECRET` — generate with `openssl rand -base64 48`. Make sure you replace the placeholder string `replace-me-with-a-long-random-string-min-32-chars` from the example.
- `ADMIN_EMAILS` — comma-separated list of emails that should see the Admin panel (see [Granting yourself admin](#granting-yourself-admin) below)
- One of `HARVARD_OPENAI_KEY`, `GEMINI_API_KEY`
- Set `NEXT_PUBLIC_ADMIN_EMAILS` to the same value as `ADMIN_EMAILS` (it's safe to ship to the browser — only used to gate the Admin button)

> **Verify the secret was actually replaced** before continuing:
> ```bash
> grep BETTER_AUTH_SECRET .env.local
> ```
> If you still see `replace-me-...`, Better Auth will reject it at startup.

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

> #### Granting yourself admin
>
> The admin allowlist is **env-driven** (see [Admin management](#admin-management)). The `user.is_admin` column is in the schema but **is not yet read by any route** — so the very first signup is *not* automatically admin unless the email was already in `ADMIN_EMAILS` when the stack booted.
>
> To bootstrap yourself as the first admin:
>
> 1. Sign up at http://localhost:3000 with the email you want to use as admin.
> 2. Stop the stack: `docker compose down`.
> 3. Edit `.env.local`: add that email to both `ADMIN_EMAILS` and `NEXT_PUBLIC_ADMIN_EMAILS` (same value).
> 4. Rebuild and restart: `docker compose up --build`. (`NEXT_PUBLIC_*` is inlined at build time, so a rebuild is required.)
> 5. Sign out and sign back in to refresh the session.

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

> #### Why are there two `lib/` folders?
>
> This is the single biggest "gotcha" in the repo. The two folders **are not duplicates**:
>
> | Folder | Reach via | Purpose | What lives here |
> |---|---|---|---|
> | **`/lib/`** (top-level) | `import ... from '@/lib/X'` (because `tsconfig.paths` maps `@/*` → repo root) | **Server-only** modules | auth, DB, admin, env validation, the API client wrapper, the part of prompt-settings that's read by API routes |
> | **`/src/lib/`** | Relative paths only (`./lib/X`, `../lib/X`) | **Client-side** modules that ship to the browser | the classifier, providers, templates, the RAG helper, browser defaults |
>
> **Rule of thumb:** if a module imports `better-auth/react`, reads `process.env`, or depends on `pg`, it lives in `/lib/`. If it must ship to the JS bundle, it lives in `/src/lib/`.
>
> Some files (e.g. `promptSettings.ts`, `defaultData.ts`, `resources.ts`) exist in **both** folders. The `/lib/` copy is the authoritative server-side source and is what API routes consume; the `/src/lib/` copy exists when the browser needs the same constants and is wired in separately.

```

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

    USER {
        text id PK
        text email UK
        bool is_admin
    }
    SESSION {
        text id PK
        text token UK
        text user_id FK
        timestamp expires_at
    }
    ACCOUNT {
        text id PK
        text user_id FK
        text issuer
        text account_id
    }
    CONVERSATION {
        text id PK
        text user_id FK
        text title
        enum type
        enum current_phase
    }
    MESSAGE {
        text id PK
        text conversation_id FK
        enum role
        enum lane
        bool is_stuck
    }
    PROMPT_SETTINGS {
        text user_id PK, FK
        text provider
        text system_prompt
        jsonb suggested_prompts
    }
    RAG_CONFIG {
        text user_id PK, FK
        int top_k
        text min_similarity
        bool enabled
    }
    KNOWLEDGE_CHUNK {
        text id PK
        text source
        text content
        vector embedding
    }
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

## What's not yet wired

A short, honest list of dead-looking code that's actually intentional, plus known gaps. If you're wondering "is this a bug?" — check here first.

| Area | Status |
|---|---|
| `user.is_admin` column | Exists in `lib/db/schema.ts` but **no route reads it**. Admin gating is purely env-driven via `ADMIN_EMAILS`. |
| `src/lib/env-client.ts` | A shim with hard-coded values, kept so legacy `import { CLIENT_ENV } from '../env-client'` keeps compiling. **Not** a real config source. |
| `src/pages/DocumentsPage.tsx` | Looks like legacy pages-router code but is intentionally rendered via `src/app/documents/page.tsx`. Don't delete it. |
| `MiniMax` strings in `promptSettings.ts`, `prompt-settings-shared.ts`, `/api/chat`, `/api/prompt-settings` | Defensive coercers that map any stale DB row or request payload still containing `minimax` → `harvard`. The MiniMax provider was removed; these exist so historical rows don't crash reads. |
| `/api/.+/stream` nginx location | Configured for future streaming responses. Not yet exposed in the client UI. |
| `comparison-mode` empty states | Functional; UI polish on empty states is unfinished. |
| `lib/db/schema.ts` enums | `messageRole`, `messageLane`, `conversationType` are PG enums. Adding new values requires a new migration (`ALTER TYPE ... ADD VALUE`). |

---

## Where to look first

If you're new to the repo, start here. Don't grep the whole tree.

| If you're working on... | Open this file first |
|---|---|
| Auth, sessions, sign-in/up/out | `lib/auth.ts` (Better Auth setup), `lib/auth-server.ts` (`requireUser()` for route handlers), `lib/auth-client.ts` (React hooks) |
| DB schema or migrations | `lib/db/schema.ts`, then `drizzle/NNNN_*.sql` |
| Admin gating (RAG mutations) | `lib/admin.ts` (server-side), `lib/auth-client.ts` (client-side UI) |
| Chat / LLM call path | `src/app/api/chat/route.ts` → `src/lib/llm.ts` → `src/lib/providers/index.ts` |
| Classification pipeline (which template?) | `src/lib/classifier/README.md` (already excellent), then `src/lib/classifier/pipeline.ts` |
| RAG retrieval / knowledge chunks | `src/lib/rag.ts`, `src/app/api/rag-search/route.ts`, `knowledge_chunks` table in `lib/db/schema.ts` |
| Prompt / coaching defaults | `lib/promptSettings.ts` (server), `src/lib/promptSettings.ts` (client) |
| Static reference PDFs (Navigation Map, etc.) | `public/documents/README.md` |
| Deploy / CI | `Dockerfile`, `docker-compose.prod.yml`, `.github/workflows/` |

---

## Contributing & branches

### Branches

| Branch | Purpose |
|---|---|
| `main` | Default branch; integration of merged features |
| `prod` | Production deployable state |
| `migration-nextJs` | Frozen historical: the Next.js cutover from Vite/Firebase |
| `revamp-july` / `from-july-revamp` | Frozen historical: the July UI revamp and the Ariadne Labs ECS deploy branch |
| `report` / `new-template-5` | Active feature branches under development |

The legacy migration branches are kept around for archaeology — don't rebase or push to them.

### Commit message convention

The history already uses prefixes like `feat:`, `fix:`, `add:`, `remove:`, `Update`. Please keep them. Examples:

```text
feat: add streaming to /api/chat
fix: rag-search crashes when embedding is null
add: migration for message_lane enum value
```

### Before opening a PR

1. `npm run typecheck`
2. `npm run lint`
3. `npm run smoke` (with `.env.local` loaded; requires Postgres + pgvector)
4. If you changed `lib/db/schema.ts`: `npm run db:generate`, review the generated SQL, commit it under `drizzle/`
5. If you added or changed env vars: update `.env.example` **and** the [Environment variables](#environment-variables) table

### Code style

- TypeScript `strict` is on. No `any` except at API boundaries.
- Server code in `/lib/`, client code in `/src/lib/` (see [Project layout](#project-layout)).
- React components in `/src/components/`. New API routes in `/src/app/api/...`.
- Tailwind 4 utility classes; the global stylesheet is `src/app/globals.css`.

---

## In collaboration with

This project is done in collaboration with the following schools and labs:

| EPFL | LIGHT LABORATORY | Harvard T.H. Chan School | Ariadne Labs |
| :---: | :---: | :---: | :---: |
| <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Logo_EPFL_2019.svg/1280px-Logo_EPFL_2019.svg.png" width="150" alt="EPFL"> | <img src="https://avatars.githubusercontent.com/u/62012557?s=200&v=4" width="150" alt="LIGHT LABORATORY"> | <img src="https://upload.wikimedia.org/wikipedia/en/1/18/Harvard_shield-Public_Health.png" width="150" alt="Harvard T.H. Chan School"> | <img src="https://www.ariadnelabs.org/wp-content/themes/ariadne-labs/assets/images/AL-logo-solo-white.svg" width="150" alt="Ariadne Labs"> |

---

## Security warning (PHI)

**Warning:** This tool is designed for general clinical decision support. Users **must never** input Protected Health Information (PHI) or identifiable patient data into the chat interface. All queries must be anonymized.

