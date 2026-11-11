-- Scout Program: admin-configurable settings. The spec's own header
-- says "All amounts, caps, and periods below are defaults stored in
-- platform_settings, not constants in code" -- this gives the Scout
-- Program its own settings table (narrower than a general-purpose
-- platform_settings system, which doesn't exist in this codebase and
-- would be a much larger, separate build) so bounty amount, revenue-
-- share %, share duration, and the monthly payout cap are admin-edited
-- in the console rather than hardcoded in lib/validation/scouts.ts.
-- Payout provider choice and tax/contractor treatment are recorded
-- here too, as plain admin-entered text -- they're policy decisions
-- the project owner settles, not something this migration computes or
-- enforces; no payout API is integrated regardless of what's typed
-- here (see scout_payouts' own comment, Milestone 4).

-- Single-row settings table (no "id" the app ever needs to pick
-- between) -- enforced with a check constraint on a constant key
-- rather than a separate "is this the one row" convention.
create table public.scout_program_settings (
  id boolean primary key default true,
  bounty_amount_usd numeric(8, 2) not null,
  share_percent numeric(5, 2) not null,
  share_duration_months integer not null,
  monthly_cap_usd numeric(8, 2),
  payout_provider text,
  payout_method_notes text,
  tax_treatment_notes text,
  updated_by uuid references auth.users (id),
  updated_at timestamptz not null default now(),
  constraint scout_program_settings_singleton check (id)
);

-- Seeded with the spec's own illustrative defaults (§8's table) --
-- explicitly a starting point, editable immediately in
-- /admin/scouts/settings, not a figure anyone should treat as final
-- just because it's the seed value.
insert into public.scout_program_settings (id, bounty_amount_usd, share_percent, share_duration_months)
values (true, 2.00, 10.00, 6);

create trigger scout_program_settings_set_updated_at
  before update on public.scout_program_settings
  for each row execute function public.set_updated_at();

-- Row Level Security -------------------------------------------------------

alter table public.scout_program_settings enable row level security;

-- Readable by any authenticated user -- a scout's own dashboard should
-- be able to show the real current bounty amount rather than a
-- guess, per the spec's "show earnings only after approval... amounts
-- depend on verified activity and can change" rule. Never writable
-- except by service_role (the admin Server Action re-checks the
-- caller's role before writing, same pattern as every other admin
-- action in this codebase).
create policy scout_program_settings_select_all on public.scout_program_settings
  for select
  to authenticated
  using (true);

-- Grants ---------------------------------------------------------------

grant select on public.scout_program_settings to authenticated;
grant all on public.scout_program_settings to service_role;
