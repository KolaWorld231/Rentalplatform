import { CheckCircle2, Home, MessageCircle, Search, ShieldCheck, Upload } from "lucide-react";
import Link from "next/link";
import { ProcessSteps } from "@/components/marketing/ProcessSteps";
import { buttonVariants } from "@/components/ui/Button";
import { subscriptionPlan } from "@/lib/config/brand";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "How It Works" };

const renterSteps = [
  { icon: Search, title: "Search for free", body: "Filter by location, price, and property type — no account required to browse." },
  { icon: MessageCircle, title: "Unlock messaging", body: `Get the ${subscriptionPlan.name} for $${subscriptionPlan.priceUsd} and message as many owners as you want for ${subscriptionPlan.durationDays} days.` },
  { icon: CheckCircle2, title: "Verify before you commit", body: "Check disclosed costs, ask questions, and inspect the property before paying anything." },
];

const ownerSteps = [
  { icon: Upload, title: "List for free", body: "Create a listing with photos, pricing, and terms — no fee to publish." },
  { icon: ShieldCheck, title: "Get verified (optional)", body: "Submit identity or ownership documents for a trust badge on your listing." },
  { icon: MessageCircle, title: "Reply for free", body: "Receive and respond to inquiries at no cost, no matter how many renters contact you." },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="max-w-2xl font-display text-3xl font-semibold text-charcoal-700">
        How DomiLink works
      </h1>
      <p className="mt-2 max-w-lg text-sm text-charcoal-500">
        One marketplace, two sides — free for renters to browse and free for owners to list.
      </p>

      <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
        <section>
          <h2 className="font-display text-xl font-semibold text-charcoal-700">For renters</h2>
          <ProcessSteps steps={renterSteps} accent="brand" alternate={false} />
          <Link href="/search" className={cn(buttonVariants({ variant: "primary" }), "mt-2")}>
            Browse properties
          </Link>
        </section>

        <section id="owners" className="lg:border-l lg:border-border lg:pl-16">
          <h2 className="font-display text-xl font-semibold text-charcoal-700">For property owners</h2>
          <ProcessSteps steps={ownerSteps} accent="clay" alternate={false} />
          <Link href="/register?intent=owner" className={cn(buttonVariants({ variant: "clay" }), "mt-2")}>
            <Home className="h-4 w-4" />
            List your property — free
          </Link>
        </section>
      </div>
    </div>
  );
}
