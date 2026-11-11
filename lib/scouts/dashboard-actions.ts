"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * Links a promoted scout's record to their own account, so they can
 * see their dashboard. Guarded by an exact match between the account's
 * own profiles.phone (set via /account, same field used everywhere
 * else in this app) and the phone on the scout's original application
 * -- the only linking mechanism in this milestone. scouts.user_id is
 * only ever set here if it's still null, so this can't hijack an
 * already-linked scout record.
 */
export async function claimScoutAccountAction(scoutId: string) {
  const user = await requireUser("/scouts/dashboard");
  const admin = createServiceRoleClient();

  const { data: profile } = await admin.from("profiles").select("phone").eq("id", user.id).maybeSingle();
  if (!profile?.phone) return;

  const { data: scout } = await admin
    .from("scouts")
    .select("id, user_id, scout_applications(phone)")
    .eq("id", scoutId)
    .is("user_id", null)
    .maybeSingle();
  const applicationPhone = (scout as { scout_applications: { phone: string } | null } | null)?.scout_applications?.phone;
  if (!scout || !applicationPhone || applicationPhone !== profile.phone) return;

  await admin.from("scouts").update({ user_id: user.id }).eq("id", scoutId).is("user_id", null);

  revalidatePath("/scouts/dashboard");
}
