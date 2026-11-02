# Goldfish Annotated Review Report

**Status: resolved** — all PROPOSE FIX items auto-accepted and applied;
2 DECLINE items (structural-1-4, structural-1-5) left unchanged as
accepted nits.

**Target:** `docs/designs/wave-9-page-polish-design.md` (lines 1–302)

## Prioritized Findings & AI Suggestions

### Issue 1 [`egm-design`] - Severity: High
*   **Affected Scope:** Lines 245-246, 263 (Alternatives Considered)
*   **Discrepancy Description:** "The Comprehension lens" / "the Zoom Out lens" are cited as the deciding authority for rejecting both alternatives, but neither term is defined anywhere in the document.
*   **Rationale:** The underlying engineering reasoning is sound, but presenting it as validated by an unverifiable external process undermines the rejection rationale's credibility for a fresh reader.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Checkable and valid — confirmed no definition of either term exists anywhere in the document, including Additional Resources. The reasoning stands on its own without the "lens" framing.
*   ***Proposed Edit:***
    *   Location: Line 245-250 (Alternative A, Reason for Rejection) and line 263-270 (Alternative B, Reason for Rejection)
    *   Change: Replace "the Comprehension lens flagged this as a Blocker-severity risk" with "this risks dropping keyboard operability or screen-reader semantics"; replace "the Zoom Out lens's 'rule of three'" with "the rule of three (a shared component is justified once there are three independently motivated call sites)". Remove "lens" framing from both.

