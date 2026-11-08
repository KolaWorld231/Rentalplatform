# Authentication alternatives for low-email-usage markets

## Why this document exists

231Rentals's auth today is Supabase email+password plus, as of this
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

## Option 2 — WhatsApp OTP — **built**

**Likely the best fit for actual usage patterns in Liberia**, given high
WhatsApp penetration relative to email — not Supabase-native, so a
meaningfully bigger lift than phone/SMS OTP, but now fully implemented
on both web and mobile. See `docs/IMPLEMENTATION_STATUS.md` for the
dated entry with exactly what was verified.

**What it needed, and what's still a real blocker**: a **Meta WhatsApp
Business Cloud API** account (or a BSP reseller of it), including
business verification and an approved message template for the OTP
(Meta requires pre-approved templates for business-initiated
conversations). **This part is not resolved** — no credentials exist
yet, same "needs the project owner's real account" category as the
payment provider research. `.env.example`'s `WHATSAPP_*` vars document
exactly what's needed; `lib/auth/whatsapp-cloud-api.ts` throws a clear
error rather than fabricating a send when they're unset.

**What's actually built** (`lib/auth/whatsapp-otp.ts`,
`lib/auth/whatsapp-actions.ts`, `lib/auth/otp-code.ts`,
`supabase/migrations/20261108000200_whatsapp_otp.sql`,
`components/auth/WhatsAppAuthForm.tsx` on web and its mobile
equivalent):
- Generates a 6-digit code with `crypto.randomInt`, stores only its
  salted SHA-256 hash (`whatsapp_otp_challenges`, same
  service-role-only shape as `webauthn_challenges`), with a 10-minute
  TTL, a 5-attempt cap, and per-phone rate limiting on starting a new
  challenge.
- Signup still collects an email once, purely as the underlying
  Supabase Auth identifier (same convention the passkey work already
  established) — never asked for again; every later sign-in is phone
  number + WhatsApp code only. `profiles.phone`/`phone_verified_at`
  (previously unused columns) are now the real phone→account lookup
  for returning users.
- The same `admin.generateLink` + `verifyOtp` session-minting trick
  the passkey work introduced, extracted to a shared
  `lib/auth/session-mint.ts` so both factors use one copy of it — plus
  a mobile variant that returns raw session tokens instead of writing
  cookies, since there's no cookie jar in a Route Handler mobile calls.
- Mobile reuses 100% of the server-side logic via two unauthenticated-
  by-design routes (`app/api/mobile/whatsapp-otp/{start,verify}`) —
  there's no session yet at the point of requesting/verifying a code,
  so no bearer token is possible or needed; the routes aren't a second
  implementation, just a JSON-in/JSON-out wrapper around the same
  functions web's Server Actions call.

## Option 3 — "Remember this device" long-lived sessions — **tuned**

Not a new sign-in method — a way to make whichever method is in place
need to happen less often. Checked the live project's actual Auth
config (Supabase Management API's `/config/auth`, not assumed) before
changing anything:

- `sessions_inactivity_timeout` and `sessions_timebox` were **already
  both disabled** on this project — no absolute session expiry and no
  inactivity-based forced logout exist already. This is the thing that
  actually keeps a session alive indefinitely (as long as the client
  refreshes periodically, which both web's and mobile's Supabase
  clients already do automatically) — nothing needed changing here.
- `jwt_exp` (the access token's own lifetime) was the default 3600s (1
  hour) — bumped to 14400s (4 hours), applied to the live project via
  the Management API and mirrored in `supabase/config.toml` for local
  dev. This doesn't change how long a session *lasts* (that's the
  refresh token, unaffected) — it reduces how often the client needs a
  refresh round-trip at all, which matters specifically for
  intermittent/low-bandwidth mobile connectivity: fewer refresh
  attempts means fewer chances for one to fail at a bad moment, and
  less data used on token refreshes.
- Live-verified: logged a real test user in against the live project
  and decoded the returned access token's own `exp`/`iat` claims to
  confirm its lifetime is genuinely 14400s now, not the old 3600s.

Pair this with passkeys (already shipped) or WhatsApp/phone OTP
(Options 1-2) for the lowest-friction combination: authenticate once,
rarely again on a trusted device.

## Option 4 — USSD

Out of reach for a web app on its own — USSD (the `*123#`-style menus
used for mobile money, airtime, etc.) requires a direct relationship
with a mobile network operator or a USSD aggregator, not something a
Next.js/Supabase codebase can add by itself. Noted here as a longer-term,
non-technical consideration (a partnership decision, similar in kind to
`docs/PAYMENTS.md`'s mobile-money research) rather than a near-term
option.

## Option 5 — Operational / non-technical mitigations

- **Agent-assisted account creation**: a trusted person (231Rentals staff,
  a partner organization) helps someone without reliable phone/email
  access create and verify an account in person — a process decision,
  not a code change.
- **Data-light design**: keep auth pages' payload small (already true —
  no new heavy client bundles were added for passkeys; `@simplewebauthn/
  browser` is a small, purpose-built library) so sign-up/sign-in works
  reasonably on slow or expensive mobile data connections.

## Summary — what's actually recommended, in order

1. **Passkeys** — built. Already removes "remembering a password" as a
   barrier, no new provider dependency.
2. **WhatsApp OTP** — built (code-complete, live-verified end-to-end
   except the actual message send). Blocked only on the project owner
   setting up a Meta WhatsApp Business Cloud API account and getting
   an OTP template approved — see Option 2 above and `.env.example`.
3. **Phone/SMS OTP** — code-complete (`lib/auth/phone-actions.ts`),
   inert pending the live project's SMS provider being configured —
   see `docs/IMPLEMENTATION_STATUS.md`'s production blockers.
4. **Long-lived sessions** — tuned. No inactivity timeout/timebox
   existed already; access-token lifetime bumped from 1 to 4 hours,
   applied to the live project and verified.
5. **USSD / agent-assisted onboarding** — longer-term, non-technical,
   partnership-dependent; noted for completeness, not a near-term build.
