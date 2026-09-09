import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {
  Search,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Trash2,
} from 'lucide-react-native';
import { fetchFinanceData, deleteTransaksi } from '../api/client';
import { KasTransaksi } from '../types/finance';
import { TransactionItem } from '../components/TransactionItem';

export const TransaksiScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [transaksiList, setTransaksiList] = useState<KasTransaksi[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'semua' | 'pemasukan' | 'pengeluaran' | 'kasbon'>('semua');

  const loadData = useCallback(async () => {
    try {
      const res = await fetchFinanceData();
      if (res.transaksi) {
        setTransaksiList(res.transaksi);
      }
    } catch (e) {
      console.warn('Error loading transactions:', e);
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

  const handleDelete = (item: KasTransaksi) => {
    Alert.alert(
      'Hapus Transaksi',
      `Yakin ingin menghapus transaksi "${item.keterangan || item.kategori}" sebesar Rp ${Math.round(item.nominal).toLocaleString('id-ID')}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteTransaksi(item.id);
              if (res.success) {
                setTransaksiList((prev) => prev.filter((tx) => tx.id !== item.id));
              } else {
                Alert.alert('Gagal', res.error || 'Gagal menghapus transaksi');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Terjadi kesalahan sistem');
            }
          },
        },
      ]
    );
  };

  const filteredTransactions = useMemo(() => {
    return transaksiList.filter((tx) => {
      // Type Filter
      if (activeFilter === 'pemasukan' && tx.tipe !== 'pemasukan') return false;
      if (activeFilter === 'pengeluaran' && tx.tipe !== 'pengeluaran') return false;
      if (activeFilter === 'kasbon' && tx.kategori !== 'kasbon') return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const ket = (tx.keterangan || '').toLowerCase();
        const kat = (tx.kategori || '').toLowerCase();
        const siswa = (tx.siswa?.nama || '').toLowerCase();
        const pic = (tx.pic_nama || '').toLowerCase();
        return ket.includes(query) || kat.includes(query) || siswa.includes(query) || pic.includes(query);
      }

      return true;
    });
  }, [transaksiList, activeFilter, searchQuery]);

  const summary = useMemo(() => {
    let inTotal = 0;
    let outTotal = 0;
    filteredTransactions.forEach((tx) => {
      const nom = Number(tx.nominal) || 0;
      if (tx.tipe === 'pemasukan') inTotal += nom;
      else outTotal += nom;
    });
    return {
      inTotal,
      outTotal,
      net: inTotal - outTotal,
    };
  }, [filteredTransactions]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Riwayat Transaksi</Text>
        <Text style={styles.headerCount}>{filteredTransactions.length} Transaksi Tercatat</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari transaksi, siswa, kategori..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {[
          { key: 'semua', label: 'Semua' },
          { key: 'pemasukan', label: 'Pemasukan' },
          { key: 'pengeluaran', label: 'Pengeluaran' },
          { key: 'kasbon', label: 'Kasbon' },
        ].map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.key as any)}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Summary Strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Masuk</Text>
          <Text style={[styles.summaryValue, { color: '#34D399' }]}>
            Rp {Math.round(summary.inTotal).toLocaleString('id-ID')}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Keluar</Text>
          <Text style={[styles.summaryValue, { color: '#FB7185' }]}>
            Rp {Math.round(summary.outTotal).toLocaleString('id-ID')}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Selisih</Text>
          <Text style={[styles.summaryValue, { color: summary.net >= 0 ? '#38BDF8' : '#FBBF24' }]}>
            Rp {Math.round(summary.net).toLocaleString('id-ID')}
          </Text>
        </View>
      </View>

      {/* Transactions List */}
      {loading && !refreshing ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Memuat transaksi...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item: KasTransaksi) => item.id}
          renderItem={({ item }: { item: KasTransaksi }) => (
            <TransactionItem
              item={item}
              onLongPress={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Tidak ada transaksi</Text>
              <Text style={styles.emptySub}>
                {searchQuery ? 'Coba ubah kata kunci pencarian' : 'Tekan tombol + untuk menambah'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB: Catat Transaksi */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('TambahTransaksi')}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  headerCount: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
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
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 6,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterTabActive: {
    backgroundColor: '#059669',
    borderColor: '#10B981',
  },
  filterTabText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
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
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
