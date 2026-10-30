-- Milestone 4: the $5 / 30-day Direct Access Pass subscription + the
-- payment architecture backing it. Core rule enforced throughout: only a
-- SERVER-VERIFIED payment may activate a subscription, and the expiry
-- timestamp is always computed server-side in UTC — never trust a client
-- value for either.

create type public.subscription_status as enum (
  'pending_payment', 'active', 'expired', 'cancelled', 'payment_failed', 'refunded', 'suspended'
);

create type public.payment_status as enum (
  'initiated', 'pending', 'confirmed', 'failed', 'reversed', 'refunded'
);

create type public.webhook_processing_status as enum ('received', 'processed', 'failed', 'duplicate');

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_usd numeric(6, 2) not null check (price_usd >= 0),
  duration_days integer not null check (duration_days > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id),
  status public.subscription_status not null default 'pending_payment',
  activated_at timestamptz,
  expires_at timestamptz,
  payment_transaction_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id, created_at desc);
-- Fast "does this user have an active pass right now" lookup, used by the
-- messaging gate in Milestone 5.
create index subscriptions_active_lookup_idx on public.subscriptions (user_id, status, expires_at);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id),
  provider text not null,
  provider_transaction_id text,
  internal_reference uuid not null default gen_random_uuid(),
  amount numeric(6, 2) not null check (amount >= 0),
  currency text not null default 'USD',
  status public.payment_status not null default 'initiated',
  provider_event_ref text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (internal_reference),
  -- A given provider transaction id must resolve to exactly one of our
  -- transaction rows — this is half of the idempotency guarantee (the
  -- other half is payment_webhook_events below).
  unique (provider, provider_transaction_id)
);

create index payment_transactions_user_id_idx on public.payment_transactions (user_id, created_at desc);

create trigger payment_transactions_set_updated_at
  before update on public.payment_transactions
  for each row execute function public.set_updated_at();

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  processing_status public.webhook_processing_status not null default 'received',
  related_transaction_id uuid references public.payment_transactions (id),
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  -- THE idempotency guarantee: a provider event is processed at most once,
  -- enforced by the database, not application-level "check then act".
  unique (provider, event_id)
);

-- Row Level Security ----------------------------------------------------

alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_webhook_events enable row level security;

create policy subscription_plans_select on public.subscription_plans
  for select
  to anon, authenticated
  using (is_active);

-- subscriptions: a user may only READ their own rows. There is
-- deliberately no INSERT/UPDATE/DELETE policy for `authenticated` — a
-- subscription is only ever created/activated by service_role code that
-- has independently verified a payment. This is the DB-level enforcement
-- of "only a verified payment may activate a subscription."
create policy subscriptions_select_self on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy subscriptions_select_moderation on public.subscriptions
  for select
  to authenticated
  using (public.has_role('admin'));

-- payment_transactions: a user may create their OWN transaction row to
-- start a checkout, but only in the 'initiated' state — they cannot
-- self-mark a payment confirmed. Every later state transition is
-- service_role only (no authenticated UPDATE policy at all).
create policy payment_transactions_select_self on public.payment_transactions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy payment_transactions_select_moderation on public.payment_transactions
  for select
  to authenticated
  using (public.has_role('admin'));

create policy payment_transactions_insert_self on public.payment_transactions
  for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'initiated');

-- payment_webhook_events: service_role only. No policy is granted to
-- `anon`/`authenticated` at all, so RLS denies every access from the
-- client — this table only exists for trusted server code.

-- Grants -------------------------------------------------------------------

grant select on public.subscription_plans to anon, authenticated;
grant select on public.subscriptions to authenticated;
grant select, insert on public.payment_transactions to authenticated;
grant all on public.subscription_plans, public.subscriptions, public.payment_transactions,
  public.payment_webhook_events to service_role;

-- Helper used by Milestone 5's messaging RLS: does this user currently
-- hold an active, unexpired subscription?
create or replace function public.has_active_subscription(target_user uuid) returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select exists (
      select 1 from public.subscriptions
      where user_id = target_user
        and status = 'active'
        and expires_at > now()
    );
  $$;

-- The ONLY path by which a subscription is activated. Runs as
-- security definer so it can write subscriptions/payment_transactions
-- regardless of RLS, but it is intentionally revoked from PUBLIC and
-- granted only to service_role — it must only ever be called from
-- trusted server code (the payment webhook handler) that has already
-- verified the payment through the provider's own verification mechanism
-- (signature check, API confirmation, etc.), never from client input.
--
-- Idempotency: the caller inserts into payment_webhook_events FIRST
-- (unique on provider+event_id); if that insert fails with a unique
-- violation, the event has already been processed and this function is
-- never called again for it. This function also independently guards
-- against activating a transaction that's already confirmed.
create or replace function public.confirm_payment_and_activate_subscription(
  p_transaction_id uuid,
  p_provider_event_ref text
) returns public.subscriptions
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_transaction public.payment_transactions;
    v_plan public.subscription_plans;
    v_subscription public.subscriptions;
  begin
    select * into v_transaction from public.payment_transactions where id = p_transaction_id for update;
    if not found then
      raise exception 'payment_transactions row % not found', p_transaction_id;
    end if;

    -- Already confirmed: return the existing subscription unchanged
    -- instead of re-activating (covers a retried webhook delivery that
    -- somehow bypassed the event-id uniqueness check).
    if v_transaction.status = 'confirmed' then
      select * into v_subscription from public.subscriptions where id = v_transaction.subscription_id;
      return v_subscription;
    end if;

    update public.payment_transactions
      set status = 'confirmed', provider_event_ref = p_provider_event_ref, verified_at = now()
      where id = p_transaction_id;

    select * into v_subscription from public.subscriptions where id = v_transaction.subscription_id for update;
    select * into v_plan from public.subscription_plans where id = v_subscription.plan_id;

    update public.subscriptions
      set status = 'active',
          activated_at = now(),
          expires_at = now() + make_interval(days => v_plan.duration_days),
          payment_transaction_id = v_transaction.id
      where id = v_subscription.id
      returning * into v_subscription;

    return v_subscription;
  end;
  $$;

revoke all on function public.confirm_payment_and_activate_subscription(uuid, text) from public;
grant execute on function public.confirm_payment_and_activate_subscription(uuid, text) to service_role;

insert into public.subscription_plans (name, price_usd, duration_days, is_active)
values ('Direct Access Pass', 5.00, 30, true);
