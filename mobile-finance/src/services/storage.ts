import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinanceDataResponse } from '../types/finance';

const KEYS = {
  SERVER_URL: '@amanah_server_url',
  AUTH_TOKEN: '@amanah_auth_token',
  PIN_HASH: '@amanah_pin_hash',
  BIOMETRIC_ENABLED: '@amanah_biometric_enabled',
  FINANCE_CACHE: '@amanah_finance_cache',
  PUSH_TOKEN: '@amanah_push_token',
};

// Default production URL (can be customized from Settings screen)
export const DEFAULT_SERVER_URL = 'https://amanahdrive.vercel.app';

export async function getServerUrl(): Promise<string> {
  try {
    const url = await AsyncStorage.getItem(KEYS.SERVER_URL);
    return url || DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
}

export async function setServerUrl(url: string): Promise<void> {
  const cleanUrl = url.replace(/\/+$/, '');
  await AsyncStorage.setItem(KEYS.SERVER_URL, cleanUrl);
}

export async function getCachedFinanceData(): Promise<FinanceDataResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.FINANCE_CACHE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function setCachedFinanceData(data: FinanceDataResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.FINANCE_CACHE, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to cache finance data', e);
  }
}

export async function getBiometricSetting(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(KEYS.BIOMETRIC_ENABLED);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricSetting(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
}

export async function getSavedPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.PUSH_TOKEN);
  } catch {
    return null;
  }
}

export async function setSavedPushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.PUSH_TOKEN, token);
}
