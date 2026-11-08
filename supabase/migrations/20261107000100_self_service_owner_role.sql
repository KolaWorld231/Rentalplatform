-- Mobile has no server-role layer equivalent to the web app's Next.js
-- Server Actions (which use the service-role key to grant 'owner' after
-- signup -- see lib/auth/actions.ts's registerAction). Both clients only
-- ever hold the anon key, so this RPC is the shared, safe primitive: it
-- lets a user grant themselves 'owner' -- and only 'owner', never
-- 'moderator'/'admin' -- which is no more privileged than what
-- unauthenticated signup already decides today on web via a trusted
-- intent flag. auth.uid() is read from the JWT inside the function, never
-- trusted from an argument, so a caller cannot grant the role to anyone
-- but themselves.
create or replace function public.grant_owner_role_to_self() returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    insert into public.user_roles (user_id, role)
    values (auth.uid(), 'owner')
    on conflict (user_id, role) do nothing;
  end;
  $$;

revoke all on function public.grant_owner_role_to_self() from public;
grant execute on function public.grant_owner_role_to_self() to authenticated;
