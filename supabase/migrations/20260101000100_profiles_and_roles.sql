-- Milestone 2: identity & authorization foundation.
-- profiles: user-editable public/account info, one row per auth.users row.
-- user_roles: privileged role assignments, NOT user-writable.
-- owner_profiles: additional public-facing info for the owner role.

create extension if not exists citext;

create type public.account_status as enum ('active', 'suspended', 'deleted');
create type public.app_role as enum ('renter', 'owner', 'moderator', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  phone text,
  phone_verified_at timestamptz,
  avatar_path text,
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'User-editable account/profile data. Role is intentionally NOT here — see user_roles.';

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

comment on table public.user_roles is
  'Authorization-sensitive role assignments. Writable only by service_role '
  '(see Edge Functions / admin tooling) — never by the user themselves.';

create table public.owner_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  business_name text,
  bio text,
  public_phone text,
  public_contact_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_roles_user_id_idx on public.user_roles (user_id);

-- updated_at bookkeeping -----------------------------------------------------

create or replace function public.set_updated_at() returns trigger
  language plpgsql
  as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger owner_profiles_set_updated_at
  before update on public.owner_profiles
  for each row execute function public.set_updated_at();

-- Helper: does the current JWT's user hold a given role? Used throughout
-- later migrations' RLS policies instead of repeating the subquery.
create or replace function public.has_role(target_role public.app_role) returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = target_role
    );
  $$;

-- On signup, create the profile row and default 'renter' role automatically.
-- This runs as the trigger owner (postgres), bypassing RLS, which is exactly
-- the kind of privileged write that must never be reachable from the client.
create or replace function public.handle_new_user() returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    insert into public.profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

    insert into public.user_roles (user_id, role)
    values (new.id, 'renter');

    return new;
  end;
  $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security ----------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.owner_profiles enable row level security;

-- profiles: anyone authenticated can read public-safe columns of any
-- profile (needed to show an owner's display name on a listing); only the
-- owning user may update their own row, and they may never change their id.
create policy profiles_select_authenticated on public.profiles
  for select
  to authenticated
  using (true);

create policy profiles_update_self on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_insert_self on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- user_roles: a user may read their own roles (to drive UI), but only
-- service_role (trusted server-side code) may write. No insert/update/delete
-- policy exists for `authenticated`, so RLS denies those by default even if
-- someone crafts a direct PostgREST request.
create policy user_roles_select_self on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid());

create policy user_roles_select_moderation on public.user_roles
  for select
  to authenticated
  using (public.has_role('admin') or public.has_role('moderator'));

-- owner_profiles: public read (renters need to see owner info on listings);
-- only the owner themself may write, and only once they actually hold the
-- 'owner' role (role is still server-assigned, not self-granted).
create policy owner_profiles_select_all on public.owner_profiles
  for select
  to authenticated
  using (true);

create policy owner_profiles_upsert_self on public.owner_profiles
  for insert
  to authenticated
  with check (user_id = auth.uid() and public.has_role('owner'));

create policy owner_profiles_update_self on public.owner_profiles
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Table-level grants: RLS policies above are the real authorization; these
-- grants just let PostgREST's `anon`/`authenticated` roles reach the table
-- at all (matches what Supabase configures by default for exposed schemas).
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant select on public.user_roles to authenticated;
grant select, insert, update on public.owner_profiles to authenticated;
grant select on public.owner_profiles to anon;

-- service_role is trusted server-side code (Edge Functions, admin tooling);
-- it bypasses RLS by role attribute, but still needs table-level grants.
grant all on public.profiles, public.user_roles, public.owner_profiles to service_role;

