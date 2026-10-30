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

## Known gaps / not yet implemented

- Rate limiting on auth endpoints (messaging has a basic application-level
  limit — 10 messages/60s per sender, `services/messaging.ts` — stronger,
  infrastructure-level limiting is a Milestone 8 hardening item).
- CSRF: Server Actions get Next.js's built-in action-token protection; the
  payments Route Handler is a plain POST endpoint secured by the
  provider's own webhook-authenticity check (signature/secret), not CSRF
  tokens — that's the correct model for a server-to-server webhook, but
  worth re-confirming once a real provider's verification scheme is
  integrated.
- Content Security Policy headers — not yet configured; tracked for M8.
- Verification-document access controls and signed URLs — M6.
- Audit logging for privileged actions — M7.
- This container's Docker daemon doesn't run, so RLS/auth have only been
  verified against a plain-Postgres shim and static page rendering, not
  against live Supabase Auth/PostgREST/Storage. That gap is closed by
  running `supabase start` on a Docker-capable machine or against a hosted
  Supabase project before production launch — see `docs/DEPLOYMENT.md`.
