import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Avatar } from "../../components/ui/Avatar";
import { ErrorState } from "../../components/ui/ErrorState";
import { Screen } from "../../components/ui/Screen";
import { useSession } from "../../lib/auth/session";
import { formatDayLabel, isNewDay } from "../../lib/format";
import { getConversationDetail, getMessages, markConversationRead, sendMessage } from "../../lib/messaging/service";
import { reportMessage } from "../../lib/reports/service";
import { supabase } from "../../lib/supabase";
import { ReportForm } from "../../components/reports/ReportForm";
import type { Message, ReportReason } from "../../lib/database.types";
import { usePlaceholderColor } from "../../lib/theme";

export default function ConversationScreen() {
  const placeholderColor = usePlaceholderColor();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, session } = useSession();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const conversation = useQuery({ queryKey: ["conversation", id], queryFn: () => getConversationDetail(id) });
  const messages = useQuery({ queryKey: ["messages", id], queryFn: () => getMessages(id) });

  const isRenter = user && conversation.data ? conversation.data.renter_id === user.id : false;
  const counterpartName = conversation.data
    ? isRenter
      ? conversation.data.owner_profile?.display_name
      : conversation.data.renter_profile?.display_name
    : undefined;

  useEffect(() => {
    if (!user || !conversation.data) return;
    markConversationRead(id, isRenter ? "renter" : "owner");
  }, [id, user, conversation.data, isRenter]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["messages", id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  async function onSend() {
    if (!user || !draft.trim()) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");
    const result = await sendMessage(id, user.id, body, session?.access_token);
    if (!("error" in result)) {
      await queryClient.invalidateQueries({ queryKey: ["messages", id] });
    }
    setSending(false);
  }

  if (conversation.isLoading || messages.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-base">
        <ActivityIndicator />
      </View>
    );
  }

  if (conversation.isError || messages.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-base p-6">
        <ErrorState
          message="Couldn't load this conversation."
          onRetry={() => {
            conversation.refetch();
            messages.refetch();
          }}
          retrying={conversation.isRefetching || messages.isRefetching}
        />
      </View>
    );
  }

  const latestMessageId = messages.data?.at(-1)?.id ?? null;

  return (
    <Screen edges={["bottom"]} avoidKeyboard>
      <Stack.Screen options={{ headerShown: true, title: counterpartName ?? "Conversation" }} />

      {user && latestMessageId && (
        <View className="px-4 pt-2">
          <ReportForm
            label="Report this conversation"
            onSubmit={(reason: ReportReason, details: string) => reportMessage(user.id, latestMessageId, id, reason, details)}
          />
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages.data ?? []}
        keyExtractor={(m) => m.id}
        contentContainerClassName="gap-2 p-4"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item, index }) => {
          const mine = item.sender_id === user?.id;
          const prev = messages.data?.[index - 1];
          const startsNewDay = isNewDay(item.sent_at, prev?.sent_at);
          return (
            <View>
              {/* Every bubble used to carry its own "2 days ago", which is
                  noisy on each line and still never gives a clock time.
                  A separator states the day once; the bubble states the
                  time, matching web. */}
              {startsNewDay && (
                <View className="my-3 flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-border-themed" />
                  <Text className="text-xs font-sans-semibold text-content-subtle">
                    {formatDayLabel(item.sent_at)}
                  </Text>
                  <View className="h-px flex-1 bg-border-themed" />
                </View>
              )}
              <View className={mine ? "flex-row justify-end" : "flex-row items-end gap-2"}>
                {!mine && <Avatar name={counterpartName} size="sm" />}
                {/* Own messages were a solid saturated accent fill, so a
                    real conversation became a wall of red -- drowning out
                    the places red is meant to signal something, and reading
                    as "error" in a messaging context. The soft accent keeps
                    the sender distinction without shouting. Its timestamp
                    was also ivory-50/70 on that fill: 3.03:1, under AA. */}
                <View className={mine ? "max-w-[75%] rounded-lg bg-accent-soft px-3 py-2" : "max-w-[75%] rounded-lg bg-surface-raised px-3 py-2"}>
                  <Text className={mine ? "text-accent-on-soft" : "text-content-strong"}>{item.body}</Text>
                  <Text className={mine ? "mt-1 text-xs text-accent-on-soft" : "mt-1 text-xs text-content-muted"}>
                    {new Date(item.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="items-center gap-1 p-10">
            <Text className="font-sans-semibold text-sm text-content-strong">No messages yet.</Text>
            <Text className="text-center text-sm text-content-muted">
              Ask whether it&apos;s still available, and what the move-in costs include.
            </Text>
          </View>
        }
      />

      <View className="flex-row items-end gap-2 border-t border-border-themed p-3">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message…"
          placeholderTextColor={placeholderColor}
          accessibilityLabel="Write a message"
          multiline
          className="flex-1 max-h-28 rounded-md border border-border-themed bg-surface-raised px-3 py-2 text-base text-content-strong "
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: sending || !draft.trim(), busy: sending }}
          onPress={onSend}
          disabled={sending || !draft.trim()}
          className={`h-11 items-center justify-center rounded-full bg-clay-500 px-5 active:bg-clay-600 ${sending || !draft.trim() ? "opacity-50" : ""}`}
        >
          <Text className="font-sans-semibold text-ivory-50">Send</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
