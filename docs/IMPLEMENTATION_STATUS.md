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

## Milestone 8 — Hardening & production readiness: ✅ Done (same documented sandbox limitation)

- **Missing public pages filled in**: `/legal/terms`, `/legal/privacy`,
  `/legal/subscription-terms` (each with a visible "draft, pending legal
  review" banner — `components/layout/LegalPageShell.tsx`), `/about`,
  `/safety`, `/how-it-works`, and a functional `/help` page with a working
  support-ticket submission form (new `support_tickets` table + RLS, 3/3
  SQL assertions pass). These were referenced from the Header/Footer since
  Milestone 1 but didn't exist until now — every nav link in the app now
  resolves to a real page.
- **Test suite expanded**: 29 Vitest unit tests across 4 files (was 6 in 1
  file) — `MockPaymentProvider.verifyWebhook` (6), format utilities (8),
  `listingCompleteness`/`slugify` (5), and Zod validation schemas (10).
  **Writing the validation tests caught two real bugs**, fixed in this
  milestone, not merely noted:
  1. `optionalBooleanCheckbox` (amenity checkboxes in the property form)
     rejected a genuinely absent form field with a Zod validation error
     instead of treating it as "unchecked" — every property create/update
     with an unchecked amenity box would have failed silently differently
     than intended. Root cause: `z.undefined()` as a bare union member
     doesn't make Zod treat the object key as optional; fixed by using
     `.optional()` on the wrapping schema instead.
  2. `optionalNumber` (bedrooms, bathrooms, floor area, advance rent,
     deposit, other fees, lease duration) silently coerced an empty form
     field to `0` instead of `null`, because `z.coerce.number()` happily
     turns `""` into `0` and was tried before the `z.literal("")` branch
     in the union. A property saved with blank "bedrooms" would have
     displayed "0 bedrooms" instead of omitting the field. Fixed with
     `z.preprocess` to normalize empty/absent input before coercion.
  Both are exactly the kind of bug "ship the feature, add tests later"
  misses — concrete evidence that writing real assertions earlier in each
  milestone (not deferred to the end) is worth the overhead.
- **Security headers added**: `X-Content-Type-Options`, `X-Frame-Options:
  DENY`, `Referrer-Policy`, a restrictive `Permissions-Policy`, and a
  `Content-Security-Policy` scoped to `'self'` + the configured Supabase
  origin — verified by curling a running production build and confirming
  every header is present on the response.
- **SEO**: `app/sitemap.ts` (static routes + every published property,
  with a safe fallback if Supabase is unreachable), `app/robots.ts`
  (disallows every private route prefix), and `robots: { index: false,
  follow: false }` was already added to every private page in Milestone 7.
- **Error handling**: global `app/not-found.tsx` and `app/error.tsx`
  (generic message only — no internal stack trace ever reaches the user),
  both using the design system rather than Next's default error screen.
- **Accessibility**: spot-checked image `alt` usage across the codebase —
  the property gallery's hero image has a descriptive alt
  (`"{title} — photo N of M"`); thumbnail/management-UI images use an
  empty `alt` deliberately (decorative, with the property title already
  shown as adjacent text), which is WCAG-compliant, not an oversight. The
  `.focus-ring` utility, semantic form labels, and `prefers-reduced-
  motion` support built in Milestone 1 apply uniformly across every
  milestone's components — there was no separate "accessibility pass" to
  bolt on because it was a day-one constraint, not an afterthought.
- Verified:
  - `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean (35
    routes — up from 26, the new public pages plus `/sitemap.xml` and
    `/robots.txt`).
  - `npm run test`: 29/29 Vitest tests pass.
  - Full regression: re-ran the complete M2–M8 SQL suite together against
    one fresh database — **61/61 assertions pass** across 7 test files
    (profiles/roles, properties, subscriptions/payments, messaging,
    verification, admin/notifications, support tickets).
  - Manually verified (via a running production build + `curl`) that
    `/`, `/sitemap.xml`, `/robots.txt` all return 200 and that every
    security header listed above is actually present on the response —
    not just configured and assumed to work.
  - Manually screenshot-verified `/how-it-works` and `/legal/terms`
    render correctly against the design system (draft banner included).
- **Not independently verified in this sandbox**: the same root-cause
  limitation as every prior milestone — no live Supabase Auth/PostgREST/
  Storage/Realtime instance was reachable here, so no milestone's UI was
  exercised against real signed-in sessions and real data end to end. This
  is the single biggest remaining verification gap before a real launch;
  everything else in this document is either independently proven (SQL/
  RLS assertions, unit tests, static rendering, HTTP-level checks) or
  explicitly flagged as unproven.

## Overall production-readiness summary

All 8 milestones are functionally complete: free browsing and listing,
the $5/30-day Direct Access Pass with server-verified payment activation,
direct messaging gated correctly on subscription state, identity/property
verification with private document storage, and a working admin/
moderation console with audit logging — every one of the ten non-
negotiable business rules in `CLAUDE.md` has a corresponding RLS policy or
server-side check, and most have a reproducible, passing SQL or unit test
proving it (90 total automated assertions: 61 SQL + 29 Vitest, all
passing as of this milestone).

**What stands between this and a real production launch** (see
`docs/DEPLOYMENT.md` for the full list):
1. A hosted Supabase project (or a Docker-capable machine to run
   `supabase start`) — this is the one gap underlying every "not
   independently verified in this sandbox" note across all 8 milestones.
2. A real, Liberia-capable payment provider — no production payment
   credentials exist; the architecture is ready, the provider isn't
   chosen (see `docs/PAYMENTS.md`'s research notes).
3. Legal review of the `/legal/*` pages and real business registration
   details to replace the placeholders in `lib/config/brand.ts`.
4. An email provider, if transactional email (password reset beyond
   Supabase's default, notification emails) is wanted — in-app
   notifications work without one.

Nothing in this list is a silently-dropped requirement; each is a
business/infrastructure decision that requires the project owner's
credentials or input, not more engineering time against this codebase.

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
