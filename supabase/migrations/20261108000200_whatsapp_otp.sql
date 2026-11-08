-- WhatsApp OTP sign-up/sign-in (docs/AUTH_ALTERNATIVES.md, Option 2).
-- Not a native Supabase Auth method -- Supabase's phone/OTP provider
-- only delivers via the project's configured SMS provider, never
-- WhatsApp -- so this is a fully custom credential store, same shape
-- and same reasoning as webauthn_challenges (20261103000100_webauthn.sql):
-- the app generates and verifies the code itself, then mints a real
-- Supabase session through the service-role admin API once verified.
--
-- Only the hash of the code is ever stored, never the code itself --
-- same principle as a password hash, so a database read alone can
-- never recover a valid code.

create table public.whatsapp_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  purpose text not null check (purpose in ('signup', 'login')),
  -- Holds the provisional displayName/email/intent for a signup
  -- challenge -- nothing else reads or writes this column. Empty for
  -- a login challenge (the account already exists).
  metadata jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index whatsapp_otp_challenges_phone_idx on public.whatsapp_otp_challenges (phone, created_at desc);
create index whatsapp_otp_challenges_expires_at_idx on public.whatsapp_otp_challenges (expires_at);

comment on table public.whatsapp_otp_challenges is
  'Pending WhatsApp OTP state, service_role-only. Short TTL, consumed '
  '(deleted) on a successful verify or once attempts are exhausted.';

-- Row Level Security -----------------------------------------------------
-- Never exposed to anon/authenticated at all -- no policies are granted,
-- so RLS denies every client-side access; only the service-role Server
-- Actions and mobile-facing API routes in lib/auth/whatsapp-actions.ts
-- and app/api/mobile/whatsapp-otp/* read or write this table.
alter table public.whatsapp_otp_challenges enable row level security;
