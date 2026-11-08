-- Push notifications, built to support both web and mobile from the
-- same notifyUser() entry point (lib/admin/audit.ts) -- see
-- docs/IMPLEMENTATION_STATUS.md. Core flows never depend on push
-- working (per the mobile plan's own "optional" framing) -- it's a
-- best-effort delivery layer on top of the existing `notifications`
-- table, never a replacement for it.

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- A device token is owned entirely by the user it belongs to -- same
-- self-service pattern as property_favourites.
create policy push_tokens_select_self on public.push_tokens
  for select
  to authenticated
  using (user_id = auth.uid());

create policy push_tokens_insert_self on public.push_tokens
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy push_tokens_delete_self on public.push_tokens
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Re-registering the same physical device (token) for a different
-- account (logout/login as someone else on a shared device) must move
-- the token to the new caller, not leave it owned by whoever had it
-- before -- leaving that to a plain client UPDATE/upsert would need a
-- policy permissive enough to let any authenticated user touch any
-- row by token, which is a real privacy leak (a stranger's messages
-- could keep pushing to a device they no longer use). A SECURITY
-- DEFINER function is the safe way to do this, same pattern as
-- grant_owner_role_to_self: auth.uid() is read from the caller's own
-- JWT, so this can only ever (re)assign a token to the caller
-- themselves, never to anyone else.
create or replace function public.register_push_token(p_token text, p_platform text) returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    delete from public.push_tokens where token = p_token and user_id <> auth.uid();
    insert into public.push_tokens (user_id, token, platform)
    values (auth.uid(), p_token, p_platform)
    on conflict (token) do update set platform = excluded.platform;
  end;
  $$;

revoke all on function public.register_push_token(text, text) from public;
grant execute on function public.register_push_token(text, text) to authenticated;

alter table public.notification_preferences
  add column if not exists push_enabled boolean not null default true;
