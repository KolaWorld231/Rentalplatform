# Scout Program (working name: "Key Scouts")

**Status:** Build-ready rules for Claude Code. Extends `docs/MASTER_PROJECT_SPEC.md`; if the two
conflict, ask the owner before changing the master spec.

**Name:** "Key Scouts" is a placeholder. Read the program name from `packages/brand-config`;
never hard-code it. Never call scouts "agents" in the UI.

**All amounts, caps, and periods below are defaults stored in `platform_settings`, not constants
in code.**

> **Note (231Rentals repo):** this spec was written against a `packages/brand-config` +
> `packages/core` monorepo layout. This codebase's actual equivalents are `lib/config/brand.ts`
> (brand identity) and `lib/validation/*.ts` (Zod schemas) — translate the references below when
> this program is actually implemented, don't assume the paths exist as written. Nothing in this
> program has been built yet; this file is the spec only.

## 1. Purpose

Scouts are vetted local youth who bring verified property owners with real listings onto the
platform. They replace the informal-agent role with an accountable, auditable one: scouts never
charge renters or owners, are never paid by renters, and are paid by the platform.

## 2. Non-negotiable rules

1. Scouts **cannot** charge owners or renters any fee. Reporting such behaviour leads to removal.
2. Owners still list, receive, and reply for free. Renters still pay US$5 / 30 days. (Unchanged.)
3. Scouts are paid **only** for verified supply (approved owner + live, confirmed listing).
   **Never** for leases or "successful rentals".
4. The platform holds no rent, deposits, or escrow. Scouts must never collect money for the
   platform or for owners.
5. Scouts get **no access** to renter data, owner private contact details, messages, or payment
   records. They see only their own referrals' status.
6. Payouts are computed **server-side only** from verified database events.
7. Every status change, approval, rejection, payout, and clawback is written to `audit_logs`.
8. Do not invent testimonials, earnings claims, or scout counts on public pages. Show real
   numbers only, or none.

## 3. Capped, application-based enrolment

Scouts apply through a public form. There is no open sign-up.

- Seats are limited **per area** (county → city → neighbourhood). Setting: `scout_seat_cap` per
  area, default **ten scouts total in the pilot, across two to three neighbourhoods**.
- When an area is full, applicants join a **waitlist** for that area (ordered by application date,
  adjustable by admin with a recorded reason).
- Admin opens extra seats in an area only when its metrics justify it (see §10). Seat changes are
  audited.
- Applicants are told clearly: applying does not guarantee acceptance or earnings.

### 3.1 Scout lifecycle states

```
applied → under_review → (rejected | waitlisted | approved_probation) → active → (suspended | removed | resigned)
```

`reapply_after` date can block reapplication after rejection (default 90 days, configurable).

A `waitlisted` applicant moves to `approved_probation` only when a seat opens and admin confirms.

## 4. Public application form

**Entry points:** footer link "Become a scout" on every public page (web) and in the app's
account/more menu (mobile), plus a landing page `/scouts` that explains the program honestly.

**Route:** `/scouts` (info) and `/scouts/apply` (form). Works signed-out. On submit, if the email
is not registered, offer to create a lightweight account; the application attaches to the account
after email/phone verification.

### 4.1 Fields

| Field | Rules |
|---|---|
| Full name | required |
| Phone | required, phone verification (OTP) required before review |
| Email | optional but recommended; verification if given |
| Age confirmation | must confirm they are 18+ (do not store date of birth; store confirmation + timestamp only) |
| County / city / neighbourhood(s) they know | required; select from the managed area list |
| How well they know the area | short answer, 500 char max |
| Experience (property, community, sales, field work) | short answer, optional |
| Two references (name, relationship, phone) | required; admin may contact them |
| Smartphone model / data access | required (to confirm they can use the scout tools) |
| Why do you want to be a scout? | required, 500 char max |
| Agreement to Scout Code of Conduct | required checkbox, versioned (store version + timestamp) |
| Consent to verification checks | required checkbox |

