-- Scout Program Milestone 2: admin review queue + probation. Extends
-- the Milestone 1 schema (20261109000500_scout_program_m1.sql) --
-- applications landed in applied/waitlisted with nothing to move them
-- further; this adds the review workflow and the scouts table itself.
-- Referral attribution, earnings/payouts, field verification, and
-- mobile parity remain later milestones (see docs/SCOUT_PROGRAM.md).

-- scout_application_status gains the review-workflow states. Postgres
-- requires ALTER TYPE ... ADD VALUE to run outside the migration's
-- own later statements that might reference the new value in the same
-- transaction in older PG versions; Supabase's migration runner applies
-- each file in its own transaction, so these are kept as the first
-- statements in this file, before anything uses them.
alter type public.scout_application_status add value 'under_review';
alter type public.scout_application_status add value 'rejected';
alter type public.scout_application_status add value 'approved';

create type public.scout_status as enum ('probation', 'active', 'suspended', 'removed', 'resigned');
create type public.scout_reference_outcome as enum ('reached_positive', 'reached_concern', 'not_reached');
create type public.scout_verification_step_type as enum ('completeness_check', 'reference_check', 'identity_check', 'interview');
create type public.scout_verification_step_status as enum ('pending', 'passed', 'failed', 'skipped');

alter table public.scout_applications
  add column reapply_after timestamptz,
  add column decision_reason text,
  add column decided_by uuid references auth.users (id),
  add column decided_at timestamptz;

alter table public.scout_references
  add column contacted_at timestamptz,
  add column outcome public.scout_reference_outcome,
  add column notes text,
  add column reviewed_by uuid references auth.users (id);

create table public.scout_verification_steps (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.scout_applications (id) on delete cascade,
  step_type public.scout_verification_step_type not null,
  status public.scout_verification_step_status not null default 'pending',
  reviewer_id uuid references auth.users (id),
  notes text,
  -- Identity-check evidence upload is explicitly out of scope for this
  -- milestone (private-bucket + signed-URL plumbing is a real chunk of
  -- its own work, and the spec marks the identity check itself as
  -- "optional per setting") -- this column exists per the spec's own
  -- data model but nothing in M2 writes to it yet.
  document_storage_path text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index scout_verification_steps_application_id_idx on public.scout_verification_steps (application_id);

create table public.scouts (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: a scout is promoted to probation here before M3's own
  -- account-linking work exists -- an admin can review and approve an
  -- application without the applicant having signed up for an account
  -- yet. M3 fills this in when the scout dashboard/login is built.
  user_id uuid references auth.users (id),
  application_id uuid not null references public.scout_applications (id),
  status public.scout_status not null default 'probation',
  approved_at timestamptz not null default now(),
  probation_ends_at timestamptz not null,
  referral_code text not null,
  display_name text not null,
  area_id uuid not null references public.scout_areas (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index scouts_application_id_key on public.scouts (application_id);
create unique index scouts_referral_code_key on public.scouts (referral_code);
create unique index scouts_user_id_key on public.scouts (user_id) where user_id is not null;

create trigger scouts_set_updated_at
  before update on public.scouts
  for each row execute function public.set_updated_at();

comment on table public.scouts is
  'Promoted scout applications (status=probation on creation). '
  'Referral attribution (owner_referrals) and the scout dashboard are '
  'Milestone 3; earnings/payouts are Milestone 4.';

-- Row Level Security -------------------------------------------------------

alter table public.scout_verification_steps enable row level security;
alter table public.scouts enable row level security;

create policy scout_verification_steps_select_admin on public.scout_verification_steps
  for select
  to authenticated
  using (public.has_role('admin') or public.has_role('moderator'));

create policy scouts_select_admin on public.scouts
  for select
  to authenticated
  using (public.has_role('admin') or public.has_role('moderator'));

-- Forward-compatible: once M3 links a scout to their own account
-- (user_id set), they can read their own row -- no client write grant
-- yet, since every scout table write still goes through service-role
-- admin actions in this milestone.
create policy scouts_select_self on public.scouts
  for select
  to authenticated
  using (user_id = auth.uid());

-- Grants ---------------------------------------------------------------

grant select on public.scout_verification_steps, public.scouts to authenticated;
grant all on public.scout_verification_steps, public.scouts to service_role;
