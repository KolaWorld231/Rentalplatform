# Stage 6: Comprehension Test

**Target**: `docs/designs/wave-9-page-polish-design.md`
**FeatureRange**: lines 1–302 · **DetailedRange**: lines 303–434
**Reviewer**: egm-comprehension (fresh-context Goldfish, no document standard applied)

## What this proposes

The document proposes a purely visual/presentational polish pass on five
pages (`/about`, `/safety`, `/help`, `/notifications`, `/account`) that
were left out of eight prior "Claymorphism" redesign waves. It wraps
existing content in already-existing components (`CardClay`, `Button`,
`Badge`, `Reveal`) and adds one new shared header shape (copy-pasted, not
extracted into a component) to all five pages. It also introduces one
genuinely new UI primitive, a `Switch` component, to replace two raw
unstyled HTML checkboxes on `/notifications`, built as a CSS-only styled
native `<input type="checkbox">` with no new client-side JavaScript
state. No copy, data-fetching, Server Action signatures, or RLS policies
change — this is explicitly a container/markup-only change, including on
`/account`, where the user's email moves from its own line into the new
header's "supporting line" slot.

## How the existing system works, per this document

Per the document, DomiLink already has a consistent "Claymorphism" visual
language shipped across eight prior waves (homepage, property cards,
pricing, property detail, messaging, dashboards, auth, search, admin),
built from shared primitives in `components/ui/`. The five pages in scope
still function correctly but render with plain, unstyled markup (bare
`<h1>`s, raw checkboxes, flat Cards) that looks visually inconsistent
next to the rest of the app. Each of the five pages already has its own
existing Server Component data-fetching (or none), Server Actions (e.g.,
`updateNotificationPreferencesAction`, `markAllNotificationsReadAction`),
and components (`ProfileForm`, `SupportForm`, existing `Card` usages, a
warning block pattern shared with `LegalPageShell.tsx`), none of which
this design touches.

---

## Findings

1.  **Severity: Major** — Goals (line 41) vs. Technical Plan / Per-page
    changes (lines 189–219) and Detailed Implementation Plan (lines
    305–396). The Goals section commits to using `CardClay`,
    `Button`/`buttonVariants`, `Badge`, `Reveal` across the five pages,
    but the per-page breakdown and the Detailed Implementation Plan only
    ever show `CardClay` and the new `Switch` component being added.
    `Button`/`buttonVariants`, `Badge`, and `Reveal` are never shown
    applied to any specific page, file, or element anywhere in the
    document. The stated goal and the detailed plan don't connect.

2.  **Severity: Major** — Alternatives Considered, Alternative A and B
    (lines 245, 263). The rejection rationale for both alternatives
    invokes "the Comprehension lens" and "the Zoom Out lens" as if they
    were established, authoritative review mechanisms, but neither term
    is defined anywhere in the document. A first-time reader has no way
    to know what these "lenses" are, who or what applies them, or why
    their judgment is binding on the design decision.

3.  **Severity: Major** — Non-Goals (line 61), `DocumentUploader`. Named
    once as something that will not change, but never otherwise
    mentioned, described, or tied to any of the five in-scope pages. None
    of the five pages' descriptions elsewhere in the document mention a
    document-upload feature. A naive reader cannot tell what this
    component does or why it's relevant to this wave at all.

4.  **Severity: Nit** — Open Questions, `/about` stat strip (lines
    72–76). "`lib/config/brand.ts`/`subscriptionPlan` only backs one real
    number" is dense and unexplained — what `subscriptionPlan` is, what
    "backs one real number" means, and why a 3-item stat strip was being
    considered are all assumed knowledge. The "Wave 4" comparison also
    assumes familiarity with a prior wave not recapped here.

5.  **Severity: Nit** — Detailed Implementation Plan, item 4 (`/about`,
    line 357). "the placeholder-legal-name disclaimer" is referenced as
    existing copy being preserved, but what it says or why it's a
    "placeholder" is never explained. Low-impact since the plan only says
    this text carries over unchanged.

6.  **Severity: Nit** — Open Questions, `/safety` warning block (lines
    78–82); Technical Plan step 3 reference (lines 196–200).
    `LegalPageShell.tsx` is cited twice as the source of the "established
    warning-block shape" but is never described. Minor because the given
    CSS classes make the visual pattern self-evident without knowing the
    component's purpose.

No other findings; the Overview/Problem/Goals/Non-Goals/CUJs/Technical
Plan narrative in the FeatureRange is otherwise internally consistent,
and the Detailed Implementation Plan's per-file breakdown tracks clearly
against the Technical Plan it elaborates.
