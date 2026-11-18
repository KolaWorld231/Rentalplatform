-- Batch verification lookups for listing grids.
--
-- is_identity_verified(uuid) / is_property_verified(uuid) answer for one
-- subject at a time, so a listing grid had to call them once per property
-- per check: the homepage issued 16 PostgREST requests for 8 properties
-- and search issued 24 for 12. The calls were concurrent, so this was
-- request-count and connection overhead rather than serial latency, but
-- on the intermittent low-bandwidth connections this product targets it
-- still sits in front of first paint on the two busiest routes.
--
-- These two take an array and answer for the whole page in one request
-- each, which makes the cost of the verified badge independent of page
-- size. Same security-definer reasoning as the single-subject functions
-- they complement: identity_verification_requests and
-- property_verification_requests are RLS-restricted, so a direct
-- client-side query cannot read another user's rows. These return only
-- the subset of ids the caller already supplied and already knows about,
-- and leak nothing beyond "this listing shows a verified badge" --
-- exactly what the existing functions expose one id at a time.
--
-- The single-subject functions stay: the property detail page checks one
-- property and still uses them.

create or replace function public.verified_owner_ids(target_owners uuid[])
  returns setof uuid
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select distinct user_id
    from public.identity_verification_requests
    where user_id = any(target_owners) and status = 'verified';
  $$;

create or replace function public.verified_property_ids(target_properties uuid[])
  returns setof uuid
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select distinct property_id
    from public.property_verification_requests
    where property_id = any(target_properties) and status = 'verified';
  $$;

revoke all on function public.verified_owner_ids(uuid[]) from public;
revoke all on function public.verified_property_ids(uuid[]) from public;
grant execute on function public.verified_owner_ids(uuid[]) to anon, authenticated;
grant execute on function public.verified_property_ids(uuid[]) to anon, authenticated;
