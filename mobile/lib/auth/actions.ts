import { supabase } from "../supabase";
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from "../validation/auth";

export interface AuthResult {
  error?: string;
  fieldErrors?: Partial<Record<keyof RegisterInput | keyof LoginInput, string>>;
}

function firstFieldErrors<T extends string>(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Partial<Record<T, string>> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]) as T;
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function registerAction(input: RegisterInput): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.displayName } },
  });
  if (error) {
    return { error: error.message };
  }

  // No service-role layer on mobile -- the on_auth_user_created DB
  // trigger already granted the default 'renter' role (same as web);
  // 'owner' is granted via a SECURITY DEFINER RPC that only ever
  // touches auth.uid()'s own row, the shared-backend equivalent of the
  // web Server Action's service-role upsert. See
  // supabase/migrations/20261107000100_self_service_owner_role.sql.
  if (parsed.data.intent === "owner") {
    const { error: roleError } = await supabase.rpc("grant_owner_role_to_self");
    if (roleError) {
      return { error: "Your account was created, but we couldn't set up owner access. Try again from your profile." };
    }
  }

  return {};
}

export async function loginAction(input: LoginInput): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error) };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Incorrect email or password." };
  }

  return {};
}

export async function logoutAction() {
  // Best-effort: remove this device's push token before the session
  // goes away, so a shared device doesn't keep getting this account's
  // pushes after logout. Never blocks sign-out on failure.
  try {
    const Device = await import("expo-device");
    if (Device.isDevice) {
      const Notifications = await import("expo-notifications");
      const { data: token } = await Notifications.getExpoPushTokenAsync();
      await supabase.from("push_tokens").delete().eq("token", token);
    }
  } catch {
    // ignore -- see above
  }
  await supabase.auth.signOut();
}
