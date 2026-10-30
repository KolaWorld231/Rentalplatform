# CLAUDE.md — Permanent instructions for this project

This file is the durable brief for any Claude Code session working on DomiLink.
Read it before making changes. Keep it updated when conventions change.

## Mission

DomiLink is a direct property rental marketplace for Liberia. Renters currently
pay agents ~$30–40 per viewing with no guarantee of a result. DomiLink lets
property owners list for free and connects them directly with renters. Renters
browse for free; a $5 / 30-day "Direct Access Pass" unlocks direct messaging
with as many owners as they like (no per-property fee).

Full requirements live in the original build brief (not checked into the repo)
and are distilled into `docs/PRODUCT_SPECIFICATION.md`.

## Non-negotiable business rules

1. Property owners list for free — always.
2. Renters browse and search for free — always.
3. Renters pay $5 for 30 days of direct messaging access.
4. An active subscriber can contact multiple owners with no extra per-property fee.
5. Owners never pay to receive or reply to messages.
6. Only a **server-verified** payment may activate a subscription.
7. Subscription/authorization checks happen server-side (RLS + trusted RPC/Edge
   Function) — never trust a client-supplied flag.
8. Conversations and verification documents are access-controlled; never exposed
   through public storage or public API responses.
9. All displayed stats, badges, and verification states reflect real database
   records — never fabricate demo data in production paths.
10. The UI is one cohesive, custom Claymorphism-inspired design system — do not
    introduce a second visual language on a new page.

## Architecture

- Next.js (App Router) + TypeScript (strict) + Tailwind CSS v4 (token-based, see
  `app/globals.css` and `docs/DESIGN_SYSTEM.md`).
- Supabase (Postgres + Auth + Storage + Realtime). Local development uses the
  Supabase CLI (`supabase start`, Docker-backed). Production points at a hosted
  Supabase project via `.env` — see `docs/DEPLOYMENT.md`.
- Privileged writes (subscription activation, payment verification, role
  changes) go through Supabase Edge Functions using the service-role key —
  never through client-writable tables. RLS is the hard backstop everywhere
  else.
- Folder layout: `app/`, `components/{ui,layout,properties,messaging,
  subscriptions,forms}/`, `lib/{auth,payments,subscriptions,validation,
  security,supabase,config,utils}/`, `services/`, `types/`,
  `supabase/{migrations,functions}/`, `tests/`, `docs/`.

## Conventions

- TypeScript strict mode; no `any` without a comment explaining why.
- Server-side validation with Zod for every mutation, even when the client also
  validates.
- No comments explaining *what* code does — only non-obvious *why*.
- Small, composable modules; no premature abstraction.
- Every mutable UI state has loading/empty/error/success treatment.
- Accessibility: semantic HTML, visible focus rings (`.focus-ring` utility),
  labelled inputs, reduced-motion support — not optional.
- Money is `numeric`/`decimal` in Postgres, never float, never computed
  client-side as the source of truth.
- Timestamps stored in UTC; formatted for display using the user's locale.

## Commands

```bash
npm run dev          # Next.js dev server
npm run build         # production build (also runs typecheck)
npm run lint           # eslint
npx tsc --noEmit        # typecheck only
npm run test             # vitest unit/integration tests
supabase start            # local Supabase stack (Docker)
supabase db reset          # (re)apply all migrations to local DB
```

## Testing expectations

Every milestone that touches business logic needs tests before it's marked
done in `docs/IMPLEMENTATION_STATUS.md`: auth/role enforcement, listing
ownership, subscription state transitions (incl. duplicate webhook
idempotency), messaging authorization/subscription gating, verification
document privacy, admin authorization. Don't report a test as passing unless
it was actually run.

## Security requirements

See `docs/SECURITY.md` for the full model. Summary: RLS on every table exposed
to the client; no service-role key in client bundles; no self role-escalation;
private Storage buckets + signed URLs for verification documents; webhook
signature verification + idempotent processing for payments; rate limiting on
messaging and auth.

## Status tracking

`docs/IMPLEMENTATION_STATUS.md` must always reflect reality: what's done,
what's partial, what's blocked on credentials (real Supabase project, real
payment provider) that only the project owner can supply. Update it at the end
of every milestone.
