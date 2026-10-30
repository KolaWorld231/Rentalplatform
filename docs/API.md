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

## Milestone 4 — Subscriptions & payments

| Endpoint / Action | File | Behavior |
|---|---|---|
| `startCheckoutAction` | `app/checkout/actions.ts` | Server Action; requires auth, calls `startCheckout` (creates `pending_payment` subscription + `initiated` transaction via `service_role`, asks the configured provider for a checkout URL), redirects there. |
| `simulatePaymentAction` | `app/checkout/mock/actions.ts` | Dev-only; posts to the webhook endpoint with the shared dev secret to simulate a provider callback. Inert/unreachable in production (the mock provider can't be constructed there). |
| `POST /api/payments/webhook` | `app/api/payments/webhook/route.ts` | The only path that activates a subscription. Verifies the event via the configured provider, enforces idempotency via a DB unique constraint, rejects amount/currency mismatches, and calls the `confirm_payment_and_activate_subscription` Postgres function through `service_role`. See `docs/PAYMENTS.md`. |

## Milestone 5 — Messaging

| Action | File | Behavior |
|---|---|---|
| `startConversationAction` | `app/messages/actions.ts` | Finds-or-creates a conversation and sends the first message (`services/messaging.ts#startOrContinueConversation`). The subscription gate itself is RLS, not application code — this action's job is translating a `42501` (RLS denial) into `{ gateReason: "subscription_required" }` so the UI can show the `SubscriptionGateDialog` instead of a raw error. |
| `sendMessageAction(conversationId, …)` | same | Reply in an existing conversation (bound via `.bind(null, conversationId)`). Rate-limited: rejects if the sender has sent 10+ messages in the last 60 seconds (`services/messaging.ts#checkRateLimit`) — application-level for now; see `docs/SECURITY.md` for stronger-limit plans. |
| `markConversationReadAction` | same | Updates the caller's own `renter_last_read_at`/`owner_last_read_at`. |
| `reportMessageAction(messageId, conversationId, …)` | same | Files a `message_reports` row; RLS requires the reporter to be a participant. |

## Milestone 6 — Verification

| Action | File | Behavior |
|---|---|---|
| `submitIdentityVerificationAction` | `app/dashboard/verification/actions.ts` | Creates an `identity_verification_requests` row if none is currently pending (`submitted`/`under_review`/`needs_more_info`). |
| `submitPropertyVerificationAction(propertyId)` | same | Same pattern for a specific property; RLS independently requires the applicant to actually own/manage it. |
| `getSignedDocumentUrlAction(documentId)` | same | The only way to view a private verification document — see `docs/SECURITY.md` for the authorization model. |
| `confirmAvailabilityAction(propertyId)` | same | Bumps `last_availability_confirmed_at`; used by the owner dashboard's "Reconfirm now" prompt on listings stale 14+ days. |

## Milestone 7 — Admin, moderation, notifications

All of `app/admin/actions.ts` follows the same shape: re-check role →
write via `service_role` → `recordAdminAction` (audit log) →
`notifyUser` where relevant. See `docs/SECURITY.md`.

| Action | Role required | Behavior |
|---|---|---|
| `reviewIdentityVerificationAction(id, decision, notes)` | admin or moderator | Sets status, notifies the applicant. |
| `reviewPropertyVerificationAction(id, decision, notes)` | admin or moderator | Same, for a property's verification request. |
| `moderatePropertyAction(id, newStatus, reason)` | admin or moderator | Approve/reject/suspend a listing; notifies the owner. |
| `resolvePropertyReportAction(id, status, notes)` / `resolveMessageReportAction(id, status)` | admin or moderator | Resolves a filed report. |
| `suspendUserAction(userId, reason)` / `restoreUserAction(userId)` | **admin only** | Sets `profiles.account_status`; notifies the user. |

| Page | File | Notes |
|---|---|---|
| `/admin` | `app/admin/page.tsx` | Live aggregate counts; confirmed-payment revenue total is admin-only, hidden from moderators. |
| `/admin/listings`, `/admin/verifications`, `/admin/reports`, `/admin/users` | `app/admin/*` | Moderation queues reading via `service_role` (RLS would otherwise require per-request checks that don't fit a queue view). |
| `/notifications` | `app/notifications/page.tsx` + `actions.ts` | In-app notification center + preferences; `markNotificationReadAction`, `markAllNotificationsReadAction`, `updateNotificationPreferencesAction`. |

## Milestone 8 — Support

| Action | File | Behavior |
|---|---|---|
| `submitSupportTicketAction` | `app/help/actions.ts` | Creates a `support_tickets` row for the logged-in caller. No admin ticket-management UI exists yet — see `docs/IMPLEMENTATION_STATUS.md`. |
