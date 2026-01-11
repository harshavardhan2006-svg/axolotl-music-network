import { View, Text, TextInput } from "react-native";
import { Search } from "lucide-react-native";

export default function SearchScreen() {
  return (
    <View className="flex-1 bg-background pt-12 px-4">
      <Text className="text-white text-2xl font-bold mb-6">Search</Text>
      
      <View className="flex-row items-center bg-zinc-900 rounded-xl px-4 py-3 mb-6 border border-white/10">
        <Search size={20} color="#71717a" {...({} as any)} />
        <TextInput 
          placeholder="What do you want to listen to?" 
          placeholderTextColor="#71717a"
          className="flex-1 ml-3 text-white text-base"
        />
      </View>

      <Text className="text-white font-bold text-lg mb-4">Browse All</Text>
      <View className="flex-row flex-wrap justify-between">
        {/* Categories */}
        {['Pop', 'Rock', 'Hip-Hop', 'Indie'].map((genre) => (
           <View key={genre} className="w-[48%] h-24 bg-zinc-800 rounded-xl mb-4 p-3 relative overflow-hidden">
              <Text className="text-white font-bold text-lg">{genre}</Text>
           </View>
        ))}
      </View>
    </View>
  );
}
