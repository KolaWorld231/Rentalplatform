import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { scoutProgram } from "@/lib/config/brand";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { updateScoutProgramSettingsAction } from "@/lib/scouts/settings-actions";
import type { ScoutProgramSettings } from "@/types/database";

export const metadata = { title: `Admin: ${scoutProgram.name} settings`, robots: { index: false, follow: false } };

export default async function ScoutSettingsPage() {
  const admin = createServiceRoleClient();
  const { data: settings } = (await admin.from("scout_program_settings").select("*").eq("id", true).single()) as {
    data: ScoutProgramSettings | null;
  };

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">{scoutProgram.name} settings</h1>
      <p className="mt-1 text-sm text-charcoal-500">
        These numbers are read live by the bounty computation and shown on scouts&apos; own dashboards. They are not
        hardcoded anywhere — change them here when real figures are confirmed.
      </p>

      <Card className="mt-4 p-5">
        <form action={updateScoutProgramSettingsAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-charcoal-700">
            Verified-listing bounty (USD)
            <input
              type="number"
              step="0.01"
              min="0"
              name="bountyAmountUsd"
              defaultValue={settings?.bounty_amount_usd ?? 0}
              className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm shadow-[var(--shadow-clay-inset)]"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-charcoal-700">
            Revenue share (%)
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              name="sharePercent"
              defaultValue={settings?.share_percent ?? 0}
              className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm shadow-[var(--shadow-clay-inset)]"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-charcoal-700">
            Share duration (months from owner verification)
            <input
              type="number"
              step="1"
              min="1"
              name="shareDurationMonths"
              defaultValue={settings?.share_duration_months ?? 6}
              className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm shadow-[var(--shadow-clay-inset)]"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-charcoal-700">
            Monthly cap per scout (USD, optional)
            <input
              type="number"
              step="0.01"
              min="0"
              name="monthlyCapUsd"
              defaultValue={settings?.monthly_cap_usd ?? ""}
              className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm shadow-[var(--shadow-clay-inset)]"
            />
          </label>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-charcoal-400">
              Payout &amp; tax (policy only — not wired to any real payout API)
            </p>

            <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-charcoal-700">
              Payout provider
              <input
                type="text"
                name="payoutProvider"
                placeholder="e.g. MTN MoMo, bank transfer, cash collection point"
                defaultValue={settings?.payout_provider ?? ""}
                className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm shadow-[var(--shadow-clay-inset)]"
              />
            </label>

            <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-charcoal-700">
              Payout method notes
              <textarea
                name="payoutMethodNotes"
                rows={3}
                defaultValue={settings?.payout_method_notes ?? ""}
                className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm shadow-[var(--shadow-clay-inset)]"
              />
            </label>

            <label className="mt-3 flex flex-col gap-1 text-sm font-medium text-charcoal-700">
              Contractor / tax treatment notes
              <textarea
                name="taxTreatmentNotes"
                rows={3}
                placeholder="Needs local legal/tax review before launch — do not state conclusions here."
                defaultValue={settings?.tax_treatment_notes ?? ""}
                className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm shadow-[var(--shadow-clay-inset)]"
              />
            </label>
          </div>

          <Button type="submit" className="mt-2">
            Save settings
          </Button>
        </form>
      </Card>

      {settings?.updated_at && (
        <p className="mt-2 text-xs text-charcoal-400">Last updated {new Date(settings.updated_at).toLocaleString()}</p>
      )}
    </div>
  );
}
