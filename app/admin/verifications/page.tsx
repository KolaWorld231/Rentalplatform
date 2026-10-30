import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DocumentLink } from "@/components/verification/DocumentLink";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  IdentityVerificationRequest,
  PrivateVerificationDocument,
  PropertyVerificationRequest,
} from "@/types/database";
import { reviewIdentityVerificationAction, reviewPropertyVerificationAction } from "../actions";

export const metadata = { title: "Admin: Verifications" };

type IdentityRow = IdentityVerificationRequest & {
  profiles: { display_name: string } | null;
  private_verification_documents: Pick<PrivateVerificationDocument, "id" | "original_filename">[];
};

type PropertyRow = PropertyVerificationRequest & {
  properties: { title: string } | null;
  private_verification_documents: Pick<PrivateVerificationDocument, "id" | "original_filename">[];
};

export default async function AdminVerificationsPage() {
  const admin = createServiceRoleClient();

  const { data: identityRequests } = (await admin
    .from("identity_verification_requests")
    .select("*, profiles:user_id(display_name), private_verification_documents(id, original_filename)")
    .in("status", ["submitted", "under_review"])
    .order("submitted_at", { ascending: true })) as { data: IdentityRow[] | null };

  const { data: propertyRequests } = (await admin
    .from("property_verification_requests")
    .select("*, properties(title), private_verification_documents(id, original_filename)")
    .in("status", ["submitted", "under_review"])
    .order("submitted_at", { ascending: true })) as { data: PropertyRow[] | null };

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-display text-2xl font-semibold text-charcoal-700">Identity verifications</h1>
        <div className="mt-4 flex flex-col gap-3">
          {(identityRequests ?? []).length === 0 && (
            <p className="text-sm text-charcoal-400">Nothing pending review.</p>
          )}
          {(identityRequests ?? []).map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-charcoal-700">{r.profiles?.display_name ?? "Unknown user"}</p>
                <Badge variant="info">{r.status}</Badge>
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {r.private_verification_documents.map((d) => (
                  <DocumentLink key={d.id} documentId={d.id} filename={d.original_filename} />
                ))}
              </div>
              <ReviewActions reviewAction={reviewIdentityVerificationAction} requestId={r.id} />
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-charcoal-700">Property verifications</h2>
        <div className="mt-4 flex flex-col gap-3">
          {(propertyRequests ?? []).length === 0 && (
            <p className="text-sm text-charcoal-400">Nothing pending review.</p>
          )}
          {(propertyRequests ?? []).map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-charcoal-700">{r.properties?.title ?? "Unknown property"}</p>
                <Badge variant="info">{r.status}</Badge>
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {r.private_verification_documents.map((d) => (
                  <DocumentLink key={d.id} documentId={d.id} filename={d.original_filename} />
                ))}
              </div>
              <ReviewActions reviewAction={reviewPropertyVerificationAction} requestId={r.id} />
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReviewActions({
  reviewAction,
  requestId,
}: {
  reviewAction: (requestId: string, decision: "verified" | "rejected" | "needs_more_info", notes: string) => Promise<void>;
  requestId: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <form action={async () => { "use server"; await reviewAction(requestId, "verified", ""); }}>
        <Button type="submit" size="sm" variant="primary">
          Approve
        </Button>
      </form>
      <form
        action={async () => {
          "use server";
          await reviewAction(requestId, "needs_more_info", "Please resubmit a clearer document.");
        }}
      >
        <Button type="submit" size="sm" variant="secondary">
          Needs more info
        </Button>
      </form>
      <form
        action={async () => {
          "use server";
          await reviewAction(requestId, "rejected", "Document could not be verified.");
        }}
      >
        <Button type="submit" size="sm" variant="danger">
          Reject
        </Button>
      </form>
    </div>
  );
}
