# Wave 9: Page Polish — /about, /safety, /help, /notifications, /account

*   **Author:** Claude (drafted from `docs/designs/wave-9-page-polish.md`)
*   **Status:** Proposed
*   **Date:** 2026-11-02

--------------------------------------------------------------------------------

## Overview

DomiLink has reskinned its highest-traffic surfaces across eight prior waves —
homepage, property cards, pricing, property detail, messaging, dashboards,
auth, search, admin — into one consistent Claymorphism visual language. Five
pages were left out of that work: `/about`, `/safety`, `/help`,
`/notifications`, and `/account`. They still render, and nothing on them is
broken, but moving from any of the redesigned pages onto one of these five
has no shared visual treatment: plain text blocks next to one `Card` here,
a flat FAQ stack there, two unstyled native checkboxes on `/notifications`,
no shared header anywhere. This design closes that gap on the five
remaining pages without changing what any of them do.

## The Problem

A user who has just subscribed, verified their identity, or sent their first
message is routed through `/account` and `/notifications` — pages that lack
the shared header and Card treatment every other page already has. `/about`
and `/safety` are the pages most likely to be shared or linked externally
(trust-building copy, safety guidance) and currently read as plain unstyled
text with zero visual anchoring. The fix is a presentation-only pass: wrap
existing content in the same `Card` primitives and header pattern already
proven across the other eight waves, and replace the two raw, unstyled
`<input type="checkbox">` elements on `/notifications` with a small,
properly styled native checkbox component — the one new UI primitive this
wave needs.

## Goals

*   Bring `/about`, `/safety`, `/help`, `/notifications`, and `/account`
    visually in line with the Claymorphism system already shipped in waves
    1–8, using only existing design tokens and the `CardClay` component —
    no other new component usage is introduced on these pages beyond what
    each already uses.
*   Apply one identical, literal header shape (title + optional
    eyebrow/supporting line) across all five pages, copy-pasted rather than
    extracted into a new component this wave.
*   Add a new `Switch`/`Checkbox` primitive in `components/ui/` for the two
    notification-preference toggles — implemented as a styled **native**
    `<input type="checkbox">` (CSS-only `peer-checked:` styling), preserving
    existing keyboard and screen-reader behavior.
*   Preserve all existing copy, data, Server Actions, and RLS policies on
    these five pages exactly as they are today — this is a container/visual
    change only.

## Non-Goals

*   No new Server Action, Supabase query, or RLS policy change on any of the
    five pages.
*   No content/copy rewrite — all existing text carries over verbatim.
*   No new shared `PageHeader` component this wave — the rule-of-three
    threshold for extraction isn't met yet; the same literal JSX block is
    duplicated across the five pages instead.
*   No change to `markAllNotificationsReadAction`,
    `markNotificationReadAction`, `updateNotificationPreferencesAction`, or
    any other existing interactive wiring — markup and classes only.
*   No new runtime dependencies (no animation library, no custom
    toggle/switch package) — the new `Switch` component is plain
    CSS/Tailwind on a native `<input>`.

## Open Questions

None outstanding. Two questions raised during drafting have been resolved:

*   **`/about` stat strip**: dropped. `lib/config/brand.ts`/`subscriptionPlan`
    only backs one real number (`$5 / 30 days`); a 3-item strip would mostly
    restate existing `/about` copy, repeating the redundant-restatement
    problem Wave 4 removed from `/pricing`. `/about` gets the header +
    `CardClay` wrap only, no value row.
*   **`/safety`'s warning block**: no change needed. The brief characterized
    it as a bespoke one-off, but `rounded-[var(--radius-md)] bg-warning-100
    p-3 text-xs text-warning-500` + `AlertTriangle` is already the
    established warning-block shape, used identically in
    `components/layout/LegalPageShell.tsx` and `app/checkout/mock/page.tsx`.
    `/safety` already matches it.

## Critical User Journeys (CUJs)

