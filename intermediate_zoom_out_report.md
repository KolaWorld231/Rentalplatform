# Stage 8: Intermediate Zoom Out Review

**Target**: `docs/designs/wave-9-page-polish-design.md` (full file, post-Stage-7 fixes)
**Reviewer**: egm-zoom-out (fresh-context Goldfish)
**Scope**: Evaluating Stage 7's remediation edits for new scope creep,
premature abstraction, or complexity — not re-litigating Stage 5/6
settled matters.

## Findings

1.  **Severity: Nit** — Lines 184–188 vs. 281–286. The new NFR sentence
    about the `Switch` component's `peer-focus-visible:` divergence from
    `.focus-ring` duplicates reasoning already fully spelled out in the
    Technical Plan's `Switch` notes. Minor instance of the exact
    redundant-restatement problem the document itself calls out and
    rejects elsewhere (the `/about` stat-strip rationale). One of the two
    explanations could cross-reference the other instead of repeating it.

2.  **Severity: Nit** — Lines 283–286 vs. 416–420. The new NFR
    verification requirement (a side-by-side visual check of `Switch`'s
    focus ring against `.focus-ring` elsewhere) isn't mirrored as a line
    item in the Verification Plan's accessibility spot-checks. Not scope
    creep, but a bookkeeping gap — this specific check could silently get
    skipped since it's stated once in NFR with no corresponding checklist
    entry.

## No scope creep / premature abstraction / complexity found

Each Stage 7 change was checked against the codebase and the Zoom Out
standard:
*   Removing the stray `DocumentUploader` reference — pure deletion, no
    complexity added.
*   Narrowing Goals to `CardClay` only — verified accurate: `CardClay`
    already exists in `components/ui/Card.tsx` from a prior wave but isn't
    yet applied to any page; `/about` has no Card/CardClay usage today, so
    this is the only new per-page usage, matching the narrowed claim
    exactly. A scope reduction, not an addition.
*   Replacing undefined "lens" terminology with plain engineering
    reasoning — the result is concise and grounded, introduces no new
    mechanism, and if anything strengthens the case against Alternative B.
*   The NFR focus-ring addition is verification-only — no new code,
    component, or shared focus-ring token/utility introduced just to
    paper over one exception.
*   Heading promotion, rule normalization, code-fence language fixes, the
    file citation (verified accurate against `app/notifications/page.tsx`),
    and wording nits are all cosmetic/traceability fixes with zero
    architectural or scope impact.

**No Blocker or Major findings. Ready to proceed to Stage 9.**
