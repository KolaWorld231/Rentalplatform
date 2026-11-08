# Payments & Subscriptions

## The business rule

One plan: **Direct Access Pass**, **$5 for 30 days**, unlocks initiating
new direct conversations with property owners. Browsing and listing stay
free regardless. A subscriber can contact as many owners as they like for
the duration — no per-property fee. No recurring auto-billing: renewal is
manual. See `CLAUDE.md` for the full non-negotiable rule set.

## Architecture

```
Renter clicks "Subscribe" (web) / taps "Get the Direct Access Pass" (mobile)
  → startCheckout() (lib/subscriptions/service.ts) -- web calls it
    directly from a Server Action; mobile calls it via the authenticated
    app/api/mobile/checkout/route.ts, same function either way
    → creates subscriptions row (status: pending_payment) [service_role]
    → creates payment_transactions row (status: initiated) [service_role]
    → provider.createCheckout(...) → CheckoutResult, one of:
      - { kind: "redirect", redirectUrl } -- card-style/mock: browser
        navigates to the provider's checkout page
      - { kind: "pending", reference } -- MTN MoMo: no page to redirect
        to, a USSD prompt already went to the payer's phone; web shows
        /checkout/momo/pending, mobile shows its own pending state, both
        POLL from here (see below), since MoMo's callbacks can't be
        trusted

Resolution reaches processVerifiedPaymentEvent (lib/payments/service.ts)
one of two ways -- the SAME function either way, never duplicated:
  (a) Provider calls our webhook → app/api/payments/webhook/route.ts
      → provider.verifyWebhook(rawBody, headers) → VerifiedWebhookEvent | null
  (b) Our own poll (app/checkout/momo/actions.ts on web,
      app/api/mobile/checkout/status/route.ts for mobile) calls
      provider.checkStatus(reference) → VerifiedWebhookEvent | null
      directly, independent of any callback

  processVerifiedPaymentEvent then:
    → look up payment_transactions by internal_reference
    → reject if amount/currency mismatch
    → INSERT payment_webhook_events (unique on provider+event_id) — THE
      idempotency gate. A duplicate delivery/poll hits a unique-constraint
      violation and is acknowledged without re-processing.
    → if confirmed: supabase.rpc('confirm_payment_and_activate_subscription')
      — a SECURITY DEFINER Postgres function, executable only by
      service_role, that atomically marks the transaction confirmed and
      activates the subscription with a server-computed UTC expiry
      (now() + plan.duration_days)
    → if failed/reversed/refunded: transaction and subscription marked
      accordingly; nothing is ever activated
```

Every step that can activate a subscription runs as `service_role` from
trusted server code. The `subscriptions` table has **no** client-writable
INSERT/UPDATE policy at all (see `docs/DATABASE_SCHEMA.md`) — a user
cannot activate their own subscription by any client request, full stop.

### Why a Route Handler instead of an Edge Function

The build brief's reference architecture puts the webhook in a Supabase
Edge Function. This project implements it as a Next.js Route Handler
instead, because this sandboxed development container's Docker daemon
doesn't start, so the Edge Functions runtime was never usable here. The
trust boundary is identical either way (server-only code with the
service-role key). `supabase/functions/payments-webhook/README.md`
documents exactly how to port it if you want it decoupled from the Next.js
deployment.

## Idempotency, concretely

Verified in `supabase/local-shim/test_m4_rls.sql`:
- A duplicate webhook event (same `provider` + `event_id`) is rejected by
  a unique constraint before any subscription logic runs.
- Calling the activation function twice for an already-`confirmed`
  transaction returns the existing subscription unchanged — it does not
  extend the expiry or reactivate anything.
- A `failed` payment transaction never results in `has_active_subscription()`
  returning true for that user.

## The mock provider (development only)

`lib/payments/providers/mock.ts` simulates checkout → webhook end to end
without touching real money, so the activation path could be built and
tested here. Safety rails:
- `getPaymentProvider()` (`lib/payments/index.ts`) **throws** if
  `PAYMENTS_PROVIDER=mock` and `NODE_ENV==="production"` — the mock
  provider cannot be constructed in production at all.
- The mock "webhook" (`app/checkout/mock/actions.ts`) calls the real
  `/api/payments/webhook` endpoint with a shared `PAYMENTS_WEBHOOK_SECRET`
  header, exercising the identical verification/idempotency/activation
  code path a real provider's webhook would.
- `app/checkout/mock/page.tsx` refuses to render in production and is
  visibly labeled as a development simulator.

## Adding a real provider

