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

## Milestone 2 — Database & auth: ⏳ Not started

## Milestone 3 — Property marketplace: ⏳ Not started

## Milestone 4 — Subscriptions & payments: ⏳ Not started

## Milestone 5 — Direct messaging: ⏳ Not started

## Milestone 6 — Verification & trust: ⏳ Not started

## Milestone 7 — Admin & notifications: ⏳ Not started

## Milestone 8 — Hardening & production readiness: ⏳ Not started

## Known production blockers (require the project owner)

- **Hosted Supabase project**: development runs against a local Supabase
  stack (Docker). Production needs a real project URL + anon key +
  service-role key supplied via `.env`.
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
