import { Tabs } from "expo-router";
import { Heart, Home, MessageCircle, Search } from "lucide-react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#da1a32",
        tabBarInactiveTintColor: "#737373",
        tabBarStyle: { backgroundColor: "#ffffff", borderTopColor: "#e5e5e5" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="search" options={{ title: "Search", tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }} />
      <Tabs.Screen name="saved" options={{ title: "Saved", tabBarIcon: ({ color, size }) => <Heart color={color} size={size} /> }} />
      <Tabs.Screen
        name="messages"
        options={{ title: "Messages", tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }}
      />
    </Tabs>
  );
}
