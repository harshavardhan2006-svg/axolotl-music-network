import { Tabs } from "expo-router";
import { Home, Search, Music, User } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopColor: "#27272a",
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#06b6d4",
        tabBarInactiveTintColor: "#71717a",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={24} color={color} {...({} as any)} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <Search size={24} color={color} {...({} as any)} />,
        }}
      />
      <Tabs.Screen
        name="halls"
        options={{
          title: "Halls",
          tabBarIcon: ({ color }) => <Music size={24} color={color} {...({} as any)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} {...({} as any)} />,
        }}
      />
    </Tabs>
  );
}
