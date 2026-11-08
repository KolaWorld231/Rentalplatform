# Architecture

## Overview

231Rentals is a Next.js (App Router) application backed by Supabase
(Postgres + Auth + Storage + Realtime). It follows a thin-client,
trusted-server model: the browser talks to Supabase directly for reads that
RLS can safely authorize, and to Next.js Server Actions / Route Handlers
for anything that needs a privileged (`service_role`) write.

```
Browser ──(RLS-scoped reads/writes)──> Supabase (Postgres + Auth + Storage)
Browser ──(forms)──> Next.js Server Actions ──(service_role, when privileged)──> Supabase
Payment provider ──(webhook)──> Supabase Edge Function ──(verified + idempotent)──> subscriptions
```

## Layers

- **`app/`** — routes. Route groups separate concerns: `(auth)` for
  auth/onboarding, plain top-level folders for public pages, `dashboard/`
  for the owner console (M3+), `admin/` for moderation (M7).
- **`components/ui/`** — design-system primitives (Button, Card, Input,
  Dialog, Drawer, Badge, Skeleton). No business logic.
- **`components/{layout,properties,messaging,subscriptions,forms}/`** —
  feature components built from the primitives above.
- **`lib/supabase/`** — three distinct Supabase client factories, each with
  a different trust level:
  - `client.ts` — browser client (anon key, RLS-scoped to the signed-in
    user).
  - `server.ts` — Server Component/Action client (anon key + the caller's
    cookies, still RLS-scoped — this is *not* privileged).
  - `service-role.ts` — `server-only`-guarded service-role client. Bypasses
    RLS. Only ever imported from trusted server code performing an
    explicitly privileged operation (role grants, subscription activation,
    payment verification, admin actions).
- **`lib/auth/`** — session helpers (`requireUser`, `requireRole`) and auth
  server actions.
- **`lib/validation/`** — Zod schemas, one module per domain. Every
  mutation validates with these server-side, even when the form also
  validates client-side.
- **`lib/config/brand.ts`** — single source of truth for brand name,
  tagline, and legal placeholders.
- **`services/`** (from M3 onward) — domain logic that doesn't belong in a
  component or a single server action (search query building, subscription
  state transitions, messaging authorization).
- **`supabase/migrations/`** — the real schema, applied in order.
- **`supabase/functions/`** (from M4 onward) — Edge Functions for
  privileged operations that need to run outside a user's request (payment
  webhooks).

## Authorization model

Every table reachable by the browser has RLS enabled, and RLS is the
*actual* authorization boundary — not "the UI doesn't show the button."
Three trust tiers:

1. **`anon`** — unauthenticated reads of public data (published listings,
   public profile fields).
2. **`authenticated`** — the signed-in user, scoped to their own rows via
   `auth.uid()` in policies, plus role-gated reads/writes via
   `public.has_role(...)`.
3. **`service_role`** — bypasses RLS entirely. Reachable only from server
   code that isn't itself driven by unvalidated user input (or that
   validates it first) — Server Actions calling
   `lib/supabase/service-role.ts`, and Edge Functions.

A user's `role` is never trusted from the client: it lives in `user_roles`,
which has no client-writable INSERT/UPDATE policy at all (see
`docs/DATABASE_SCHEMA.md`).

## Local development without Docker

This sandboxed build environment cannot run the Docker-backed Supabase CLI
stack (the daemon won't start under its restricted container). Development
here validates migrations/RLS against a plain Postgres 16 instance with a
minimal Supabase-compatible `auth` schema shim
(`supabase/local-shim/`, dev-only, not part of `supabase/migrations/`).
This container's outbound network also only allows HTTPS (confirmed via
its proxy status endpoint), not raw Postgres TCP, so neither `supabase db
push` nor direct `psql` could reach a remote database either — not just
`supabase start`'s local Docker stack. Despite that, this project *has*
since been connected to a real, hosted Supabase project and genuinely
exercised end-to-end: Supabase's HTTPS Management API
(`api.supabase.com/v1/projects/{ref}/database/query`) was used to apply
every migration, and a headless browser drove the running app against
that live project for real signup/login/listing/search/subscription/
messaging flows. See `docs/IMPLEMENTATION_STATUS.md`'s "Live project
verification" section for the full account, including real bugs that
surfaced only once PostgREST/a real browser bundle/a live clock were in
the loop. On a machine where Docker or direct Postgres access works,
`supabase start` + `supabase db reset` remains the standard local-dev
path. Production always points at a hosted Supabase project.
