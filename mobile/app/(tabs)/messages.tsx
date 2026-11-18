import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { ErrorState } from "../../components/ui/ErrorState";
import { Screen } from "../../components/ui/Screen";
import { useSession } from "../../lib/auth/session";
import { formatRelativeDate } from "../../lib/format";
import { getConversationsForUser, type ConversationRow } from "../../lib/messaging/service";
import { propertyImageUrl } from "../../lib/storage";

export default function MessagesScreen() {
  const { user, loading } = useSession();
  const conversations = useQuery({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: getConversationsForUser,
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-base">
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-surface-base p-6">
        <Text className="text-center text-base text-content-strong">Log in to message property owners.</Text>
        <Link href="/(auth)/login" asChild>
          <Button>Log in</Button>
        </Link>
      </View>
    );
  }

  return (
    <Screen>
      <Text className="px-4 pb-3 pt-3 font-display-bold text-xl text-content-strong">Messages</Text>
      {conversations.isLoading ? (
        <ActivityIndicator />
      ) : conversations.isError ? (
        <ErrorState
          message="Couldn't load your conversations."
          onRetry={() => conversations.refetch()}
          retrying={conversations.isRefetching}
        />
      ) : (
        <FlatList
          data={conversations.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConversationRowItem conversation={item} currentUserId={user.id} />}
          ListEmptyComponent={
            <View className="items-center gap-3 p-10">
              <Text className="text-center font-sans-semibold text-content-strong">
                Your property conversations will appear here.
              </Text>
              <Text className="text-center text-sm text-content-muted">
                Browse properties and message an owner directly to get started.
              </Text>
              <Link href="/(tabs)/search" asChild>
                <Button>Browse properties</Button>
              </Link>
            </View>
          }
        />
      )}
    </Screen>
  );
}

function ConversationRowItem({ conversation: c, currentUserId }: { conversation: ConversationRow; currentUserId: string }) {
  const isRenter = c.renter_id === currentUserId;
  const name = isRenter ? c.owner_profile?.display_name : c.renter_profile?.display_name;
  const lastRead = isRenter ? c.renter_last_read_at : c.owner_last_read_at;
  const unread = !lastRead || new Date(lastRead) < new Date(c.updated_at);
  const cover = c.properties?.property_images.find((img) => img.is_cover) ?? c.properties?.property_images[0];

  return (
    <Link href={`/messages/${c.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Conversation with ${name ?? "Unknown user"}${unread ? ", unread" : ""}`}
        className="flex-row items-center gap-3 border-b border-border px-4 py-3 active:bg-sage-100 dark:border-charcoal-500 dark:active:bg-charcoal-700"
      >
        <Avatar name={name} />
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className={unread ? "font-sans-semibold text-content-strong" : "font-sans text-content-strong"} numberOfLines={1}>
              {name ?? "Unknown user"}
            </Text>
            <Text className="text-xs text-content-muted">{formatRelativeDate(c.updated_at)}</Text>
          </View>
          <Text className="text-xs text-content-muted" numberOfLines={1}>
            {c.properties?.title ?? "Property"}
          </Text>
        </View>
        {cover ? (
          <Image source={{ uri: propertyImageUrl(cover.storage_path) }} style={{ width: 40, height: 40, borderRadius: 8 }} alt="" />
        ) : null}
        {unread && <View className="h-2 w-2 rounded-full bg-clay-500" />}
      </Pressable>
    </Link>
  );
}
