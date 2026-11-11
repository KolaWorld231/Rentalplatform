-- Scout Program ("Rental HunterZ"), Milestone 1: data model + public
-- application intake only. See docs/SCOUT_PROGRAM.md for the full spec --
-- everything past "applied"/"waitlisted" (admin review, probation,
-- referral attribution, earnings, payouts, field verification) is a
-- later milestone and has no tables here yet.
--
-- Applicants have no account at this stage, so phone verification uses
-- its own pre-account challenge table (scout_application_otp_challenges),
-- modeled on whatsapp_otp_challenges (20261108000200_whatsapp_otp.sql) --
-- not the native auth.users-bound OTP flow in lib/auth/phone-actions.ts.
-- No SMS provider is configured yet ([auth.sms] in supabase/config.toml
-- is dormant) -- same credential-blocker as payments and WhatsApp OTP;
-- see lib/scouts/scout-sms.ts for the honest-failure stub.

create type public.scout_application_status as enum ('applied', 'waitlisted', 'withdrawn');
create type public.scout_reference_relationship as enum ('family', 'employer', 'community_leader', 'other');

-- Admin-curated pilot areas -- not derived from properties.county/city,
-- which are free text today with no seat-cap concept. Seeded below with
-- clearly-labeled placeholders; swap for real pilot neighbourhoods once
-- the project owner has them.
create table public.scout_areas (
  id uuid primary key default gen_random_uuid(),
  county public.liberia_county not null,
  neighborhood text not null,
  seat_cap integer not null default 1 check (seat_cap >= 0),
  seats_filled integer not null default 0 check (seats_filled >= 0),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index scout_areas_county_neighborhood_key on public.scout_areas (county, neighborhood);

insert into public.scout_areas (county, neighborhood, seat_cap) values
  ('Montserrado', 'PILOT AREA 1 (placeholder -- replace with a real neighbourhood)', 3),
  ('Montserrado', 'PILOT AREA 2 (placeholder -- replace with a real neighbourhood)', 3),
  ('Bong', 'PILOT AREA 3 (placeholder -- replace with a real neighbourhood)', 2);

create table public.scout_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 80),
  phone text not null,
  email text,
  age_confirmed boolean not null,
  age_confirmed_at timestamptz not null,
  area_id uuid not null references public.scout_areas (id),
  area_knowledge text not null check (char_length(area_knowledge) <= 500),
  experience text check (experience is null or char_length(experience) <= 500),
  smartphone_model text not null,
  has_data_access boolean not null,
  motivation text not null check (char_length(motivation) <= 500),
  code_of_conduct_version text not null,
  code_of_conduct_accepted_at timestamptz not null,
  verification_consent_at timestamptz not null,
  phone_verified_at timestamptz not null,
  status public.scout_application_status not null default 'applied',
  reference_code text not null default '',
  created_at timestamptz not null default now()
);

-- No unique constraint on phone -- duplicate rejection is an app-level
-- check (see submit_scout_application below), not a hard DB constraint,
-- so a future re-apply-after-withdrawal milestone doesn't need a
-- migration to loosen it.
create index scout_applications_phone_idx on public.scout_applications (phone);
create unique index scout_applications_email_key on public.scout_applications (lower(email)) where email is not null;
create index scout_applications_area_id_idx on public.scout_applications (area_id);
create unique index scout_applications_reference_code_key on public.scout_applications (reference_code) where reference_code <> '';

comment on table public.scout_applications is
  'Public Scout Program applications (Milestone 1: intake only -- no '
  'review workflow yet; a later milestone adds admin review that '
  'transitions status out of applied/waitlisted).';

