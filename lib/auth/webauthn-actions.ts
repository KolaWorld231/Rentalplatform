"use server";

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireUser } from "@/lib/auth/session";
import { brand } from "@/lib/config/brand";
import { mintSessionForEmail } from "@/lib/auth/session-mint";
import { webAuthnConfig } from "@/lib/auth/webauthn-config";
import { passkeyLabelSchema, passkeySignupSchema } from "@/lib/validation/auth";
import type { WebAuthnChallenge, WebAuthnCredential } from "@/types/database";

const CHALLENGE_TTL_MS = 2 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_STARTS = 5;

export interface WebAuthnActionState {
  error?: string;
  optionsJSON?: unknown;
  challengeId?: string;
}

async function checkStartRateLimit(purpose: WebAuthnChallenge["purpose"], userId: string | null) {
  const admin = createServiceRoleClient();
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  let query = admin
    .from("webauthn_challenges")
    .select("id", { count: "exact", head: true })
    .eq("purpose", purpose)
    .gte("created_at", since);
  query = userId ? query.eq("user_id", userId) : query.is("user_id", null);
  const { count } = await query;
  return (count ?? 0) < RATE_LIMIT_MAX_STARTS;
}

async function storeChallenge(
  purpose: WebAuthnChallenge["purpose"],
  challenge: string,
  userId: string | null,
  metadata: Record<string, unknown> = {},
) {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("webauthn_challenges")
    .insert({
      purpose,
      challenge,
      user_id: userId,
      metadata,
      expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not start the passkey ceremony. Please try again.");
  return data.id as string;
}

async function consumeChallenge(challengeId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin.from("webauthn_challenges").select("*").eq("id", challengeId).single();
  await admin.from("webauthn_challenges").delete().eq("id", challengeId);
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return data as WebAuthnChallenge;
}

function publicKeyToBase64(publicKey: Uint8Array) {
  return Buffer.from(publicKey).toString("base64");
}

function base64ToPublicKey(base64: string) {
  return new Uint8Array(Buffer.from(base64, "base64"));
}

// mintSessionForEmail moved to lib/auth/session-mint.ts, shared with
// the WhatsApp OTP flow -- see that file for the trick itself.

// --- Registering an additional passkey for an already-logged-in user ---

export async function startPasskeyRegistrationAction(): Promise<WebAuthnActionState> {
  const user = await requireUser();
  if (!(await checkStartRateLimit("registration", user.id))) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const admin = createServiceRoleClient();
  const [{ data: profile }, { data: existing }] = await Promise.all([
    admin.from("profiles").select("display_name").eq("id", user.id).single(),
    admin.from("webauthn_credentials").select("credential_id, transports").eq("user_id", user.id),
  ]);

  const { rpID, rpName } = webAuthnConfig();
  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userName: user.email ?? profile?.display_name ?? user.id,
    userDisplayName: profile?.display_name ?? user.email ?? `${brand.name} user`,
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
    excludeCredentials: (existing ?? []).map((c: Pick<WebAuthnCredential, "credential_id" | "transports">) => ({
      id: c.credential_id,
      transports: c.transports,
    })),
  });

  const challengeId = await storeChallenge("registration", options.challenge, user.id);
  return { optionsJSON: options, challengeId };
}

export async function verifyPasskeyRegistrationAction(
  challengeId: string,
  response: RegistrationResponseJSON,
  label?: string,
): Promise<WebAuthnActionState> {
  const user = await requireUser();
  const parsedLabel = passkeyLabelSchema.safeParse({ label });

  const challenge = await consumeChallenge(challengeId);
  if (!challenge || challenge.purpose !== "registration" || challenge.user_id !== user.id) {
    return { error: "This passkey request has expired. Please try again." };
  }

  const { rpID, origin } = webAuthnConfig();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch {
    return { error: "We couldn't verify that passkey. Please try again." };
  }
  if (!verification.verified || !verification.registrationInfo) {
    return { error: "We couldn't verify that passkey. Please try again." };
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const admin = createServiceRoleClient();
  const { error } = await admin.from("webauthn_credentials").insert({
    user_id: user.id,
    credential_id: credential.id,
    public_key: publicKeyToBase64(credential.publicKey),
    counter: credential.counter,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
    transports: credential.transports ?? [],
    label: parsedLabel.success && parsedLabel.data.label ? parsedLabel.data.label : "Passkey",
  });
  if (error) {
    return { error: "We couldn't save that passkey. Please try again." };
  }

  return {};
}

// --- Signing up with a passkey, no existing account ---

export async function startPasskeySignupAction(
  _prev: WebAuthnActionState,
  formData: FormData,
): Promise<WebAuthnActionState> {
  const parsed = passkeySignupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  if (!(await checkStartRateLimit("registration", null))) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  // No pre-check for an existing email here -- auth.users' own unique
  // email index is the source of truth, enforced when the account is
  // actually created in verifyPasskeySignupAction (which turns that
  // failure into a friendly "try signing in instead" message).
  const { rpID, rpName } = webAuthnConfig();
  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userName: parsed.data.email,
    userDisplayName: parsed.data.displayName,
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });

  const challengeId = await storeChallenge("registration", options.challenge, null, {
    email: parsed.data.email,
    displayName: parsed.data.displayName,
    intent: parsed.data.intent,
  });
  return { optionsJSON: options, challengeId };
}

