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
