import { LegalPageShell } from "@/components/layout/LegalPageShell";
import { brand, subscriptionPlan } from "@/lib/config/brand";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service">
      <p>Operated by {brand.legalEntityName}, a draft placeholder pending business registration.</p>

      <section>
        <h2 className="font-semibold text-charcoal-700">1. What {brand.name} is</h2>
        <p>
          {brand.name} is a listing and messaging platform that connects property seekers with
          property owners in Liberia. We do not own, manage, or broker any property listed on the
          platform, and we are not a party to any rental agreement between a renter and an owner.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">2. Accounts</h2>
        <p>
          You must provide accurate information when registering. You are responsible for
          activity under your account. Property owners must have a genuine right to offer the
          property they list.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">3. Listings</h2>
        <p>
          Listing a property is free. We may review, hide, or remove a listing that appears
          fraudulent, misleading, or that violates these terms, with or without prior notice. A
          published listing does not constitute a guarantee of accuracy, availability, or legal
          ownership.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">4. The Direct Access Pass</h2>
        <p>
          Browsing and searching are free. Initiating a new direct conversation with a property
          owner requires an active {subscriptionPlan.name} (${subscriptionPlan.priceUsd} for{" "}
          {subscriptionPlan.durationDays} days). The pass does not limit the number of owners you
          may contact during its validity and does not renew automatically. See our{" "}
          <a href="/legal/subscription-terms" className="text-brand-700">
            Subscription Terms
          </a>{" "}
          for details.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">5. No guarantee of outcome</h2>
        <p>
          We do not guarantee that you will find or rent a suitable property, that a listing is
          accurate, or that a counterparty will act in good faith. See our{" "}
          <a href="/safety" className="text-brand-700">
            Safety guidance
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">6. Prohibited conduct</h2>
        <p>
          You may not post fraudulent listings, impersonate another person or business, harass
          other users, or use the platform to solicit payment outside of a legitimate rental
          transaction in a way designed to defraud another user.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">7. Termination</h2>
        <p>
          We may suspend or terminate an account that violates these terms. You may request
          deletion of your account at any time via{" "}
          <a href="/help" className="text-brand-700">
            Help &amp; Support
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">8. Contact</h2>
        <p>Questions about these terms: {brand.supportEmail}.</p>
      </section>
    </LegalPageShell>
  );
}
