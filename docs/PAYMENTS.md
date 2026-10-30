# Payments & Subscriptions

## The business rule

One plan: **Direct Access Pass**, **$5 for 30 days**, unlocks initiating
new direct conversations with property owners. Browsing and listing stay
free regardless. A subscriber can contact as many owners as they like for
the duration — no per-property fee. No recurring auto-billing: renewal is
manual. See `CLAUDE.md` for the full non-negotiable rule set.

## Architecture

```
Renter clicks "Subscribe"
  → startCheckoutAction (Server Action, lib/subscriptions/service.ts)
    → creates subscriptions row (status: pending_payment) [service_role]
    → creates payment_transactions row (status: initiated) [service_role]
    → provider.createCheckout(...) → { redirectUrl }
  → browser redirected to the provider's checkout page

Provider confirms payment → calls our webhook
  → app/api/payments/webhook/route.ts
    → provider.verifyWebhook(rawBody, headers) → VerifiedWebhookEvent | null
    → look up payment_transactions by internal_reference
    → reject if amount/currency mismatch
    → INSERT payment_webhook_events (unique on provider+event_id) — THE
      idempotency gate. A duplicate delivery hits a unique-constraint
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
- `createCheckout(params)` — start a payment, return a redirect URL.
- `verifyWebhook({ rawBody, headers })` — **independently verify**
  authenticity (signature check against the provider's documented scheme,
  or an API callback to confirm the event) and return a normalized
  `VerifiedWebhookEvent`, or `null` if verification fails. Returning
  non-null is what the webhook route treats as "safe to act on" — get
  this wrong and you've broken the whole security model.

Then register it in `getPaymentProvider()` and set `PAYMENTS_PROVIDER` /
provider-specific env vars (see `.env.example`).

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
