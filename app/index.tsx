import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../stores/authStore';

export default function Index() {
  const { session, role, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      router.replace('/(auth)/login');
      return;
    }

    if (role === 'user') {
      router.replace('/(tabs)/home');
      return;
    }

    router.replace('/(auth)/login');
  }, [isLoading, session, role]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15803d' }}>
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}
