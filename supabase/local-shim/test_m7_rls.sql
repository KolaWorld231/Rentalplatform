-- Manual verification for Milestone 7: admin/moderation RLS, audit log
-- privacy, and notifications. Run with:
--   su postgres -c "psql -d domilink_dev -f supabase/local-shim/test_m7_rls.sql"

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'admin-m7@example.test'),
  ('a0000000-0000-0000-0000-000000000002', 'moderator-m7@example.test'),
  ('a0000000-0000-0000-0000-000000000003', 'user-m7@example.test'),
  ('a0000000-0000-0000-0000-000000000004', 'stranger-m7@example.test');

set role service_role;
insert into public.user_roles (user_id, role) values
  ('a0000000-0000-0000-0000-000000000001', 'admin'),
  ('a0000000-0000-0000-0000-000000000002', 'moderator');

-- Service-role (the admin suspend-user action) writes an audit log entry
-- and a notification.
insert into public.admin_audit_logs (actor_id, action, target_table, target_id, reason)
values ('a0000000-0000-0000-0000-000000000001', 'suspend_user', 'profiles', 'a0000000-0000-0000-0000-000000000003', 'policy violation');

insert into public.notifications (user_id, type, title, body)
values ('a0000000-0000-0000-0000-000000000003', 'account_notice', 'Your account was suspended', 'Contact support for details.');
reset role;

-- A plain user cannot read the audit log at all.
set role authenticated;
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 0 then 'PASS: plain user cannot read admin_audit_logs'
            else 'FAIL: plain user cannot read admin_audit_logs' end
from public.admin_audit_logs;

-- A moderator ALSO cannot read the audit log — admin only, by design.
reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;
set role authenticated;
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000002';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 0 then 'PASS: moderator cannot read admin_audit_logs (admin-only)'
            else 'FAIL: moderator cannot read admin_audit_logs (admin-only)' end
from public.admin_audit_logs;

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- The admin themself CAN read it.
set role authenticated;
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 1 then 'PASS: admin can read admin_audit_logs'
            else 'FAIL: admin can read admin_audit_logs' end
from public.admin_audit_logs;

-- No one but service_role may write an audit log entry directly.
do $$
begin
  begin
    insert into public.admin_audit_logs (actor_id, action, target_table, target_id)
    values ('a0000000-0000-0000-0000-000000000001', 'fake_action', 'profiles', 'x');
    raise exception 'FAIL: admin (as authenticated) was able to insert an audit log row directly';
  exception
    when insufficient_privilege then
      raise notice 'PASS: audit log is write-only via service_role, even for an admin''s own authenticated session';
  end;
end
$$;

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- Notifications: the recipient can read and mark their own as read.
set role authenticated;
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 1 then 'PASS: recipient can read their own notification'
            else 'FAIL: recipient can read their own notification' end
from public.notifications where user_id = 'a0000000-0000-0000-0000-000000000003';

update public.notifications set read_at = now() where user_id = 'a0000000-0000-0000-0000-000000000003';

select case when read_at is not null then 'PASS: recipient can mark their own notification read'
            else 'FAIL: recipient can mark their own notification read' end
from public.notifications where user_id = 'a0000000-0000-0000-0000-000000000003';

-- A user cannot create a notification for themselves (system-generated
-- only).
do $$
begin
  begin
    insert into public.notifications (user_id, type, title)
    values ('a0000000-0000-0000-0000-000000000003', 'account_notice', 'self-sent');
    raise exception 'FAIL: user was able to self-insert a notification';
  exception
    when insufficient_privilege then
      raise notice 'PASS: notifications are system-generated only (service_role)';
  end;
end
$$;

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- A stranger cannot read or mark someone else's notification.
set role authenticated;
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000004';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 0 then 'PASS: stranger cannot read another user''s notifications'
            else 'FAIL: stranger cannot read another user''s notifications' end
from public.notifications where user_id = 'a0000000-0000-0000-0000-000000000003';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- Milestone 8 regression: account_status must be readable by the
-- suspended user's own session (requireUser() needs this to enforce the
-- suspension — found live, where nothing actually checked it).
set role service_role;
update public.profiles set account_status = 'suspended' where id = 'a0000000-0000-0000-0000-000000000003';
reset role;

set role authenticated;
set request.jwt.claim.sub = 'a0000000-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

select case when account_status = 'suspended' then 'PASS: suspended user can read their own account_status (enforcement check)'
            else 'FAIL: suspended user can read their own account_status (enforcement check)' end
from public.profiles where id = 'a0000000-0000-0000-0000-000000000003';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;
