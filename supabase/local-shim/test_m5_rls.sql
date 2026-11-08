-- Manual verification for Milestone 5: messaging RLS and the subscription
-- gate on conversation creation. Run with:
--   su postgres -c "psql -d 231rentals_dev -f supabase/local-shim/test_m5_rls.sql"
--
-- Uses fixed literal UUIDs throughout (rather than psql \gset variables)
-- so every assertion — including ones inside `do $$ ... $$` exception
-- blocks, where psql does NOT perform :'var' substitution — can reference
-- IDs directly without indirection.

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('dddddddd-0000-0000-0000-000000000001', 'owner-msg-m5@example.test'),
  ('dddddddd-0000-0000-0000-000000000002', 'subscriber-m5@example.test'),
  ('dddddddd-0000-0000-0000-000000000003', 'nosub-m5@example.test'),
  ('dddddddd-0000-0000-0000-000000000004', 'stranger-m5@example.test');

set role service_role;
insert into public.user_roles (user_id, role) values ('dddddddd-0000-0000-0000-000000000001', 'owner');

insert into public.properties (id, owner_id, title, slug, category, usage_type, rent_amount, county, city, listing_status)
values (
  'eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
  'Messaging Test Property', 'messaging-test-property',
  'apartment', 'residential', 300, 'Montserrado', 'Monrovia', 'published'
);
insert into public.properties (id, owner_id, title, slug, category, usage_type, rent_amount, county, city, listing_status)
values (
  'eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001',
  'Second Messaging Test Property', 'second-messaging-test-property',
  'apartment', 'residential', 300, 'Montserrado', 'Monrovia', 'published'
);

-- Activate a subscription for user 2 via the same path M4 uses.
insert into public.subscriptions (id, user_id, plan_id, status)
select 'ffffffff-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', id, 'pending_payment'
from public.subscription_plans limit 1;
insert into public.payment_transactions (id, user_id, subscription_id, provider, amount, status)
values (
  '11111111-aaaa-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002',
  'ffffffff-0000-0000-0000-000000000001', 'mock', 5.00, 'initiated'
);
insert into public.payment_webhook_events (provider, event_id, payload)
values ('mock', 'm5_evt_1', '{}'::jsonb);
select public.confirm_payment_and_activate_subscription('11111111-aaaa-0000-0000-000000000001'::uuid, 'm5_evt_1');
reset role;

-- A user WITHOUT a subscription cannot start a conversation.
set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';
do $$
begin
  begin
    insert into public.conversations (property_id, renter_id, owner_id)
    values ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000001');
    raise exception 'FAIL: non-subscriber was able to start a conversation';
  exception
    when insufficient_privilege then
      raise notice 'PASS: non-subscriber cannot start a new conversation';
  end;
end
$$;
reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- A subscriber CAN start a conversation, and owner_id is derived from the
-- property server-side regardless of what the client sends.
set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000002';
set request.jwt.claim.role = 'authenticated';

insert into public.conversations (id, property_id, renter_id, owner_id)
values (
  '22222222-bbbb-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001',
  'dddddddd-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000004'
);

select case when owner_id = 'dddddddd-0000-0000-0000-000000000001'
            then 'PASS: owner_id is derived from the property, not trusted from the client'
            else 'FAIL: owner_id is derived from the property, not trusted from the client' end
from public.conversations where id = '22222222-bbbb-0000-0000-000000000001';

insert into public.messages (conversation_id, sender_id, body)
values ('22222222-bbbb-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', 'Hi, is this still available?');

select case when count(*) = 1 then 'PASS: subscriber can send the first message'
            else 'FAIL: subscriber can send the first message' end
from public.messages where conversation_id = '22222222-bbbb-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- The owner can read and reply WITHOUT any subscription.
set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 1 then 'PASS: owner can read the conversation'
            else 'FAIL: owner can read the conversation' end
from public.conversations where id = '22222222-bbbb-0000-0000-000000000001';

insert into public.messages (conversation_id, sender_id, body)
values ('22222222-bbbb-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001', 'Yes, available now.');

select case when count(*) = 1 then 'PASS: owner can reply for free (no subscription check on messages insert)'
            else 'FAIL: owner can reply for free (no subscription check on messages insert)' end
from public.messages where conversation_id = '22222222-bbbb-0000-0000-000000000001' and sender_id = 'dddddddd-0000-0000-0000-000000000001';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- A stranger (not a participant) cannot read the conversation or its
-- messages, and cannot send into it.
set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 0 then 'PASS: non-participant cannot read the conversation'
            else 'FAIL: non-participant cannot read the conversation' end
from public.conversations where id = '22222222-bbbb-0000-0000-000000000001';

select case when count(*) = 0 then 'PASS: non-participant cannot read its messages'
            else 'FAIL: non-participant cannot read its messages' end
from public.messages where conversation_id = '22222222-bbbb-0000-0000-000000000001';

do $$
begin
  begin
    insert into public.messages (conversation_id, sender_id, body)
    values ('22222222-bbbb-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000003', 'butting in');
    raise exception 'FAIL: non-participant was able to send a message';
  exception
    when insufficient_privilege then
      raise notice 'PASS: non-participant cannot send a message into someone else''s conversation';
  end;
end
$$;
reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- Expire user 2's subscription, then confirm they can still READ and
-- REPLY in the existing conversation (the recorded architectural
-- decision), but cannot start a brand-new one.
set role service_role;
update public.subscriptions set status = 'expired', expires_at = now() - interval '1 day'
where user_id = 'dddddddd-0000-0000-0000-000000000002';
reset role;

set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000002';
set request.jwt.claim.role = 'authenticated';

select case when count(*) = 1 then 'PASS: expired subscriber can still read their existing conversation'
            else 'FAIL: expired subscriber can still read their existing conversation' end
from public.conversations where id = '22222222-bbbb-0000-0000-000000000001';

insert into public.messages (conversation_id, sender_id, body)
values ('22222222-bbbb-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000002', 'Thanks, following up.');

select case when count(*) = 2 then 'PASS: expired subscriber can still reply in an existing conversation'
            else 'FAIL: expired subscriber can still reply in an existing conversation' end
from public.messages where conversation_id = '22222222-bbbb-0000-0000-000000000001' and sender_id = 'dddddddd-0000-0000-0000-000000000002';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- A genuinely new conversation (a different property) must still be
-- blocked while expired.
set role authenticated;
set request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000002';
set request.jwt.claim.role = 'authenticated';
do $$
begin
  begin
    insert into public.conversations (property_id, renter_id, owner_id)
    values ('eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000001');
    raise exception 'FAIL: expired subscriber was able to start a brand new conversation';
  exception
    when insufficient_privilege then
      raise notice 'PASS: expired subscriber cannot start a brand new conversation';
  end;
end
$$;
reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;
