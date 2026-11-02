# Homepage Liveliness: Motion, Real Activity & Interactivity

*   **Author:** Claude (drafted from `docs/designs/homepage-liveliness.md`)
*   **Status:** Proposed
*   **Date:** 2026-11-02

--------------------------------------------------------------------------------

## Overview

DomiLink's homepage hero, "Recently listed" property grid, and "How it
works" section already have some motion — blurred rotated photo tiles in
the hero background, a scroll-reveal fade-in on the property grid — but the
page as a whole still reads as static, closer to a screenshot than a living
product. This design adds seven small, targeted pieces of motion,
real-data-backed liveness signals, and interactivity across those three
sections, built entirely with plain CSS/Tailwind (no new runtime
dependencies, no animation libraries).

## The Problem

A first-time visitor's impression of the homepage doesn't currently
communicate that DomiLink is an active marketplace with real listings and
real owners — even though the underlying data (recent publish timestamps,
owner/county counts, verification status) already proves that it is. The
page under-uses data it already fetches to make that activity visible, and
its existing motion (idle photo tiles, scroll reveal) is either too subtle
to register or not present on the elements most likely to catch attention
(property cards, the stat strip, the process steps). The fix is not to
invent new signals, but to surface what's already true about the data more
visibly, and to add small, restrained motion that extends patterns the app
already uses (hover lift, scroll reveal) rather than introducing a new
visual language.

## Goals

*   Make the hero, "Recently listed" grid, and "How it works" section feel
    visibly alive through a combination of motion, real-data liveness
    signals, and interactivity.
*   Every liveness signal must be backed by real, already-fetched (or
    cheaply derivable from already-fetched) database data — never
    fabricated stats or social proof.
*   Use only plain CSS/Tailwind utilities and `@keyframes` — no new runtime
    dependencies, no animation libraries (explicitly no Framer Motion).
*   Respect `prefers-reduced-motion` everywhere, including the one
    JS-driven effect (the stat-strip count-up) that the app's existing
    global CSS reduced-motion rule doesn't reach on its own.
*   Extend existing components and utilities (`Reveal`, `ProcessSteps`,
    `PropertyCard`, `HeroSearch`, `lib/utils/format.ts`) rather than forking
    or replacing them.

## Non-Goals

*   No fabricated urgency or social-proof signals ("X people viewing this
    now," countdown timers, or anything not derived from a real query).
*   No new shared "animation variants" orchestration system or config
    object — a handful of targeted, named CSS utilities is the ceiling for
    this wave's complexity.
*   No CSS `animation-timeline: scroll()` scroll-driven parallax (poor
    browser support as of this writing).
*   No marquee/ticker of listings.
*   No change to any Server Action, Supabase query shape beyond what
    `app/page.tsx` already fetches, or any RLS policy.
*   No redesign of `PropertyCard`, `HeroSearch`, `ProcessSteps`, or
    `Reveal`'s existing core structure — every change in this wave extends
    an existing pattern rather than replacing it.
*   Cursor-tilt parallax on the hero photo tiles is explicitly deferred
    (not part of this wave) — the brief rated it Medium effort with the
    lowest mission-alignment priority of everything considered, and it adds
    a new client wrapper for a purely decorative effect. If wanted later,
    it would be scoped as its own follow-up.

## Open Questions

None outstanding — the brief's one open question (split into two waves, or
ship all 7 items together) was resolved before drafting began: all 7 ship
in this single wave.

## Critical User Journeys (CUJs)

### CUJ 1: Returning visitor scans the "Recently listed" grid

*   **Given**: at least one property was published within the last 72
    hours.
*   **When**: a visitor loads the homepage.
*   **Then**: that card's existing "New" badge pulses quietly (not a fixed
    static badge), and the card shows a real "Listed X ago" line using its
    actual `published_at` timestamp — both signals are visibly different
    from how other cards render, with no fabricated numbers involved.

### CUJ 2: Visitor searches by county directly from the hero

