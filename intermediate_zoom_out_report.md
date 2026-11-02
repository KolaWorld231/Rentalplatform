# Stage 8: Intermediate Zoom Out Review

**Target**: `docs/designs/homepage-liveliness-design.md` (full file, post-Stage-7 fixes, 584 lines)
**Reviewer**: egm-zoom-out (fresh-context Goldfish)
**Scope**: Evaluating Stage 7's remediation edits for new scope creep,
premature abstraction, or complexity — not re-litigating Stage 5/6
settled matters.

## Findings

1.  **Major** — "Risks & Mitigations," Bundling-risk bullet (lines
    374–384) vs. NFR Rollback bullet. The new Bundling-risk mitigation
    recommends sequencing commits so a cosmetic item "can be reverted
    independently" — implying multiple, independently-revertible commits.
    This contradicts the pre-existing NFR Rollback bullet a few lines
    below ("Rollback is a single `git revert`"), which the new section
    even cross-references. Two incompatible rollback claims now exist in
    the same document.

2.  **Major** — "Bundling risk" bullet (lines 374–377) — arithmetic/
    categorization error I introduced while writing the new section. The
    bullet claims "five purely decorative... (badge pulse, hover scale,
    hero drift, spine fill-in)" — only four items are actually named —
    "and two functional... (county chips, count-up)," totaling six, not
    the "seven independently-motivated changes" asserted in the same
    sentence. Item 1 ("Listed X ago") is missing from the categorization
    entirely, even though the mitigation sentence immediately after
    correctly includes it ("items (1, 6, 7)").

3.  **Nit** — "Hero-drift CSS correctness" bullet (lines 385–391). This
    narrates a mistake from an earlier draft that no longer exists
    anywhere in the current document — process/audit-trail narration
    rather than a prospective risk of the shipped design, and redundant
    with Technical Plan item 4's own correctness explanation.

4.  **Nit** — "County chip list growth" bullet (lines 392–396). Duplicates
    content already fully stated in Technical Plan item 6 nearly
    verbatim. Could simply point at item 6 instead of restating it.

5.  **Nit** — Line 272. The reduced-motion branch of `CountUp`'s
    description still says "renders `value` immediately with no tween" —
    "tween" wasn't fully scrubbed from this paragraph even though the
    adjacent sentence was fixed to say "animates."

## Items reviewed and found acceptable (no new finding)

*   CUJ 2's corrected click-to-select/submit-to-navigate flow is now
    internally consistent with Technical Plan item 6.
*   The hero-drift `translate`-only CSS fix is simple, correctly scoped,
    and resolves the prior bug without introducing a new abstraction.
*   The `ProcessSteps` commitment to the Reveal-reuse approach stays
    within `ProcessSteps.tsx`, reuses `Reveal` rather than forking it.
*   `aria-pressed` on county chips is a minimal, correctly-placed
    accessibility addition.
*   `flex-wrap` handling bounded at the real 15-county list is
    proportionate — no speculative pagination/scrolling machinery added.
*   Removal of the duplicate "Deferred" subsection reduces redundancy
    with no residual duplicate found.
*   The "-lens"/"RLS"/"the brief"/"Wave N" grounding fixes and the
    Alternatives wording nits all check out — no bare subjective
    judgments remain unsupported.

**Overall**: No scope creep or premature abstraction introduced by
Stage 7's fixes, but the new Risks & Mitigations section (my own
addition) introduced two Majors of its own — a rollback-strategy
contradiction and an arithmetic error — both ironic given the section
exists specifically to improve document rigor.
