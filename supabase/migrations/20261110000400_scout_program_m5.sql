-- Scout Program Milestone 5: field verification (spec §9), feature-
-- flagged off by default. Builds on Milestone 2's scouts/scout_areas.
--
-- Scope cut, stated plainly: this migration and its admin review
-- action give the schema and review path a real home, but the
-- scout-facing submission flow (in-app camera capture, on-device photo
-- compression, optional location, the full checklist UI) is NOT built
-- in this milestone -- it's a real, separate feature on the scale of
-- the existing identity/property verification upload flows
-- (lib/verification/service.ts), and the flag defaults to off, so
-- there is no live surface that needs it yet. Flip
-- SCOUT_FIELD_VERIFICATION_ENABLED on (lib/validation/scouts.ts) only
-- once that submission flow is actually built.

create type public.scout_visit_report_status as enum ('pending', 'approved', 'rejected');

create table public.scout_visit_reports (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts (id),
  listing_id uuid not null references public.properties (id),
  checklist jsonb not null default '{}'::jsonb,
  notes text,
  photo_paths text[] not null default '{}',
  status public.scout_visit_report_status not null default 'pending',
  reviewed_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index scout_visit_reports_scout_id_idx on public.scout_visit_reports (scout_id, created_at desc);
create index scout_visit_reports_listing_id_idx on public.scout_visit_reports (listing_id);

comment on table public.scout_visit_reports is
  'Scout field-visit reports (spec §9) -- feature-flagged off by '
  'default (SCOUT_FIELD_VERIFICATION_ENABLED in lib/validation/scouts.ts). '
  'An approved report lets a listing show the exact wording "A scout '
  'visited this property on [date]" -- it does NOT mean ownership was '
  'verified unless identity/property verification evidence was also '
  'reviewed separately. An owner-paid "field-verified" add-on would '
  'change the "owners are always free" rule and must stay behind its '
  'own explicit, separate decision -- nothing in this schema enables '
  'charging an owner for this.';

-- Row Level Security -------------------------------------------------------

alter table public.scout_visit_reports enable row level security;

create policy scout_visit_reports_select_own on public.scout_visit_reports
  for select
  to authenticated
  using (scout_id in (select id from public.scouts where user_id = auth.uid()));

create policy scout_visit_reports_select_admin on public.scout_visit_reports
  for select
  to authenticated
  using (public.has_role('admin') or public.has_role('moderator'));

-- Grants ---------------------------------------------------------------

grant select on public.scout_visit_reports to authenticated;
grant all on public.scout_visit_reports to service_role;
