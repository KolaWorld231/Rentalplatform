import { CheckCircle2, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DocumentLink } from "@/components/verification/DocumentLink";
import { DocumentUploader } from "@/components/verification/DocumentUploader";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";
import type {
  IdentityVerificationRequest,
  PrivateVerificationDocument,
  Property,
  PropertyVerificationRequest,
} from "@/types/database";
import { submitIdentityVerificationAction, submitPropertyVerificationAction } from "./actions";

export const metadata = { title: "Verification Center" };

const STATUS_COPY: Record<string, { label: string; variant: "success" | "warning" | "error" | "info" | "neutral" }> = {
  submitted: { label: "Submitted — awaiting review", variant: "info" },
  under_review: { label: "Under review", variant: "info" },
  verified: { label: "Verified", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
  needs_more_info: { label: "Needs more information", variant: "warning" },
  expired: { label: "Expired — resubmit", variant: "warning" },
};

function StatusIcon({ status }: { status: string }) {
  if (status === "verified") return <CheckCircle2 className="h-5 w-5 text-success-500" aria-hidden="true" />;
  if (status === "rejected") return <ShieldAlert className="h-5 w-5 text-error-500" aria-hidden="true" />;
  return <Clock className="h-5 w-5 text-warning-500" aria-hidden="true" />;
}

export default async function VerificationCenterPage() {
  const user = await requireUser("/dashboard/verification");
  const supabase = await createClient();

  const { data: identityRequests } = (await supabase
    .from("identity_verification_requests")
    .select("*, private_verification_documents(id, original_filename)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })) as {
    data: (IdentityVerificationRequest & { private_verification_documents: Pick<PrivateVerificationDocument, "id" | "original_filename">[] })[] | null;
  };
  const identity = identityRequests?.[0];

  const { data: properties } = (await supabase
    .from("properties")
    .select("id, title, slug")
    .eq("owner_id", user.id)) as { data: Pick<Property, "id" | "title" | "slug">[] | null };

  const { data: propertyRequests } = (await supabase
    .from("property_verification_requests")
    .select("*, private_verification_documents(id, original_filename)")
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false })) as {
    data: (PropertyVerificationRequest & { private_verification_documents: Pick<PrivateVerificationDocument, "id" | "original_filename">[] })[] | null;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">Verification center</h1>
      <p className="mt-1 text-sm text-charcoal-500">
        Verification is an evidence-based review process, not a guarantee of legal ownership.
        Documents are stored privately and reviewed only by our moderation team.
      </p>

      <Card
        className={cn(
          "mt-6 p-6",
          identity?.status === "verified" && "shadow-[var(--shadow-clay-raised)] ring-1 ring-success-500/30",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-charcoal-700">
            <ShieldCheck
              className={cn("h-5 w-5", identity?.status === "verified" ? "text-success-500" : "text-brand-600")}
            />
            Identity verification
          </h2>
          {identity && (
            <Badge variant={STATUS_COPY[identity.status]?.variant ?? "neutral"}>
              {STATUS_COPY[identity.status]?.label ?? identity.status}
            </Badge>
          )}
        </div>

        {!identity ? (
          <div className="mt-4">
            <p className="text-sm text-charcoal-500">
              Submit a government-issued ID so renters know you&apos;re a verified owner.
            </p>
            <form action={submitIdentityVerificationAction} className="mt-3">
              <Button type="submit">Start identity verification</Button>
            </form>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <StatusIcon status={identity.status} />
              {identity.reviewer_notes && (
                <p className="text-sm text-charcoal-500">{identity.reviewer_notes}</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {identity.private_verification_documents.map((d) => (
                <DocumentLink key={d.id} documentId={d.id} filename={d.original_filename} />
              ))}
            </div>
            {(identity.status === "submitted" || identity.status === "needs_more_info") && (
              <DocumentUploader
                requestId={identity.id}
                requestKind="identity"
                documentCount={identity.private_verification_documents.length}
              />
            )}
          </div>
        )}
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg font-semibold text-charcoal-700">Property documents</h2>
        <p className="mt-1 text-sm text-charcoal-500">
          Submit ownership or management authorization evidence for each listing you want reviewed.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {(properties ?? []).map((property) => {
            const request = propertyRequests?.find((r) => r.property_id === property.id);
            const verified = request?.status === "verified";
            return (
              <div
                key={property.id}
                className={cn(
                  "rounded-[var(--radius-md)] border border-border p-4",
                  verified && "border-success-500/40 bg-success-100/30",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-charcoal-700">{property.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={request ? (STATUS_COPY[request.status]?.variant ?? "neutral") : "neutral"}>
                      {request ? (STATUS_COPY[request.status]?.label ?? request.status) : "Not submitted"}
                    </Badge>
                    {!request && (
                      <form
                        action={async () => {
                          "use server";
                          await submitPropertyVerificationAction(property.id);
                        }}
                      >
                        <Button type="submit" size="sm" variant="secondary">
                          Submit for review
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
                {request && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      {request.private_verification_documents.map((d) => (
                        <DocumentLink key={d.id} documentId={d.id} filename={d.original_filename} />
                      ))}
                    </div>
                    {(request.status === "submitted" || request.status === "needs_more_info") && (
                      <DocumentUploader
                        requestId={request.id}
                        requestKind="property"
                        documentCount={request.private_verification_documents.length}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {(properties ?? []).length === 0 && (
            <p className="text-sm text-charcoal-400">List a property first to submit it for review.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
