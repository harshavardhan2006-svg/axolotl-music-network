import { View, Text, ScrollView } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-background pt-12 px-4">
      <Text className="text-white text-2xl font-bold mb-6">
        Good Evening
      </Text>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Placeholder for Feed */}
        <View className="bg-card p-4 rounded-2xl mb-4 border border-white/10">
          <Text className="text-white font-bold text-lg mb-2">Recently Played</Text>
          <View className="h-32 bg-zinc-800 rounded-xl items-center justify-center">
             <Text className="text-muted">No recent activity</Text>
          </View>
        </View>

        <View className="bg-card p-4 rounded-2xl mb-4 border border-white/10">
          <Text className="text-white font-bold text-lg mb-2">Your Mix</Text>
          <View className="h-32 bg-zinc-800 rounded-xl items-center justify-center">
             <Text className="text-muted">Coming soon</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
