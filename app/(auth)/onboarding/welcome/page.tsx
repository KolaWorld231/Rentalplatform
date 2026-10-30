import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser, getCurrentUserRoles } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";

export default async function OnboardingWelcomePage() {
  await requireUser("/onboarding/welcome");
  const roles = await getCurrentUserRoles();
  const isOwner = roles.includes("owner");

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
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
