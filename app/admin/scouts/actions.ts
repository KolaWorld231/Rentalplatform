"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { recordAdminAction } from "@/lib/admin/audit";
import { requireAnyRole } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  PROBATION_DAYS,
  REAPPLY_AFTER_DAYS,
  scoutDecisionSchema,
  scoutReferenceOutcomeSchema,
} from "@/lib/validation/scouts";
import { scoutProgram } from "@/lib/config/brand";

function referralCode(): string {
  return `${scoutProgram.name.slice(0, 2).toUpperCase()}-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export async function recordReferenceOutcomeAction(referenceId: string, formData: FormData) {
  const { user } = await requireAnyRole(["admin", "moderator"], "/admin/scouts");
  const parsed = scoutReferenceOutcomeSchema.safeParse({
    outcome: formData.get("outcome"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return;

  const admin = createServiceRoleClient();
  await admin
    .from("scout_references")
    .update({
      outcome: parsed.data.outcome,
      notes: parsed.data.notes || null,
      contacted_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", referenceId);

  await recordAdminAction({
    actorId: user.id,
    action: "scout_reference_outcome_recorded",
    targetTable: "scout_references",
    targetId: referenceId,
    metadata: { outcome: parsed.data.outcome },
  });

  revalidatePath("/admin/scouts");
}

export async function recordVerificationStepAction(
  applicationId: string,
  stepType: "completeness_check" | "reference_check" | "identity_check" | "interview",
  status: "passed" | "failed" | "skipped",
  formData: FormData,
) {
  const { user } = await requireAnyRole(["admin", "moderator"], "/admin/scouts");
  const notes = (formData.get("notes") as string | null)?.trim() ?? "";

  const admin = createServiceRoleClient();
  await admin.from("scout_verification_steps").insert({
    application_id: applicationId,
    step_type: stepType,
    status,
    reviewer_id: user.id,
    notes: notes || null,
    completed_at: new Date().toISOString(),
  });

  await recordAdminAction({
    actorId: user.id,
    action: "scout_verification_step_recorded",
    targetTable: "scout_verification_steps",
    targetId: applicationId,
    metadata: { stepType, status },
  });

  revalidatePath("/admin/scouts");
}

export async function decideScoutApplicationAction(
  applicationId: string,
  decision: "approve_probation" | "waitlist" | "reject",
  formData: FormData,
) {
  const { user } = await requireAnyRole(["admin"], "/admin/scouts");
  const parsed = scoutDecisionSchema.safeParse({ decision, reason: formData.get("reason") });
  if (!parsed.success) return;

  const admin = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  if (decision === "approve_probation") {
    const { data: application } = await admin
      .from("scout_applications")
      .select("full_name, area_id")
      .eq("id", applicationId)
      .single();
    if (!application) return;

    await admin
      .from("scout_applications")
      .update({ status: "approved", decision_reason: parsed.data.reason || null, decided_by: user.id, decided_at: nowIso })
      .eq("id", applicationId);

    await admin.from("scouts").insert({
      application_id: applicationId,
      status: "probation",
      probation_ends_at: new Date(Date.now() + PROBATION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      referral_code: referralCode(),
      display_name: application.full_name,
      area_id: application.area_id,
    });
  } else if (decision === "waitlist") {
    await admin
      .from("scout_applications")
      .update({ status: "waitlisted", decision_reason: parsed.data.reason || null, decided_by: user.id, decided_at: nowIso })
      .eq("id", applicationId);
  } else {
    await admin
      .from("scout_applications")
      .update({
        status: "rejected",
        decision_reason: parsed.data.reason || null,
        decided_by: user.id,
        decided_at: nowIso,
        reapply_after: new Date(Date.now() + REAPPLY_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", applicationId);
  }

  await recordAdminAction({
    actorId: user.id,
    action: "scout_application_decided",
    targetTable: "scout_applications",
    targetId: applicationId,
    reason: parsed.data.reason,
    metadata: { decision },
  });

  revalidatePath("/admin/scouts");
}

export async function setScoutStatusAction(
  scoutId: string,
  status: "active" | "suspended" | "removed" | "resigned",
  formData: FormData,
) {
  const { user } = await requireAnyRole(["admin"], "/admin/scouts");
  const reason = (formData.get("reason") as string | null)?.trim() ?? "";

  const admin = createServiceRoleClient();
  await admin.from("scouts").update({ status }).eq("id", scoutId);

  await recordAdminAction({
    actorId: user.id,
    action: "scout_status_changed",
    targetTable: "scouts",
    targetId: scoutId,
    reason: reason || undefined,
    metadata: { status },
  });

  revalidatePath("/admin/scouts");
}
