-- Manual RLS verification for Milestone 3. Run after test_m2_rls.sql's
-- setup (or re-seed): this script creates its own users to stay
-- independent. Run with:
--   su postgres -c "psql -d domilink_dev -f supabase/local-shim/test_m3_rls.sql"

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'owner1@example.test'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'owner2@example.test'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'renter1@example.test');

set role service_role;
insert into public.user_roles (user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'owner');
reset role;

-- Owner 1 creates a draft listing.
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

insert into public.properties (
  id, owner_id, title, slug, category, usage_type, rent_amount, county, city
) values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Cozy 2BR Apartment', 'cozy-2br-apartment-sinkor',
  'apartment', 'residential', 350, 'Montserrado', 'Monrovia'
);

select case when count(*) = 1 then 'PASS: owner can create own listing'
            else 'FAIL: owner can create own listing' end
from public.properties where id = 'bbbbbbbb-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- Owner 2 attempts to create a listing claiming Owner 1 as the owner_id —
-- the WITH CHECK clause (owner_id = auth.uid()) must block it.
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
set request.jwt.claim.role = 'authenticated';

do $$
begin
  begin
    insert into public.properties (
      owner_id, title, slug, category, usage_type, rent_amount, county, city
    ) values (
      'aaaaaaaa-0000-0000-0000-000000000001', 'Hijack Attempt', 'hijack-attempt',
      'apartment', 'residential', 100, 'Montserrado', 'Monrovia'
    );
    raise exception 'FAIL: owner could create a listing claiming another user as owner';
  exception
    when insufficient_privilege then
      raise notice 'PASS: cannot create listing with spoofed owner_id';
  end;
end
$$;

-- A draft listing is not visible to a different user (not yet published).
reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 0 then 'PASS: draft listing hidden from other users'
            else 'FAIL: draft listing hidden from other users' end
from public.properties where id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- Owner 2 cannot update Owner 1's listing.
reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000002';
set request.jwt.claim.role = 'authenticated';

update public.properties set title = 'Hijacked Title'
  where id = 'bbbbbbbb-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;
select case when title = 'Cozy 2BR Apartment' then 'PASS: non-owner cannot update another owner''s listing'
            else 'FAIL: non-owner cannot update another owner''s listing' end
from public.properties where id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- Owner 1 publishes it; now it must be visible to everyone, including anon.
set role service_role;
update public.properties set listing_status = 'published'
  where id = 'bbbbbbbb-0000-0000-0000-000000000001';
reset role;

set role anon;
select case when count(*) = 1 then 'PASS: published listing visible to anon'
            else 'FAIL: published listing visible to anon' end
from public.properties where id = 'bbbbbbbb-0000-0000-0000-000000000001';
reset role;

-- published_at should have been stamped by the trigger.
select case when published_at is not null then 'PASS: published_at stamped on publish'
            else 'FAIL: published_at stamped on publish' end
from public.properties where id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- Renter favourites the listing; favourite_count syncs via trigger.
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

insert into public.property_favourites (user_id, property_id)
values ('aaaaaaaa-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001');

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;
select case when favourite_count = 1 then 'PASS: favourite_count increments via trigger'
            else 'FAIL: favourite_count increments via trigger' end
from public.properties where id = 'bbbbbbbb-0000-0000-0000-000000000001';

-- Another user cannot read Renter 1's favourites list.
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 0 then 'PASS: favourites are private to the favouriting user'
            else 'FAIL: favourites are private to the favouriting user' end
from public.property_favourites where user_id = 'aaaaaaaa-0000-0000-0000-000000000003';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- Renter files a report; only the reporter + moderation roles can read it.
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

insert into public.property_reports (property_id, reporter_id, reason, details)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'misleading_price', 'Price is wrong');

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 0 then 'PASS: property owner cannot read a report about their listing'
            else 'FAIL: property owner cannot read a report about their listing' end
from public.property_reports where property_id = 'bbbbbbbb-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;
