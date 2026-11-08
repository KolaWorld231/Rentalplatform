# Product Specification

## Problem

Renters in Liberia commonly pay agents ~US$30–40 to arrange a single
viewing, with no guarantee of finding a suitable property and no refund if
it falls through.

## Solution

231Rentals connects renters directly with property owners.

- Property owners register and list properties **for free**.
- Property seekers browse and search listings **for free**.
- To message a property owner directly, a renter needs an active
  **Direct Access Pass**: **US$5 for 30 days**, after which they can
  contact as many owners as they like with no further per-property fee.

## Roles

See `CLAUDE.md` for the authoritative, must-not-violate business rules.
Roles: guest, renter, owner, authorized property manager (owner extension),
moderator, admin. Full permission matrix per role is implemented via
`user_roles` + RLS (`docs/DATABASE_SCHEMA.md`) rather than duplicated here,
to avoid the two drifting apart.

## Monetization

One plan at launch: **Direct Access Pass**, $5 / 30 days, unlocks
initiating new conversations with owners. Existing conversation history
stays visible after expiry; only *starting a new* conversation requires an
active subscription. No recurring auto-billing at launch — manual renewal
only. Full state machine and payment architecture: `docs/PAYMENTS.md`
(Milestone 4).

## Geography & currency

Liberia first (Monrovia + surrounding communities at launch), USD pricing,
a location taxonomy (county → city → community → neighbourhood) designed to
extend to other Liberian regions and, later, other countries without a
schema change.

## Non-goals at launch

- Automatic recurring billing.
- Legal verification of property ownership (identity/document review is
  evidence-based, not a title guarantee — see `docs/SECURITY.md` and the
  Safety page copy).
- Multi-currency conversion.
- Offline messaging delivery guarantees.

## Milestones

Tracked in `docs/IMPLEMENTATION_STATUS.md`, M1 through M8, per the project
build plan.
