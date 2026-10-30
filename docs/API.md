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

## Milestone 3 — Properties

| Action | File | Behavior |
|---|---|---|
| `createPropertyAction` | `app/dashboard/properties/actions.ts` | Validates with `propertyFormSchema`, inserts with `owner_id` set from the session (never trusted from the form), redirects to the edit page. RLS still enforces `owner_id = auth.uid()` and `has_role('owner')` as the real backstop. |
| `updatePropertyAction(propertyId, …)` | same | Bound with the property id via `.bind(null, id)`; RLS (`properties_update_owner`) is what actually prevents editing someone else's listing. |
| `setListingStatusAction` / `setAvailabilityAction` | same | Simple status transitions (publish/unpublish/archive, available/rented) called from inline server actions on the edit page. |
| `deletePropertyImageAction` / `setCoverImageAction` | same | Image management; storage object removal + `property_images` row deletion happen together. |
| `toggleFavouriteAction` | `app/favourites/actions.ts` | Add/remove the caller's own favourite; returns `{error}` (not a thrown redirect) for an anonymous caller so the client can route to `/login` itself. |
| `reportPropertyAction(propertyId, …)` | `app/properties/actions.ts` | Validates reason/details, inserts with `reporter_id` from the session. |

Search itself isn't a Server Action — `app/search/page.tsx` is a Server
Component that validates `searchParams` with `searchParamsSchema` and calls
`services/properties.ts#searchProperties`, which builds the PostgREST query
(filters map directly to the indexed columns in
`properties_search_idx`/`properties_city_idx`/`properties_fts_idx`).

Later milestones add: subscription checkout + webhook handling, messaging,
verification submission/review, admin moderation.