### CUJ 1: Signed-in renter checks notification preferences

*   **Given**: a renter is signed in and has at least one unread
    notification.
*   **When**: they visit `/notifications`, toggle "Email notifications" off,
    and submit the preferences form.
*   **Then**: the new styled `Switch` reflects checked/unchecked state via
    CSS only, is operable by keyboard (Tab + Space) and announced correctly
    by a screen reader as a checkbox, and `updateNotificationPreferencesAction`
    still receives `email_enabled` in `FormData` and persists the change —
    identical behavior to today, different appearance only.

### CUJ 2: Prospective renter reads `/about` and `/safety` before signing up

*   **Given**: an anonymous visitor lands on `/about` from an external link.
*   **When**: they read the page and click through to `/safety`.
*   **Then**: both pages now share the same header shape and `CardClay`
    surface treatment used across the rest of the app, instead of lacking
    the Card/header treatment `/pricing` and `/how-it-works` already have.

## Technical Plan (Architecture)

This is a container/markup change only — no new data flow. Every page
keeps its existing Server Component data-fetching (or lack thereof) and
every Server Action keeps its existing signature. The only new piece of
state-bearing UI is the `Switch` component, and it introduces zero
JavaScript state by design (CSS `:checked`/`peer-checked:` only).

### 1. Shared header shape (duplicated literal JSX, no new component)

Per the brief's locked decision, the same JSX block is copy-pasted into
`/about`, `/safety`, `/help`, `/account`, and `/notifications` — not
extracted into a `PageHeader` component this wave:

```tsx
<div className="mb-6">
  <p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">
    {eyebrow /* optional, e.g. "Account" */}
  </p>
  <h1 className="font-display text-2xl font-semibold text-charcoal-700">
    {title}
  </h1>
  {supportingLine && (
    <p className="mt-1 text-sm text-charcoal-500">{supportingLine}</p>
  )}
</div>
```

This matches the existing `font-display text-2xl font-semibold
text-charcoal-700` heading treatment already used on all five pages today
(confirmed identical across `app/about/page.tsx`, `app/safety/page.tsx`,
`app/help/page.tsx`, `app/notifications/page.tsx`, `app/account/page.tsx`)
— the change is adding the optional eyebrow/supporting-line slot
consistently, not changing the heading style itself.

### 2. New `Switch` component (`components/ui/Switch.tsx`)

A styled native `<input type="checkbox">`, not a custom widget:

```tsx
<label className="inline-flex items-center gap-3">
  <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
    <input
      type="checkbox"
      className="peer sr-only"
      {...inputProps}  // name, defaultChecked, etc. passed through untouched
    />
    <span
      aria-hidden="true"
      className="absolute inset-0 rounded-full bg-sage-200 shadow-[var(--shadow-clay-inset)]
                 transition-colors peer-checked:bg-brand-600
                 peer-focus-visible:outline peer-focus-visible:outline-2
                 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600"
    />
    <span
      aria-hidden="true"
      className="absolute left-0.5 h-5 w-5 rounded-full bg-ivory-50 shadow-[var(--shadow-subtle)]
                 transition-transform peer-checked:translate-x-5"
    />
  </span>
  {label && <span className="text-sm text-charcoal-700">{label}</span>}
</label>
```

Notes:
*   `sr-only` keeps the real `<input>` in the accessibility tree and hit-area
    (clicking the label toggles it) while visually hiding the native
    checkbox box; the two `aria-hidden` spans are the visible track/thumb,
    driven purely by the sibling `peer-checked:` selector.
*   No `"use client"`, no `useState`. `/notifications/page.tsx` stays an
    `async` Server Component exactly as today.
*   `name`, `defaultChecked`, `id`, and any other native `<input>` props
    pass straight through via `...inputProps` (a plain prop spread, typed as
    `InputHTMLAttributes<HTMLInputElement>` minus `type`/`className`) — this
    is the mechanism that keeps `name="in_app_enabled"` /
    `name="email_enabled"` working with `updateNotificationPreferencesAction`
    unchanged.
