"use server";

import { revalidatePath } from "next/cache";
import { recordAdminAction } from "@/lib/admin/audit";
import { requireAnyRole } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { scoutProgramSettingsSchema } from "@/lib/validation/scouts";

export async function updateScoutProgramSettingsAction(formData: FormData) {
  const { user } = await requireAnyRole(["admin"], "/admin/scouts/settings");
  const parsed = scoutProgramSettingsSchema.safeParse({
    bountyAmountUsd: formData.get("bountyAmountUsd"),
    sharePercent: formData.get("sharePercent"),
    shareDurationMonths: formData.get("shareDurationMonths"),
    monthlyCapUsd: formData.get("monthlyCapUsd") || undefined,
    payoutProvider: formData.get("payoutProvider"),
    payoutMethodNotes: formData.get("payoutMethodNotes"),
    taxTreatmentNotes: formData.get("taxTreatmentNotes"),
  });
  if (!parsed.success) return;

  const admin = createServiceRoleClient();
  await admin
    .from("scout_program_settings")
    .update({
      bounty_amount_usd: parsed.data.bountyAmountUsd,
      share_percent: parsed.data.sharePercent,
      share_duration_months: parsed.data.shareDurationMonths,
      monthly_cap_usd: parsed.data.monthlyCapUsd ?? null,
      payout_provider: parsed.data.payoutProvider || null,
      payout_method_notes: parsed.data.payoutMethodNotes || null,
      tax_treatment_notes: parsed.data.taxTreatmentNotes || null,
      updated_by: user.id,
    })
    .eq("id", true);

  await recordAdminAction({
    actorId: user.id,
    action: "scout_program_settings_updated",
    targetTable: "scout_program_settings",
    targetId: "singleton",
    metadata: {
      bountyAmountUsd: parsed.data.bountyAmountUsd,
      sharePercent: parsed.data.sharePercent,
      shareDurationMonths: parsed.data.shareDurationMonths,
    },
  });

  revalidatePath("/admin/scouts/settings");
}
