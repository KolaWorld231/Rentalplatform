"use server";

import { revalidatePath } from "next/cache";
import { recordAdminAction } from "@/lib/admin/audit";
import { requireAnyRole } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { BOUNTY_CONFIRMED_AVAILABLE_AFTER_DAYS } from "@/lib/validation/scouts";
import type { OwnerReferral } from "@/types/database";

/**
 * Computes verified-listing bounties for confirmed referrals that
 * don't have one yet. Admin-triggered (no cron/job-scheduler
 * infrastructure exists in this codebase) -- safe to re-run any time:
 * the unique index on (owner_referral_id) where type='bounty' makes a
 * duplicate insert fail silently (caught per-row), so running this
 * twice never double-pays.
 *
 * Eligibility, read directly from the spec's own table: the referred
 * owner is identity-verified, has at least one published listing,
 * that listing's availability was reconfirmed at least
 * BOUNTY_CONFIRMED_AVAILABLE_AFTER_DAYS after the referral was
 * confirmed, and there's no open/investigating report against any of
 * the owner's properties.
 */
export async function computeBountyEarningsAction() {
  const { user } = await requireAnyRole(["admin"], "/admin/scouts");
  const admin = createServiceRoleClient();

  const { data: settings } = await admin.from("scout_program_settings").select("bounty_amount_usd").eq("id", true).single();
  const bountyAmountUsd = settings?.bounty_amount_usd ?? 0;

  const { data: confirmedReferrals } = (await admin
    .from("owner_referrals")
    .select("*")
    .eq("status", "confirmed")) as { data: OwnerReferral[] | null };

  let created = 0;
  for (const referral of confirmedReferrals ?? []) {
    // Already has a bounty -- the unique index would reject this
    // anyway, but checking first avoids a noisy insert-error per
    // already-paid referral on every re-run.
    const { data: existing } = await admin
      .from("scout_earnings_ledger")
      .select("id")
      .eq("owner_referral_id", referral.id)
      .eq("type", "bounty")
      .maybeSingle();
    if (existing) continue;

    const { data: identityVerified } = await admin.rpc("is_identity_verified", { target_user: referral.owner_user_id });
    if (!identityVerified) continue;

    const cutoff = new Date(
      new Date(referral.confirmed_by_owner_at ?? referral.attributed_at).getTime() +
        BOUNTY_CONFIRMED_AVAILABLE_AFTER_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: eligibleListing } = await admin
      .from("properties")
      .select("id")
      .eq("owner_id", referral.owner_user_id)
      .eq("listing_status", "published")
      .not("last_availability_confirmed_at", "is", null)
      .lte("last_availability_confirmed_at", cutoff)
      .limit(1)
      .maybeSingle();
    if (!eligibleListing) continue;

    const { data: openReport } = await admin
      .from("property_reports")
      .select("id, properties!inner(owner_id)")
      .eq("properties.owner_id", referral.owner_user_id)
      .in("status", ["open", "investigating"])
      .limit(1)
      .maybeSingle();
    if (openReport) continue;

    const { error: insertError } = await admin.from("scout_earnings_ledger").insert({
      scout_id: referral.scout_id,
      owner_referral_id: referral.id,
      type: "bounty",
      amount: bountyAmountUsd,
      status: "pending",
      source_ref: eligibleListing.id,
    });
    if (!insertError) created += 1;
  }

  await recordAdminAction({
    actorId: user.id,
    action: "scout_bounty_earnings_computed",
    targetTable: "scout_earnings_ledger",
    targetId: "batch",
    metadata: { created },
  });

  revalidatePath("/admin/scouts");
}

export async function approveEarningAction(earningId: string) {
  const { user } = await requireAnyRole(["admin"], "/admin/scouts");
  const admin = createServiceRoleClient();

  await admin.from("scout_earnings_ledger").update({ status: "approved" }).eq("id", earningId).eq("status", "pending");

  await recordAdminAction({ actorId: user.id, action: "scout_earning_approved", targetTable: "scout_earnings_ledger", targetId: earningId });
  revalidatePath("/admin/scouts");
}

export async function reverseEarningAction(earningId: string, formData: FormData) {
  const { user } = await requireAnyRole(["admin"], "/admin/scouts");
  const reason = (formData.get("reason") as string | null)?.trim() ?? "";
  const admin = createServiceRoleClient();

  await admin.from("scout_earnings_ledger").update({ status: "reversed" }).eq("id", earningId);

  await recordAdminAction({
    actorId: user.id,
    action: "scout_earning_reversed",
    targetTable: "scout_earnings_ledger",
    targetId: earningId,
    reason: reason || undefined,
  });
  revalidatePath("/admin/scouts");
}

/**
 * Records that a payout was made out-of-band -- no payout provider is
 * integrated (see the scout_payouts table comment). This marks the
 * underlying approved ledger rows "paid" and writes one payout record
 * for the admin's own reference; it never calls any external API.
 */
export async function recordPayoutAction(scoutId: string, formData: FormData) {
  const { user } = await requireAnyRole(["admin"], "/admin/scouts");
  const method = (formData.get("method") as string | null)?.trim() ?? "";
  const providerReference = (formData.get("providerReference") as string | null)?.trim() ?? "";
  const admin = createServiceRoleClient();

  const { data: approved } = await admin
    .from("scout_earnings_ledger")
    .select("id, amount")
    .eq("scout_id", scoutId)
    .eq("status", "approved");
  const total = (approved ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
  if (total <= 0) return;

  const nowIso = new Date().toISOString();
  const { data: payout } = await admin
    .from("scout_payouts")
    .insert({ scout_id: scoutId, amount: total, method: method || null, provider_reference: providerReference || null, status: "paid", paid_by: user.id, paid_at: nowIso })
    .select("id")
    .single();

  await admin
    .from("scout_earnings_ledger")
    .update({ status: "paid" })
    .eq("scout_id", scoutId)
    .eq("status", "approved");

  await recordAdminAction({
    actorId: user.id,
    action: "scout_payout_recorded",
    targetTable: "scout_payouts",
    targetId: payout?.id ?? scoutId,
    metadata: { amount: total, method },
  });
  revalidatePath("/admin/scouts");
}
