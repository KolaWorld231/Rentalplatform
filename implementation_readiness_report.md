# Stage 9: Implementation Readiness Test (Round 1)

**Target**: `docs/designs/wave-9-page-polish-design.md`
**Audit range (DetailedRange)**: lines 304–435
**Reviewers**: egm-implementation-readiness (`implementation-readiness-standard`),
egm-codebase-details (`implementation-readiness-standard`), egm-style (own persona standard)

## Consolidated Findings

### 🟡 Major

**impl-1-1** — Lines 121–133 (template) / item #2 (lines 326–339). The
shared header template renders the `eyebrow` slot unconditionally, unlike
`supportingLine` which is explicitly guarded with `{supportingLine && (...)}`.
Item #2 states `/notifications` needs "no eyebrow," but the plan never
says whether to delete the `<p>` block entirely, add a conditional, or
leave it empty — three visually different, equally defensible readings.
Violates the Zero-Decision Rule.

**impl-1-2** — Lines 312–321 vs. 326–339. `wrapperClassName` is introduced
on `Switch` specifically to solve per-call-site spacing, but its only
actual call site (`/notifications`, both instances) never specifies a
value or states "pass nothing." The two `Switch` instances must stack
inside the existing `flex flex-col gap-2` form; the implementer is left
to independently decide whether spacing needs correcting.

**codebase-1-1** — Lines 361–370 (`/safety` item), tracing back to the
Open Questions resolution (lines 78–83). The claim that `/safety`'s
warning block "already matches the established warning-block pattern" is
inaccurate: `LegalPageShell.tsx` and `app/checkout/mock/page.tsx` use
`rounded-[var(--radius-md)] bg-warning-100 p-3 text-xs text-warning-500`,
but the actual `/safety` warning block (`app/safety/page.tsx:35`) uses
`p-4 text-sm` — different padding and text size. The decision to leave
this block untouched rests on a false premise. *(Author's note: this is
a genuine error from my own earlier drafting, not a reviewer
misunderstanding — the Open Questions resolution should not have
asserted an exact match without checking the specific utility values.)*

**codebase-1-2** — Lines 408–415 (Verification Plan, Unit Tests). States
"nothing in the auth/messaging/subscription test files" should be
affected, but `tests/unit/` contains no files scoped to auth or
messaging (`vitest.config.ts` confirms the actual suite: `mock-payment-
provider.test.ts`, `listing-completeness.test.ts`, `validation.test.ts`,
`format.test.ts`). Names test categories that don't exist in the suite.

### 🟢 Nit

**impl-1-3** — Lines 334–336. The second `Switch` call site (`email_
enabled`) is left as "the `email_enabled` equivalent" rather than
spelling out the exact label string, inconsistent with how fully the
first instance (`in_app_enabled`) is spelled out.

**impl-1-4** — Lines 354–370. Items #4–#7 describe existing markup in
prose ("the current bare `<h1>`") without quoting the literal JSX being
replaced, unlike item #2 which quotes the literal input markup verbatim.

**codebase-1-3** — Lines 399–406. "Following the same format as waves
1–8's entries" doesn't quote the actual heading convention in
`docs/IMPLEMENTATION_STATUS.md` (`## Conversion-focused redesign, wave N
(post-Milestone-8)`), relying on the implementer to infer it.

**codebase-1-4** — Lines 329–330. Describes adding the header "above the
existing unread-count/'Mark all read' row," but `app/notifications/
page.tsx` has no unread-count element — only a conditionally-rendered
"Mark all read" button. Minor mischaracterization; doesn't change the
correctness of the edit itself.

**style-1-1** — Lines 329–330. "already self-explanatory" is a
subjective quality judgment rather than a verifiable criterion.

**style-1-2** — Lines 403–406. "actually complete — not before" —
"actually" is filler; "not before" redundantly restates "once ...
complete."

## Round 1 Clean-Round Assessment

Not clean: four Majors unresolved (0 Blockers). All three requested
reviewers ran successfully (no "not run" status).
