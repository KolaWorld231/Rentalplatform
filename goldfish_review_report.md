# Goldfish Annotated Review Report

**Status: resolved** — all PROPOSE FIX items (Issues 1-11, 13, 14, 16-18,
20) auto-accepted and applied; 3 DECLINE items (Issues 12, 15, 19) left
unchanged as accepted nits.

**Target:** `docs/designs/homepage-liveliness-design.md` (lines 1–393)

## Prioritized Findings & AI Suggestions

### Issue 1 [`egm-design`] - Severity: High
*   **Affected Scope:** Lines 91-99 (CUJ 2) vs. lines 236-249 (item 6)
*   **Discrepancy Description:** CUJ 2 says clicking a county chip navigates directly to `/search?county=<county>`; the Technical Plan says chips set local state only, navigation happens on form submission.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid contradiction. The submit-based flow is correct and should stand: it matches `HeroSearch`'s existing one-button-submits-everything pattern and lets county be combined with city/bedrooms in one search, consistent with how `searchParamsSchema` treats all three as independently optional. CUJ 2 is the one that needs to change.
*   ***Proposed Edit:***
    *   Location: CUJ 2 "Then" clause (line 97-99)
    *   Change: "clicking one navigates to `/search?county=<county>`, filtering results exactly the same way the full search filters sidebar already does" → "clicking one toggles it as the selected county (same active/inactive treatment as `SearchFilters.tsx`'s category chips); submitting the search (alongside any city/bedrooms already entered) navigates to `/search?county=<county>...`, filtering results exactly the same way the full search filters sidebar already does."