*   **Given**: the homepage has fetched at least one distinct county with a
    published listing.
*   **When**: the visitor is looking at the hero search bar.
*   **Then**: a row of real county chips (not a fixed list — only counties
    that actually have published listings) is visible; clicking one
    navigates to `/search?county=<county>`, filtering results exactly the
    same way the full search filters sidebar already does.

### CUJ 3: Visitor with `prefers-reduced-motion` enabled

*   **Given**: the visitor's OS/browser has reduced motion enabled.
*   **When**: they load the homepage.
*   **Then**: the hero photo tiles don't drift, the "New" badge doesn't
    pulse, the `ProcessSteps` spine doesn't animate fill-in, and the stat
    strip numbers render at their final value immediately with no visible
    count-up — matching the behavior every other animated element in the
    app already has under this setting.

## Technical Plan (Architecture)

This wave touches five files for CSS/markup-only changes (`app/globals.css`,
`app/page.tsx`, `components/properties/PropertyCard.tsx`,
`components/properties/PropertyCardMedia.tsx`,
`components/marketing/ProcessSteps.tsx`) and one file for a prop extension
(`components/properties/HeroSearch.tsx`), plus one new small client
component (`components/ui/CountUp.tsx`). No Server Action, Supabase query
shape, or RLS policy changes — `app/page.tsx`'s existing queries already
fetch everything every item below needs.

### 1. "Listed X ago" relative-time text per card

`PropertyCard.tsx` already computes `isNew` from `property.published_at`
via `isRecentlyPublished`. Add one line under the existing location line,
reusing the existing `formatRelativeDate(property.published_at)` from
`lib/utils/format.ts` (already used elsewhere — in messaging/subscriptions
— for the same "relative time since an already-happened event" shape). No
new utility function; no new query; `published_at` is already selected by
`app/page.tsx`'s existing property fetch.

```text
Current PropertyCard layout (price → title → location → beds/baths)
gets one new line: location → "Listed {formatRelativeDate(published_at)}"
→ beds/baths. Same text-xs text-charcoal-400 treatment as the
location line, just below it.
```

### 2. Quiet pulse on the existing "New" badge

`PropertyCard.tsx`'s `isNew` `Badge` (`variant="clay"`, the `Sparkles` icon
+ "New" text) gets `animate-pulse` added to its `className`. This is
Tailwind's built-in utility (`opacity: 1 ↔ .5` on a ~2s loop) — no new
`@keyframes`. The app's existing global `prefers-reduced-motion` CSS block
in `app/globals.css` already zeroes `animation-duration` to `0.01ms`
globally, so this is reduced-motion-safe with zero additional code.

### 3. Hover image scale on `PropertyCard`

