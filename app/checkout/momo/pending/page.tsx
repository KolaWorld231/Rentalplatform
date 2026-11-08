import { Card } from "@/components/ui/Card";
import { MomoPendingStatus } from "@/components/subscriptions/MomoPendingStatus";
import { requireUser } from "@/lib/auth/session";

export const metadata = { title: "Confirm payment on your phone" };

export default async function MomoPendingPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  await requireUser("/pricing");
  const { ref } = await searchParams;

  if (!ref) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-sm text-charcoal-500">Missing payment reference.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="p-6 text-center">
        <h1 className="font-display text-xl font-semibold text-charcoal-700">Check your phone</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          We sent a mobile money payment request to your phone. Approve it and enter your PIN to activate your
          Direct Access Pass.
        </p>
        <div className="mt-6">
          <MomoPendingStatus reference={ref} />
        </div>
      </Card>
    </div>
  );
}
