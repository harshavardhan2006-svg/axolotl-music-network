import { View, Text, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

export default function Home() {
  return (
    <View className="flex-1 bg-background items-center justify-center p-4">
      <Text className="text-primary text-4xl font-bold mb-4">
        Axolotl Music
      </Text>
      <Text className="text-white text-lg mb-8 text-center">
        Welcome to the mobile experience.
      </Text>
      
      <Link href="/(tabs)" asChild>
        <TouchableOpacity className="bg-primary px-6 py-3 rounded-full">
          <Text className="text-white font-bold">Get Started</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
