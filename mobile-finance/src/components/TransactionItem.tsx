import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Building2, Wallet } from 'lucide-react-native';
import { KasTransaksi } from '../types/finance';

interface TransactionItemProps {
  item: KasTransaksi;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  item,
  onPress,
  onLongPress,
}) => {
  const isIncome = item.tipe === 'pemasukan';
  const isCash = item.jenis_pembayaran === 'tunai';
  const formattedNominal = `${isIncome ? '+' : '-'} Rp ${Math.round(item.nominal || 0).toLocaleString('id-ID')}`;

  const studentName = item.siswa?.nama;
  const debtName = item.hutang?.nama_hutang;
  const staffName = item.staff?.nama;

  let partyLabel = '';
  if (studentName) partyLabel = `Siswa: ${studentName}`;
  else if (debtName) partyLabel = `Hutang: ${debtName}`;
  else if (staffName) partyLabel = `Staff: ${staffName}`;
  else if (item.pic_nama) partyLabel = item.pic_nama;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.leftCol}>
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: isIncome ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' },
          ]}
        >
          {isIncome ? (
            <ArrowDownLeft color="#10B981" size={20} />
          ) : (
            <ArrowUpRight color="#EF4444" size={20} />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.desc} numberOfLines={1}>
            {item.keterangan || item.kategori || 'Transaksi'}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.categoryBadge}>{item.kategori}</Text>
            {partyLabel ? (
              <Text style={styles.partyText} numberOfLines={1}>
                • {partyLabel}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.rightCol}>
        <Text style={[styles.amount, { color: isIncome ? '#34D399' : '#F87171' }]}>
          {formattedNominal}
        </Text>
        <View style={styles.paymentMethodRow}>
          {isCash ? (
            <Wallet size={12} color="#94A3B8" />
          ) : (
            <Building2 size={12} color="#94A3B8" />
          )}
          <Text style={styles.paymentMethodText}>
            {isCash ? 'Tunai' : 'Bank'}
          </Text>
          <Text style={styles.dateText}>{item.tanggal}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  desc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  categoryBadge: {
    fontSize: 11,
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '500',
  },
  partyText: {
    fontSize: 11,
    color: '#94A3B8',
    flexShrink: 1,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMethodText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  dateText: {
    fontSize: 10,
    color: '#64748B',
    marginLeft: 4,
  },
});
