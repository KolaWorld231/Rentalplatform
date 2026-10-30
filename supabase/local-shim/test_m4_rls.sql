-- Manual verification for Milestone 4: subscription/payment RLS and the
-- idempotent activation path. Run with:
--   su postgres -c "psql -d domilink_dev -f supabase/local-shim/test_m4_rls.sql"

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'renter-sub@example.test');

select case when count(*) = 1 then 'PASS: Direct Access Pass plan seeded'
            else 'FAIL: Direct Access Pass plan seeded' end
from public.subscription_plans where name = 'Direct Access Pass' and price_usd = 5.00 and duration_days = 30;

-- Renter cannot create their own 'active' subscription row directly —
-- there is no authenticated INSERT policy on subscriptions at all.
set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';

do $$
declare
  v_plan_id uuid;
begin
  select id into v_plan_id from public.subscription_plans limit 1;
  begin
    insert into public.subscriptions (user_id, plan_id, status, expires_at)
    values ('cccccccc-0000-0000-0000-000000000001', v_plan_id, 'active', now() + interval '30 days');
    raise exception 'FAIL: user was able to self-activate a subscription';
  exception
    when insufficient_privilege then
      raise notice 'PASS: client cannot directly insert an active subscription';
  end;
end
$$;

-- Renter CAN create their own payment_transactions row, but only in
-- 'initiated' state.
do $$
begin
  begin
    insert into public.payment_transactions (user_id, provider, amount, status)
    values ('cccccccc-0000-0000-0000-000000000001', 'mock', 5.00, 'confirmed');
    raise exception 'FAIL: user was able to self-insert a confirmed payment';
  exception
    when insufficient_privilege then
      raise notice 'PASS: client cannot insert a payment transaction as already confirmed';
  end;
end
$$;

insert into public.payment_transactions (user_id, provider, amount, status)
values ('cccccccc-0000-0000-0000-000000000001', 'mock', 5.00, 'initiated')
returning id as txn_id \gset

select case when count(*) = 1 then 'PASS: client can create an initiated payment transaction'
            else 'FAIL: client can create an initiated payment transaction' end
from public.payment_transactions where id = :'txn_id';

reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

-- Server-side checkout flow: service_role creates the pending subscription
-- row linked to that transaction (this mirrors what the checkout server
-- action does in app code — see lib/payments/).
set role service_role;

insert into public.subscriptions (user_id, plan_id, status)
select 'cccccccc-0000-0000-0000-000000000001', id, 'pending_payment'
from public.subscription_plans limit 1
returning id as sub_id \gset

update public.payment_transactions set subscription_id = :'sub_id'::uuid
where id = :'txn_id';

reset role;

-- Webhook delivery #1: processes normally via the SECURITY DEFINER
-- function, which only service_role may execute.
set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
set request.jwt.claim.role = 'authenticated';
do $$
declare
  v_txn_id uuid;
begin
  select id into v_txn_id from public.payment_transactions
  where user_id = 'cccccccc-0000-0000-0000-000000000001' order by created_at desc limit 1;
  begin
    perform public.confirm_payment_and_activate_subscription(v_txn_id, 'evt_1');
    raise exception 'FAIL: non-service_role was able to call the activation function';
  exception
    when insufficient_privilege then
      raise notice 'PASS: activation function is not callable by authenticated role';
  end;
end
$$;
reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

set role service_role;

insert into public.payment_webhook_events (provider, event_id, payload)
values ('mock', 'evt_1', '{"ok": true}'::jsonb);

select public.confirm_payment_and_activate_subscription(:'txn_id'::uuid, 'evt_1');

select case when status = 'active' and expires_at > now() + interval '29 days'
            then 'PASS: subscription activated with ~30 day server-computed expiry'
            else 'FAIL: subscription activated with ~30 day server-computed expiry' end
from public.subscriptions where payment_transaction_id = :'txn_id';

select case when status = 'confirmed' then 'PASS: payment transaction marked confirmed'
            else 'FAIL: payment transaction marked confirmed' end
from public.payment_transactions where id = :'txn_id';

-- Webhook delivery #2 (duplicate/retry): the unique(provider, event_id)
-- constraint must reject the duplicate event insert outright.
do $$
begin
  begin
    insert into public.payment_webhook_events (provider, event_id, payload)
    values ('mock', 'evt_1', '{"ok": true}'::jsonb);
    raise exception 'FAIL: duplicate webhook event was inserted twice';
  exception
    when unique_violation then
      raise notice 'PASS: duplicate webhook event rejected by unique constraint';
  end;
end
$$;

-- Even if the activation function were somehow called again for the same
-- transaction, it must not grant a second activation / extend the expiry.
select expires_at as first_expiry from public.subscriptions where payment_transaction_id = :'txn_id' \gset
select pg_sleep(0);
select public.confirm_payment_and_activate_subscription(:'txn_id'::uuid, 'evt_1_retry');
select case when expires_at = :'first_expiry'::timestamptz
            then 'PASS: re-running activation for an already-confirmed transaction does not extend expiry'
            else 'FAIL: re-running activation for an already-confirmed transaction does not extend expiry' end
from public.subscriptions where payment_transaction_id = :'txn_id';

reset role;

-- has_active_subscription() helper reflects reality.
select case when public.has_active_subscription('cccccccc-0000-0000-0000-000000000001') = true
            then 'PASS: has_active_subscription true after activation'
            else 'FAIL: has_active_subscription true after activation' end;

-- A different (unsubscribed) user must read as false.
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000002', 'nosub@example.test');
select case when public.has_active_subscription('cccccccc-0000-0000-0000-000000000002') = false
            then 'PASS: has_active_subscription false for a user with no subscription'
            else 'FAIL: has_active_subscription false for a user with no subscription' end;

-- A failed payment must never activate a subscription.
insert into auth.users (id, email) values ('cccccccc-0000-0000-0000-000000000003', 'failedpay@example.test');
set role authenticated;
set request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000003';
set request.jwt.claim.role = 'authenticated';
insert into public.payment_transactions (user_id, provider, amount, status)
values ('cccccccc-0000-0000-0000-000000000003', 'mock', 5.00, 'initiated')
returning id as failed_txn_id \gset
reset role; reset request.jwt.claim.sub; reset request.jwt.claim.role;

set role service_role;
update public.payment_transactions set status = 'failed' where id = :'failed_txn_id';
reset role;

select case when public.has_active_subscription('cccccccc-0000-0000-0000-000000000003') = false
            then 'PASS: failed payment never activates a subscription'
            else 'FAIL: failed payment never activates a subscription' end;
