import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
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
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-charcoal-900">
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-canvas p-6 dark:bg-charcoal-900">
        <Text className="text-center text-base text-charcoal-700 dark:text-ivory-100">Log in to message property owners.</Text>
        <Link href="/(auth)/login" asChild>
          <Button>Log in</Button>
        </Link>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas pt-16 dark:bg-charcoal-900">
      <Text className="px-4 pb-3 font-display-bold text-xl text-charcoal-700 dark:text-ivory-100">Messages</Text>
      {conversations.isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={conversations.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ConversationRowItem conversation={item} currentUserId={user.id} />}
          ListEmptyComponent={
            <View className="items-center gap-3 p-10">
              <Text className="text-center font-sans-semibold text-charcoal-700 dark:text-ivory-100">
                Your property conversations will appear here.
              </Text>
              <Text className="text-center text-sm text-charcoal-500 dark:text-charcoal-400">
                Browse properties and message an owner directly to get started.
              </Text>
              <Link href="/(tabs)/search" asChild>
                <Button>Browse properties</Button>
              </Link>
            </View>
          }
        />
      )}
    </View>
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
      <Pressable className="flex-row items-center gap-3 border-b border-border px-4 py-3 active:bg-sage-100 dark:border-charcoal-500 dark:active:bg-charcoal-700">
        <Avatar name={name} />
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className={unread ? "font-sans-semibold text-charcoal-700 dark:text-ivory-100" : "font-sans text-charcoal-700 dark:text-ivory-100"} numberOfLines={1}>
              {name ?? "Unknown user"}
            </Text>
            <Text className="text-xs text-charcoal-500 dark:text-charcoal-400">{formatRelativeDate(c.updated_at)}</Text>
          </View>
          <Text className="text-xs text-charcoal-500 dark:text-charcoal-400" numberOfLines={1}>
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
