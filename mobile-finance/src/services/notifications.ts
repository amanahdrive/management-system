import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getServerUrl, getSavedPushToken, setSavedPushToken } from './storage';

export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-FINANCE-NOTIFICATION-TASK';

// Configure foreground presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// Register headless background task to process incoming push even when app is killed
try {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }: any) => {
    if (error) {
      console.error('[Headless Task] Error receiving background push notification:', error);
      return;
    }
    console.log('[Headless Task] Received background push notification:', data);
  });
} catch (e) {
  console.warn('TaskManager definition notice:', e);
}

/**
 * Initializes Android notification channels with MAX priority to bypass Doze mode.
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    // Channel 1: Pemasukan Kas (High priority, green light)
    await Notifications.setNotificationChannelAsync('finance-money-in', {
      name: '💰 Pemasukan Kas & Pembayaran Siswa',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    // Channel 2: Pengeluaran & Urgent Alerts (MAX priority, red light)
    await Notifications.setNotificationChannelAsync('finance-urgent', {
      name: '🚨 Pengeluaran & Alert Keuangan',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#EF4444',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    // Channel 3: Daily recap
    await Notifications.setNotificationChannelAsync('finance-daily', {
      name: '📊 Rekap & Pengingat Harian',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 200, 200],
      lightColor: '#3B82F6',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }
}

/**
 * Requests push notification permissions and registers token with backend
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  await setupNotificationChannels();

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission denied by user');
      return null;
    }

    try {
      // Register background notification task
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
      if (!isTaskRegistered) {
        await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      }
    } catch (taskErr) {
      console.warn('Could not register background task:', taskErr);
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId ??
        'amanah-finance-app';

      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      token = pushTokenData.data;

      // Save token locally
      if (token) {
        await setSavedPushToken(token);
      }

      // Send token to backend API
      const serverUrl = await getServerUrl();
      const deviceName = `${Device.manufacturer || ''} ${Device.modelName || ''}`.trim();

      await fetch(`${serverUrl}/api/notifications/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          role: 'finance',
          deviceName,
          platform: Platform.OS,
        }),
      });

      console.log('Successfully registered push token with backend:', token);
    } catch (e: any) {
      console.error('Error fetching/registering Expo push token:', e);
    }
  } else {
    console.log('Running on simulator/emulator: push notifications require a physical device');
  }

  return token;
}

/**
 * Sends a test push notification from backend to this device
 */
export async function sendTestPushNotification(): Promise<{ success: boolean; message: string }> {
  try {
    const serverUrl = await getServerUrl();
    const token = await getSavedPushToken();

    const res = await fetch(`${serverUrl}/api/notifications/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '🧪 Uji Coba Push Notifikasi Finance',
        body: 'Notifikasi background Android berhasil terhubung dengan prioritas MAX!',
        channelId: 'finance-money-in',
        priority: 'high',
        data: { test: true, timestamp: Date.now() },
      }),
    });

    const json = await res.json();
    return {
      success: json.success,
      message: json.success
        ? `Terkirim ke ${json.sentCount || 1} perangkat aktif!`
        : (json.errors?.[0] || 'Gagal mengirim push notifikasi'),
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Koneksi ke server gagal',
    };
  }
}
