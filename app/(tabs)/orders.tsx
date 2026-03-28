import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// TODO: Replace with Supabase orders data
const ORDERS = [
  {
    id: 'ORD-001',
    date: '28 Mar 2026',
    status: 'Delivered',
    items: ['Tropical Blast x2', 'Green Detox x1'],
    total: 1100,
  },
  {
    id: 'ORD-002',
    date: '25 Mar 2026',
    status: 'Delivered',
    items: ['Mango Madness x3'],
    total: 960,
  },
];

const STATUS_COLORS: Record<string, string> = {
  Delivered: 'bg-green-100 text-green-700',
  Processing: 'bg-yellow-100 text-yellow-700',
  Cancelled: 'bg-red-100 text-red-700',
  'On the way': 'bg-blue-100 text-blue-700',
};

export default function OrdersScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-700 px-5 pt-4 pb-5">
        <Text className="text-white text-2xl font-bold">My Orders</Text>
        <Text className="text-primary-200 mt-0.5">Track your juice deliveries</Text>
      </View>

      {ORDERS.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-5xl mb-4">📦</Text>
          <Text className="text-xl font-bold text-gray-900 mb-2">No orders yet</Text>
          <Text className="text-gray-500 text-center">Your order history will appear here</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
          {ORDERS.map((order) => {
            const colorClass = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700';
            const [bgClass, textClass] = colorClass.split(' ');
            return (
              <TouchableOpacity
                key={order.id}
                className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <Text className="font-bold text-gray-900">{order.id}</Text>
                    <Text className="text-gray-500 text-sm mt-0.5">{order.date}</Text>
                  </View>
                  <View className={`${bgClass} rounded-full px-3 py-1`}>
                    <Text className={`${textClass} text-xs font-semibold`}>{order.status}</Text>
                  </View>
                </View>
                <View className="h-px bg-gray-100 my-2" />
                {order.items.map((item, i) => (
                  <Text key={i} className="text-gray-600 text-sm mb-0.5">• {item}</Text>
                ))}
                <View className="flex-row justify-between items-center mt-3">
                  <Text className="text-gray-500 text-sm">Total</Text>
                  <Text className="font-bold text-primary-700">KES {order.total}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