*   Focus ring reuses the existing `--color-forest-600`/`brand-600` outline
    treatment (`.focus-ring` utility elsewhere uses `outline: 2px solid
    var(--color-forest-600)`), applied here via `peer-focus-visible:` instead
    of `.focus-ring` directly, since the visible focus target is the
    `aria-hidden` track, not the (visually hidden) input itself.

### 3. Per-page changes

```text
/about            plain <div>/<p>  -->  shared header + single CardClay
                                          wrapping the existing 4 paragraphs,
                                          copy unchanged, no stat strip.

/safety           1 Card (checklist) +  shared header added above the
                  1 bespoke warning      existing Card + warning block.
                  block                  Warning block markup unchanged
                                          (already matches LegalPageShell's
                                          pattern — see Open Questions).

/help             Card-per-FAQ list +    shared header added above the
                  1 contact Card         existing Cards. FAQ/contact Card
                                          markup and SupportForm untouched.

/account          2 Cards (profile,     shared header added above the
                  subscription) +        existing Cards. ProfileForm,
                  logout form            subscription history, and logout
                                          form untouched.

/notifications    raw <input            shared header added above the
                  type="checkbox"        existing notification list.
                  className="h-4 w-4">  Both checkboxes in the Preferences
                  x2 (confirmed in       Card replaced with <Switch>,
                  app/notifications/     same name/defaultChecked props.
                  page.tsx)              Notification list items, "Mark
                                          read"/"Mark all read" forms
                                          untouched.
```

No page's data-fetching query changes. No Server Action signature changes.
`app/notifications/actions.ts`'s `updateNotificationPreferencesAction` is
not modified — it already reads `FormData` by field name, which `<Switch>`
preserves.

### 4. Documentation

`docs/DESIGN_SYSTEM.md`'s component inventory gets a new entry for
`Switch`, consistent with every other `components/ui/` primitive already
listed there.

## Alternatives Considered

### Alternative A: Div-based custom toggle for `/notifications`

*   **Pros**: common Claymorphism toggle look (fully custom track/thumb with
    no native default-styling inconsistencies to override), easier to add a
    check/cross icon inside the thumb later if wanted.
*   **Cons**: requires either a hidden native input plus manual
    `role="checkbox"`/`aria-checked`/keyboard-handler wiring reimplemented
    by hand, or a `useState`-driven client component — either way it
    recreates behavior the browser already gives a native `<input>` for
    free, and risks silently dropping keyboard operability or correct
    screen-reader semantics if the reimplementation is incomplete.
*   **Reason for Rejection**: this risks dropping keyboard operability or
    screen-reader semantics — DomiLink's accessibility baseline (semantic
    HTML, keyboard operability) is treated as non-optional, and a
    styled native `<input type="checkbox">` with `peer-checked:` CSS gets
    the same clay visual result with zero accessibility reimplementation
    risk and zero new client-side state.

### Alternative B: Extract a shared `PageHeader` component now

*   **Pros**: a single source of truth for the title/eyebrow/supporting-line
    shape, so the five pages' headers can't visually drift from each other
    over time, and any future page adopting the pattern gets it for free.
*   **Cons**: at this point there would be exactly five call sites, all
    added in the same wave, all using the simplest possible version of the
    shape (title + optional eyebrow + optional supporting line) — no real
    variation has been observed yet to design the component's prop surface
    around. Building the abstraction now means guessing at that surface
    before a second, independently-motivated use case exists.
*   **Reason for Rejection**: the rule of three — a shared component is
    justified once there are three *independently motivated* call sites,
    not three copies added in the same change. Five
    copies added in one wave don't meet that bar any more than two would;
    duplicating one small, stable literal JSX block across five pages costs
    less than committing to an abstraction's shape prematurely. The brief's
    locked decision explicitly defers this to a future wave once a
    genuinely new page needs the same header outside this batch.

