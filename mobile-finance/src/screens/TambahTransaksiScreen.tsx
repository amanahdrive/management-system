import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Wallet,
  Building2,
} from 'lucide-react-native';
import { fetchFinanceData, submitTransaksi } from '../api/client';
import { Rekening } from '../types/finance';

const KATEGORI_PEMASUKAN = [
  'Biaya Pendaftaran / Kursus Siswa',
  'Pelunasan Kursus Mengemudi',
  'Titipan Pembuatan SIM',
  'Pendapatan Jasa Lainnya',
  'Penerimaan Setor Tunai',
];

const KATEGORI_PENGELUARAN = [
  'BBM Armada Kendaraan',
  'Honor & Uang Makan Instruktur',
  'Service & Perawatan Kendaraan',
  'Cicilan Hutang Usaha',
  'Kasbon Karyawan / Staff',
  'Operasional Kantor & Listrik',
  'Pengeluaran Kas Rutin',
  'Pengeluaran Lain-lain',
];

export const TambahTransaksiScreen: React.FC<{ navigation: any; route?: any }> = ({
  navigation,
  route,
}) => {
  const initialTipe = route?.params?.tipe || 'pemasukan';
  const initialSiswaId = route?.params?.siswaId || null;
  const initialSiswaNama = route?.params?.siswaNama || '';
  const initialNominal = route?.params?.nominal ? String(route.params.nominal) : '';

  const [tipe, setTipe] = useState<'pemasukan' | 'pengeluaran'>(initialTipe);
  const [nominal, setNominal] = useState<string>(initialNominal);
  const [kategori, setKategori] = useState<string>(
    initialTipe === 'pemasukan' ? KATEGORI_PEMASUKAN[0] : KATEGORI_PENGELUARAN[0]
  );
  const [jenisPembayaran, setJenisPembayaran] = useState<'tunai' | 'non_tunai'>('tunai');
  const [rekeningId, setRekeningId] = useState<string>('');
  const [rekeningList, setRekeningList] = useState<Rekening[]>([]);
  const [keterangan, setKeterangan] = useState<string>(
    initialSiswaNama ? `Pembayaran Kursus - ${initialSiswaNama}` : ''
  );
  const [picNama, setPicNama] = useState<string>('Staff Finance');
  const [tanggal, setTanggal] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    async function loadRekening() {
      try {
        const res = await fetchFinanceData();
        if (res.rekening && res.rekening.length > 0) {
          setRekeningList(res.rekening);
          setRekeningId(res.rekening[0].id);
        }
      } catch (e) {
        console.warn('Could not load bank list', e);
      }
    }
    loadRekening();
  }, []);

  const handleTipeChange = (newTipe: 'pemasukan' | 'pengeluaran') => {
    setTipe(newTipe);
    setKategori(
      newTipe === 'pemasukan' ? KATEGORI_PEMASUKAN[0] : KATEGORI_PENGELUARAN[0]
    );
  };

  const pickImage = async (fromCamera: boolean) => {
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin Dibutuhkan', 'Mohon izinkan akses kamera untuk memotret bukti.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
          allowsEditing: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin Dibutuhkan', 'Mohon izinkan akses galeri untuk memilih foto.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.7,
          allowsEditing: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  };

  const handleSubmit = async () => {
    const rawNominal = parseInt(nominal.replace(/\D/g, ''), 10);
    if (!rawNominal || rawNominal <= 0) {
      Alert.alert('Validasi Gagal', 'Silakan masukkan nominal transaksi yang valid.');
      return;
    }

    if (!keterangan.trim()) {
      Alert.alert('Validasi Gagal', 'Silakan isi keterangan atau rincian transaksi.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        tipe,
        nominal: rawNominal,
        kategori,
        jenis_pembayaran: jenisPembayaran,
        rekening_id: jenisPembayaran === 'non_tunai' ? rekeningId : null,
        keterangan: keterangan.trim(),
        pic_nama: picNama.trim() || 'Staff Finance',
        tanggal,
        siswa_id: initialSiswaId,
      };

      const res = await submitTransaksi(payload);
      if (res.success) {
        Alert.alert('Berhasil', 'Transaksi berhasil disimpan dan disinkronkan ke server!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Gagal', res.error || 'Gagal menyimpan transaksi');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const activeCategories = tipe === 'pemasukan' ? KATEGORI_PEMASUKAN : KATEGORI_PENGELUARAN;
  const numValue = parseInt(nominal.replace(/\D/g, '') || '0', 10);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Catat Transaksi Kas</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <X size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Type Toggle: Pemasukan vs Pengeluaran */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, tipe === 'pemasukan' && styles.typeBtnIncome]}
            onPress={() => handleTipeChange('pemasukan')}
          >
            <ArrowDownLeft
              size={18}
              color={tipe === 'pemasukan' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[
                styles.typeBtnText,
                tipe === 'pemasukan' && styles.typeBtnTextActive,
              ]}
            >
              Pemasukan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeBtn, tipe === 'pengeluaran' && styles.typeBtnExpense]}
            onPress={() => handleTipeChange('pengeluaran')}
          >
            <ArrowUpRight
              size={18}
              color={tipe === 'pengeluaran' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[
                styles.typeBtnText,
                tipe === 'pengeluaran' && styles.typeBtnTextActive,
              ]}
            >
              Pengeluaran
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nominal Field */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nominal Transaksi (Rp)</Text>
          <View style={styles.nominalInputWrapper}>
            <Text style={styles.rpPrefix}>Rp</Text>
            <TextInput
              style={styles.nominalInput}
              placeholder="0"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              value={nominal}
              onChangeText={setNominal}
            />
          </View>
          {numValue > 0 ? (
            <Text style={styles.formattedPreview}>
              Terbilang: Rp {numValue.toLocaleString('id-ID')}
            </Text>
          ) : null}
        </View>

        {/* Category Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.categoryChips}>
            {activeCategories.map((kat) => {
              const isSelected = kategori === kat;
              return (
                <TouchableOpacity
                  key={kat}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setKategori(kat)}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {kat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Payment Method Toggle */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Metode Pembayaran</Text>
          <View style={styles.methodToggleRow}>
            <TouchableOpacity
              style={[
                styles.methodBtn,
                jenisPembayaran === 'tunai' && styles.methodBtnActive,
              ]}
              onPress={() => setJenisPembayaran('tunai')}
            >
              <Wallet
                size={18}
                color={jenisPembayaran === 'tunai' ? '#10B981' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.methodText,
                  jenisPembayaran === 'tunai' && styles.methodTextActive,
                ]}
              >
                Kas Tunai Fisik
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodBtn,
                jenisPembayaran === 'non_tunai' && styles.methodBtnActive,
              ]}
              onPress={() => setJenisPembayaran('non_tunai')}
            >
              <Building2
                size={18}
                color={jenisPembayaran === 'non_tunai' ? '#38BDF8' : '#94A3B8'}
              />
              <Text
                style={[
                  styles.methodText,
                  jenisPembayaran === 'non_tunai' && styles.methodTextActive,
                ]}
              >
                Transfer Bank
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bank Selection (if transfer) */}
        {jenisPembayaran === 'non_tunai' && rekeningList.length > 0 ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Pilih Rekening Bank Tujuan/Sumber</Text>
            <View style={styles.categoryChips}>
              {rekeningList.map((rek) => {
                const isSelected = rekeningId === rek.id;
                return (
                  <TouchableOpacity
                    key={rek.id}
                    style={[styles.bankChip, isSelected && styles.bankChipActive]}
                    onPress={() => setRekeningId(rek.id)}
                  >
                    <Text style={[styles.bankChipName, isSelected && styles.bankChipNameActive]}>
                      {rek.nama_bank} - {rek.nomor_rekening}
                    </Text>
                    <Text style={styles.bankChipHolder}>a.n {rek.atas_nama}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Tanggal & PIC */}
        <View style={styles.twoColRow}>
          <View style={styles.col}>
            <Text style={styles.label}>Tanggal (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              value={tanggal}
              onChangeText={setTanggal}
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>PIC / Pencatat</Text>
            <TextInput
              style={styles.textInput}
              value={picNama}
              onChangeText={setPicNama}
            />
          </View>
        </View>

        {/* Keterangan */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Keterangan / Rincian</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            multiline
            numberOfLines={3}
            placeholder="Contoh: Pembayaran DP Kursus Paket B - Siswa Budi"
            placeholderTextColor="#475569"
            value={keterangan}
            onChangeText={setKeterangan}
          />
        </View>

        {/* Bukti Transaksi Photo */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Lampiran Bukti Foto (Opsional)</Text>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImageUri(null)}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => pickImage(true)}
              >
                <Camera size={18} color="#38BDF8" />
                <Text style={styles.photoBtnText}>Kamera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => pickImage(false)}
              >
                <ImageIcon size={18} color="#38BDF8" />
                <Text style={styles.photoBtnText}>Galeri</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          activeOpacity={0.8}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle2 size={20} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Simpan Transaksi</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  typeBtnIncome: {
    backgroundColor: '#059669',
  },
  typeBtnExpense: {
    backgroundColor: '#E11D48',
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 8,
  },
  nominalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
  },
  rpPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    marginRight: 6,
  },
  nominalInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    paddingVertical: 12,
  },
  formattedPreview: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: '#0369A1',
    borderColor: '#38BDF8',
  },
  chipText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  methodToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  methodBtnActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  methodText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  methodTextActive: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  bankChip: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  bankChipActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  bankChipName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  bankChipNameActive: {
    color: '#38BDF8',
  },
  bankChipHolder: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  col: {
    flex: 1,
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  photoBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
