-- Scout Program Milestone 4: earnings ledger + payout ledger.
-- Builds on Milestone 3 (20261110000200_scout_program_m3.sql) for
-- `owner_referrals`.
--
-- Scope cut, stated plainly: only the verified-listing BOUNTY is
-- computed automatically in this milestone -- it's mechanical
-- (owner verified + listing published + confirmed-available 30 days
-- later + no open/investigating report), unlike the revenue-SHARE
-- type, whose split logic (across distinct owners a renter messaged
-- during a subscription period) is real money-math the spec itself
-- flags as an unconfirmed default ("Bounty amount, share %, share
-- duration, monthly cap" is listed as an open decision in the spec's
-- §16 -- not something to compute automatically before the project
-- owner has signed off on the actual numbers). The `share`/`visit_fee`
-- ledger types exist in the schema and the admin "mark paid" workflow
-- handles any ledger type, but nothing in this migration or its
-- Server Actions computes a `share` row yet. No real payout API is
-- integrated either, per the spec's own instruction -- this is a
-- ledger + an admin "mark paid" workflow only.

create type public.scout_earning_type as enum ('bounty', 'share', 'visit_fee', 'adjustment', 'clawback');
create type public.scout_earning_status as enum ('pending', 'approved', 'paid', 'reversed');
create type public.scout_payout_status as enum ('pending', 'paid', 'failed');

-- Append-only: rows are never updated to change amount/type once
-- inserted -- a correction is a new 'adjustment' or 'clawback' row,
-- never an UPDATE of history. Only `status` transitions (and only via
-- the admin actions below).
create table public.scout_earnings_ledger (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts (id),
  owner_referral_id uuid references public.owner_referrals (id),
  type public.scout_earning_type not null,
  amount numeric(8, 2) not null,
  currency text not null default 'USD',
  status public.scout_earning_status not null default 'pending',
  source_ref text,
  reason text,
  created_at timestamptz not null default now()
);

create index scout_earnings_ledger_scout_id_idx on public.scout_earnings_ledger (scout_id, created_at desc);
create index scout_earnings_ledger_status_idx on public.scout_earnings_ledger (status);
-- One bounty per referral, ever -- the idempotency guarantee a
-- re-run of the bounty computation relies on (see
-- lib/scouts/earnings-actions.ts's computeBountyEarningsAction).
create unique index scout_earnings_ledger_bounty_per_referral_key
  on public.scout_earnings_ledger (owner_referral_id)
  where type = 'bounty';

create table public.scout_payouts (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts (id),
  amount numeric(8, 2) not null,
  currency text not null default 'USD',
  method text,
  provider_reference text,
  status public.scout_payout_status not null default 'pending',
  paid_by uuid references auth.users (id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index scout_payouts_scout_id_idx on public.scout_payouts (scout_id, created_at desc);

comment on table public.scout_payouts is
  'Payout record only -- no payout provider API is integrated '
  '(docs/SCOUT_PROGRAM.md: "do not integrate a payout API without '
  'confirmed provider capability"). Marking a payout "paid" here is an '
  'admin attesting that a payment was made out-of-band (mobile money, '
  'bank transfer, cash), with a provider_reference for their own '
  'record-keeping -- it does not trigger any real transfer.';

-- Row Level Security -------------------------------------------------------

alter table public.scout_earnings_ledger enable row level security;
alter table public.scout_payouts enable row level security;

create policy scout_earnings_ledger_select_own on public.scout_earnings_ledger
  for select
  to authenticated
  using (scout_id in (select id from public.scouts where user_id = auth.uid()));

create policy scout_earnings_ledger_select_admin on public.scout_earnings_ledger
  for select
  to authenticated
  using (public.has_role('admin') or public.has_role('moderator'));

create policy scout_payouts_select_own on public.scout_payouts
  for select
  to authenticated
  using (scout_id in (select id from public.scouts where user_id = auth.uid()));

create policy scout_payouts_select_admin on public.scout_payouts
  for select
  to authenticated
  using (public.has_role('admin') or public.has_role('moderator'));

-- Grants ---------------------------------------------------------------

grant select on public.scout_earnings_ledger, public.scout_payouts to authenticated;
grant all on public.scout_earnings_ledger, public.scout_payouts to service_role;
