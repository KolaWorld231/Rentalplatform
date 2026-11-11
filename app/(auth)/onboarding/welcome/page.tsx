import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser, getCurrentUserRoles } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { confirmScoutReferralAction, declineScoutReferralAction } from "@/lib/scouts/referral-actions";
import { scoutProgram } from "@/lib/config/brand";
import { cn } from "@/lib/utils/cn";

export default async function OnboardingWelcomePage() {
  const user = await requireUser("/onboarding/welcome");
  const roles = await getCurrentUserRoles();
  const isOwner = roles.includes("owner");

  const admin = createServiceRoleClient();
  const { data: pendingReferral } = isOwner
    ? await admin
        .from("owner_referrals")
        .select("id, scouts(display_name)")
        .eq("owner_user_id", user.id)
        .eq("status", "pending_confirmation")
        .maybeSingle()
    : { data: null };
  const scoutName = (pendingReferral as { scouts: { display_name: string } | null } | null)?.scouts?.display_name;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 text-center">
      <CheckCircle2 className="h-12 w-12 text-success-500" aria-hidden="true" />
      <div>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">
          You&apos;re all set
        </h1>
        <p className="mt-2 text-sm text-charcoal-500">
          {isOwner
            ? "Your account is ready to list properties — free, always."
            : "Your account is ready. Browsing and searching are free; unlock direct messaging whenever you're ready."}
        </p>
      </div>

      {scoutName && pendingReferral && (
        <Card className="w-full p-6 text-left">
          <p className="text-sm text-charcoal-700">
            Were you introduced by a {scoutProgram.name} scout, <strong>{scoutName}</strong>?
          </p>
          <div className="mt-3 flex gap-2">
            <form action={confirmScoutReferralAction.bind(null, (pendingReferral as { id: string }).id)}>
              <Button type="submit" variant="primary" size="sm">
                Yes, that&apos;s right
              </Button>
            </form>
            <form action={declineScoutReferralAction.bind(null, (pendingReferral as { id: string }).id)}>
              <Button type="submit" variant="ghost" size="sm">
                I wasn&apos;t referred
              </Button>
            </form>
          </div>
        </Card>
      )}

      <Card className="w-full p-6 text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">Next step</p>
        {isOwner ? (
          <>
            <p className="mt-2 text-sm text-charcoal-700">
              Create your first listing — it takes a few minutes and is completely free.
            </p>
            <Link href="/dashboard/properties/new" className={cn(buttonVariants({ variant: "primary" }), "mt-4 w-full")}>
              List a property
            </Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-charcoal-700">
              Start browsing properties across Liberia — no cost, no account requirement.
            </p>
            <Link href="/search" className={cn(buttonVariants({ variant: "primary" }), "mt-4 w-full")}>
              Browse properties
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
