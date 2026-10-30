import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { NotificationType } from "@/types/database";

/**
 * Records a privileged action. Called from every admin/moderation Server
 * Action in this file-tree — see docs/SECURITY.md. Never pass sensitive
 * documents or unnecessary personal data in `metadata`; a reference (id)
 * is enough.
 */
export async function recordAdminAction(params: {
  actorId: string;
  action: string;
  targetTable: string;
  targetId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createServiceRoleClient();
  await admin.from("admin_audit_logs").insert({
    actor_id: params.actorId,
    action: params.action,
    target_table: params.targetTable,
    target_id: params.targetId,
    reason: params.reason ?? null,
    metadata: params.metadata ?? {},
  });
}

export async function notifyUser(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  const admin = createServiceRoleClient();
  await admin.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
  });
}
