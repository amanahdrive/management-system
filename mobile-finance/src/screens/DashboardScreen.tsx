import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
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
} from 'lucide-react-native';
import { useAuth } from '../store/authContext';
import { fetchFinanceData } from '../api/client';
import { FinanceDataResponse, KasMetrics, KasTransaksi } from '../types/finance';
import { MetricCard } from '../components/MetricCard';
import { TransactionItem } from '../components/TransactionItem';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { lockApp } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState<FinanceDataResponse | null>(null);

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

            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#059669' }]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('TambahTransaksi')}
              >
                <PlusCircle size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Catat Transaksi</Text>
              </TouchableOpacity>

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
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
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
});
