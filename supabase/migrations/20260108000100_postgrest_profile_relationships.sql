-- Fixes a real bug found when first connecting this project to a live
-- Supabase instance (previously only verifiable against a plain-Postgres
-- shim with no PostgREST — see docs/IMPLEMENTATION_STATUS.md): embedded
-- selects like `profiles:owner_id(display_name)` failed with PGRST200
-- ("Could not find a relationship between 'properties' and 'owner_id'").
--
-- Root cause: PostgREST resolves `alias:column(...)` embeds by looking for
-- a foreign key FROM the queried table's `column` TO the aliased table,
-- within the public schema. properties.owner_id (and conversations.
-- renter_id/owner_id, identity_verification_requests.user_id) reference
-- auth.users(id) — correct for data integrity, since that's the real
-- identity table — but PostgREST can't use that to resolve an embed
-- aliased to `profiles`, a different table, even though profiles.id is
-- always equal to auth.users.id (profiles is created 1:1 by
-- handle_new_user() on signup — see 20260101000100_profiles_and_roles.sql).
--
-- Fix: add an ADDITIONAL foreign key from each such column to
-- public.profiles(id), alongside the existing auth.users(id) FK. Both are
-- satisfiable for every real row (profiles.id = auth.users.id always), so
-- this adds no new constraint violations — it only gives PostgREST a
-- second, resolvable path for these embeds.
alter table public.properties
  add constraint properties_owner_id_profiles_fkey
  foreign key (owner_id) references public.profiles (id) on delete cascade;

alter table public.conversations
  add constraint conversations_renter_id_profiles_fkey
  foreign key (renter_id) references public.profiles (id) on delete cascade;

alter table public.conversations
  add constraint conversations_owner_id_profiles_fkey
  foreign key (owner_id) references public.profiles (id) on delete cascade;

alter table public.identity_verification_requests
  add constraint identity_verification_requests_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;
