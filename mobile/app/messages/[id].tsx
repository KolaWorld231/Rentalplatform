import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Avatar } from "../../components/ui/Avatar";
import { useSession } from "../../lib/auth/session";
import { formatRelativeDate } from "../../lib/format";
import { getConversationDetail, getMessages, markConversationRead, sendMessage } from "../../lib/messaging/service";
import { reportMessage } from "../../lib/reports/service";
import { supabase } from "../../lib/supabase";
import { ReportForm } from "../../components/reports/ReportForm";
import type { Message, ReportReason } from "../../lib/database.types";

export default function ConversationScreen() {
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
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-charcoal-900">
        <ActivityIndicator />
      </View>
    );
  }

  if (conversation.isError || messages.isError) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas p-6 dark:bg-charcoal-900">
        <Text className="text-sm text-error-500">Couldn&apos;t load this conversation. Pull to refresh.</Text>
      </View>
    );
  }

  const latestMessageId = messages.data?.at(-1)?.id ?? null;

  return (
    <View className="flex-1 bg-canvas dark:bg-charcoal-900">
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
        renderItem={({ item }) => {
          const mine = item.sender_id === user?.id;
          return (
            <View className={mine ? "flex-row justify-end" : "flex-row items-end gap-2"}>
              {!mine && <Avatar name={counterpartName} size="sm" />}
              <View className={mine ? "max-w-[75%] rounded-lg bg-forest-600 px-3 py-2" : "max-w-[75%] rounded-lg bg-surface px-3 py-2 dark:bg-charcoal-700"}>
                <Text className={mine ? "text-ivory-50" : "text-charcoal-700 dark:text-ivory-100"}>{item.body}</Text>
                <Text className={mine ? "mt-1 text-xs text-ivory-50/70" : "mt-1 text-xs text-charcoal-500 dark:text-charcoal-400"}>
                  {formatRelativeDate(item.sent_at)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="items-center p-10">
            <Text className="text-sm text-charcoal-500 dark:text-charcoal-400">No messages yet. Say hello.</Text>
          </View>
        }
      />

      <View className="flex-row items-end gap-2 border-t border-border p-3 dark:border-charcoal-500">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message…"
          placeholderTextColor="#737373"
          accessibilityLabel="Write a message"
          multiline
          className="flex-1 max-h-28 rounded-md border border-border bg-surface px-3 py-2 text-base text-charcoal-700 dark:border-charcoal-500 dark:bg-charcoal-700 dark:text-ivory-100"
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
    </View>
  );
}