**Correction to the brief's assumption**: the brief states `PropertyCard
Media`'s wrapper is "already-`overflow-hidden`" — checking the actual
current code (`PropertyCard.tsx`), the aspect-ratio container
(`<div className="relative aspect-[4/3] w-full bg-sage-200">`) does **not**
have `overflow-hidden` on itself today; only the outer card `div` does
(`overflow-hidden rounded-[var(--radius-lg)] ...`). To contain a hover
scale to the *image area* specifically, rather than letting it bleed into
the card's text content region before being clipped at the outer card
boundary, `overflow-hidden` must be added to that inner aspect-ratio `div`
as part of this change — this is a one-class addition, not a structural
change.

With that fix in place, add `group-hover:scale-[1.03]
group-focus-within:scale-[1.03] transition-transform duration-300
motion-reduce:transition-none` to `PropertyCardMedia`'s root `div`
(currently `className="relative h-full w-full"`, which already receives
hover/focus state from the outer card's existing `group` class). This is
additive to `PropertyCardMedia`'s existing hover-photo-cycling behavior
(separate `onMouseEnter`/`onMouseLeave` cycling logic) — the scale is a
pure CSS transform on the wrapper and doesn't interact with the JS-driven
`activeIndex` crossfade.

### 4. Hero photo-tile idle drift

New `@keyframes hero-drift` in `app/globals.css`, added alongside the
existing `@keyframes dropdown-in` (same file region, same short
"why this exists" comment convention already used there):

```text
@keyframes hero-drift {
  0%, 100% { transform: var(--hero-drift-base, none); }
  50% { transform: var(--hero-drift-base, none) translate(4px, -4px) rotate(1deg); }
}
```

Applied via a new utility class (e.g. `.animate-hero-drift`) with a 30-45s
duration, `ease-in-out`, `infinite`, and an explicit
`motion-reduce:animate-none` on the three `<img>` tiles in the hero
background (`app/page.tsx`'s `heroPhotos.map(...)` block). Belt-and-suspenders
with the global reduced-motion rule, matching the pattern `Reveal.tsx`
already double-guards with. Each tile keeps its existing per-tile static
`rotate-*`/position classes (`right-[-4rem] top-[-2rem] ...`, etc.) as the
drift's base transform — the `--hero-drift-base` CSS variable preserves
each tile's distinct static rotation/position so the drift animates
*around* it rather than overwriting it. Pure `transform`, no `blur`/
`box-shadow` animation — GPU-cheap per the brief's bandwidth-constraint
guidance.

### 5. `ProcessSteps` spine fills in synced to each step's reveal

`ProcessSteps.tsx` currently renders one continuous `absolute ... w-px
bg-border` line behind all steps, fully drawn and static, plus wraps each
step in `<Reveal delayMs={i * 100}>`. Change: split the single spine into
`steps.length - 1` segments, one between each pair of consecutive step
markers, each with `transform-origin: top` and `scale-y-0` by default; each
segment transitions to `scale-y-100` using the *same* `i * 100`ms delay
value already computed for that step's own `Reveal` wrapper (passed as an
inline `style={{ transitionDelay: ... }}`, mirroring `Reveal.tsx`'s own
`transitionDelay` pattern), driven by the same `visible` state logic
`Reveal` already uses internally (or, simpler: each segment's visibility is
tied to its *own* small `Reveal`-style IntersectionObserver trigger,
reusing `Reveal`'s existing component rather than duplicating its
IntersectionObserver logic — segment N wrapped in its own `<Reveal
delayMs={i * 100}>` matching step N's marker). This stays inside
`ProcessSteps.tsx`; no change to `Reveal.tsx` itself, no new component.

### 6. Real county chips in `HeroSearch`

`services/properties.ts`/`lib/validation/property.ts` confirm `/search`
already accepts a `county` query param (exact match via
`.eq("county", params.county)`), distinct from the existing `city` param
(`ilike` partial match) that `HeroSearch`'s text input already sets. This
means county chips are additive, not a replacement for the city field —
clicking a chip sets `county` in the URL alongside whatever `city`/
`bedrooms` values are already filled in, consistent with how
`searchParamsSchema` treats both as independently optional.

`app/page.tsx` already runs a `coverageRows` query
(`.select("county, owner_id").eq("listing_status", "published")`) to
compute `countiesCovered` for the stat strip. Reuse that same query's
result: derive `const counties = [...new Set(coverageRows.map(r =>
r.county))].sort()` server-side in `app/page.tsx`, and pass it as a new
prop to `HeroSearch` — `counties: string[]` (required when rendered from
the homepage; an empty array renders no chip row, consistent with the stat
strip's own "hide when zero" pattern).

`HeroSearch.tsx` gets a new optional prop `counties?: string[]` (defaults
to `[]` so the component stays usable with its current zero-prop call
signature elsewhere, if any exists). When non-empty, render a horizontal
row of chip `<button type="button">` elements above the existing input row,
each setting a new `county` controlled-state value (mirroring the existing
`city`/`bedrooms` `useState` pattern) and visually toggling an active state
using the same active-chip treatment already established elsewhere in the
app (`SearchFilters.tsx`'s category chips, per Wave 5) for visual
consistency — not a new chip visual language. Each chip is a real
`<button>`, not a `<div>` with an onClick, so it's natively
keyboard-operable (Tab + Enter/Space) with no extra ARIA wiring needed;
focus state uses the existing `.focus-ring` utility. On submit, `county` is
appended to the `URLSearchParams` alongside `city`/`bedrooms` exactly like
the existing fields.

### 7. Count-up tween on the stat strip

New file `components/ui/CountUp.tsx`: a small `"use client"` component
taking a single prop `value: number` (the already-real, server-fetched
final integer — `publishedCount`, `ownersListing`, or `countiesCovered`,
each passed down from `app/page.tsx` exactly as today, just wrapped in
`<CountUp value={stat.value} />` instead of rendered as a raw number).
Internally:

*   On mount, checks `window.matchMedia("(prefers-reduced-motion:
    reduce)").matches` (same check `Reveal.tsx` already performs) — if
    true, renders `value` immediately with no tween, matching CUJ 3.
