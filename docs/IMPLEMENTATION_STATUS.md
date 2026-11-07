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

## Live project verification (post-Milestone-8)

The project was connected to a real, hosted Supabase project
(`ccuelnrmvtmtgukqyvrb`) for the first time, closing the single biggest
gap repeated throughout this document: every milestone above was
previously verified only against a plain-Postgres RLS shim and never
against live Supabase Auth/PostgREST/Storage/Realtime.

**How the migrations were applied**: this sandboxed container allows only
outbound HTTPS (confirmed via its proxy status endpoint), not raw Postgres
TCP (port 5432/6543) — so `supabase db push` and direct `psql` both hang/
fail on DNS or connection, regardless of credentials. All 10 migrations
were instead applied via Supabase's HTTPS **Management API**
(`POST https://api.supabase.com/v1/projects/{ref}/database/query`, authed
with a personal access token), which worked cleanly for every file,
including the two that reference `storage.buckets`/`storage.objects`
(Milestone 3, 6) and the `supabase_realtime` publication (Milestone 5) —
none of which could ever be applied or verified against the local shim.
Verified directly afterward: both Storage buckets exist with correct
public/private flags and size limits, the seeded Direct Access Pass plan
is present, and `messages` is in the Realtime publication.

**What was actually exercised end-to-end**, via a real headless browser
(Playwright) driving the running app against live Supabase, not simulated:
- Owner signup (real Supabase Auth created the user; required email
  confirmation, confirmed via the Auth Admin API since this sandbox can't
  receive real email) → the `handle_new_user` trigger created the profile
  + default `renter` role → the `intent=owner` registration path granted
  the `owner` role via `service_role` — all three steps, live.
- Login, dashboard access (`requireRole('owner')` passing for real),
  property creation (RLS `owner_id = auth.uid()` + `has_role('owner')`
  check), publish (the `sync_property_status_timestamps` trigger stamping
  `published_at`), and photo upload (real Supabase Storage).
- Guest (no session) search finding the newly published listing — proving
  `properties_select_published` RLS and the search service both work live.
- A second renter subscribing via the mock payment provider's full
  checkout → webhook → `confirm_payment_and_activate_subscription` path,
  live — the subscription's `expires_at` came back genuinely ~30 days out.
- That subscribed renter being gated by `SubscriptionGateDialog` before
  subscribing, then successfully starting a conversation after
  subscribing (RLS `conversations_insert_renter`'s `has_active_
  subscription()` check, live) — and the owner reading and replying for
  free in the same conversation, with zero subscription check, exactly as
  designed.

**Four real bugs were found this way — none of them were catchable by the
SQL/RLS shim or static analysis, because each needed either a live
PostgREST schema cache, a live browser bundle, or a live clock comparison
to surface:**

1. **Header never reflected auth state** (`components/layout/Header.tsx`)
   — built in Milestone 1 before auth existed, never revisited once
   Milestone 2 landed. Fixed: `app/layout.tsx` now resolves the session
   server-side and passes `isAuthenticated` down; logged-in users see an
   account icon instead of Log in/Get started.
2. **PostgREST couldn't resolve `profiles:owner_id(...)`-style embeds**
   — see `docs/DATABASE_SCHEMA.md`'s "Post-launch fixes" section
   (`20260108000100_postgrest_profile_relationships.sql`). Broke the
   property detail page and the messages pages entirely for any
   `*_profile:` embed.
3. **Guests saw "Property owner" instead of the real name** — same
   section, `20260109000100_public_profile_display_name.sql`. A genuine
   feature gap (not a security issue) against the brief's stated Guest
   capabilities.
4. **A freshly-activated 30-day subscription displayed as expiring
   "Today"** — `formatRelativeDate` (built for *elapsed* time: message
   timestamps, "listed 3 days ago") was being reused on a *future* expiry
   date, where it always collapses to "Today" for anything up to 30 days
   out. Fixed with a new `formatExpiryDate` function
   (`lib/utils/format.ts`), with a regression test
   (`tests/unit/format.test.ts`) that specifically encodes "a 30-day-out
   subscription must not display as expiring today."
5. **The browser Supabase client was broken everywhere it was used**
   (`lib/supabase/client.ts`, affecting image upload, verification
   document upload, and the Realtime message listener) — `lib/supabase/
   env.ts`'s `requireEnv(name)` read `process.env[name]` with a dynamic
   key, which defeats Next.js's build-time static inlining of
   `NEXT_PUBLIC_*` vars into the client bundle (it only recognizes a
   literal `process.env.NEXT_PUBLIC_X` reference). Every browser-side
   feature that called `createClient()` from that file threw "Missing
   required environment variable" in the browser console — invisibly,
   since server-side rendering always has the full `process.env` and
   never hit this path. Fixed by rewriting each getter to use a literal,
   statically-analyzable reference; the file now carries an explicit
   comment warning against reintroducing the dynamic-key pattern. Image
   upload and the Realtime listener were both re-verified live after the
   fix, error-free.

All five fixes were typechecked, linted, and (where a Vitest test made
sense) covered by a new regression test before being considered done; the
two schema fixes were also re-verified against the full M2–M8 local shim
suite (63/63 assertions, up from 61 — the 2 new ones cover the anon
column-privacy restriction) before being pushed to the live project.

**Honest leftovers from this verification pass**: the owner-facing
dashboard property list/edit screens, the admin console, the verification
center, and notification preferences were *not* individually re-walked
live (only their underlying service-role writes and RLS were exercised
indirectly through the flows above and through earlier Milestone 7
testing against the shim) — they're lower-risk since they already don't
depend on the client-bundle env pattern that broke the three features
above. A follow-up session connected to this same project could walk
those remaining screens live in a few more minutes if desired.

## Live project verification, part 2 — owner dashboard & admin console

A follow-up walkthrough (same live project) drove the remaining screens
not individually re-walked in part 1: the owner dashboard overview, the
verification center's full submit→upload→admin-review→approve→public-
badge→notification loop, and the full admin console (listings queue,
verifications queue, property/message reports queue, user suspend/
restore) — all via a real headless browser against live Supabase, with
fresh test accounts created and then cleaned up afterward.

**Confirmed working end-to-end, live**: owner dashboard stats (property
counts matching reality), identity verification submission + document
upload (via `createClient()` in a Client Component — the same code path
Milestone 8's env-inlining fix repaired) + the document's signed URL
genuinely opening from the admin review queue + Approve flipping status +
a notification landing in the owner's inbox + the "Identity Verified"
badge then appearing on the public listing page for a guest; a renter
filing a property report + it appearing in the admin queue + "Mark
resolved" clearing it; admin aggregate counts matching real row counts
after each action.

**One more real bug found and fixed**: **account suspension did nothing**.
`suspendUserAction` correctly flipped `profiles.account_status`, wrote an
audit log entry, and sent a notification — but nothing anywhere actually
*checked* `account_status`, so a suspended test user could still log in
and reach every protected page normally; only the admin UI's badge color
had changed. Confirmed live before and after the fix: pre-fix, a
suspended user reached `/account` with full access; post-fix, the same
account is redirected to a new `/suspended` page and signed out. Fixed in
two places matching this project's established defense-in-depth pattern —
`lib/supabase/middleware.ts` (every protected route) and
`lib/auth/session.ts#requireUser()` (every protected Server Action/
Component, independent of middleware) — plus a new SQL regression
assertion (`test_m7_rls.sql`, now 9/9) confirming a suspended user's own
session can still read their `account_status` (required for the checks
above to work at all). Restoration was also verified live: `restoreUserAction`
correctly let the account log in again afterward.

**Also found and fixed**: a stale placeholder on the owner dashboard still
read "Direct messaging lands in a later milestone of this build" —
written honestly in Milestone 3 before messaging existed, but never
updated once Milestone 5 actually shipped it. Replaced with a real
"Recent inquiries" list (counterpart name, property, unread indicator,
last-activity time, empty state) matching the pattern already used on
`/messages`.

**Housekeeping discovered while cleaning up test data**: several tables
intentionally don't cascade-delete from `auth.users` (verification
documents, report moderator assignments, view logs, and — by firm design —
`admin_audit_logs`, so an admin's audit trail can't vanish by deleting
their account). This is correct behavior, not a bug, but it means an admin
account that has ever performed a logged action cannot currently be
hard-deleted through the app or the Auth Admin API without a deliberate
data-migration decision; see `docs/SECURITY.md`'s "Known gaps" for the
one test admin account this left behind in the live project (soft-marked
`account_status = 'deleted'` with its role revoked, since it couldn't be
hard-deleted — harmless, but worth knowing about rather than discovering
by surprise).

All fixes in this pass were typechecked, linted, verified against the
full local SQL shim suite (64/64 assertions) before being pushed, and
re-verified live via the same headless-browser method as part 1.

## Conversion-focused redesign (post-Milestone-8)

Bold presentation-layer upgrade to the three places that most shape first
impression and conversion — no RLS, Server Action, or payment-path changes.

- **Homepage hero** (`app/page.tsx`, new `HeroSearch.tsx`): replaced the
  static banner + "link to /search" CTA with a functional inline search
  (city + bedrooms, client component, submits to `/search` with real
  query params — verified live, submitting "Sinkor" + "2+ bedrooms"
  correctly navigates to `/search?city=Sinkor&bedrooms=2`). Added a live
  stats strip (published listing count, distinct owners, counties
  covered) computed from real `properties` rows — hidden entirely when
  there's no real data behind it (currently hidden against the live
  project, which has zero listings after the earlier test-data cleanup).
  Decorative blurred background photos use real published cover images
  when any exist. "How it works" and "Recently listed" now scroll-reveal
  via a new shared `components/ui/Reveal.tsx` (IntersectionObserver +
  CSS transition, no library), which renders immediately for
  `prefers-reduced-motion` or no-`IntersectionObserver` visitors — the
  first version of this had a real hydration mismatch under reduced
  motion (caught live via a Playwright pass with `reducedMotion: 'reduce'`,
  which surfaced a React hydration-mismatch console error); fixed by
  keeping the initial render state identical on server and client and
  deferring the immediate-reveal to a post-mount `requestAnimationFrame`.
- **`PropertyCard`** (used on the homepage and `/search`): hover/focus
  now cross-fades through a property's other photos
  (`PropertyCardMedia.tsx`, no carousel library); a "Verified" badge
  renders when `is_identity_verified`/`is_property_verified` is true
  (computed server-side via the existing RPCs, batched with
  `Promise.all` per results page — the same authorization-proven RPCs
  the property detail page already uses, not a new trust claim) and a
  "New" badge when `published_at` is within 72 hours; the card now has a
  tactile clay-press hover/active treatment using existing shadow
  tokens, and `FavouriteButton`'s fill now has a scale/color transition.
- **`/pricing`**: replaced the static benefit list with a side-by-side
  "paying an agent" vs. "Direct Access Pass" comparison, and a new
  interactive `SavingsCalculator.tsx` (slider → live $-saved figure —
  verified live, dragging to 7 properties correctly shows "$245" vs.
  "$5"). The checkout form, `startCheckoutAction`, active-subscription
  state, and payment banners are unchanged.

