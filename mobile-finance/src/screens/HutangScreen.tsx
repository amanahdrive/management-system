import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { CreditCard, Calendar, CheckCircle2, X } from 'lucide-react-native';
import { fetchFinanceData, submitTransaksi } from '../api/client';
import { Hutang } from '../types/finance';

export const HutangScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hutangList, setHutangList] = useState<Hutang[]>([]);
  const [selectedHutang, setSelectedHutang] = useState<Hutang | null>(null);
  const [bayarNominal, setBayarNominal] = useState<string>('');
  const [bayarModalVisible, setBayarModalVisible] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetchFinanceData();
      if (res.hutang) {
        setHutangList(res.hutang);
      }
    } catch (e) {
      console.warn('Error loading hutang:', e);
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

  const totalHutang = useMemo(() => {
    return hutangList.reduce((acc, curr) => acc + (Number(curr.sisa_hutang) || 0), 0);
  }, [hutangList]);

  const openBayarModal = (item: Hutang) => {
    setSelectedHutang(item);
    setBayarNominal(String(item.sisa_hutang || ''));
    setBayarModalVisible(true);
  };

  const handlePayInstallment = async () => {
    if (!selectedHutang) return;

    const rawNominal = parseInt(bayarNominal.replace(/\D/g, ''), 10);
    if (!rawNominal || rawNominal <= 0) {
      Alert.alert('Validasi', 'Masukkan nominal cicilan yang valid');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitTransaksi({
        tipe: 'pengeluaran',
        kategori: 'Cicilan Hutang Usaha',
        nominal: rawNominal,
        jenis_pembayaran: 'non_tunai',
        keterangan: `Bayar Cicilan Hutang: ${selectedHutang.nama_hutang}`,
        hutang_id: selectedHutang.id,
        tanggal: new Date().toISOString().split('T')[0],
        pic_nama: 'Finance Admin',
      });

      if (res.success) {
        Alert.alert('Berhasil', 'Pembayaran cicilan berhasil dicatat');
        setBayarModalVisible(false);
        loadData();
      } else {
        Alert.alert('Gagal', res.error || 'Gagal mencatat cicilan');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Terjadi kesalahan sistem');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hutang Usaha</Text>
        <Text style={styles.headerSub}>
          Pengawasan kewajiban & cicilan jatuh tempo perusahaan
        </Text>

        <View style={styles.totalBanner}>
          <Text style={styles.totalLabel}>Total Sisa Kewajiban Hutang</Text>
          <Text style={styles.totalValue}>
            Rp {Math.round(totalHutang).toLocaleString('id-ID')}
          </Text>
        </View>
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Memuat data hutang...</Text>
        </View>
      ) : (
        <FlatList
          data={hutangList}
          keyExtractor={(item: Hutang) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }: { item: Hutang }) => {
            const isLunas = item.status === 'lunas' || Number(item.sisa_hutang) <= 0;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.titleCol}>
                    <Text style={styles.hutangName}>{item.nama_hutang}</Text>
                    {item.pemberi_pinjaman ? (
                      <Text style={styles.lenderText}>Kreditur: {item.pemberi_pinjaman}</Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: isLunas ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: isLunas ? '#34D399' : '#F87171' },
                      ]}
                    >
                      {isLunas ? 'LUNAS' : 'BERJALAN'}
                    </Text>
                  </View>
                </View>

                <View style={styles.amountRow}>
                  <View>
                    <Text style={styles.amountLabel}>Sisa Hutang</Text>
                    <Text style={styles.sisaAmount}>
                      Rp {Math.round(item.sisa_hutang || 0).toLocaleString('id-ID')}
                    </Text>
                  </View>
                  <View style={styles.rightAmount}>
                    <Text style={styles.amountLabel}>Total Pinjaman</Text>
                    <Text style={styles.totalAmount}>
                      Rp {Math.round(item.total_hutang || 0).toLocaleString('id-ID')}
                    </Text>
                  </View>
                </View>

                {item.jatuh_tempo ? (
                  <View style={styles.dueRow}>
                    <Calendar size={13} color="#94A3B8" />
                    <Text style={styles.dueText}>Jatuh Tempo: {item.jatuh_tempo}</Text>
                  </View>
                ) : null}

                {!isLunas ? (
                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={() => openBayarModal(item)}
                  >
                    <CreditCard size={16} color="#FFFFFF" />
                    <Text style={styles.payBtnText}>Bayar Cicilan</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CheckCircle2 size={40} color="#10B981" />
              <Text style={styles.emptyTitle}>Bebas Hutang!</Text>
              <Text style={styles.emptySub}>Tidak ada kewajiban hutang terdaftar.</Text>
            </View>
          }
        />
      )}

      {/* Modal Bayar Cicilan */}
      <Modal
        visible={bayarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBayarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bayar Cicilan Hutang</Text>
              <TouchableOpacity onPress={() => setBayarModalVisible(false)}>
                <X size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>{selectedHutang?.nama_hutang}</Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>Nominal Pembayaran (Rp)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={bayarNominal}
                onChangeText={setBayarNominal}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setBayarModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, submitting && styles.confirmBtnDisabled]}
                onPress={handlePayInstallment}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBtnText}>Konfirmasi Bayar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    color: '#F87171',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    marginBottom: 12,
  },
  titleCol: {
    flex: 1,
    marginRight: 10,
  },
  hutangName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  lenderText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  sisaAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FB7185',
    marginTop: 2,
  },
  rightAmount: {
    alignItems: 'flex-end',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
  },
  dueText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#059669',
    marginTop: 6,
  },
  payBtnText: {
    fontSize: 13,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalSub: {
    fontSize: 13,
    color: '#38BDF8',
    marginTop: 4,
    marginBottom: 16,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 13,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
