import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  Lock,
  RefreshCw,
  PlusCircle,
  Users,
  CreditCard,
  ChevronRight,
  Sparkles,
  X,
  CheckCircle2,
  Calendar,
} from 'lucide-react-native';
import { useAuth } from '../store/authContext';
import { fetchFinanceData } from '../api/client';
import { FinanceDataResponse, KasMetrics, KasTransaksi, PosPengeluaran } from '../types/finance';
import { MetricCard } from '../components/MetricCard';
import { TransactionItem } from '../components/TransactionItem';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { lockApp } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState<FinanceDataResponse | null>(null);
  const [showPosModal, setShowPosModal] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetchFinanceData();
      setData(res);
    } catch (e) {
      console.warn('Error loading dashboard data:', e);
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

  const metrics: KasMetrics = data?.metrics || {
    saldoAktif: 0,
    saldoTunai: 0,
    saldoBank: 0,
    pemasukanBulanIni: 0,
    pengeluaranBulanIni: 0,
    totalPiutang: 0,
    totalHutang: 0,
    totalKasbonStaff: 0,
  };

  const recentTransactions: KasTransaksi[] = (data?.transaksi || []).slice(0, 5);
  const posPengeluaranList: PosPengeluaran[] = data?.posPengeluaran || [];

  const handlePayPos = (pos: PosPengeluaran) => {
    setShowPosModal(false);
    navigation.navigate('TambahTransaksi', {
      tipe: 'pengeluaran',
      nominal: pos.nominal,
      kategori: 'operasional',
      keterangan: `Bayar Pos Pengeluaran: ${pos.nama_pos}`,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingTitle}>Amanah Finance</Text>
          <Text style={styles.greetingSub}>Pusat Kendali Keuangan Mobile</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={18} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={lockApp}>
            <Lock size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
            colors={['#10B981']}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Sinkronisasi data kas...</Text>
          </View>
        ) : (
          <>
            {/* Saldo Aktif Utama */}
            <MetricCard
              title="Total Saldo Aktif"
              amount={metrics.saldoAktif}
              subtitle="Kas Tunai Fisik + Seluruh Rekening Bank"
              icon={<Wallet size={20} color="#34D399" />}
              variant="emerald"
            />

            {/* Sub-saldo: Tunai vs Bank */}
            <View style={styles.twoColRow}>
              <View style={styles.col}>
                <MetricCard
                  title="Kas Tunai"
                  amount={metrics.saldoTunai}
                  icon={<Wallet size={16} color="#FBBF24" />}
                  variant="amber"
                />
              </View>
              <View style={styles.col}>
                <MetricCard
                  title="Saldo Bank"
                  amount={metrics.saldoBank}
                  icon={<Building2 size={16} color="#60A5FA" />}
                  variant="blue"
                />
              </View>
            </View>

            {/* Quick Actions (2x2 Grid) */}
            <View style={styles.quickActionsContainer}>
              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('TambahTransaksi')}
                >
                  <PlusCircle size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Catat Kas</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#4338CA' }]}
                  activeOpacity={0.8}
                  onPress={() => setShowPosModal(true)}
                >
                  <Sparkles size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Pos Pengeluaran</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickActionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#1E293B' }]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('Piutang')}
                >
                  <Users size={18} color="#38BDF8" />
                  <Text style={[styles.actionBtnText, { color: '#F8FAFC' }]}>Piutang Siswa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#1E293B' }]}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('Hutang')}
                >
                  <CreditCard size={18} color="#FB7185" />
                  <Text style={[styles.actionBtnText, { color: '#F8FAFC' }]}>Hutang Usaha</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Monthly In / Out */}
            <View style={styles.twoColRow}>
              <View style={styles.col}>
                <MetricCard
                  title="Pemasukan Bulan Ini"
                  amount={metrics.pemasukanBulanIni}
                  icon={<TrendingUp size={16} color="#34D399" />}
                  variant="emerald"
                />
              </View>
              <View style={styles.col}>
                <MetricCard
                  title="Pengeluaran Bulan Ini"
                  amount={metrics.pengeluaranBulanIni}
                  icon={<TrendingDown size={16} color="#FB7185" />}
                  variant="rose"
                />
              </View>
            </View>

            {/* Transaksi Terkini */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Transaksi Terkini</Text>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate('TransaksiTab')}
              >
                <Text style={styles.seeAllText}>Lihat Semua</Text>
                <ChevronRight size={14} color="#38BDF8" />
              </TouchableOpacity>
            </View>

            {recentTransactions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Belum ada riwayat transaksi</Text>
              </View>
            ) : (
              recentTransactions.map((tx) => (
                <TransactionItem key={tx.id} item={tx} />
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Modal Pos Pengeluaran Rutin */}
      <Modal
        visible={showPosModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPosModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Sparkles size={18} color="#818CF8" />
                <Text style={styles.modalTitle}>Pos Pengeluaran Rutin</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPosModal(false)} style={styles.modalCloseBtn}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Rencana alokasi belanja rutin & tagihan operasional bulan berjalan
            </Text>

            <ScrollView style={styles.modalList} contentContainerStyle={styles.modalListContent}>
              {posPengeluaranList.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <CheckCircle2 size={36} color="#10B981" />
                  <Text style={styles.modalEmptyTitle}>Semua Pos Rutin Terbayar!</Text>
                  <Text style={styles.modalEmptySub}>
                    Tidak ada pos pengeluaran operasional yang tertunda saat ini.
                  </Text>
                </View>
              ) : (
                posPengeluaranList.map((pos) => {
                  const isPaid = pos.status === 'sudah_bayar';
                  return (
                    <View key={pos.id} style={styles.posCard}>
                      <View style={styles.posCardTop}>
                        <View style={styles.posTitleCol}>
                          <Text style={styles.posName}>{pos.nama_pos}</Text>
                          {pos.jatuh_tempo ? (
                            <View style={styles.posDueRow}>
                              <Calendar size={11} color="#94A3B8" />
                              <Text style={styles.posDueText}>Jatuh Tempo: {pos.jatuh_tempo}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.posAmount}>
                          Rp {Math.round(pos.nominal || 0).toLocaleString('id-ID')}
                        </Text>
                      </View>

                      {!isPaid && (
                        <TouchableOpacity
                          style={styles.posPayBtn}
                          onPress={() => handlePayPos(pos)}
                        >
                          <Text style={styles.posPayBtnText}>Bayar Sekarang →</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseAction}
              onPress={() => setShowPosModal(false)}
            >
              <Text style={styles.modalCloseActionText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  greetingSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 14,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  quickActionsContainer: {
    gap: 8,
    marginVertical: 10,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 16,
  },
  modalList: {
    maxHeight: 280,
  },
  modalListContent: {
    gap: 8,
  },
  modalEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  modalEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalEmptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  posCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  posCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  posTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  posName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  posDueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  posDueText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  posAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  posPayBtn: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: '#6366F1',
    alignItems: 'center',
  },
  posPayBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#818CF8',
  },
  modalCloseAction: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
  },
  modalCloseActionText: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 13,
  },
});
