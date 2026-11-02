# Make the DomiLink Homepage Feel Alive

* **Author:** Claude (brainstormed via EGM)
* **Date:** 2026-11-02

## Overview

The DomiLink homepage (hero section, "Recently listed" property grid, "How
it works" section) currently reads as static as one impression, even though
it already has some motion (blurred rotated photo tiles in the hero, a
scroll-reveal fade-in on the grid via `Reveal`). This concept adds a mix of
motion, real-data liveness signals, and interactivity — using only plain
CSS/Tailwind, no new runtime dependencies, explicitly no animation libraries
like Framer Motion — to make the page feel genuinely active rather than a
static screenshot.

## Process note on this run

The executing environment had no subagent-spawning tool available to the
synthesizer, so the six lenses below (`egm-design`, `egm-codebase-details`,
`egm-zoom-out`, `egm-comprehension`, `egm-implementation-readiness`,
`egm-structural`) were applied directly against the current codebase rather
than delegated to independent subagent instances. Findings are reported
with the same rigor the personas prescribe, but recall across independent
passes was not available.

## Analysis

**Grounding — what already exists:** `app/page.tsx` is a server component
that already fetches `recentProperties` (with `published_at`), coverage
rows (`county`, `owner_id`), `publishedCount`, and per-property verification
flags. Stats are already hidden when 0 (CLAUDE.md rule #9 respected).
`Reveal.tsx` (IntersectionObserver fade+lift, reduced-motion safe) and
`ProcessSteps.tsx` (numbered spine, staggered via `Reveal`) already exist.
`PropertyCard.tsx` already has hover lift and a real, non-fabricated `isNew`
badge driven by `isRecentlyPublished`. `lib/utils/format.ts` already has
`isRecentlyPublished`, `daysSince`, `formatRelativeDate`. `app/globals.css`
has a global `prefers-reduced-motion` kill-switch and one existing
`@keyframes dropdown-in`. Brand palette is one accent (Bonfire Red) on
ivory/charcoal with soft "clay" shadows — no secondary brights.

**Design Critic:** Extend existing patterns rather than inventing new ones —
hero tiles get a slow idle drift (`@keyframes`, transform-only,
`motion-reduce:animate-none`); `PropertyCardMedia` gets a hover image scale
extending the card's existing lift/shadow hover; the real `isNew` badge gets
a quiet `animate-pulse` (Tailwind built-in, no new keyframes); the
`ProcessSteps` spine fills in top-to-bottom synced to each step's existing
`Reveal` delay. Explicitly avoid: rainbow/gradient shimmer, bounce/overshoot
easing, confetti/emoji, and a full-bleed marquee ticker (reads as a generic
SaaS template, clashes with the restrained one-accent clay palette).

**Codebase Details:** Concrete DB-grounded liveness signals reachable with
data already fetched or one cheap extension: "Listed {relative time} ago"
per card reusing `formatRelativeDate` (zero new queries); a "new this week"
count derived client-side from already-fetched data, rendered only when >0;
stat-strip counters animating count-up to the already-real fetched value
(new small `components/ui/CountUp.tsx`, no new dependency); real county
chips in `HeroSearch` sourced from `coverageRows` already fetched in
`page.tsx` (moderate complexity — prop drilling + typing, no backend
change). `page.tsx` stays a server component; only count-up, cursor-tilt,
and autosuggest need new client boundaries, pushed down to leaf components.

**Zoom Out / Mission Alignment:** DomiLink's trust proposition is "direct,
transparent, no agent middleman" — liveness signals must reinforce
*transparency of real activity*, not manufactured urgency/FOMO (no "X people
viewing now," no fake countdowns — reject outright even if visually
tempting). Cold-start risk: this is an early-stage Liberia marketplace: the
stat strip already hides at 0, and heavy motion shouldn't paper over there
being few real listings yet — a subtle hover/press affordance on the
empty-state "List Your Property — Free" CTA may matter more than decorative
polish. Bandwidth/device constraints: target users include lower-end Android
browsers on data plans — favor transform/opacity-only animation, keep
continuous effects (drift, pulsing) very subtle/low-frequency. Priority:
(1) real recency signals, (2) interactive hero search refinement (real
county chips), (3) micro-motion polish — cheap and skippable, not the main
investment.

**Comprehension / Accessibility:** Every new CSS animation gets the global
`prefers-reduced-motion` rule for free; the one exception is a JS-driven
count-up tween, which needs its own explicit `window.matchMedia` check
(mirroring `Reveal.tsx`'s pattern) and must keep the accessible text at the
final value immediately (`aria-live="off"`, animate only the visual
decorative counter) so screen readers aren't read a stream of changing
numbers. A cursor-tilt parallax on hero tiles is lower risk since the tiles
are already `aria-hidden="true"` decorative images — keep them that way,
never make them focusable. Any county-chip/autosuggest interactivity needs
real keyboard support (not hover/click-only), using the existing
`.focus-ring` utility. Ambient/idle motion should stay subtler than the
search bar's own states so it reads as atmosphere, not competing signal.

**Implementation Readiness:** Full effort/risk table for all seven
shortlisted ideas plus three rejected ones is in the synthesizer's working
notes; summary: relative-time text, badge pulse, hover image scale, and
hero idle drift are all Low effort, pure CSS/no new client boundary. The
`ProcessSteps` spine fill-in is Medium effort, stays within the existing
client components. Count-up stat numerals and real county chips in
`HeroSearch` are Medium effort, each needing one small new/extended client
component with explicit accessibility handling. Cursor-tilt parallax is
Medium effort (new small wrapper, `mousemove` listeners must be
throttled/rAF-batched). Nothing requires a new npm dependency.

**Structural:** Reuse `Reveal`'s existing `delayMs` prop pattern for any new
stagger needs rather than forking it. `CountUp` belongs in `components/ui/`
(generic, reusable elsewhere). A hero cursor-tilt wrapper, if built, is
homepage-specific — keep it inline in `app/page.tsx` or as a tightly-scoped
`components/marketing/HeroPhotoTiles.tsx`, not `ui/`. County chip logic
belongs inside `HeroSearch.tsx` itself as an additive optional prop, not a
new top-level component. Any new "listed X ago" or "N new this week" logic
must call the existing `isRecentlyPublished`/`formatRelativeDate` utilities,
never reimplement date math inline. New `@keyframes` belong in
`app/globals.css` alongside the existing `dropdown-in` keyframe, with the
same short "why this exists" comment convention. Resist building a generic
"animation variants" config system — CLAUDE.md explicitly forbids premature
abstraction; a handful of targeted, named CSS utilities plus the existing
`Reveal`/`ProcessSteps` prop surface is enough. Any new business-logic guard
(e.g. "count of this week's listings > 0") deserves a small vitest unit
test, mirroring the existing `stats.filter((s) => s.value > 0)` pattern;
purely visual CSS transitions/keyframes don't need unit tests.

## Goals vs. Non-Goals

* **In-Scope Goals:**
  - Make the hero, "Recently listed" grid, and "How it works" section feel
    visibly alive through a combination of motion, real-data liveness
    signals, and interactivity.
  - Use only plain CSS/Tailwind — no new runtime dependencies, no animation
    libraries.
  - Every "liveness" signal must be backed by real, already-fetched (or
    cheaply derivable) database data — never fabricated stats or social
    proof.
  - Respect `prefers-reduced-motion` everywhere, including JS-driven
    effects that the existing global CSS rule doesn't reach.
* **Out-of-Scope Non-Goals:**
  - No fabricated urgency/social-proof signals ("X people viewing now,"
    countdown timers).
  - No new shared "animation variants" orchestration system/config object —
    targeted, named utilities only.
  - No CSS `animation-timeline: scroll()` parallax (poor browser support).
  - No marquee/ticker of listings.
  - No change to any Server Action, Supabase query shape (beyond what's
    already fetched), or RLS policy.
  - No redesign of `PropertyCard`, `HeroSearch`, `ProcessSteps`, or
    `Reveal`'s existing core structure — extend, don't fork or rewrite.

## Alternatives Weighed

* **Fabricated social-proof text ("X people viewing this now")** — rejected
  outright by the Zoom Out lens: this is exactly the kind of agent-era
  pressure tactic DomiLink exists to displace, and would violate CLAUDE.md
  rule #9's spirit even where not a literal fabricated stat.
* **Countdown timers** — rejected for the same reason; implies manufactured
  urgency not grounded in real data.
* **Rainbow/gradient shimmer and bounce/overshoot easing** — rejected by the
  Design Critic lens as reading like generic template effects that clash
  with the restrained one-accent clay palette.
* **CSS `animation-timeline: scroll()` scroll-driven parallax** — rejected
  by Implementation Readiness: Chrome-only support as of this writing, would
  need a no-op fallback for a highest-risk/lowest-payoff effect.
* **Full-bleed marquee ticker of recently-listed text** — rejected by
  Design Critic and Comprehension: reads as a stock SaaS template unless
  heavily restyled, and would need a pause-on-hover/focus affordance for
  WCAG 2.2.2 if pursued, which it likely wouldn't get.
* **A generic "animation variants" config/orchestration layer** — rejected
  by the Structural lens as premature abstraction (CLAUDE.md explicitly
  forbids this); a handful of targeted CSS utilities is enough for the
  scope here.
* **Cursor-tilt parallax on hero tiles** — not rejected, but deprioritized
  to optional/stretch: Medium effort, needs a new small client wrapper and
  careful `mousemove` throttling, and the Zoom Out lens suggests effort is
  better spent on real recency signals and hero search refinement first.

## Key Decisions & Staging for Next Steps

Cross-lens shortlist, in priority order, to carry into `/egm-draft`:

1. **"Listed X ago" relative-time text per card** — reuse
   `formatRelativeDate`, zero new client boundary, real data only. (Low
   effort, highest mission alignment.)
2. **Quiet pulse on the existing real "New" badge** — Tailwind's built-in
   `animate-pulse`, no new keyframes needed, already reduced-motion-safe.
3. **Hover image scale on `PropertyCard`** — extends the card's existing
   lift/shadow hover pattern via `group-hover:scale-[1.03]` on
   `PropertyCardMedia`'s already-`overflow-hidden` wrapper.
4. **Hero photo-tile idle drift** — new `@keyframes hero-drift` in
   `app/globals.css`, transform-only (`translate`/`rotate`, ±4px/±1deg over
   30–45s), `motion-reduce:animate-none`.
5. **`ProcessSteps` connecting spine fills in** synced to each step's
   existing `Reveal` delay — extends `ProcessSteps.tsx`, no new component.
6. **Real county chips in `HeroSearch`**, sourced from the `coverageRows`
   query `app/page.tsx` already runs — genuine live-inventory signal,
   needs keyboard support; threaded as a new optional `counties?: string[]`
   prop on the existing component.
7. **Count-up tween on the stat strip** — new small
   `components/ui/CountUp.tsx` client component animating to the
   already-real final value, with explicit `prefers-reduced-motion` and
   `aria-live="off"` handling.

Open question to resolve with the user before/during drafting: should all
seven items ship in one wave, or should items 6–7 (the two Medium-effort,
new-client-component items) be split into a follow-up wave to keep this
one's diff small and reviewable, consistent with how prior waves have
scoped themselves?
