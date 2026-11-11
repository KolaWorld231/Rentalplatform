import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { brand, scoutProgram } from "@/lib/config/brand";

export const metadata = { title: `${scoutProgram.name} — Become a Scout` };

const nonNegotiables = [
  "Scouts never charge owners or renters any fee.",
  "Owners still list, receive, and reply for free. Renters still pay US$5 / 30 days.",
  "Scouts are paid only for verified supply — a verified owner with a published, confirmed listing — never for leases or \"successful rentals\".",
  `${brand.name} never holds rent, deposits, or escrow — scouts must never collect money for us or for owners.`,
  "Scouts get no access to renter data, owner private contact details, messages, or payment records.",
];

export default function ScoutsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">Scout Program</p>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">{scoutProgram.name}</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          {scoutProgram.name} are vetted local scouts who bring verified property owners with real listings onto{" "}
          {brand.name}. They replace the informal-agent role with an accountable, auditable one.
        </p>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-sm font-semibold text-charcoal-700">How it works</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {nonNegotiables.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-charcoal-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="text-sm font-semibold text-charcoal-700">Applying</h2>
        <p className="mt-2 text-sm text-charcoal-600">
          There is no open sign-up — scouts apply through a short form and are reviewed in the order their
          application is received. Seats are limited per area, so applying does not guarantee acceptance, and
          being accepted does not guarantee any particular earnings — those depend entirely on verified activity.
        </p>
      </Card>

      <div className="mt-6">
        <Link href="/scouts/apply" className={buttonVariants({ variant: "primary" })}>
          Apply to become a scout
        </Link>
      </div>
    </div>
  );
}