Optional ID evidence is **not** collected at application. Collect only at the verification stage
(§5), into private storage.

### 4.2 Form requirements

- Server-side Zod validation (schemas in `packages/core`), rate limit (per IP and per phone),
  CAPTCHA or equivalent, duplicate detection (same phone/email).
- Plain English, short labels, mobile-first, data-light, accessible (labels, errors, focus).
- Confirmation screen with a **reference number** and the honest message: "Applications are
  reviewed in the order received. Seats are limited by area."
- In-app notification and optional email/SMS on status changes.

## 5. Verification workflow (admin, web only for v1)

**Admin queue:** Scout Applications, filterable by area, status, and date.

Steps per applicant (each recorded with reviewer, timestamp, notes):

1. Phone verified (system).
2. Application completeness and duplicate check.
3. Reference check (two references contacted; outcome recorded: reached / not reached / positive
   / concern).
4. Identity check (optional per setting): upload to private bucket, short-lived signed URLs,
   visible only to authorised reviewers, with a retention/deletion rule documented in
   `SECURITY_AND_PRIVACY.md`.
5. Short interview or briefing call (outcome recorded).
6. Decision: approve to probation / waitlist / reject, with reason.

A verification badge on a scout profile must describe exactly what was checked (e.g. "Phone
verified", "References checked"). Never show a generic "Verified" badge.

## 6. Probation (default 30 days)

- First 30 days after approval: every listing the scout submits requires full admin review and a
  spot-check (call the owner and/or review the evidence) before publication.
- Probation ends only by explicit admin promotion to `active`. Criteria (all configurable):
  minimum approved listings, no confirmed fake listings, no upheld reports, code-of-conduct
  acknowledged.
- Active scouts: random spot-checks at a configurable rate (default 20% of submissions).
- Weak performers are removed or replaced from the waitlist. Always record the reason.

## 7. Referral capture (scout → owner credit)

Every owner brought in by a scout must be credited to that scout.

### 7.1 Mechanisms (support all three)

1. **Scout referral code / link:** each active scout has a unique code (e.g. `?ref=CODE`) and a
   shareable link. The code is stored on the owner's profile at sign-up (first-touch, with a
   cookie/session store on web and deep link param on mobile).
2. **Scout-assisted listing:** a scout can start a listing invitation for an owner (name, phone,
   area). The owner receives an invitation to claim the account. The owner must confirm they are
   the owner/manager; **the scout never receives the owner's password or acts as the owner after
   hand-over.**
