-- Milestone 6: identity/property verification and private document
-- storage. Verification evidence is NOT proof of legal ownership — see
-- the public-facing badge copy in lib/config/brand.ts and the Safety
-- page — this schema only tracks a review *process*, never a guarantee.

create type public.verification_status as enum (
  'submitted', 'under_review', 'verified', 'rejected', 'needs_more_info', 'expired'
);

create table public.identity_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.verification_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users (id),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index identity_verification_requests_user_id_idx on public.identity_verification_requests (user_id, created_at desc);

create trigger identity_verification_requests_set_updated_at
  before update on public.identity_verification_requests
  for each row execute function public.set_updated_at();

create table public.property_verification_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  applicant_id uuid not null references auth.users (id) on delete cascade,
  status public.verification_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users (id),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index property_verification_requests_property_id_idx on public.property_verification_requests (property_id, created_at desc);

create trigger property_verification_requests_set_updated_at
  before update on public.property_verification_requests
  for each row execute function public.set_updated_at();

-- Private document metadata. Exactly one of the two FKs is set — this is
-- a deliberate denormalization (two nullable FKs + a check) rather than a
-- polymorphic "owner_type/owner_id" pair, so the foreign key constraints
-- stay real and enforceable instead of merely documented.
create table public.private_verification_documents (
  id uuid primary key default gen_random_uuid(),
  identity_request_id uuid references public.identity_verification_requests (id) on delete cascade,
  property_request_id uuid references public.property_verification_requests (id) on delete cascade,
  storage_path text not null,
  original_filename text,
  content_type text not null,
  file_size_bytes integer not null,
  uploaded_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint private_verification_documents_one_parent check (
    (identity_request_id is not null)::int + (property_request_id is not null)::int = 1
  )
);

create index private_verification_documents_identity_idx on public.private_verification_documents (identity_request_id);
create index private_verification_documents_property_idx on public.private_verification_documents (property_request_id);

-- Row Level Security -----------------------------------------------------

alter table public.identity_verification_requests enable row level security;
alter table public.property_verification_requests enable row level security;
alter table public.private_verification_documents enable row level security;

create policy identity_verification_select_self on public.identity_verification_requests
  for select
  to authenticated
  using (user_id = auth.uid() or public.has_role('admin') or public.has_role('moderator'));

create policy identity_verification_insert_self on public.identity_verification_requests
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Only service_role (the Milestone 7 moderation review action) may change
-- status/reviewer fields — no authenticated UPDATE policy exists at all,
-- so an applicant cannot mark their own submission "verified".

create policy property_verification_select on public.property_verification_requests
  for select
  to authenticated
  using (
    applicant_id = auth.uid()
    or public.has_role('admin') or public.has_role('moderator')
    or exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  );

create policy property_verification_insert on public.property_verification_requests
  for insert
  to authenticated
  with check (
    applicant_id = auth.uid()
    and exists (select 1 from public.properties p where p.id = property_id and (p.owner_id = auth.uid() or p.manager_id = auth.uid()))
  );

-- private_verification_documents: visible only to the applicant who owns
-- the parent request (via either FK) or moderation roles — never public,
-- never joined into a property's public API response.
create policy private_verification_documents_select on public.private_verification_documents
  for select
  to authenticated
  using (
    public.has_role('admin') or public.has_role('moderator')
    or exists (
      select 1 from public.identity_verification_requests r
      where r.id = identity_request_id and r.user_id = auth.uid()
    )
    or exists (
      select 1 from public.property_verification_requests r
      where r.id = property_request_id and r.applicant_id = auth.uid()
    )
  );

create policy private_verification_documents_insert on public.private_verification_documents
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      exists (
        select 1 from public.identity_verification_requests r
        where r.id = identity_request_id and r.user_id = auth.uid()
      )
      or exists (
        select 1 from public.property_verification_requests r
        where r.id = property_request_id and r.applicant_id = auth.uid()
      )
    )
  );

-- Grants -------------------------------------------------------------------

grant select, insert on public.identity_verification_requests to authenticated;
grant select, insert on public.property_verification_requests to authenticated;
grant select, insert on public.private_verification_documents to authenticated;
grant all on public.identity_verification_requests, public.property_verification_requests,
  public.private_verification_documents to service_role;

-- Public badge helpers: return only a boolean, never the underlying
-- request/document rows, so a property's public API response can safely
-- include "is this owner identity-verified" without ever exposing
-- verification internals.
create or replace function public.is_identity_verified(target_user uuid) returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select exists (
      select 1 from public.identity_verification_requests
      where user_id = target_user and status = 'verified'
    );
  $$;

create or replace function public.is_property_verified(target_property uuid) returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select exists (
      select 1 from public.property_verification_requests
      where property_id = target_property and status = 'verified'
    );
  $$;

grant execute on function public.is_identity_verified(uuid) to anon, authenticated;
grant execute on function public.is_property_verified(uuid) to anon, authenticated;
