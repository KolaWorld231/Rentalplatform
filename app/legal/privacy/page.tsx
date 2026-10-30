import { LegalPageShell } from "@/components/layout/LegalPageShell";
import { brand } from "@/lib/config/brand";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p>
        {brand.legalEntityName} collects only the information needed to operate {brand.name}. This
        page describes what we collect, why, and how long we keep it.
      </p>

      <section>
        <h2 className="font-semibold text-charcoal-700">What we collect</h2>
        <ul className="list-disc pl-5">
          <li>Account information: name, email, phone (optional), password (hashed by our authentication provider).</li>
          <li>Listing content you choose to publish, including photos.</li>
          <li>Messages you send through the platform.</li>
          <li>Payment transaction records (amount, status, provider reference) — never full card or mobile-money credentials, which we never collect directly.</li>
          <li>Identity/property verification documents you voluntarily submit, stored privately (see below).</li>
          <li>Basic usage data (e.g. listing views) used for the features you see in your dashboard.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">What we don&apos;t require</h2>
        <p>
          You do not need to submit a government ID or any verification document just to browse or
          search listings. Verification is optional and only needed if you want the associated
          trust badges.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">Verification documents</h2>
        <p>
          Identity and property verification documents are stored in a private file store, never
          publicly accessible, and are only viewable by you and authorized reviewers via a
          short-lived access link. See our{" "}
          <a href="/legal/terms" className="text-brand-700">
            Terms of Service
          </a>{" "}
          and the technical security documentation for details.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">Retention</h2>
        <p>
          Account and listing data is retained while your account is active. Payment records are
          retained as required for financial reconciliation. You may request deletion of your
          account; some records may be retained where required by law or for legitimate business
          records (e.g. completed payment transactions).
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">Who can see your data</h2>
        <p>
          Your public profile name and listings are visible to other users as part of using the
          platform. Private messages are visible only to the conversation&apos;s participants.
          Verification documents are visible only to you and authorized reviewers. We do not sell
          your personal data.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-charcoal-700">Contact</h2>
        <p>Privacy questions or deletion requests: {brand.supportEmail}.</p>
      </section>
    </LegalPageShell>
  );
}