3. **Manual attribution request:** if neither was used, the scout can submit a claim ("I referred
   this owner") with the owner's phone. Admin reviews; owner confirmation is required before
   credit.

### 7.2 Attribution rules

- **First verified referral wins.** An owner has exactly one `referred_by_scout_id`, set once.
- Changing attribution is admin-only, with reason, audited.
- A scout **cannot refer themselves**, their household, or accounts sharing the same phone/device
  fingerprint. Block and flag.
- Owner must confirm in-app: "I was introduced by [scout display name]" (can be declined; a
  decline blocks credit and raises a flag if the scout used the code).
- Credit becomes payable only when the owner is verified (admin-approved) and has at least one
  published listing confirmed available for the qualifying period.

### 7.3 Scout dashboard (web + mobile)

Shows only the scout's own data:

- Referral code and link, with share button.
- Referred owners: first name or business name, status (invited / joined / verified / listing
  live / listing confirmed / paid / rejected), area.
- Earnings: pending, approved, paid, reversed, with the reason for each state.
- Application/probation status, seat/area info, code of conduct, help and report-a-problem.
- **Never** show renter identities, owner phone/email, messages, or per-renter payment details.

## 8. Earnings model (all values configurable in `platform_settings`)

Defaults (illustrative, to be validated against real costs):

| Item | Default | Trigger |
|---|---|---|
| Verified-listing bounty | US$2 | Owner verified by admin and listing published and still confirmed available after 30 days and no upheld reports |
| Revenue share | 10% of net subscription revenue, 6 months from owner verification | Split equally across distinct owners a renter contacted during that subscription period; credited to each owner's referring scout |
| Field-verification visit fee (optional, if enabled) | US$2–3 | Scout completes a documented property visit (see §9) |

Rules:

- Compute payouts in a **server-side job** from `payments`, `subscriptions`, `conversations`,
  `listings`, and verification records. Idempotent; re-running never double-pays.
- **Clawback:** reverse pending/paid amounts for listings later proven fake or fraudulent; record
  in the ledger.
- Show earnings only after approval, never as a promise. UI copy must say amounts depend on
  verified activity and can change.
- Monthly cap per scout (default configurable) to limit gaming.
- Payout method: configurable (mobile money, bank, cash collection point) **after provider
  validation**. Build a payout ledger and an admin "mark paid" workflow with a payment reference;
  do not integrate a payout API without confirmed provider capability.
- Scouts are contractors, not employees. Tax, contractor, and mobile-money payout rules need
  local legal/tax review before launch. Do not state conclusions.

## 9. Optional: field verification (feature flag `scout_field_verification`, default off)

- Scout visits a property and submits a visit report: photos taken in-app (on-device compression,
  EXIF handled per privacy policy), optional location, owner-presence confirmation, checklist,
  notes.
- Admin reviews the report. Only then may the listing show a "Field visited" label, worded exactly
  ("A scout visited this property on [date]"). It does not mean ownership has been verified unless
  ownership evidence was reviewed.
- Any owner-paid "field-verified" add-on would change the "owners are always free" rule. Keep it
  behind a flag and do not enable without the owner's decision.

## 10. Seat-opening metrics (admin overview, per area)

Open more seats in an area only when, for the last 30 days (thresholds configurable):

- Verified listings in the area ≥ target (default 300 for paid launch, lower for pilot).
- Owner reply rate ≥ target (default 60%).
- Fake/upheld-report rate ≤ target.
- Listing reconfirmation rate ≥ target.
- Existing scouts are above a minimum output, otherwise replace before expanding.

## 11. Anti-fraud and abuse controls

- Cap scouts per area; known, small group is auditable.
- Duplicate-owner and duplicate-listing detection (phone, address text, photo hash).
- Scout-owner **collusion** flags: many listings from owners with shared phone/device, listings
  never receiving enquiries, owners who never reply.
- **Fake-renter farming** flags: new renters who subscribe and message only one scout's owners;
  unusual conversation bursts. Payout is held pending review.
- Rate limits on invitations and referral claims.
- Suspension freezes payouts pending review. Removal records a reason; users can appeal (policy to
  be drafted with legal review).
- Scouts must never ask owners or renters for money. Easy "report a scout" action on listings and
  owner profiles.

## 12. Data model additions (Postgres via Supabase)

Create migrations with RLS enabled on all tables.

- `scout_applications`: id, user_id nullable, full_name, phone, phone_verified_at, email,
  age_confirmed_at, area_ids, area_knowledge, experience, motivation, device_info,
  conduct_version, conduct_accepted_at, consent_checks_at, status, waitlist_position,
  reapply_after, created_at, updated_at.
- `scout_references`: id, application_id, name, relationship, phone, contacted_at, outcome, notes,
  reviewed_by.
- `scout_verification_steps`: id, application_id, step_type, status, reviewer_id, notes,
  document_storage_path (private), completed_at.
- `scouts`: id, user_id, application_id, status (probation/active/suspended/removed/resigned),
  approved_at, probation_ends_at, referral_code (unique), display_name, areas, created_at,
  updated_at.
- `scout_areas` / `area_seats`: area_id, seat_cap, seats_filled, is_open.
- `owner_referrals`: id, scout_id, owner_user_id (unique), source (code/invite/manual), status,
  confirmed_by_owner_at, attributed_at, attribution_locked, created_at.
- `scout_invitations`: id, scout_id, owner_name, owner_phone, token_hash, status, expires_at,
  created_at.
- `scout_earnings_ledger` (append-only): id, scout_id, owner_referral_id, type
  (bounty/share/visit_fee/adjustment/clawback), amount, currency, status
  (pending/approved/paid/reversed), source_ref, reason, created_at.
- `scout_payouts`: id, scout_id, amount, currency, method, provider_reference, status, paid_by,
  paid_at.
- `scout_visit_reports` (if field verification enabled): id, scout_id, listing_id, checklist,
  notes, photo_paths, status, reviewed_by, created_at.

Add `referred_by_scout_id` access via `owner_referrals`, not as a freely editable profile column.
Users must not be able to edit attribution.

**RLS:** applicants/scouts read only their own rows; admins/moderators per least privilege;
ledger and payouts readable by the owning scout and admins, writable only by server functions;
verification documents only by authorised reviewers.

## 13. Backend operations (callable identically by web and mobile)

Implement as Postgres RPC and/or Edge Functions: `submit_scout_application`,
`verify_scout_phone`, `review_scout_application`, `promote_scout`, `create_scout_invitation`,
`claim_owner_referral`, `confirm_referral_as_owner`, `compute_scout_earnings` (scheduled),
`reverse_scout_earning`, `mark_payout_paid`. No privileged logic only in Next.js route handlers.

## 14. Screens and parity

| Screen | Web | Mobile | Notes |
|---|---|---|---|
| Footer "Become a scout" link + `/scouts` info | Required | Link in More/Account | Honest copy, no invented earnings |
| Scout application form | Required | Required | Same schema from `packages/core` |
| Application status check (by reference + phone OTP) | Required | Required | |
| Scout dashboard (referrals, earnings) | Required | Required | Own data only |
| Share referral link/code | Required | Required | Deep link carries `ref` |
| Scout-assisted owner invitation | Required | Required | |
| Owner confirms "introduced by scout" | Required | Required | During owner onboarding |
| Admin: applications queue, review, seats, ledger, payouts, flags | Required | **Web only** (documented exception in `PARITY.md`) | |

Update `PARITY.md`, `PRODUCT_REQUIREMENTS.md`, `DATA_MODEL.md`, `SECURITY_AND_PRIVACY.md`,
`ACCEPTANCE_CRITERIA.md`, and `BUILD_PROGRESS.md` with every change.

## 15. Tests required

- Applicant cannot see other applications; scout cannot read renter, owner-contact, message, or
  payment data.
- Applications blocked when the area is full are waitlisted, not approved; seat caps enforced
  server-side.
- Phone-unverified applications cannot enter review.
- Probation: scout's listings are not auto-published; promotion requires admin.
- Referral: code sets `owner_referrals` once; second attribution attempt is rejected;
  self-referral blocked; owner decline blocks credit.
- Earnings: bounty only after verified owner + published + 30-day confirmed listing; duplicate
  job run does not double-pay; clawback reverses correctly; revenue share splits across distinct
  owners contacted.
- Scout cannot edit ledger, payouts, or attribution; admin changes are audited.
- Fake-renter-farming and collusion flags hold payouts.
- E2E: public footer link → application → admin approves to probation → scout shares code →
  owner joins and confirms → listing approved → earnings pending → release after qualifying
  period.

## 16. Open decisions (do not decide silently; record in `BUILD_PROGRESS.md`)

1. Final program name and branding.
2. Bounty amount, share %, share duration, monthly cap.
3. Whether optional owner-paid field verification is allowed (changes the "owners always free"
   rule).
4. Payout provider and method; contractor/tax treatment (needs local advice).
5. Whether identity documents are collected from scouts, and retention period.
6. Pilot areas and initial seat numbers (default: about ten scouts, two to three neighbourhoods).
7. Appeals process and Code of Conduct text (draft for legal review; do not claim legal
   compliance).

## 17. Scout Code of Conduct (draft, for legal review)

Scouts must: be honest about every listing; never charge any fee; never guarantee availability, a
viewing, or a lease; never pressure owners or renters; never post fake or duplicate listings;
protect private information; never share another person's contact details; report suspected
scams; accept audits and spot-checks; stop immediately if suspended.
