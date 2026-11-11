"use server";

import { redirect } from "next/navigation";
import { firstFieldErrors } from "@/lib/auth/field-errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";

export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    intent: formData.get("intent"),
    refCode: formData.get("refCode"),
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName } },
  });

  if (error) {
    return { error: error.message };
  }

  // The on_auth_user_created DB trigger already granted the default
  // 'renter' role. If the person's onboarding intent is to list a
  // property, grant 'owner' too — this write happens with the
  // service-role key, from validated server code, never trusting a
  // client-supplied role value directly.
  if (parsed.data.intent === "owner" && data.user) {
    const admin = createServiceRoleClient();
    await admin.from("user_roles").upsert(
      { user_id: data.user.id, role: "owner" },
      { onConflict: "user_id,role" },
    );

    if (parsed.data.refCode) {
      await attributeScoutReferral(data.user.id, parsed.data.refCode);
    }
  }

  redirect("/onboarding/welcome");
}

// First-touch referral capture only -- never blocks registration if
// the code is invalid/unknown or the insert fails (unique index on
// owner_user_id means a retry can't double-attribute anyway). The
// owner still has to explicitly confirm this on /onboarding/welcome
// before it's treated as real attribution; see
// lib/scouts/referral-actions.ts.
async function attributeScoutReferral(ownerUserId: string, refCode: string) {
  const admin = createServiceRoleClient();
  const { data: scout } = await admin.from("scouts").select("id, user_id").eq("referral_code", refCode).maybeSingle();
  if (!scout) return;
  if (scout.user_id === ownerUserId) return; // self-referral -- never credited

  await admin.from("owner_referrals").insert({ scout_id: scout.id, owner_user_id: ownerUserId, source: "code" });
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Incorrect email or password." };
  }

  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/reset-password`,
  });

  // Always respond the same way whether or not the email exists, so this
  // endpoint can't be used to enumerate registered accounts.
  return {};
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: error.message };
  }

  redirect("/login?reset=success");
}
