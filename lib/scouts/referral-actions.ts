"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * The owner's own explicit confirm/decline of a pending referral
 * created at signup (lib/auth/actions.ts's attributeScoutReferral).
 * Declining is final in this milestone -- no re-attribution flow.
 */
export async function confirmScoutReferralAction(referralId: string) {
  const user = await requireUser("/onboarding/welcome");
  const admin = createServiceRoleClient();

  await admin
    .from("owner_referrals")
    .update({ status: "confirmed", confirmed_by_owner_at: new Date().toISOString() })
    .eq("id", referralId)
    .eq("owner_user_id", user.id)
    .eq("status", "pending_confirmation");

  revalidatePath("/onboarding/welcome");
}

export async function declineScoutReferralAction(referralId: string) {
  const user = await requireUser("/onboarding/welcome");
  const admin = createServiceRoleClient();

  await admin
    .from("owner_referrals")
    .update({ status: "declined" })
    .eq("id", referralId)
    .eq("owner_user_id", user.id)
    .eq("status", "pending_confirmation");

  revalidatePath("/onboarding/welcome");
}
