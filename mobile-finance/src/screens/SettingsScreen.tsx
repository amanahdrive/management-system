import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  CloudDownload,
  Bell,
  Fingerprint,
  Server,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Send,
  Smartphone,
} from 'lucide-react-native';
import { useAuth } from '../store/authContext';
import {
  getCurrentUpdateInfo,
  checkUpdatesManually,
  reloadApp,
  UpdateStatus,
} from '../services/updates';
import {
  sendTestPushNotification,
  registerForPushNotificationsAsync,
} from '../services/notifications';
import {
  getServerUrl,
  setServerUrl,
  getSavedPushToken,
} from '../services/storage';

export const SettingsScreen: React.FC = () => {
  const {
    lockApp,
    hasBiometrics,
    isBiometricsEnabled,
    toggleBiometrics,
  } = useAuth();

  const [updateInfo, setUpdateInfo] = useState<UpdateStatus>(getCurrentUpdateInfo());
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [sendingTestPush, setSendingTestPush] = useState<boolean>(false);
  const [serverUrlVal, setServerUrlVal] = useState<string>('');
  const [savingServer, setSavingServer] = useState<boolean>(false);

  useEffect(() => {
    async function loadSettings() {
      const url = await getServerUrl();
      setServerUrlVal(url);
      const token = await getSavedPushToken();
      setPushToken(token);
      setUpdateInfo(getCurrentUpdateInfo());
    }
    loadSettings();
  }, []);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const res = await checkUpdatesManually();
      if (res.updated) {
        Alert.alert(
          'Pembaruan Tersedia',
          'Pembaruan sistem berhasil diunduh. Muat ulang sekarang?',
          [
            { text: 'Nanti', style: 'cancel' },
            {
              text: 'Muat Ulang',
              style: 'default',
              onPress: async () => {
                await reloadApp();
              },
            },
          ]
        );
      } else {
        Alert.alert('Info Pembaruan OTA', res.message);
      }
    } catch (err: any) {
      Alert.alert('Gagal', err?.message || 'Gagal memeriksa server update');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleRegisterPush = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      setPushToken(token);
      if (token) {
        Alert.alert('Sukses', 'Perangkat berhasil terhubung ke sistem Push Notifikasi!');
      } else {
        Alert.alert('Izin Dibutuhkan', 'Pastikan izin notifikasi aktif di pengaturan Android.');
      }
    } catch (err: any) {
      Alert.alert('Gagal', err?.message || 'Gagal registrasi push token');
    }
  };

  const handleTestPush = async () => {
    setSendingTestPush(true);
    try {
      const res = await sendTestPushNotification();
      Alert.alert(res.success ? 'Berhasil Terkirim' : 'Perhatian', res.message);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Gagal mengirim push test');
    } finally {
      setSendingTestPush(false);
    }
  };

  const handleSaveServerUrl = async () => {
    if (!serverUrlVal.trim()) return;
    setSavingServer(true);
    try {
      await setServerUrl(serverUrlVal.trim());
      Alert.alert('Sukses', 'Alamat server backend berhasil diperbarui.');
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal menyimpan URL server');
    } finally {
      setSavingServer(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pengaturan & Pembaruan</Text>
        <Text style={styles.headerSub}>
          Konfigurasi OTA Updates, Background Push, & Keamanan
        </Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Section 1: EAS Over-The-Air (OTA) Updates */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <CloudDownload size={20} color="#38BDF8" />
            <Text style={styles.sectionTitle}>Pembaruan Otomatis (OTA)</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Aplikasi ini mendukung pembaruan Over-The-Air secara langsung tanpa perlu unduh/install ulang file APK baru.
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Runtime Version</Text>
            <Text style={styles.infoValue}>{updateInfo.runtimeVersion}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Update Channel</Text>
            <Text style={styles.infoValue}>{updateInfo.channel}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Update ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {updateInfo.updateId}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, checkingUpdate && styles.btnDisabled]}
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
          >
            {checkingUpdate ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <RefreshCw size={16} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Cek Pembaruan OTA Sekarang</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Section 2: Android Background Push Notifications */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Android Background Push Notification</Text>
          </View>
          <Text style={styles.sectionDesc}>
            Berjalan di background Android dengan prioritas MAX dan channel khusus agar tetap aktif saat perangkat Doze atau aplikasi ditutup.
          </Text>

          <View style={styles.channelBadgeList}>
            <View style={styles.channelBadge}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.channelText}>💰 Pemasukan Kas (MAX Priority)</Text>
            </View>
            <View style={styles.channelBadge}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.channelText}>🚨 Pengeluaran Urgent (MAX Priority)</Text>
            </View>
            <View style={styles.channelBadge}>
              <View style={[styles.dot, { backgroundColor: '#38BDF8' }]} />
              <Text style={styles.channelText}>📊 Rekap & Jatuh Tempo (HIGH)</Text>
            </View>
          </View>

          <View style={styles.pushStatusRow}>
            <Text style={styles.infoLabel}>Status Push Token:</Text>
            <Text
              style={[
                styles.pushStatusText,
                { color: pushToken ? '#34D399' : '#FBBF24' },
              ]}
            >
              {pushToken ? 'Terhubung' : 'Belum Terdaftar'}
            </Text>
          </View>

          <View style={styles.twoBtnRow}>
            <TouchableOpacity
              style={[styles.outlineBtn, { flex: 1 }]}
              onPress={handleRegisterPush}
            >
              <Smartphone size={16} color="#38BDF8" />
              <Text style={styles.outlineBtnText}>Daftarkan Token</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1 }, sendingTestPush && styles.btnDisabled]}
              onPress={handleTestPush}
              disabled={sendingTestPush}
            >
              {sendingTestPush ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Send size={15} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Tes Push Notif</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 3: Keamanan & Biometrik */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Fingerprint size={20} color="#FBBF24" />
            <Text style={styles.sectionTitle}>Keamanan & Kunci Aplikasi</Text>
          </View>

          {hasBiometrics ? (
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle}>Buka Kunci Sidik Jari</Text>
                <Text style={styles.switchSub}>
                  Gunakan sensor biometrik perangkat untuk membuka aplikasi
                </Text>
              </View>
              <Switch
                value={isBiometricsEnabled}
                onValueChange={toggleBiometrics}
                thumbColor={isBiometricsEnabled ? '#10B981' : '#64748B'}
                trackColor={{ false: '#334155', true: 'rgba(16, 185, 129, 0.4)' }}
              />
            </View>
          ) : null}

          <TouchableOpacity style={styles.lockBtn} onPress={lockApp}>
            <Lock size={16} color="#EF4444" />
            <Text style={styles.lockBtnText}>Kunci Aplikasi Sekarang</Text>
          </TouchableOpacity>
        </View>

        {/* Section 4: Koneksi Server Backend */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Server size={20} color="#94A3B8" />
            <Text style={styles.sectionTitle}>Koneksi Backend API</Text>
          </View>

          <Text style={styles.inputLabel}>URL Endpoint Server</Text>
          <TextInput
            style={styles.serverInput}
            value={serverUrlVal}
            onChangeText={setServerUrlVal}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.saveServerBtn, savingServer && styles.btnDisabled]}
            onPress={handleSaveServerUrl}
            disabled={savingServer}
          >
            {savingServer ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveServerBtnText}>Simpan Alamat Server</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  sectionDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  infoLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
    maxWidth: '55%',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  channelBadgeList: {
    gap: 6,
    marginBottom: 14,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  channelText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  pushStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pushStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  twoBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: '#0284C7',
  },
  outlineBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  switchTextCol: {
    flex: 1,
    marginRight: 10,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  switchSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  lockBtnText: {
    color: '#F87171',
    fontWeight: '600',
    fontSize: 13,
  },
  inputLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 6,
  },
  serverInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
    marginBottom: 10,
  },
  saveServerBtn: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveServerBtnText: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
