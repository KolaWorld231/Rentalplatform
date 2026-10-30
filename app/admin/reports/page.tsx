import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { MessageReport, PropertyReport } from "@/types/database";
import { resolveMessageReportAction, resolvePropertyReportAction } from "../actions";

export const metadata = { title: "Admin: Reports" };

type PropertyReportRow = PropertyReport & { properties: { title: string } | null };

export default async function AdminReportsPage() {
  const admin = createServiceRoleClient();

  const { data: propertyReports } = (await admin
    .from("property_reports")
    .select("*, properties(title)")
    .eq("status", "open")
    .order("created_at", { ascending: true })) as { data: PropertyReportRow[] | null };

  const { data: messageReports } = (await admin
    .from("message_reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: true })) as { data: MessageReport[] | null };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Property reports</h1>
        <div className="mt-4 flex flex-col gap-3">
          {(propertyReports ?? []).length === 0 && <p className="text-sm text-charcoal-400">No open reports.</p>}
          {(propertyReports ?? []).map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-charcoal-700">
                    {r.properties?.title ?? "Unknown listing"}
                  </p>
                  <p className="text-xs text-charcoal-400">
                    {r.reason.replace(/_/g, " ")} {r.details && `— ${r.details}`}
                  </p>
                </div>
                <Badge variant="warning">open</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <form
                  action={async () => {
                    "use server";
                    await resolvePropertyReportAction(r.id, "resolved", "Action taken.");
                  }}
                >
                  <Button type="submit" size="sm" variant="primary">
                    Mark resolved
                  </Button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await resolvePropertyReportAction(r.id, "dismissed", "No violation found.");
                  }}
                >
                  <Button type="submit" size="sm" variant="secondary">
                    Dismiss
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-charcoal-700">Message reports</h2>
        <div className="mt-4 flex flex-col gap-3">
          {(messageReports ?? []).length === 0 && <p className="text-sm text-charcoal-400">No open reports.</p>}
          {(messageReports ?? []).map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-charcoal-500">
                  {r.reason.replace(/_/g, " ")} {r.details && `— ${r.details}`}
                </p>
                <Badge variant="warning">open</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <form action={async () => { "use server"; await resolveMessageReportAction(r.id, "resolved"); }}>
                  <Button type="submit" size="sm" variant="primary">
                    Mark resolved
                  </Button>
                </form>
                <form action={async () => { "use server"; await resolveMessageReportAction(r.id, "dismissed"); }}>
                  <Button type="submit" size="sm" variant="secondary">
                    Dismiss
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
