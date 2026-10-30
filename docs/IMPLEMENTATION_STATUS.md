# Implementation Status

Updated at the end of every milestone. This is an honest record — nothing is
listed as done unless it was built, run, and (where applicable) tested.

## Milestone 1 — Foundation & design system: ✅ Done

- Next.js 16 (App Router) + TypeScript strict + Tailwind v4 scaffolded.
- Design tokens (color/type/shape/spacing/shadow) in `app/globals.css`.
- UI primitives: `Button`, `Badge`, `Card`/`CardClay`, `Input`, `Skeleton`,
  `Dialog`, `Drawer`.
- Responsive nav shell: `Header` (desktop nav + mobile panel),
  `MobileTabBar`, `Footer`.
- Brand config centralized in `lib/config/brand.ts` ("DomiLink" placeholder).
- Homepage hero + how-it-works + empty "recently listed" state wired to the
  design system (no fabricated listings).
- `CLAUDE.md`, `docs/DESIGN_SYSTEM.md`, `.env.example` written.
- Verified: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build`
  succeeds with no warnings, manual screenshot check at 1280px and 390px
  viewports confirms the Claymorphism direction renders (no generic
  template look).

## Milestone 2 — Database & auth: ✅ Done (with a documented sandbox limitation)

- `supabase/migrations/20260101000100_profiles_and_roles.sql`: `profiles`,
  `user_roles`, `owner_profiles` + RLS, `handle_new_user` signup trigger,
  `has_role()` helper, table grants.
- Supabase Auth wiring: browser/server/service-role client factories
  (`lib/supabase/`), `proxy.ts` session-refresh middleware protecting
  `/account`, `/dashboard`, `/messages`, `/favourites`, `/admin`, plus a
  second server-side check (`requireUser`/`requireRole`) on every protected
  page — defense in depth, not middleware alone.
- Pages: register (with renter/owner intent), login, logout, forgot
  password, reset password, onboarding welcome, account settings (edit
  display name/phone).
- Role assignment is never client-writable — verified both by RLS policy
  design (no `authenticated` INSERT policy on `user_roles`) and by a
  reproducible SQL test that attempts self-escalation and asserts it's
  rejected.
- Verified:
  - `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean.
  - `supabase/local-shim/test_m2_rls.sql` run against a local Postgres 16
    instance with a Supabase-compatible `auth` shim: 8/8 assertions pass
    (signup auto-creates profile + default role; self profile update
    works; cross-user profile update is a no-op; self role-escalation to
    `admin` is rejected by RLS; non-privileged user can't read others'
    roles; `service_role`-granted `owner` role can create an
    `owner_profile`; a plain `renter` cannot).
  - Manual smoke test: built app started with placeholder Supabase env
    values; `/register` and `/login` render correctly (screenshot-checked
    against the design system) and `/account` (protected) correctly
    redirects unauthenticated requests to `/login?next=/account` (HTTP 307).
- **Documented limitation**: this sandboxed container's Docker daemon
  cannot start, so the full local Supabase CLI stack (real GoTrue,
  PostgREST, Storage, Realtime) was never exercised end-to-end here — only
  against the plain-Postgres RLS shim and static page rendering. A real
  signup→login round-trip against live Supabase Auth has **not** been run
  in this environment. This closes automatically on any machine where
  Docker works, or once a hosted Supabase project is connected — see
  `docs/DEPLOYMENT.md`.

## Milestone 3 — Property marketplace: ✅ Done (same documented sandbox limitation)

- Migrations: `properties`, `property_images`, `property_favourites`,
  `property_views`, `property_reports` + RLS + triggers
  (`20260102000100_properties.sql`); `property-images` public Storage
  bucket + path-scoped write policies (`20260102000200_...storage.sql`).
- Owner CRUD: list/create/edit/publish/unpublish/archive, availability
  toggle, image upload (drag-free click-to-upload, cover selection,
  delete) via the browser Supabase client straight to Storage, owner
  dashboard (overview stats + property list), listing-completeness
  indicator.
