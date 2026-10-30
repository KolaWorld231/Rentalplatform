# Database Schema

Source of truth: `supabase/migrations/*.sql`, applied in filename (timestamp)
order. This document explains the *why* behind each table; read the
migration file itself for exact column definitions.

## Conventions

- All timestamps are `timestamptz`, stored in UTC; the app formats them for
  display.
- Money (added from Milestone 4 onward) is `numeric`, never `float`.
- Every table that's reachable from the client has Row Level Security
  enabled; policies are the authorization boundary, not the UI.
- Privileged writes (role grants, subscription activation, payment
  verification, moderation) are performed by `service_role` from trusted
  server code (Edge Functions / Next.js server actions using the
  service-role client), never left to client-writable RLS policies.

## Milestone 2 — identity & authorization

### `profiles`
One row per `auth.users` row (created automatically by the
`handle_new_user` trigger on signup). User-editable account info:
`display_name`, `phone`, `phone_verified_at`, `avatar_path`,
`account_status`. **Does not contain the user's role** — see `user_roles`.
RLS: any authenticated user can read any profile (needed to show an
owner's name on a listing); a user can insert/update only their own row.

### `user_roles`
`(user_id, role)` pairs — `renter | owner | moderator | admin`. A user can
hold multiple roles (e.g. `renter` + `owner`). Populated automatically with
`renter` on signup; all other grants happen via `service_role` only. RLS
grants `SELECT` to the row's own user and to anyone holding `admin` or
`moderator`; there is **no** `authenticated` INSERT/UPDATE/DELETE policy,
so RLS denies self-service role changes outright — verified in
`supabase/local-shim/test_m2_rls.sql`.

### `owner_profiles`
Public-facing info for the `owner` role: `business_name`, `bio`,
`public_phone`, `public_contact_opt_in`. RLS allows any authenticated user
to read (renters need this on a listing page); only the row's own user can
write, and only once `public.has_role('owner')` is true — so a plain
renter cannot create one, even though the row's primary key would
otherwise let them.

### Helper functions
- `public.has_role(role)` — `security definer` helper used throughout RLS
  policies instead of repeating the `user_roles` subquery.
- `public.handle_new_user()` — trigger on `auth.users` insert; creates the
  `profiles` row and default `renter` role. Runs as the trigger owner
  (bypassing RLS), which is the one place a privileged write happens
  outside `service_role` — it's intentionally narrow (signup only).
- `public.set_updated_at()` — generic `updated_at` bookkeeping trigger.

## Verification method

Because this sandboxed development container cannot run Docker (so the
full local Supabase stack — GoTrue/PostgREST/Storage/Realtime — isn't
available here), migrations are also validated directly against a plain
Postgres 16 instance using a minimal Supabase-compatible `auth` schema shim
(`supabase/local-shim/00_auth_shim.sql`, dev/test-only, never applied in
`supabase/migrations/`). `supabase/local-shim/test_m2_rls.sql` runs SQL
assertions simulating two signups and exercising every RLS policy above,
including an explicit role-escalation attempt. See
`docs/IMPLEMENTATION_STATUS.md` for what that does and doesn't prove, and
`docs/DEPLOYMENT.md` for running the real `supabase` CLI stack once Docker
is available.

Tables from later milestones (properties, subscriptions, messaging,
verification, admin) are documented here as their migrations land.
