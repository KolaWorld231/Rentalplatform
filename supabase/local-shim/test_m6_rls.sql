-- Manual verification for Milestone 6: identity/property verification RLS
-- and document privacy. Run with:
--   su postgres -c "psql -d domilink_dev -f supabase/local-shim/test_m6_rls.sql"

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('f0000000-0000-0000-0000-000000000001', 'owner-verify@example.test'),
  ('f0000000-0000-0000-0000-000000000002', 'moderator-verify@example.test'),
  ('f0000000-0000-0000-0000-000000000003', 'stranger-verify@example.test');

set role service_role;
insert into public.user_roles (user_id, role) values
  ('f0000000-0000-0000-0000-000000000001', 'owner'),
  ('f0000000-0000-0000-0000-000000000002', 'moderator');

insert into public.properties (id, owner_id, title, slug, category, usage_type, rent_amount, county, city)
values (
  'f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
  'Verification Test Property', 'verification-test-property',
  'apartment', 'residential', 300, 'Montserrado', 'Monrovia'
);
reset role;

-- The owner submits an identity verification request.
set role authenticated;
set request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

insert into public.identity_verification_requests (id, user_id)
values ('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001');

select case when count(*) = 1 then 'PASS: user can submit their own identity verification request'
            else 'FAIL: user can submit their own identity verification request' end
from public.identity_verification_requests where id = 'f2000000-0000-0000-0000-000000000001';

insert into public.private_verification_documents (identity_request_id, storage_path, content_type, file_size_bytes, uploaded_by)
values ('f2000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001/id-front.jpg', 'image/jpeg', 102400, 'f0000000-0000-0000-0000-000000000001');

select case when count(*) = 1 then 'PASS: applicant can attach a document to their own request'
            else 'FAIL: applicant can attach a document to their own request' end
from public.private_verification_documents where identity_request_id = 'f2000000-0000-0000-0000-000000000001';

-- The owner cannot self-mark their own request verified — no authenticated
-- UPDATE policy exists on identity_verification_requests at all.
do $$
begin
  begin
    update public.identity_verification_requests set status = 'verified'
    where id = 'f2000000-0000-0000-0000-000000000001';
    if found then
      raise exception 'FAIL: applicant was able to self-verify their identity request';
    end if;
  exception
    when insufficient_privilege then
      raise notice 'PASS: applicant cannot self-verify (insufficient_privilege)';
  end;
end
$$;

select case when status = 'submitted' then 'PASS: status remains submitted after the blocked self-verify attempt'
            else 'FAIL: status remains submitted after the blocked self-verify attempt' end
from public.identity_verification_requests where id = 'f2000000-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- A stranger cannot read the request or its document.
set role authenticated;
set request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 0 then 'PASS: stranger cannot read another user''s identity verification request'
            else 'FAIL: stranger cannot read another user''s identity verification request' end
from public.identity_verification_requests where id = 'f2000000-0000-0000-0000-000000000001';

select case when count(*) = 0 then 'PASS: stranger cannot read a private verification document'
            else 'FAIL: stranger cannot read a private verification document' end
from public.private_verification_documents where identity_request_id = 'f2000000-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- A moderator CAN read it (for the review queue), but still cannot write
-- directly as `authenticated` — review actions go through service_role.
set role authenticated;
set request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000002';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 1 then 'PASS: moderator can read a pending identity verification request'
            else 'FAIL: moderator can read a pending identity verification request' end
from public.identity_verification_requests where id = 'f2000000-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- is_identity_verified() reads false before review...
select case when public.is_identity_verified('f0000000-0000-0000-0000-000000000001') = false
            then 'PASS: is_identity_verified() false before review'
            else 'FAIL: is_identity_verified() false before review' end;

-- ...and true only after service_role (the review action) approves it.
set role service_role;
update public.identity_verification_requests set status = 'verified', reviewer_id = 'f0000000-0000-0000-0000-000000000002'
where id = 'f2000000-0000-0000-0000-000000000001';
reset role;

select case when public.is_identity_verified('f0000000-0000-0000-0000-000000000001') = true
            then 'PASS: is_identity_verified() true after service_role approval'
            else 'FAIL: is_identity_verified() true after service_role approval' end;

-- A renter cannot submit a property verification request for someone
-- else's property.
insert into auth.users (id, email) values ('f0000000-0000-0000-0000-000000000004', 'renter-verify@example.test');
set role authenticated;
set request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000004';
set request.jwt.claim.role = 'authenticated';
do $$
begin
  begin
    insert into public.property_verification_requests (property_id, applicant_id)
    values ('f1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000004');
    raise exception 'FAIL: a non-owner was able to submit a property verification request';
  exception
    when insufficient_privilege then
      raise notice 'PASS: only the property''s owner/manager can submit a property verification request';
  end;
end
$$;
reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;
