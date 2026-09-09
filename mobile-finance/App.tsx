import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/store/authContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { checkAndApplyUpdatesOnLaunch } from './src/services/updates';
import { registerForPushNotificationsAsync } from './src/services/notifications';

export default function App() {
  useEffect(() => {
    // 1. Check for OTA Updates in the background
    checkAndApplyUpdatesOnLaunch();

    // 2. Setup Android MAX Importance Push Notification channels & register token
    registerForPushNotificationsAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0F172A" />
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
