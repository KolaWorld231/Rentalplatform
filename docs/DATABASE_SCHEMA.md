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

## Milestone 3 — property marketplace

### `properties`
The core listing table. Enums (`liberia_county` — the real 15 Liberian
counties, `property_category`, `property_usage`, `rental_frequency`,
`listing_status`, `availability_status`) constrain the data instead of
free-text, while `city`/`community`/`landmark` stay free text so owners
aren't blocked by an incomplete taxonomy — `docs/PRODUCT_SPECIFICATION.md`
notes the location hierarchy is designed to grow without a schema change.
Money columns are `numeric(12,2)`, never float. `listing_status` (the
publication lifecycle: draft → pending_review → published → …) is kept
separate from `availability_status` (available/pending_rental/rented/
temporarily_unavailable) because a published listing can cycle through
availability states without ever leaving "published". `published_at` and
`last_availability_confirmed_at` are stamped automatically by the
`sync_property_status_timestamps` trigger, not set by the client. Indexes:
a composite `(listing_status, county, category, rent_amount)` index for the
common search filter combination, a `city` index, and a GIN full-text index
over `title || description` for keyword search (`services/properties.ts`
uses `textSearch`).

RLS: anyone can read `published` listings; the owner/manager can always see
and edit their own regardless of status; moderators/admins see everything.
A listing's `owner_id` is enforced equal to `auth.uid()` on INSERT — see
`supabase/local-shim/test_m3_rls.sql` for a reproducible proof that a user
cannot create a listing claiming another user as the owner.

### `property_images`
References `properties`. A partial unique index enforces at most one
`is_cover = true` row per property. Visible wherever the parent property is
visible (public once published); writable only by that property's owner/
manager. The actual image bytes live in Supabase Storage's
`property-images` bucket (see `20260102000200_property_images_storage.sql`)
— this table only stores the storage path.

### `property_favourites`
`(user_id, property_id)` composite primary key — a user can favourite a
property at most once. Strictly private: RLS scopes every operation to
`user_id = auth.uid()`.

### `property_views`
An append-only log, written by anyone (including `anon`) viewing a
published listing, but only readable by the property's own owner/manager
or moderation roles — the aggregate `properties.view_count` (kept current
by the `sync_view_count` trigger) is what the public UI shows. Same-day
per-viewer deduplication happens in `services/properties.ts`, not as a DB
constraint — Postgres won't accept a timezone-aware "same calendar day"
expression in a plain unique index without an extra immutable wrapper
function, and the dedup requirement doesn't need stronger-than-application
guarantees (worst case: double-counting one view if two requests race).

### `property_reports`
Any authenticated user may file one (`reporter_id = auth.uid()` enforced);
only the reporter and `admin`/`moderator` roles may read it. There is no
`authenticated` UPDATE policy — only `service_role` (moderation tooling,
built in Milestone 7) can change `status`/`resolution_notes`.

### Storage: `property-images` bucket
Public-read (listing photos are meant to be public), 8MB file size limit,
`image/jpeg|png|webp` only. Write/update/delete policies key off the first
path segment matching a `properties.id` the caller owns/manages
(`{property_id}/{filename}` convention) — see
`20260102000200_property_images_storage.sql`. This migration references
`storage.buckets`/`storage.objects`, which only exist in a real Supabase
project, so — unlike the other M3 tables — it has **not** been exercised
against the plain-Postgres shim; it's been reviewed but not run. It needs
`supabase db reset` against a real Supabase instance to verify. Verification
documents (Milestone 6) get a **separate, private** bucket — never reuse
this public one for anything sensitive.

Tables from later milestones (subscriptions, messaging, verification,
admin) are documented here as their migrations land.
