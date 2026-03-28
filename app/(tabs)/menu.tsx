import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Placeholder — will be replaced by Supabase data
const PRODUCTS = [
  { id: '1', name: 'Tropical Blast', price: 350, emoji: '🍍', category: 'Tropical', description: 'Pineapple, mango, passion fruit' },
  { id: '2', name: 'Green Detox', price: 400, emoji: '🥝', category: 'Detox', description: 'Cucumber, spinach, kiwi, ginger' },
  { id: '3', name: 'Mango Madness', price: 320, emoji: '🥭', category: 'Tropical', description: 'Fresh mango, orange, pineapple' },
  { id: '4', name: 'Citrus Sunrise', price: 300, emoji: '🍊', category: 'Citrus', description: 'Orange, lemon, grapefruit' },
  { id: '5', name: 'Berry Bliss', price: 380, emoji: '🍓', category: 'Berry', description: 'Strawberry, blueberry, raspberry' },
  { id: '6', name: 'Watermelon Chill', price: 280, emoji: '🍉', category: 'Fresh', description: 'Watermelon, mint, lime' },
];

export default function MenuScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-700 px-5 pt-4 pb-5">
        <Text className="text-white text-2xl font-bold mb-3">Our Menu</Text>
        <View className="flex-row items-center bg-white rounded-xl px-4 py-2.5">
          <Text className="mr-2 text-gray-400">🔍</Text>
          <TextInput
            placeholder="Search all juices..."
            placeholderTextColor="#9ca3af"
            className="flex-1 text-gray-900"
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="px-5 pt-4">
        <View className="flex-row flex-wrap gap-3 pb-6">
          {PRODUCTS.map((item) => (
            <TouchableOpacity
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
              style={{ width: '47%' }}
              onPress={() => router.push(`/product/${item.id}`)}
            >
              <View className="bg-primary-50 rounded-2xl h-24 items-center justify-center mb-3">
                <Text className="text-5xl">{item.emoji}</Text>
              </View>
              <Text className="font-semibold text-gray-900 text-sm mb-0.5">{item.name}</Text>
              <Text className="text-xs text-gray-500 mb-2">{item.description}</Text>
              <View className="flex-row justify-between items-center">
                <Text className="text-primary-700 font-bold text-sm">KES {item.price}</Text>
                <TouchableOpacity className="bg-primary-700 w-7 h-7 rounded-full items-center justify-center">
                  <Text className="text-white font-bold">+</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