### Issue 2 [`egm-design`] - Severity: High
*   **Affected Scope:** Lines 40-41 (Goals) vs. 189-230 (Technical Plan §3)
*   **Discrepancy Description:** Goals state the wave uses `CardClay`, `Button`/`buttonVariants`, `Badge`, `Reveal`, but the per-page plan only ever applies `CardClay` and the new `Switch`.
*   **Rationale:** Goals over-promise relative to what the plan actually delivers; a reader cannot confirm this goal is achievable from the document as written.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Checkable — confirmed against Technical Plan §3 and the Detailed Implementation Plan: neither `Button`, `Badge`, nor `Reveal` is applied to any of the five pages by this wave (`Badge` pre-exists untouched on `/account`; it isn't newly applied).
*   ***Proposed Edit:***
    *   Location: Line 40-41
    *   Change: Replace "using only existing design tokens and components (`CardClay`, `Button`/`buttonVariants`, `Badge`, `Reveal`)" with "using only existing design tokens and the `CardClay` component — no other new component usage is introduced on these pages beyond what each already uses". Also adjust line 30 ("wrap existing content in the same `Card`/`Button`/`Badge` primitives") to say "wrap existing content in the same `Card` primitives".

### Issue 3 [`egm-structural`] - Severity: High
*   **Affected Scope:** Lines 7-9, 272-274, 289-291, 301 (horizontal rules)
*   **Discrepancy Description:** Horizontal-rule dividers appear between some `##` sections but not others, with no stated rule for when one applies.
*   **Rationale:** Inconsistent formatting misleads a reader about the document's actual section boundaries.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Checkable — confirmed the majority of H2-to-H2 transitions in the document (e.g. Overview→Problem, Goals→Non-Goals, Technical Plan→Alternatives) have no rule. The minority with rules (lines 272, 289, 301) are the outliers.
*   ***Proposed Edit:***
    *   Location: Lines 272, 289, 301
    *   Change: Remove the three outlier horizontal rules so no `##`-to-`##` transition in the document uses one, matching the majority pattern. Keep the rule at line 7 (front-matter/body separator — a distinct, consistently-applied case).

### Issue 4 [`egm-design` / `egm-structural`] - Severity: Medium
*   **Affected Scope:** Line 61 (Non-Goals)
*   **Discrepancy Description:** `DocumentUploader` appears in Non-Goals with no stated connection to any of the five in-scope pages; also breaks Non-Goals' parallel-construction pattern (every other bullet traces to something discussed elsewhere in the document).
*   **Rationale:** Confirmed by two independent reviewers (egm-design and egm-structural) and by Stage 6 Comprehension. This is a genuine authoring error, not a documentation gap — `DocumentUploader` belongs to a different feature (property verification) unrelated to this wave's five pages.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** I wrote this line; it was carried over by mistake from unrelated context. No contest — the reviewers are correct.
*   ***Proposed Edit:***
    *   Location: Line 61
    *   Change: Delete "`DocumentUploader`," from the Non-Goals bullet, leaving "No change to `markAllNotificationsReadAction`, `markNotificationReadAction`, `updateNotificationPreferencesAction`, or any other existing interactive wiring — markup and classes only."

### Issue 5 [`egm-design`] - Severity: Medium
*   **Affected Scope:** Lines 274-287 (Non-Functional Requirements)
*   **Discrepancy Description:** No Risks & Mitigations content addresses the `Switch` component's `peer-focus-visible:` divergence from the existing `.focus-ring` utility used everywhere else in the app.
*   **Rationale:** This is the one real, specific risk tied to the one genuinely new UI primitive in this wave — the document notes the divergence (lines 183-187) but never assesses its risk or mitigation.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid and checkable — confirmed the divergence is noted but unaddressed as a risk.
*   ***Proposed Edit:***
    *   Location: Non-Functional Requirements, Accessibility bullet (line 276-281)
    *   Change: Append a sentence: "The `peer-focus-visible:` focus treatment is a deliberate, scoped exception to the site-wide `.focus-ring` utility (the visible focus target is an `aria-hidden` track, not the input itself); verification must include a side-by-side visual check that `Switch`'s focus ring reads consistently with `.focus-ring`'s outline color/offset elsewhere on the page, to catch any divergence before merge."

### Issue 6 [`egm-structural`] - Severity: Medium
*   **Affected Scope:** Line 291 (`### Additional Resources`)
*   **Discrepancy Description:** H3 heading with no parent H2 — reads as a subsection of the preceding "Non-Functional Requirements" H2 rather than a sibling top-level section.
*   **Rationale:** Misrepresents the document's actual structure.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Checkable — confirmed every other top-level section in range is H2; this is the sole H3 at this level.
*   ***Proposed Edit:***
    *   Location: Line 291
    *   Change: Promote `### Additional Resources` to `## Additional Resources`. Also promote `### Future Improvements` if present at the same level (not present in this document — N/A).

### Issue 7 [`egm-design`] - Severity: Low
*   **Affected Scope:** Lines 245-250
*   **Discrepancy Description:** "Blocker-severity risk" borrows this review pipeline's own severity vocabulary inside the artifact under review.
*   ***AI Suggestion:*** PROPOSE FIX (bundled with Issue 1's edit — the rephrase already removes this term)
*   ***Justification:*** Same edit as Issue 1 resolves this; no separate edit needed.
*   ***Proposed Edit:*** Covered by Issue 1.

### Issue 8 [`egm-design`] - Severity: Low
*   **Affected Scope:** Lines 211-219 vs. 134-139
*   **Discrepancy Description:** The `/notifications` existing-checkbox markup claim lacks the file-citation rigor shown for the header-shape claim.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Worth the small edit for consistency.
*   ***Proposed Edit:***
    *   Location: Line 211-219 (Section 3 ASCII table, `/notifications` row)
    *   Change: Append "(confirmed in `app/notifications/page.tsx`)" after the existing-markup description in that row.

### Issue 9 [`egm-structural`] - Severity: Low
*   **Affected Scope:** Lines 38-66
*   **Discrepancy Description:** Minor punctuation/clause-structure drift between Goals and Non-Goals bullets.
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** Too vague to action with a precise edit; not worth the churn for a cosmetic nit with no concrete replacement proposed by the reviewer.

### Issue 10 [`egm-structural`] - Severity: Low
*   **Affected Scope:** Line 106
*   **Discrepancy Description:** "Technical Plan (Architecture)" diverges from the standard's exact suggested heading "Proposed Architecture".
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** The reviewer's own write-up already concludes this is a Nit because the parenthetical preserves traceability — no change needed.

### Issue 11 [`egm-structural`] - Severity: Low
*   **Affected Scope:** Lines 120, 145, 191
*   **Discrepancy Description:** Code fences use generic ` ```text ` for blocks that are actually JSX.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial, zero-risk fix worth doing while editing nearby.
*   ***Proposed Edit:***
    *   Location: Lines 120, 145 (JSX blocks only — line 191 is a plain-text diagram, left as `text`)
    *   Change: Change ` ```text ` to ` ```tsx ` on lines 120 and 145.

### Issue 12 [`egm-style`] - Severity: Low
*   **Affected Scope:** Lines 25-26, 103-104 (The Problem; CUJ 2)
*   **Discrepancy Description:** "pages that look like they belong to an earlier, unfinished version of the product" / "reading as an unstyled, unfinished page" are subjective quality judgments; the factual details nearby already carry the point.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Easy de-editorializing pass, no loss of meaning.
*   ***Proposed Edit:***
    *   Location: Line 25-26
    *   Change: Replace "pages that look like they belong to an earlier, unfinished version of the product" with "pages that lack the shared header and Card treatment every other page already has".
    *   Location: Line 103-104
    *   Change: Replace "instead of reading as an unstyled, unfinished page relative to `/pricing` or `/how-it-works`" with "instead of lacking the Card/header treatment `/pricing` and `/how-it-works` already have".

### Issue 13 [`egm-style`] - Severity: Low
*   **Affected Scope:** Line 33
*   **Discrepancy Description:** "the one genuinely new UI primitive" — filler intensifier.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial wording fix.
*   ***Proposed Edit:***
    *   Location: Line 33
    *   Change: "the one genuinely new UI primitive this wave needs" → "the one new UI primitive this wave needs".

### Issue 14 [`egm-style`] - Severity: Low
*   **Affected Scope:** Line 237
*   **Discrepancy Description:** "no native-`<input>` default-styling quirks to fight" is colloquial, inconsistent with the document's dry register.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial wording fix, matches the document's own more precise phrasing elsewhere (line 163).
*   ***Proposed Edit:***
    *   Location: Line 237
    *   Change: "no native-`<input>` default-styling quirks to fight" → "no native default-styling inconsistencies to override".

### Issue 15 [`egm-style`] - Severity: Low
*   **Affected Scope:** Lines 16-17
*   **Discrepancy Description:** "visibly jarring" is an evaluative lead-in ahead of an already well-supported, specific list.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial wording fix.
*   ***Proposed Edit:***
    *   Location: Line 16-17
    *   Change: "is visibly jarring — plain text blocks next to one `Card` here, a flat FAQ stack there, two unstyled native checkboxes on `/notifications`, no shared header treatment anywhere" → "has no shared visual treatment: plain text blocks next to one `Card` here, a flat FAQ stack there, two unstyled native checkboxes on `/notifications`, no shared header anywhere".
