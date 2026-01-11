import { View, Text } from "react-native";

export default function HallsScreen() {
  return (
    <View className="flex-1 bg-background pt-12 px-4">
      <Text className="text-white text-2xl font-bold mb-6">Music Halls</Text>
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted text-lg">Join a hall to listen together</Text>
      </View>
    </View>
  );
}
