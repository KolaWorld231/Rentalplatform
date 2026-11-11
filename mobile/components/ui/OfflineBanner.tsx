import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

// Separate from any screen's own "couldn't load" error text -- this is
// specifically the connectivity signal, so a real server/query error
// still reads as a server error, not a vague "offline" message that
// may not even be true.
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isConnected can be null while NetInfo is still determining
      // state -- only show the banner once it's confirmed false.
      setOffline(state.isConnected === false);
    });
    return unsubscribe;
  }, []);

  if (!offline) return null;

  return (
    <View className="bg-warning-100 px-4 py-2 dark:bg-charcoal-700">
      <Text className="text-center text-xs font-sans-semibold text-warning-500">
        You&apos;re offline — some content may be out of date.
      </Text>
    </View>
  );
}
