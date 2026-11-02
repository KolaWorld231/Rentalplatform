# Stage 5: Initial Zoom Out Review

**Target**: `docs/designs/homepage-liveliness-design.md` (full document, lines 1–546)
**Reviewer**: egm-zoom-out (fresh-context Goldfish)

## Context sufficiency

Passes. Overview, Problem, Goals, Non-Goals, and CUJs give enough context
to understand the objective (make a static-reading homepage feel live
using real data) and why.

## Findings

1.  **Major** — Whole document / Technical Plan (bundling of 7 features
    into one wave). The document bundles seven independently-motivated
    changes spanning six files plus one new component into a single
    design/implementation/rollback unit. Each item has its own risk
    profile — items 1-5 are pure CSS/markup, item 6 touches search/URL
    behavior and a new prop surface, item 7 adds a new client component
    and JS-driven animation state. The Open Questions section notes a
    one-vs-two-wave split was considered and resolved toward one wave,
    but that justification is procedural ("resolved before drafting
    began"), not a simplicity argument. Mixing a decorative CSS keyframe
    (item 4, hero drift) with a functional, URL-state-changing feature
    (item 6, county chips) in the same unit increases review/rollback
    surface for no stated benefit — a single `git revert` of the whole
    wave would undo the real functional win (county chips, "Listed X
    ago") if a purely cosmetic item needs to be pulled post-launch.
    Recommend confirming this bundling is still desired, or at minimum
    sequencing commits/PRs so data-bearing/functional items (1, 6, 7)
    aren't entangled with purely decorative ones (2, 3, 4, 5).

2.  **Nit** — Section 5, `ProcessSteps` spine fill-in (lines 198–214).
    Offers two alternative implementation strategies in the same
    paragraph rather than committing to one, even though the Detailed
    Implementation Plan (item 6) correctly commits to the simpler
    Reveal-reuse approach. The Technical Plan's prose ambiguity is
    redundant and could be tightened to state the chosen approach once.

3.  **Nit** — Section 7 (`CountUp`, lines 251–276) duplicates
    implementation-level detail (window.matchMedia check,
    requestAnimationFrame, ease-out curve, aria-hidden/sr-only split)
    nearly verbatim in the Detailed Implementation Plan (item 1). Not a
    scope problem, but unnecessary repetition — the Technical Plan could
    state the component's responsibility/accessibility contract at a
    higher level and defer mechanism-level detail to the Detailed
    Implementation Plan.

## Confirmed non-findings (verified against the codebase)

*   No existing `CountUp` or count-up utility exists anywhere in the
    codebase — the new component isn't reinventing an existing wheel.
*   `app/globals.css`'s global `prefers-reduced-motion` block does zero
    `animation-duration`/`transition-duration` to `0.01ms`, matching the
    design's claim that items 2-5 get reduced-motion compliance for free.
*   `Reveal.tsx`'s `window.matchMedia` pattern, which `CountUp` is said
    to mirror, is confirmed to exist and work exactly that way.
*   `HeroSearch.tsx` currently takes zero props, confirming the new
    optional `counties?: string[]` prop with a `[]` default is
    backward-compatible.
*   `PropertyCard.tsx`'s aspect-ratio `<div>` indeed lacks
    `overflow-hidden` today, validating the design's "correction to the
    brief" in item 3.
*   Every rejected alternative is given a concrete, project-grounded
    rejection reason (CLAUDE.md rules #9/#10, premature abstraction,
    browser support, accessibility cost) rather than hand-waved.

## Overall

No Blocker-level findings. Well-scoped on a per-item basis, avoids
fabricated data, rejects a premature animation-orchestration abstraction,
and correctly reuses existing utilities rather than introducing new ones
where avoidable. The one substantive concern (Major #1, bundling) is
about whether seven independently-motivated changes belong in a single
wave — worth a decision before downstream reviewers proceed, but not
disqualifying on its own.