## Non-Functional Requirements

*   **Accessibility**: the `Switch` component must preserve the keyboard
    operability and screen-reader checkbox semantics of the native
    `<input type="checkbox">` it wraps — this is the explicit reason
    Alternative A (a div-based toggle) was rejected. Verification must
    include a keyboard-only pass (Tab to focus, Space to toggle) and a
    screen-reader spot check, not just a visual screenshot. The
    `peer-focus-visible:` focus treatment is a deliberate, scoped exception
    to the site-wide `.focus-ring` utility (the visible focus target is an
    `aria-hidden` track, not the input itself); verification must include a
    side-by-side visual check that `Switch`'s focus ring reads consistently
    with `.focus-ring`'s outline color/offset elsewhere on the page, to
    catch any divergence before merge.
*   **Rollback**: this wave has no schema or data migration. Rollback is a
    single `git revert` of the wave's commit(s); no backfill or data cleanup
    is needed either direction.
*   **Performance**: no new queries, no new client-side JavaScript bundle
    weight beyond the few lines of CSS/markup `Switch` adds (no new runtime
    dependency) — not a concern for this wave.

## Additional Resources

*   `docs/designs/wave-9-page-polish.md` — the brainstorm-stage concepts
    brief this design is drafted from.
*   `docs/DESIGN_SYSTEM.md` — existing component inventory and token
    reference this wave builds on without adding new tokens.
*   `CLAUDE.md` rules #9 (never fabricate data) and #10 (one cohesive visual
    language) — the constraints that ruled out the `/about` stat strip and
    any one-off visual treatment, respectively.

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `components/ui/Switch.tsx` (Create)

*   **Type / Scope**: New React component, `components/ui/`.
*   **Proposed Changes**: Export a `Switch` component as described in the
    Technical Plan: a labelled wrapper around a visually-hidden
    (`sr-only peer`) native `<input type="checkbox">`, plus two
    `aria-hidden` `<span>`s (track, thumb) styled via `peer-checked:` and
    `peer-focus-visible:` Tailwind classes using existing tokens only
    (`--shadow-clay-inset`, `--shadow-subtle`, `bg-sage-200`,
    `bg-brand-600`, `bg-ivory-50`). Props: all native
    `InputHTMLAttributes<HTMLInputElement>` except `type`/`className`
    (so `name`, `defaultChecked`, `id`, `required`, `disabled`, etc. all
    pass through), plus an optional `label?: ReactNode` rendered as the
    visible text next to the control, and an optional `wrapperClassName`
    for layout spacing in each call site. No internal state, no
    `"use client"` directive — it is a plain function component usable
    from a Server Component tree.

#### 2. `app/notifications/page.tsx` (Modify)

*   **Type / Scope**: Next.js Server Component page.
*   **Proposed Changes**: Add the shared header block (title "Notifications",
    no eyebrow needed since the page title is already self-explanatory)
    above the existing unread-count/"Mark all read" row. Replace both
    `<input type="checkbox" name="in_app_enabled" defaultChecked={...}
    className="h-4 w-4" />` and the `email_enabled` equivalent with
    `<Switch name="in_app_enabled" defaultChecked={prefs?.in_app_enabled ??
    true} label="In-app notifications" />` and the `email_enabled`
    equivalent, preserving the existing label copy (including the
    email-provider caveat text) exactly. No change to the data fetch, the
    notification list rendering, `markAllNotificationsReadAction`, or the
    inline per-notification "Mark read" form.

#### 3. `app/notifications/actions.ts` (No change — verification only)

*   **Type / Scope**: Next.js Server Action.
*   **Proposed Changes**: None. Listed here to make explicit that
    `updateNotificationPreferencesAction`'s `FormData.get("in_app_enabled")`
    / `FormData.get("email_enabled")` field-name contract is a hard
    constraint `Switch`'s prop pass-through must satisfy, not a file this
    plan touches.

