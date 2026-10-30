import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * Direct messaging itself lands in Milestone 5 (gated by the Milestone 4
 * subscription). Until then this renders an honest "coming soon" state
 * instead of a non-functional button that pretends to work.
 */
export async function ContactOwnerCta() {
  const user = await getCurrentUser();

  return (
    <div className="rounded-[var(--radius-lg)] bg-sage-100 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-charcoal-700">
        <MessageCircle className="h-4 w-4 text-brand-600" aria-hidden="true" />
        Contact the owner
      </p>
      <p className="mt-1 text-sm text-charcoal-500">
        Direct in-app messaging (unlocked by the $5 / 30-day Direct Access Pass) is being built in
        a later milestone of this project and isn&apos;t live yet.
      </p>
      {!user && (
        <Link href="/register" className="mt-3 inline-block">
          <Button variant="secondary" size="sm">
            Create an account for when it launches
          </Button>
        </Link>
      )}
    </div>
  );
}
