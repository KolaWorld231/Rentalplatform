import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { buttonVariants } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { propertyImageUrl } from "@/lib/supabase/storage";
import { formatRelativeDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Conversation } from "@/types/database";

type ConversationRow = Conversation & {
  properties: { title: string; slug: string; property_images: { storage_path: string; is_cover: boolean }[] } | null;
  renter_profile: { display_name: string } | null;
  owner_profile: { display_name: string } | null;
};

export async function getConversationsForUser(): Promise<ConversationRow[]> {
  const supabase = await createClient();
  const { data } = (await supabase
    .from("conversations")
    .select(
      "*, properties(title, slug, property_images(storage_path, is_cover)), renter_profile:renter_id(display_name), owner_profile:owner_id(display_name)",
    )
    .order("updated_at", { ascending: false })) as { data: ConversationRow[] | null };
  return data ?? [];
}

export function ConversationList({
  conversations,
  currentUserId,
  activeConversationId,
}: {
  conversations: ConversationRow[];
  currentUserId: string;
  activeConversationId?: string;
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <MessageCircle className="h-10 w-10 text-charcoal-400" aria-hidden="true" />
        <p className="font-medium text-charcoal-700">Your property conversations will appear here.</p>
        <p className="max-w-xs text-sm text-charcoal-500">
          Browse properties and message an owner directly to get started.
        </p>
        <Link href="/search" className={cn(buttonVariants({ variant: "primary" }), "mt-1")}>
          Browse properties
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 p-2">
      {conversations.map((c) => {
        const isRenter = c.renter_id === currentUserId;
        const name = isRenter ? c.owner_profile?.display_name : c.renter_profile?.display_name;
        const lastRead = isRenter ? c.renter_last_read_at : c.owner_last_read_at;
        const unread = !lastRead || new Date(lastRead) < new Date(c.updated_at);
        const cover =
          c.properties?.property_images.find((i) => i.is_cover) ?? c.properties?.property_images[0] ?? null;
        const isActive = c.id === activeConversationId;

        return (
          <Link
            key={c.id}
            href={`/messages/${c.id}`}
            className={cn(
              "focus-ring flex items-center gap-3 rounded-[var(--radius-lg)] p-3 transition-colors",
              isActive ? "bg-sage-100" : "hover:bg-sage-100/60",
            )}
          >
            <Avatar name={name} />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm",
                  unread ? "font-semibold text-charcoal-700" : "font-medium text-charcoal-600",
                )}
              >
                {name ?? "Unknown user"}
              </p>
              <p className="truncate text-xs text-charcoal-400">{c.properties?.title}</p>
            </div>
            {cover && (
              <div className="relative hidden h-10 w-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-sage-200 sm:block">
                <Image src={propertyImageUrl(cover.storage_path)} alt="" fill sizes="48px" className="object-cover" />
              </div>
            )}
            <div className="flex shrink-0 flex-col items-end gap-1">
              {unread && <span className="h-2 w-2 rounded-full bg-clay-500" aria-label="Unread" />}
              <span className="text-xs text-charcoal-400">{formatRelativeDate(c.updated_at)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
