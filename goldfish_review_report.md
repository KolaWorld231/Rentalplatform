# Goldfish Annotated Review Report (Stage 9, Round 1)

**Target:** `docs/designs/wave-9-page-polish-design.md` (DetailedRange, lines 304–435)

## Prioritized Findings & AI Suggestions

### Issue 1 [`egm-implementation-readiness`] - Severity: Medium
*   **Affected Scope:** Lines 121-133 (template) / item #2 (lines 326-339)
*   **Discrepancy Description:** `eyebrow` slot renders unconditionally, unlike the guarded `supportingLine`; `/notifications` needs "no eyebrow" but the plan never says how to omit it.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Valid — confirmed the template has no conditional around the eyebrow `<p>`. Add one, matching `supportingLine`'s pattern, and state the `/notifications` page passes no `eyebrow` prop so the block doesn't render.
*   ***Proposed Edit:***
    *   Location: Technical Plan §1 template (lines 121-133)
    *   Change: Wrap the eyebrow `<p>` in `{eyebrow && (...)}`, mirroring `supportingLine`.
    *   Location: Detailed Implementation Plan item #2 (`/notifications`, lines 328-330)
    *   Change: State explicitly that no `eyebrow` prop is passed, so the (now-conditional) eyebrow block doesn't render at all.

### Issue 2 [`egm-implementation-readiness`] - Severity: Medium
*   **Affected Scope:** Lines 312-321 (Switch spec) vs. 326-339 (`/notifications`, its only call site)
*   **Discrepancy Description:** `wrapperClassName` is introduced to solve per-call-site spacing, but is never used or specified at its one real call site.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Confirmed against `app/notifications/page.tsx`: the parent `<form className="mt-3 flex flex-col gap-2">` already governs spacing between the two preference rows identically to today's plain `<label>` elements — no additional spacing value is needed. Removing the unused prop (rather than inventing an unused value) also resolves Stage 5's Nit about this same speculative API surface.
*   ***Proposed Edit:***
    *   Location: Detailed Implementation Plan item #1 (`Switch.tsx`, lines 319-321)
    *   Change: Remove "and an optional `wrapperClassName` for layout spacing in each call site." — `Switch`'s props become just the native `InputHTMLAttributes` pass-through plus `label`.

### Issue 3 [`egm-codebase-details`] - Severity: Medium
*   **Affected Scope:** Lines 361-370 (`/safety` item) and Open Questions (lines 78-83)
*   **Discrepancy Description:** The claim that `/safety`'s warning block "already matches" `LegalPageShell`'s pattern is false — `app/safety/page.tsx` uses `p-4 text-sm`, while the established pattern (`LegalPageShell.tsx`, `app/checkout/mock/page.tsx`) uses `p-3 text-xs`.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** I wrote the Open Questions resolution without checking the specific utility values — confirmed error, not a reviewer misunderstanding. The fix is to change the decision: align `/safety`'s warning block to the established `p-3 text-xs` instead of leaving it untouched.
*   ***Proposed Edit:***
    *   Location: Open Questions, `/safety`'s warning block (lines 78-83)
    *   Change: Replace "no change needed... `/safety` already matches it" with a corrected finding: the block uses `p-4 text-sm` instead of the established `p-3 text-xs`; this wave aligns it to match.
    *   Location: Detailed Implementation Plan item #5 (`/safety`, lines 365-370)
    *   Change: Replace "the warning block below it are left exactly as-is (already matches...)" with: the warning block's `p-4 text-sm` classes are changed to `p-3 text-xs` to match the established pattern in `LegalPageShell.tsx`/`app/checkout/mock/page.tsx`; no other change to that block.

### Issue 4 [`egm-codebase-details`] - Severity: Medium
*   **Affected Scope:** Lines 408-415 (Verification Plan, Unit Tests)
*   **Discrepancy Description:** References "auth/messaging/subscription test files" that don't exist in `tests/unit/` (actual contents: `mock-payment-provider.test.ts`, `listing-completeness.test.ts`, `validation.test.ts`, `format.test.ts`).
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Confirmed against `vitest.config.ts` and `tests/unit/`'s actual file listing.
*   ***Proposed Edit:***
    *   Location: Line 413
    *   Change: Replace "nothing in the auth/messaging/subscription test files should be affected" with "nothing in `mock-payment-provider.test.ts`, `listing-completeness.test.ts`, `validation.test.ts`, or `format.test.ts` should be affected".

### Issue 5 [`egm-implementation-readiness`] - Severity: Low
*   **Affected Scope:** Lines 334-336
*   **Discrepancy Description:** Second `Switch` call site left as "the `email_enabled` equivalent" rather than spelled out, unlike the first instance.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Easy to close the gap for consistency with the plan's own precision elsewhere.
*   ***Proposed Edit:***
    *   Location: Line 332-335
    *   Change: Spell out the second instance in full: `<Switch name="email_enabled" defaultChecked={prefs?.email_enabled ?? true} label="Email notifications (sent only if an email provider is configured — see docs/DEPLOYMENT.md)" />`.

### Issue 6 [`egm-implementation-readiness`] - Severity: Low
*   **Affected Scope:** Lines 354-370
*   **Discrepancy Description:** Items #4-#7 describe existing markup in prose without quoting literal JSX, unlike item #2.
*   ***AI Suggestion:*** DECLINE
*   ***Justification:*** The descriptions are accurate and unambiguous (confirmed against source); quoting full JSX for four more pages adds bulk without resolving a real ambiguity. Not worth the churn.

### Issue 7 [`egm-codebase-details`] - Severity: Low
*   **Affected Scope:** Lines 399-406
*   **Discrepancy Description:** Doesn't quote the exact `docs/IMPLEMENTATION_STATUS.md` heading convention.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Confirmed the actual convention via grep; trivial to quote exactly.
*   ***Proposed Edit:***
    *   Location: Line 401-402
    *   Change: "Append a Wave 9 entry following the same format as waves 1–8's entries" → "Append a `## Conversion-focused redesign, wave 9 (post-Milestone-8)` entry, following the same format as waves 1–8's identically-patterned headings".

### Issue 8 [`egm-codebase-details`] - Severity: Low
*   **Affected Scope:** Lines 329-330
*   **Discrepancy Description:** Describes an "unread-count" row that doesn't exist — only a conditional "Mark all read" button exists.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Confirmed against `app/notifications/page.tsx`; trivial correction.
*   ***Proposed Edit:***
    *   Location: Line 329-331
    *   Change: "above the existing unread-count/'Mark all read' row" → "above the existing conditionally-rendered 'Mark all read' button row".

### Issue 9 [`egm-style`] - Severity: Low
*   **Affected Scope:** Lines 329-330
*   **Discrepancy Description:** "already self-explanatory" is a subjective quality judgment.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial wording fix, bundles with Issue 8's edit to the same line.
*   ***Proposed Edit:***
    *   Location: Line 329-330
    *   Change: "no eyebrow needed since the page title is already self-explanatory" → "no `eyebrow` prop passed — the page title is the route name with no ambiguity to disambiguate".

### Issue 10 [`egm-style`] - Severity: Low
*   **Affected Scope:** Lines 403-406
*   **Discrepancy Description:** "actually complete — not before" has a filler intensifier and a redundant clause.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:*** Trivial wording fix.
*   ***Proposed Edit:***
    *   Location: Line 404-405
    *   Change: "once the implementation and its live verification are actually complete — not before" → "once the implementation and its live verification are complete".
