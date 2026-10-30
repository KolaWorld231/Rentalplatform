-- Milestone 3: property marketplace — listings, images, favourites, views,
-- reports, and the search indexes backing them.

create type public.liberia_county as enum (
  'Bomi', 'Bong', 'Gbarpolu', 'Grand Bassa', 'Grand Cape Mount',
  'Grand Gedeh', 'Grand Kru', 'Lofa', 'Margibi', 'Maryland',
  'Montserrado', 'Nimba', 'River Cess', 'River Gee', 'Sinoe'
);

create type public.property_category as enum (
  'apartment', 'house', 'room', 'shared_room', 'studio', 'store', 'shop',
  'office', 'warehouse', 'short_term', 'land'
);

create type public.property_usage as enum ('residential', 'commercial', 'land');

create type public.rental_frequency as enum ('monthly', 'quarterly', 'yearly', 'nightly');

create type public.listing_status as enum (
  'draft', 'pending_review', 'published', 'temporarily_unavailable',
  'pending_rental', 'rented', 'rejected', 'suspended', 'archived'
);

create type public.availability_status as enum (
  'available', 'pending_rental', 'rented', 'temporarily_unavailable'
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  manager_id uuid references auth.users (id),
  title text not null check (char_length(title) between 3 and 120),
  slug text not null unique,
  description text not null default '',
  category public.property_category not null,
  usage_type public.property_usage not null,

  rent_amount numeric(12, 2) not null check (rent_amount >= 0),
  currency text not null default 'USD',
  rental_frequency public.rental_frequency not null default 'monthly',

  county public.liberia_county not null,
  city text not null check (char_length(city) between 1 and 80),
  community text,
  landmark text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),

  bedrooms smallint check (bedrooms is null or bedrooms >= 0),
  bathrooms smallint check (bathrooms is null or bathrooms >= 0),
  floor_area_sqm numeric(8, 2) check (floor_area_sqm is null or floor_area_sqm >= 0),
  furnished boolean,
  has_electricity boolean,
  has_water boolean,
  has_air_conditioning boolean,
  has_parking boolean,
  has_security boolean,
  road_accessible boolean,

  advance_rent_amount numeric(12, 2) check (advance_rent_amount is null or advance_rent_amount >= 0),
  security_deposit_amount numeric(12, 2) check (security_deposit_amount is null or security_deposit_amount >= 0),
  other_fees_amount numeric(12, 2) check (other_fees_amount is null or other_fees_amount >= 0),
  other_fees_description text,
  lease_duration_months smallint,
  move_in_date date,

  listing_status public.listing_status not null default 'draft',
  availability_status public.availability_status not null default 'available',
  moderation_reason text,

  view_count integer not null default 0,
  favourite_count integer not null default 0,

  published_at timestamptz,
  last_availability_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_owner_id_idx on public.properties (owner_id);
create index properties_search_idx on public.properties (listing_status, county, category, rent_amount);
create index properties_city_idx on public.properties (city);
create index properties_fts_idx on public.properties
  using gin (to_tsvector('english', title || ' ' || description));

create trigger properties_set_updated_at
  before update on public.properties
  for each row execute function public.set_updated_at();

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  storage_path text not null,
  position smallint not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index property_images_one_cover_idx
  on public.property_images (property_id)
  where is_cover;

create index property_images_property_id_idx on public.property_images (property_id, position);

create table public.property_favourites (
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table public.property_views (
  id bigint generated always as identity primary key,
  property_id uuid not null references public.properties (id) on delete cascade,
  viewer_id uuid references auth.users (id),
  viewer_fingerprint text,
  viewed_at timestamptz not null default now()
);

create index property_views_property_id_idx on public.property_views (property_id, viewed_at);
-- View-count inflation is dampened in the application layer
-- (services/properties.ts checks for an existing same-day row for this
-- viewer/property before inserting) rather than a DB constraint, because a
-- timezone-aware "same day" unique index requires an immutable expression
-- Postgres won't accept directly on `timestamptz`.

create type public.report_status as enum ('open', 'investigating', 'resolved', 'dismissed');
create type public.report_reason as enum (
  'fake_listing', 'misleading_price', 'already_rented', 'unauthorized_representative',
  'impersonation', 'harassment', 'fraudulent_payment_request', 'suspicious_message', 'other'
);

create table public.property_reports (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'open',
  assigned_moderator_id uuid references auth.users (id),
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index property_reports_property_id_idx on public.property_reports (property_id);
create index property_reports_status_idx on public.property_reports (status);

-- Row Level Security -----------------------------------------------------

alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.property_favourites enable row level security;
alter table public.property_views enable row level security;
alter table public.property_reports enable row level security;

-- properties: published listings are public; an owner/manager can always
-- see and edit their own regardless of status; moderators/admins see all.
create policy properties_select_published on public.properties
  for select
  to anon, authenticated
  using (listing_status = 'published');

create policy properties_select_own on public.properties
  for select
  to authenticated
  using (owner_id = auth.uid() or manager_id = auth.uid());

create policy properties_select_moderation on public.properties
  for select
  to authenticated
  using (public.has_role('admin') or public.has_role('moderator'));

create policy properties_insert_owner on public.properties
  for insert
  to authenticated
  with check (owner_id = auth.uid() and public.has_role('owner'));

create policy properties_update_owner on public.properties
  for update
  to authenticated
  using (owner_id = auth.uid() or manager_id = auth.uid())
  with check (owner_id = auth.uid() or manager_id = auth.uid());

create policy properties_delete_owner on public.properties
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- property_images: visible wherever the parent property is visible;
-- writable only by that property's owner/manager.
create policy property_images_select on public.property_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and (p.listing_status = 'published' or p.owner_id = auth.uid() or p.manager_id = auth.uid())
    )
  );

