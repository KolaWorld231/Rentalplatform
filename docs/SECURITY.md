# Security

This document is extended at the end of every milestone. It is a living
threat model, not a one-time checklist.

## Authentication

- Supabase Auth (email/password at launch). Sessions are cookie-based via
  `@supabase/ssr`, refreshed in `proxy.ts` (Next.js middleware) on every
  request using `supabase.auth.getUser()` — which re-validates the token
  against Supabase, unlike `getSession()`, which only reads it from the
  cookie.
- Protected routes are enforced twice: once in `proxy.ts` (fast redirect
  for `/account`, `/dashboard`, `/messages`, `/favourites`, `/admin`), and
  again inside each protected Server Component via `requireUser()` /
  `requireRole()` (`lib/auth/session.ts`). The second check is the one that
  actually matters — middleware matchers can have gaps, a page-level check
  cannot.
- Password reset uses Supabase's token-based flow; the "forgot password"
  endpoint responds identically whether or not the email is registered, to
  avoid account enumeration.

## Authorization

- Role assignment (`user_roles`) is never client-writable. The only ways a
  role is granted: the `handle_new_user` DB trigger (default `renter` on
  signup) and explicit `service_role` writes from validated server code
  (e.g. `registerAction` granting `owner` based on a Zod-validated enum,
  never a raw client string). See `supabase/local-shim/test_m2_rls.sql` for
  a reproducible proof that a client cannot self-grant `admin`.
- All other row-level authorization (who can read/write a profile, a
  listing, a conversation, a payment record) is enforced by RLS policies in
  the migration that introduces the table — not by application code
  choosing not to show a button.
- `service_role` (`lib/supabase/service-role.ts`) is wrapped in a
  `server-only` import, which makes it a **build error** to import it into
  any client bundle.

## Secrets

- `SUPABASE_SERVICE_ROLE_KEY` and any future payment-provider secret are
  server-only env vars, never prefixed `NEXT_PUBLIC_`, and read through
  `lib/supabase/env.ts`'s `requireEnv`, which throws a clear error instead
  of silently running with `undefined`.
- `.env.local` is gitignored; `.env.example` documents every variable name
  with no real values.

## Payments (Milestone 4)

- Subscription activation is reachable only through
  `confirm_payment_and_activate_subscription`, a `SECURITY DEFINER`
  Postgres function revoked from `PUBLIC` and granted only to
  `service_role`. `subscriptions` has no client-writable INSERT/UPDATE
  policy at all — verified in `supabase/local-shim/test_m4_rls.sql`,
  including an explicit attempt by `authenticated` to call the activation
  function directly, which is rejected.
- The webhook route (`app/api/payments/webhook/route.ts`) independently
  verifies every event through the configured provider before acting on
  it (`provider.verifyWebhook`), rejects amount/currency mismatches
  against our own transaction record, and enforces idempotency with a DB
  unique constraint (`payment_webhook_events(provider, event_id)`) rather
  than an application-level check — a race between two concurrent
  deliveries of the same event is resolved by the database, not by
  "check-then-act" logic that could lose the race.
- `PAYMENTS_WEBHOOK_SECRET` gates the mock provider's "webhook" exactly
  like a real provider's signature would; the mock provider itself refuses
  to construct in production (`lib/payments/index.ts`).

## Messaging (Milestone 5)

