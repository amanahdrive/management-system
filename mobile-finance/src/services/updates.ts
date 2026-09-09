import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

declare const __DEV__: boolean;

export interface UpdateStatus {
  isAvailable: boolean;
  isDownloading: boolean;
  manifest?: Updates.Manifest;
  updateId?: string;
  channel?: string;
  runtimeVersion?: string;
  isEmbeddedLaunch: boolean;
}

/**
 * Retrieves the current OTA update status and runtime environment.
 */
export function getCurrentUpdateInfo(): UpdateStatus {
  return {
    isAvailable: false,
    isDownloading: false,
    updateId: Updates.updateId || 'local-embedded',
    channel: Updates.channel || 'development',
    runtimeVersion: Updates.runtimeVersion || '1.0.0',
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}

/**
 * Checks for OTA updates in the background on app start without blocking the UI.
 * If an update is downloaded, alerts the user to reload now or on next launch.
 */
export async function checkAndApplyUpdatesOnLaunch(): Promise<void> {
  if (__DEV__) {
    console.log('[EAS Update] OTA update checking disabled in development mode.');
    return;
  }

  try {
    const check = await Updates.checkForUpdateAsync();
    if (check.isAvailable) {
      console.log('[EAS Update] New update available! Downloading bundle...');
      const fetchResult = await Updates.fetchUpdateAsync();
      if (fetchResult.isNew) {
        Alert.alert(
          '🚀 Pembaruan Sistem Tersedia',
          'Versi terbaru Amanah Finance telah diunduh di latar belakang. Muat ulang sekarang untuk menerapkan perubahan?',
          [
            { text: 'Nanti', style: 'cancel' },
            {
              text: 'Muat Ulang Sekarang',
              style: 'default',
              onPress: async () => {
                await Updates.reloadAsync();
              },
            },
          ]
        );
      }
    }
  } catch (error) {
    console.warn('[EAS Update] Background check error:', error);
  }
}

/**
 * Manually checks for OTA updates (triggered by user in Settings screen).
 */
export async function checkUpdatesManually(): Promise<{
  updated: boolean;
  message: string;
}> {
  if (__DEV__) {
    return {
      updated: false,
      message: 'Pembaruan OTA dinonaktifkan dalam mode development / Expo Go.',
    };
  }

  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) {
      return {
        updated: false,
        message: 'Aplikasi sudah menggunakan versi sistem terbaru.',
      };
    }

    const fetchResult = await Updates.fetchUpdateAsync();
    if (fetchResult.isNew) {
      return {
        updated: true,
        message: 'Pembaruan berhasil diunduh. Aplikasi akan dimuat ulang.',
      };
    }

    return {
      updated: false,
      message: 'Tidak ada pembaruan baru ditemukan.',
    };
  } catch (err: any) {
    return {
      updated: false,
      message: err?.message || 'Gagal memeriksa pembaruan server.',
    };
  }
}

export async function reloadApp(): Promise<void> {
  try {
    await Updates.reloadAsync();
  } catch (e) {
    console.error('Failed to reload app:', e);
  }
}
