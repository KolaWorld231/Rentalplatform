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

## Milestone 3 — Property marketplace: ⏳ Not started

## Milestone 4 — Subscriptions & payments: ⏳ Not started

## Milestone 5 — Direct messaging: ⏳ Not started

## Milestone 6 — Verification & trust: ⏳ Not started

## Milestone 7 — Admin & notifications: ⏳ Not started

## Milestone 8 — Hardening & production readiness: ⏳ Not started

## Known production blockers (require the project owner)

- **Hosted Supabase project**: development is intended to run against a
  local Supabase stack (Docker), but this sandboxed build container's
  Docker daemon doesn't start, so local development here falls back to a
  plain-Postgres RLS shim (see `docs/ARCHITECTURE.md`). No environment so
  far has exercised live Supabase Auth/PostgREST/Storage. Production needs
  a real project URL + anon key + service-role key supplied via `.env`, and
  a full `supabase start` run (on Docker-capable hardware) or a hosted
  project is strongly recommended before launch to close this gap.
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
