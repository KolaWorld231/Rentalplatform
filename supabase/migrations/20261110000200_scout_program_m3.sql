-- Scout Program Milestone 3: referral attribution (scout -> owner
-- credit) + the scout dashboard's data. Builds on Milestone 2
-- (20261110000100_scout_program_m2.sql) for the `scouts` table.
--
-- Scope cut, stated plainly: of the spec's three referral-capture
-- mechanisms (referral code/link, scout-assisted listing invitation,
-- manual attribution claim), this milestone builds only the first --
-- a scout's referral code captured at owner registration (password
-- signup only; phone/WhatsApp signup referral capture is deferred,
-- same kind of scope cut this project already makes elsewhere).
-- Scout-assisted listing invitations (a scout starting a listing on an
-- owner's behalf) are a separate, larger workflow left for a later
-- milestone. Collusion/device-fingerprint fraud detection (spec S11) is
-- also not built here -- only the simple self-referral check (a scout
-- cannot be credited for their own account).

create type public.owner_referral_source as enum ('code', 'invite', 'manual');
create type public.owner_referral_status as enum ('pending_confirmation', 'confirmed', 'declined');

create table public.owner_referrals (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts (id),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  source public.owner_referral_source not null,
  status public.owner_referral_status not null default 'pending_confirmation',
  confirmed_by_owner_at timestamptz,
  -- Credit only becomes payable once the owner is admin-verified and
  -- has a published, confirmed-available listing -- Milestone 4's
  -- earnings job reads this flag; nothing in M3 sets it to true (no
  -- earnings computation exists yet), but the column is part of the
  -- spec's own data model so M4 doesn't need another migration just
  -- to add it.
  is_payable boolean not null default false,
  attributed_at timestamptz not null default now(),
  -- Once true, no further UPDATE should change scout_id/owner_user_id
  -- (enforced at the Server Action layer in this milestone -- "first
  -- verified referral wins" per the spec; a real admin-only
  -- re-attribution override, also per spec, is not built here).
  attribution_locked boolean not null default false,
  created_at timestamptz not null default now()
);

-- "An owner has exactly one referred_by_scout_id, set once" -- enforced
-- here as a hard uniqueness constraint on owner_user_id, not just an
-- application-level check.
create unique index owner_referrals_owner_user_id_key on public.owner_referrals (owner_user_id);
create index owner_referrals_scout_id_idx on public.owner_referrals (scout_id);

comment on table public.owner_referrals is
  'Scout -> owner referral attribution. Created pending_confirmation at '
  'owner signup (password method only, see migration header); the '
  'owner explicitly confirms or declines afterwards -- declining blocks '
  'credit permanently (attribution_locked is not set, so this stays '
  'auditable, but status=declined is treated as final in the UI).';

-- Row Level Security -------------------------------------------------------

alter table public.owner_referrals enable row level security;

-- A scout reads only their own referrals (their dashboard) -- never
-- another scout's, and never a renter/owner who isn't the referred
-- owner themselves.
create policy owner_referrals_select_own_scout on public.owner_referrals
  for select
  to authenticated
  using (scout_id in (select id from public.scouts where user_id = auth.uid()));

-- The referred owner can see (and, via a Server Action using the
-- service-role client, confirm/decline) their own single referral row.
create policy owner_referrals_select_own_owner on public.owner_referrals
  for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy owner_referrals_select_admin on public.owner_referrals
  for select
  to authenticated
  using (public.has_role('admin') or public.has_role('moderator'));

-- Grants ---------------------------------------------------------------

grant select on public.owner_referrals to authenticated;
grant all on public.owner_referrals to service_role;
