import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Conversation } from "@/types/database";

export const metadata = { title: "Messages", robots: { index: false, follow: false } };

type ConversationRow = Conversation & {
  properties: { title: string; slug: string } | null;
  renter_profile: { display_name: string } | null;
  owner_profile: { display_name: string } | null;
};

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const supabase = await createClient();

  const { data } = (await supabase
    .from("conversations")
    .select(
      "*, properties(title, slug), renter_profile:renter_id(display_name), owner_profile:owner_id(display_name)",
    )
    .order("updated_at", { ascending: false })) as { data: ConversationRow[] | null };

  const conversations = data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">Messages</h1>

      {conversations.length === 0 ? (
        <Card className="mt-6 flex flex-col items-center gap-3 p-12 text-center">
          <MessageCircle className="h-10 w-10 text-charcoal-400" aria-hidden="true" />
          <p className="font-medium text-charcoal-700">Your property conversations will appear here.</p>
          <p className="max-w-md text-sm text-charcoal-500">
            Browse properties and message an owner directly to get started.
          </p>
          <Link href="/search" className={cn(buttonVariants({ variant: "primary" }))}>
            Browse properties
          </Link>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          {conversations.map((c) => {
            const isRenter = c.renter_id === user.id;
            const counterpart = isRenter ? c.owner_profile?.display_name : c.renter_profile?.display_name;
            const lastRead = isRenter ? c.renter_last_read_at : c.owner_last_read_at;
            const unread = !lastRead || new Date(lastRead) < new Date(c.updated_at);

            return (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className="focus-ring flex items-center justify-between gap-4 rounded-[var(--radius-lg)] bg-surface p-4 shadow-[var(--shadow-raised)] hover:shadow-[var(--shadow-floating)]"
              >
                <div className="min-w-0">
                  <p className={`truncate text-sm ${unread ? "font-semibold text-charcoal-700" : "font-medium text-charcoal-600"}`}>
                    {counterpart ?? "Unknown user"}
                  </p>
                  <p className="truncate text-xs text-charcoal-400">{c.properties?.title}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {unread && <span className="h-2 w-2 rounded-full bg-clay-500" aria-label="Unread" />}
                  <span className="text-xs text-charcoal-400">{formatRelativeDate(c.updated_at)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
