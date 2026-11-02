# Stage 6: Comprehension Test

**Target**: `docs/designs/homepage-liveliness-design.md`
**FeatureRange**: lines 1–393 · **DetailedRange**: lines 394–546
**Reviewer**: egm-comprehension (fresh-context Goldfish, no document standard applied)

## What this proposes

This design adds seven small, CSS/Tailwind-only motion, real-data, and
interactivity enhancements to three existing homepage sections (the hero,
the "Recently listed" property grid, and the "How it works" section) so
the page feels like an active marketplace rather than a static
screenshot. The seven items are: a relative-time "Listed X ago" line on
property cards, a pulsing "New" badge, a hover image-scale effect on
property cards, idle drift on the hero's background photo tiles, a synced
fill-in animation on the "How it works" connecting line, real county
filter chips in the hero search bar, and a count-up tween on the
homepage's stat numbers. The doc is explicit that every liveness signal
must be backed by real, already-fetched database data (never fabricated
stats), that no new runtime dependencies or animation libraries are
introduced, and that `prefers-reduced-motion` is respected everywhere.
The Detailed Implementation Plan then enumerates the concrete files to
create/modify, a note on why no new unit tests are planned, and a
verification plan (build/lint/test plus manual accessibility and live
E2E checks against Supabase).

## How the existing system works, per this document

Per the document, the homepage (`app/page.tsx`) already fetches real
data — publish timestamps, owner/county counts, coverage rows — and
already has some motion: blurred rotated hero photo tiles and a
scroll-reveal fade-in on the property grid via an existing `Reveal`
component. `PropertyCard`/`PropertyCardMedia` already compute an `isNew`
flag and already cycle through photos on hover; `ProcessSteps` already
wraps each step in `Reveal` with a staggered delay and renders one static
connecting line behind all steps; `HeroSearch` already has `city`/
`bedrooms` filter fields that build a `URLSearchParams` query; and a
global CSS rule in `app/globals.css` already zeroes out animation
durations under `prefers-reduced-motion`. The stat strip already renders
real server-fetched numbers (`publishedCount`, `ownersListing`,
`countiesCovered`) as static text today.

---

## Findings

1.  **Severity: Major** — "Comprehension-lens finding" (line 270),
    "Zoom-Out-lens priority ranking" (line 359) in FeatureRange;
    "Structural-lens guidance" (line 474) in DetailedRange. These "-lens"
    terms are presented as established review categories the reader
    should already recognize, but they're never defined, explained, or
    linked anywhere in the document. A naive reader has no way to know
    what a "Comprehension-lens finding" or "Structural-lens guidance"
    actually means or where it came from — only vaguely attributed to
    "the brief." This is project/process-specific jargon left completely
    unexplained, breaking self-containment in both ranges.

2.  **Severity: Nit** — "(Wave 5)" reference, line 244. `SearchFilters.tsx`'s
    chip treatment is attributed to "Wave 5," but the document never
    explains what "Wave 5" is or links to it.

3.  **Severity: Nit** — Heading convention `## Conversion-focused
    redesign, wave N (post-Milestone-8)`, lines 509–511. Assumes the
    reader already knows the project's wave-numbering scheme and what
    "Milestone 8" refers to; only the target file name is given, not an
    explanation of the convention itself.

4.  **Severity: Nit** — "RLS policy," line 63. The acronym RLS (Row Level
    Security) is used without expansion on first use.

5.  **Severity: Nit** — "stat strip," first used line 46 (Goals) and line
    108 (CUJ 3), fully defined only later at line 251+ (Technical Plan
    item 7). The term is relied upon well before the document explains
    what it actually displays, creating a few paragraphs of ambiguity.

6.  **Severity: Nit** — "the brief," first substantive use line 69,
    recurring throughout (lines 150, 195, 270, 331, 360, 474). The
    document repeatedly defers to "the brief" for rationale without
    explicitly stating what it is at first invocation — only connected
    to `docs/designs/homepage-liveliness.md` in the byline and in
    Additional Resources, both easy to miss early in the read.

No comprehension blockers were found — both ranges are internally
consistent and each section's paraphrase could be constructed without
resorting to outside knowledge; the issues above are clarity/
self-containment gaps rather than places where the document's parts fail
to connect.
