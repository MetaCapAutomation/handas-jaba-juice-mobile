import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function OrderConfirmationScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
      <View className="w-28 h-28 bg-primary-50 rounded-full items-center justify-center mb-6">
        <Text className="text-6xl">✅</Text>
      </View>
      <Text className="text-2xl font-bold text-gray-900 text-center mb-2">Order Placed!</Text>
      <Text className="text-gray-500 text-center mb-2">
        Your order has been placed successfully.
      </Text>
      <Text className="text-primary-700 font-semibold text-center mb-8">
        Estimated delivery: 30-45 minutes
      </Text>

      <TouchableOpacity
        className="bg-primary-700 rounded-xl py-4 px-10 mb-4 w-full items-center"
        onPress={() => router.push('/(tabs)/orders')}
      >
        <Text className="text-white font-bold">Track My Order</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="border border-primary-700 rounded-xl py-4 px-10 w-full items-center"
        onPress={() => router.replace('/(tabs)/home')}
      >
        <Text className="text-primary-700 font-bold">Back to Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
