import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Search,
  MessageCircle,
  CreditCard,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import { fetchFinanceData } from '../api/client';
import { SiswaPiutang } from '../types/finance';

export const PiutangScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [siswaList, setSiswaList] = useState<SiswaPiutang[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const res = await fetchFinanceData();
      if (res.siswa) {
        setSiswaList(res.siswa);
      }
    } catch (e) {
      console.warn('Error loading piutang:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filter students who have unpaid balances
  const piutangSiswaList = useMemo(() => {
    return siswaList
      .filter((s) => Number(s.sisa_pembayaran) > 0)
      .filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.nama.toLowerCase().includes(q) ||
          (s.nomor_wa && s.nomor_wa.includes(q)) ||
          (s.paket_nama && s.paket_nama.toLowerCase().includes(q))
        );
      });
  }, [siswaList, searchQuery]);

  const totalPiutang = useMemo(() => {
    return piutangSiswaList.reduce(
      (acc, curr) => acc + (Number(curr.sisa_pembayaran) || 0),
      0
    );
  }, [piutangSiswaList]);

  const sendWhatsAppReminder = (siswa: SiswaPiutang) => {
    if (!siswa.nomor_wa) {
      Alert.alert('Nomor Tidak Ditemukan', 'Siswa ini belum memiliki nomor WhatsApp terdaftar.');
      return;
    }

    let phone = siswa.nomor_wa.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }

    const sisaFmt = Number(siswa.sisa_pembayaran).toLocaleString('id-ID');
    const message = encodeURIComponent(
      `Halo Kak ${siswa.nama},\n\nSalam dari *Amanah Drive* 🚗\nKami menginformasikan bahwa sisa administrasi kursus mengemudi Kakak untuk paket *${siswa.paket_nama || 'Kursus'}* saat ini tercatat sebesar *Rp ${sisaFmt}*.\n\nPembayaran dapat dilakukan secara tunai di kantor atau via transfer bank. Mohon konfirmasi jika sudah melakukan pembayaran ya Kak.\n\nTerima kasih atas kerja samanya! 🙏`
    );

    const waUrl = `https://wa.me/${phone}?text=${message}`;
    Linking.openURL(waUrl).catch(() => {
      Alert.alert('Gagal', 'Tidak dapat membuka aplikasi WhatsApp.');
    });
  };

  const handlePay = (siswa: SiswaPiutang) => {
    navigation.navigate('TambahTransaksi', {
      tipe: 'pemasukan',
      siswaId: siswa.id,
      siswaNama: siswa.nama,
      nominal: siswa.sisa_pembayaran,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header Banner */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Piutang Kursus Siswa</Text>
        <Text style={styles.headerSub}>
          {piutangSiswaList.length} Siswa memiliki sisa tagihan belum lunas
        </Text>

        <View style={styles.totalBanner}>
          <Text style={styles.totalLabel}>Total Tagihan Belum Diterima</Text>
          <Text style={styles.totalValue}>
            Rp {Math.round(totalPiutang).toLocaleString('id-ID')}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama siswa atau nomor WhatsApp..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Memuat data tagihan siswa...</Text>
        </View>
      ) : (
        <FlatList
          data={piutangSiswaList}
          keyExtractor={(item: SiswaPiutang) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }: { item: SiswaPiutang }) => {
            const sisa = Number(item.sisa_pembayaran) || 0;
            const sudah = Number(item.sudah_bayar) || 0;
            const total = Number(item.total_biaya) || 0;

            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.nameCol}>
                    <Text style={styles.siswaName}>{item.nama}</Text>
                    <Text style={styles.paketName}>{item.paket_nama || 'Paket Kursus'}</Text>
                  </View>
                  <View style={styles.badgeCol}>
                    <Text style={styles.sisaTagihan}>
                      Rp {Math.round(sisa).toLocaleString('id-ID')}
                    </Text>
                    <Text style={styles.sisaLabel}>Sisa Tagihan</Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${total > 0 ? Math.min(100, Math.round((sudah / total) * 100)) : 0}%` },
                    ]}
                  />
                </View>
                <View style={styles.progressInfo}>
                  <Text style={styles.progressText}>
                    Sudah Bayar: Rp {Math.round(sudah).toLocaleString('id-ID')}
                  </Text>
                  <Text style={styles.progressText}>
                    Total: Rp {Math.round(total).toLocaleString('id-ID')}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.waBtn}
                    onPress={() => sendWhatsAppReminder(item)}
                  >
                    <MessageCircle size={16} color="#10B981" />
                    <Text style={styles.waBtnText}>Kirim WA</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={() => handlePay(item)}
                  >
                    <CreditCard size={16} color="#FFFFFF" />
                    <Text style={styles.payBtnText}>Catat Bayar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={40} color="#10B981" />
              <Text style={styles.emptyTitle}>Lunas Semua!</Text>
              <Text style={styles.emptySub}>
                Tidak ada sisa tagihan siswa yang belum dibayar.
              </Text>
            </View>
          }
        />
      )}
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
  totalBanner: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FB7185',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 8,
    color: '#F8FAFC',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  nameCol: {
    flex: 1,
    marginRight: 10,
  },
  siswaName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  paketName: {
    fontSize: 12,
    color: '#38BDF8',
    marginTop: 2,
  },
  badgeCol: {
    alignItems: 'flex-end',
  },
  sisaTagihan: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FB7185',
  },
  sisaLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  progressContainer: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#334155',
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  waBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#059669',
  },
  waBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  payBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 10,
    fontSize: 13,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
  },
});
