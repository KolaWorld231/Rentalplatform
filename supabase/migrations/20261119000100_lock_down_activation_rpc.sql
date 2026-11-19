-- Re-assert that only the service role may activate a subscription.
--
-- 20260103000100 already revoked this from PUBLIC and granted it to
-- service_role alone, but in the hosted project the function is callable
-- by `anon` and `authenticated`: probing it as an anonymous client
-- returns P0001 raised from inside the function body, not 42501
-- insufficient_privilege. The production schema therefore does not match
-- that migration.
--
-- The consequence was a complete bypass of the payment system,
-- reproduced end to end against the hosted database: sign up, let the
-- checkout create a pending transaction, then call this function on that
-- transaction and the subscription flips to `active` with no payment of
-- any kind. CLAUDE.md rule #6 -- only a server-verified payment may
-- activate a subscription -- was not being enforced.
--
-- A plain `revoke ... from public` is not enough on its own here: in
-- PostgreSQL, privileges held directly by `anon` or `authenticated` are
-- not removed by revoking from PUBLIC, so each role is named explicitly.
-- Every statement is idempotent and safe to re-run.

revoke all on function public.confirm_payment_and_activate_subscription(uuid, text) from public;
revoke all on function public.confirm_payment_and_activate_subscription(uuid, text) from anon;
revoke all on function public.confirm_payment_and_activate_subscription(uuid, text) from authenticated;
grant execute on function public.confirm_payment_and_activate_subscription(uuid, text) to service_role;

-- No other privileged function needs the same treatment today. The
-- remaining security-definer functions were each probed against the
-- hosted project and are either already service-role-only or are
-- deliberately callable by a signed-in user because they read
-- auth.uid() from the JWT rather than taking a target as an argument
-- (grant_owner_role_to_self, register_push_token, the has_*/is_*
-- predicates, the verified_* batch lookups).
