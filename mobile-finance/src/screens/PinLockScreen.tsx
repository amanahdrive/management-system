import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../store/authContext';
import { Delete, Fingerprint, ShieldCheck } from 'lucide-react-native';

export const PinLockScreen: React.FC = () => {
  const { unlockWithPin, unlockWithBiometrics, hasBiometrics, isBiometricsEnabled } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleKeyPress = async (digit: string) => {
    if (pin.length >= 6 || isVerifying) return;

    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg('');

    if (newPin.length === 6) {
      setIsVerifying(true);
      try {
        const res = await unlockWithPin(newPin);
        if (!res.success) {
          Vibration.vibrate([0, 100, 50, 100]);
          setErrorMsg(res.error || 'PIN Salah. Silakan coba lagi.');
          setPin('');
        }
      } catch (err: any) {
        Vibration.vibrate(200);
        setErrorMsg('Gagal memverifikasi PIN');
        setPin('');
      } finally {
        setIsVerifying(false);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0 && !isVerifying) {
      setPin(pin.slice(0, -1));
      setErrorMsg('');
    }
  };

  const renderKey = (val: string, index: number) => {
    return (
      <TouchableOpacity
        key={index}
        style={styles.keyButton}
        activeOpacity={0.7}
        onPress={() => handleKeyPress(val)}
        disabled={isVerifying}
      >
        <Text style={styles.keyText}>{val}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.shieldBadge}>
          <ShieldCheck color="#10B981" size={36} />
        </View>
        <Text style={styles.title}>Amanah Finance</Text>
        <Text style={styles.subtitle}>Masukkan 6 Digit PIN Keamanan</Text>
      </View>

      {/* PIN Dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const isFilled = i < pin.length;
          return (
            <View
              key={i}
              style={[
                styles.dot,
                isFilled && styles.dotFilled,
                errorMsg ? styles.dotError : null,
              ]}
            />
          );
        })}
      </View>

      {/* Error / Loading Feedback */}
      <View style={styles.statusBox}>
        {isVerifying ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#10B981" />
            <Text style={styles.loadingText}>Memverifikasi PIN...</Text>
          </View>
        ) : errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : (
          <Text style={styles.hintText}>PIN default sistem: 202615</Text>
        )}
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        <View style={styles.row}>
          {['1', '2', '3'].map((d, i) => renderKey(d, i))}
        </View>
        <View style={styles.row}>
          {['4', '5', '6'].map((d, i) => renderKey(d, i + 3))}
        </View>
        <View style={styles.row}>
          {['7', '8', '9'].map((d, i) => renderKey(d, i + 6))}
        </View>
        <View style={styles.row}>
          {/* Biometric or Empty */}
          {hasBiometrics && isBiometricsEnabled ? (
            <TouchableOpacity
              style={[styles.keyButton, styles.specialKey]}
              onPress={unlockWithBiometrics}
              activeOpacity={0.7}
            >
              <Fingerprint color="#10B981" size={28} />
            </TouchableOpacity>
          ) : (
            <View style={styles.keyPlaceholder} />
          )}

          {renderKey('0', 9)}

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.keyButton, styles.specialKey]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Delete color="#94A3B8" size={26} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  shieldBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#059669',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 6,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 24,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
    transform: [{ scale: 1.15 }],
  },
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  statusBox: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500',
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '500',
  },
  hintText: {
    color: '#475569',
    fontSize: 12,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  keyText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  specialKey: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  keyPlaceholder: {
    width: 72,
    height: 72,
  },
});
