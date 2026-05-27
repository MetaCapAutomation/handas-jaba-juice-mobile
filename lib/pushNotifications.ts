import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Push tokens are unavailable in Expo Go since SDK 53.
// This helper is dynamically imported so it never loads in the initial module
// graph (which would crash _layout.tsx in Expo Go before it can export).
const isExpoGo = Constants.appOwnership === 'expo';

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (isExpoGo) return null; // Expo Go blocks remote push tokens since SDK 53

  try {
    // Import expo-notifications only when we are in a real build
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Handas Jaba Juice',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22C55E',
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('user_id', userId);

    return token;
  } catch {
    return null;
  }
}
