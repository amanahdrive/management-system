import React, { createContext, useContext, useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { verifyPinWithServer } from '../api/client';
import { getBiometricSetting, setBiometricSetting } from '../services/storage';

interface AuthContextType {
  isUnlocked: boolean;
  isLoading: boolean;
  hasBiometrics: boolean;
  isBiometricsEnabled: boolean;
  unlockWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  unlockWithBiometrics: () => Promise<boolean>;
  toggleBiometrics: (enabled: boolean) => Promise<void>;
  lockApp: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasBiometrics, setHasBiometrics] = useState<boolean>(false);
  const [isBiometricsEnabled, setIsBiometricsEnabledState] = useState<boolean>(false);

  useEffect(() => {
    async function checkAuthMethods() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const supported = hasHardware && isEnrolled;
        setHasBiometrics(supported);

        const savedBio = await getBiometricSetting();
        setIsBiometricsEnabledState(savedBio && supported);

        // Auto prompt biometric if enabled
        if (savedBio && supported) {
          const auth = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Verifikasi Sidik Jari untuk Amanah Finance',
            fallbackLabel: 'Gunakan PIN',
          });
          if (auth.success) {
            setIsUnlocked(true);
          }
        }
      } catch (err) {
        console.warn('Error during biometric check:', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthMethods();
  }, []);

  const unlockWithPin = async (pin: string) => {
    const res = await verifyPinWithServer(pin);
    if (res.success) {
      setIsUnlocked(true);
    }
    return res;
  };

  const unlockWithBiometrics = async (): Promise<boolean> => {
    try {
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verifikasi Sidik Jari untuk Amanah Finance',
        fallbackLabel: 'Gunakan PIN',
      });
      if (auth.success) {
        setIsUnlocked(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const toggleBiometrics = async (enabled: boolean) => {
    await setBiometricSetting(enabled);
    setIsBiometricsEnabledState(enabled);
  };

  const lockApp = () => {
    setIsUnlocked(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isUnlocked,
        isLoading,
        hasBiometrics,
        isBiometricsEnabled,
        unlockWithPin,
        unlockWithBiometrics,
        toggleBiometrics,
        lockApp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
