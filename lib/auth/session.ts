import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Defense in depth: call at the top of any protected Server
 * Component/Action, don't rely on middleware alone (see
 * lib/supabase/middleware.ts for the matching check there). Also enforces
 * account suspension — found live, where a suspended account could still
 * reach every protected page and action because nothing actually checked
 * `account_status`, only the admin UI's badge color changed.
 */
export async function requireUser(nextPath?: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("account_status").eq("id", user.id).single();
  if (profile?.account_status === "suspended") {
    await supabase.auth.signOut();
    redirect("/suspended");
  }

  return user;
}

export async function getCurrentUserRoles(): Promise<AppRole[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  return (data ?? []).map((row) => row.role);
}

export async function requireRole(role: AppRole, nextPath?: string) {
  const user = await requireUser(nextPath);
  const roles = await getCurrentUserRoles();
  if (!roles.includes(role)) {
    redirect("/");
  }
  return user;
}

export async function requireAnyRole(allowed: AppRole[], nextPath?: string) {
  const user = await requireUser(nextPath);
  const roles = await getCurrentUserRoles();
  if (!roles.some((r) => allowed.includes(r))) {
    redirect("/");
  }
  return { user, roles };
}