*   Otherwise, tweens a local `displayValue` state from `0` to `value` over
    a short fixed duration (~800ms) via `requestAnimationFrame`, using an
    ease-out curve computed in plain JS (no dependency).
*   The rendered text node is wrapped with `aria-hidden="true"` on the
    animating span, with a visually-hidden (`sr-only`) sibling span holding
    the static final `value` for assistive tech — so screen readers read
    the correct final number immediately rather than a stream of changing
    numbers, per the brief's Comprehension-lens finding.

`app/page.tsx`'s stat-strip rendering (`stat.value.toLocaleString()`)
changes to `<CountUp value={stat.value} />`; `CountUp` internally applies
`.toLocaleString()` itself to match today's formatting (e.g. "1,234+" —
the "+" suffix stays in the surrounding JSX, outside `CountUp`, unchanged).

### Deferred (explicitly out of scope per Non-Goals)

Cursor-tilt parallax on hero tiles is not part of this wave's Technical
Plan — see Non-Goals.

## Alternatives Considered

### Alternative A: Fabricated social-proof / urgency signals

*   **Pros**: visually compelling, directly drives the "feel alive" goal
    with minimal engineering effort — a static "12 people viewing this
    property" string or a countdown timer requires no real query at all.
*   **Cons**: not backed by any real data; actively misleads visitors about
    actual demand/urgency.
*   **Reason for Rejection**: this is exactly the kind of agent-era
    pressure tactic DomiLink exists to displace (its entire value
    proposition is removing agent middlemen and their incentive to create
    artificial urgency). It would also violate CLAUDE.md rule #9's spirit
    even where it isn't a literal fabricated database stat.

### Alternative B: Rainbow/gradient shimmer and bounce/overshoot easing

*   **Pros**: common "modern SaaS" visual pattern, cheap to implement with
    Tailwind's built-in gradient and easing utilities.
*   **Cons**: introduces a second visual language — the app's brand palette
    is a single accent (Bonfire Red) on ivory/charcoal with soft "clay"
    shadows, no secondary brights, and no bouncy motion anywhere else in
    the system.
*   **Reason for Rejection**: reads as a generic template effect and
    clashes with the restrained one-accent clay palette CLAUDE.md rule #10
    requires (one cohesive visual language).

### Alternative C: CSS `animation-timeline: scroll()` scroll-driven parallax

*   **Pros**: pure CSS, no JavaScript scroll listener needed, would give
    the hero photo tiles a genuinely dynamic scroll-linked effect.
*   **Cons**: Chrome-only browser support as of this writing; every other
    browser would need an explicit static no-op fallback, adding
    complexity for a purely decorative effect.
*   **Reason for Rejection**: highest risk/lowest payoff of everything
    considered — poor cross-browser support for a cosmetic effect isn't
    worth the fallback complexity, especially given the target audience
    includes lower-end Android browsers.

