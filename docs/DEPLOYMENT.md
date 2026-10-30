# Deployment

## Current status

Not yet deployed anywhere. This document covers what's needed and what's
still blocked on the project owner.

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

1. **Hosted Supabase project** — create one at supabase.com, run
   `supabase link` + `supabase db push` (or apply `supabase/migrations/`
   via the dashboard's SQL editor), and set `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the
   hosting provider's environment variables (service role key: server-only,
   never exposed to the client).
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
