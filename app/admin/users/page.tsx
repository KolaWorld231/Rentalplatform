import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireAnyRole } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { restoreUserAction, suspendUserAction } from "../actions";

export const metadata = { title: "Admin: Users" };

export default async function AdminUsersPage() {
  // Suspend/restore is an admin-only action; moderators can view other
  // queues but not this one — checked again here, not just in the layout.
  await requireAnyRole(["admin"], "/admin/users");

  const admin = createServiceRoleClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name, account_status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">Users</h1>
      <p className="mt-1 text-sm text-charcoal-500">Most recent 50 accounts.</p>

      <div className="mt-6 flex flex-col gap-2">
        {(profiles ?? []).map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium text-charcoal-700">{p.display_name}</p>
              <Badge variant={p.account_status === "active" ? "success" : "error"}>{p.account_status}</Badge>
            </div>
            {p.account_status === "active" ? (
              <form
                action={async () => {
                  "use server";
                  await suspendUserAction(p.id, "Policy violation reported via admin review");
                }}
              >
                <Button type="submit" size="sm" variant="danger">
                  Suspend
                </Button>
              </form>
            ) : (
              <form action={async () => { "use server"; await restoreUserAction(p.id); }}>
                <Button type="submit" size="sm" variant="secondary">
                  Restore
                </Button>
              </form>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
