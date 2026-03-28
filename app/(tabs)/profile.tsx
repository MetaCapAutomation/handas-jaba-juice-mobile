import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// TODO: Replace with Supabase user data
const USER = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+254 700 000 000',
};

const MENU_ITEMS = [
  { icon: '📍', label: 'Saved Addresses', route: '/profile/addresses' },
  { icon: '💳', label: 'Payment Methods', route: '/profile/payment' },
  { icon: '🔔', label: 'Notifications', route: '/profile/notifications' },
  { icon: '❓', label: 'Help & Support', route: '/profile/support' },
  { icon: '📄', label: 'Terms & Privacy', route: '/profile/terms' },
];

export default function ProfileScreen() {
  const handleLogout = () => {
    // TODO: Supabase signOut
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-primary-700 px-5 pt-4 pb-8 items-center">
        <View className="w-20 h-20 bg-white rounded-full items-center justify-center mb-3">
          <Text className="text-4xl">👤</Text>
        </View>
        <Text className="text-white text-xl font-bold">{USER.name}</Text>
        <Text className="text-primary-200 mt-0.5">{USER.email}</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="font-bold text-gray-900">Account Details</Text>
            <TouchableOpacity>
              <Text className="text-primary-600 text-sm font-medium">Edit</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center mb-2">
            <Text className="text-gray-500 w-20 text-sm">Phone</Text>
            <Text className="text-gray-900 text-sm">{USER.phone}</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-gray-500 w-20 text-sm">Email</Text>
            <Text className="text-gray-900 text-sm">{USER.email}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              className={`flex-row items-center px-4 py-4 ${index < MENU_ITEMS.length - 1 ? 'border-b border-gray-100' : ''}`}
              onPress={() => {}}
            >
              <Text className="text-lg mr-3">{item.icon}</Text>
              <Text className="flex-1 text-gray-900">{item.label}</Text>
              <Text className="text-gray-400">›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          className="bg-red-50 border border-red-100 rounded-2xl py-4 items-center mb-8"
          onPress={handleLogout}
        >
          <Text className="text-red-600 font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
