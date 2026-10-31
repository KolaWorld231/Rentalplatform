-- Fixes a real gap found testing against a live Supabase project: guests
-- (anon) saw "Property owner" instead of the owner's real name on a
-- published listing. Milestone 2's profiles_select_authenticated policy
-- was scoped to `authenticated` only, despite its own comment saying
-- display names need to be visible "on a listing" — and the brief
-- explicitly lists "View publicly available owner-profile information"
-- as a Guest capability. public.properties's embedded
-- `profiles:owner_id(display_name)` select (app/properties/[slug]/page.tsx)
-- therefore silently returned null for anonymous requests, even though a
-- table-level GRANT for anon already existed — RLS still blocked every
-- row because no policy permitted it.
--
-- Fix: let anon read profiles rows too, but restrict which COLUMNS they
-- can see via column-level privileges (not just row-level RLS) — a
-- guest's PostgREST query can never retrieve phone/phone_verified_at/
-- account_status, only the two columns that are genuinely meant to be
-- public (display_name, avatar_path). authenticated users keep full-row
-- access via the existing policy.

create policy profiles_select_anon on public.profiles
  for select
  to anon
  using (true);

revoke select on public.profiles from anon;
-- `id` must be included even though it's only ever used for the join
-- condition (never displayed) — Postgres requires column-level SELECT
-- privilege on every column a query references, including ones used only
-- in a WHERE/JOIN clause, not just the ones in the SELECT list. Omitting
-- it here reproduces exactly the "permission denied for table profiles"
-- failure this migration was written to fix.
grant select (id, display_name, avatar_path) on public.profiles to anon;
