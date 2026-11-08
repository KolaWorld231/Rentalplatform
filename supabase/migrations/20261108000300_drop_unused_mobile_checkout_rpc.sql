-- public.start_mobile_checkout() (20261107000200_mobile_checkout_rpc.sql)
-- was superseded by app/api/mobile/checkout/route.ts before it was ever
-- used by a shipped mobile build, and that route itself has since been
-- deleted entirely (mobile no longer initiates a checkout at all -- see
-- docs/IMPLEMENTATION_STATUS.md's "Mobile IAP policy decision: reader-app
-- pattern"). Nothing calls this function; dropping it rather than leaving
-- a second, now-doubly-dead checkout primitive deployed.
drop function if exists public.start_mobile_checkout();
