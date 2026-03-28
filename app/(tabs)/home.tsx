import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Placeholder data — will be replaced by Supabase data
const FEATURED = [
  { id: '1', name: 'Tropical Blast', price: 350, emoji: '🍍', tag: 'Best Seller' },
  { id: '2', name: 'Green Detox', price: 400, emoji: '🥝', tag: 'Healthy' },
  { id: '3', name: 'Mango Madness', price: 320, emoji: '🥭', tag: 'Popular' },
];

const CATEGORIES = [
  { id: '1', name: 'All', emoji: '✨' },
  { id: '2', name: 'Tropical', emoji: '🌴' },
  { id: '3', name: 'Detox', emoji: '🌿' },
  { id: '4', name: 'Citrus', emoji: '🍊' },
  { id: '5', name: 'Berry', emoji: '🍓' },
];

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-primary-700 px-5 pt-4 pb-6">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-primary-200 text-sm">Good morning 👋</Text>
              <Text className="text-white text-xl font-bold mt-0.5">What'll it be today?</Text>
            </View>
            <TouchableOpacity
              className="w-10 h-10 bg-primary-600 rounded-full items-center justify-center"
              onPress={() => router.push('/(tabs)/cart')}
            >
              <Text className="text-white text-lg">🛒</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-white rounded-xl px-4 py-2.5">
            <Text className="mr-2 text-gray-400">🔍</Text>
            <TextInput
              placeholder="Search juices..."
              placeholderTextColor="#9ca3af"
              className="flex-1 text-gray-900 text-base"
            />
          </View>
        </View>

        {/* Categories */}
        <View className="mt-5 mb-2">
          <Text className="text-gray-900 font-bold text-base px-5 mb-3">Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                className="bg-white rounded-2xl px-4 py-2.5 items-center border border-gray-100 shadow-sm"
              >
                <Text className="text-xl mb-1">{cat.emoji}</Text>
                <Text className="text-xs font-medium text-gray-700">{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured */}
        <View className="mt-4 px-5 mb-6">
          <Text className="text-gray-900 font-bold text-base mb-3">Featured Juices</Text>
          {FEATURED.map((item) => (
            <TouchableOpacity
              key={item.id}
              className="bg-white rounded-2xl mb-3 p-4 flex-row items-center shadow-sm border border-gray-100"
              onPress={() => router.push(`/product/${item.id}`)}
            >
              <View className="w-16 h-16 bg-primary-50 rounded-2xl items-center justify-center mr-4">
                <Text className="text-3xl">{item.emoji}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Text className="font-semibold text-gray-900 text-base mr-2">{item.name}</Text>
                  <View className="bg-accent-light rounded-full px-2 py-0.5">
                    <Text className="text-xs font-medium text-orange-700">{item.tag}</Text>
                  </View>
                </View>
                <Text className="text-primary-700 font-bold">KES {item.price}</Text>
              </View>
              <TouchableOpacity className="bg-primary-700 w-9 h-9 rounded-full items-center justify-center">
                <Text className="text-white text-xl font-bold">+</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
