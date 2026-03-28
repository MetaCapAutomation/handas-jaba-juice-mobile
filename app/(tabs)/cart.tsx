import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// TODO: Replace with Zustand cart store
const CART_ITEMS = [
  { id: '1', name: 'Tropical Blast', price: 350, qty: 2, emoji: '🍍' },
  { id: '2', name: 'Green Detox', price: 400, qty: 1, emoji: '🥝' },
];

export default function CartScreen() {
  const subtotal = CART_ITEMS.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = 100;
  const total = subtotal + deliveryFee;

  if (CART_ITEMS.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center px-6">
        <Text className="text-6xl mb-4">🛒</Text>
        <Text className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</Text>
        <Text className="text-gray-500 text-center mb-6">Add some delicious juices to get started</Text>
        <TouchableOpacity
          className="bg-primary-700 rounded-xl py-3 px-8"
          onPress={() => router.push('/(tabs)/menu')}
        >
          <Text className="text-white font-bold">Browse Menu</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-700 px-5 pt-4 pb-5">
        <Text className="text-white text-2xl font-bold">Your Cart</Text>
        <Text className="text-primary-200 mt-0.5">{CART_ITEMS.length} items</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {CART_ITEMS.map((item) => (
          <View key={item.id} className="bg-white rounded-2xl p-4 mb-3 flex-row items-center border border-gray-100 shadow-sm">
            <View className="w-14 h-14 bg-primary-50 rounded-2xl items-center justify-center mr-3">
              <Text className="text-2xl">{item.emoji}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-gray-900">{item.name}</Text>
              <Text className="text-primary-700 font-bold mt-0.5">KES {item.price}</Text>
            </View>
            {/* Quantity Controls */}
            <View className="flex-row items-center gap-3">
              <TouchableOpacity className="w-7 h-7 bg-gray-100 rounded-full items-center justify-center">
                <Text className="text-gray-700 font-bold">−</Text>
              </TouchableOpacity>
              <Text className="font-bold text-gray-900 w-4 text-center">{item.qty}</Text>
              <TouchableOpacity className="w-7 h-7 bg-primary-700 rounded-full items-center justify-center">
                <Text className="text-white font-bold">+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Order Summary */}
        <View className="bg-white rounded-2xl p-5 mt-2 mb-6 border border-gray-100 shadow-sm">
          <Text className="font-bold text-gray-900 text-base mb-4">Order Summary</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Subtotal</Text>
            <Text className="text-gray-900 font-medium">KES {subtotal}</Text>
          </View>
          <View className="flex-row justify-between mb-3">
            <Text className="text-gray-600">Delivery Fee</Text>
            <Text className="text-gray-900 font-medium">KES {deliveryFee}</Text>
          </View>
          <View className="h-px bg-gray-100 mb-3" />
          <View className="flex-row justify-between">
            <Text className="font-bold text-gray-900 text-base">Total</Text>
            <Text className="font-bold text-primary-700 text-base">KES {total}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <View className="px-5 pb-4">
        <TouchableOpacity
          className="bg-primary-700 rounded-xl py-4 items-center"
          onPress={() => router.push('/checkout')}
        >
          <Text className="text-white font-bold text-base">Proceed to Checkout — KES {total}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
