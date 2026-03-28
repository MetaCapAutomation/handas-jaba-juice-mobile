import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function CheckoutScreen() {
  const handlePlaceOrder = () => {
    // TODO: Supabase order creation
    router.replace('/order-confirmation');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-700 px-5 pt-4 pb-5 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-white text-base">←</Text>
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Checkout</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {/* Delivery Address */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm">
          <Text className="font-bold text-gray-900 mb-3">Delivery Address</Text>
          <View className="mb-3">
            <Text className="text-sm text-gray-600 mb-1">Street Address</Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
              placeholder="123 Mombasa Rd, Nairobi"
            />
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-sm text-gray-600 mb-1">City</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                placeholder="Nairobi"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-600 mb-1">Area</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900"
                placeholder="Westlands"
              />
            </View>
          </View>
        </View>

        {/* Delivery Time */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm">
          <Text className="font-bold text-gray-900 mb-3">Delivery Time</Text>
          <View className="flex-row gap-3">
            {['ASAP', 'Schedule'].map((opt) => (
              <TouchableOpacity
                key={opt}
                className={`flex-1 py-3 rounded-xl border items-center ${opt === 'ASAP' ? 'border-primary-700 bg-primary-50' : 'border-gray-200'}`}
              >
                <Text className={opt === 'ASAP' ? 'text-primary-700 font-semibold' : 'text-gray-600'}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment Method */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm">
          <Text className="font-bold text-gray-900 mb-3">Payment Method</Text>
          {['M-Pesa', 'Card', 'Cash on Delivery'].map((method, i) => (
            <TouchableOpacity
              key={method}
              className={`flex-row items-center py-3 ${i < 2 ? 'border-b border-gray-100' : ''}`}
            >
              <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${i === 0 ? 'border-primary-700' : 'border-gray-300'}`}>
                {i === 0 && <View className="w-2.5 h-2.5 rounded-full bg-primary-700" />}
              </View>
              <Text className="text-gray-900">{method}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Order Summary */}
        <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100 shadow-sm">
          <Text className="font-bold text-gray-900 mb-3">Order Summary</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Subtotal</Text>
            <Text className="text-gray-900">KES 1,100</Text>
          </View>
          <View className="flex-row justify-between mb-3">
            <Text className="text-gray-600">Delivery Fee</Text>
            <Text className="text-gray-900">KES 100</Text>
          </View>
          <View className="h-px bg-gray-100 mb-3" />
          <View className="flex-row justify-between">
            <Text className="font-bold text-gray-900">Total</Text>
            <Text className="font-bold text-primary-700">KES 1,200</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order */}
      <View className="px-5 pb-4">
        <TouchableOpacity
          className="bg-primary-700 rounded-xl py-4 items-center"
          onPress={handlePlaceOrder}
        >
          <Text className="text-white font-bold text-base">Place Order — KES 1,200</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