export async function verifyPasskeySignupAction(challengeId: string, response: RegistrationResponseJSON) {
  const challenge = await consumeChallenge(challengeId);
  if (!challenge || challenge.purpose !== "registration" || challenge.user_id !== null) {
    return { error: "This sign-up request has expired. Please start again." };
  }

  const meta = challenge.metadata as { email?: string; displayName?: string; intent?: "renter" | "owner" };
  if (!meta.email || !meta.displayName || !meta.intent) {
    return { error: "This sign-up request has expired. Please start again." };
  }

  const { rpID, origin } = webAuthnConfig();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
  } catch {
    return { error: "We couldn't verify that passkey. Please try again." };
  }
  if (!verification.verified || !verification.registrationInfo) {
    return { error: "We couldn't verify that passkey. Please try again." };
  }

  const admin = createServiceRoleClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: meta.email,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(),
    user_metadata: { display_name: meta.displayName },
  });
  if (createError || !created.user) {
    return {
      error: createError?.message.includes("already been registered")
        ? "An account with that email already exists. Try signing in with a passkey instead."
        : "We couldn't create your account. Please try again.",
    };
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const { error: credentialError } = await admin.from("webauthn_credentials").insert({
    user_id: created.user.id,
    credential_id: credential.id,
    public_key: publicKeyToBase64(credential.publicKey),
    counter: credential.counter,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
    transports: credential.transports ?? [],
    label: "Passkey",
  });
  if (credentialError) {
    return { error: "We couldn't finish setting up your passkey. Please try again." };
  }

  // Mirrors registerAction's intent -> role logic in lib/auth/actions.ts:
  // the on_auth_user_created trigger already granted 'renter'; add
  // 'owner' too when that's the declared intent.
  if (meta.intent === "owner") {
    await admin.from("user_roles").upsert({ user_id: created.user.id, role: "owner" }, { onConflict: "user_id,role" });
  }

  await mintSessionForEmail(meta.email);
  redirect("/onboarding/welcome");
}

// --- Signing in with a passkey ---

export async function startPasskeyLoginAction(): Promise<WebAuthnActionState> {
  if (!(await checkStartRateLimit("authentication", null))) {
    return { error: "Too many attempts. Please wait a minute and try again." };
  }

  const { rpID } = webAuthnConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
  });

  const challengeId = await storeChallenge("authentication", options.challenge, null);
  return { optionsJSON: options, challengeId };
}

export async function verifyPasskeyLoginAction(challengeId: string, response: AuthenticationResponseJSON) {
  const challenge = await consumeChallenge(challengeId);
  if (!challenge || challenge.purpose !== "authentication") {
    return { error: "This sign-in request has expired. Please try again." };
  }

  const admin = createServiceRoleClient();
  const { data: stored } = await admin
    .from("webauthn_credentials")
    .select("*")
    .eq("credential_id", response.id)
    .maybeSingle();
  if (!stored) {
    return { error: "We don't recognize that passkey." };
  }

  const { data: authUser } = await admin.auth.admin.getUserById(stored.user_id);
  if (!authUser.user?.email) {
    return { error: "We couldn't sign you in. Please try again." };
  }

  const { rpID, origin } = webAuthnConfig();
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.credential_id,
        publicKey: base64ToPublicKey(stored.public_key),
        counter: stored.counter,
        transports: stored.transports as AuthenticatorTransport[],
      },
    });
  } catch {
    return { error: "We couldn't verify that passkey. Please try again." };
  }
  if (!verification.verified) {
    return { error: "We couldn't verify that passkey. Please try again." };
  }

  await admin
    .from("webauthn_credentials")
    .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq("id", stored.id);

  await mintSessionForEmail(authUser.user.email);
  redirect("/");
}

// --- Managing existing passkeys from /account ---

export async function listPasskeysAction() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("webauthn_credentials")
    .select("id, label, device_type, created_at, last_used_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function deletePasskeyAction(credentialRowId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("webauthn_credentials").delete().eq("id", credentialRowId).eq("user_id", user.id);
}
