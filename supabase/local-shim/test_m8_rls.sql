-- Manual verification for Milestone 8's support_tickets table. Run with:
--   su postgres -c "psql -d domilink_dev -f supabase/local-shim/test_m8_rls.sql"

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('b0000000-0000-0000-0000-000000000001', 'ticket-user-m8@example.test'),
  ('b0000000-0000-0000-0000-000000000002', 'ticket-stranger-m8@example.test'),
  ('b0000000-0000-0000-0000-000000000003', 'ticket-moderator-m8@example.test');

set role service_role;
insert into public.user_roles (user_id, role) values ('b0000000-0000-0000-0000-000000000003', 'moderator');
reset role;

set role authenticated;
set request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

insert into public.support_tickets (id, user_id, subject, message)
values ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Payment not confirmed', 'I paid but my pass is not active.');

select case when count(*) = 1 then 'PASS: user can create their own support ticket'
            else 'FAIL: user can create their own support ticket' end
from public.support_tickets where id = 'b1000000-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

set role authenticated;
set request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000002';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 0 then 'PASS: stranger cannot read another user''s support ticket'
            else 'FAIL: stranger cannot read another user''s support ticket' end
from public.support_tickets where id = 'b1000000-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

set role authenticated;
set request.jwt.claim.sub = 'b0000000-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 1 then 'PASS: moderator can read a support ticket for triage'
            else 'FAIL: moderator can read a support ticket for triage' end
from public.support_tickets where id = 'b1000000-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;
