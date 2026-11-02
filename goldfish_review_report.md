# Goldfish Annotated Review Report (Stage 9, Round 1)

**Status: resolved** — all PROPOSE FIX items (Issues 1-6, 9, 10) applied,
including a real redesign of the ProcessSteps spine fill-in (Issue 1);
Issue 7 was superseded by Issue 1's redesign (no separate edit needed);
Issue 8 remains CONTESTED and unchanged (verified factually incorrect
against app/globals.css's actual rule).

**Target:** `docs/designs/homepage-liveliness-design.md` (DetailedRange, lines 430–583, with two edits reaching into the FeatureRange to fix cross-referenced inconsistencies)

## Prioritized Findings & AI Suggestions

### Issue 1 [`egm-implementation-readiness` / `egm-codebase-details`] - Severity: Critical
*   **Affected Scope:** Lines 501-511 (item 6) and FeatureRange Technical Plan item 5 (lines 207-218)
*   **Discrepancy Description:** The `ProcessSteps` spine fill-in is unimplementable as specified — `Reveal` exposes no mechanism for a sibling/child to react to its internal visibility state while forbidden from forking it, and per-gap segment positioning for variable-height step rows has no specified formula. The "Type / Scope" line also factually misstates that `ProcessSteps.tsx` has a `"use client"` directive.
*   ***AI Suggestion:*** PROPOSE FIX (redesign)
*   ***Justification:*** This requires an actual design change, not a wording patch. Resolution: abandon the per-segment `scale-y` "draw-in" effect and the multi-segment split entirely. Keep the spine as the single continuous element it is today (`absolute ... top-6 bottom-6 w-px bg-border`, sized by the existing container insets — no per-gap positioning math needed), and wrap that single element in one `<Reveal delayMs={(steps.length - 1) * 100}>` so the whole line fades and slides in using `Reveal`'s own, unmodified, already-exposed behavior (opacity + translate-y) — the same transition every other `Reveal` usage in the app already has, rather than inventing a new scale-y motion language for this one element. This is implementable with zero changes to `Reveal.tsx`, requires no segment geometry, and is consistent with `Reveal`'s actual API (it accepts `children` and an optional `className`, merged via `cn()`, and manages opacity/translate-y on its own wrapper — nothing more).
*   ***Proposed Edit:***
    *   Location: FeatureRange Technical Plan item 5 (lines 198-218) — full rewrite.
    *   Change: Replace the per-segment-scale-y description with: "`ProcessSteps.tsx` currently renders one continuous `absolute ... w-px bg-border` spine behind all steps, already fully positioned correctly by the existing container insets (`top-6`/`bottom-6`), fully drawn and static. Wrap that single spine element in one `<Reveal delayMs={(steps.length - 1) * 100}>` — delayed to roughly when the last step's own content reveal completes — so it fades and slides into place using `Reveal`'s existing, unmodified opacity/translate-y transition, the same motion every other `Reveal` usage in the app already has. No per-segment split, no new CSS, no change to `Reveal.tsx` itself, no new component."
    *   Location: Detailed Implementation Plan item 6 (lines 499-511) — update to match, and correct the Type/Scope line.
    *   Change: "Type / Scope: React client component (`"use client"`, already imports `Reveal`)" → "Type / Scope: React server-renderable component (no `"use client"` directive; already imports the client component `Reveal`, which composes fine as a child of a server component)." Replace "Proposed Changes" with: "Wrap the existing single spine `<div aria-hidden="true" className="absolute ... w-px bg-border lg:block" />` in `<Reveal delayMs={(steps.length - 1) * 100}>`, with no other change to the spine's existing classes/positioning."

### Issue 2 [`egm-implementation-readiness`] - Severity: Medium
*   **Affected Scope:** Lines 450-458 (item 2)
*   **Discrepancy Description:** Names the hero-drift keyframe's property (`translate`) but not a concrete duration — "~30-45s" is a range.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial to pin down; the Technical Plan's keyframe code (lines 179-183) already has the exact 0%/50%/100% stops, just not a final duration.
*   ***Proposed Edit:***
    *   Location: Line 450-458
    *   Change: "(duration ~30-45s, `ease-in-out`, `infinite`)" → "(`animation: hero-drift 38s ease-in-out infinite`)"

### Issue 3 [`egm-implementation-readiness`] - Severity: Medium
*   **Affected Scope:** Lines 434-445 (item 1, `CountUp`)
*   **Discrepancy Description:** "An ease-out curve" names no formula; unspecified whether the animating span applies `.toLocaleString()` during the count-up.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Both are easy to pin down.
*   ***Proposed Edit:***
    *   Location: Line 405-406 (and the matching line in item 1 of Detailed Implementation Plan)
    *   Change: "using an ease-out curve computed in plain JS (no dependency)" → "using the cubic ease-out formula `1 - Math.pow(1 - t, 3)` (`t` = elapsed/duration, clamped to [0, 1]), computed in plain JS (no dependency). The animating `aria-hidden` span applies `.toLocaleString()` to its current tweened integer on every frame, matching the final `sr-only` value's formatting."

### Issue 4 [`egm-implementation-readiness` / `egm-codebase-details`] - Severity: Medium
*   **Affected Scope:** Line 521 (item 7) and FeatureRange Technical Plan item 6 (line ~255)
*   **Discrepancy Description:** Three different, mutually undefined names are used across two sections for the same chip-selection comparison: `selectedChip`, `selectedCounty`, and the actual state variable `county`. Both are my own inconsistency, introduced in two separate prior remediation rounds.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** There's only one real state variable (`county`); the chip row is rendered via `counties.map(...)`, so the per-item loop variable needs its own name, distinct from `county`, compared against it.
*   ***Proposed Edit:***
    *   Location: FeatureRange Technical Plan item 6, chip description
    *   Change: `aria-pressed={county === selectedCounty}` → `aria-pressed={c === county}` (where `c` is the `counties.map((c) => ...)` loop variable)
    *   Location: Detailed Implementation Plan item 7
    *   Change: `aria-pressed={county === selectedChip}` → `aria-pressed={c === county}`, with an explicit note: "rendered via `counties.map((c) => <button key={c} ... aria-pressed={c === county} onClick={() => setCounty(c === county ? "" : c)}>{c}</button>)`."

### Issue 5 [`egm-implementation-readiness`] - Severity: Low
*   **Affected Scope:** Lines 481-486 (item 4)
*   **Discrepancy Description:** Doesn't repeat the new line's position relative to the existing price/title/location/bed-bath lines (specified in the FeatureRange but not here).
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial — close the cross-reference gap directly in this section.
*   ***Proposed Edit:***
    *   Location: Line 481-486
    *   Change: Append: "Inserted immediately after the existing location `<p>`, before the bed/bath `<p>` — matching the price → title → location → \"Listed X ago\" → beds/baths order already specified in Technical Plan item 1."

### Issue 6 [`egm-codebase-details`] - Severity: Low
*   **Affected Scope:** Line 561 (Verification Plan)
*   **Discrepancy Description:** Uses `npx tsc --noEmit` instead of the project's own `npm run typecheck` script.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial, matches the rest of the same bullet's convention (`npm run lint`/`test`/`build`).
*   ***Proposed Edit:***
    *   Location: Line 561
    *   Change: "`npx tsc --noEmit`, `npm run build`" → "`npm run typecheck`, `npm run build`"

### Issue 7 [`egm-implementation-readiness`] - Severity: Low
*   **Affected Scope:** Line 509
*   **Discrepancy Description:** `transform-origin: top` written as a raw CSS declaration instead of the Tailwind utility `origin-top`.
*   ***AI Suggestion:*** PROPOSE FIX (superseded)
*   ***Justification:*** This line is removed entirely by Issue 1's redesign (no `transform-origin`/`scale-y` needed once the spine goes back to a single `Reveal`-wrapped element). No separate edit needed.
*   ***Proposed Edit:*** Covered by Issue 1.

### Issue 8 [`egm-implementation-readiness`] - Severity: Low — CONTESTED
*   **Affected Scope:** Line 480 (item 4b, badge `animate-pulse`)
*   **Discrepancy Description:** Flagged as missing a `motion-reduce:` companion class, claimed to fail the Verification Plan's reduced-motion check.
*   ***AI Suggestion:*** CONTEST
*   ***Justification:*** Checked against `app/globals.css`'s actual global rule: `*, *::before, *::after { animation-duration: 0.01ms !important; ... }` — a universal selector zeroing `animation-duration` for every element, `Badge` included, with no explicit `motion-reduce:` class needed. This exactly matches the document's own stated reasoning for this same item in the FeatureRange Technical Plan ("the app's existing global `prefers-reduced-motion` CSS block already zeroes `animation-duration`... so this is reduced-motion-safe with zero additional code"). Not a gap — a checkable fact the reviewer got wrong.
*   ***Proposed Edit:*** None — no change to the document.

### Issue 9 [`egm-style`] - Severity: Low
*   **Affected Scope:** Lines 551-554
*   **Discrepancy Description:** "trivial" / "not worth a dedicated test on its own" are subjective judgments.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial wording fix.
*   ***Proposed Edit:***
    *   Location: Line 551-554
    *   Change: "...the trivial one-line transformation of already-fetched data (the county-list `Set` dedup) not worth a dedicated test on its own" → "...the one-line transformation of already-fetched data (the county-list `Set` dedup), which has no independent branching logic to test"

### Issue 10 [`egm-style`] - Severity: Low
*   **Affected Scope:** Line 563
*   **Discrepancy Description:** "stay green" is a CI-dashboard idiom.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial wording fix.
*   ***Proposed Edit:***
    *   Location: Line 563
    *   Change: "existing suite must stay green" → "existing suite must continue passing"
