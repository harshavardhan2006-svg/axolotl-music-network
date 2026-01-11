import { View, Text } from "react-native";

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-background pt-12 px-4">
      <Text className="text-white text-2xl font-bold mb-6">Profile</Text>
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted text-lg">Login to view profile</Text>
      </View>
    </View>
  );
}
