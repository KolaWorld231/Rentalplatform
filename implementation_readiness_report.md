# Stage 9: Implementation Readiness Test (Round 1)

**Target**: `docs/designs/homepage-liveliness-design.md`
**Audit range (DetailedRange)**: lines 430–583
**Reviewers**: egm-implementation-readiness (`implementation-readiness-standard`),
egm-codebase-details (`implementation-readiness-standard`), egm-style (own persona standard)

## Consolidated Findings

### 🔴 Blocker

**impl-1-1 / codebase-1-1** — Lines 501–511 (item 6). Two compounding
problems: (1) item 6's "Type / Scope" line claims `ProcessSteps.tsx` has
a `"use client"` directive — it doesn't; the file has no directive at
all (it's server-renderable and merely nests the client component
`Reveal`). (2) The actual mechanism described — wrapping each spine
segment in its own `<Reveal delayMs={i * 100}>` and styling it with
`scale-y-0`→`scale-y-100` "as that `Reveal` instance becomes visible" —
is unimplementable as written: `Reveal.tsx` exposes no prop, context, or
attribute letting a sibling or child react to its internal `visible`
state; it only toggles its *own* wrapper div's opacity/translate-y
classes. An implementer would have to either fork `Reveal` (explicitly
forbidden) or invent an undocumented mechanism.

**impl-1-2 / codebase-1-2** — Lines 503–511 (item 6), cross-referenced
against `ProcessSteps.tsx`'s actual layout (`flex flex-col gap-8
lg:gap-10`, variable-height steps, today's spine is one continuous
absolutely-positioned element sized via `top-6`/`bottom-6` insets against
the whole container). Splitting into `steps.length - 1` per-gap segments
requires a positioning formula (top offset, height, left offset) per
segment that the plan never gives — with variable-height step rows, this
can't be derived without either JS measurement or a layout restructure,
neither of which is specified.

### 🟡 Major

**impl-1-3** — Lines 450–458 (item 2). Names the keyframe and the single
property to animate (`translate`) but gives no concrete duration — "~30-
45s" is a range, not a decided value.

**impl-1-4** — Lines 434–445 (item 1, `CountUp`). "An ease-out curve"
names no formula. Also unspecified: whether the animating `aria-hidden`
span applies `.toLocaleString()` during the count-up (only the final
`sr-only` value's formatting is specified) — relevant once a stat reaches
four digits.

**impl-1-5 / codebase-1-3** — Line 521 (item 7, `HeroSearch`).
`aria-pressed={county === selectedChip}` references `selectedChip`,
never defined anywhere in the plan. Worse: the FeatureRange's Technical
Plan (item 6) uses a *third*, equally undefined name for the same
comparison, `selectedCounty` — both introduced during Stage 7
remediation. The only real state variable is `county`; chips are
rendered via `counties.map(...)`, and neither the loop variable's name
nor the correct comparison is pinned down anywhere.

**impl-1-6** — Lines 481–486 (item 4, `PropertyCard`). Doesn't specify
where the new "Listed X ago" line goes relative to the existing price/
title/location/bed-bath lines (though the FeatureRange's Technical Plan
item 1 does specify this ordering — it just isn't repeated here).

**codebase-1-4** (Nit, included here for grouping) — Line 561
(Verification Plan). Uses `npx tsc --noEmit` instead of the project's own
`npm run typecheck` script (defined in `package.json`), which the same
bullet list otherwise uses correctly for lint/test/build.

### 🟢 Nit

**impl-1-8** — Line 509. `transform-origin: top` written as a raw CSS
declaration instead of the Tailwind utility `origin-top`, inconsistent
with the rest of the document's exact-Tailwind-class convention.

**style-1-1** — Lines 551–554. "trivial" / "not worth a dedicated test
on its own" are subjective judgments; the surrounding clause already
gives concrete justification (one-line `Set` dedup, no branching logic).

**style-1-2** — Line 563. "stay green" is a CI-dashboard idiom; "must
continue passing" is more precise.

## Disputed Finding

**impl-1-7 (CONTESTED)** — Line 480 (item 4b, badge `animate-pulse`).
The reviewer flagged this as missing a `motion-reduce:` companion class,
claiming it would fail the Verification Plan's reduced-motion check.
Checked against `app/globals.css`'s actual global rule (lines ~146–150):
`*, *::before, *::after { animation-duration: 0.01ms !important; ... }`
— a universal selector that zeroes `animation-duration` for every
element, including `Badge`'s `animate-pulse`, with no explicit
`motion-reduce:` class needed. This exactly matches the Technical Plan's
own stated reasoning for item 2 ("the app's existing global
`prefers-reduced-motion` CSS block already zeroes `animation-duration`…
so this is reduced-motion-safe with zero additional code"). The finding
is incorrect — not a comprehension gap, a checkable fact about the CSS.

## Round 1 Clean-Round Assessment

Not clean: two Blockers, five Majors unresolved (one contested, pending
user decision). All three requested reviewers ran successfully (no "not
run" status).