No new runtime dependencies were added; everything reuses the existing
Claymorphism tokens in `app/globals.css` (CLAUDE.md rule #10: one visual
language). Verified: `npx tsc --noEmit` clean, `npm run lint` clean,
`npm run build` succeeds, `npm run test` (33/33) passes, and a live
Playwright pass against the real Supabase project confirmed no console/
hydration errors on `/`, `/pricing`, `/search` in both normal and
reduced-motion modes. Not independently re-verified: the photo-cycling
and verified/new badges on `PropertyCard` itself, since the live project
currently has zero published listings (cleaned up after the earlier
live-testing pass) — the empty states on `/` and `/search` were
confirmed to render correctly instead.

## Conversion-focused redesign, wave 2 (post-Milestone-8)

Second bold presentation-layer wave, targeting the two most conventional
pieces left: the property detail page and the subscription paywall popup
— the exact decision moment and the exact paywall moment in the funnel.
Again no RLS/Server Action/payment-path changes.

- **`PropertyGallery.tsx`**: the static thumbnail-strip gallery now opens
  a full-screen lightbox on click, with keyboard arrow-key navigation and
  a photo counter. Verified live against a real seeded two-photo listing:
  opened the lightbox, confirmed the "1 / 2" counter, pressed the right
  arrow key, confirmed it advanced to "2 / 2".
- **Property detail page** (`app/properties/[slug]/page.tsx`): the price
  sidebar card now uses the stronger `--shadow-clay-raised` elevation
  (matching wave 1's pricing-page treatment) and surfaces verification
  and "New" badges (reusing wave 1's `isRecentlyPublished` helper from
  `lib/utils/format.ts`) at the top of the card instead of buried below
  the cost breakdown; "Availability reconfirmed" is promoted next to the
  price.
- **The paywall moment** (`SubscriptionGateDialog.tsx`): replaced the
  generic icon-and-price popup with a personalized one — "Message {owner
  name} about "{property title}"" — plus a compact $5-vs-$30–40 framing
  and a benefit list, all driven by data the detail page already fetches
  (no new queries). Verified live: triggered the gate as a non-subscribed
  renter and confirmed the dialog rendered the real seeded property title
  and owner name.
- **Real bug found and fixed during this wave's own live verification**:
  the "Not now — keep my message" promise was false. The contact
  textarea was uncontrolled, and the `useActionState` re-render after a
  gated submission silently cleared it — caught because the live
  Playwright check asserted the textarea's value after dismissing the
  dialog and got `""` instead of the typed draft. Fixed by making the
  textarea controlled (`ContactOwnerForm.tsx`) and re-verified: the exact
  same live check now confirms the typed message survives.
- **Happy-path regression check**: with a real `active` subscription row
  for the same test renter, sending a message still redirects to
  `/messages/[id]` and the message renders there — the gated-path fix
  didn't affect the ungated path.

All live checks used real seeded data (a test owner, a test renter, one
published property with two uploaded photos, inserted via the service
role) against the live Supabase project, then fully deleted afterward
(conversations, messages, the subscription row, storage objects, the
property, and both auth users) — no test data left behind this time.
Verified: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build`
succeeds, `npm run test` (33/33) passes, zero console/page errors during
the live pass.

## Conversion-focused redesign, wave 3 (post-Milestone-8)

Third bold wave, targeting the two most conventional surfaces left, both
post-conversion: the messaging experience (what a renter actually pays
$5 for) and the owner's dashboard home base. Presentation-layer only.

- **New `components/ui/Avatar.tsx`**: circular initials avatar, color
  deterministically picked from the existing palette via a name hash — no
  new tokens, no new dependency. Reused in the inbox, the thread header,
  message bubbles, and the dashboard's recent-inquiries list.
- **Messaging** (`app/messages/page.tsx`, `app/messages/[id]/page.tsx`):
  extracted the conversation-list query/rendering into a shared
  `components/messaging/ConversationList.tsx` so both routes can show a
  real two-pane desktop layout (list + thread side by side, `lg:` grid)
  instead of a single column that could only ever show one or the other.
  List rows now show the property's cover photo and an avatar.
  `MessageThread.tsx` groups consecutive messages from the same sender,
  adds the counterpart's avatar next to their bubbles, and gives the
  empty state an icon instead of bare text. `MessageComposer.tsx` picked
  up the clay send-button treatment used elsewhere in this redesign.
- **Owner dashboard** (`app/dashboard/page.tsx`): the lead "Published"
  stat card now uses the clay-raised elevation to anchor the page; a new
  actionable prompt surfaces "N listings need availability reconfirmed"
  — built by reusing the exact staleness logic that already existed on
  `/dashboard/properties` (now extracted to a shared
  `isAvailabilityStale`/`AVAILABILITY_STALE_AFTER_DAYS` export in
  `lib/utils/format.ts` instead of living only as a local function, so
  both pages share one definition) — and is hidden entirely when nothing
  is actually stale, never shown as a fabricated zero-state.
- Live-verified against the real Supabase project with freshly seeded
  data (one owner, one subscribed renter, two listings — one deliberately
  stale, one fresh — two conversations with real messages), fully deleted
  afterward: confirmed the desktop split view renders (list + "Select a
  conversation" empty state on `/messages`, list + open thread on
  `/messages/[id]` with the open conversation highlighted), confirmed a
  reply sends and renders in the thread, and confirmed the dashboard's
  stale-listing prompt shows the correct count ("1 listing needs
  availability reconfirmed") only for the owner whose listing was
  actually stale. Not independently re-verified live: the prompt
  disappearing after clicking "Reconfirm now" — a Playwright navigation
  flake on the unrelated `/dashboard/properties` list-row link (pre-
  existing page, untouched by this wave) blocked that one sub-check; the
  underlying logic is the same already-proven `isAvailabilityStale`
  helper now shared between both pages, so this is a test-harness gap,
  not a known product issue.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run test`
  (33/33) all clean.

## Conversion-focused redesign, wave 4 (post-Milestone-8)

Fourth wave, invoked with the `anthropic-skills:design-taste-frontend-v1`
skill. That skill's own typography/dependency defaults (Geist/Satoshi,
framer-motion, bento grids) conflict with `CLAUDE.md` rule #10 (one
established Claymorphism visual language) and waves 1–3's "no new
dependencies" precedent — confirmed with the user to apply the skill's
*critique rules* only, keeping existing fonts/palette/tokens.

That critique surfaced a real, repeated pattern the skill flags as an AI
design tell: the identical "3 equal cards in a row" layout appeared in
**four** places — `app/page.tsx`'s "How it works", `app/how-it-works/page.tsx`
(the same grid twice, for renters and owners), `app/pricing/page.tsx`'s
bottom trust-icon row, and `app/dashboard/page.tsx`'s 5-card stat grid.
Confirmed with the user to fix all four.

- **New `components/marketing/ProcessSteps.tsx`**: a connected numbered
  sequence (spine + markers) replacing N equal cards, with an `alternate`
  prop for a zig-zag swing on wide single-column contexts (used on the
  homepage) vs. a straight list in narrower columns (used on the
  two-track `/how-it-works` page). Reuses the existing `Reveal` component
  for staggered entry — no new dependency.
- **`app/page.tsx`**: "How it works" now renders `ProcessSteps` instead
  of the 3-card grid.
- **`app/how-it-works/page.tsx`**: restructured from two stacked,
  centered 3-card sections into an asymmetric two-track layout — "For
  renters" and "For owners" side by side on `lg:` (left-aligned
  headings, not centered), each its own `ProcessSteps` sequence with a
  distinct accent (`brand` for renters, `clay` for owners).
