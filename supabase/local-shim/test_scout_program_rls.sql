-- Manual verification for the Scout Program ("Rental HunterZ") --
-- covers the DB-enforced subset of docs/SCOUT_PROGRAM.md §15 (seat
-- caps, RLS isolation, referral uniqueness/self-referral/decline,
-- duplicate-bounty prevention, scout write restrictions). Run with:
--   su postgres -c "psql -d 231rentals_dev -f supabase/local-shim/test_scout_program_rls.sql"
--
-- NOT covered here (see docs/IMPLEMENTATION_STATUS.md's Scout Program
-- test-suite entry for why): phone-OTP-before-review gating and the
-- bounty eligibility window (both live in lib/scouts/actions.ts /
-- lib/scouts/earnings-actions.ts as TypeScript, not SQL -- a Vitest
-- test would need to mock the Supabase client, a separate piece of
-- work), revenue-share computation and fraud/collusion holds (not
-- built yet, per the spec's own documented scope cuts), and the full
-- public-application -> admin-approval -> referral -> earnings E2E
-- walkthrough (needs a running app, not a psql script).

\set ON_ERROR_STOP on

-- ===========================================================================
-- Section A (M1): seat caps are enforced inside submit_scout_application
-- itself, not just decided client-side.
-- ===========================================================================

do $$
declare
  v_area_id uuid;
  v_status1 public.scout_application_status;
  v_status2 public.scout_application_status;
  v_status3 public.scout_application_status;
  v_seats_filled int;
begin
  select id into v_area_id from public.scout_areas where county = 'Bong';

  select status into v_status1 from public.submit_scout_application(
    'Applicant One', '+231770000001', null, v_area_id, 'Knows the area well.', null,
    'Tecno Spark', true, 'Want to help.', 'v1', now(), '[{"fullName":"Ref One","relationship":"family","phone":"+231770000011"},{"fullName":"Ref Two","relationship":"employer","phone":"+231770000012"}]'::jsonb
  );
  select status into v_status2 from public.submit_scout_application(
    'Applicant Two', '+231770000002', null, v_area_id, 'Knows the area well.', null,
    'Tecno Spark', true, 'Want to help.', 'v1', now(), '[{"fullName":"Ref One","relationship":"family","phone":"+231770000021"},{"fullName":"Ref Two","relationship":"employer","phone":"+231770000022"}]'::jsonb
  );
  select status into v_status3 from public.submit_scout_application(
    'Applicant Three', '+231770000003', null, v_area_id, 'Knows the area well.', null,
    'Tecno Spark', true, 'Want to help.', 'v1', now(), '[{"fullName":"Ref One","relationship":"family","phone":"+231770000031"},{"fullName":"Ref Two","relationship":"employer","phone":"+231770000032"}]'::jsonb
  );

  select seats_filled into v_seats_filled from public.scout_areas where id = v_area_id;

  if v_status1 = 'applied' and v_status2 = 'applied' and v_status3 = 'waitlisted' and v_seats_filled = 2 then
    raise notice 'PASS: seat cap (2) enforced -- first two applied, third waitlisted, seats_filled=2';
  else
    raise exception 'FAIL: seat cap not enforced as expected (got %, %, %, seats_filled=%)', v_status1, v_status2, v_status3, v_seats_filled;
  end if;
end
$$;

-- Duplicate phone is rejected at the RPC level (app-level check, not a
-- hard DB constraint -- see the M1 migration's own comment on why).
do $$
declare
  v_area_id uuid;
begin
  select id into v_area_id from public.scout_areas where county = 'Montserrado' limit 1;
  begin
    perform public.submit_scout_application(
      'Duplicate Applicant', '+231770000001', null, v_area_id, 'Knows the area.', null,
      'Tecno Spark', true, 'Want to help.', 'v1', now(), '[{"fullName":"Ref One","relationship":"family","phone":"+231770000041"},{"fullName":"Ref Two","relationship":"employer","phone":"+231770000042"}]'::jsonb
    );
    raise exception 'FAIL: duplicate phone was accepted';
  exception
    when others then
      if sqlerrm like '%duplicate_phone%' then
        raise notice 'PASS: duplicate phone rejected';
      else
        raise;
      end if;
  end;
end
$$;

-- Section A, RLS: applicants/anon/authenticated cannot read applications
-- or references -- only admin can.

insert into auth.users (id, email) values
  ('c0000000-0000-0000-0000-000000000001', 'scout-stranger@example.test'),
  ('c0000000-0000-0000-0000-000000000002', 'scout-admin@example.test');

insert into public.user_roles (user_id, role) values ('c0000000-0000-0000-0000-000000000002', 'admin');

set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 0 then 'PASS: a plain authenticated user cannot read scout_applications'
            else 'FAIL: a plain authenticated user cannot read scout_applications' end
from public.scout_applications;

select case when count(*) = 0 then 'PASS: a plain authenticated user cannot read scout_references'
            else 'FAIL: a plain authenticated user cannot read scout_references' end
from public.scout_references;

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000002';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 3 then 'PASS: admin can read all scout_applications'
            else 'FAIL: admin can read all scout_applications (got ' || count(*) || ')' end
from public.scout_applications;

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- No client role can insert/update scout_applications directly, even an
-- admin's own authenticated session -- every write goes through the
-- service-role RPC above.
set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000002';
set request.jwt.claim.role = 'authenticated';

do $$
begin
  begin
    insert into public.scout_applications (full_name, phone, age_confirmed, age_confirmed_at, area_id, area_knowledge, smartphone_model, has_data_access, motivation, code_of_conduct_version, code_of_conduct_accepted_at, verification_consent_at, phone_verified_at)
    values ('Direct Insert', '+231770000099', true, now(), (select id from public.scout_areas limit 1), 'x', 'x', true, 'x', 'v1', now(), now(), now());
    raise exception 'FAIL: admin (as authenticated) was able to insert scout_applications directly';
  exception
    when insufficient_privilege then
      raise notice 'PASS: scout_applications is write-only via service_role, even for an admin''s own session';
  end;
end
$$;

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- ===========================================================================
-- Section B (M2): a scout can read only their own `scouts` row.
-- ===========================================================================

insert into auth.users (id, email) values ('c0000000-0000-0000-0000-000000000003', 'scout-stranger-2@example.test');

set role service_role;

insert into public.scouts (id, user_id, application_id, status, probation_ends_at, referral_code, display_name, area_id)
select 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', id, 'probation', now() + interval '30 days', 'SCOUTREF1', 'Scout One', area_id
from public.scout_applications where phone = '+231770000001';

reset role;

set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 1 then 'PASS: a scout can read their own scouts row'
            else 'FAIL: a scout can read their own scouts row' end
from public.scouts where id = 'd0000000-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 0 then 'PASS: a stranger cannot read another scout''s row'
            else 'FAIL: a stranger cannot read another scout''s row' end
from public.scouts where id = 'd0000000-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- ===========================================================================
-- Section C (M3/M7): referral attribution -- once per owner, self-referral
-- blocked, owner-scoped confirm/decline, decline blocks credit.
-- ===========================================================================

insert into auth.users (id, email) values
  ('c0000000-0000-0000-0000-000000000004', 'owner-referred@example.test'),
  ('c0000000-0000-0000-0000-000000000005', 'owner-stranger@example.test');

-- The scout themself tries to self-refer: blocked, no row inserted.
set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

select public.attribute_scout_referral('SCOUTREF1');

select case when count(*) = 0 then 'PASS: self-referral blocked, no owner_referrals row inserted'
            else 'FAIL: self-referral blocked, no owner_referrals row inserted' end
from public.owner_referrals where owner_user_id = 'c0000000-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- A real owner attributes via the scout's code: succeeds once.
set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000004';
set request.jwt.claim.role = 'authenticated';

select public.attribute_scout_referral('SCOUTREF1');

select case when count(*) = 1 and bool_and(status = 'pending_confirmation') then 'PASS: referral attributed once, pending confirmation'
            else 'FAIL: referral attributed once, pending confirmation' end
from public.owner_referrals where owner_user_id = 'c0000000-0000-0000-0000-000000000004';

-- A second attribution attempt for the same owner is a silent no-op
-- (the unique index on owner_user_id is the real guarantee).
select public.attribute_scout_referral('SCOUTREF1');

select case when count(*) = 1 then 'PASS: second attribution attempt for the same owner did not create a duplicate'
            else 'FAIL: second attribution attempt for the same owner did not create a duplicate (got ' || count(*) || ')' end
from public.owner_referrals where owner_user_id = 'c0000000-0000-0000-0000-000000000004';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- The hard DB guarantee behind that no-op: a direct duplicate insert
-- (as service_role, bypassing the RPC's own ON CONFLICT) still violates
-- the unique index.
set role service_role;
do $$
begin
  begin
    insert into public.owner_referrals (scout_id, owner_user_id, source)
    values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'manual');
    raise exception 'FAIL: a second owner_referrals row for the same owner_user_id was allowed';
  exception
    when unique_violation then
      raise notice 'PASS: owner_referrals_owner_user_id_key enforces at most one referral per owner, ever';
  end;
end
$$;
reset role;

-- A stranger owner cannot confirm/decline someone else's referral.
set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000005';
set request.jwt.claim.role = 'authenticated';

select public.respond_to_scout_referral(
  (select id from public.owner_referrals where owner_user_id = 'c0000000-0000-0000-0000-000000000004'),
  false
);

select case when status = 'pending_confirmation' then 'PASS: a stranger cannot decline another owner''s referral'
            else 'FAIL: a stranger cannot decline another owner''s referral' end
from public.owner_referrals where owner_user_id = 'c0000000-0000-0000-0000-000000000004';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- The actual referred owner declines: status becomes declined, credit
-- stays blocked (is_payable never set true anywhere in this codebase
-- without a published, verified, confirmed-available listing -- see M4
-- migration's own comment -- so it is still false here by construction).
set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000004';
set request.jwt.claim.role = 'authenticated';

select public.respond_to_scout_referral(
  (select id from public.owner_referrals where owner_user_id = 'c0000000-0000-0000-0000-000000000004'),
  false
);

select case when status = 'declined' and is_payable = false then 'PASS: owner decline blocks credit (status=declined, is_payable=false)'
            else 'FAIL: owner decline blocks credit' end
from public.owner_referrals where owner_user_id = 'c0000000-0000-0000-0000-000000000004';

-- Having already decided, the owner cannot flip it back to confirmed
-- (the RPC only acts while status = 'pending_confirmation').
select public.respond_to_scout_referral(
  (select id from public.owner_referrals where owner_user_id = 'c0000000-0000-0000-0000-000000000004'),
  true
);

select case when status = 'declined' then 'PASS: a decided referral cannot be re-decided'
            else 'FAIL: a decided referral cannot be re-decided' end
from public.owner_referrals where owner_user_id = 'c0000000-0000-0000-0000-000000000004';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- No client role can write owner_referrals directly (not even insert a
-- fresh pending row) -- every write is through the RPCs above.
set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000005';
set request.jwt.claim.role = 'authenticated';

do $$
begin
  begin
    insert into public.owner_referrals (scout_id, owner_user_id, source)
    values ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'manual');
    raise exception 'FAIL: an authenticated user was able to insert owner_referrals directly';
  exception
    when insufficient_privilege then
      raise notice 'PASS: owner_referrals is write-only via the scoped RPCs, never a direct client insert';
  end;
end
$$;

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- ===========================================================================
-- Section D (M4): earnings ledger -- duplicate bounty prevented, scout
-- cannot write the ledger or payouts directly, and can read only their
-- own rows.
-- ===========================================================================

set role service_role;

insert into public.scout_earnings_ledger (scout_id, owner_referral_id, type, amount)
select 'd0000000-0000-0000-0000-000000000001', id, 'bounty', 2.00
from public.owner_referrals where owner_user_id = 'c0000000-0000-0000-0000-000000000004';

reset role;

set role service_role;
do $$
begin
  begin
    insert into public.scout_earnings_ledger (scout_id, owner_referral_id, type, amount)
    select 'd0000000-0000-0000-0000-000000000001', id, 'bounty', 2.00
    from public.owner_referrals where owner_user_id = 'c0000000-0000-0000-0000-000000000004';
    raise exception 'FAIL: a second bounty row for the same owner_referral_id was allowed';
  exception
    when unique_violation then
      raise notice 'PASS: scout_earnings_ledger_bounty_per_referral_key prevents a duplicate bounty for the same referral -- a re-run of the bounty job cannot double-pay';
  end;
end
$$;
reset role;

-- The scout can read their own ledger entry...
set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 1 then 'PASS: a scout can read their own earnings ledger entry'
            else 'FAIL: a scout can read their own earnings ledger entry' end
from public.scout_earnings_ledger where scout_id = 'd0000000-0000-0000-0000-000000000001';

-- ...but cannot edit it (no insert/update grant to authenticated at all).
do $$
begin
  begin
    update public.scout_earnings_ledger set amount = 999 where scout_id = 'd0000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: a scout was able to edit their own earnings ledger entry';
  exception
    when insufficient_privilege then
      raise notice 'PASS: a scout cannot edit the earnings ledger -- append-only, admin/service-role only';
  end;
end
$$;

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- A stranger scout cannot read someone else's ledger.
set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 0 then 'PASS: a stranger cannot read another scout''s earnings ledger'
            else 'FAIL: a stranger cannot read another scout''s earnings ledger' end
from public.scout_earnings_ledger where scout_id = 'd0000000-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- Payouts: same write restriction.
set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

do $$
begin
  begin
    insert into public.scout_payouts (scout_id, amount) values ('d0000000-0000-0000-0000-000000000001', 100);
    raise exception 'FAIL: a scout was able to create their own payout record';
  exception
    when insufficient_privilege then
      raise notice 'PASS: scout_payouts is admin/service-role write-only, even for the scout it belongs to';
  end;
end
$$;

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- ===========================================================================
-- Section E (M6): program settings are readable by any authenticated
-- user, writable only by service_role.
-- ===========================================================================

set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 1 then 'PASS: any authenticated user can read scout_program_settings'
            else 'FAIL: any authenticated user can read scout_program_settings' end
from public.scout_program_settings;

do $$
begin
  begin
    update public.scout_program_settings set bounty_amount_usd = 999 where id = true;
    raise exception 'FAIL: an ordinary authenticated user was able to update scout_program_settings';
  exception
    when insufficient_privilege then
      raise notice 'PASS: scout_program_settings is admin-only to write (service_role via the Server Action)';
  end;
end
$$;

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- ===========================================================================
-- Section F (M7): claim_scout_account only links on an exact phone match,
-- and find_claimable_scout_id never leaks a match to the wrong caller.
-- ===========================================================================

insert into auth.users (id, email) values ('c0000000-0000-0000-0000-000000000006', 'claimant@example.test');

set role service_role;

-- A promoted-but-unclaimed scout, and a profile whose phone matches the
-- underlying application's phone.
insert into public.scouts (id, user_id, application_id, status, probation_ends_at, referral_code, display_name, area_id)
select 'd0000000-0000-0000-0000-000000000002', null, id, 'probation', now() + interval '30 days', 'SCOUTREF2', 'Scout Two', area_id
from public.scout_applications where phone = '+231770000002';

-- The on_auth_user_created trigger already created a profiles row for
-- this user; just set its phone to match the application's.
update public.profiles set phone = '+231770000002' where id = 'c0000000-0000-0000-0000-000000000006';

reset role;

-- A caller whose phone does NOT match finds no claimable scout.
set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

select case when public.find_claimable_scout_id() is null then 'PASS: find_claimable_scout_id returns null when the caller''s phone does not match'
            else 'FAIL: find_claimable_scout_id returns null when the caller''s phone does not match' end;

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- The matching caller finds it and can claim it.
set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000006';
set request.jwt.claim.role = 'authenticated';

select case when public.find_claimable_scout_id() = 'd0000000-0000-0000-0000-000000000002' then 'PASS: find_claimable_scout_id finds the match for the correct caller'
            else 'FAIL: find_claimable_scout_id finds the match for the correct caller' end;

select public.claim_scout_account('d0000000-0000-0000-0000-000000000002');

select case when user_id = 'c0000000-0000-0000-0000-000000000006' then 'PASS: claim_scout_account linked the scout to the matching caller'
            else 'FAIL: claim_scout_account linked the scout to the matching caller' end
from public.scouts where id = 'd0000000-0000-0000-0000-000000000002';

-- Calling it again (already claimed) is a no-op, not an error, and does
-- not reassign it to a different caller.
reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;
set role authenticated;
set request.jwt.claim.sub = 'c0000000-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

select public.claim_scout_account('d0000000-0000-0000-0000-000000000002');

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- Verify via service_role (the stranger's own session can no longer see
-- this row at all now that it belongs to someone else -- RLS doing its
-- job -- so check the actual column value out-of-band).
set role service_role;

select case when user_id = 'c0000000-0000-0000-0000-000000000006' then 'PASS: an already-claimed scout cannot be reassigned to a different caller'
            else 'FAIL: an already-claimed scout cannot be reassigned to a different caller' end
from public.scouts where id = 'd0000000-0000-0000-0000-000000000002';

reset role;
