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

/** Defense in depth: call at the top of any protected Server Component/Action, don't rely on middleware alone. */
export async function requireUser(nextPath?: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
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