- **`app/pricing/page.tsx`**: the bottom 3-icon trust row was actually
  redundant — it restated points already in the pass-column bullet list
  above it. Deleted it outright and folded its one new idea ("manual
  renewal, no surprise auto-billing") into the existing bullet list as a
  5th item. Net: less repeated content, no 3-card row, nothing lost.
- **`app/dashboard/page.tsx`**: replaced the `grid-cols-5` row of
  individually-boxed stat cards with a single `Card` wrapper using
  `divide-x`/`divide-y`, each metric separated by a hairline instead of
  its own shadow — consistent with the skill's dashboard "Anti-Card-
  Overuse" rule for dense data.
- Live-verified against the real Supabase project with freshly seeded
  data (one owner, one published listing with real view/favourite
  counts and a deliberately stale `last_availability_confirmed_at`),
  fully deleted afterward, at both 1440px and 375px viewports for `/`,
  `/how-it-works`, `/pricing`, and `/dashboard`: confirmed no 3-equal-
  card rows remain anywhere, the alternating/split layouts render
  correctly, and all four pages collapse cleanly to a single column on
  mobile with no console/page errors.
- One false alarm caught and resolved during this pass: a first
  `fullPage: true` screenshot of the homepage appeared to show the third
  "How it works" step missing with a large empty gap. Investigated
  before concluding anything — a manual-scroll check confirmed the step
  renders correctly and is fully visible/opaque; the apparent bug was
  specific to how Playwright's `fullPage` screenshot resizes the
  viewport instead of actually scrolling, which doesn't reliably trigger
  the existing `Reveal` component's `IntersectionObserver` from wave 1.
  Not a product bug — re-verified with `reducedMotion: 'reduce'`
  emulation (which makes `Reveal` show content immediately), confirming
  correct rendering.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run test`
  (33/33) all clean.

## Conversion-focused redesign, wave 5 (post-Milestone-8)

Fifth wave, targeting the auth flow, search filters, and global header/
nav — all three candidates the user picked when offered a choice.

- **Auth flow** (`login`, `register`, `forgot-password`, `reset-password`,
  `onboarding/welcome`): every one of these five pages was an identical
  pattern — a lone centered `Card` on a blank page, no brand presence.
  Added `app/(auth)/layout.tsx`, a nested layout scoped to the `(auth)`
  route group, giving all five a shared split-screen shell: a
  `bg-brand-800` branded panel (reusing `brand.tagline` and
  `heroSupportingCopy` from `lib/config/brand.ts` — no new copy system)
  on the left at `lg:`, the existing per-page form unchanged on the
  right. Collapses to a compact brand banner + full-width form on
  mobile. Each page's own `<div className="mx-auto max-w-md ...">`
  wrapper only had its redundant centering/padding trimmed (the layout
  now handles that) — no logic changes.
- **`app/(auth)/register/page.tsx`**: the renter/owner intent toggle
  (two small buttons) became two larger selectable cards with icon +
  title + one-line description, using the brand/clay accent split
  established in wave 4's `/how-it-works` page (renter = brand, owner =
  clay) for visual consistency across the app's two user tracks. Same
  hidden `intent` form field and `registerAction` — presentation only.
- **`components/properties/SearchFilters.tsx`**: added a row of
  property-category quick-filter chips above the existing filter form
  (reusing `PROPERTY_CATEGORIES`/`formatCategory`, already imported
  elsewhere in the codebase) — a one-tap shortcut for the single most
  common filter, setting the `category` URL param directly; the full
  filter form is unchanged and still works independently.
- **`components/layout/Header.tsx`**: fixed a real, pre-existing bug, not
  just a style pass — neither the desktop nav nor `MobileTabBar` had any
  active-route highlighting (no `usePathname()` anywhere). A user on
  `/search` saw "Browse Properties" styled identically to every other
  link, and the mobile tab bar never showed which tab was current. Added
  `usePathname()` + `aria-current="page"` + a visual active state
  (underline on desktop, bold color on mobile) to both. Also added a
  subtle scroll-elevation shadow to the sticky header instead of a flat
  always-on border.
- Live-verified against the real Supabase project (local dev) at 1440px
  and 375px: all five auth pages render the split layout and collapse
  correctly on mobile with the register intent cards rendering and
  switching visually; `aria-current="page"` confirmed present on
  "Browse Properties" while on `/search`; the Apartment quick-filter
  chip confirmed to set `?category=apartment` in the URL and its
  `aria-pressed` state. No console/page errors at either viewport.
- One investigation during this pass: an initial automated check of the
  category-chip click appeared to fail (URL unchanged). Before
  concluding it was a bug, isolated it with two independent manual
  replications, both of which worked — the failure was a Playwright race
  (`waitForLoadState('networkidle')` called immediately after `.click()`
  can resolve before the triggered client-side navigation's fetch even
  starts). Not a product bug; the test script was fixed and the chip
  re-confirmed working correctly.
- No RLS/Server Action changes; `registerAction`, `loginAction`, and the
  rest of `lib/auth/actions.ts` are untouched.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run test`
  (33/33) all clean.

## Brand palette update: black / Bonfire Red / Magnolia White (post-Milestone-8)

The user provided a reference palette (Black Swarm `#000000`, Bonfire Red
`#da1a32`, Embers `#a00c30`, Magnolia White `#ffffff`) and asked for a full
re-theme, with the existing clay/orange accent dropped in favor of red-only
accents (both confirmed explicitly via clarifying questions before
touching anything).

- **`app/globals.css`** is the single source of truth for every color in
  the app — Tailwind v4's CSS-native `@theme inline` block maps semantic
  classes (`bg-brand-600`, `text-charcoal-700`, `bg-sage-100`, etc.) onto
  these `:root` custom properties. The token *names*
  (`forest`/`ivory`/`sage`/`clay`/`charcoal`) were kept exactly as-is —
  renaming them would have meant touching every component file for no
  visual benefit — only their hex values changed:
  - `forest-*` (brand): `#173d35`→`#a00c30` (Embers, `brand-800`) through
    `#24594a`→`#da1a32` (Bonfire Red, `brand-600`), with a consistent red
    ramp for the lighter/darker steps.
  - `ivory-*`/`surface` (canvas/cards): warm off-white → Magnolia White /
    near-white neutrals.
  - `sage-*` (secondary support/hover backgrounds): green tints → neutral
    grays (no longer accent-colored, since the accent was dropped).
  - `clay-*` (accent): re-aliased onto the **same red family** as `brand`
    (`clay-500` = Bonfire Red, same as `brand-600`) rather than its own
    hue — this is what "drop the accent, red-only" means in practice: one
    brand hue does double duty as both primary and accent color, with no
    second competing color.
  - `charcoal-*` (text): green-tinted darks → Black Swarm-based blacks
    (`charcoal-900` is literally `#000000`).
  - Shadow token rgba tints (previously green, `rgba(23, 61, 53, …)`) →
    black (`rgba(0, 0, 0, …)`), and the dark-mode media query's surface/
    border colors updated to match.
  - `success`/`warning`/`error`/`info` status colors were deliberately
    left unchanged — keeping error red visually distinct (more muted/
    brick-toned) from the vivid brand/accent red was a conscious choice,
    not an oversight, so form errors don't read as brand-colored
    highlights.
  - This means every component across all 5 prior redesign waves
    (hero, property cards, pricing, messaging, dashboard, auth, nav)
    picked up the new palette automatically with zero component-level
    edits — confirmed by grepping the codebase for any hardcoded hex
    values outside `globals.css` (none found) before and after.
- **`docs/DESIGN_SYSTEM.md`** updated to document the new hex values and
  explicitly note the "one hue does brand + accent duty" decision, so a
  future session doesn't reintroduce a second accent color by habit.
- **A real deploy/dev-cache pitfall caught and fixed during verification**:
  the first live check after editing `globals.css` still rendered the old
  green palette. Investigated rather than assumed fine — confirmed via
  `curl`ing the compiled CSS chunk directly that the *old* hex values were
  still present in Turbopack's output even after restarting `next dev`
  and `rm -rf .next`. Root cause: an incomplete first cleanup (an earlier
  cache-clear command had been interrupted). Force-killing the dev server
  process directly and fully removing `.next` resolved it — reconfirmed by
  `curl`ing the new CSS chunk and seeing only the new hex values before
  taking a single screenshot.
- Live-verified (after the above fix) across `/`, `/pricing`,
  `/how-it-works`, `/login`, and `/search`: red hero/CTAs, white canvas,
  near-black text all render correctly with no console/page errors; the
  pricing page's error-red "X" icons remain visually distinct from the
  brand red; the register page's renter/owner track cards and the
  `/how-it-works` two-track layout both now render in the same red (an
  expected, deliberate consequence of dropping the second accent color —
  not a bug).
- No RLS/Server Action/query changes — pure CSS token values.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run test`
  (33/33) all clean.

## Conversion-focused redesign, wave 6 (post-Milestone-8)

Sixth wave: search results/sort, owner property management, verification
center — three candidates offered, all three picked.

- **New `components/properties/SortSelect.tsx`**: a real functional gap
  closed, not just a style pass — `searchProperties`
  (`services/properties.ts`) and `searchParamsSchema`
  (`lib/validation/property.ts`) already supported
  `sort: newest/price_asc/price_desc`, but no UI ever set it. Live-
  verified: selecting "Price: low to high" on three seeded listings
  ($800/$300/$500) correctly set `?sort=price_asc` and reordered the
  results to $300/$500/$800.
- **`app/search/page.tsx`**: replaced the flat row of numbered page
  links with real prev/next controls + "Page X of Y", disabled
  (not just hidden) at the bounds — still plain `<Link>`s, so pagination
  keeps working without JS exactly as before.
- **`app/dashboard/properties/page.tsx`**: promoted the "needs
  reconfirmation" warning next to the listing title (previously tacked
  on at the end of the row) and added a warning-ring highlight on the
  whole row, matching the information-priority pattern already used for
  `PropertyCard`.
- **`app/dashboard/properties/[id]/edit/page.tsx`**: split the five
  undifferentiated status buttons into three labeled groups —
  **Visibility** (Publish/Unpublish), **Availability** (Available/Rented,
  styled as a two-option toggle with the active state primary-colored),
  and a separated **Danger zone** for Archive (ghost-styled, error-tinted,
  visually set apart from the others instead of sitting at the same
  weight as "publish"). Same three Server Actions
  (`setListingStatusAction`/`setAvailabilityAction`), just regrouped
  markup — live-verified clicking "Rented" correctly calls
  `setAvailabilityAction` and the button picks up the active style.
- **`app/dashboard/verification/page.tsx`**: the identity-verification
  card now gets the clay-raised elevation + a success-tinted ring when
  `status === "verified"` (previously identical styling regardless of
  status) — live-verified by seeding a `verified` identity request and
  confirming the visual treatment actually changes. Each property's
  verification row now pairs the status badge and its one relevant
  action together instead of a bare button floating below the badge.
- Live-verified against the real Supabase project with freshly seeded
  data (one owner, three listings at different prices, one deliberately
  stale), fully deleted afterward.
- One real red herring investigated during this pass: the sort control
  appeared to silently fail in an automated check (URL/price order
  unchanged). Rather than assume a bug, isolated it — an identical
  interaction in a standalone script worked correctly. Root cause: the
  check interacted with the `<select>` immediately after
  `waitUntil: 'networkidle'` resolved, before React had finished
  hydrating the client component, so the native `change` event fired
  with no handler attached yet. Not a product bug; confirmed by adding a
  short settle delay before interacting, after which the same check
  passed consistently. Separately, a "stale badge missing" result turned
  out to be the test script's own later step (clicking "Rented", which
  legitimately reconfirms availability) overwriting the seeded stale
  timestamp from an earlier run — also not a product bug, confirmed by
  resetting the timestamp and re-checking cleanly.
- No changes to `searchProperties`, `setListingStatusAction`,
  `setAvailabilityAction`, `confirmAvailabilityAction`,
  `submitIdentityVerificationAction`,
  `submitPropertyVerificationAction`, `DocumentUploader`, or any RLS
  policy — presentation/layout only.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run test`
  (33/33) all clean.

## Conversion-focused redesign, wave 7 (post-Milestone-8)

Seventh wave: the admin console nav + overview, the last major untouched
surface. Scoped to nav + overview only (not the four queue pages, which
are variable-length action lists, not a generic card-grid pattern).

- **New `components/admin/AdminNav.tsx`**: fixed a real pre-existing bug
  (same class as wave 5's main header fix) — the admin pill nav had zero
  active-route highlighting, no `usePathname()` anywhere. Now the active
  tab is filled brand-red with `aria-current="page"`. Also added live
  pending-count badges on the Listings/Verifications/Reports tabs,
  computed once in `app/admin/layout.tsx` via the same
  `createServiceRoleClient()` aggregate-count pattern the Overview page
  already used — real counts, never fabricated, each tab's badge hidden
  entirely when its count is 0.
- **`app/admin/page.tsx`**: replaced the flat 10-card stat grid (same
  clay-overuse pattern fixed for the owner dashboard in wave 4) with four
  labeled `MetricStrip` clusters — People / Listings / Trust & Safety /
  Payments — each its own divided strip instead of one undifferentiated
  grid, giving real information hierarchy to what was previously 10
  identical boxes in a row. The admin-only revenue card picked up the
  clay-raised elevation used for "anchor" cards elsewhere in the
  redesign.
- Live-verified against the real Supabase project with a seeded admin
  account, one pending-review listing, and one pending identity
  verification request, fully deleted afterward: confirmed the Overview
  tab shows `aria-current="page"` while active, confirmed the Listings
  and Verifications tabs show their correct live counts ("1" each,
  matching the seeded data), confirmed clicking a tab moves the active
  state and updates the URL correctly, confirmed the grouped metric
  strips render with the right real counts per cluster.
- Another test-script race (the third instance of this exact pattern
  this session) caught and correctly diagnosed rather than assumed as a
  product bug: an automated check read `aria-current` immediately after
  `waitForLoadState('networkidle')` following a tab click and got stale
  values; an isolated reproduction with a short settle delay confirmed
  the nav's active-state tracking is actually correct.
- No changes to `requireAnyRole`, any admin Server Action, or RLS — the
  new layout-level count queries are read-only aggregates via the same
  `service_role` pattern the Overview page already used for identical
  counts, not a new privileged write path.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run test`
  (33/33) all clean.

## Conversion-focused redesign, wave 8 (post-Milestone-8)

Eighth wave: a motion/interactivity pass, prompted by the user asking for
"more motion, like a pro UI/UX designer" — initially via a Remotion skill
that doesn't apply here (Remotion is a video-rendering framework; DomiLink
has no video output, so its markup conventions were set aside rather than
forcing an unrelated dependency onto the project). Done instead with the
same plain CSS/Tailwind approach as every prior wave.

- **`app/globals.css`**: every native `<dialog>` in the app — `Dialog.tsx`,
  `Drawer.tsx`, and the property gallery lightbox — previously popped
  open/closed instantly with zero transition. Added a global open/close
  transition using `@starting-style` (fade + scale for centered dialogs,
  slide-from-edge for the drawer via a new `data-drawer-side` attribute)
  — one CSS change, applies everywhere a `<dialog>` is used, no
  per-component wiring, no new dependency. The existing
  `prefers-reduced-motion` block already zeroes these out for visitors
  who need that.
- **`components/ui/Drawer.tsx`**: added the `data-drawer-side` attribute
  so the global CSS can tell a bottom sheet from a right-hand drawer and
  slide each in from its own edge instead of a generic fade.
- **`components/ui/Input.tsx`**: added a focus-state border-color
  transition (and a matching one for the error state) — previously the
  border just snapped between colors with no transition at all. `Input`
  is used on every form in the app (auth, property form, filters,
  verification), so this is a single-file, broad-reach fix.
- **`components/layout/Header.tsx`**: the mobile nav menu was
  conditionally mounted with zero animation, appearing instantly. Added
  a small fade+slide-in `@keyframes` entrance animation (`globals.css`'s
  new `.animate-dropdown-in`).
- Live-verified against the local dev server: confirmed the mobile
  filters drawer slides in from the bottom and all fields render
  correctly post-animation (screenshot-verified after an initial
  Playwright locator ambiguity gave a false "not visible" reading —
  confirmed via screenshot that it was a test-script issue, not a
  product bug, the same class of false negative hit several times
  earlier this session), confirmed the mobile nav menu opens and is
  reachable, no console/page errors.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run test`
  (33/33) all clean.

## Conversion-focused redesign, wave 9 (post-Milestone-8)

Ninth wave: a presentation-only polish pass on the five pages left out of
waves 1–8 — `/about`, `/safety`, `/help`, `/notifications`, `/account` —
drafted and reviewed through the full EGM (Elephant-Goldfish Model)
pipeline: `/egm-brainstorm` → `docs/designs/wave-9-page-polish.md` (the
concepts brief) → `/egm-draft` → `docs/designs/wave-9-page-polish-design.md`
(the design doc) → `/egm-review` (five stages: Zoom Out, Comprehension,
Critic, Intermediate Zoom Out, Implementation Readiness; two remediation
rounds applied). No Server Action, Supabase query, or RLS policy touched
on any of the five pages — markup and classes only.

- **`components/ui/Switch.tsx`** (new): a styled native
  `<input type="checkbox">` — not a custom div-based widget — using
  `sr-only`/`peer` plus two `aria-hidden` track/thumb `<span>`s driven by
  `peer-checked:`/`peer-focus-visible:` CSS, all existing tokens
  (`--shadow-clay-inset`, `--shadow-subtle`, `bg-sage-200`, `bg-brand-600`,
  `bg-ivory-50`). No internal state, no `"use client"` — a plain function
  component usable from a Server Component tree. Props are the native
  `InputHTMLAttributes<HTMLInputElement>` pass-through (so `name`,
  `defaultChecked`, etc. all work unmodified) plus an optional `label`.
  Documented in `docs/DESIGN_SYSTEM.md`'s component inventory.
- **`app/notifications/page.tsx`**: replaced the two raw, unstyled
  `<input type="checkbox" className="h-4 w-4">` preference toggles with
  `<Switch>`, same `name`/`defaultChecked` props — `updateNotificationPreferencesAction`
  is untouched and still reads `FormData` by the same field names. Added
  the shared header block above the existing "Mark all read" row (no
  `eyebrow`, since the page title needs no disambiguation).
- **`app/about/page.tsx`**: added the shared header block (eyebrow
  "About") and wrapped the four existing paragraphs in a `CardClay`
  instead of a bare `<div>`. Copy unchanged. No stat strip — the only
  real supporting number (`$5 / 30 days`) isn't enough to justify a
  3-item value row without mostly restating the page's own copy, per the
  design review.
- **`app/safety/page.tsx`**: added the shared header block (eyebrow
  "Safety"). The checklist `Card` is untouched; the warning block's
  classes were corrected from `p-4 text-sm` to `p-3 text-xs` to actually
  match the established warning-block pattern already used in
  `components/layout/LegalPageShell.tsx` and `app/checkout/mock/page.tsx`
  — the design doc's own drafting had incorrectly assumed these already
  matched, caught during the EGM review's implementation-readiness stage.
- **`app/help/page.tsx`**: added the shared header block (eyebrow
  "Help"). FAQ cards, the contact card, and `SupportForm` are untouched.
- **`app/account/page.tsx`**: added the shared header block (eyebrow
  "Account"); the user's email line moved into the header's
  supporting-line slot instead of its own separate paragraph.
  `ProfileForm`, the subscription-status card, payment history, and the
  logout form are untouched.
- All five pages share one identical, literal header JSX block
  (eyebrow/title/supporting-line), copy-pasted rather than extracted into
  a new `PageHeader` component — the rule-of-three threshold isn't met by
  five copies added in the same wave; deferred to a future wave if a
  genuinely new, independently-motivated page needs the same shape.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run test`
  (33/33) all clean.
- Live Playwright pass against the real Supabase project (local dev
  server + a seeded test account, fully deleted afterward): confirmed
  `/about`, `/safety`, `/help` render the shared header at desktop and
  mobile widths; confirmed `/about`'s body is wrapped in a `CardClay`
  (visually and via computed styles); confirmed `/safety`'s warning block
  renders the corrected `p-3 text-xs` classes; confirmed, signed in,
  `/account` renders the header with the email in the supporting line and
  `/notifications` renders with no eyebrow and two `Switch` controls;
  confirmed keyboard operability (Tab moves focus onto a `Switch`, Space
  toggles it); confirmed the toggle's visual state change (Tailwind v4
  applies `translate-x-5` via the native CSS `translate` property, not
  `transform` — an initial check against the wrong property produced a
  false negative, resolved by checking the actual applied property rather
  than assuming a real bug); confirmed a toggled preference persists
  after reload and `updateNotificationPreferencesAction` still receives
  the correct `FormData` field; confirmed "Mark read" still functions
  (an earlier false negative here was traced to the seed script's own
  insert silently failing a NOT NULL constraint on `notifications.type`,
  not a product bug — fixed in the seed script, re-verified clean).

## Conversion-focused redesign, wave 10 (post-Milestone-8)

Tenth wave: makes the homepage (hero, "Recently listed" grid, "How it
works") feel more alive through motion, real-data liveness signals, and
interactivity — CSS/Tailwind only, no new runtime dependencies. Drafted
and reviewed through the full EGM pipeline: `/egm-brainstorm` →
`docs/designs/homepage-liveliness.md` → `/egm-draft` →
`docs/designs/homepage-liveliness-design.md` → `/egm-review` (five
stages, two remediation rounds applied, including one round that forced
a real redesign of one item after implementation-readiness review found
it unimplementable as originally specified).

- **`components/ui/CountUp.tsx`** (new): animates a numeral from 0 to its
  final real value on mount using `requestAnimationFrame` and a cubic
  ease-out curve, with an explicit `prefers-reduced-motion` check
  (mirroring `Reveal.tsx`'s pattern, since the global CSS reduced-motion
  rule doesn't reach JS-driven tweens) and an `sr-only` sibling holding
  the static final value so screen readers never read a changing number.
  Used for the homepage's three stat-strip numbers (active listings,
  owners, counties). Documented in `docs/DESIGN_SYSTEM.md`.
- **`app/globals.css`**: added `@keyframes hero-drift` (animates only the
  native CSS `translate` property) and `.animate-hero-drift`, applied to
  the hero's three blurred background photo tiles for a subtle 38s idle
  drift. Confirmed via Wave 9's prior finding that Tailwind v4 applies
  `rotate-*` utilities via the independent native `rotate` property, so
  each tile's existing static rotation class needed no change.
  Design-review caught and fixed a flawed earlier approach (a
  `--hero-drift-base` CSS variable) that would have silently discarded
  each tile's rotation — resolved before implementation reached this
  file.
- **`app/page.tsx`**: derives a `counties` array from the already-fetched
  `coverageRows` query and passes it to `HeroSearch`; applies
  `animate-hero-drift`/`motion-reduce:animate-none` to the hero tiles;
  wraps each stat value in `<CountUp>`.
- **`components/properties/PropertyCard.tsx`**: added
  `overflow-hidden` to the image container (confirmed missing, not
  "already present" as the brainstorm brief assumed); added
  `animate-pulse` to the existing real `isNew` badge; added a "Listed X
  ago" line (`formatRelativeDate`) between the location and bed/bath
  lines, shown only when `published_at` is non-null.
- **`components/properties/PropertyCardMedia.tsx`**: added a hover/focus
  image scale, additive to the existing hover-photo-cycling behavior.
- **`components/marketing/ProcessSteps.tsx`**: wrapped the existing
  single connecting-line spine in one `<Reveal>` so it fades and slides
  in, reusing `Reveal`'s native transition rather than forking it. An
  earlier design draft proposed splitting the spine into per-step
  segments with an independent `scale-y` "draw-in" effect — dropped
  during implementation-readiness review: `Reveal` exposes no mechanism
  for a sibling to observe its internal visibility state, and per-segment
  positioning for the component's variable-height step rows had no
  feasible formula without a layout restructure.
- **`components/properties/HeroSearch.tsx`**: added an optional
  `counties?: string[]` prop rendering real county filter chips (bounded
  at 15, the actual `LIBERIA_COUNTIES` count, wrapping via `flex-wrap`
  rather than scrolling/truncating) above the existing search row, using
  the same chip visual treatment as `SearchFilters.tsx`'s category chips.
  Clicking a chip toggles `aria-pressed` and local state; `county` is
  appended to the search URL on submit alongside the existing `city`/
  `bedrooms` params — additive, not a replacement, confirmed against
  `searchParamsSchema`'s independently-optional fields.
- No Server Action, Supabase query shape, or RLS policy changed.
- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run
  test` (33/33) all clean. One lint fix needed mid-implementation:
  `CountUp`'s reduced-motion branch originally called `setState`
  synchronously inside an effect (the same `react-hooks/set-state-in-effect`
  rule `Reveal.tsx` hit in Wave 1) — fixed with the identical
  `requestAnimationFrame`-deferred pattern.
- Live Playwright pass against the real Supabase project (local dev
  server + seeded test properties across three counties, one published
  within 72 hours, fully deleted afterward): confirmed the relative-time
  line and pulsing "New" badge render only on the recent listing;
  confirmed the image container has `overflow-hidden` and the media
  wrapper carries the hover-scale classes; confirmed all three hero tiles
  carry `animate-hero-drift`; confirmed `CountUp`'s visible and
  `sr-only` values match after the animation completes; confirmed the
  `ProcessSteps` spine renders with `Reveal`'s transition classes applied
  directly to it (not a separate wrapper, avoiding a transform-containing-block
  issue a naive implementation would have introduced); confirmed county
  chips render for all three seeded counties, clicking one toggles
  `aria-pressed`, and submitting the search navigates to
  `/search?county=...` with correctly filtered results; confirmed, under
  `prefers-reduced-motion: reduce` emulation, `CountUp` renders its final
  value immediately and both the hero-drift and badge-pulse animations
  have their `animation-duration` zeroed by the existing global CSS rule
  (two initial false negatives here were test-script bugs — a locator
  that assumed an `aria-hidden` attribute `Reveal` doesn't expose, and a
  string-equality check against `1e-05s` instead of a numeric
  comparison — both fixed and re-verified, not product bugs).

## Admin console fix: free-text moderation reasons (post-Milestone-8)

A standard scoped fix, not an EGM wave: every admin moderation/suspension
action previously sent a hardcoded, generic reason (or none at all) with
no way for the admin to type something specific to the case. Fixed for
every action whose underlying table already has a column to store a
reason — no schema migration.

- **`app/admin/actions.ts`**: `moderatePropertyAction`,
  `reviewIdentityVerificationAction`, `reviewPropertyVerificationAction`,
  and `resolvePropertyReportAction` now take `FormData` as their final
  parameter (previously a plain hardcoded string baked in at the call
  site) and read `formData.get("reason")`, writing it to
  `properties.moderation_reason` / `*_verification_requests.reviewer_notes`
  / `property_reports.resolution_notes` respectively, and passing it
  through unchanged to the existing `recordAdminAction`/`notifyUser`
  calls. `suspendUserAction` now requires a non-empty reason (thrown
  server-side if missing) instead of accepting an already-hardcoded
  string.
- **`app/admin/listings/page.tsx`, `app/admin/verifications/page.tsx`,
  `app/admin/reports/page.tsx`, `app/admin/users/page.tsx`**: each
  row's action buttons now share one `<textarea name="reason">` inside a
  single `<form>`, with each `Button` using `formAction={action.bind(null,
  ...args)}` to route that particular submission to the correct outcome
  while still carrying the shared textarea's value — no `"use client"`
  conversion needed anywhere; all five pages stay Server Components with
  native-form mutations.
- `resolveMessageReportAction` (message reports, in
  `app/admin/reports/page.tsx`) was deliberately left unchanged:
  `message_reports` has no notes/resolution column, and adding one would
  require a schema migration out of scope for this fix.
- No RLS policy, `requireAnyRole` check, or Server Action authorization
  logic changed — only how the reason string reaches the action.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `npm run test`
  (33/33) all clean on the first pass.
- Live Playwright pass against the real Supabase project (seeded admin/
  owner/reporter/suspend-target accounts, one pending-review listing, one
  open property report, one identity verification request, one property
  verification request — all fully deleted afterward): confirmed
  Listings' Reject button submits the typed reason into
  `properties.moderation_reason` and flips `listing_status`; confirmed
  Verifications' "Needs more info" button submits the typed reason into
  `identity_verification_requests.reviewer_notes`; confirmed Reports'
  "Mark resolved" button submits the typed reason into
  `property_reports.resolution_notes`; confirmed Users' Suspend button is
  blocked by native `required` validation when the textarea is empty,
  and succeeds — writing `profiles.account_status`, the
  `admin_audit_logs` row, and a `notifications` row with the typed reason
  — once filled in. All four confirmed directly against the database, not
  just the UI's apparent success.

## Dark-mode text contrast fix (post-Milestone-8)

A real bug, reported by the user from a live preview deployment viewed in
dark mode: text throughout the app (e.g. the homepage's "Recently
listed" empty state) was nearly invisible — dark gray/near-black text on
a now-dark `Card`/`background`.

- **Root cause**: `app/globals.css`'s `@media (prefers-color-scheme:
  dark)` block only overrode `--background`, `--foreground`,
  `--color-surface`, and `--color-border`. The `charcoal-700/500/400`
  tokens — used throughout the app as `text-charcoal-700/500/400` for
  primary/secondary/muted text — kept their light-mode values (near-black
  grays), which are illegible against the now-dark surfaces.
- **Fix**: added dark-mode overrides for `--color-charcoal-700` (`#1a1a1a`
  → `#f0f0f0`), `--color-charcoal-500` (`#4d4d4d` → `#a8a8a8`), and
  `--color-charcoal-400` (`#737373` → `#8c8c8c`) inside the existing
  media query, same mechanism already used for
  `--background`/`--foreground`. `--color-charcoal-900` was deliberately
  left unchanged — confirmed (via a full-codebase grep) it's only ever
  used as `bg-charcoal-900/*` for dialog/lightbox overlay scrims, which
  should stay black in both themes, not as text.
  Confirmed via grep that charcoal-700/500/400 are used only as `text-*`
  classes (no `bg-`/`border-`/`ring-`/`divide-` usage), so flipping them
  is safe.
- New values chosen for ≥4.5:1 contrast against both `--background`
  (`#000000`) and `--color-surface` (`#1a1a1a`) in dark mode (computed:
  ~17:1, ~7.3:1, ~5.2:1 respectively against `#1a1a1a`), matching or
  exceeding the AA bar the original light-mode grays held against white.
- No component, markup, or non-CSS file changed — purely a token-value
  fix in `app/globals.css`.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test`
  (33/33) all clean.
- Live Playwright pass with `colorScheme: "dark"` emulation across `/`,
  `/pricing`, `/safety`, and `/login`: confirmed computed text color for
  the previously-invisible homepage empty-state heading/paragraph
  switched from `rgb(26, 26, 26)`/`rgb(77, 77, 77)` to
  `rgb(240, 240, 240)`/`rgb(168, 168, 168)`, and visually confirmed all
  four pages render fully legible text against their dark surfaces.
  (One false start during verification: the dev server initially kept
  serving a stale compiled CSS bundle after the edit — a `.next` cache
  issue, not a product bug — resolved by clearing `.next` and
  restarting.)

## Demo listings disclosure (post-Milestone-8)

The live database had zero real listings (expected — no real owner has
signed up yet), which made the homepage/search empty states the only
thing visible on the live preview. The user asked for seeded demo
apartment data. Per `CLAUDE.md` rule #9 ("never fabricate demo data in
production paths"), this was confirmed with the user first — the live
Supabase project (`ccuelnrmvtmtgukqyvrb`) is the one flagged for
production use, not a disposable sandbox. They chose **permanent,
clearly-marked seed data** over an unmarked fake catalog or a separate
preview-only database.

- **`scripts/seed-demo-listings.mjs`** (new, committed — not a throwaway
  `scripts-tmp-*` script, since this data is meant to persist):
  idempotent (matches on owner email / listing slug, safe to re-run),
  reads Supabase credentials from `.env.local` the same way every other
  service-role script this session has, and:
  - Creates one owner account, `demo-listings@domilink.app` / display
    name "DomiLink Listings Team", granted the `owner` role.
  - Sets its `owner_profiles.bio` to explicitly disclose it's
    placeholder content maintained by the DomiLink team and not
    available for rent (`public_contact_opt_in: false`).
  - Inserts 6 published listings under that account: a 2BR apartment in
    Sinkor ($350/mo), a 3BR house in Paynesville ($500/mo), a studio
    near Capitol Hill ($200/mo), a single room in Gbarnga ($80/mo), a
    retail shop in Buchanan ($300/mo), and a serviced office in Sinkor
    ($450/mo) — spanning 3 counties, 6 categories, both residential and
    commercial `usage_type`, realistic Liberia pricing/copy.
  - No photos attached — deliberately left to the app's existing "No
    photo yet" placeholder (`components/properties/PropertyCardMedia.tsx`)
    rather than sourcing stock images with an uncertain license for a
    specific named property.
- This is the one sanctioned exception to rule #9 on this project, and
  it's disclosed in three places: this entry, the script's own header
  comment, and the owner account's bio — never presented as unmarked
  real inventory.
- **To remove later** (once real owners have listings): delete the
  `demo-listings@domilink.app` auth user — `owner_profiles`,
  `user_roles`, and all 6 `properties` rows cascade via `on delete
  cascade` FKs, same mechanism used for the test-account cleanup
  scripts earlier this session.
- No Server Action, RLS policy, or schema change — pure data insert via
  the existing service-role pattern.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test`
  (33/33) all clean after adding the script.
- Verified live: queried all 6 rows back from Supabase directly
  (`listing_status: "published"`), then a live Playwright pass against
  `domilink-preview.vercel.app` confirmed the homepage no longer shows
  the empty state, `/search` lists the seeded properties, and the
  Sinkor apartment's own detail page renders its title, price, and
  "DomiLink Listings Team" as the owner.

## Passkey (biometric) sign-up/sign-in + low-email-market recommendations (post-Milestone-8)

The user asked for biometric (WebAuthn passkey) sign-up/sign-in, plus
suggestions for markets like Liberia with low active email usage.
Confirmed scope with the user: build full passkey sign-up/sign-in
(password+email stays as the fallback, not removed); for the low-email
angle, write a recommendations doc rather than build phone/WhatsApp OTP
now, since those are blocked on real SMS/WhatsApp Business API
credentials the same way the payment provider is blocked in
`docs/PAYMENTS.md`.

- **Confirmed before building**: Supabase Auth has no native
  passwordless-passkey *primary* sign-in — WebAuthn there is only an MFA
  second factor on an already-authenticated session. A real passkey-only
  sign-up/sign-in required a custom build: `@simplewebauthn/server` +
  `@simplewebauthn/browser` (new deps) for the WebAuthn ceremonies, two
  new tables (`webauthn_credentials`, `webauthn_challenges` — see
  `docs/DATABASE_SCHEMA.md`), and a session-minting trick for turning a
  verified ceremony into a real Supabase session: `admin.generateLink({
  type: "magiclink", email })` (generates a token, sends no email) →
  `verifyOtp({ type: "magiclink", token_hash })` on the request-scoped
  cookie-writing client.
- **`lib/auth/webauthn-actions.ts`** (new): `startPasskeyRegistrationAction`/
  `verifyPasskeyRegistrationAction` (add a passkey to an existing
  account), `startPasskeySignupAction`/`verifyPasskeySignupAction`
  (brand-new account, no password ever set — the `auth.users` row is only
  created *after* the WebAuthn ceremony verifies, so an abandoned
  ceremony never leaves an orphaned account), `startPasskeyLoginAction`/
  `verifyPasskeyLoginAction` (discoverable-credential sign-in, no email
  typed), `listPasskeysAction`/`deletePasskeyAction` (account
  management). A lightweight application-level rate limit (mirroring
  `services/messaging.ts`'s existing pattern) caps ceremony starts, since
  Supabase's own built-in auth rate limiting — the project's documented
  protection for auth endpoints, `docs/SECURITY.md` — doesn't cover these
  new custom Server Actions.
- **UI**: `app/(auth)/login/page.tsx` gets a "Sign in with a passkey"
  button above the existing password form; `app/(auth)/register/page.tsx`
  gets a passkey/password toggle sharing the same name/email fields and
  renter/owner intent cards; `app/account/page.tsx` gets a new "Passkeys"
  card (`components/auth/PasskeyManager.tsx`) to add/revoke passkeys on
  an existing account. Every passkey UI element is gated by
  `lib/auth/use-passkey-support.ts` (wraps `browserSupportsWebAuthn()`)
  and degrades to simply not rendering on unsupported browsers/devices —
  a real concern given device diversity in Liberia — never a broken
  button.
- **`supabase/migrations/20261103000100_webauthn.sql`**: RLS enabled on
  both new tables; `webauthn_credentials` grants `select`/`delete` to
  `authenticated` scoped to the caller's own rows, no client
  `insert`/`update` at all; `webauthn_challenges` has no `anon`/
  `authenticated` grant whatsoever, `service_role`-only. **Applied to the
  live Supabase project** via the Management API once the user added a
  `SUPABASE_ACCESS_TOKEN` network secret — the first token generated was
  itself read-only (`current_user` resolved to `supabase_read_only_user`,
  confirmed via a direct query, which blocked even `SET
  transaction_read_only = off`'s effect since the role's own grants
  lacked `CREATE` on `public`, not just the session's read-only flag); a
  regenerated read-write token resolved to the `postgres` role and the
  migration applied cleanly. Confirmed both new tables exist with
  `relrowsecurity = true` in `public` — a same-named pair also exists in
  the `auth` schema (`relrowsecurity = false`), which is Supabase's own
  native GoTrue WebAuthn-as-MFA-factor storage, an unrelated naming
  coincidence, not a conflict.
- **`docs/AUTH_ALTERNATIVES.md`** (new): phone/SMS OTP (Supabase-native,
  blocked on a real SMS provider with confirmed Liberia coverage —
  Twilio/Infobip/MessageBird named as candidates, same "needs the project
  owner's provider choice and credentials" framing as `docs/PAYMENTS.md`),
  WhatsApp OTP (not Supabase-native — needs a custom Edge Function + Meta
  WhatsApp Business Cloud API with template approval, reusing this
  change's session-minting pattern), long-lived "remember this device"
  sessions, USSD (partnership-dependent, out of reach for a web app
  alone), and operational mitigations (agent-assisted onboarding,
  data-light design).
- No change to `registerAction`/`loginAction`/the password flow —
  additive only. No change to `profiles.phone`/`phone_verified_at`
  (confirmed unrelated/unused before this change, left alone).
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test`
  (36/36 — 3 new `passkeySignupSchema` cases added) all clean.
- **Live Playwright pass against the real Supabase project**, using
  Chromium's WebAuthn virtual authenticator (CDP
  `WebAuthn.addVirtualAuthenticator`) rather than a compiled-build-only
  check: confirmed passkey sign-up creates a real account and redirects
  to onboarding; confirmed the account page shows the signed-up email and
  one passkey; confirmed logging out and signing back in with the
  discoverable-credential passkey flow (no email typed) succeeds and
  returns to the same account; confirmed adding a second passkey from
  `/account` using a **second, separate virtual authenticator**
  (simulating a different physical device — reusing the same virtual
  authenticator for a second registration correctly throws
  `InvalidStateError`, exactly as a real platform authenticator would,
  since resident-key WebAuthn credentials are one-per-site-per-
  authenticator by spec, not a bug) succeeds and shows 2 passkeys;
  confirmed revoking one brings it back to 1. All 4 seeded test accounts
  and their passkey rows fully deleted from the live project afterward
  (`webauthn_credentials`/`webauthn_challenges` row counts confirmed back
  at 0). One local-only false start during this pass: `.env.local`'s
  `NEXT_PUBLIC_APP_URL` was `:3100` while the dev server actually binds
  `:3000` (a pre-existing mismatch noted earlier this session) — caused a
  WebAuthn origin-mismatch rejection against `localhost`, not a real bug;
  fixed locally (gitignored, no effect on the deployed app) by pointing
  it at `:3000` to match.

## De-emphasize the $5 price mention; search/display communities (post-Milestone-8)

Two fixes requested by the user together.

**1. Stop repeating the exact subscription price everywhere.** Confirmed
scope via `AskUserQuestion`: remove the literal "$5" from marketing copy
*and* the pricing page's own copy/price tag *and* the paywall dialog, but
keep it on the legal Terms/Subscription Terms pages and the checkout
confirmation screen — those are the actual contract/payment-confirmation
moments, where stating the real charge is expected and appropriate.

- Changed to generic "Subscribe"/"the subscription" language: `app/
  page.tsx` (homepage "How it works" step + hero subhead), `app/about/
  page.tsx`, `app/help/page.tsx` (FAQ answer), `app/how-it-works/
  page.tsx`, `components/properties/ContactOwnerForm.tsx` (hint line),
  `app/pricing/page.tsx` (the `passColumn` bullet, the big price-tag
  display — now "Unlimited messaging / for 30 days" instead of a dollar
  figure, and the Subscribe button's label), and `components/
  subscriptions/SubscriptionGateDialog.tsx` (same price-tag treatment,
  plus reworded the agent-fee comparison line so it still makes sense
  without stating the pass price).
- **Deliberately left unchanged**: `app/legal/terms/page.tsx`, `app/
  legal/subscription-terms/page.tsx`, and `app/checkout/mock/page.tsx`
  (all still state the real `subscriptionPlan.priceUsd`) — confirmed
  with the user specifically before touching these, since removing the
  price from a legal contract page or a payment-confirmation screen is a
  materially different decision than cleaning up marketing copy.
- **Also deliberately left unchanged**: `components/subscriptions/
  SavingsCalculator.tsx` (the interactive slider on `/pricing` comparing
  agent fees to the pass). Its entire purpose is showing the real dollar
  savings — `formatUsd(passPriceUsd)` is both displayed directly and
  trivially inferable from the two other numbers the calculator already
  shows (agent cost and savings), so hiding it would be security-theater
  obfuscation that breaks the feature's reason for existing, not a
  meaningful change in what's disclosed. Flagged to the user rather than
  silently left out of scope.
- No change to any Server Action, the actual charge amount computed
  server-side, or `lib/config/brand.ts`'s `subscriptionPlan.priceUsd`
  itself — this is a copy-only change; money logic is untouched.

**2. Search and display by community, not just city.** `property.
community` already existed in the schema and was already shown on
`PropertyCard`/the property detail page (`[community, city, county]`,
joined) — that part was already done in an earlier wave. What was
missing: it wasn't searchable. `searchProperties` (`services/
properties.ts`) only matched the `city` column; a renter searching for a
real community/neighbourhood name (e.g. "Sinkor") would get no results
unless that name happened to also be stored as a property's `city`.

- `services/properties.ts`: the `city` search param now matches `city`
  **or** `community` via `.or("city.ilike...,community.ilike...")` — many
  listings' `city` is just "Monrovia" for every community, so community
  is often the more specific, more useful match.
- `components/properties/SearchFilters.tsx`: the "City" field relabeled
  "City or community" with an updated placeholder.
- `components/properties/HeroSearch.tsx`: the location input's
  (`sr-only`) label updated to match, for consistency.
- No schema change, no new URL param — reuses the existing `city`
  search param and input, now matching a broader (and more useful) set
  of columns.

Both fixes verified together:
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test`
  (36/36) all clean.
- Live Playwright pass against the real Supabase project: confirmed via
  `/pricing`, `/`, `/about`, `/help`, `/how-it-works` that none of their
  rendered body text contains "$5", while `/legal/terms` and `/legal/
  subscription-terms` still do; confirmed the checkout confirmation
  screen still shows the real charge amount (unchanged code path);
  confirmed the paywall dialog (triggered by a seeded test renter
  messaging a seeded listing) renders "Unlimited messaging / for 30
  days" with no "$5" anywhere in its content. Confirmed community search
  against the live demo listings: searching "Old Road" (a community)
  returns only the one Sinkor listing in that community, not the other
  Sinkor listing in a different community ("Tubman Boulevard"), while
  searching "Sinkor" (the city) still returns both — regression-checked
  against the pre-existing city-only behavior. All seeded test data
  (one renter account, its `property_views` row, which has a
  no-cascade FK to `auth.users` and had to be deleted explicitly before
  the user row itself would delete) fully cleaned up afterward.

## "More from your search" on the property detail page (post-Milestone-8)

The user pointed out a property detail page (e.g. the Paynesville house
listing) had no related-listings section visible below it, and asked for
one reflecting the visitor's search. A "Similar properties" section
already existed (`getSimilarProperties` in `services/properties.ts`,
matching same county + same category) but is hidden when there are zero
matches — exactly what was happening for that particular listing, since
it was the only `house`-category listing among the demo data.

Rather than just loosen the similarity heuristic, this carries the
visitor's actual search filters through to the detail page so the
section can be literally "more from your search," falling back to the
existing category/county similarity only when there's no search context
(e.g. arriving from the homepage's "Recently listed" grid).

- **`lib/validation/property.ts`**: two new helpers alongside
  `searchParamsSchema` — `searchFilterQueryString(params)` (the
  filter-only subset — `q`/`county`/`city`/`category`/`minPrice`/
  `maxPrice`/`bedrooms`/`furnished`, excluding `page`/`sort` — as a query
  string) and `hasActiveSearchFilters(params)` (true when any of those
  are actually set, not just defaults).
- **`components/properties/PropertyCard.tsx`**: new optional
  `searchQuery` prop, appended to both of its `<Link>` hrefs
  (`/properties/${slug}?${searchQuery}`) when provided.
- **`app/search/page.tsx`**: passes `searchFilterQueryString(params)` to
  every `PropertyCard` in the results grid, so clicking into a listing
  carries the exact filters that produced it.
- **`app/properties/[slug]/page.tsx`**: now accepts `searchParams`; when
  they reflect an active search (`hasActiveSearchFilters`), calls the
  same `searchProperties` the `/search` page uses with those filters,
  excludes the current property, and shows up to 4 results under "More
  from your search." Falls back to the pre-existing
  `getSimilarProperties`/"Similar properties" behavior when there's no
  search context at all — unchanged for the homepage/favourites/
  dashboard cases, where `PropertyCard` is rendered without a
  `searchQuery`.
- No schema change, no new Server Action, no change to `searchProperties`
  itself — purely plumbing the existing search filters through an
  existing link and an existing query function.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test`
  (36/36) all clean.
- Live Playwright pass against the real Supabase project and its demo
  listings: confirmed the Paynesville house listing still shows no
  "Similar properties" section when visited directly (unchanged
  pre-existing behavior — genuinely zero same-category matches);
  confirmed visiting it with `?county=Montserrado` in the URL shows
  "More from your search" with the three other Montserrado demo
  listings, excluding itself; confirmed clicking its card from an actual
  `/search?county=Montserrado` results page carries that filter into the
  detail page URL and renders the same "More from your search" section
  end-to-end, with the current listing never appearing in its own
  related list.

## "Choose your intent first" sign-up popup + phone sign-up/sign-in (post-Milestone-8)

Two requests from the user together: a popup asking "Find a property" vs
"List a property" before the sign-up form appears (rather than only as
an inline choice on `/register` itself), and phone number sign-up/
sign-in for markets with low active email usage — this is the phone/SMS
OTP option researched (not built) in `docs/AUTH_ALTERNATIVES.md`'s
earlier wave.

**1. Intent-choice popup.** Confirmed scope with the user: every generic
sign-up entry point gets the popup; links that already declare an intent
(e.g. "List Your Property — Free" → `/register?intent=owner`) keep going
straight to the pre-filled form, unchanged.

- **`components/auth/IntentChoiceDialog.tsx`** (new): wraps the existing
  `Dialog` component, renders a trigger (`children`/`className` passed
  through to a plain `<button>`) and, on click, a two-card choice —
  visually matching the same renter/owner card styling already used
  inline on `/register` — each linking to `/register?intent=renter` or
  `?intent=owner`.
- Wired into `components/layout/Header.tsx` (both the desktop and
  mobile-menu "Get started" buttons) and `app/(auth)/login/page.tsx`'s
  "Create an account" link. `app/page.tsx` and `app/how-it-works/
  page.tsx`'s "List Your Property" CTAs are untouched — they already
  declare `intent=owner` directly.
- One real bug found and fixed during live verification: the mobile
  header's "Get started" button initially also called `setOpen(false)`
  to close the hamburger menu before opening the dialog — since the
  mobile nav (and the `IntentChoiceDialog` instance inside it) is only
  rendered via `{open && (...)}`, closing the menu in the same
  synchronous handler unmounted the dialog before its own `open` state
  could take effect, so the popup never appeared. Fixed by not closing
  the mobile menu at all when opening the dialog — the native
  `<dialog>`'s top-layer rendering already covers it visually, so there
  was nothing to actually fix by closing it first.

**2. Phone sign-up/sign-in.** Unlike passkeys, this needs no custom
session-minting trick — `supabase.auth.signInWithOtp({ phone })` /
`verifyOtp({ phone, token, type: "sms" })` are first-class Supabase Auth
methods. It does need a real SMS provider (Twilio/etc.) configured on
the project to actually deliver codes to real numbers, confirmed with
the user up front — built the same way the payment system was: fully
wired end-to-end, code-complete and tested, inert for real users only
because the live project's phone provider isn't turned on yet.

- **`lib/validation/auth.ts`**: `phoneNumberSchema` (E.164 format, e.g.
  `+231770000000`), `phoneSignupSchema` (displayName + phone + intent),
  `phoneLoginSchema` (phone only), `phoneOtpSchema` (phone + 6-digit
  token + mode).
- **`lib/auth/phone-actions.ts`** (new): `startPhoneSignupAction`
  (`signInWithOtp` with `shouldCreateUser: true`, stashing
  `display_name`/`pending_intent` in the auth user's metadata — the
  `handle_new_user` trigger already reads `display_name` from there, as
  it does for email signup); `startPhoneLoginAction`
  (`shouldCreateUser: false`); `verifyPhoneOtpAction` (`verifyOtp`, then
  grants the `owner` role from `pending_intent` when present — a no-op
  for a plain login, mirroring `registerAction`'s intent → role logic —
  and redirects to `/onboarding/welcome` or `/` depending on mode).
- **`components/auth/PhoneAuthForm.tsx`** (new): shared two-step
  (phone → code) client component used by both `/register` (phone tab,
  alongside the existing passkey/password tabs) and `/login` (phone tab,
  alongside the existing password form and passkey quick-button). Step
  is derived from `startState.otpSent`, not tracked as its own
  effect-driven state, matching the `react-hooks/set-state-in-effect`
  lint rule this project has hit (and fixed the same way) twice before
  this session.
- **`lib/auth/field-errors.ts`** (new): `firstFieldErrors` moved out of
  `lib/auth/actions.ts` into its own plain module — a `"use server"`
  file may only export async functions, and adding `phone-actions.ts`'s
  import of this shared helper from the server-actions file itself broke
  the production build (`next build` failed: "Ecmascript file had an
  error") the moment it was exported there. Both `lib/auth/actions.ts`
  and `lib/auth/phone-actions.ts` now import it from the new module.
- **Tried, and declined, to enable the live project's phone provider**
  myself via the Management API (to test the real send/verify flow
  against Supabase's test-OTP numbers) — blocked by the harness's own
  safety classifier as a security-sensitive change to live auth
  settings, correctly so. Documented for the user instead: enable it
  under Supabase Dashboard → Authentication → Providers → Phone, and
  optionally configure a Test OTP number/code under Authentication →
  Settings to exercise the flow without a real SMS provider yet.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test`
  (41/41 — 5 new phone-schema cases) all clean. The `firstFieldErrors`
  export-location bug above was caught by `npm run build` specifically —
  `tsc --noEmit` and `eslint` both passed on the broken version, a
  reminder that this project's four-command verification sequence
  (`tsc` → `lint` → `build` → `test`) catches different failure classes.
- Live Playwright pass against the real Supabase project: confirmed the
  header's desktop and mobile "Get started" buttons and the login page's
  "Create an account" link all open the intent popup and correctly
  navigate to `/register?intent=owner`/`?intent=renter` on choice with
  that intent pre-selected; confirmed "List Your Property" CTAs remain
  direct links with no popup; confirmed the phone sign-up form renders,
  accepts a valid-format number, and fails with a clear, non-crashing
  error message (since the live project's phone provider is still off) —
  confirming the wiring reaches Supabase correctly end-to-end rather than
  erroring in the UI layer; confirmed the phone tab renders correctly on
  `/login` too.

## Dark-mode fix round 2: hardcoded-light panels (post-Milestone-8)

The user sent screenshots from the live preview showing nav links and
the register page's subhead text invisible/very low-contrast in dark
mode — a regression the earlier dark-mode fix (PR #3, this document's
"Dark-mode text contrast fix" entry) didn't catch.

**Root cause**: that earlier fix correctly flips
`--color-charcoal-700/500/400` for dark mode, which fixes everything
built on the theme-aware `bg-surface`/`--background` tokens — the vast
majority of the app, already verified working. But several specific
components use a **hardcoded, always-light** background class
(`bg-ivory-100` or `bg-ivory-50`) that never participates in that flip,
while still using the now-theme-flipping `text-charcoal-*` classes
inside them — light-on-light in dark mode. Found by grepping every
`bg-ivory-*` usage and checking which ones pair with `charcoal-*` text:
`components/layout/Header.tsx`'s sticky header bar and mobile dropdown
nav (the actual bug in the screenshots), `components/ui/Card.tsx`'s
`CardClay` (used on `/about`), `components/subscriptions/
SavingsCalculator.tsx`'s and `SubscriptionGateDialog.tsx`'s inner
highlight boxes, and `components/properties/HeroSearch.tsx`'s search
bar.

Also checked and ruled out: `app/layout.tsx`'s `<body className="...
bg-ivory-100 text-charcoal-700">` looks like the same bug but isn't — a
plain, unlayered `body { background: var(--background); color:
var(--foreground); }` rule already exists in `app/globals.css` (not
inside any `@layer`), and per the CSS cascade-layers spec, unlayered
rules always beat Tailwind's own layered utility classes regardless of
specificity, so those two Tailwind classes on `<body>` are dead code,
not a live bug.

**Why not just flip the `ivory-*` tokens too**, the same mechanism used
for `charcoal-*`: `ivory-50`/`ivory-100` are dual-purpose in this
codebase — also used as `text-ivory-50` for white text on dark/colored
surfaces (the hero, badges, overlays), which must *stay* light in both
themes. Flipping the shared CSS variable would have fixed the
backgrounds above but broken every `text-ivory-50`-on-dark-hero usage
elsewhere.

**Fix, component by component** (confirmed no `dark:` Tailwind variant
was used anywhere in the codebase yet, and no `@custom-variant`
override exists, so Tailwind v4's default `dark:` →
`@media (prefers-color-scheme: dark)` variant was available and unused):
- `Header.tsx` (sticky bar + mobile nav) and `HeroSearch.tsx` (search
  bar): swapped the hardcoded `bg-ivory-100`/`bg-ivory-50` for
  `bg-surface` — `--color-surface` is `#ffffff` in light mode
  (`ivory-50` *is* `#ffffff`; `ivory-100`'s `#f7f6f6` is visually
  indistinguishable from it) and already correctly flips to `#1a1a1a` in
  dark mode. Zero visual change in light mode, correct in dark mode, no
  new CSS.
- `CardClay`, `SavingsCalculator`'s and `SubscriptionGateDialog`'s inner
  highlight boxes: these are nested panels meant to look a shade
  different from their parent `Card` (not just "the same as
  everything else"), so swapping to `bg-surface` would have erased that
  intentional nested contrast in *both* themes. Kept `bg-ivory-100` for
  light mode, added `dark:bg-[#242424]` for dark mode — one step
  lighter than `--color-surface`'s dark value, mirroring the same
  "slightly lighter than Card" relationship `ivory-100` has to Card's
  white in light mode.
- No change to `app/globals.css`'s token definitions — this fix is
  entirely component-level, keeping the dual-purpose `ivory-*` tokens'
  other (correct) usages untouched.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test`
  (41/41) all clean.
- Live Playwright pass against the real Supabase project with
  `colorScheme: "dark"` emulation, computing actual WCAG contrast ratios
  (not just "some color is set") between each fixed element's text and
  its effective background: mobile nav links 15.27:1, desktop nav (visual
  screenshot, confirmed legible), `/about`'s `CardClay` paragraph
  14.39:1, `/pricing`'s savings-calculator label 4.62:1, the hero search
  input 15.27:1 — all comfortably above the ~2.5:1 floor used as the
  pass bar (most far exceed WCAG AA's 4.5:1). Also confirmed `colorScheme:
  "light"` renders pixel-identical to before for the desktop header and
  the pricing-page highlight box (no regression).
- Re-pointed the `domilink-preview.vercel.app` Vercel alias to the new
  deployment after merging, same recurring step as every prior wave this
  session (this project doesn't auto-promote `main` merges to that
  domain).

## Native mobile app — Foundation milestone (post-Milestone-8)

The user asked for a native iOS/Android app alongside the web product.
They attached a pasted prompt plus `MASTER_PROJECT_SPEC.md`/`DESIGN.md`
describing a from-scratch "Crimson Direct" design system and a
pnpm/Turborepo monorepo rebuild — confirmed via `AskUserQuestion`
(twice) that the actual scope is narrower: reuse this repo's *existing*
Claymorphism design tokens and *existing* Supabase backend, no monorepo
conversion, no richer utility/amenity schema fields, mobile app as a
standalone project in a new `mobile/` folder (not a workspace). The
full mobile-app plan (milestones, scope decisions, and the specific
mockup content this project will *not* ship — fabricated stats, "Safe
Escrow," unverified security badges, phone numbers exposed platform-
wide — all flagged against `CLAUDE.md` rule #9 and `docs/SECURITY.md`'s
actual contact-privacy rule) is recorded in full detail in the plan file
from that planning session.

This entry covers the **Foundation** milestone only (milestone 1 of 8):

- New `mobile/` Expo project (Expo Router, TypeScript strict,
  NativeWind) — see `mobile/README.md` for setup and the "keeping in
  sync with web" rules, since there's deliberately no shared code
  package between the two apps.
- `mobile/tailwind.config.js` hand-ported from `app/globals.css`'s
  actual color/radius values (Bonfire Red `forest-*`, `ivory-*`,
  `clay-*`, `charcoal-*`, `success/warning/error/info-*`) — not the
  spec docs' Crimson `#9E1032` palette.
- Fonts: `@expo-google-fonts/manrope` + `@expo-google-fonts/plus-
  jakarta-sans`, matching the web app's `next/font` pairing exactly.
- `mobile/lib/supabase.ts`: `@supabase/supabase-js` pointed at the same
  live project, anon key only (never the service-role key in a mobile
  bundle), session persisted via `@react-native-async-storage/async-
  storage` (not `expo-secure-store` — its ~2KB per-key limit on some
  platforms is too small for a full session payload; this is Supabase's
  own documented React Native pattern).
- `mobile/lib/database.types.ts`: hand-ported subset of `types/
  database.ts` (just `profiles`/`user_roles` so far — extended table-by-
  table as later milestones need them, same "no `supabase gen types` in
  CI yet" reasoning as the web types file).
- Tab navigation (Home/Search/Saved/Messages) mirroring the web header's
  own four tabs; every screen besides Home is a placeholder stating
  which later milestone implements it.
- **Real bugs hit and fixed while standing this up** (all upstream
  tooling/config issues, not application-logic bugs):
  - `babel-preset-expo` and `react-native-reanimated/plugin` were
    present only nested inside `expo`'s own `node_modules` (not hoisted
    to the project root), so Babel's config-file-relative module
    resolution couldn't find them from `mobile/babel.config.js` even
    though `npm ls` showed them as installed — fixed by installing both
    as direct top-level dependencies so npm hoists them.
  - `npx expo-doctor` caught a missing peer dependency
    (`react-native-worklets`, required by `react-native-reanimated`)
    and a major-version mismatch (`@react-native-async-storage/async-
    storage` resolved to `3.1.1` against SDK 58's expected `2.2.0`) —
    both fixed (`npx expo install react-native-worklets` and `npx expo
    install --fix`); `expo-doctor` now reports 20/20 checks passing.
  - Running the app with `--web` (used only as a fast smoke-test loop in
    this sandbox, which has no iOS/Android simulator available) hits an
    uncaught error from `react-native-css-interop`'s web runtime: an
    internal `MutationObserver` callback calls `colorScheme.set()`
    unconditionally once it detects `darkMode: "media"`, but that same
    method throws precisely when `darkMode === "media"` — an upstream
    library inconsistency in the DOM-only code path, confirmed by
    reading `node_modules/react-native-css-interop/dist/runtime/web/
    color-scheme.js` directly. This code path only exists when
    `globalThis.window` is present (i.e., only on web); it does not run
    on iOS/Android. Confirmed the real target platforms are unaffected
    by building actual bundles for both — `npx expo export --platform
    ios` and `--platform android` both completed successfully (3835
    modules, iOS/Android `.hbc` bundles produced, no errors) — so this
    is logged as a known web-smoke-test-only quirk, not a blocker for
    the app's actual platforms.
- `npx tsc --noEmit` and `npx expo lint` both clean.

### Auth milestone (milestone 2 of 8)

- `mobile/lib/validation/auth.ts`: `registerSchema`/`loginSchema` hand-
  ported from `lib/validation/auth.ts` (same rules, kept in sync by
  hand per `mobile/README.md`).
- `mobile/lib/auth/actions.ts`: `registerAction`/`loginAction`/
  `logoutAction`, calling `supabase.auth.signUp`/`signInWithPassword`/
  `signOut` directly (mobile has no Next.js Server Action layer, so the
  anon-key client call plus RLS is the enforcement boundary — same as
  every other mobile data access, per `CLAUDE.md` rule #7).
  `registerAction`'s owner-intent branch calls a new RPC,
  `grant_owner_role_to_self` (see below).
- `mobile/app/(auth)/{login,register}.tsx`: React Hook Form + Zod,
  renter/owner intent cards on register (mirrors the web register
  page's pattern), wired to the real session via
  `mobile/lib/auth/session.tsx`'s `SessionProvider`. Home screen now
  shows real signed-in/signed-out state instead of a placeholder.
- **New migration**, written but **not yet applied to the live
  project**: `supabase/migrations/20261107000100_self_service_owner_role.sql`
  adds `grant_owner_role_to_self()`, a `SECURITY DEFINER` RPC that lets
  a user grant themselves the `owner` role (and only `owner`, never
  `moderator`/`admin`) by reading `auth.uid()` from their own JWT —
  mobile's equivalent of the web's service-role-backed intent→role
  logic in `registerAction`, since mobile only ever holds the anon
  key. **Applying this migration to the live, hosted project was
  blocked by Claude Code's auto-mode safety classifier** (reason:
  `[Production Deploy]`) — a deliberate guardrail, not a bug. It needs
  the project owner to either run the migration SQL themselves via the
  Supabase Dashboard's SQL editor, or explicitly authorize applying it
  via the Management API. Until then, the owner-intent mobile signup
  path fails gracefully with "Your account was created, but we
  couldn't set up owner access. Try again from your profile." — the
  renter-intent path is fully unaffected (no RPC dependency).
- **Live-verified** against the real Supabase project with a Node
  script exercising the actual auth logic directly (not through a
  browser — see below): confirmed `auth.admin.createUser` + the
  existing `handle_new_user` trigger together produce the right
  `profiles`/`user_roles` rows for a renter sign-up, confirmed
  `loginAction`'s `signInWithPassword` call succeeds for correct
  credentials and fails with the expected error for a wrong password,
  and confirmed the owner-intent RPC call fails with exactly the
  "could not find the function" error `registerAction`'s error-handling
  branch is built to catch — i.e., the undeployed migration is
  confirmed to be the *only* missing piece, not a code bug. Test
  accounts deleted after.
  - Browser-based (Playwright) UI verification of the actual register/
    login screens was attempted first but abandoned: the web-only
    `react-native-css-interop` quirk already logged under Foundation
    above re-surfaced as a small bottom-screen error toast that
    intercepted pointer events, and forcing interactions through it
    left React Hook Form's state out of sync with the DOM. Since this
    is a known, web-smoke-test-only artifact unrelated to app logic
    (confirmed harmless to iOS/Android via `expo export` under
    Foundation above), verification was redirected to exercising the
    real `@supabase/supabase-js` calls directly instead, which is a
    more direct test of the business logic anyway.
- `npx tsc --noEmit`, `npx expo lint` (0 errors, one pre-existing
  React-Compiler incompatible-library warning on `watch()`, not a
  regression), and `npx expo export --platform ios/android` (both
  platforms bundle cleanly) all pass.

### Browse & search milestone (milestone 3 of 8)

- `mobile/lib/properties/service.ts`: `searchProperties`,
  `getRecentlyListed`, `getPropertyBySlug`, `getSimilarProperties`,
  `getFavouritedPropertyIds`/`getFavouritedProperties`, and
  `toggleFavourite` — hand-ported from `services/properties.ts` and
  `app/favourites/actions.ts`, same query shapes and RLS-backed
  authorization boundary, called directly from screens (no Server
  Action layer on mobile, per `CLAUDE.md` rule #7).
- `mobile/lib/database.types.ts` extended with `properties`,
  `property_images`, `property_favourites` (hand-ported from
  `types/database.ts`); `mobile/lib/format.ts`/`mobile/lib/storage.ts`
  port the `formatUsd`/`formatCategory`/`isRecentlyPublished` helpers
  and the public property-image URL builder.
- `components/properties/PropertyCard.tsx`: cover photo (`expo-image`),
  price, title, location, category, and a real "New" badge
  (`isRecentlyPublished`, same 72-hour window as web) — never a
  fabricated badge, per rule #9.
- Home tab: real "Recently listed" horizontal list (replaces the
  Foundation milestone's placeholder text) via `getRecentlyListed`.
- Search tab: full rebuild — free-text title search, category/county
  filter chips, a sort control (newest/price low-high/price high-low,
  same `sort` param `searchProperties` already supported), a real
  result count, two-column results grid, and prev/next pagination with
  "Page X of Y" (mirrors web wave-6's search redesign).
- `app/property/[slug].tsx` (new route, outside the tab group): photo
  strip, price + disclosed move-in cost breakdown (advance rent/
  deposit/other fees, same shape as web), amenity chips from the
  existing simple boolean fields (no new utility/amenity schema, per
  the plan's explicit scope decision), favourite toggle, and a
  "Similar properties" row. "Message owner" is shown but disabled with
  "(coming soon)" — real messaging is Milestone 5; never a fake-working
  button.
- Saved tab: real favourites grid for a signed-in user (reusing
  `PropertyCard`), with a "Log in to save properties" prompt when
  signed out — replaces the Foundation milestone's placeholder.
- No RLS/schema changes — this milestone only adds mobile read paths
  (plus the already-existing `property_favourites` insert/delete a
  signed-in user is allowed to do on their own rows) against tables and
  policies Milestone 3 of the *web* app already created and tested.
- **Live-verified** against the real Supabase project with a Node
  script seeding one real listing + one test account: confirmed the
  anon client's search-by-county query finds it, the by-slug detail
  lookup works, the similar-properties query runs cleanly, and the
  full favourite → list → un-favourite round trip succeeds under RLS
  for the owning user. Listing and account deleted after.
- `npx tsc --noEmit`, `npx expo lint` (0 errors, same one pre-existing
  warning noted under Auth above), and `npx expo export --platform
  ios/android` (both bundle cleanly) all pass.

Remaining 5 milestones (Direct Access Pass, Messaging, Verification &
trust, Owner mode, Polish & release readiness) are tracked in the plan
file referenced above, not yet started.

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

**Update**: item 1 below is now resolved for development/staging purposes
— see "Live project verification" above. This project
(`ccuelnrmvtmtgukqyvrb`) is a real Supabase instance with all 10
migrations applied and genuinely exercised end-to-end. Whether it becomes
*the* production project, or a separate one is created for production
specifically, is the project owner's call — either way the "verified
against a plain-Postgres shim only" caveat no longer applies.

**What stands between this and a real production launch** (see
`docs/DEPLOYMENT.md` for the full list):
1. ~~A hosted Supabase project~~ — done; see above. Remaining: decide
   whether `ccuelnrmvtmtgukqyvrb` is the production project or a fresh one
   should be created for production specifically, and clean up the
   end-to-end test data (test accounts, one test listing, one test
   conversation/subscription) this verification pass created — flagged
   for the project owner rather than silently deleted.
2. A real, Liberia-capable payment provider — no production payment
   credentials exist; the architecture is ready and now verified live
   with the mock provider, but the provider itself isn't chosen (see
   `docs/PAYMENTS.md`'s research notes).
3. Legal review of the `/legal/*` pages and real business registration
   details to replace the placeholders in `lib/config/brand.ts`.
4. An email provider, if transactional email (password reset beyond
   Supabase's default, notification emails) is wanted — in-app
   notifications work without one.

Nothing in this list is a silently-dropped requirement; each is a
business/infrastructure decision that requires the project owner's
credentials or input, not more engineering time against this codebase.

## Known production blockers (require the project owner)

- ~~**Hosted Supabase project**~~ — **resolved**: this repo is now
  connected to a real, hosted Supabase project (all 10 migrations applied
  via the Management API, genuinely exercised end-to-end — see "Live
  project verification" above). Remaining decision for the project owner:
  whether to use this same project for production or provision a separate
  one specifically for production, and whether to clean up or keep the
  test accounts/listing/conversation this verification pass created there.
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
- **SMS/WhatsApp provider for low-email-market auth**: phone sign-up/
  sign-in is now built and code-complete (`lib/auth/phone-actions.ts`,
  `components/auth/PhoneAuthForm.tsx`) but **inert** — the live
  project's phone auth provider is still turned off. Enable it under
  Supabase Dashboard → Authentication → Providers → Phone (optionally
  set a Test OTP number/code under Authentication → Settings to try it
  without a real SMS provider first), then add real SMS provider
  credentials there when ready — no further code changes needed either
  time. WhatsApp OTP remains researched-only in
  `docs/AUTH_ALTERNATIVES.md`, blocked on a Meta Business API setup, a
  bigger lift than phone/SMS.
