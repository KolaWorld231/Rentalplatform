-- Scout Program Milestone 7: mobile parity primitives. Mobile has no
-- Server Action/service-role layer (same gap
-- 20261107000100_self_service_owner_role.sql's grant_owner_role_to_self
-- already solved for owner-role self-grant) -- these three RPCs are
-- the same shape of safe, auth.uid()-scoped primitive for the three
-- scout-related writes mobile needs that web currently does via its
-- service-role Server Actions:
--
-- 1. attributing a scout referral at signup (lib/auth/actions.ts's
--    attributeScoutReferral),
-- 2. confirming/declining a pending referral
--    (lib/scouts/referral-actions.ts),
-- 3. claiming a promoted scout record by matching phone
--    (lib/scouts/dashboard-actions.ts's claimScoutAccountAction).
--
-- Each reads auth.uid() from the caller's own JWT inside the function,
-- never from an argument, so none of these can act on another user's
-- behalf. Web's existing Server Actions are untouched -- they already
-- work correctly via service-role; these are additive, for mobile only.
--
-- The scout application flow itself (phone OTP + submission) is
-- different: the applicant has no account at all at that point, so
-- there's no auth.uid() to scope a RPC to. That flow is proxied through
-- new routes under app/api/mobile/scouts/* that call the existing
-- lib/scouts/actions.ts Server Actions directly (same pattern as the
-- existing app/api/mobile/whatsapp-otp/* routes) -- no new RPC needed
-- for that part.

create or replace function public.attribute_scout_referral(p_ref_code text) returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_scout record;
  begin
    select id, user_id into v_scout from public.scouts where referral_code = p_ref_code;
    if v_scout.id is null then
      return; -- unknown code: no error, same "never block" rule as the web path
    end if;
    if v_scout.user_id = auth.uid() then
      return; -- self-referral: never credited
    end if;

    insert into public.owner_referrals (scout_id, owner_user_id, source)
    values (v_scout.id, auth.uid(), 'code')
    on conflict (owner_user_id) do nothing; -- the unique index is the real guarantee; this just avoids a noisy error
  end;
  $$;

revoke all on function public.attribute_scout_referral(text) from public;
grant execute on function public.attribute_scout_referral(text) to authenticated;

create or replace function public.respond_to_scout_referral(p_referral_id uuid, p_confirm boolean) returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    update public.owner_referrals
    set status = case when p_confirm then 'confirmed'::public.owner_referral_status else 'declined'::public.owner_referral_status end,
        confirmed_by_owner_at = case when p_confirm then now() else confirmed_by_owner_at end
    where id = p_referral_id
      and owner_user_id = auth.uid()
      and status = 'pending_confirmation';
  end;
  $$;

revoke all on function public.respond_to_scout_referral(uuid, boolean) from public;
grant execute on function public.respond_to_scout_referral(uuid, boolean) to authenticated;

-- scouts_select_self (M2) only lets a caller see a scout row that's
-- already theirs, so mobile has no way to discover an unclaimed scout
-- row to offer a "claim" prompt for (unlike web's dashboard page, which
-- reads it via service-role). This returns just the id of a match, if
-- any, scoped the same way claim_scout_account itself is scoped -- the
-- caller learns nothing about the scout beyond "a match exists."
create or replace function public.find_claimable_scout_id() returns uuid
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_my_phone text;
    v_scout_id uuid;
  begin
    select phone into v_my_phone from public.profiles where id = auth.uid();
    if v_my_phone is null then
      return null;
    end if;

    select s.id into v_scout_id
    from public.scouts s
    join public.scout_applications sa on sa.id = s.application_id
    where s.user_id is null and sa.phone = v_my_phone
    limit 1;

    return v_scout_id;
  end;
  $$;

revoke all on function public.find_claimable_scout_id() from public;
grant execute on function public.find_claimable_scout_id() to authenticated;

create or replace function public.claim_scout_account(p_scout_id uuid) returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_my_phone text;
    v_application_phone text;
  begin
    select phone into v_my_phone from public.profiles where id = auth.uid();
    if v_my_phone is null then
      return;
    end if;

    select sa.phone into v_application_phone
    from public.scouts s
    join public.scout_applications sa on sa.id = s.application_id
    where s.id = p_scout_id and s.user_id is null;

    if v_application_phone is null or v_application_phone != v_my_phone then
      return;
    end if;

    update public.scouts set user_id = auth.uid() where id = p_scout_id and user_id is null;
  end;
  $$;

revoke all on function public.claim_scout_account(uuid) from public;
grant execute on function public.claim_scout_account(uuid) to authenticated;
