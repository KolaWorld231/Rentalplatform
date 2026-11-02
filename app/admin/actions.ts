"use server";

import { revalidatePath } from "next/cache";
import { notifyUser, recordAdminAction } from "@/lib/admin/audit";
import { requireAnyRole } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ListingStatus, VerificationStatus } from "@/types/database";

/**
 * Every function here is a privileged moderation/admin action. Each:
 * 1. Re-checks the caller's role server-side (never trusts the page
 *    having hidden a button).
 * 2. Performs the write via service_role, since the underlying tables
 *    have no client-writable policy for this kind of change (see
 *    docs/DATABASE_SCHEMA.md).
 * 3. Records an admin_audit_logs entry.
 * 4. Notifies the affected user where relevant.
 */

export async function reviewIdentityVerificationAction(
  requestId: string,
  decision: VerificationStatus,
  formData: FormData,
) {
  const notes = (formData.get("reason") as string | null)?.trim() ?? "";
  const { user } = await requireAnyRole(["admin", "moderator"], "/admin/verifications");
  const admin = createServiceRoleClient();

  const { data: request } = await admin
    .from("identity_verification_requests")
    .update({ status: decision, reviewer_id: user.id, reviewer_notes: notes || null, reviewed_at: new Date().toISOString() })
    .eq("id", requestId)
    .select("user_id")
    .single();

  await recordAdminAction({
    actorId: user.id,
    action: "review_identity_verification",
    targetTable: "identity_verification_requests",
    targetId: requestId,
    reason: notes,
    metadata: { decision },
  });

  if (request) {
    await notifyUser({
      userId: request.user_id,
      type: "verification_update",
      title: `Identity verification ${decision.replace("_", " ")}`,
      body: notes || undefined,
      link: "/dashboard/verification",
    });
  }

  revalidatePath("/admin/verifications");
}

export async function reviewPropertyVerificationAction(
  requestId: string,
  decision: VerificationStatus,
  formData: FormData,
) {
  const notes = (formData.get("reason") as string | null)?.trim() ?? "";
  const { user } = await requireAnyRole(["admin", "moderator"], "/admin/verifications");
  const admin = createServiceRoleClient();

  const { data: request } = await admin
    .from("property_verification_requests")
    .update({ status: decision, reviewer_id: user.id, reviewer_notes: notes || null, reviewed_at: new Date().toISOString() })
    .eq("id", requestId)
    .select("applicant_id")
    .single();

  await recordAdminAction({
    actorId: user.id,
    action: "review_property_verification",
    targetTable: "property_verification_requests",
    targetId: requestId,
    reason: notes,
    metadata: { decision },
  });

  if (request) {
    await notifyUser({
      userId: request.applicant_id,
      type: "verification_update",
      title: `Property verification ${decision.replace("_", " ")}`,
      body: notes || undefined,
      link: "/dashboard/verification",
    });
  }

  revalidatePath("/admin/verifications");
}

export async function moderatePropertyAction(propertyId: string, newStatus: ListingStatus, formData: FormData) {
  const reason = (formData.get("reason") as string | null)?.trim() ?? "";
  const { user } = await requireAnyRole(["admin", "moderator"], "/admin/listings");
  const admin = createServiceRoleClient();

  const { data: property } = await admin
    .from("properties")
    .update({ listing_status: newStatus, moderation_reason: reason || null })
    .eq("id", propertyId)
    .select("owner_id, title")
    .single();

  await recordAdminAction({
    actorId: user.id,
    action: "moderate_property",
    targetTable: "properties",
    targetId: propertyId,
    reason,
    metadata: { newStatus },
  });

  if (property) {
    await notifyUser({
      userId: property.owner_id,
      type: newStatus === "published" ? "listing_approved" : "listing_rejected",
      title: newStatus === "published" ? `"${property.title}" was approved` : `"${property.title}" was ${newStatus}`,
      body: reason || undefined,
      link: `/dashboard/properties/${propertyId}/edit`,
    });
  }

  revalidatePath("/admin/listings");
}

export async function resolvePropertyReportAction(
  reportId: string,
  status: "resolved" | "dismissed",
  formData: FormData,
) {
  const notes = (formData.get("reason") as string | null)?.trim() ?? "";
  const { user } = await requireAnyRole(["admin", "moderator"], "/admin/reports");
  const admin = createServiceRoleClient();

  await admin
    .from("property_reports")
    .update({ status, resolution_notes: notes || null, resolved_at: new Date().toISOString(), assigned_moderator_id: user.id })
    .eq("id", reportId);

  await recordAdminAction({
    actorId: user.id,
    action: "resolve_property_report",
    targetTable: "property_reports",
    targetId: reportId,
    reason: notes,
    metadata: { status },
  });

  revalidatePath("/admin/reports");
}

export async function resolveMessageReportAction(
  reportId: string,
  status: "resolved" | "dismissed",
) {
  const { user } = await requireAnyRole(["admin", "moderator"], "/admin/reports");
  const admin = createServiceRoleClient();

  await admin.from("message_reports").update({ status }).eq("id", reportId);

  await recordAdminAction({
    actorId: user.id,
    action: "resolve_message_report",
    targetTable: "message_reports",
    targetId: reportId,
    metadata: { status },
  });

  revalidatePath("/admin/reports");
}

export async function suspendUserAction(userId: string, formData: FormData) {
  const reason = (formData.get("reason") as string | null)?.trim() ?? "";
  const { user } = await requireAnyRole(["admin"], "/admin/users");
  if (!reason) throw new Error("A reason is required to suspend an account.");
  const admin = createServiceRoleClient();

  await admin.from("profiles").update({ account_status: "suspended" }).eq("id", userId);

  await recordAdminAction({
    actorId: user.id,
    action: "suspend_user",
    targetTable: "profiles",
    targetId: userId,
    reason,
  });

  await notifyUser({
    userId,
    type: "account_notice",
    title: "Your account has been suspended",
    body: reason,
  });

  revalidatePath("/admin/users");
}

export async function restoreUserAction(userId: string) {
  const { user } = await requireAnyRole(["admin"], "/admin/users");
  const admin = createServiceRoleClient();

  await admin.from("profiles").update({ account_status: "active" }).eq("id", userId);

  await recordAdminAction({
    actorId: user.id,
    action: "restore_user",
    targetTable: "profiles",
    targetId: userId,
  });

  await notifyUser({
    userId,
    type: "account_notice",
    title: "Your account has been restored",
  });

  revalidatePath("/admin/users");
}
