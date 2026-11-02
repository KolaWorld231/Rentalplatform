import { Card } from "@/components/ui/Card";
import { brand } from "@/lib/config/brand";
import { SupportForm } from "./SupportForm";

export const metadata = { title: "Help & Support" };

const faqs = [
  {
    q: "Is browsing really free?",
    a: "Yes. Searching, viewing listings, and saving favourites never require payment.",
  },
  {
    q: "What does the Direct Access Pass unlock?",
    a: "A 30-day pass for $5 lets you start direct conversations with as many property owners as you like, with no per-property fee.",
  },
  {
    q: "What happens when my pass expires?",
    a: "You can still read and reply in conversations you already started. You'll need to renew to start a new conversation.",
  },
  {
    q: "Is listing a property really free?",
    a: "Yes, for owners, listing and replying to renter messages are always free.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">Help</p>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Help &amp; Support</h1>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {faqs.map((f) => (
          <Card key={f.q} className="p-4">
            <p className="text-sm font-medium text-charcoal-700">{f.q}</p>
            <p className="mt-1 text-sm text-charcoal-500">{f.a}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-6">
        <h2 className="font-display text-lg font-semibold text-charcoal-700">Contact us</h2>
        <p className="mt-1 text-sm text-charcoal-500">
          Log in to submit a request, or email {brand.supportEmail} directly.
        </p>
        <div className="mt-4">
          <SupportForm />
        </div>
      </Card>
    </div>
  );
}