### Issue 2 [`egm-design`] - Severity: High
*   **Affected Scope:** Lines 172-196 (item 4)
*   **Discrepancy Description:** The `--hero-drift-base` CSS variable mechanism is asserted to preserve each tile's static rotation through the animation, but nothing specifies how the variable is populated, and as described the keyframe's `transform` would replace rather than merge with each tile's static transform.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Checkable against this repo's own prior finding (Wave 9's `Switch` component investigation confirmed Tailwind v4 applies `translate-x-*`/`rotate-*` via the native CSS `translate`/`rotate` properties, not the composite `transform` property). That means the static `rotate-6`/`-rotate-3`/`rotate-2` Tailwind classes already on each tile use the CSS `rotate` property, completely independent of `translate` — the drift only needs to animate `translate`, and the existing static rotation classes keep working untouched with zero custom property needed. This is a simpler and more correct fix than the `--hero-drift-base` approach.
*   ***Proposed Edit:***
    *   Location: `@keyframes hero-drift` definition and its surrounding prose (lines 174-196)
    *   Change: Replace the `--hero-drift-base`-based keyframe with one that animates only the native `translate` property: `@keyframes hero-drift { 0%, 100% { translate: 0 0; } 50% { translate: 4px -4px; } }`. Remove all `--hero-drift-base` references. State explicitly that each tile's existing static `rotate-*` Tailwind class is untouched and composes independently, since Tailwind v4 applies `rotate` via the native CSS `rotate` property, separate from `translate` (cite the Wave 9 `Switch` precedent for this fact).

### Issue 3 [`egm-design`] - Severity: High
*   **Affected Scope:** Lines 198-214 (item 5), contradicting line 75's "Open Questions: None outstanding"
*   **Discrepancy Description:** Two architecturally distinct approaches (extracting `Reveal`'s internal visibility logic vs. wrapping each segment in its own `<Reveal>`) are left as an "or" instead of committed to one.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** The Detailed Implementation Plan (item 6) already commits to the simpler approach (wrapping each segment in its own `<Reveal delayMs={i * 100}>`). The Technical Plan should match it, not present a fork.
*   ***Proposed Edit:***
    *   Location: Lines 208-213
    *   Change: Remove "driven by the same `visible` state logic `Reveal` already uses internally (or, simpler: ...)" and its parenthetical fork. Keep only: "each segment is wrapped in its own `<Reveal delayMs={i * 100}>` matching step N's marker, reusing `Reveal`'s existing component rather than duplicating its IntersectionObserver logic."

### Issue 4 [`egm-design`] - Severity: High
*   **Affected Scope:** Lines 236-249 and 374-376
*   **Discrepancy Description:** County chips get a visually-toggled active state but no `aria-pressed` (or equivalent) is proposed to convey that state to assistive technology, despite the document explicitly reasoning about chip accessibility.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid and checkable — confirmed no ARIA state attribute is mentioned anywhere in item 6's description.
*   ***Proposed Edit:***
    *   Location: Line 239-242 (chip description) and line 375-376 (NFR Accessibility bullet)
    *   Change: Add "each chip carries `aria-pressed={county === selectedCounty}` so its toggle state is announced to assistive technology" to item 6's description, and add the same requirement to the Accessibility bullet in Non-Functional Requirements.

### Issue 5 [`egm-design`] - Severity: High
*   **Affected Scope:** Lines 227-249 (item 6)
*   **Discrepancy Description:** No wrapping/scroll/cap strategy specified for the county chip row when there are many counties.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** `lib/validation/property.ts`'s `LIBERIA_COUNTIES` enum confirms the real universe of counties is fixed at 15 (Liberia has 15 counties) — not unbounded "dozens" as the finding worried, but still more than fits in one row on narrow mobile widths. A simple `flex-wrap` handles this cleanly without needing truncation or a cap, since it's a bounded, short-label list, not an open-ended or long-text list.
*   ***Proposed Edit:***
    *   Location: Line 238-239
    *   Change: "render a horizontal row of chip `<button type="button">` elements" → "render a `flex flex-wrap gap-2` row of chip `<button type="button">` elements (wrapping to multiple lines on narrow widths rather than scrolling or truncating — the real county list is bounded at 15, per `LIBERIA_COUNTIES` in `lib/validation/property.ts`, not an open-ended list)."

### Issue 6 [`egm-structural`] - Severity: Medium
*   **Affected Scope:** Lines 1-393 (whole-document scope)
*   **Discrepancy Description:** No dedicated "Risks & Mitigations" section, a required area per feature-spec-standard. Risk content is scattered across Non-Functional Requirements and implicit in Non-Goals/Alternatives.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid structural gap.
*   ***Proposed Edit:***
    *   Location: New section before "## Non-Functional Requirements"
    *   Change: Add a "## Risks & Mitigations" section consolidating: (1) the bundling risk flagged in Stage 5 (seven independently-motivated items in one wave/rollback unit — mitigation: sequence commits so functional items (1, 6, 7) aren't entangled with purely decorative ones (2-5) even within one PR, so a partial revert is possible); (2) the hero-drift CSS correctness risk, now resolved per Issue 2's fix; (3) cross-reference to the Accessibility/Performance/Rollback bullets that remain in Non-Functional Requirements.

### Issue 7 [`egm-design` / multi-reviewer] - Severity: Low
*   **Affected Scope:** Lines 270, 359 (and structural/comprehension echoes)
*   **Discrepancy Description:** "Comprehension-lens finding," "Zoom-Out-lens priority ranking" cited as established vocabulary, never defined — independently confirmed by four separate reviewer passes across two stages.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Same confirmed mistake as Wave 9's design doc — carried over from brainstorm-brief phrasing into this draft without being caught at draft time.
*   ***Proposed Edit:***
    *   Location: Line 270
    *   Change: "per the brief's Comprehension-lens finding" → "per the brainstorm brief's accessibility analysis"
    *   Location: Line 359
    *   Change: "the brief's Zoom-Out-lens priority ranking rates" → "the brainstorm brief's mission-alignment priority ranking rates"

### Issue 8 [`egm-design`] - Severity: Low
*   **Affected Scope:** Line 46 (Goals) vs. line 251 (Technical Plan item 7)
*   **Discrepancy Description:** "Stat strip" used before it's described structurally.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Easy one-time gloss closes the gap.
*   ***Proposed Edit:***
    *   Location: Line 46 (first use, in Goals)
    *   Change: "the stat-strip count-up" → "the homepage's stat-strip count-up (the three numbers — active listings, owners, counties — in the hero)"

### Issue 9 [`egm-design`] - Severity: Low
*   **Affected Scope:** Lines 63, 119
*   **Discrepancy Description:** "RLS" unexpanded both times it appears.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial.
*   ***Proposed Edit:***
    *   Location: Line 63 (first use)
    *   Change: "any RLS policy" → "any Row-Level Security (RLS) policy"

### Issue 10 [`egm-design`] - Severity: Low
*   **Affected Scope:** Line 69
*   **Discrepancy Description:** "The brief" cited as an authority before the document states what it is.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Grounds the term at first use instead of only in Additional Resources.
*   ***Proposed Edit:***
    *   Location: Line 68-69
    *   Change: "the brief rated it Medium effort" → "the brainstorm brief (`docs/designs/homepage-liveliness.md`) rated it Medium effort"

### Issue 11 [`egm-design`] - Severity: Low
*   **Affected Scope:** Line 243
*   **Discrepancy Description:** "Wave 5" referenced with no definition.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial grounding.
*   ***Proposed Edit:***
    *   Location: Line 243-244
    *   Change: "per Wave 5" → "per a prior design wave (see `docs/IMPLEMENTATION_STATUS.md`)"

### Issue 12 [`egm-structural`] - Severity: Low
*   **Affected Scope:** Lines 20, 111
*   **Discrepancy Description:** Section heading names drift from the standard's canonical terms ("The Problem"/"Problem Statement"; "Technical Plan (Architecture)"/"Proposed Architecture").
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** Consistent with how this exact same Nit was handled in Wave 9's design doc review — the parenthetical already preserves traceability to the standard's term, and renaming now would create inconsistency with the already-shipped Wave 9 doc's heading conventions in this same repo.

### Issue 13 [`egm-structural`] - Severity: Medium
*   **Affected Scope:** Lines 122-280
*   **Discrepancy Description:** An unnumbered "Deferred" subsection breaks the Technical Plan's numbered `### 1.`-`### 7.` sequence and restates content already in Non-Goals.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid — this is pure duplication with Non-Goals' existing cursor-tilt-parallax bullet (lines 67-71).
*   ***Proposed Edit:***
    *   Location: Lines 277-280
    *   Change: Delete the "### Deferred (explicitly out of scope per Non-Goals)" subsection entirely — Non-Goals already covers this.

### Issue 14 [`egm-structural`] - Severity: Low
*   **Affected Scope:** Lines 178-183
*   **Discrepancy Description:** The `@keyframes hero-drift` block is fenced as ` ```text ` despite being literal CSS.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial, correct syntax highlighting. Note: this code block is being rewritten per Issue 2's fix anyway.
*   ***Proposed Edit:***
    *   Location: Line 178
    *   Change: ` ```text ` → ` ```css ` (applied to the rewritten keyframe block from Issue 2)

### Issue 15 [`egm-structural`] - Severity: Low
*   **Affected Scope:** Lines 386-392
*   **Discrepancy Description:** Additional Resources uses inline code spans instead of markdown links for in-repo file paths.
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** These are local repo paths, not web URLs; Wave 9's design doc (already shipped in this repo) uses the identical inline-code convention for its own Additional Resources section without issue. Keeping consistency across both docs.

### Issue 16 [`egm-style`] - Severity: Low
*   **Affected Scope:** Line 189
*   **Discrepancy Description:** "Belt-and-suspenders" is a colloquial idiom inconsistent with the document's dry register.
*   ***AI Suggestion:*** PROPOSE FIX (bundled with Issue 2's rewrite — the corrected hero-drift section no longer needs this phrase since the "double-guard" framing changes)
*   ***Justification:*** Issue 2's fix removes the surrounding sentence structure; no separate edit needed beyond that rewrite.
*   ***Proposed Edit:*** Covered by Issue 2's rewrite of lines 174-196.

### Issue 17 [`egm-style`] - Severity: Low
*   **Affected Scope:** Lines 350-351
*   **Discrepancy Description:** "a genuinely novel, eye-catching interaction" is an unmeasurable subjective judgment.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial wording fix to match the rest of Alternatives' neutral framing.
*   ***Proposed Edit:***
    *   Location: Line 350-351
    *   Change: "a genuinely novel, eye-catching interaction not currently present anywhere in the app" → "an interaction pattern not currently implemented anywhere in the app"

### Issue 18 [`egm-style`] - Severity: Low
*   **Affected Scope:** Lines 311-312
*   **Discrepancy Description:** "a genuinely dynamic scroll-linked effect" is the same subjective-judgment issue as Issue 17.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial wording fix.
*   ***Proposed Edit:***
    *   Location: Line 311-312
    *   Change: "would give the hero photo tiles a genuinely dynamic scroll-linked effect" → "would tie the hero photo tiles' motion to scroll position"

### Issue 19 [`egm-style`] - Severity: Low
*   **Affected Scope:** Lines 118-120 and throughout items 1-7
*   **Discrepancy Description:** Heavy repetition of "already" across the Technical Plan.
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** Too diffuse to action with a precise edit across many lines; the repetition serves the document's real point (reuse existing infra) and isn't meaningless filler. Not worth the churn for a cosmetic nit with no single concrete replacement proposed.

### Issue 20 [`egm-style`] - Severity: Low
*   **Affected Scope:** Lines 251, 264
*   **Discrepancy Description:** "Tween" is animation-industry jargon never defined, though the mechanism is clear from context regardless.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial plain-language substitution.
*   ***Proposed Edit:***
    *   Location: Line 251 (heading) and line 264 ("tweens a local")
    *   Change: "Count-up tween on the stat strip" → "Count-up animation on the stat strip"; "tweens a local `displayValue` state from `0` to `value`" → "animates a local `displayValue` state from `0` to `value`"