### Alternative D: Full-bleed marquee ticker of recently-listed text

*   **Pros**: a classic "live activity feed" pattern, would clearly signal
    ongoing activity.
*   **Cons**: reads as a stock SaaS template element unless heavily
    restyled to match the clay materiality (thick rounded chips, not a thin
    ticker strip); any continuously-scrolling text content also needs a
    pause-on-hover/focus affordance for WCAG 2.2.2 compliance.
*   **Reason for Rejection**: the restyling effort to avoid looking
    template-y, combined with the accessibility requirement it would need
    but likely wouldn't get given this wave's CSS/Tailwind-only scope,
    makes it not worth pursuing here.

### Alternative E: A generic "animation variants" config/orchestration layer

*   **Pros**: a single shared system (e.g. a `motionVariants` object with
    named presets) would make it easy to add more animated elements
    consistently in future waves.
*   **Cons**: at this point there are seven independently-motivated,
    already-concretely-scoped effects — no second consumer exists yet to
    justify designing a shared abstraction's shape around.
*   **Reason for Rejection**: CLAUDE.md explicitly forbids premature
    abstraction ("no premature abstraction... three similar lines is better
    than a premature abstraction"). A handful of targeted, named CSS
    utilities plus the existing `Reveal`/`ProcessSteps` prop surface is
    enough for this wave's actual scope.

### Alternative F: Cursor-tilt parallax on hero tiles

*   **Pros**: a genuinely novel, eye-catching interaction not currently
    present anywhere in the app; reinforces the "tilt toward light" feel
    the clay shadow tokens already evoke.
*   **Cons**: Medium effort requiring a new small client wrapper around
    just the hero photo-tile layer, with `mousemove` listeners that need
    throttling/rAF-batching; purely decorative (the tiles are already
    `aria-hidden="true"`), so it has no functional payoff beyond
    atmosphere.
*   **Reason for Rejection**: not rejected outright, but deprioritized out
    of this wave's scope — the brief's Zoom-Out-lens priority ranking rates
    real recency signals and interactive hero search refinement (items 1
    and 6 in the Technical Plan) above micro-motion polish, and this item
    carries real implementation cost (new client boundary, event listener
    management) for a purely atmospheric effect. Captured in Non-Goals as
    an explicit candidate for a future, separately-scoped wave.

## Non-Functional Requirements

*   **Accessibility**: every CSS-only animation (badge pulse, hero drift,
    `PropertyCardMedia` hover scale, `ProcessSteps` spine fill) is covered
    for free by the existing global `prefers-reduced-motion` rule in
    `app/globals.css`. The one exception, `CountUp`'s `requestAnimationFrame`
    tween, needs its own explicit `window.matchMedia` check (mirroring
    `Reveal.tsx`) plus an `sr-only` static-value sibling so assistive tech
    always reads the correct final number, never a changing stream.
    County chips must be real `<button>` elements (native keyboard
    operability), not `<div onClick>`.
*   **Performance**: all animations are `transform`/`opacity` only (GPU-cheap),
    no `blur`/`box-shadow` animation, matching the brief's bandwidth/
    low-end-device guidance. No new queries — the county list and all stat
    values come from data `app/page.tsx` already fetches.
*   **Rollback**: no schema or data migration. Rollback is a single `git
    revert`; no backfill needed in either direction.

## Additional Resources

*   `docs/designs/homepage-liveliness.md` — the brainstorm-stage concepts
    brief this design is drafted from.
*   `docs/DESIGN_SYSTEM.md` — existing component inventory and token
    reference; the "Property-card system (Milestone 3)" section documents
    `PropertyCard`'s current layout priority order that this wave extends.
*   `CLAUDE.md` rules #9 (never fabricate data) and #10 (one cohesive
    visual language) — the constraints behind every rejected alternative.

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `components/ui/CountUp.tsx` (Create)

