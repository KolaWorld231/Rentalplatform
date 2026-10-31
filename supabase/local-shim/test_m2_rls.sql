-- Manual RLS verification for Milestone 2. Run with:
--   su postgres -c "psql -d domilink_dev -f supabase/local-shim/test_m2_rls.sql"
-- Expects every \echo'd assertion to say PASS.

\set ON_ERROR_STOP on

-- Simulate two signups the way auth.users + the handle_new_user trigger would.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.test');

-- Confirm the trigger auto-created profile + default renter role.
select case when count(*) = 2 then 'PASS: profiles auto-created on signup'
            else 'FAIL: profiles auto-created on signup' end
from public.profiles where id in
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

select case when count(*) = 2 then 'PASS: default renter role granted'
            else 'FAIL: default renter role granted' end
from public.user_roles
where role = 'renter' and user_id in
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- Act as Alice (authenticated, no privileged role).
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set request.jwt.claim.role = 'authenticated';

-- Alice can update her own profile.
update public.profiles set display_name = 'Alice Renamed' where id = auth.uid();
select case when display_name = 'Alice Renamed' then 'PASS: user can update own profile'
            else 'FAIL: user can update own profile' end
from public.profiles where id = '11111111-1111-1111-1111-111111111111';

-- Alice cannot update Bob's profile (RLS should make this a no-op update).
update public.profiles set display_name = 'Hijacked'
  where id = '22222222-2222-2222-2222-222222222222';
select case when display_name <> 'Hijacked' then 'PASS: user cannot update another user profile'
            else 'FAIL: user cannot update another user profile' end
from public.profiles where id = '22222222-2222-2222-2222-222222222222';

-- Alice attempts to self-grant the admin role directly against user_roles.
-- There is no INSERT policy granted to `authenticated` on user_roles, so
-- RLS must reject this outright.
do $$
begin
  begin
    insert into public.user_roles (user_id, role)
    values ('11111111-1111-1111-1111-111111111111', 'admin');
    raise exception 'FAIL: user was able to self-grant admin role';
  exception
    when insufficient_privilege then
      raise notice 'PASS: self role-escalation rejected by RLS';
  end;
end
$$;

-- Alice cannot see other users' rows in user_roles (no moderator/admin role).
select case when count(*) = 0 then 'PASS: non-privileged user cannot read others'' roles'
            else 'FAIL: non-privileged user cannot read others'' roles' end
from public.user_roles where user_id = '22222222-2222-2222-2222-222222222222';

reset role;
reset request.jwt.claim.sub;
reset request.jwt.claim.role;

-- Server-side/admin path: service_role (bypassrls) grants Bob the owner role.
set role service_role;
insert into public.user_roles (user_id, role) values
  ('22222222-2222-2222-2222-222222222222', 'owner');
reset role;

set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set request.jwt.claim.role = 'authenticated';

insert into public.owner_profiles (user_id, business_name) values (auth.uid(), 'Bob Rentals');
select case when business_name = 'Bob Rentals' then 'PASS: role-granted owner can create owner_profile'
            else 'FAIL: role-granted owner can create owner_profile' end
from public.owner_profiles where user_id = '22222222-2222-2222-2222-222222222222';

reset role;
reset request.jwt.claim.sub;
reset request.jwt.claim.role;

-- Alice (still just 'renter') must not be able to create an owner_profile.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set request.jwt.claim.role = 'authenticated';

do $$
begin
  begin
    insert into public.owner_profiles (user_id, business_name)
    values ('11111111-1111-1111-1111-111111111111', 'Alice Rentals');
    raise exception 'FAIL: renter without owner role could create owner_profile';
  exception
    when insufficient_privilege then
      raise notice 'PASS: owner_profile creation blocked without owner role';
  end;
end
$$;

reset role;

-- Milestone 8 regression: guests (anon) must see a profile's public
-- display_name/avatar_path but never phone or account_status, even via a
-- direct query (not just via the app's own column selection).
set role anon;
select case when display_name = 'Alice Renamed' then 'PASS: anon can read a profile''s display_name'
            else 'FAIL: anon can read a profile''s display_name' end
from public.profiles where id = '11111111-1111-1111-1111-111111111111';

do $$
begin
  begin
    perform phone from public.profiles where id = '11111111-1111-1111-1111-111111111111';
    raise exception 'FAIL: anon was able to read the phone column';
  exception
    when insufficient_privilege then
      raise notice 'PASS: anon cannot read the phone column (column-level grant)';
  end;
end
$$;
reset role;
