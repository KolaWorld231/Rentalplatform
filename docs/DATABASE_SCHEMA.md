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

## Milestone 4 — subscriptions & payments

See `docs/PAYMENTS.md` for the full flow; this section covers the schema.

### `subscription_plans`
Seeded with one row: "Direct Access Pass", `price_usd = 5.00`,
`duration_days = 30`. Public read (`is_active` ones); write is
`service_role`-only, so changing the price/duration is an explicit admin
action, not something a migration hardcodes into application logic.

### `subscriptions`
`status` is one of `pending_payment | active | expired | cancelled |
payment_failed | refunded | suspended`. **No `authenticated` INSERT/UPDATE
policy exists at all** — a subscription is created and activated
exclusively by `service_role` code (`lib/subscriptions/service.ts` for
creation, the `confirm_payment_and_activate_subscription` function for
activation). `expires_at` is always computed server-side as `now() +
plan.duration_days` at the moment of confirmed payment — never accepted
from a client. `has_active_subscription(user_id)` is the helper
Milestone 5's messaging RLS uses.

### `payment_transactions`
A user may INSERT their own row, but the RLS `WITH CHECK` clause pins
`status = 'initiated'` — they cannot self-insert a `confirmed` payment.
Every later state transition is `service_role`-only. `unique(provider,
provider_transaction_id)` and a separate `unique(internal_reference)`
together let the webhook handler look up the right transaction
unambiguously and prevent two of our transactions from ever claiming the
same provider transaction id.

### `payment_webhook_events`
`unique(provider, event_id)` is the actual idempotency mechanism — see
`docs/PAYMENTS.md`. No RLS policy is granted to `anon`/`authenticated` at
all, so this table is invisible to the client entirely.

### `confirm_payment_and_activate_subscription(transaction_id, event_ref)`
`SECURITY DEFINER`, revoked from `PUBLIC`, granted only to `service_role`.
The single function that ever transitions a subscription to `active`.
Idempotent: calling it again for an already-`confirmed` transaction
returns the existing subscription unchanged rather than re-activating or
extending the expiry.

## Milestone 5 — direct messaging

### `conversations`
`unique(property_id, renter_id, owner_id)` prevents duplicate
conversations for the same relationship. **The subscription gate lives
entirely in RLS**: the `conversations_insert_renter` policy's `WITH CHECK`
requires `renter_id = auth.uid() AND public.has_active_subscription(auth.uid())`
— no separate RPC needed, Postgres evaluates this exactly like any other
policy. `owner_id` is never trusted from the client: the
`enforce_conversation_owner` BEFORE INSERT trigger overwrites it with the
property's actual `owner_id` (and rejects messaging your own listing)
regardless of what was submitted.

**Recorded architectural decision**: once a conversation exists, the
renter may keep replying in it even after their subscription expires —
only *starting a new* conversation requires an active pass. This is
enforced structurally: the gate is on `conversations` INSERT, not on
`messages` INSERT, so there's no code path that needs to "remember" to
apply it after creation. Verified end-to-end in
`supabase/local-shim/test_m5_rls.sql` (a subscriber who later expires can
still read and reply in an existing conversation, but is rejected when
attempting to start a conversation about a different property).

### `messages`
`messages_insert_participant` requires `sender_id = auth.uid()` and that
the conversation is `active` and the sender is one of its two
participants — this is what lets an owner reply for free unconditionally,
since there's no subscription check here at all. A trigger
(`touch_conversation_on_message`) keeps `conversations.updated_at` current
for "most recent" sorting in the conversation list.

### `message_reports`
Same pattern as `property_reports`: any conversation participant may file
one; only the reporter and `admin`/`moderator` roles may read it.

### Realtime
`20260104000200_messaging_realtime.sql` adds `public.messages` to the
`supabase_realtime` publication so `RealtimeMessageListener`
(`components/messaging/RealtimeMessageListener.tsx`) can subscribe to new
messages. This migration references `supabase_realtime`, which only
exists in a real Supabase project — like the Storage bucket migration in
Milestone 3, it has **not** been applied against the plain-Postgres shim
used elsewhere in this repo's testing; it needs `supabase db reset`
against a real Supabase instance. RLS still gates Realtime the same as any
other read, so a client only receives change events for conversations it
can actually see.

