# Deployment

## Current status

Not yet deployed to hosting. A real, hosted Supabase project
(`ccuelnrmvtmtgukqyvrb`) is connected and has all migrations applied —
see "Connected Supabase project" below and
`docs/IMPLEMENTATION_STATUS.md`'s "Live project verification" section for
the full account of what was exercised against it. This document covers
what's still needed to actually deploy the Next.js app and go to
production.

## Connected Supabase project

This repo's `.env.local` (gitignored, not committed) points at a real
Supabase project the user supplied credentials for during this session.
Applying the 10 migration files to it did **not** use `supabase db push`
or `psql` — this sandboxed container only allows outbound HTTPS, not raw
Postgres connections, so both hung/failed regardless of credentials (DNS
even resolved for the pooler host; the TCP connection itself never
completed). Instead, each migration's SQL was POSTed to Supabase's HTTPS
Management API (`https://api.supabase.com/v1/projects/{ref}/database/
query`), authenticated with a personal access token the user generated at
supabase.com/dashboard/account/tokens. That token is not stored in this
repo and should be revoked by the user once no longer needed (it is not
required for the app to run — only the URL, anon key, and service-role key
are, and those live in `.env.local`).

**Before using this project for production**, the project owner should
decide whether to:
- use it as-is (it already has the full schema and was genuinely
  exercised end-to-end), after cleaning up the test data created during
  verification (a few test accounts, one test property listing, one test
  conversation, one test subscription — all clearly named `E2E Test …` /
  `domilink.e2e.*@…` for easy identification), or
- provision a fresh Supabase project specifically for production and
  apply the same migrations there (via `supabase db push` from a
  Docker-and-network-unrestricted machine, or the same Management API
  approach from anywhere with HTTPS access and a personal access token).

## Local development

```bash
npm install
cp .env.example .env.local
npx supabase start     # requires a working Docker daemon
npx supabase db reset
npm run dev
```

**Known limitation of this sandboxed build environment**: its Docker
daemon cannot start (`dockerd` fails under the container's restricted
capabilities), so `supabase start` doesn't work here. Migrations and RLS
were instead validated against a plain Postgres 16 instance with a
Supabase-compatible shim — see `docs/ARCHITECTURE.md` and
`docs/DATABASE_SCHEMA.md`. On a normal developer machine (or any CI runner
with Docker available), `supabase start` works as documented above and
gives full GoTrue/PostgREST/Storage/Realtime for true end-to-end testing.

## Production prerequisites (blocked on the project owner)

1. ~~**Hosted Supabase project**~~ — done; see "Connected Supabase
   project" above. Remaining: decide whether that project serves
   production or a separate one is provisioned (see above), then set
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` in the hosting provider's environment
   variables (service role key: server-only, never exposed to the client).
2. **Payment provider** — see `docs/PAYMENTS.md` (written in Milestone 4).
   No production payment credentials exist yet; `PAYMENTS_PROVIDER=mock`
   must never be set in production.
3. **Domain + hosting** — any Next.js-capable host (Vercel is the lowest-
   friction option given the App Router + Server Actions usage).
4. **Legal review** — `lib/config/brand.ts` and the `/legal/*` pages carry
   explicit placeholder markers that must be replaced with real,
   lawyer-reviewed content before launch.
5. **Email provider** (optional but recommended) — for password reset and
   transactional notifications; unset means in-app notifications still
   work but email does not send.

## Build & start (any environment with the env vars above set)

```bash
npm run build
npm run start
```

## Rollback / backups

Supabase hosted projects include automatic backups on paid tiers; confirm
the plan's backup retention matches the business's data-loss tolerance
before launch. No custom backup tooling exists in this repo yet.
