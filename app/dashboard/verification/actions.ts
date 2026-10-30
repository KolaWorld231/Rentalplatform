"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function submitIdentityVerificationAction() {
  const user = await requireUser("/dashboard/verification");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("identity_verification_requests")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["submitted", "under_review", "needs_more_info"])
    .maybeSingle();

  if (!existing) {
    await supabase.from("identity_verification_requests").insert({ user_id: user.id });
  }

  revalidatePath("/dashboard/verification");
}

export async function submitPropertyVerificationAction(propertyId: string) {
  const user = await requireUser("/dashboard/verification");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("property_verification_requests")
    .select("id, status")
    .eq("property_id", propertyId)
    .in("status", ["submitted", "under_review", "needs_more_info"])
    .maybeSingle();

  if (!existing) {
    await supabase
      .from("property_verification_requests")
      .insert({ property_id: propertyId, applicant_id: user.id });
  }

  revalidatePath("/dashboard/verification");
}

/**
 * Verification documents live in a PRIVATE Storage bucket; this is the
 * only way to view one. Authorization is checked explicitly here (not
 * just left to Storage's own RLS) because the signed URL this returns is
 * usable by anyone who has it for its short lifetime — so we only ever
 * hand one to the applicant or a moderator/admin.
 */
export async function getSignedDocumentUrlAction(
  documentId: string,
): Promise<{ url: string } | { error: string }> {
  await requireUser();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("private_verification_documents")
    .select("storage_path, identity_request_id, property_request_id")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc) return { error: "Document not found." };

  // RLS on private_verification_documents already restricts the SELECT
  // above to the applicant or a moderator/admin — reaching this point at
  // all is itself proof of authorization. The service-role client below
  // is used only to generate the signed URL, not to re-check access.
  const admin = createServiceRoleClient();
  const { data: signed, error } = await admin.storage
    .from("verification-documents")
    .createSignedUrl(doc.storage_path, 60);

  if (error || !signed) return { error: "Couldn't generate a document link." };
  return { url: signed.signedUrl };
}

export async function confirmAvailabilityAction(propertyId: string) {
  await requireUser();
  const supabase = await createClient();
  await supabase
    .from("properties")
    .update({ last_availability_confirmed_at: new Date().toISOString() })
    .eq("id", propertyId);
  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${propertyId}/edit`);
}
