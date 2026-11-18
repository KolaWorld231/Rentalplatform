import { Tabs } from "expo-router";
import { Heart, Home, MessageCircle, Search } from "lucide-react-native";
import { useColorScheme } from "react-native";

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        /*
          React Navigation takes a plain style object, so neither the
          NativeWind classes nor the CSS variables in global.css reach
          here -- these are the same token values, resolved by hand.

          The active tint is the accent's TEXT value, not its fill: the
          fill (#da1a32) sits at 3.46:1 against the dark bar, and the
          labels are 10px, so it was the least legible text in the app
          on the one control that is always on screen.
        */
        tabBarActiveTintColor: isDark ? "#f06575" : "#b8122f",
        tabBarInactiveTintColor: isDark ? "#9a9188" : "#6e6762",
        tabBarStyle: {
          backgroundColor: isDark ? "#262220" : "#ffffff",
          borderTopColor: isDark ? "#3a3330" : "#e7e0d8",
          // tabBarStyle is a plain RN style object (React Navigation), not
          // a NativeWind className -- the tailwind.config.js boxShadow
          // tokens don't reach here, so the "floating" tier's resolved
          // values are hardcoded inline instead.
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 20,
          elevation: 10,
        },
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