*   **Type / Scope**: New React client component, `components/ui/`.
*   **Proposed Changes**: Export a `CountUp` component taking `value:
    number`. On mount, checks `prefers-reduced-motion` via
    `window.matchMedia` (same pattern as `Reveal.tsx`); if reduced motion
    is on, renders `value.toLocaleString()` immediately with no tween.
    Otherwise, tweens a local state integer from `0` to `value` via
    `requestAnimationFrame` over ~800ms with an ease-out curve, rendering
    the animating number in an `aria-hidden="true"` span and the static
    final value in an `sr-only` sibling span for assistive tech. No new
    dependency — pure `requestAnimationFrame`/`Date.now()` math.

#### 2. `app/globals.css` (Modify)

*   **Type / Scope**: Global stylesheet.
*   **Proposed Changes**: Add a new `@keyframes hero-drift` block
    immediately after the existing `@keyframes dropdown-in` block, with a
    short comment explaining its purpose (matching the existing
    documentation convention for `dropdown-in`), plus a
    `.animate-hero-drift` utility class (duration ~30-45s, `ease-in-out`,
    `infinite`) applying it, with transform composed against a
    `--hero-drift-base` CSS custom property so each hero tile's existing
    static rotation/position is preserved as the animation's base state.

#### 3. `app/page.tsx` (Modify)

*   **Type / Scope**: Next.js Server Component page (homepage).
*   **Proposed Changes**: (a) Derive `const counties =
    [...new Set((coverageRows ?? []).map((r) => r.county))].sort()` from
    the already-fetched `coverageRows` query result, and pass it as a new
    `counties` prop to `<HeroSearch />`. (b) Apply `animate-hero-drift
    motion-reduce:animate-none` plus a per-tile `--hero-drift-base` inline
    style (set to each tile's existing static `rotate`/position, currently
    expressed via Tailwind classes — kept as Tailwind classes for the base
    layout, with the CSS variable added purely for the drift keyframe's
    reference point) to the three `<img>` elements in the
    `heroPhotos.map(...)` block. (c) Replace each stat strip's raw
    `{stat.value.toLocaleString()}+` rendering with
    `<CountUp value={stat.value} />+`.

#### 4. `components/properties/PropertyCard.tsx` (Modify)

*   **Type / Scope**: React server-renderable component (no `"use client"`
    directive currently; stays that way).
*   **Proposed Changes**: (a) Add `overflow-hidden` to the aspect-ratio
    image container `<div className="relative aspect-[4/3] w-full
    bg-sage-200">` (currently missing it — see Technical Plan item 3's
    correction). (b) Add `animate-pulse` to the existing `isNew` `Badge`'s
    `className`. (c) Add one new `<p>` line, same `text-xs text-charcoal-400`
    treatment as the existing location line, rendering `Listed
    {formatRelativeDate(property.published_at)}` — only when
    `property.published_at` is non-null (it's typed as nullable per the
    existing `isRecentlyPublished(property.published_at, ...)` call's
    null-safe signature).

#### 5. `components/properties/PropertyCardMedia.tsx` (Modify)

*   **Type / Scope**: React client component (`"use client"`).
*   **Proposed Changes**: Add `group-hover:scale-[1.03]
    group-focus-within:scale-[1.03] transition-transform duration-300
    motion-reduce:transition-none` to the root `<div className="relative
    h-full w-full" ...>`. No change to the existing hover-cycling
    `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur` logic or the
    `activeIndex` crossfade — purely additive CSS classes on the same
    element.

#### 6. `components/marketing/ProcessSteps.tsx` (Modify)

*   **Type / Scope**: React client component (`"use client"`, already
    imports `Reveal`).
