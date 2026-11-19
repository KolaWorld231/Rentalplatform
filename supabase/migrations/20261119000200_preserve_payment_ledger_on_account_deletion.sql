-- Let an account be deleted without destroying -- or being blocked by --
-- the payment ledger.
--
-- Deleting a user failed outright: `auth.admin.deleteUser` returned
-- "Database error deleting user" for anyone who had ever paid. The chain
-- is
--
--   payment_webhook_events.related_transaction_id
--     -> payment_transactions.id
--   payment_transactions.user_id   -> auth.users.id  on delete cascade
--   subscriptions.user_id          -> auth.users.id  on delete cascade
--
-- The cascade tried to remove the user's transactions, and
-- payment_webhook_events has no `on delete` clause, so it restricts and
-- the whole delete is rolled back. Reproduced against the hosted project.
--
-- Simply adding a cascade to that last foreign key would make deletion
-- work by erasing the ledger: the amounts, the provider references, the
-- verified-at timestamps and the raw provider evidence all go, for every
-- payment the person ever made. That is the wrong trade for financial
-- records, and it is not reversible.
--
-- So the money is kept and the person is detached instead. `user_id`
-- becomes nullable and the cascade becomes `set null`: the subscription
-- and transaction rows survive a deletion with no owner, which is what a
-- ledger is for. RLS on both tables is `user_id = auth.uid()`, and null
-- never equals anything, so an orphaned row is invisible to every client
-- and reachable only by the service role.

alter table public.subscriptions alter column user_id drop not null;
alter table public.payment_transactions alter column user_id drop not null;

alter table public.subscriptions
  drop constraint if exists subscriptions_user_id_fkey;
alter table public.subscriptions
  add constraint subscriptions_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

alter table public.payment_transactions
  drop constraint if exists payment_transactions_user_id_fkey;
alter table public.payment_transactions
  add constraint payment_transactions_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete set null;

-- Severing user_id is not enough on its own to call this anonymised.
-- `payment_webhook_events.payload` is the provider's raw body, and for a
-- mobile money provider that includes the payer's MSISDN -- a phone
-- number sitting beside a payment, still linked to the transaction, for
-- an account the person asked to have deleted.
--
-- The payload is redacted when its transaction loses its owner. What the
-- ledger actually needs is kept: the amount, currency, status and
-- verified_at live on payment_transactions, not here, and this table's
-- own provider/event_id pair survives -- so the `unique (provider,
-- event_id)` idempotency guarantee still holds and a replayed old event
-- still cannot be processed twice.
create or replace function public.redact_webhook_payload_on_owner_loss()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payment_webhook_events
  set payload = jsonb_build_object(
        'redacted', true,
        'reason', 'account deleted',
        'redacted_at', now()
      )
  where related_transaction_id = new.id;
  return new;
end;
$$;

revoke all on function public.redact_webhook_payload_on_owner_loss() from public, anon, authenticated;

create trigger payment_transactions_redact_on_owner_loss
  after update of user_id on public.payment_transactions
  for each row
  when (old.user_id is not null and new.user_id is null)
  execute function public.redact_webhook_payload_on_owner_loss();
