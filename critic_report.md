# Stage 7: Critic Review (Round 1)

**Target**: `docs/designs/wave-9-page-polish-design.md`
**Audit range (FeatureRange)**: lines 1–302
**Reviewers**: egm-design (`feature-spec-standard`), egm-structural
(`feature-spec-standard`), egm-style (own persona standard)

## Consolidated Findings

### 🔴 Blocker

**design-1-1** — Lines 245–246, 263. "The Comprehension lens" / "the Zoom
Out lens" are cited as the deciding authority for rejecting both
alternatives, but neither term is defined anywhere in the document or in
`Additional Resources`. The underlying engineering reasoning (native
accessibility semantics; rule-of-three threshold) is sound on its own, but
is presented as validated by an unverifiable external process a reader
cannot inspect. *(Same issue independently surfaced by Stage 6
Comprehension, finding #2.)*

**design-1-2** — Lines 40–41 vs. 189–230. Goals state the wave uses
`CardClay`, `Button`/`buttonVariants`, `Badge`, and `Reveal`, but the
per-page Technical Plan and Detailed Implementation Plan only ever apply
`CardClay` and the new `Switch`. `Button`, `Badge`, and `Reveal` are never
shown landing on any page. *(Same issue independently surfaced by Stage 6
Comprehension, finding #1.)*

**structural-1-1** — Lines 7–9, 272–274, 289–291, 301. Horizontal-rule
dividers are applied inconsistently between `##` sections — some
equal-weight H2 boundaries get a rule, others don't, with no stated rule
for when one applies. Misleads a reader about actual section boundaries.

### 🟡 Major

**design-1-3** — Lines 61–63 vs. the rest of the document. `DocumentUploader`
appears in Non-Goals with no stated connection to any of the five in-scope
pages; nothing in Overview, Problem, CUJs, or the per-page table mentions
document upload. Reads as copy-paste residue from an unrelated wave.
*(Same issue independently surfaced by Stage 6 Comprehension, finding #3
— now confirmed by two independent reviewers across two stages. Author's
note: this is a genuine authoring error, not a documentation gap — the
line should simply be removed.)*

**design-1-4** — Lines 274–287 (entire document). No dedicated "Risks &
Mitigations" section per the feature-spec-standard. The closest proxy
(Non-Functional Requirements) doesn't address the one real risk specific
to the new `Switch` primitive: the `peer-focus-visible:` focus treatment
explicitly diverges from the existing `.focus-ring` utility used
everywhere else in the app (lines 183–187 note this divergence but never
assess its risk) — a potential visual-consistency regression with no
stated mitigation.

**structural-1-2** — Line 291. `### Additional Resources` is an H3 with no
parent H2 — every other top-level section in range is H2. Structurally
reads as a subsection of "Non-Functional Requirements" (the preceding H2),
misrepresenting its actual status as a sibling top-level section.

**structural-1-3** — Lines 36–66. Non-Goals' `DocumentUploader` bullet
(line 61) also breaks the section's internal parallel-construction
pattern: every other Non-Goals bullet traces to a Goal, CUJ, or Technical
Plan item elsewhere in the document; this one is an orphan reference.
*(Structural echo of design-1-3/Stage-6-finding-3 — same root cause, not
a separate fix.)*

### 🟢 Nit

**design-1-5** — Lines 245–250. "Blocker-severity risk" borrows this
review pipeline's own severity vocabulary inside the artifact under
review, blurring document content with review-process framing.

**design-1-6** — Lines 211–219 vs. 134–139. The `/notifications` existing
`className="h-4 w-4"` claim lacks the file-citation rigor shown for the
shared-header claim a few paragraphs earlier.

**structural-1-4** — Lines 38–66. Minor punctuation/clause-structure
drift between Goals and Non-Goals bullets.

**structural-1-5** — Line 106. "Technical Plan (Architecture)" diverges
from the standard's exact suggested heading ("Proposed Architecture"),
though the parenthetical preserves traceability.

**structural-1-6** — Lines 120, 145, 191. Code fences use the generic
` ```text ` hint for blocks that are actually JSX (`tsx`) — cosmetic only.

**style-1-1** — Lines 25–26. "pages that look like they belong to an
earlier, unfinished version of the product" is a subjective quality
judgment; the factual observations later in the same paragraph (plain
text, unstyled checkboxes) already carry the point without the
evaluative framing.

**style-1-2** — Lines 103–104. Same "unstyled, unfinished" evaluative
pattern repeated in CUJ 2; recommend a single pass to de-editorialize
both instances together with style-1-1.

**style-1-3** — Line 33. "the one *genuinely* new UI primitive" — filler
intensifier, no verifiable content added.

**style-1-4** — Line 237. "no native-`<input>` default-styling quirks to
fight" — colloquial phrasing inconsistent with the document's otherwise
dry register (contrast with line 163's more precise phrasing).

**style-1-5** — Lines 16–17. "visibly jarring" is an evaluative lead-in
ahead of an already well-supported, specific, verifiable list.

## Round 1 Clean-Round Assessment

Not clean: two Blockers (design-1-1, structural-1-1) and four Majors
unresolved. All three requested reviewers ran successfully (no "not run"
status).
