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

## Known gaps / not yet implemented

- Rate limiting on auth endpoints and messaging (planned for M5).
- CSRF: Server Actions get Next.js's built-in action-token protection;
  Route Handlers added in later milestones will need explicit review.
- Content Security Policy headers — not yet configured; tracked for M8.
- Verification-document access controls and signed URLs — M6.
- Payment webhook signature verification and idempotency — M4.
- Audit logging for privileged actions — M7.
- This container's Docker daemon doesn't run, so RLS/auth have only been
  verified against a plain-Postgres shim and static page rendering, not
  against live Supabase Auth/PostgREST/Storage. That gap is closed by
  running `supabase start` on a Docker-capable machine or against a hosted
  Supabase project before production launch — see `docs/DEPLOYMENT.md`.
