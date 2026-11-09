import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { scoutProgram } from "@/lib/config/brand";
import { REAPPLY_AFTER_DAYS } from "@/lib/validation/scouts";
import type { ScoutApplication, ScoutArea, ScoutReference, Scout, ScoutEarningsLedgerEntry } from "@/types/database";
import {
  decideScoutApplicationAction,
  recordReferenceOutcomeAction,
  recordVerificationStepAction,
  setScoutStatusAction,
} from "./actions";
import { approveEarningAction, computeBountyEarningsAction, recordPayoutAction, reverseEarningAction } from "@/lib/scouts/earnings-actions";

export const metadata = { title: `Admin: ${scoutProgram.name}`, robots: { index: false, follow: false } };

const REFERENCE_OUTCOME_LABELS: Record<string, string> = {
  reached_positive: "Reached — positive",
  reached_concern: "Reached — concern",
  not_reached: "Not reached",
};

const STATUS_BADGE: Record<string, "neutral" | "warning" | "success" | "error" | "info"> = {
  applied: "info",
  under_review: "warning",
  waitlisted: "neutral",
  approved: "success",
  rejected: "error",
  withdrawn: "neutral",
};

type ApplicationRow = ScoutApplication & { scout_areas: ScoutArea | null; scout_references: ScoutReference[] };