## Milestone 6 — verification & trust

### `identity_verification_requests` / `property_verification_requests`
Both share the `verification_status` enum (`submitted | under_review |
verified | rejected | needs_more_info | expired`). Neither table has an
`authenticated` UPDATE policy at all — status can only change via
`service_role` (the Milestone 7 moderation review action), so an applicant
cannot self-verify. `property_verification_requests` INSERT additionally
requires the applicant to actually be the property's `owner_id` or
`manager_id`, checked in the policy itself — a renter cannot submit a
verification request for someone else's listing.

### `private_verification_documents`
Two nullable FKs (`identity_request_id`, `property_request_id`) with a
CHECK that exactly one is set, rather than a polymorphic owner column —
keeps real, enforceable foreign keys instead of a convention. RLS scopes
SELECT to the parent request's own applicant or moderation roles; never
public, never embedded in a property's public API response. Verified in
`supabase/local-shim/test_m6_rls.sql` (a stranger gets zero rows back for
both the request and its documents).

### Storage: `verification-documents` bucket
**Private** (`public = false`) — fundamentally different from Milestone
3's public `property-images` bucket, and never mixed with it. Access is
only ever through a short-lived signed URL
(`app/dashboard/verification/actions.ts#getSignedDocumentUrlAction`),
generated by `service_role` only after the caller has independently been
proven authorized by the normal RLS-scoped SELECT on
`private_verification_documents` that precedes it. `storage.objects` RLS
is also scoped to `owner = auth.uid()` or moderation roles as defense in
depth, in case anything ever bypassed the app layer. Like the Milestone 3
Storage migration, this references `storage.buckets`/`storage.objects`,
which only exist in a real Supabase project — not applied against the
plain-Postgres shim.

### Public verification badge functions
`is_identity_verified(user_id)` / `is_property_verified(property_id)` —
`SECURITY DEFINER`, return only a boolean, granted to `anon` and
`authenticated`. This is what lets a property's public page show
"Identity Verified" / "Property Documents Reviewed" without ever exposing
the underlying verification request or its documents through the public
API.

## Milestone 7 — admin, moderation, audit log, notifications

### `admin_audit_logs`
Records every sensitive administrative action (suspensions, listing
moderation, verification decisions, report resolutions). Readable **only
by `admin`** — not even `moderator` — a deliberate narrowing beyond "any
staff role," verified in `supabase/local-shim/test_m7_rls.sql`. Writable
only by `service_role`: even an admin's own `authenticated` session cannot
insert a row directly, which forces every write through
`lib/admin/audit.ts#recordAdminAction` and therefore through the Server
Action that called it (no code path writes to this table without also
performing the actual moderation action). `metadata` is a small JSON blob
for context (e.g. `{ decision: "verified" }`) — never a sensitive document
or unnecessary personal data.

### `notifications` / `notification_preferences`
Notifications are system-generated only — `authenticated` has no INSERT
policy, verified by an explicit self-insert attempt in the test suite. A
user may read and mark their own as read (`notifications_update_self`).
`notification_preferences` is a plain per-user settings row the user owns
outright (read/insert/update their own), since it carries no privileged
information.

### Who writes what
Every admin/moderation write in `app/admin/actions.ts` goes through
`service_role` (the underlying tables have no `authenticated` UPDATE
policy for moderation fields — see `properties`, the verification request
tables, and the report tables from earlier milestones) and is paired with
a `recordAdminAction` call and, where relevant, a `notifyUser` call. This
pairing is enforced by convention (every action in that file follows the
same four-step shape documented in its header comment) rather than by a
database trigger — a Milestone 8 hardening candidate would be to make the
audit-log write transactionally inseparable from the moderation write
itself (e.g. via a single `SECURITY DEFINER` function per action, as
Milestone 4 did for payment confirmation).

This completes the tables described in the original build brief's data
model (profiles/roles, properties, subscriptions/payments, messaging,
verification, admin/notifications). Any further schema changes from here
are tracked as migrations with their own dated filename, not appended to
this historical record.
