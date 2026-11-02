-- Passkey (WebAuthn/biometric) sign-up and sign-in. Supabase Auth has no
-- native passwordless-passkey primary sign-in (WebAuthn there is only an
-- MFA second factor on an already-authenticated session), so this is a
-- custom credential store: the app verifies the WebAuthn ceremony itself
-- (lib/auth/webauthn-actions.ts, via @simplewebauthn/server) and, once
-- verified, mints a real Supabase session through the service-role admin
-- API — these tables just hold what that verification needs.

create table public.webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credential_id text not null unique,
  -- base64-encoded, not bytea: avoids PostgREST's hex-string bytea
  -- encoding entirely, so the Server Actions round-trip it with a plain
  -- Buffer.from(..., "base64") on both read and write.
  public_key text not null,
  counter bigint not null default 0,
  device_type text not null,
  backed_up boolean not null default false,
  transports text[] not null default '{}',
  label text not null default 'Passkey',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index webauthn_credentials_user_id_idx on public.webauthn_credentials (user_id);

comment on table public.webauthn_credentials is
  'Registered passkeys. Row writes only ever happen via service_role, '
  'from lib/auth/webauthn-actions.ts, after server-side WebAuthn '
  'ceremony verification -- never client-writable.';

-- Short-lived WebAuthn challenges. user_id is null during sign-up and
-- during the discoverable-credential sign-in flow, since no user is
-- known yet at that point -- the row is matched back to a user only
-- after a successful ceremony. Never exposed to anon/authenticated at
-- all; only the service-role Server Actions read/write this table.
create table public.webauthn_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('registration', 'authentication')),
  challenge text not null,
  -- Holds the provisional email/display_name/intent for a passkey
  -- sign-up challenge (purpose = 'registration', user_id null) --
  -- nothing else reads or writes this column.
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index webauthn_challenges_expires_at_idx on public.webauthn_challenges (expires_at);

comment on table public.webauthn_challenges is
  'Pending WebAuthn ceremony state, service_role-only. Short TTL '
  '(a couple of minutes), cleaned up on verify or expiry by the '
  'Server Actions that use it.';

-- Row Level Security -----------------------------------------------------

alter table public.webauthn_credentials enable row level security;
alter table public.webauthn_challenges enable row level security;

-- A user may see and remove their own passkeys (the /account "manage
-- passkeys" UI), but never insert/update one directly -- registration
-- only ever completes through the service-role verify action, after a
-- real WebAuthn attestation has been checked server-side.
create policy webauthn_credentials_select_self on public.webauthn_credentials
  for select
  to authenticated
  using (user_id = auth.uid());

create policy webauthn_credentials_delete_self on public.webauthn_credentials
  for delete
  to authenticated
  using (user_id = auth.uid());

-- webauthn_challenges gets no anon/authenticated policies at all --
-- default-deny, service_role only (it bypasses RLS and is the only
-- role ever granted access below).

grant select, delete on public.webauthn_credentials to authenticated;
grant all on public.webauthn_credentials, public.webauthn_challenges to service_role;
