import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const { initialize, user } = useAuthStore();

  useEffect(() => {
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await initialize(session ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Register push token after login — guarded so it never runs in Expo Go
  useEffect(() => {
    if (!user?.id) return;
    // Dynamic import keeps expo-notifications out of the initial module graph,
    // so the Expo Go push-token restriction cannot crash the layout on load.
    import('../lib/pushNotifications').then(({ registerForPushNotifications }) => {
      registerForPushNotifications(user.id).catch(() => {});
    }).catch(() => {});
  }, [user?.id]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="order-confirmation" />
        <Stack.Screen name="account-settings" />
        <Stack.Screen name="notification-settings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="help-centre" />
      </Stack>
    </>
  );
}