#### 4. `app/about/page.tsx` (Modify)

*   **Type / Scope**: Next.js Server Component page (currently has no data
    fetch).
*   **Proposed Changes**: Add the shared header block (eyebrow "About",
    title `About {brand.name}`, no supporting line) replacing the current
    bare `<h1>`. Wrap the existing four `<p>` paragraphs (copy unchanged,
    including the placeholder-legal-name disclaimer) in a single
    `<CardClay className="p-6">` instead of a bare `<div>`. No stat strip
    (see Open Questions resolution above).

#### 5. `app/safety/page.tsx` (Modify)

*   **Type / Scope**: Next.js Server Component page (currently has no data
    fetch).
*   **Proposed Changes**: Add the shared header block (eyebrow "Safety",
    title "Safety guidance") above the existing supporting paragraph,
    replacing the current bare `<h1>`/`<p>` pair with the shared shape. The
    existing checklist `<Card>` and the warning block below it are left
    exactly as-is (already matches the established warning-block pattern —
    see Open Questions resolution).

#### 6. `app/help/page.tsx` (Modify)

*   **Type / Scope**: Next.js Server Component page (currently has no data
    fetch).
*   **Proposed Changes**: Add the shared header block (eyebrow "Help",
    title "Help & Support") replacing the current bare `<h1>`. FAQ `Card`
    list, contact `Card`, and `SupportForm` are untouched.

#### 7. `app/account/page.tsx` (Modify)

*   **Type / Scope**: Next.js Server Component page (fetches `profile` and
    subscription `history`).
*   **Proposed Changes**: Add the shared header block (eyebrow "Account",
    title "Account settings") replacing the current `<h1>` + email `<p>`
    pair — the user's email line moves to the supporting-line slot of the
    shared header instead of its own paragraph below. `ProfileForm`,
    subscription-status `Card`, payment-history list, and the logout form
    are untouched.

#### 8. `docs/DESIGN_SYSTEM.md` (Modify)

*   **Type / Scope**: Documentation.
*   **Proposed Changes**: Add a `Switch` bullet to the "Component inventory
    (`components/ui/`)" section (line ~73), following the existing bullet
    format (e.g. "`Switch` — styled native checkbox toggle, CSS-only
    `peer-checked:` styling, used for notification preferences.").

#### 9. `docs/IMPLEMENTATION_STATUS.md` (Modify)

*   **Type / Scope**: Documentation.
*   **Proposed Changes**: Append a Wave 9 entry following the same format
    as waves 1–8's entries: what changed (five pages + one new component)
    and what was verified (see Verification Plan below), once the
    implementation and its live verification are actually complete — not
    before.

### Verification Plan

*   **Compilation/Build**: `npx tsc --noEmit`, `npm run build`.
*   **Static Analysis & Linting**: `npm run lint`.
*   **Unit Tests**: `npm run test` (existing suite; no new unit tests are
    expected for a presentation-only change, but the full suite must stay
    green — in particular, nothing in the auth/messaging/subscription test
    files should be affected by this wave's page-markup changes).
*   **Accessibility spot checks**: keyboard-only pass on `/notifications`
    (Tab to the first `Switch`, Space to toggle, confirm visual state
    changes and the form still submits the toggled value); a screen-reader
    pass confirming both switches are announced as checkboxes with correct
    checked state.
*   **E2E/Integration (live, against the real Supabase project)**: sign in
    as a seeded test account, confirm `/notifications` preference toggles
    still save correctly end-to-end (submit, reload, confirm persisted
    state) and the "Mark read"/"Mark all read" actions still work
    unmodified; visually confirm (desktop + mobile viewport) that `/about`,
    `/safety`, `/help`, and `/account` render the shared header and
    `CardClay`/existing-`Card` treatment without visual regression to
    existing content. Any seeded test data fully deleted afterward, same
    pattern as prior waves.

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with EGM*