export default async function AdminScoutsPage() {
  const admin = createServiceRoleClient();

  const { data: applications } = (await admin
    .from("scout_applications")
    .select("*, scout_areas(*), scout_references(*)")
    .in("status", ["applied", "under_review", "waitlisted"])
    .order("created_at", { ascending: true })) as { data: ApplicationRow[] | null };

  const { data: scouts } = (await admin
    .from("scouts")
    .select("*, scout_applications(full_name, phone)")
    .order("created_at", { ascending: false })) as {
    data: (Scout & { scout_applications: { full_name: string; phone: string } | null })[] | null;
  };

  const { data: earnings } = (await admin
    .from("scout_earnings_ledger")
    .select("*, scouts(display_name)")
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: true })) as {
    data: (ScoutEarningsLedgerEntry & { scouts: { display_name: string } | null })[] | null;
  };

  const approvedTotalsByScout = new Map<string, number>();
  for (const e of earnings ?? []) {
    if (e.status === "approved") approvedTotalsByScout.set(e.scout_id, (approvedTotalsByScout.get(e.scout_id) ?? 0) + Number(e.amount));
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">{scoutProgram.name} applications</h1>
        <p className="mt-1 text-sm text-charcoal-500">
          Reviewed in the order received. Approving moves an applicant to probation; rejecting blocks re-application
          for {REAPPLY_AFTER_DAYS} days.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {(applications ?? []).length === 0 && <p className="text-sm text-charcoal-400">No applications waiting on review.</p>}
          {(applications ?? []).map((app) => (
            <Card key={app.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-charcoal-700">
                    {app.full_name} <span className="font-normal text-charcoal-400">· {app.reference_code}</span>
                  </p>
                  <p className="text-xs text-charcoal-400">
                    {app.phone} {app.email && `· ${app.email}`} · {app.scout_areas?.county} — {app.scout_areas?.neighborhood}
                  </p>
                </div>
                <Badge variant={STATUS_BADGE[app.status] ?? "neutral"}>{app.status.replace(/_/g, " ")}</Badge>
              </div>

              <div className="grid gap-2 border-t border-border pt-3 text-xs text-charcoal-600">
                <p>
                  <span className="font-semibold text-charcoal-700">Area knowledge:</span> {app.area_knowledge}
                </p>
                {app.experience && (
                  <p>
                    <span className="font-semibold text-charcoal-700">Experience:</span> {app.experience}
                  </p>
                )}
                <p>
                  <span className="font-semibold text-charcoal-700">Motivation:</span> {app.motivation}
                </p>
                <p>
                  <span className="font-semibold text-charcoal-700">Smartphone:</span> {app.smartphone_model}
                </p>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs font-semibold text-charcoal-700">References</p>
                <div className="mt-2 flex flex-col gap-2">
                  {app.scout_references.map((ref) => (
                    <div key={ref.id} className="rounded-[var(--radius-md)] border border-border p-3">
                      <p className="text-xs text-charcoal-600">
                        {ref.full_name} ({ref.relationship.replace(/_/g, " ")}) — {ref.phone}
                      </p>
                      {ref.outcome ? (
                        <p className="mt-1 text-xs text-charcoal-400">
                          {REFERENCE_OUTCOME_LABELS[ref.outcome]} {ref.notes && `— ${ref.notes}`}
                        </p>
                      ) : (
                        <form action={recordReferenceOutcomeAction.bind(null, ref.id)} className="mt-2 flex flex-col gap-2">
                          <select name="outcome" className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs" required>
                            <option value="reached_positive">Reached — positive</option>
                            <option value="reached_concern">Reached — concern</option>
                            <option value="not_reached">Not reached</option>
                          </select>
                          <input
                            type="text"
                            name="notes"
                            placeholder="Notes (optional)"
                            className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs"
                          />
                          <Button type="submit" size="sm" variant="secondary">
                            Record outcome
                          </Button>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <form action={recordVerificationStepAction.bind(null, app.id, "completeness_check", "passed")}>
                  <Button type="submit" size="sm" variant="ghost">
                    Mark complete
                  </Button>
                </form>
                <form action={recordVerificationStepAction.bind(null, app.id, "interview", "passed")}>
                  <Button type="submit" size="sm" variant="ghost">
                    Interview passed
                  </Button>
                </form>
              </div>

              <form action={decideScoutApplicationAction.bind(null, app.id, "approve_probation")} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
                <input type="text" name="reason" placeholder="Decision note (optional)" className="flex-1 rounded-[var(--radius-sm)] border border-border px-2 py-2 text-xs" />
                <Button type="submit" size="sm" variant="primary">
                  Approve to probation
                </Button>
              </form>
              <div className="flex gap-2">
                <form action={decideScoutApplicationAction.bind(null, app.id, "waitlist")}>
                  <Button type="submit" size="sm" variant="secondary">
                    Waitlist
                  </Button>
                </form>
                <form action={decideScoutApplicationAction.bind(null, app.id, "reject")}>
                  <Button type="submit" size="sm" variant="danger">
                    Reject
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-charcoal-700">Scouts</h2>
        <div className="mt-4 flex flex-col gap-3">
          {(scouts ?? []).length === 0 && <p className="text-sm text-charcoal-400">No scouts promoted yet.</p>}
          {(scouts ?? []).map((scout) => (
            <Card key={scout.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-semibold text-charcoal-700">
                  {scout.display_name} <span className="font-normal text-charcoal-400">· {scout.referral_code}</span>
                </p>
                <p className="text-xs text-charcoal-400">
                  {scout.scout_applications?.phone} · probation ends {new Date(scout.probation_ends_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={scout.status === "active" ? "success" : scout.status === "probation" ? "warning" : "error"}>
                  {scout.status}
                </Badge>
                {scout.status === "probation" && (
                  <form action={setScoutStatusAction.bind(null, scout.id, "active")}>
                    <Button type="submit" size="sm" variant="secondary">
                      Promote to active
                    </Button>
                  </form>
                )}
                {(scout.status === "probation" || scout.status === "active") && (
                  <form action={setScoutStatusAction.bind(null, scout.id, "suspended")}>
                    <Button type="submit" size="sm" variant="ghost">
                      Suspend
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-charcoal-700">Earnings & payouts</h2>
          <form action={computeBountyEarningsAction}>
            <Button type="submit" size="sm" variant="secondary">
              Compute bounty earnings
            </Button>
          </form>
        </div>
        <p className="mt-1 text-xs text-charcoal-400">
          Bounty amounts are illustrative defaults pending the owner&apos;s sign-off — see docs/SCOUT_PROGRAM.md §16.
          Revenue-share earnings aren&apos;t computed automatically yet. Marking a payout &quot;paid&quot; is an admin
          attesting a payment was made out-of-band — no payout provider is integrated.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {(earnings ?? []).length === 0 && <p className="text-sm text-charcoal-400">No pending or approved earnings.</p>}
          {(earnings ?? []).map((e) => (
            <Card key={e.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm text-charcoal-700">
                  {e.scouts?.display_name} · {e.type} · ${Number(e.amount).toFixed(2)}
                </p>
                <Badge variant={e.status === "approved" ? "success" : "warning"}>{e.status}</Badge>
              </div>
              <div className="flex gap-2">
                {e.status === "pending" && (
                  <form action={approveEarningAction.bind(null, e.id)}>
                    <Button type="submit" size="sm" variant="secondary">
                      Approve
                    </Button>
                  </form>
                )}
                <form action={reverseEarningAction.bind(null, e.id)}>
                  <Button type="submit" size="sm" variant="ghost">
                    Reverse
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {[...approvedTotalsByScout.entries()].map(([scoutId, total]) => (
            <form key={scoutId} action={recordPayoutAction.bind(null, scoutId)} className="flex items-end gap-2">
              <span className="text-sm text-charcoal-700">Pay out ${total.toFixed(2)} for scout {scoutId.slice(0, 8)}</span>
              <input type="text" name="method" placeholder="Method (e.g. mobile money)" className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs" />
              <input type="text" name="providerReference" placeholder="Reference" className="rounded-[var(--radius-sm)] border border-border px-2 py-1 text-xs" />
              <Button type="submit" size="sm" variant="primary">
                Mark paid
              </Button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