- The subscription gate on starting a new conversation is enforced by RLS
  (`conversations_insert_renter`'s `WITH CHECK`), not application code —
  there is no code path that could "forget" to check it. Verified in
  `supabase/local-shim/test_m5_rls.sql`, including the specific scenario of
  an expired subscriber being blocked from a *new* conversation while
  remaining able to read/reply in an *existing* one.
- `owner_id` on a conversation is never trusted from the client — a
  BEFORE INSERT trigger (`enforce_conversation_owner`) derives it from the
  property and rejects messaging your own listing, independent of
  whatever the client submitted.
- Only conversation participants (`renter_id`/`owner_id` matching
  `auth.uid()`) can read a conversation or its messages; a non-participant
  gets zero rows back and an INSERT attempt is rejected outright — both
  verified directly.
- Known MVP looseness: the `conversations` UPDATE policy scopes by
  participant but not by column, so a participant could technically change
  `status` on their own conversation (e.g. unilaterally archive it). Low
  severity (it's already their own conversation), tracked for Milestone 8
  tightening.

## Verification document privacy (Milestone 6)

- Verification documents (government ID photos, ownership/authorization
  paperwork) live in a **private** Storage bucket
  (`verification-documents`, `public = false`), never the public
  `property-images` bucket from Milestone 3.
- The only way to view a document is a signed URL with a 60-second
  lifetime, generated by `service_role` from
  `getSignedDocumentUrlAction` — and only after the normal RLS-scoped
  `SELECT` on `private_verification_documents` that precedes it has
  already proven the caller is the applicant or a moderator/admin. The
  service-role client is used purely to produce the signed URL, not to
  re-check or bypass authorization.
- `storage.objects` RLS on the bucket independently scopes access to
  `owner = auth.uid()` or moderation roles as defense in depth, in case
  anything ever reached Storage directly.
- Neither `identity_verification_requests` nor
  `property_verification_requests` has a client-writable UPDATE policy —
  verified in `supabase/local-shim/test_m6_rls.sql`, including an explicit
  attempt by the applicant to self-mark their own request `verified`,
  which is rejected.
- Public badges (`is_identity_verified`/`is_property_verified`) return
  only a boolean — the underlying request/document data is never exposed
  through the public API, and the badge copy itself (see
  `lib/config/brand.ts`) never claims verification proves legal ownership.

## Administration & audit logging (Milestone 7)

- Every privileged admin/moderation action
  (`app/admin/actions.ts`) re-checks the caller's role server-side via
  `requireAnyRole`/`requireRole` before doing anything — never relies on a
  page having hidden a button. `/admin/users` (suspend/restore) is
  additionally gated to `admin` only, separately from the shared
  `/admin` layout's `admin`-or-`moderator` gate — least privilege, not
  "anyone who reached the admin area."
- `admin_audit_logs` is readable only by `admin` (moderators are
  excluded) and writable only by `service_role` — not even an admin's own
  authenticated session can insert a row directly, which is what forces
  every write through the real moderation action rather than a
  standalone log entry. Verified in `supabase/local-shim/test_m7_rls.sql`.
- Notifications are system-generated only; a user can read and mark their
  own as read but cannot create one for themselves (prevents using the
  notification system to deliver attacker-controlled content as if it
  came from the platform).
- Dashboard aggregates (`/admin`) use `service_role` to run `COUNT`
  queries across all rows — this is a read-only aggregate, not a
  per-record bypass, and is appropriate because RLS-scoped counts would
  undercount or require N queries per admin page load.

## Response headers (Milestone 8)

`next.config.ts` sets, on every route: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
a restrictive `Permissions-Policy` (camera/microphone/geolocation all
denied — none of DomiLink's features use them), and a `Content-Security-
Policy` scoped to `'self'` plus the configured Supabase origin for
`connect-src`/`img-src`/WebSocket (Realtime). Verified by curling a
running build and confirming every header is present (see
`docs/IMPLEMENTATION_STATUS.md`). `script-src` still allows `'unsafe-
inline'`/`'unsafe-eval'`, needed for Next's current runtime — tightening
this with nonces is a reasonable follow-up once real hosting is in place,
not a regression introduced here.

## Known gaps / not yet implemented

- Rate limiting on auth endpoints (messaging has a basic application-level
  limit — 10 messages/60s per sender, `services/messaging.ts`; auth
  endpoints rely on Supabase Auth's own built-in rate limiting — stronger,
  infrastructure-level limiting across all endpoints is a post-launch
  hardening item, e.g. at a CDN/WAF layer).
- CSRF: Server Actions get Next.js's built-in action-token protection; the
  payments Route Handler is a plain POST endpoint secured by the
  provider's own webhook-authenticity check (signature/secret), not CSRF
  tokens — that's the correct model for a server-to-server webhook, but
  worth re-confirming once a real provider's verification scheme is
  integrated.
- `script-src 'unsafe-inline'`/`'unsafe-eval'` in the CSP (see above) —
  acceptable for now, a nonce-based tightening is future work.
- No admin UI for `support_tickets` status/assignment yet — submission
  works and is RLS-correct, but there's no moderation queue page for it
  (unlike listings/verifications/reports, which all got one in Milestone
  7). A straightforward addition following the same pattern.
- This container's Docker daemon doesn't run, so RLS/auth have only been
  verified against a plain-Postgres shim and static page rendering, not
  against live Supabase Auth/PostgREST/Storage/Realtime. That gap is
  closed by running `supabase start` on a Docker-capable machine or
  against a hosted Supabase project before production launch — see
  `docs/DEPLOYMENT.md`.