create table public.scout_references (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.scout_applications (id) on delete cascade,
  full_name text not null,
  relationship public.scout_reference_relationship not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create index scout_references_application_id_idx on public.scout_references (application_id);

create table public.scout_application_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index scout_application_otp_challenges_phone_idx
  on public.scout_application_otp_challenges (phone, created_at desc);
create index scout_application_otp_challenges_expires_at_idx
  on public.scout_application_otp_challenges (expires_at);

comment on table public.scout_application_otp_challenges is
  'Pre-account phone verification for Scout Program applicants. '
  'Hash-only (never the raw code), 10-minute TTL, 5-attempt cap. Unlike '
  'whatsapp_otp_challenges, a verified row is kept (not deleted) so a '
  'later submit_scout_application call -- a separate request -- can '
  'still see verified_at.';

-- Milestone 1's own applicant submission has no admin/authenticated
-- actor -- allow a null actor_id for system/public events, rather than
-- a synthetic fake "system" auth.users row or skipping the audit entry
-- for the one event this milestone most needs logged.
alter table public.admin_audit_logs alter column actor_id drop not null;

-- Submits a full application atomically: duplicate check, area seat-cap
-- decision, the application + reference rows, and the seats_filled
-- increment all happen in one transaction (this function's own), so two
-- concurrent submissions to the same almost-full area can't both read
-- the same seats_filled and both win a seat -- the `for update` row lock
-- below serializes them. Called only from lib/scouts/actions.ts via the
-- service-role client (see the execute grant at the bottom); RLS on the
-- underlying tables denies every other caller regardless.
create or replace function public.submit_scout_application(
  p_full_name text,
  p_phone text,
  p_email text,
  p_area_id uuid,
  p_area_knowledge text,
  p_experience text,
  p_smartphone_model text,
  p_has_data_access boolean,
  p_motivation text,
  p_code_of_conduct_version text,
  p_phone_verified_at timestamptz,
  p_references jsonb
)
returns table (id uuid, status public.scout_application_status, reference_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_area record;
  v_status public.scout_application_status;
  v_id uuid;
  v_reference_code text;
  v_ref jsonb;
begin
  if exists (select 1 from public.scout_applications sa where sa.phone = p_phone) then
    raise exception 'duplicate_phone';
  end if;
  if p_email is not null and exists (select 1 from public.scout_applications sa where lower(sa.email) = lower(p_email)) then
    raise exception 'duplicate_email';
  end if;

  select * into v_area from public.scout_areas where scout_areas.id = p_area_id for update;
  if v_area.id is null then
    raise exception 'invalid_area';
  end if;

  if v_area.is_open and v_area.seats_filled < v_area.seat_cap then
    v_status := 'applied';
  else
    v_status := 'waitlisted';
  end if;

  insert into public.scout_applications (
    full_name, phone, email, age_confirmed, age_confirmed_at, area_id, area_knowledge,
    experience, smartphone_model, has_data_access, motivation, code_of_conduct_version,
    code_of_conduct_accepted_at, verification_consent_at, phone_verified_at, status
  ) values (
    p_full_name, p_phone, p_email, true, now(), p_area_id, p_area_knowledge,
    p_experience, p_smartphone_model, p_has_data_access, p_motivation, p_code_of_conduct_version,
    now(), now(), p_phone_verified_at, v_status
  )
  returning scout_applications.id into v_id;

  v_reference_code := 'SC-' || upper(substr(replace(v_id::text, '-', ''), 1, 8));
  update public.scout_applications set reference_code = v_reference_code where scout_applications.id = v_id;

  for v_ref in select * from jsonb_array_elements(p_references)
  loop
    insert into public.scout_references (application_id, full_name, relationship, phone)
    values (v_id, v_ref->>'fullName', (v_ref->>'relationship')::public.scout_reference_relationship, v_ref->>'phone');
  end loop;

  if v_status = 'applied' then
    update public.scout_areas set seats_filled = seats_filled + 1 where scout_areas.id = p_area_id;
  end if;

  return query select v_id, v_status, v_reference_code;
end;
$$;

revoke all on function public.submit_scout_application(
  text, text, text, uuid, text, text, text, boolean, text, text, timestamptz, jsonb
) from public;
grant execute on function public.submit_scout_application(
  text, text, text, uuid, text, text, text, boolean, text, text, timestamptz, jsonb
) to service_role;

-- Row Level Security -------------------------------------------------------
-- No anon/authenticated policy grants anyone client-side write access on
-- any of these tables -- every write (OTP request/verify, the RPC above)
-- goes through a Server Action using the service-role client, matching
-- the whatsapp_otp_challenges/admin_audit_logs precedent of service-role-
-- only writes. Forward-compatible admin-select policies are added now
-- (cost nothing) even though the review queue itself is a later milestone.

alter table public.scout_areas enable row level security;
alter table public.scout_applications enable row level security;
alter table public.scout_references enable row level security;
alter table public.scout_application_otp_challenges enable row level security;

create policy scout_applications_select_admin on public.scout_applications
  for select
  to authenticated
  using (public.has_role('admin'));

create policy scout_references_select_admin on public.scout_references
  for select
  to authenticated
  using (public.has_role('admin'));

-- Grants ---------------------------------------------------------------

grant select on public.scout_applications, public.scout_references to authenticated;
grant all on public.scout_areas, public.scout_applications, public.scout_references, public.scout_application_otp_challenges
  to service_role;
