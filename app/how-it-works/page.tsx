import { CheckCircle2, Home, MessageCircle, Search, ShieldCheck, Upload } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-center font-display text-3xl font-semibold text-charcoal-700">
        How DomiLink works
      </h1>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold text-charcoal-700">For renters</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {renterSteps.map((s) => (
            <Card key={s.title} className="p-6">
              <s.icon className="h-7 w-7 text-brand-600" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-charcoal-700">{s.title}</h3>
              <p className="mt-1 text-sm text-charcoal-500">{s.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href="/search" className={cn(buttonVariants({ variant: "primary" }))}>
            Browse properties
          </Link>
        </div>
      </section>

      <section id="owners" className="mt-14">
        <h2 className="font-display text-xl font-semibold text-charcoal-700">For property owners</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {ownerSteps.map((s) => (
            <Card key={s.title} className="p-6">
              <s.icon className="h-7 w-7 text-brand-600" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-charcoal-700">{s.title}</h3>
              <p className="mt-1 text-sm text-charcoal-500">{s.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href="/register?intent=owner" className={cn(buttonVariants({ variant: "clay" }))}>
            <Home className="h-4 w-4" />
            List your property — free
          </Link>
        </div>
      </section>
    </div>
  );
}