create policy property_images_write_owner on public.property_images
  for all
  to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.owner_id = auth.uid() or p.manager_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.owner_id = auth.uid() or p.manager_id = auth.uid())
    )
  );

-- property_favourites: strictly private to the favouriting user.
create policy property_favourites_owner on public.property_favourites
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- property_views: insert-only from the client (any visitor may record a
-- view of a published property); reading aggregate counts happens via the
-- `properties.view_count` column, not this raw table, so only the
-- property's own owner/manager or moderation roles can read the raw log.
create policy property_views_insert on public.property_views
  for insert
  to anon, authenticated
  with check (
    exists (select 1 from public.properties p where p.id = property_id and p.listing_status = 'published')
  );

create policy property_views_select_owner on public.property_views
  for select
  to authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.owner_id = auth.uid() or p.manager_id = auth.uid())
    )
    or public.has_role('admin') or public.has_role('moderator')
  );

-- property_reports: any authenticated user may file one; only the
-- reporter, the assigned moderator, or admin/moderator roles may read it.
-- Nobody but service_role (moderation tooling) may update status/notes —
-- enforced by having no UPDATE policy for `authenticated` here.
create policy property_reports_insert on public.property_reports
  for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy property_reports_select on public.property_reports
  for select
  to authenticated
  using (reporter_id = auth.uid() or public.has_role('admin') or public.has_role('moderator'));

-- Grants -------------------------------------------------------------------

grant select on public.properties to anon;
grant select, insert, update, delete on public.properties to authenticated;
grant select on public.property_images to anon;
grant select, insert, update, delete on public.property_images to authenticated;
grant insert on public.property_views to anon;
grant select, insert on public.property_views to authenticated;
grant select, insert, update, delete on public.property_favourites to authenticated;
grant select, insert on public.property_reports to authenticated;

grant all on public.properties, public.property_images, public.property_favourites,
  public.property_views, public.property_reports to service_role;

-- Favourite/view counters are maintained by triggers so the UI can read a
-- cheap denormalized count instead of a COUNT(*) on every card render.
create or replace function public.sync_favourite_count() returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    if tg_op = 'INSERT' then
      update public.properties set favourite_count = favourite_count + 1 where id = new.property_id;
    elsif tg_op = 'DELETE' then
      update public.properties set favourite_count = greatest(favourite_count - 1, 0) where id = old.property_id;
    end if;
    return null;
  end;
  $$;

create trigger property_favourites_sync
  after insert or delete on public.property_favourites
  for each row execute function public.sync_favourite_count();

create or replace function public.sync_view_count() returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    update public.properties set view_count = view_count + 1 where id = new.property_id;
    return null;
  end;
  $$;

create trigger property_views_sync
  after insert on public.property_views
  for each row execute function public.sync_view_count();

-- Publishing bookkeeping: stamp published_at the first time a listing
-- transitions into 'published', and refresh last_availability_confirmed_at
-- whenever availability_status changes.
create or replace function public.sync_property_status_timestamps() returns trigger
  language plpgsql
  as $$
  begin
    if new.listing_status = 'published' and old.listing_status <> 'published' then
      new.published_at = now();
    end if;
    if new.availability_status <> old.availability_status then
      new.last_availability_confirmed_at = now();
    end if;
    return new;
  end;
  $$;

create trigger properties_status_timestamps
  before update on public.properties
  for each row execute function public.sync_property_status_timestamps();
