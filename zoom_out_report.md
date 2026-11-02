# Stage 5: Initial Zoom Out Review

**Target**: `docs/designs/wave-9-page-polish-design.md` (full document, lines 1–434)
**Reviewer**: egm-zoom-out (fresh-context Goldfish)

## Overall assessment

The document passes the Zoom Out standard. It explicitly invokes the "rule
of three" to reject extracting a `PageHeader` component, explicitly rejects
a custom div-based toggle in favor of the simplest native-HTML solution,
scopes itself to presentation-only changes with an exhaustive Non-Goals
list, and resolves both open questions by citing precedent already in the
codebase rather than inventing new treatments.

The reviewer independently verified the two load-bearing reuse claims
against the actual codebase (not just taking the doc's word for it):
*   No `Switch`/`Toggle`/styled-checkbox component already exists anywhere
    in the codebase — the new primitive is genuinely novel, not a
    reinvention.
*   The warning-block markup is indeed identical to
    `components/layout/LegalPageShell.tsx`'s pattern.

## Findings

1.  **Severity: Nit** — Section "2. New `Switch` component" (lines
    141–187). The optional `wrapperClassName` prop is speculative API
    surface: no call site in Section 3 or the `/notifications`
    implementation entry actually needs non-default spacing. Mild YAGNI
    echo. Consider dropping it until a real call site needs it.

2.  **Severity: Nit** — Technical Plan §1–2 (lines 114–187) vs. Detailed
    Implementation Plan §1 (lines 307–323). The exact Tailwind/CSS class
    strings for the shared header and `Switch` are written out in full
    twice. Reasonable for a styling-only wave where the markup *is* the
    deliverable, but duplicating it risks drift if only one copy is
    updated later. Consider having the Detailed Implementation Plan
    reference the Technical Plan's code block instead of re-describing it.

3.  **Severity: Nit (positive-control note, no action needed)** — Goals
    (lines 38–42) list `Badge`/`Reveal` among components this wave "uses,"
    while Section 3's per-page breakdown doesn't call either out by name.
    Verified this isn't a gap: `Badge` is already in active, untouched use
    on `/account`, so the Goals line accurately describes the existing
    component vocabulary the wave stays within. No change needed.

## Non-findings worth recording

*   No premature optimization, caching, async work, or speculative
    abstraction was introduced.
*   No architectural dead-end: deferring `PageHeader` extraction and
    choosing the native-`<input>` `Switch` both keep future options open.
*   Root-problem focus is sound: the design targets the actual
    visual-inconsistency problem rather than patching a symptom, and
    explicitly defers unrelated temptations (the `/about` stat strip, a
    `/safety` warning-block "fix") once code search showed no real problem
    existed there.
*   Non-Goals and Alternatives Considered sections are a strong example of
    scope discipline.

**No Blocker or Major findings. Ready to proceed to the next stage.**