*   **Proposed Changes**: Replace the single continuous spine `<div
    aria-hidden="true" className="absolute ... w-px bg-border lg:block" />`
    with `steps.length - 1` individual segment `<div>`s, one per gap
    between consecutive step markers, each wrapped in its own `<Reveal
    delayMs={i * 100}>` (reusing `Reveal` rather than forking it, per the
    brief's Structural-lens guidance) and styled with `scale-y-0`
    transitioning to `scale-y-100` with `transform-origin: top` as that
    `Reveal` instance becomes visible — synced to the same `i * 100`ms
    delay already used for step `i`'s own content reveal.

#### 7. `components/properties/HeroSearch.tsx` (Modify)

*   **Type / Scope**: React client component (`"use client"`).
*   **Proposed Changes**: Add a new optional prop `counties?: string[]`
    (default `[]`). Add a new `county` controlled-state value (`useState`,
    mirroring the existing `city`/`bedrooms` pattern). When `counties` is
    non-empty, render a horizontal row of `<button type="button">` chips
    above the existing input row — one per county — using the same
    active/inactive chip visual treatment already established in
    `SearchFilters.tsx`'s category chips (Wave 5), toggling the `county`
    state on click (click again to deselect). On submit, append `county`
    to the existing `URLSearchParams` construction alongside `city` and
    `bedrooms`, each independently optional exactly as `searchParamsSchema`
    in `lib/validation/property.ts` already defines them.

#### 8. `docs/DESIGN_SYSTEM.md` (Modify)

*   **Type / Scope**: Documentation.
*   **Proposed Changes**: Add a `CountUp` bullet to the "Component
    inventory (`components/ui/`)" section, following the existing bullet
    format (e.g. "`CountUp` — tweens a numeral from 0 to its final real
    value on mount, reduced-motion-safe, used on homepage stat strips.").
    No change to the "Property-card system (Milestone 3)" section's prose
    — the new relative-time line and pulse badge are additive to the
    documented layout, not a reordering of its documented priority.

#### 9. `docs/IMPLEMENTATION_STATUS.md` (Modify)

*   **Type / Scope**: Documentation.
*   **Proposed Changes**: Append a new wave entry following the same
    `## Conversion-focused redesign, wave N (post-Milestone-8)` heading
    convention as every prior wave, once the implementation and its live
    verification are complete — not before.

### Testing Note

No new vitest unit test is planned: every change in this wave is either a
pure CSS/markup addition, a reuse of an already-tested utility
(`formatRelativeDate`, `isRecentlyPublished`), or a trivial one-line
transformation of already-fetched data (the county-list `Set` dedup) not
worth a dedicated test on its own. `CountUp`'s reduced-motion branch is
covered by the live/manual accessibility verification below, consistent
with how `Reveal.tsx`'s equivalent branch has no unit test today either.

### Verification Plan

*   **Compilation/Build**: `npx tsc --noEmit`, `npm run build`.
*   **Static Analysis & Linting**: `npm run lint`.
*   **Unit Tests**: `npm run test` (existing suite must stay green — no
    new tests added per the Testing Note above, but regressions in
    `formatRelativeDate`/`isRecentlyPublished`'s existing callers would
    show up in `format.test.ts`).
*   **Accessibility spot checks**: keyboard-only pass over the new county
    chips (Tab + Enter/Space select/deselect, visible focus ring); DevTools
    `prefers-reduced-motion: reduce` emulation confirming hero drift, badge
    pulse, `PropertyCardMedia` hover scale, `ProcessSteps` spine fill, and
    `CountUp`'s tween all stop/skip per CUJ 3, while `CountUp`'s
    accessible text still reads the correct final value.
*   **E2E/Integration (live, against the real Supabase project)**: seed at
    least one property published within 72 hours and confirm its "New"
    badge pulses and its relative-time line renders correctly; seed
    properties across at least two distinct counties and confirm the
    corresponding chips render in `HeroSearch` and that clicking one
    navigates to `/search?county=<value>` with correctly filtered results;
    visually confirm (desktop + mobile viewport) the hero drift, card
    hover-scale, and `ProcessSteps` spine fill render without layout shift
    or visual regression to existing content. Any seeded test data fully
    deleted afterward, same pattern as prior waves.
