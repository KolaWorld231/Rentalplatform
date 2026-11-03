# Authentication alternatives for low-email-usage markets

## Why this document exists

DomiLink's auth today is Supabase email+password plus, as of this
change, passkey (WebAuthn/biometric) sign-up and sign-in — see
`docs/DATABASE_SCHEMA.md` and `lib/auth/webauthn-actions.ts`. Email is a
poor primary identifier in markets like Liberia, where active email
usage is low relative to phone and messaging-app usage. This document
lays out the realistic options for reducing reliance on email, their
real tradeoffs, and what each one is blocked on — same framing as
`docs/PAYMENTS.md`'s provider research: none of this is implemented yet,
because each option needs either a real provider account/credentials or
a product decision only the project owner can make.

Passkeys themselves already help here independent of email: once an
account exists, a passkey means never typing (or remembering) a
password again, and the account's *email* can be used purely as the
account identifier (never typed at sign-in) rather than something the
user has to actively check. That's a meaningful piece of the problem
already solved. What's below addresses the other piece: email as the
*account identifier itself*, for people who don't check an email inbox
day to day.

## Option 1 — Phone/SMS OTP sign-in

**The natural fit.** Supabase Auth supports this natively:
`supabase.auth.signInWithOtp({ phone })` sends a code via a configured
SMS provider, `verifyOtp({ phone, token, type: "sms" })` completes
sign-in — no custom session-minting trick needed (unlike passkeys),
since this *is* a first-class Supabase Auth method. `supabase/config.toml`
already has a dormant `[auth.sms]` block with Twilio pre-templated (just
unconfigured) from the project's original scaffolding.

**What it needs before it can be built for real**: an SMS provider
account with confirmed Liberia coverage and cost. Before committing
engineering time, confirm with the provider's current documentation
(not assumptions):
- **Twilio**: broad global reach; confirm Liberia SMS deliverability/
  pricing specifically, and whether Verify API (purpose-built OTP
  product, handles retry/rate-limiting server-side) or plain Programmable
  Messaging is the better fit.
- **Infobip** / **MessageBird (Bird)**: both have stronger Africa-specific
  routing than some US-centric providers; worth a direct cost/
  deliverability comparison against Twilio for Liberia specifically.
- **Local/regional aggregators** (e.g. providers serving Orange/Lonestar
  Cell MTN's networks directly) may have better deliverability/cost than
  a global provider routing through international carriers — worth
  asking Orange/Lonestar directly, the same two carriers already named
  in `docs/PAYMENTS.md`'s mobile-money research.

**Implementation shape, once a provider is chosen**: mirror
`lib/auth/actions.ts`'s existing pattern — new `phoneSignupSchema`/
`phoneLoginSchema` in `lib/validation/auth.ts`, new Server Actions calling
`signInWithOtp`/`verifyOtp` directly (no custom session trick required),
new UI on `/login` and `/register` alongside the password and passkey
options. Rate limiting: Supabase's own built-in auth rate limiting
applies here automatically, unlike the custom passkey endpoints.

## Option 2 — WhatsApp OTP

**Likely the best fit for actual usage patterns in Liberia**, given high
WhatsApp penetration relative to email — but not Supabase-native, so a
meaningfully bigger lift than phone/SMS OTP.

**What it needs**:
- A **Meta WhatsApp Business Cloud API** account (or a BSP — Business
  Solution Provider — reseller of it), including business verification
  and an approved message template for the OTP (Meta requires
  pre-approved templates for business-initiated conversations).
- A custom Edge Function or Route Handler that: generates a short numeric
  code, stores a hashed version + expiry server-side (a small new table,
  same shape as `webauthn_challenges`), sends it via the WhatsApp Cloud
  API, and verifies it against the stored hash on submission.
- The same session-minting pattern this change introduces for passkeys
  (`admin.generateLink({ type: "magiclink" })` → `verifyOtp` with the
  resulting `hashed_token`) to turn a verified WhatsApp code into a real
  Supabase session, since WhatsApp isn't a Supabase Auth provider.

**Tradeoff to flag explicitly**: Meta's template-approval process and
Business verification can take days to weeks and is sometimes rejected on
first submission — this should be started early if it's wanted, not
treated as a quick addition.

## Option 3 — "Remember this device" long-lived sessions

Not a new sign-in method — a way to make whichever method is in place
need to happen less often. Supabase session refresh tokens already
support long-lived sessions by configuration (how long a refresh token
stays valid before requiring a fresh login); tuning this down the amount
of friction for a low-connectivity, low-email user without any new
infrastructure. Pair this with passkeys (already shipped) or phone OTP
(Option 1) for the lowest-friction combination: authenticate once, rarely
again on a trusted device.

## Option 4 — USSD

Out of reach for a web app on its own — USSD (the `*123#`-style menus
used for mobile money, airtime, etc.) requires a direct relationship
with a mobile network operator or a USSD aggregator, not something a
Next.js/Supabase codebase can add by itself. Noted here as a longer-term,
non-technical consideration (a partnership decision, similar in kind to
`docs/PAYMENTS.md`'s mobile-money research) rather than a near-term
option.

## Option 5 — Operational / non-technical mitigations

- **Agent-assisted account creation**: a trusted person (DomiLink staff,
  a partner organization) helps someone without reliable phone/email
  access create and verify an account in person — a process decision,
  not a code change.
- **Data-light design**: keep auth pages' payload small (already true —
  no new heavy client bundles were added for passkeys; `@simplewebauthn/
  browser` is a small, purpose-built library) so sign-up/sign-in works
  reasonably on slow or expensive mobile data connections.

## Summary — what's actually recommended, in order

1. **Passkeys** (this change) — already removes "remembering a password"
   as a barrier, no new provider dependency.
2. **Phone/SMS OTP** — the next highest-leverage addition, natively
   supported by Supabase, blocked only on choosing and contracting an SMS
   provider with confirmed Liberia coverage.
3. **WhatsApp OTP** — likely the best match for actual local usage
   patterns, but a real lift (Meta Business API, template approval,
   custom verification code) — worth doing once Option 1 is live and
   there's appetite for the extra integration work.
4. **Long-lived sessions** — a cheap, immediate friction-reducer to apply
   regardless of which identity method is used.
5. **USSD / agent-assisted onboarding** — longer-term, non-technical,
   partnership-dependent; noted for completeness, not a near-term build.
