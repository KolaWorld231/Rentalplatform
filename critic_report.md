# Stage 7: Critic Review (Round 1)

**Target**: `docs/designs/homepage-liveliness-design.md`
**Audit range (FeatureRange)**: lines 1–393
**Reviewers**: egm-design (`feature-spec-standard`), egm-structural
(`feature-spec-standard`), egm-style (own persona standard)

## Consolidated Findings

### 🟡 Major

**design-1-1** — Lines 91–99 (CUJ 2) vs. lines 236–249 (item 6). CUJ 2
states clicking a county chip navigates to `/search?county=<county>`
directly, but the Technical Plan describes chip clicks as setting local
controlled state only, with navigation deferred to form submission. Two
different interactions are specified for the same feature; whichever
section is correct, the other needs to change to match.

**design-1-2** — Lines 172–196 (item 4). The `--hero-drift-base` CSS
variable mechanism is asserted to preserve each tile's static
rotation/position through the drift animation, but nothing in the plan
specifies how that variable gets populated per tile. As literally
described, the `@keyframes` rule's `transform: var(--hero-drift-base,
none) ...` would replace — not merge with — each tile's existing
Tailwind-utility-driven static transform the moment the animation starts,
contradicting the stated goal. Needs either an explicit per-tile inline
`style` step or a corrected mechanism description.

**design-1-3** — Lines 198–214 (item 5), contradicting the "Open
Questions: None outstanding" claim at line 75. Two architecturally
distinct implementation approaches are left as an "or" in the same
paragraph (extracting/duplicating `Reveal`'s internal visibility logic vs.
wrapping each segment in its own `<Reveal>`). This is an unresolved
decision, not a settled one — the document should commit to one approach.
*(Echoes Stage 5's Nit #2 on the same section, now elevated: not just
redundant prose, but a genuine unresolved fork.)*

**design-1-4** — Lines 236–249 and 374–376. The Non-Functional
Requirements section explicitly reasons through county-chip accessibility
and concludes native `<button>` elements need "no extra ARIA wiring" —
true for operability, but chips also get a visually-toggled active state
with no `aria-pressed` (or equivalent) proposed to convey that state to
screen readers. A real gap given the document explicitly reasoned about
accessibility here and still missed it.

**design-1-5** — Lines 227–249 (item 6). Counties are derived with no
upper bound (`[...new Set(...)]`, could be anywhere from 2 to dozens as
the marketplace grows), but the plan only specifies a horizontal chip row
with no wrapping/scroll/cap strategy for a long list, especially on
mobile hero search width. The empty-list case is handled; the
many-counties case isn't.

**structural-1-1** — Lines 1–393 (whole-document scope). No section
titled or scoped to "Risks & Mitigations," a required area per
feature-spec-standard. Risk-relevant content is scattered across
Non-Functional Requirements (rollback, accessibility, performance) and
the implicit bundling risk in Non-Goals/Alternatives — a fresh reader
can't find "what could go wrong and how it's mitigated" as one navigable
unit.

### 🟢 Nit

**design-1-6 / structural / comprehension echo** — Lines 270, 359.
"Comprehension-lens finding," "Zoom-Out-lens priority ranking" cited as
established vocabulary, never defined. *(Independently confirmed by all
three Stage 7 reviewers plus Stage 6 — four independent confirmations of
the same repeat mistake from Wave 9.)*

**design-1-7** — Line 29 vs. 229/251. "Stat strip" used before it's ever
described structurally.

**design-1-8** — Lines 63, 119. "RLS" unexpanded both times it appears.

**design-1-9** — Line 68. "The brief" cited as an authority three times
before the document states what it is (only resolved at lines 386–387).

**design-1-10** — Line 243. "Wave 5" referenced with no definition of
what wave numbering means or where it's documented.

**structural-1-2** — Lines 20, 111. Section heading names drift from the
standard's canonical terms ("The Problem" vs. "Problem Statement";
"Technical Plan (Architecture)" vs. "Proposed Architecture").

**structural-1-3** — Lines 122–280. The clean `### 1.`–`### 7.` numbered
sequence in the Technical Plan is broken by an unnumbered trailing
`### Deferred` subsection that restates content already in Non-Goals.

**structural-1-4** — Lines 178–183. The `@keyframes hero-drift` block is
fenced as ` ```text ` despite being literal CSS; should be ` ```css `.

**structural-1-5** — Lines 386–392. Additional Resources references use
inline code spans instead of markdown links for in-repo file paths.

**style-1-1** — Line 189. "Belt-and-suspenders" is a colloquial idiom
inconsistent with the document's otherwise dry register.

**style-1-2** — Lines 350–351. "genuinely novel, eye-catching" is an
unmeasurable subjective quality judgment, an outlier against the rest of
the Alternatives section's neutral, factual framing.

**style-1-3** — Lines 311–312. "genuinely dynamic scroll-linked effect"
— same subjective-judgment issue as style-1-2.

**style-1-4** — Lines 118–120 and throughout items 1–7. Heavy repetition
of "already" (sometimes 2–3 times per sentence) — serves the document's
reuse-focused point but could be tightened.

**style-1-5** — Lines 251, 264. "Tween" is animation-industry jargon
never defined, though the surrounding sentence makes the mechanism clear
regardless.

## Round 1 Clean-Round Assessment

Not clean: six Majors unresolved (0 Blockers). All three requested
reviewers ran successfully (no "not run" status).
