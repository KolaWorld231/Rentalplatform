# Concepts Brief — Wave 9: Redesign of /about, /safety, /help, /notifications, /account

**Feature Concept:** CSS/Tailwind-only, presentation-layer redesign of DomiLink's five
remaining plain pages, matching the Claymorphism system already shipped in
Waves 1–8 (`CardClay`, `Button`/`buttonVariants`, `Badge`, `Input`, `Reveal`,
`ProcessSteps`). No Server Action, Supabase query, RLS policy, or business-logic
change on any of the five pages.

**Note on process:** this run had no subagent-spawning tool available in the
executing environment, so the six lenses below (`design_critic`,
`codebase_details`, `zoom_out`, `comprehension`, `implementation_readiness`,
`structural`) were each applied directly against the current codebase
(`/home/user/Rentalplatform`) in BRAINSTORM mode, per their persona
definitions in `/root/.claude/plugins/cache/egm/egm/0.1.0/agents/`, rather than
delegated to independent subagent instances. Findings are reported with the
same rigor the personas prescribe, but recall across independent passes was
not available.

**Current-state evidence reviewed:**
- `app/about/page.tsx`, `app/safety/page.tsx`, `app/help/page.tsx`,
  `app/notifications/page.tsx`, `app/account/page.tsx`
- `components/ui/{Card,Button,Badge,Input}.tsx`
- `app/pricing/page.tsx`, `app/how-it-works/page.tsx` (most recent
  "well-dressed" pages to mirror)
- `docs/DESIGN_SYSTEM.md`, `docs/IMPLEMENTATION_STATUS.md` (wave 1–8 history)

**Confirmed gaps in the concept statement:**
- `/about` and `/safety` are bare `max-w-2xl` text (confirmed — `/safety` is
  partially dressed: it already wraps its checklist in a `Card`; `/about` has
  *zero* `Card`/component usage at all, just raw `<div>`/`<p>`).
- `/help` and `/account` are `Card`-list stacks — confirmed, already using the
  component system, just plain/flat, no hero or visual anchor.
- `/notifications` has two raw `<input type="checkbox" className="h-4 w-4">`
  elements for `in_app_enabled`/`email_enabled` — confirmed, these are the
  only unstyled native form controls left in the app; no `Switch`/`Toggle`
  component currently exists in `components/ui/`.

---

## Per-page concept options

### `/about`
- Lead with a hero-style treatment matching `/how-it-works`'s header pattern
  (display-font title + supporting line) and wrap the body copy in a
  `CardClay` instead of a bare `<div>`, so it reads as one intentional
  surface instead of unstyled text.
- Optional: a 2–3 stat/value strip (e.g. "$0 to list", "$5 / 30 days",
  "$0 per extra owner") reusing `Badge`/`Card` primitives — **only** if the
  numbers come from `lib/config/brand.ts`/`subscriptionPlan`, never
  hardcoded, per the "never fabricate demo data" rule in `CLAUDE.md`.
- Keep the existing copy verbatim; this is a container/visual pass, not a
  content rewrite.

