import { LegalPageShell } from "@/components/layout/LegalPageShell";
import { subscriptionPlan } from "@/lib/config/brand";

export const metadata = { title: "Subscription Terms" };

export default function SubscriptionTermsPage() {
  return (
    <LegalPageShell title="Subscription Terms">
      <section>
        <h2 className="font-semibold text-charcoal-700">The plan</h2>
        <p>
          The {subscriptionPlan.name} costs ${subscriptionPlan.priceUsd} and grants{" "}
          {subscriptionPlan.durationDays} days of access to direct messaging from the moment your
          payment is confirmed.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">What it includes</h2>
        <ul className="list-disc pl-5">
          <li>Starting a new direct conversation with any property owner.</li>
          <li>No additional fee for each new property you contact during the active period.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">What stays free</h2>
        <ul className="list-disc pl-5">
          <li>Browsing and searching listings.</li>
          <li>Listing a property as an owner.</li>
          <li>Replying to messages as an owner.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">Expiration</h2>
        <p>
          Your pass expires exactly {subscriptionPlan.durationDays} days after activation. After
          expiration, you can still read and reply in conversations you already started, but you
          cannot start a new conversation until you renew. There is no automatic renewal — you
          choose when to subscribe again.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">Payment verification</h2>
        <p>
          A payment must be independently confirmed by our payment processor before access is
          activated. If a payment is not confirmed, no charge is retained and no subscription is
          activated.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">Refunds</h2>
        <p>
          Refund requests are reviewed case by case through{" "}
          <a href="/help" className="text-brand-700">
            Help &amp; Support
          </a>
          . Activated access that has already been used to message owners is not automatically
          refundable.
        </p>
      </section>
    </LegalPageShell>
  );
}