- Search: real Postgres-backed search (`services/properties.ts`) —
  keyword (full-text), county, city, category, price range, bedrooms,
  furnished — with pagination, 3 sort modes, URL-persisted filters, a
  desktop inline filter bar and a mobile filter `Drawer`, empty state with
  a "clear filters" recovery path.
- Property detail page: gallery, price, disclosed upfront-cost
  breakdown (rent + advance + deposit + other fees, each labeled "not
  provided" when absent rather than guessed), amenities, owner name,
  favourite + report-listing actions, similar-properties section, safety
  disclaimer. Contact-owner is an honest "not live yet" state (real
  messaging is Milestone 5, gated by the Milestone 4 subscription) rather
  than a non-functional button pretending to work.
- Favourites page (renter) wired to real data with a proper empty state.
- Homepage's "recently listed" section now shows real published listings
  with a graceful empty state when none exist yet (no fabricated demo
  listings).
- Verified:
  - `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean (15
    routes compiled, including the new dynamic property/search/dashboard
    routes).
  - `supabase/local-shim/test_m3_rls.sql` against the same local-Postgres
    shim: 9/9 assertions pass (owner can create own listing; cannot spoof
    another user as `owner_id`; a draft listing is invisible to other
    users; a non-owner cannot update another owner's listing; a published
    listing becomes visible to `anon`; `published_at` is stamped
    automatically; `favourite_count` increments via trigger; favourites
    are private; a property owner cannot read a report filed against their
    own listing).
- **Not independently verified in this sandbox**: the `property-images`
  Storage bucket/policies migration (needs live Supabase Storage, which
  this container's broken Docker daemon can't provide — see M2's note and
  `docs/DEPLOYMENT.md`), and no live end-to-end UI test of search/listing
  pages against real data (same root cause). Reviewed carefully, not run.

## Milestone 4 — Subscriptions & payments: ✅ Done (same documented sandbox limitation)

- Migration: `subscription_plans` (seeded with the real $5/30-day Direct
  Access Pass), `subscriptions`, `payment_transactions`,
  `payment_webhook_events` + RLS + the `confirm_payment_and_activate_
  subscription` SECURITY DEFINER activation function + the
  `has_active_subscription()` helper for Milestone 5.
- Provider-agnostic payment architecture (`lib/payments/`): `PaymentProvider`
  interface, a dev-only `MockPaymentProvider` that exercises the exact same
  verification/idempotency/activation code path a real provider would, and
  a factory that **refuses to construct the mock provider in production**.
- Checkout flow (`lib/subscriptions/service.ts`, `app/checkout/`), webhook
  handler (`app/api/payments/webhook/route.ts`) implemented as a Next.js
  Route Handler rather than a Supabase Edge Function (documented reason +
  port-over instructions: `supabase/functions/payments-webhook/README.md`).
- Pricing page with live subscription status, account page subscription
  status + payment history.
- Verified:
  - `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean (18
    routes, including the new checkout/pricing/webhook routes).
  - `npm run test` (Vitest): 6/6 unit tests pass for
    `MockPaymentProvider.verifyWebhook` (rejects missing/wrong secret,
    malformed JSON, missing fields, unrecognized status; accepts a
    well-formed authenticated event) — this is the first automated test
    suite in the project, run for real, not just described.
  - `supabase/local-shim/test_m4_rls.sql` against the same local-Postgres
    shim: 12/12 assertions pass, including the ones that matter most for
    this milestone's non-negotiable rules — a client cannot self-activate
    a subscription or self-insert a confirmed payment; the activation
    function is not callable by `authenticated`; a confirmed payment
    activates a subscription with a server-computed ~30-day expiry; a
    duplicate webhook event is rejected by a unique constraint; re-running
    activation for an already-confirmed transaction does not extend the
    expiry; a failed payment never activates anything.
- **Not independently verified in this sandbox**: no live end-to-end run
  of checkout → mock payment page → webhook → activated subscription
  through the actual Next.js app (needs live Supabase Auth/PostgREST,
  unavailable here — same root cause as M2/M3). The business logic those
  routes call has been verified directly at the database layer instead.

## Milestone 5 — Direct messaging: ✅ Done (same documented sandbox limitation)

- Migration: `conversations`, `messages`, `message_reports` + RLS
  (`20260104000100_messaging.sql`) and a `supabase_realtime` publication
  migration for `messages` (`20260104000200_...realtime.sql` — not
  applicable to the plain-Postgres shim, same caveat as the M3 Storage
  bucket migration).
- **The subscription gate is implemented as RLS on `conversations` INSERT
  itself** (`has_active_subscription()` in the policy's `WITH CHECK`),
  not as application logic that could be bypassed or forgotten — this was
  a deliberate simplification over a SECURITY DEFINER RPC, recorded in
  `docs/DATABASE_SCHEMA.md`. `owner_id` is derived server-side from the
  property via a trigger, never trusted from the client.
- Full messaging UI: conversation list (unread indicator, real data,
  proper empty state), conversation thread (bubble layout, realtime
  listener, report action), reply composer with a basic rate limit,
  subscription-gate dialog wired into the property page's contact-owner
  form (replacing Milestone 3's honest placeholder).
- Verified:
  - `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean (19
    routes, including `/messages` and `/messages/[id]`).
  - `supabase/local-shim/test_m5_rls.sql`: 11/11 assertions pass,
    including the scenario that matters most — a subscriber starts a
    conversation, the owner replies for free, a non-participant is
    blocked from reading or writing, and **after the subscriber's
    subscription expires they can still read and reply in that existing
    conversation but are rejected when trying to start a brand-new one**.
  - Full regression check: re-ran M2–M5's SQL suites together against one
    fresh database (40/40 assertions pass) plus the M4 Vitest suite
    (6/6), confirming the migrations compose correctly in order.
- **Not independently verified in this sandbox**: the Realtime
  publication migration (needs a live Supabase project, same root cause as
  the M3 Storage migration) and no live end-to-end UI run of the
  messaging pages against real Supabase Auth/PostgREST.

## Milestone 6 — Verification & trust: ✅ Done (same documented sandbox limitation)

- Migration: `identity_verification_requests`,
  `property_verification_requests`, `private_verification_documents` + RLS
  (`20260105000100_verification.sql`); private `verification-documents`
  Storage bucket + path/owner-scoped policies
  (`20260105000200_...storage.sql` — Supabase-only, same caveat as M3's
  bucket migration).
- Neither verification request table has a client-writable UPDATE policy
  — only `service_role` (Milestone 7's moderation review) can mark
  something `verified`/`rejected`. Public badge functions
  (`is_identity_verified`/`is_property_verified`) return only a boolean,
  never the underlying request/document data.
- Verification center (owner dashboard): identity verification submission
  + document upload, per-property verification submission + document
  upload, status display with reviewer notes. Documents are only ever
  viewed via a 60-second signed URL generated after an independent
  authorization check.
- `VerificationBadge` wired into the property detail page — only renders
  when `is_identity_verified`/`is_property_verified` return true for the
  real owner/property, never as a static/decorative element.
- Availability reconfirmation: owner dashboard flags a published listing
  stale after 14 days with no confirmation, with a one-click "Reconfirm
  now" action. (Automated reminder *notifications* and any search-ranking
  deprioritization of stale listings are left to Milestone 7's
  notification system and are not yet implemented — this milestone covers
  the self-service reconfirmation mechanism only; see the note below.)
- Verified:
  - `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean (20
    routes, including `/dashboard/verification`).
  - `supabase/local-shim/test_m6_rls.sql`: 9/9 assertions pass, including
    the core guarantees — an applicant can submit and attach documents to
    their own request but cannot self-verify it (RLS rejects the attempt
    outright), a stranger cannot read the request or its documents, a
    moderator can read a pending request for review, and
    `is_identity_verified()` correctly flips from false to true only after
    a `service_role` approval.
  - Full regression: re-ran M2–M6's SQL suites together against one fresh
    database (50/50 assertions pass) plus the M4 Vitest suite (6/6).
- **Not independently verified in this sandbox**: the verification
  documents Storage bucket migration (needs a live Supabase project, same
  root cause as M3/M5's Storage/Realtime migrations) and no live
  end-to-end UI run of the verification center against real Supabase
  Auth/Storage.

## Milestone 7 — Admin & notifications: ✅ Done (same documented sandbox limitation)

- Migration: `notifications`, `notification_preferences`, `admin_audit_logs`
  + RLS (`20260106000100_admin_notifications.sql`). Audit log readable
  only by `admin` (not `moderator`) and writable only by `service_role` —
  not even an admin's own authenticated session can insert a row
  directly. Notifications are system-generated only.
- Admin console: real-aggregate overview (`/admin`, admin-only revenue
  total hidden from moderators), listings moderation queue
  (`/admin/listings`), identity/property verification review queue
  (`/admin/verifications`, with document preview reusing Milestone 6's
  `DocumentLink`), combined property/message report queue
  (`/admin/reports`), and admin-only user suspend/restore
  (`/admin/users`).
- `app/admin/actions.ts`: every privileged action re-checks role
  server-side, writes via `service_role`, records an `admin_audit_logs`
  entry, and notifies the affected user where relevant — a consistent
  four-step shape documented in the file's header comment.
- In-app notification center (`/notifications`) with mark-read/mark-all-
  read and a preferences form; the payment webhook now notifies on
  subscription activation and payment failure (`subscription_activated`,
  `payment_failed`).
- Added `robots: { index: false, follow: false }` to every private page
  (account, dashboard, admin, messages, notifications, favourites) — not
  originally scoped to this milestone, but cheap and directly matches the
  brief's SEO requirement that private pages never be indexed; full SEO
  pass (sitemap, OG metadata, structured data) remains Milestone 8.
- Verified:
  - `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean (26
    routes, including the `/admin/*` and `/notifications` trees).
  - `supabase/local-shim/test_m7_rls.sql`: 8/8 assertions pass, including
    the two that matter most — the audit log is unreadable by moderators
    and un-writable by anyone but `service_role` (even an admin's own
    session), and notifications cannot be self-inserted by a user.
  - Full regression: re-ran M2–M7's SQL suites together against one fresh
    database (58/58 assertions pass) plus the M4 Vitest suite (6/6).
- **Not independently verified in this sandbox**: no live end-to-end run
  of the admin console or notification center against real Supabase
  Auth/PostgREST (same root cause as every prior milestone's UI layer).

## Scope note: what Milestone 7 does NOT include

Per the build brief's own emphasis on honest status reporting: this
milestone implements moderation/admin *actions* and *notifications*, but
does not implement a cron-driven reminder scheduler (e.g. an automated
"your listing needs reconfirmation" push after 14 days — Milestone 6 built
the self-service reconfirmation UI, not a background job that emails or
notifies the owner unprompted), nor SMS delivery, nor a real email
provider integration (notification *records* are created; actual email
sending is gated on `EMAIL_PROVIDER` being configured, which it isn't —
see `.env.example`). These are reasonable Milestone 8+/production-wiring
items, not silently-dropped requirements.

## Milestone 8 — Hardening & production readiness: ⏳ Not started

## Known production blockers (require the project owner)

- **Hosted Supabase project**: development is intended to run against a
  local Supabase stack (Docker), but this sandboxed build container's
  Docker daemon doesn't start, so local development here falls back to a
  plain-Postgres RLS shim (see `docs/ARCHITECTURE.md`). No environment so
  far has exercised live Supabase Auth/PostgREST/Storage. Production needs
  a real project URL + anon key + service-role key supplied via `.env`, and
  a full `supabase start` run (on Docker-capable hardware) or a hosted
  project is strongly recommended before launch to close this gap.
- **Real payment provider**: no Orange Money Liberia / MTN MoMo / card
  processor credentials exist. The payment architecture is provider-agnostic
  with a dev-only mock provider; a real integration needs merchant
  onboarding + API credentials from a provider that supports a Liberia-based
  merchant (see `docs/PAYMENTS.md`, written in Milestone 4).
- **Legal/business identity**: company legal name, support phone, and office
  address are placeholders pending real business registration — see
  `lib/config/brand.ts`.
- **Email/SMS providers**: unconfigured; in-app notifications work without
  them, transactional email/SMS is documented but inactive until credentials
  are supplied.
