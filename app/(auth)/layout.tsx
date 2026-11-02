import { ShieldCheck } from "lucide-react";
import { brand, subscriptionPlan } from "@/lib/config/brand";

const trustLines = [
  "Property owners list for free — always.",
  `Renters browse for free; the ${subscriptionPlan.name} unlocks direct messaging.`,
  "Payments are verified server-side before anything activates.",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex lg:min-h-[calc(100dvh-4rem)]">
      <div className="hidden lg:flex lg:w-[42%] lg:shrink-0 lg:flex-col lg:justify-between bg-brand-800 px-10 py-12 text-ivory-50">
        <div>
          <p className="font-display text-2xl font-semibold leading-tight">{brand.tagline}</p>
          <p className="mt-3 max-w-sm text-sm text-sage-100">{brand.heroSupportingCopy}</p>
        </div>
        <ul className="flex flex-col gap-3">
          {trustLines.map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-sage-100">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage-200" aria-hidden="true" />
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center bg-brand-800 px-4 py-5 lg:hidden">
        <p className="font-display text-base font-semibold text-ivory-50">{brand.name}</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">{children}</div>
    </div>
  );
}