### `/safety`
- Already has one `Card` (checklist) and one inline warning block; promote
  the warning block to use the same clay/badge visual language as other
  pages' warning states instead of a bespoke `rounded-[var(--radius-md)]
  bg-warning-100` one-off, and give the page a header treatment consistent
  with `/about` once that's redone, so the two "informational" pages read as
  siblings.

### `/help`
- Already Card-based; add a lightweight visual anchor (icon + heading
  treatment, consistent spacing with `/account`) rather than a restructure.
  FAQ cards and the contact `Card` are structurally fine — this is a polish
  pass (consistent padding/radius/shadow with the rest of the system), not a
  layout change.

### `/account`
- Already Card-based and the most "done" of the five; mainly needs visual
  parity (shadow/radius tokens, spacing rhythm) with whatever header
  treatment `/about`/`/help` adopt, so navigating between these pages feels
  like one app.

### `/notifications`
- The real component gap: replace the two raw `<input type="checkbox">`
  elements with a new, small `Switch`/`Checkbox` primitive in
  `components/ui/`, styled with `appearance-none` + Tailwind `peer`/
  `peer-checked:` classes and the existing clay-inset shadow token
  (`--shadow-clay-inset`) so it looks native to the system — built as a
  **styled native `<input>`**, not a JS-driven custom widget, so no new
  client-side state or dependency is introduced and existing server-action
  form wiring (`name="in_app_enabled"`, `defaultChecked={...}`) is
  untouched.

---

## Consolidated Findings by Lens

### Design Critic — Dimension: Architecture & Blast Radius
- **Severity: Major** — **Risk:** `/notifications/page.tsx` is currently an
  `async` Server Component that fetches `notifications` and
  `notification_preferences` directly. If the new checkbox/switch styling is
  implemented as a *client* component requiring `useState` for visual
  check-animation, it will force a client/server boundary split (a new
  `"use client"` child component receiving `defaultChecked` as a prop) to
  avoid converting the whole data-fetching page to client-side. **Mitigation
  requirement:** specify in the implementation plan that the switch is a
  CSS-only (`peer-checked:`) styled native `<input>` with zero JS state, so
  the existing server-component data flow is untouched — no new client
  boundary needed.
- **Severity: Nit** — **Risk:** None of the five pages add new queries, so
  there's no new QPS/cost surface. Worth stating explicitly in the plan so a
  reviewer doesn't have to re-derive it.

### Codebase Details — Dimension: Observability & Debuggability
- **Severity: Major** — **Risk:** Prior waves (per `docs/IMPLEMENTATION_STATUS.md`
  wave 8) relied on live/Playwright screenshot verification after CSS-only
  changes, and that pass still hit a false-negative locator issue. These five
  pages are gated by `requireUser()` (`/notifications`, `/account`), so any
  "verify in the live app" step needs an authenticated session, not just an
  anonymous page load — the plan should state how the implementer logs in
  for verification (reuse a test account / the existing e2e login flow)
  rather than discovering this mid-wave.
- **Severity: Nit** — **Operational risk:** None of these pages touch
  telemetry/logging paths, consistent with being presentation-only; no
  mitigation required beyond standard visual-regression spot checks.

### Zoom Out (Skeptical Architect) — Dimension: YAGNI & Reuse
- **Severity: Major** — **Reuse opportunity:** `CardClay`, `Badge`,
  `Button`/`buttonVariants`, `Reveal`, and `ProcessSteps` already exist and
  cover nearly everything these five pages need. The **only** genuinely new
  primitive required is a `Switch`/`Checkbox` component for `/notifications`
  — everything else should be composed from existing components, not new
  ones.
- **Severity: Nit — YAGNI flag:** Do not build a generic `PageHero`/
  `InfoPageLayout` abstraction component just for `/about` and `/safety`
  unless the plan can point to at least a third current or near-term
  consumer — two call sites don't yet justify a shared component (the "rule
  of three"); two instances of the same literal 4–5 line header block is an
  acceptable duplication cost at this stage, see Structural lens below for
  the counter-signal once all five pages are counted together.
- **Severity: Nit:** Confirm the root problem is strictly visual consistency,
  not a copy/content rewrite — all five pages' existing text should carry
  over unchanged (per the concept's own scope statement) so this stays a
  pure presentation pass.

### Comprehension — Dimension: UX & Accessibility Ergonomics
- **Severity: Blocker (if not explicitly required in the plan):** If the new
  `Switch` for `/notifications` is implemented as a `<div>`-based fake
  checkbox (common Claymorphism toggle pattern) instead of a styled native
  `<input type="checkbox">`, it will silently drop keyboard operability and
  screen-reader `role="checkbox"`/checked-state semantics that the current
  raw `<input>` gets for free. The plan must explicitly require "native
  `<input>` + `appearance-none` + `peer-checked:` CSS", not a custom
  widget, to preserve the accessibility baseline `CLAUDE.md` calls
  non-optional.
- **Severity: Major:** The checklist and warning-block icons on `/safety`
  (`CheckCircle2`, `AlertTriangle`) already use `aria-hidden="true"`
  correctly; any new icons added to `/about`/`/help`/`/account` headers must
  follow the same pattern (decorative icon = `aria-hidden`, meaningful icon =
  labelled) — call this out explicitly so it isn't missed page-by-page.
- **Severity: Nit:** No undefined project-specific jargon introduced by this
  concept — "Claymorphism," "Direct Access Pass," etc. are all already
  defined in `docs/DESIGN_SYSTEM.md`/`CLAUDE.md`.

### Implementation Readiness — Dimension: Regression Safety / "Migration" Equivalent
- **Severity: Blocker (process requirement, not a current bug):** Because
  there is no schema/backend change, the equivalent "migration risk" here is
  *accidentally* changing behavior while only meaning to restyle. Two
  concrete traps to name explicitly in the plan:
  1. `/notifications`'s checkboxes must keep `name="in_app_enabled"` /
     `name="email_enabled"` and `defaultChecked={...}` exactly as-is — the
     server action `updateNotificationPreferencesAction` parses `FormData`
     by these names; a rename or wrapper that stops the `name` attribute
     from being submitted (e.g. wrapping in a non-form-aware custom element)
     silently breaks preference saving with no type error.
  2. The inline per-notification "Mark read" `<form action={async () => {...}}>`
     and `markAllNotificationsReadAction` wiring on the same page must not be
     touched by a restyle that also reflows/restructures that list — the
     plan should call out these two interactive elements as "wiring frozen,
     markup/classes only."
- **Severity: Major:** Rollback for this entire wave is a single-commit
  `git revert` (no migration, no data backfill) — state this plainly in the
  plan so reviewers don't look for a rollback strategy that doesn't apply.

### Structural (Layout Validator) — Dimension: Long-Term Maintainability
- **Severity: Major:** This is the **fifth consecutive page-redesign wave**
  touching this exact "lone page gets a header + Card treatment" shape
  (`/about`, `/safety`, `/help`, `/account`, plus `/notifications`'s
  preferences block). Doing all five in one wave, ad hoc and independently,
  is the point at which the "rule of three" the Zoom Out lens invoked above
  flips the other way: five near-identical header patterns authored
  independently in one PR is a bigger drift risk than one small shared
  primitive. **Recommendation:** at minimum, pick *one* literal JSX shape
  (title + optional eyebrow/supporting line) and reuse it verbatim across
  all five pages in this wave, even without extracting a component, so a
  future wave 10 extracting a shared `PageHeader` has one pattern to lift,
  not five variations to reconcile.
- **Severity: Nit:** The new `Switch` component, once added to
  `components/ui/`, should be documented in `docs/DESIGN_SYSTEM.md`'s
  "Component inventory" section (same as every other `components/ui/`
  primitive) — otherwise it's a maintainability debt the moment it ships
  undocumented, same as any other shipped primitive.

---

## Decisions Confirmed (user, this iteration)

Proceeding as scoped, with both constraints below locked in as requirements
for `/egm-draft`, not optional suggestions:

1. `/notifications`'s preference toggles are implemented as styled **native**
   `<input type="checkbox">` elements (CSS-only `peer-checked:` styling, no
   `useState`, no `"use client"` wrapper) — never a div-based fake toggle.
2. All five pages (`/about`, `/safety`, `/help`, `/account`,
   `/notifications`) reuse **one identical literal header JSX shape**
   (title + optional eyebrow/supporting line) copy-pasted across each page —
   not five independently-authored variants, and not a new shared
   `PageHeader` component this wave (rule-of-three not yet met).

## Summary for the Elephant

No blocker-level reason not to proceed — the concept is well-scoped and
matches 8 prior waves' precedent exactly. The two points worth folding into
the implementation plan before coding starts:
1. The `/notifications` switch must be a styled **native** `<input
type="checkbox">` (CSS-only, `peer-checked:`), both to avoid an unnecessary
   `"use client"` boundary on a Server Component page (Design Critic) and to
   preserve keyboard/screen-reader semantics and the server action's
   `FormData` field names (Comprehension, Implementation Readiness).
2. Treat the five pages' header/visual-anchor treatment as one reusable
   pattern applied consistently, even if not formally extracted into a
   component this wave (Structural), while still not over-building a new
   layout abstraction prematurely (Zoom Out).
