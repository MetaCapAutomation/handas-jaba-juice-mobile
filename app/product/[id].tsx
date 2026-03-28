import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

// Placeholder — will be replaced by Supabase query
const PRODUCTS: Record<string, { name: string; price: number; emoji: string; description: string; ingredients: string[]; sizes: { label: string; price: number }[] }> = {
  '1': {
    name: 'Tropical Blast',
    price: 350,
    emoji: '🍍',
    description: 'A refreshing tropical blend that brings the taste of paradise to every sip. Made with the freshest pineapple, ripe mango, and tangy passion fruit.',
    ingredients: ['Fresh Pineapple', 'Ripe Mango', 'Passion Fruit', 'Lime Juice'],
    sizes: [
      { label: '250ml', price: 250 },
      { label: '500ml', price: 350 },
      { label: '1L', price: 600 },
    ],
  },
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = PRODUCTS[id] ?? PRODUCTS['1'];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Hero */}
      <View className="bg-primary-700 px-5 pt-4 pb-10 items-center relative">
        <TouchableOpacity
          className="absolute left-5 top-4 w-9 h-9 bg-primary-600 rounded-full items-center justify-center"
          onPress={() => router.back()}
        >
          <Text className="text-white">←</Text>
        </TouchableOpacity>
        <View className="w-32 h-32 bg-white rounded-full items-center justify-center mt-4">
          <Text className="text-6xl">{product.emoji}</Text>
        </View>
        <Text className="text-white text-2xl font-bold mt-4">{product.name}</Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Price & Description */}
        <View className="mt-5">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-primary-700 text-2xl font-bold">KES {product.price}</Text>
            <View className="bg-primary-50 rounded-full px-3 py-1">
              <Text className="text-primary-700 text-sm font-medium">In Stock</Text>
            </View>
          </View>
          <Text className="text-gray-600 leading-6 mb-5">{product.description}</Text>
        </View>

        {/* Size Selection */}
        <View className="mb-5">
          <Text className="font-bold text-gray-900 text-base mb-3">Choose Size</Text>
          <View className="flex-row gap-3">
            {product.sizes.map((size, i) => (
              <TouchableOpacity
                key={size.label}
                className={`flex-1 border rounded-xl py-3 items-center ${i === 1 ? 'border-primary-700 bg-primary-50' : 'border-gray-200'}`}
              >
                <Text className={`font-semibold text-sm ${i === 1 ? 'text-primary-700' : 'text-gray-700'}`}>{size.label}</Text>
                <Text className={`text-xs mt-0.5 ${i === 1 ? 'text-primary-600' : 'text-gray-500'}`}>KES {size.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ingredients */}
        <View className="mb-6">
          <Text className="font-bold text-gray-900 text-base mb-3">Ingredients</Text>
          <View className="flex-row flex-wrap gap-2">
            {product.ingredients.map((ingredient) => (
              <View key={ingredient} className="bg-gray-100 rounded-full px-3 py-1.5">
                <Text className="text-gray-700 text-sm">{ingredient}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add to Cart */}
      <View className="px-5 pb-4 flex-row gap-3">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 gap-4">
          <TouchableOpacity>
            <Text className="text-gray-700 font-bold text-lg">−</Text>
          </TouchableOpacity>
          <Text className="font-bold text-gray-900 text-base">1</Text>
          <TouchableOpacity>
            <Text className="text-primary-700 font-bold text-lg">+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity className="flex-1 bg-primary-700 rounded-xl py-3 items-center">
          <Text className="text-white font-bold">Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
