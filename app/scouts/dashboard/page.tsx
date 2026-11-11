import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { scoutProgram } from "@/lib/config/brand";
import { claimScoutAccountAction } from "@/lib/scouts/dashboard-actions";
import type { OwnerReferral, Scout } from "@/types/database";

export const metadata = { title: `My ${scoutProgram.name} dashboard` };

const REFERRAL_STATUS_COPY: Record<string, string> = {
  pending_confirmation: "Waiting on owner confirmation",
  confirmed: "Confirmed",
  declined: "Declined",
};

export default async function ScoutDashboardPage() {
  const user = await requireUser("/scouts/dashboard");
  const admin = createServiceRoleClient();

  const { data: myScout } = (await admin.from("scouts").select("*").eq("user_id", user.id).maybeSingle()) as {
    data: Scout | null;
  };

  if (!myScout) {
    type ClaimableScout = Scout & { scout_applications: { full_name: string } | null };
    const { data: profile } = await admin.from("profiles").select("phone").eq("id", user.id).maybeSingle();
    let claimableScout: ClaimableScout | null = null;
    if (profile?.phone) {
      const { data: candidate } = await admin
        .from("scouts")
        .select("*, scout_applications!inner(full_name, phone)")
        .is("user_id", null)
        .eq("scout_applications.phone", profile.phone)
        .maybeSingle();
      claimableScout = candidate as ClaimableScout | null;
    }

    return (
      <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
        {claimableScout ? (
          <Card className="p-6">
            <p className="text-sm text-charcoal-700">
              We found a promoted {scoutProgram.name} application matching your account&apos;s phone number.
            </p>
            <form action={claimScoutAccountAction.bind(null, claimableScout.id)} className="mt-4">
              <Button type="submit" className="w-full">
                Claim my scout dashboard
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-6">
            <p className="text-sm text-charcoal-700">
              No scout account is linked here yet. If you&apos;ve been approved, make sure the phone number on your{" "}
              <Link href="/account" className="font-medium text-brand-700">
                account
              </Link>{" "}
              matches the one on your application.
            </p>
          </Card>
        )}
      </div>
    );
  }

  const { data: referrals } = (await admin
    .from("owner_referrals")
    .select("*, profiles:owner_user_id(display_name)")
    .eq("scout_id", myScout.id)
    .order("created_at", { ascending: false })) as {
    data: (OwnerReferral & { profiles: { display_name: string } | null })[] | null;
  };

  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/register?intent=owner&ref=${myScout.referral_code}`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">My {scoutProgram.name} dashboard</h1>

      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-charcoal-700">Status</p>
          <Badge variant={myScout.status === "active" ? "success" : myScout.status === "probation" ? "warning" : "error"}>
            {myScout.status}
          </Badge>
        </div>
        {myScout.status === "probation" && (
          <p className="mt-2 text-xs text-charcoal-500">
            Probation ends {new Date(myScout.probation_ends_at).toLocaleDateString()}. Every listing you bring in is
            reviewed before it&apos;s credited.
          </p>
        )}
      </Card>

      <Card className="mt-4 p-5">
        <p className="text-sm font-semibold text-charcoal-700">Your referral link</p>
        <p className="mt-2 break-all rounded-[var(--radius-md)] bg-canvas px-3 py-2 text-xs text-charcoal-600">
          {referralLink}
        </p>
        <p className="mt-2 text-xs text-charcoal-400">Code: {myScout.referral_code}</p>
      </Card>

      <Card className="mt-4 p-5">
        <p className="text-sm font-semibold text-charcoal-700">Owners you&apos;ve referred</p>
        {(referrals ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-charcoal-500">No referrals yet. Share your link with owners you bring onto the platform.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {(referrals ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between border-t border-border py-2 text-sm">
                <span className="text-charcoal-700">{r.profiles?.display_name ?? "Owner"}</span>
                <span className="text-xs text-charcoal-400">{REFERRAL_STATUS_COPY[r.status] ?? r.status}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="mt-4 text-xs text-charcoal-400">
        Earnings aren&apos;t tracked yet — that&apos;s a later milestone. This page shows referral status only.
      </p>
    </div>
  );
}
