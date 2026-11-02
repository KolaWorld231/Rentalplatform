import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";

export const metadata = { title: "Safety Guidance" };

const checklist = [
  "A listing does not by itself prove ownership — ask to see ID and, where possible, documentation showing the right to rent out the property.",
  "Inspect the property in person before paying anything or signing anything.",
  "Get rental terms in writing: monthly rent, deposit, advance payment, lease duration, and what's included.",
  "Verify who you're sending money to before transferring funds — confirm the name matches the person you've met and verified.",
  "Identity verification on a profile shows a document was reviewed. It does not guarantee legal ownership of a property.",
  "Be cautious of any request to pay before viewing, or pressure to decide immediately.",
];

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">Safety</p>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Safety guidance</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          DomiLink does not guarantee the outcome of a rental transaction. Use this checklist before
          you commit to anything.
        </p>
      </div>

      <Card className="mt-6 p-6">
        <ul className="flex flex-col gap-3">
          {checklist.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-charcoal-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-500" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-6 flex items-start gap-2 rounded-[var(--radius-md)] bg-warning-100 p-3 text-xs text-warning-500">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          If something feels wrong — a seller asking for payment before a viewing, a price that
          seems too good to be true, or a listing that looks copied — report it from the
          property&apos;s page or the conversation. Our moderation team reviews every report.
        </p>
      </div>
    </div>
  );
}
