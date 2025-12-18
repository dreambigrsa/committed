import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Ensure notifications show an alert even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function getExpoProjectId(): string | undefined {
  const anyConstants = Constants as any;
  return (
    anyConstants?.expoConfig?.extra?.eas?.projectId ??
    anyConstants?.easConfig?.projectId ??
    undefined
  );
}

export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      // Push tokens do not work on emulators/simulators.
      return null;
    }

    // Android: notification channel is required for visible notifications.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId = getExpoProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const expoPushToken = tokenResponse.data;

    // Store/update token in Supabase so backend can send push notifications.
    // This table is created in the SQL files included in this repo.
    await supabase.from('push_notification_tokens').upsert(
      {
        user_id: userId,
        token: expoPushToken,
        platform: Platform.OS,
        active: true,
        updated_at: new Date().toISOString(),
      } as any,
      {
        onConflict: 'user_id,token',
      }
    );

    return expoPushToken;
  } catch (e) {
    console.error('Failed to register for push notifications:', e);
    return null;
  }
}

export async function showLocalNotification(params: { title: string; body: string; data?: any }) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: params.data ?? {},
      },
      trigger: null,
    });
  } catch (e) {
    console.error('Failed to show local notification:', e);
  }
}


