import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { brand } from "@/lib/config/brand";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Account Suspended", robots: { index: false, follow: false } };

export default function SuspendedPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center sm:px-6">
      <Card className="flex w-full flex-col items-center gap-3 p-10">
        <ShieldAlert className="h-10 w-10 text-error-500" aria-hidden="true" />
        <h1 className="font-display text-xl font-semibold text-charcoal-700">Account suspended</h1>
        <p className="text-sm text-charcoal-500">
          Your {brand.name} account has been suspended by our moderation team. You&apos;ve been
          signed out. If you believe this was a mistake, contact support below.
        </p>
        <Link href="/help" className={cn(buttonVariants({ variant: "primary" }), "w-full")}>
          Contact support
        </Link>
        <Link href="/" className="text-sm font-medium text-charcoal-500">
          Back to home
        </Link>
      </Card>
    </div>
  );
}
