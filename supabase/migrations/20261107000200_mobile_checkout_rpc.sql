-- Mobile equivalent of lib/subscriptions/service.ts's startCheckout(): that
-- function runs under a Next.js Server Action with the service-role key,
-- which mobile has no equivalent of. `subscriptions` deliberately has no
-- client INSERT policy at all (see the M4 migration's comment -- only a
-- server-verified payment may activate one), so mobile needs a narrowly-
-- scoped SECURITY DEFINER primitive for the one write a client should be
-- allowed to make: starting a pending checkout for ITSELF. Everything
-- after this (the actual checkout UI, webhook verification, and
-- confirm_payment_and_activate_subscription) stays exactly as it is --
-- this function creates the same two rows startCheckout does and nothing
-- more. auth.uid() is read from the caller's own JWT, never an argument,
-- so this can never start a checkout on another user's behalf.
create or replace function public.start_mobile_checkout()
returns table (
  transaction_id uuid,
  internal_reference uuid,
  subscription_id uuid,
  amount numeric,
  plan_name text,
  duration_days integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan record;
  v_subscription_id uuid;
  v_transaction_id uuid;
  v_internal_reference uuid;
begin
  select id, name, price_usd, duration_days into v_plan
  from public.subscription_plans
  where is_active
  order by created_at desc
  limit 1;

  if v_plan.id is null then
    raise exception 'No active subscription plan is configured.';
  end if;

  insert into public.subscriptions (user_id, plan_id, status)
  values (auth.uid(), v_plan.id, 'pending_payment')
  returning id into v_subscription_id;

  insert into public.payment_transactions (user_id, subscription_id, provider, amount, currency, status)
  values (auth.uid(), v_subscription_id, 'mock', v_plan.price_usd, 'USD', 'initiated')
  returning id, internal_reference into v_transaction_id, v_internal_reference;

  return query
    select v_transaction_id, v_internal_reference, v_subscription_id, v_plan.price_usd, v_plan.name, v_plan.duration_days;
end;
$$;

revoke all on function public.start_mobile_checkout() from public;
grant execute on function public.start_mobile_checkout() to authenticated;
