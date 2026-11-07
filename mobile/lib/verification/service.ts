// Hand-ported from ../../../app/dashboard/verification/actions.ts and
// ../../../components/verification/DocumentUploader.tsx -- same RLS-
// enforced self-insert policies, kept in sync by hand (see
// mobile/README.md). Verification evidence is NOT proof of legal
// ownership -- see lib/config/brand.ts's badge copy on web; mobile's
// copy (verification/[screen]) must say the same.
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../supabase";
import type { IdentityVerificationRequest, PropertyVerificationRequest, PrivateVerificationDocument } from "../database.types";

const ACTIVE_STATUSES = ["submitted", "under_review", "needs_more_info"] as const;

export async function getIdentityVerification(userId: string): Promise<IdentityVerificationRequest | null> {
  const { data } = await supabase
    .from("identity_verification_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function submitIdentityVerification(userId: string) {
  const { data: existing } = await supabase
    .from("identity_verification_requests")
    .select("id")
    .eq("user_id", userId)
    .in("status", ACTIVE_STATUSES)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await supabase.from("identity_verification_requests").insert({ user_id: userId }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function getPropertyVerification(propertyId: string): Promise<PropertyVerificationRequest | null> {
  const { data } = await supabase
    .from("property_verification_requests")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function submitPropertyVerification(propertyId: string, applicantId: string) {
  const { data: existing } = await supabase
    .from("property_verification_requests")
    .select("id")
    .eq("property_id", propertyId)
    .in("status", ACTIVE_STATUSES)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from("property_verification_requests")
    .insert({ property_id: propertyId, applicant_id: applicantId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function getDocuments(parent: { identityRequestId?: string; propertyRequestId?: string }): Promise<PrivateVerificationDocument[]> {
  let query = supabase.from("private_verification_documents").select("*");
  query = parent.identityRequestId ? query.eq("identity_request_id", parent.identityRequestId) : query.eq("property_request_id", parent.propertyRequestId!);
  const { data } = await query.order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * Uploads a captured photo (from expo-image-picker) to the private
 * verification-documents bucket and records it. `uri` is a local
 * file:// URI; storage-js's upload() on React Native needs the raw
 * bytes, so this reads the file first rather than passing the URI
 * through (fetch(uri).blob() is not reliable across RN/Expo versions).
 */
export async function uploadVerificationDocument(
  uri: string,
  parent: { identityRequestId?: string; propertyRequestId?: string },
  userId: string,
): Promise<{ error?: string }> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
  const arrayBuffer = decode(base64);

  const ext = uri.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const requestId = parent.identityRequestId ?? parent.propertyRequestId!;
  const path = `${userId}/${requestId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("verification-documents").upload(path, arrayBuffer, { contentType });
  if (uploadError) return { error: "Couldn't upload the photo. Try again." };

  const { error: insertError } = await supabase.from("private_verification_documents").insert({
    identity_request_id: parent.identityRequestId ?? null,
    property_request_id: parent.propertyRequestId ?? null,
    storage_path: path,
    original_filename: path.split("/").pop() ?? null,
    content_type: contentType,
    file_size_bytes: arrayBuffer.byteLength,
    uploaded_by: userId,
  });
  if (insertError) return { error: "Uploaded, but couldn't record the document. Try again." };
  return {};
}

export async function isIdentityVerified(userId: string): Promise<boolean> {
  const { data } = await supabase.rpc("is_identity_verified", { target_user: userId });
  return data ?? false;
}

export async function isPropertyVerified(propertyId: string): Promise<boolean> {
  const { data } = await supabase.rpc("is_property_verified", { target_property: propertyId });
  return data ?? false;
}
