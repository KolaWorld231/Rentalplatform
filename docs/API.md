# API / Server Actions

DomiLink prefers Next.js Server Actions over hand-rolled REST routes for
mutations, since they get CSRF protection and type-safety for free. This
document tracks what exists; extended per milestone.

## Conventions

- Every action validates input with a Zod schema from `lib/validation/`
  before touching the database, even though the client form also validates.
- Every action's `ActionState` return shape is `{ error?: string;
  fieldErrors?: Record<string, string> }` — field-level errors map to form
  inputs by name; `error` is a general failure message.
- Actions that need a privileged write import
  `lib/supabase/service-role.ts` explicitly and narrowly — see
  `docs/SECURITY.md`.

## Milestone 2 — Auth (`lib/auth/actions.ts`)

| Action | Validates | Behavior |
|---|---|---|
| `registerAction` | `registerSchema` | Signs up via Supabase Auth; the `handle_new_user` DB trigger grants the default `renter` role; if `intent === "owner"`, the action additionally grants `owner` via `service_role` (never a client-writable path). Redirects to `/onboarding/welcome`. |
| `loginAction` | `loginSchema` | Signs in; redirects to `next` query param if present and same-origin-relative, else `/`. |
| `logoutAction` | — | Signs out, redirects to `/`. |
| `forgotPasswordAction` | `forgotPasswordSchema` | Always returns the same response regardless of whether the email exists (no account enumeration). |
| `resetPasswordAction` | `resetPasswordSchema` | Updates the authenticated user's password (requires the Supabase recovery session from the emailed link). |

## Milestone 2 — Profile (`app/account/actions.ts`)

| Action | Validates | Behavior |
|---|---|---|
| `updateProfileAction` | `updateProfileSchema` | Updates `display_name`/`phone` on the caller's own `profiles` row. Authorization is enforced by RLS (`profiles_update_self`), not just by filtering on `user.id` in the query. |

Later milestones add: property CRUD, search, favourites, subscription
checkout + webhook handling, messaging, verification submission/review,
admin moderation.