Implement `PaymentProvider` (`lib/payments/types.ts`):
- `createCheckout(params)` — start a payment. Returns one of two shapes
  (`CheckoutResult` is a union, not a single `redirectUrl` field): `{
  kind: "redirect", redirectUrl }` for a hosted checkout page (card
  processors, the mock provider), or `{ kind: "pending", reference }`
  for a push-payment provider (MTN MoMo's RequestToPay) that has no page
  to redirect to — see "MTN MoMo (push-payment) integration" below.
- `verifyWebhook({ rawBody, headers })` — **independently verify**
  authenticity (signature check against the provider's documented scheme,
  or an API callback to confirm the event) and return a normalized
  `VerifiedWebhookEvent`, or `null` if verification fails. Returning
  non-null is what the webhook route treats as "safe to act on" — get
  this wrong and you've broken the whole security model.
- `checkStatus(reference)` (optional) — only needed by a push-payment
  provider whose callbacks can't be trusted; polls the provider directly
  and returns `null` while still pending.
- `requiresPayerPhone: boolean` — true if `createCheckout` needs
  `CheckoutParams.payerPhone`. The pricing page (and mobile's) only shows
  a phone field when this is true.

Then register it in `getPaymentProvider()` and set `PAYMENTS_PROVIDER` /
provider-specific env vars (see `.env.example`).

Whatever a provider's write path needs, it must go through
`lib/payments/service.ts`'s `processVerifiedPaymentEvent(event,
providerName)` — the one and only activation code path (idempotent,
amount-checked, `confirm_payment_and_activate_subscription`-calling).
The webhook route calls it after `verifyWebhook` succeeds; a polling
flow (see below) calls it after `checkStatus` resolves. Never write a
second copy of this logic for a new provider.

## MTN MoMo (push-payment) integration

`lib/payments/providers/mtn-momo.ts` implements MTN Mobile Money's
Collection API (`PAYMENTS_PROVIDER=mtn_momo`). Unlike a card processor,
MoMo is a **push** flow: there's no hosted checkout page. The payer's
phone number is collected in our own UI, `RequestToPay` sends a USSD
prompt directly to their phone, and the flow resolves only once they
approve + enter their PIN.

- **Sandbox credentials are self-provisioned**, no business registration
  needed: sign up at momodeveloper.mtn.com, subscribe to the free
  "Collection" product for a subscription key, then create an API user +
  API key against the sandbox (`POST /v1_0/apiuser`, then
  `/v1_0/apiuser/{id}/apikey`) — see `.env.example`'s `MTN_MOMO_*` vars.
- **Sandbox callbacks are known unreliable** (confirmed against MTN's own
  developer-community posts and third-party integration guides, not
  assumed) — so `verifyWebhook` never trusts a callback's status
  directly; it only reads which reference to check, then calls
  `checkStatus` for the real, independently-verified result. The primary
  path is **polling**, not callbacks:
  - Web: after `startCheckout` returns `{ kind: "pending" }`, the renter
    is redirected to `/checkout/momo/pending`, which polls
    `checkMomoPaymentStatusAction` (`app/checkout/momo/actions.ts`) every
    few seconds.
  - Mobile: no polling path exists — see "Mobile parity" below, mobile
    never initiates a checkout at all.
- **Liberia is a confirmed live MoMo production market** (per MTN's own
  community posts, not assumed), but the sandbox only accepts **EUR** and
  a generic `X-Target-Environment: sandbox` — Liberia's real production
  `X-Target-Environment` value and actual settlement currency (almost
  certainly LRD, not USD) are **not yet resolved**, same "needs the
  project owner's real credentials/research" category as the rest of
  this file. `payment_transactions.currency` always records the business
  currency (USD); `MTN_MOMO_CURRENCY` only controls what's sent to MTN's
  API, and never corrupts the ledger.

## Mobile parity — mobile is checkout-free by design

Mobile has **no checkout-initiation code path at all** — no checkout
API route, no phone-entry UI, no polling. `mobile/app/pricing.tsx`
only ever reads the signed-in user's real subscription status
(`mobile/lib/subscriptions/service.ts`'s `getActiveSubscription`) and
points a non-subscriber at the website to buy a pass there. This is a
deliberate "reader app" pattern (the same one Netflix/Spotify/Kindle
use), not a missing feature — see
`docs/IMPLEMENTATION_STATUS.md`'s dated entry for the App Store/Play
Store in-app-purchase policy reasoning. Web keeps the full checkout
flow above unchanged, since the app-store IAP rule doesn't apply to a
website; a renter buys the pass from any browser and it's immediately
active on mobile too, since both clients read the same `subscriptions`
table.

The previously-built `app/api/mobile/checkout/{route,status/route}.ts`
routes (bearer-token-authenticated wrappers around `startCheckout()`/
`checkStatus()`) have been deleted — they are not needed and must not
be rebuilt without first revisiting the IAP policy decision. The
Foundation-milestone `start_mobile_checkout()` RPC (which only ever
worked for the mock provider) remains deployed but unused; dropping it
is a separate, low-priority migration, not required for correctness.

### Liberia-specific provider research (not yet resolved)

No production payment credentials exist for this project. Before
integrating a real provider, confirm — using the provider's own current,
official documentation, not assumptions — for each candidate:

- **Orange Money Liberia** / **Lonestar Cell MTN Mobile Money**: merchant
  eligibility for a Liberia-registered business, whether a direct
  merchant/developer API exists (vs. only a consumer app), settlement
  currency, webhook/callback support, refund support, and production
  onboarding requirements.
- **International card processors** (Stripe, Flutterwave, Paystack, etc.):
  whether they support settlement for a Liberia-based merchant at all —
  many major processors do not list Liberia as a supported country, and
  this must be re-verified against current provider documentation before
  committing engineering time to an integration that can't go live.

This is a business/legal decision requiring real provider accounts, not
something this build resolves on its own — see
`docs/IMPLEMENTATION_STATUS.md`'s production blockers.

## Reconciliation / admin

Milestone 7 adds admin visibility into transactions/subscriptions and a
documented, audited process for manual adjustments (refund records,
support corrections). No arbitrary editing of a provider-confirmed
transaction is permitted — see `docs/SECURITY.md`.
