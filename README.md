# DomiLink — Liberia Direct Property Rental Marketplace

"DomiLink" is a provisional development name (not trademark/domain-checked).
Change it in `lib/config/brand.ts`.

DomiLink connects renters directly with property owners in Liberia. Owners
list for free; renters browse for free; a $5 / 30-day Direct Access Pass
unlocks direct messaging with as many owners as a renter likes, with no
per-property fee.

## Tech stack

- Next.js (App Router) + React + TypeScript (strict)
- Tailwind CSS v4 (token-based design system, see `docs/DESIGN_SYSTEM.md`)
- Supabase (Postgres, Auth, Storage, Realtime, Row Level Security)
- React Hook Form + Zod for forms/validation
- Vitest for unit/integration tests

## Prerequisites

- Node.js 20+
- Docker (for local Supabase)
- Supabase CLI (installed as a dev dependency; invoke via `npx supabase`)

## Install

```bash
npm install
cp .env.example .env.local
```

## Local database (Supabase)

```bash
npx supabase start     # boots local Postgres/Auth/Storage via Docker
npx supabase db reset    # applies supabase/migrations/ to the local DB
```

Copy the local URL/anon key printed by `supabase start` into `.env.local`.
Production deployment against a hosted Supabase project is documented in
`docs/DEPLOYMENT.md`.

## Develop

```bash
npm run dev
```

## Test

```bash
npm run test         # vitest unit tests
npm run typecheck      # tsc --noEmit
npm run lint             # eslint
```

Database-layer business logic and RLS policies are verified with SQL
assertion scripts in `supabase/local-shim/test_m*_rls.sql` (run against a
local Postgres instance — see `docs/ARCHITECTURE.md` for why this project
uses that instead of the full `supabase` CLI stack in its own development
sandbox). Run them against your own local Postgres with:

```bash
for f in supabase/local-shim/test_m*_rls.sql; do psql -f "$f"; done
```

## Build

```bash
npm run build
npm run start
```

## Documentation

- `CLAUDE.md` — durable project instructions and business rules
- `docs/PRODUCT_SPECIFICATION.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/SECURITY.md`
- `docs/PAYMENTS.md`
- `docs/API.md`
- `docs/DEPLOYMENT.md`
- `docs/IMPLEMENTATION_STATUS.md` — honest build progress, updated per milestone

## Troubleshooting

- **Tailwind classes not applying under Turbopack**: confirm
  `next.config.ts` keeps the `turbopack.rules["*.css"]` loader pointed at
  `@tailwindcss/turbopack`.
- **Supabase CLI can't reach Docker**: ensure the Docker daemon is running
  (`docker info`) before `npx supabase start`.
