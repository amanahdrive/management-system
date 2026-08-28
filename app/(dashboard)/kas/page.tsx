'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatRupiah } from '@/lib/utils/currency';
import {
  getKasOverviewMetrics,
  getKasTransaksiList,
  addKasTransaksi,
  setorTunaiKas,
  getKasKategoriList,
  deleteKasTransaksi,
  updateKasTransaksi,
  getDpKustomList,
  getHutangList,
  DpKustomItem,
} from '@/lib/actions/kas';
import { getSiswaList } from '@/lib/actions/siswa';
import { getPaketList } from '@/lib/actions/master-data';
import { getRekeningList } from '@/lib/actions/rekening';
import {
  DEFAULT_KAS_KATEGORI,
  DEFAULT_REKENING_LIST,
  DEFAULT_METRICS,
  LABEL_REKENING_DEFAULT,
  calculateLocalKasMetrics,
  formatKategoriLabel,
} from '@/lib/constants/finance';
import { getTodayDateString, formatDateIndo } from '@/lib/utils/date';
import { Siswa, Paket, RekeningBank, KasTransaksi } from '@/types/database';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  FileText,
  Trash2,
  Pencil,
  X,
  User,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  CreditCard,
  Landmark,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

export default function KasOverviewPage() {
  const [metrics, setMetrics] = React.useState(DEFAULT_METRICS);
  const [transaksiList, setTransaksiList] = React.useState<any[]>([]);
  const [kategoriList, setKategoriList] = React.useState<any[]>(DEFAULT_KAS_KATEGORI);
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [dpKustomList, setDpKustomList] = React.useState<DpKustomItem[]>([]);
  const [rekeningList, setRekeningList] = React.useState<RekeningBank[]>(DEFAULT_REKENING_LIST);
  const [selectedRekeningId, setSelectedRekeningId] = React.useState<string>(DEFAULT_REKENING_LIST[0].id);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Edit modal state
  const [editingTx, setEditingTx] = React.useState<KasTransaksi | null>(null);
  const [editForm, setEditForm] = React.useState<Partial<KasTransaksi>>({});
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Setor Tunai Modal State
  const [isSetorTunaiOpen, setIsSetorTunaiOpen] = React.useState(false);
  const [setorNominal, setSetorNominal] = React.useState(0);
  const [setorRekeningId, setSetorRekeningId] = React.useState('');
  const [setorTanggal, setSetorTanggal] = React.useState(getTodayDateString());
  const [setorPicNama, setSetorPicNama] = React.useState('Admin Staff');
  const [setorKeterangan, setSetorKeterangan] = React.useState('');
  const [isSubmittingSetor, setIsSubmittingSetor] = React.useState(false);

  // Form State
  const [formData, setFormData] = React.useState({
    tanggal: getTodayDateString(),
    tipe: 'pengeluaran' as 'pemasukan' | 'pengeluaran',
    kategori: 'operasional',
    keterangan: '',
    nominal: 0,
    jenis_pembayaran: 'tunai' as 'tunai' | 'non_tunai',
    pic_tipe: 'admin' as 'admin' | 'finance',
    pic_nama: '',
    siswa_id: '',
  });

  // DP Kustom
  const [customNama, setCustomNama] = React.useState('');
  const [customPaketId, setCustomPaketId] = React.useState('');
  const [customHargaPaket, setCustomHargaPaket] = React.useState(0);
  const [customDpNominal, setCustomDpNominal] = React.useState(0);

  // Inisialisasi cache lokal
  React.useEffect(() => {
    try {
      const cachedStr = localStorage.getItem('amanah_kas_web_cache_v2');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached && typeof cached === 'object') {
          if (cached.metrics) setMetrics(cached.metrics);
          if (Array.isArray(cached.transaksi) && cached.transaksi.length > 0) setTransaksiList(cached.transaksi);
          if (Array.isArray(cached.kategori) && cached.kategori.length > 0) setKategoriList(cached.kategori);
          if (Array.isArray(cached.siswa)) setSiswaList(cached.siswa);
          if (Array.isArray(cached.paket)) setPaketList(cached.paket);
          if (Array.isArray(cached.dpKustom)) setDpKustomList(cached.dpKustom);
          if (Array.isArray(cached.rekening) && cached.rekening.length > 0) setRekeningList(cached.rekening);
        }
      }
    } catch (e) {
      console.warn('Could not read kas cache:', e);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let dataLoaded = false;

      // Primary: Single Consolidated API Endpoint
      try {
        const res = await fetch('/api/finance/data', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            const tx = Array.isArray(json.transaksi) ? json.transaksi : [];
            const sis = Array.isArray(json.siswa) ? json.siswa : [];
            const hut = Array.isArray(json.hutang) ? json.hutang : [];
            const kat =
              Array.isArray(json.kategori) && json.kategori.length > 0
                ? json.kategori
                : DEFAULT_KAS_KATEGORI;
            const rek =
              Array.isArray(json.rekening) && json.rekening.length > 0
                ? json.rekening
                : DEFAULT_REKENING_LIST;

            const localMetrics = calculateLocalKasMetrics(tx, sis, hut);

            setTransaksiList(tx);
            setKategoriList(kat);
            setSiswaList(sis);
            setPaketList(json.paket || []);
            setDpKustomList(json.dpKustom || []);
            setRekeningList(rek);
            setMetrics(localMetrics);

            const defRek =
              rek.find((r: RekeningBank) => r.aktif && r.is_utama) ||
              rek.find((r: RekeningBank) => r.aktif);
            if (defRek) setSelectedRekeningId(defRek.id);

            localStorage.setItem(
              'amanah_kas_web_cache_v2',
              JSON.stringify({
                metrics: localMetrics,
                transaksi: tx,
                kategori: kat,
                siswa: sis,
                paket: json.paket || [],
                rekening: rek,
                dpKustom: json.dpKustom || [],
                updatedAt: Date.now(),
              })
            );
            dataLoaded = true;
          }
        }
      } catch (apiErr) {
        console.warn('API route unavailable, using Server Actions fallback:', apiErr);
      }

      // Secondary Fallback: Server Actions (Promise.allSettled)
      if (!dataLoaded) {
        const [mRes, tRes, kRes, sRes, pRes, dpKRes, rList, hList] = await Promise.allSettled([
          getKasOverviewMetrics(),
          getKasTransaksiList(),
          getKasKategoriList(),
          getSiswaList(),
          getPaketList(),
          getDpKustomList(),
          getRekeningList(),
          getHutangList(),
        ]);

        const tx = tRes.status === 'fulfilled' && Array.isArray(tRes.value) ? tRes.value : [];
        const sis = sRes.status === 'fulfilled' && Array.isArray(sRes.value) ? sRes.value : [];
        const hut = hList.status === 'fulfilled' && Array.isArray(hList.value) ? hList.value : [];
        const pak = pRes.status === 'fulfilled' && Array.isArray(pRes.value) ? pRes.value : [];
        const dpk = dpKRes.status === 'fulfilled' && Array.isArray(dpKRes.value) ? dpKRes.value : [];
        const kat =
          kRes.status === 'fulfilled' && Array.isArray(kRes.value) && kRes.value.length > 0
            ? kRes.value
            : DEFAULT_KAS_KATEGORI;
        const rek =
          rList.status === 'fulfilled' && Array.isArray(rList.value) && rList.value.length > 0
            ? rList.value
            : DEFAULT_REKENING_LIST;

        const localMetrics = calculateLocalKasMetrics(tx, sis, hut);

        setTransaksiList(tx);
        setKategoriList(kat);
        setSiswaList(sis);
        setPaketList(pak);
        setDpKustomList(dpk);
        setRekeningList(rek);
        setMetrics(localMetrics);

        const defRek =
          rek.find((r: RekeningBank) => r.aktif && r.is_utama) ||
          rek.find((r: RekeningBank) => r.aktif);
        if (defRek) setSelectedRekeningId(defRek.id);

        localStorage.setItem(
          'amanah_kas_web_cache_v2',
          JSON.stringify({
            metrics: localMetrics,
            transaksi: tx,
            kategori: kat,
            siswa: sis,
            paket: pak,
            rekening: rek,
            dpKustom: dpk,
            updatedAt: Date.now(),
          })
        );
      }
    } catch (err) {
      console.error('Error loading kas data:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    await deleteKasTransaksi(deletingId);
    setDeletingId(null);
    loadData();
  };

  const handleOpenEdit = (tx: any) => {
    setEditingTx(tx);
    setEditForm({
      tanggal: tx.tanggal,
      tipe: tx.tipe,
      kategori: tx.kategori,
      keterangan: tx.keterangan,
      nominal: tx.nominal,
      jenis_pembayaran: tx.jenis_pembayaran || 'tunai',
      rekening_id: tx.rekening_id || '',
      pic_nama: tx.pic_nama,
      pic_tipe: tx.pic_tipe,
      siswa_id: tx.siswa_id || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setSavingEdit(true);
    const res = await updateKasTransaksi(editingTx.id, editForm);
    setSavingEdit(false);
    if (res.success) {
      setEditingTx(null);
      loadData();
    } else {
      alert('Gagal menyimpan perubahan: ' + res.error);
    }
  };

  const handleOpenSetorTunai = () => {
    const defaultRek =
      rekeningList.find((r) => r.aktif && r.is_utama)?.id ||
      rekeningList.find((r) => r.aktif)?.id ||
      '';
    setSetorNominal(metrics.saldoTunai > 0 ? metrics.saldoTunai : 0);
    setSetorRekeningId(defaultRek);
    setSetorTanggal(getTodayDateString());
    setSetorPicNama('Admin Staff');
    setSetorKeterangan('');
    setIsSetorTunaiOpen(true);
  };

  const handleSaveSetorTunai = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setorNominal <= 0) {
      alert('Nominal setor tunai harus lebih besar dari Rp 0');
      return;
    }
    if (setorNominal > metrics.saldoTunai) {
      alert(
        `Nominal setor tunai (Rp ${setorNominal.toLocaleString(
          'id-ID'
        )}) melebihi saldo kas fisik tunai saat ini (Rp ${metrics.saldoTunai.toLocaleString('id-ID')})`
      );
      return;
    }
    if (!setorRekeningId) {
      alert('Silakan pilih rekening bank tujuan setor');
      return;
    }

    setIsSubmittingSetor(true);
    const res = await setorTunaiKas({
      nominal: setorNominal,
      rekening_id: setorRekeningId,
      tanggal: setorTanggal,
      pic_nama: setorPicNama,
      keterangan: setorKeterangan,
    });
    setIsSubmittingSetor(false);

    if (res.success) {
      setIsSetorTunaiOpen(false);
      loadData();
    } else {
      alert('Gagal memproses setor tunai: ' + res.error);
    }
  };

  const handleTipeChange = (newTipe: 'pemasukan' | 'pengeluaran') => {
    const defaultKategori = newTipe === 'pemasukan' ? 'dp_siswa' : 'operasional';
    setFormData((prev) => ({
      ...prev,
      tipe: newTipe,
      kategori: defaultKategori,
      siswa_id: '',
      keterangan: '',
      nominal: 0,
    }));
    setCustomNama('');
    setCustomPaketId('');
    setCustomHargaPaket(0);
    setCustomDpNominal(0);
  };

  const handleKategoriChange = (newKategori: string) => {
    setFormData((prev) => ({
      ...prev,
      kategori: newKategori,
      siswa_id: '',
      keterangan: '',
      nominal: 0,
    }));
    setCustomNama('');
    setCustomPaketId('');
    setCustomHargaPaket(0);
    setCustomDpNominal(0);
  };

  const handleCustomPaketChange = (paketId: string) => {
    const p = paketList.find((item) => item.id === paketId);
    const price = p ? (p.harga_promo || p.harga_normal) : 2000000;
    const suggestedDp = Math.round(price * 0.5);
    setCustomPaketId(paketId);
    setCustomHargaPaket(price);
    setCustomDpNominal(suggestedDp);
    setFormData((prev) => ({
      ...prev,
      nominal: suggestedDp,
      keterangan: `DP Kustom - ${customNama || 'Customer'} | Paket: ${p?.nama_paket || 'Paket Kursus'} | Total: ${formatRupiah(price)}`,
    }));
  };

  const handleCustomHargaPaketChange = (newHarga: number) => {
    setCustomHargaPaket(newHarga);
    const p = paketList.find((item) => item.id === customPaketId) || paketList[0];
    setFormData((prev) => ({
      ...prev,
      keterangan: `DP Kustom - ${customNama || 'Customer'} | Paket: ${p?.nama_paket || 'Paket Kursus'} | Total: ${formatRupiah(newHarga)}`,
    }));
  };

  const handleCustomNamaChange = (nama: string) => {
    setCustomNama(nama);
    const p = paketList.find((item) => item.id === customPaketId) || paketList[0];
    const price = customHargaPaket || (p ? (p.harga_promo || p.harga_normal) : 2000000);
    setFormData((prev) => ({
      ...prev,
      keterangan: `DP Kustom - ${nama || 'Customer'} | Paket: ${p?.nama_paket || 'Paket Kursus'} | Total: ${formatRupiah(price)}`,
    }));
  };

  const handleCustomDpNominalChange = (nominal: number) => {
    setCustomDpNominal(nominal);
    setFormData((prev) => ({
      ...prev,
      nominal,
    }));
  };

  const handleSiswaChange = (siswaId: string) => {
    // 1. Kasus DP Kustom (Input DP tanpa data siswa)
    if (siswaId === 'custom_dp') {
      const defaultPaket = paketList[0];
      const defaultPrice = defaultPaket ? (defaultPaket.harga_promo || defaultPaket.harga_normal) : 2000000;
      const defaultDp = Math.round(defaultPrice * 0.5);

      setCustomPaketId(defaultPaket?.id || '');
      setCustomHargaPaket(defaultPrice);
      setCustomDpNominal(defaultDp);

      setFormData((prev) => ({
        ...prev,
        siswa_id: 'custom_dp',
        keterangan: `DP Kustom - ${customNama || 'Customer'} | Paket: ${defaultPaket?.nama_paket || 'Paket Kursus'} | Total: ${formatRupiah(defaultPrice)}`,
        nominal: defaultDp,
      }));
      return;
    }

    // 2. Kasus Pelunasan DP Kustom (Memilih DP Kustom yang belum lunas)
    if (siswaId.startsWith('dp_kustom_')) {
      const dpId = siswaId.replace('dp_kustom_', '');
      const dpItem = dpKustomList.find((item) => item.id === dpId);
      if (dpItem) {
        setFormData((prev) => ({
          ...prev,
          siswa_id: siswaId,
          keterangan: `Pelunasan DP Kustom - ${dpItem.nama} | Paket: ${dpItem.namaPaket} | Sisa: ${formatRupiah(dpItem.sisaTagihan)} [Ref: ${dpItem.id}]`,
          nominal: dpItem.sisaTagihan,
        }));
      }
      return;
    }

    // 3. Kasus Siswa Terdaftar Reguler
    const s = siswaList.find((item) => item.id === siswaId);
    if (!s) {
      setFormData((prev) => ({ ...prev, siswa_id: '', keterangan: '', nominal: 0 }));
      return;
    }

    if (formData.kategori === 'dp_siswa') {
      const suggestedDp = Math.round(s.harga_final * 0.5);
      setFormData((prev) => ({
        ...prev,
        siswa_id: siswaId,
        keterangan: `Pembayaran DP Kursus - ${s.nama} (${s.kode_siswa})`,
        nominal: suggestedDp,
      }));
    } else if (formData.kategori === 'pelunasan_siswa') {
      const sisaTagihan = Math.max(0, s.harga_final - (s.dp_nominal || 0));
      setFormData((prev) => ({
        ...prev,
        siswa_id: siswaId,
        keterangan: `Pelunasan Kursus - ${s.nama} (${s.kode_siswa})`,
        nominal: sisaTagihan,
      }));
    } else if (formData.kategori === 'refund_siswa') {
      const totalBayar = s.status_pembayaran_kode === 'lunas' ? s.harga_final : (s.dp_nominal || 0);
      setFormData((prev) => ({
        ...prev,
        siswa_id: siswaId,
        keterangan: `Refund Pembatalan Kursus - ${s.nama} (${s.kode_siswa})`,
        nominal: totalBayar,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        siswa_id: siswaId,
      }));
    }
  };

  const isDpCategory = formData.kategori === 'dp_siswa';
  const isPelunasanCategory = formData.kategori === 'pelunasan_siswa';
  const isRefundCategory = formData.kategori === 'refund_siswa';
  const isStudentRelated = isDpCategory || isPelunasanCategory || isRefundCategory;

  const filteredSiswaDropdown = React.useMemo(() => {
    if (isDpCategory) {
      return siswaList.filter((s) => s.status_pembayaran_kode === 'belum_bayar');
    }
    if (isPelunasanCategory) {
      return siswaList.filter((s) => s.status_pembayaran_kode === 'dp');
    }
    if (isRefundCategory) {
      return siswaList.filter(
        (s) => s.status_pembayaran_kode === 'dp' || s.status_pembayaran_kode === 'lunas'
);
    }
    return [];
  }, [siswaList, isDpCategory, isPelunasanCategory, isRefundCategory]);

  const isCustomDpSelected = formData.siswa_id === 'custom_dp';
  const selectedDpKustom = formData.siswa_id.startsWith('dp_kustom_')
    ? dpKustomList.find((dp) => dp.id === formData.siswa_id.replace('dp_kustom_', ''))
    : null;
  const unsettledDpKustom = React.useMemo(() => dpKustomList.filter((dp) => !dp.isLunas), [dpKustomList]);

  const selectedSiswa = !isCustomDpSelected && !selectedDpKustom
    ? siswaList.find((s) => s.id === formData.siswa_id)
    : null;

  // Available categories for selected type with fallback guarantee
  const availableKategoriList = React.useMemo(() => {
    const list = kategoriList && kategoriList.length > 0 ? kategoriList : DEFAULT_KAS_KATEGORI;
    return list.filter((k) => {
      if (formData.tipe === 'pemasukan') {
        return k.tipe === 'pemasukan' || k.tipe === 'keduanya';
      }
      return k.tipe === 'pengeluaran' || k.tipe === 'keduanya';
    });
  }, [kategoriList, formData.tipe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keterangan || formData.nominal <= 0) return;

    const isCustom = formData.siswa_id === 'custom_dp' || formData.siswa_id.startsWith('dp_kustom_');
    const finalSiswaId = isCustom ? null : (formData.siswa_id || null);

    let finalKeterangan = formData.keterangan;
    const selectedRek = rekeningList.find((r) => r.id === selectedRekeningId);
    if (formData.jenis_pembayaran === 'non_tunai' && selectedRek && !finalKeterangan.includes(selectedRek.nama_bank)) {
      finalKeterangan = `[${selectedRek.nama_bank} ${selectedRek.nomor_rekening}] ${finalKeterangan}`;
    }

    await addKasTransaksi({
      tanggal: formData.tanggal,
      tipe: formData.tipe,
      kategori: formData.kategori,
      keterangan: finalKeterangan,
      nominal: formData.nominal,
      jenis_pembayaran: formData.jenis_pembayaran,
      rekening_id: formData.jenis_pembayaran === 'non_tunai' ? selectedRekeningId || null : null,
      pic_tipe: formData.pic_tipe,
      pic_nama: formData.pic_tipe === 'finance' ? 'Lia (Finance)' : formData.pic_nama || 'Admin Staff',
      siswa_id: finalSiswaId,
      sumber_otomatis: false,
    });

    setFormData({
      tanggal: getTodayDateString(),
      tipe: 'pengeluaran',
      kategori: 'operasional',
      keterangan: '',
      nominal: 0,
      jenis_pembayaran: 'tunai',
      pic_tipe: 'admin',
      pic_nama: '',
      siswa_id: '',
    });
    setCustomNama('');
    setCustomPaketId('');
    setCustomHargaPaket(0);
    setCustomDpNominal(0);

    loadData();
  };

  return (
    <PinGateDialog>
      <div className="space-y-6">
        <PageHeader
          title="Manajemen Kas & Arus Keuangan"
          description="Pencatatan kas masuk/keluar, piutang siswa, dan hutang perusahaan"
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="px-3 py-1.5 bg-[var(--bg-subtle)] hover:bg-[var(--border)] border border-[var(--border)] rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 active:scale-95"
                title="Muat ulang sinkronisasi data dari database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                <span>{loading ? 'Menyinkronkan...' : 'Sinkronkan Kas'}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenSetorTunai}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
                title="Pindahkan saldo tunai ke rekening bank"
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Setor Tunai</span>
              </button>
              <Link
                href="/kas/cashflow"
                className="px-3 py-1.5 border border-[var(--border)] rounded-md text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Laporan Arus Kas
              </Link>
              <Link
                href="/kas/piutang"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Manajemen Piutang</span>
              </Link>
              <Link
                href="/kas/hutang"
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Hutang Perusahaan</span>
              </Link>
            </div>
          }
        />

        {/* Financial Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Saldo Kas Aktif"
            value={formatRupiah(metrics.saldoAktif)}
            icon={<Wallet className="w-5 h-5 text-emerald-600" />}
            description="Kas Fisik + Rekening Bank"
          />
          <StatCard
            label="Saldo Kas Fisik (Tunai)"
            value={formatRupiah(metrics.saldoTunai)}
            icon={<ArrowDownRight className="w-5 h-5 text-amber-600" />}
            description="Uang tunai di brankas kantor"
            onClick={handleOpenSetorTunai}
            className="hover:border-emerald-500/50 cursor-pointer"
          />
          <StatCard
            label="Saldo Bank (Non-Tunai)"
            value={formatRupiah(metrics.saldoNonTunai)}
            icon={<ArrowUpRight className="w-5 h-5 text-blue-600" />}
            description="Rekening BCA/Mandiri/dll"
          />
          <StatCard
            label="Total Piutang Beredar"
            value={formatRupiah(metrics.totalPiutang)}
            icon={<FileText className="w-5 h-5 text-amber-600" />}
            description="Tagihan siswa yang belum lunas"
          />
          <StatCard
            label="Sisa Hutang Perusahaan"
            value={formatRupiah(metrics.totalHutang)}
            icon={<FileText className="w-5 h-5 text-rose-600" />}
            description="Hutang vendor / leasing / operasional"
          />
        </div>

        {/* Input Form & Transaction History Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Manual Input Form */}
          <div className="card-container space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[var(--brand-primary)]" />
              Catat Mutasi Kas Manual
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Jenis Mutasi *
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-[var(--bg-subtle)] p-1 rounded-md border border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => handleTipeChange('pemasukan')}
                      className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                        formData.tipe === 'pemasukan'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTipeChange('pengeluaran')}
                      className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                        formData.tipe === 'pengeluaran'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Keluar
                    </button>
                  </div>
                </div>

                <div>
                  <DatePickerWIB
                    label="Tanggal *"
                    value={formData.tanggal}
                    onChange={(val) => setFormData({ ...formData, tanggal: val })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Kategori *
                </label>
                <select
                  value={formData.kategori}
                  onChange={(e) => handleKategoriChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                >
                  {availableKategoriList.map((k) => (
                    <option key={k.id} value={k.nama_kategori}>
                      {k.nama_kategori === 'dp_siswa' ? 'DP Siswa Kursus'
                        : k.nama_kategori === 'pelunasan_siswa' ? 'Pelunasan Siswa'
                        : k.nama_kategori === 'refund_siswa' ? 'Refund / Pembatalan'
                        : k.nama_kategori === 'cicilan_hutang' ? 'Cicilan Hutang'
                        : k.nama_kategori.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Student / DP Kustom Selection */}
              {isStudentRelated && (
                <div className="p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[var(--brand-primary)] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>
                        {isDpCategory
                          ? 'Pilih Siswa / Input DP Kustom *'
                          : isPelunasanCategory
                          ? 'Pilih Pelunasan (DP Kustom / Siswa) *'
                          : 'Pilih Siswa (Status DP / Lunas) *'}
                      </span>
                    </label>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {isPelunasanCategory ? `${unsettledDpKustom.length} DP Kustom, ${filteredSiswaDropdown.length} Siswa` : `${filteredSiswaDropdown.length} siswa`}
                    </span>
                  </div>

                  <select
                    value={formData.siswa_id}
                    required
                    onChange={(e) => handleSiswaChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)]"
                  >
                    <option value="">-- Pilih Siswa / DP Kustom --</option>

                    {/* DP Kustom */}
                    {isDpCategory && (
                      <option value="custom_dp" className="font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40">
                        [+ Input DP Kustom]
                      </option>
                    )}

                    {/* Pelunasan DP Kustom */}
                    {isPelunasanCategory && unsettledDpKustom.length > 0 && (
                      <optgroup label="Daftar DP Kustom (Belum Lunas)">
                        {unsettledDpKustom.map((dp) => (
                          <option
                            key={`dp_kustom_${dp.id}`}
                            value={`dp_kustom_${dp.id}`}
                            className="font-bold text-amber-800 dark:text-amber-300"
                          >
                            [DP Kustom] {dp.nama} — {dp.namaPaket} (Sisa: {formatRupiah(dp.sisaTagihan)})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {/* DAFTAR SISWA TERDAFTAR */}
                    {isPelunasanCategory && (
                      <optgroup label="Daftar Siswa Terdaftar (Status DP)">
                        {filteredSiswaDropdown.map((s) => {
                          const sisaTagihan = Math.max(0, s.harga_final - (s.dp_nominal || 0));
                          return (
                            <option key={s.id} value={s.id}>
                              {s.kode_siswa} - {s.nama} (Sisa Piutang: {formatRupiah(sisaTagihan)})
                            </option>
                          );
                        })}
                      </optgroup>
                    )}

                    {isDpCategory && (
                      <optgroup label="Daftar Siswa Terdaftar (Belum Bayar)">
                        {filteredSiswaDropdown.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.kode_siswa} - {s.nama} (Total Tagihan: {formatRupiah(s.harga_final)})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {isRefundCategory && (
                      <optgroup label="Daftar Siswa Terdaftar (DP / Lunas)">
                        {filteredSiswaDropdown.map((s) => {
                          const totalPaid = s.status_pembayaran_kode === 'lunas' ? s.harga_final : (s.dp_nominal || 0);
                          return (
                            <option key={s.id} value={s.id}>
                              {s.kode_siswa} - {s.nama} (Terbayar: {formatRupiah(totalPaid)} [{s.status_pembayaran_kode.toUpperCase()}])
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                  </select>

                  {/* Form Khusus Input DP Kustom */}
                  {isCustomDpSelected && (
                    <div className="pt-2 border-t border-[var(--border)] space-y-3 p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-900 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                        <User className="w-4 h-4 text-amber-600" />
                        <span>Form Input DP Kustom (Non-Siswa)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                            Nama Customer / Calon Siswa *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Nama customer"
                            value={customNama}
                            onChange={(e) => handleCustomNamaChange(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                            Pilihan Paket Kursus *
                          </label>
                          <select
                            value={customPaketId}
                            onChange={(e) => handleCustomPaketChange(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)]"
                          >
                            {paketList.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nama_paket} ({formatRupiah(p.harga_promo || p.harga_normal)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <CurrencyInput
                            label="Total Harga Paket (Rupiah) *"
                            value={customHargaPaket}
                            onChange={(val) => handleCustomHargaPaketChange(val)}
                          />
                        </div>
                      </div>

                      <div className="p-2 rounded bg-amber-100/70 dark:bg-amber-900/30 text-[10px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                        <span>
                          <strong>Harga paket dapat disesuaikan manual</strong> (misal harga negosiasi atau promo khusus). Total tagihan paket ini akan tercatat sebesar <strong>{formatRupiah(customHargaPaket)}</strong> dan sisa piutang pelunasan akan otomatis dihitung dari total harga ini.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Info Khusus Ketika Memilih DP Kustom untuk Pelunasan */}
                  {selectedDpKustom && (
                    <div className="pt-2 border-t border-[var(--border)] space-y-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1">
                          <User className="w-3 h-3 text-amber-600" />
                          Pelunasan DP Kustom (Non-Siswa)
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">Ref ID: {selectedDpKustom.id.slice(0, 8)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-[var(--bg)] p-2 rounded border border-[var(--border)]">
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Nama Customer</span>
                          <span className="font-bold text-[var(--text-primary)]">{selectedDpKustom.nama}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Paket Dipilih</span>
                          <span className="font-semibold text-[var(--text-primary)]">{selectedDpKustom.namaPaket}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Total Biaya Paket</span>
                          <span className="font-bold text-[var(--brand-primary)]">{formatRupiah(selectedDpKustom.hargaPaket)}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">DP Awal Terbayar</span>
                          <span className="font-semibold text-emerald-600">{formatRupiah(selectedDpKustom.dpNominal)}</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-[var(--border)] flex justify-between items-center">
                          <span className="text-[var(--text-secondary)] text-[10px]">Sisa Tagihan Pelunasan:</span>
                          <span className="font-bold text-rose-600 text-xs">{formatRupiah(selectedDpKustom.sisaTagihan)}</span>
                        </div>
                      </div>

                      {formData.nominal === selectedDpKustom.sisaTagihan && (
                        <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                          <div>
                            <strong>Pelunasan Penuh!</strong> Sisa tagihan DP Kustom ini sebesar <strong>{formatRupiah(selectedDpKustom.sisaTagihan)}</strong> akan lunas seluruhnya.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Context Info & Real-time Calculation Box for Registered Students */}
                  {selectedSiswa && (
                    <div className="pt-2 border-t border-[var(--border)] space-y-2 text-[11px]">
                      <div className="grid grid-cols-2 gap-2 bg-[var(--bg)] p-2 rounded border border-[var(--border)]">
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Paket Kursus</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {selectedSiswa.paket?.nama_paket || 'Khusus'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Total Biaya Paket</span>
                          <span className="font-bold text-[var(--brand-primary)]">
                            {formatRupiah(selectedSiswa.harga_final)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Uang Masuk Saat Ini</span>
                          <span className="font-semibold text-emerald-600">
                            {formatRupiah(selectedSiswa.status_pembayaran_kode === 'lunas' ? selectedSiswa.harga_final : (selectedSiswa.dp_nominal || 0))}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Sisa Piutang Berjalan</span>
                          <span className="font-bold text-rose-600">
                            {formatRupiah(
                              isPelunasanCategory
                                ? Math.max(0, selectedSiswa.harga_final - (selectedSiswa.dp_nominal || 0))
                                : isDpCategory
                                ? selectedSiswa.harga_final
                                : 0
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Real-time Validation / Comparison Alert */}
                      {isDpCategory && formData.nominal > 0 && (
                        <div
                          className={`p-2 rounded flex items-start gap-1.5 ${
                            formData.nominal >= selectedSiswa.harga_final
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                          }`}
                        >
                          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <div>
                            {formData.nominal >= selectedSiswa.harga_final ? (
                              <span>
                                <strong>Lunas Penuh!</strong> Nominal DP sama/melebihi total tagihan paket. Status siswa akan otomatis menjadi <strong>LUNAS</strong>.
                              </span>
                            ) : (
                              <span>
                                DP sebesar <strong>{formatRupiah(formData.nominal)}</strong> dicatat. Sisa piutang beredar tersisa <strong>{formatRupiah(selectedSiswa.harga_final - formData.nominal)}</strong> (Status: <strong>DP</strong>).
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {isPelunasanCategory && formData.nominal > 0 && (
                        (() => {
                          const sisaPiutang = Math.max(0, selectedSiswa.harga_final - (selectedSiswa.dp_nominal || 0));
                          if (formData.nominal === sisaPiutang) {
                            return (
                              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                                <div>
                                  <strong>Pembayaran PAS!</strong> Tagihan piutang siswa lunas sepenuhnya (Sisa Piutang: Rp 0). Status siswa akan menjadi <strong>LUNAS</strong>.
                                </div>
                              </div>
                            );
                          } else if (formData.nominal < sisaPiutang) {
                            return (
                              <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                                <div>
                                  <strong>Pembayaran Kurang / Sebagian.</strong> Masih ada sisa piutang sebesar <strong>{formatRupiah(sisaPiutang - formData.nominal)}</strong>. Status siswa tetap <strong>DP</strong> dengan akumulasi pembayaran terupdate.
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-start gap-1.5">
                                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-600" />
                                <div>
                                  <strong>Pembayaran Lebih.</strong> Kelebihan bayar sebesar <strong>{formatRupiah(formData.nominal - sisaPiutang)}</strong>. Status siswa akan menjadi <strong>LUNAS</strong>.
                                </div>
                              </div>
                            );
                          }
                        })()
                      )}

                      {isRefundCategory && (
                        <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-start gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-600" />
                          <div>
                            <strong>Pencatatan Refund Pengeluaran.</strong> Menyimpan transaksi ini akan mencatat pengeluaran kas sebesar <strong>{formatRupiah(formData.nominal)}</strong>, mengubah status siswa menjadi <strong>BATAL</strong>, dan menghapus sisa piutang.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Keterangan Transaksi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Pembelian ATK Kantor"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              <CurrencyInput
                label="Nominal Rupiah *"
                value={formData.nominal}
                onChange={(val) => setFormData({ ...formData, nominal: val })}
              />

              {/* Jenis Pembayaran */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Jenis Pembayaran *
                </label>
                <div className="flex rounded-md p-1 bg-[var(--bg-subtle)] border border-[var(--border)] text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, jenis_pembayaran: 'tunai' })}
                    className={`flex-1 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                      formData.jenis_pembayaran === 'tunai'
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <span>Tunai (Kas Fisik)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, jenis_pembayaran: 'non_tunai' })}
                    className={`flex-1 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                      formData.jenis_pembayaran === 'non_tunai'
                        ? 'bg-blue-600 text-white'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    <span>Non-Tunai / Bank</span>
                  </button>
                </div>

                {/* Dropdown Rekening Bank Perusahaan (Jika Non-Tunai) */}
                {formData.jenis_pembayaran === 'non_tunai' && (
                  <div className="mt-2.5 p-2.5 rounded-md bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        <span>Pilih Rekening Tujuan / Penerima *</span>
                      </label>
                      <Link
                        href="/settings"
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold underline"
                      >
                        Kelola Rekening
                      </Link>
                    </div>

                    <select
                      value={selectedRekeningId}
                      onChange={(e) => setSelectedRekeningId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-blue-300 dark:border-blue-800 bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                    >
                      <option value="">{LABEL_REKENING_DEFAULT}</option>
                      {rekeningList
                        .filter((r) => r.aktif)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nama_bank} - {r.nomor_rekening} (a.n {r.atas_nama}) {r.is_utama ? '(Utama)' : ''}
                          </option>
                        ))}
                    </select>

                    {rekeningList.filter((r) => r.aktif).length === 0 && (
                      <p className="text-[10px] text-amber-700 italic">
                        Belum ada rekening aktif. Tambahkan di menu Pengaturan.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    PIC Transaksi *
                  </label>
                  <select
                    value={formData.pic_tipe}
                    onChange={(e) => setFormData({ ...formData, pic_tipe: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    <option value="admin">Admin</option>
                    <option value="finance">Finance (Lia)</option>
                  </select>
                </div>

                {formData.pic_tipe === 'admin' && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Nama Admin *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama admin"
                      value={formData.pic_nama}
                      onChange={(e) => setFormData({ ...formData, pic_nama: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Upload Foto Nota (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="w-full text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded-md p-1.5 bg-[var(--bg)]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
              >
                Simpan Transaksi Kas
              </button>
            </form>
          </div>

          {/* Recent 10 Transactions List */}
          <div className="card-container space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="font-bold text-base text-[var(--text-primary)]">Transaksi Kas Terbaru</h3>
              <Link href="/kas/cashflow" className="text-xs text-[var(--brand-primary)] hover:underline font-semibold">
                Lihat Semua Cashflow &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {transaksiList.slice(0, 8).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border)]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.tipe === 'pemasukan'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {tx.tipe === 'pemasukan' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-[var(--text-primary)]">{tx.keterangan}</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        {formatDateIndo(tx.tanggal)} | PIC: {tx.pic_nama}
                        {tx.sumber_otomatis && (
                          <span className="ml-2 px-1.5 py-0.2 text-[9px] bg-blue-100 text-blue-800 rounded font-semibold">
                            Otomatis
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`font-bold text-xs ${
                        tx.tipe === 'pemasukan' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {tx.tipe === 'pemasukan' ? '+' : '-'} {formatRupiah(tx.nominal)}
                    </div>
                    <button
                      onClick={() => handleOpenEdit(tx)}
                      className="p-1 text-[var(--brand-primary)] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded"
                      title="Edit Transaksi Kas"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(tx.id)}
                      className="p-1 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
                      title="Hapus Transaksi Kas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confirm Dialog Hapus Transaksi Kas */}
        <ConfirmDialog
          isOpen={!!deletingId}
          onClose={() => setDeletingId(null)}
          onConfirm={handleDeleteConfirm}
          title="Hapus Transaksi Kas"
          description="Apakah Anda yakin ingin menghapus catatan transaksi kas ini? Aksi ini tidak dapat dibatalkan."
          confirmText="Hapus Transaksi"
          isDanger
        />

        {/* EDIT MODAL TRANSAKSI KAS */}
        {editingTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Edit Transaksi Kas</h3>
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <DatePickerWIB
                    label="Tanggal Transaksi"
                    value={editForm.tanggal || ''}
                    onChange={(val) => setEditForm((prev) => ({ ...prev, tanggal: val }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Tipe Transaksi</label>
                    <select
                      value={editForm.tipe}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, tipe: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-bold text-xs"
                    >
                      <option value="pemasukan">Pemasukan (+)</option>
                      <option value="pengeluaran">Pengeluaran (−)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Jenis Pembayaran</label>
                    <select
                      value={editForm.jenis_pembayaran || 'tunai'}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          jenis_pembayaran: e.target.value as any,
                          rekening_id: e.target.value === 'tunai' ? '' : prev.rekening_id,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-bold text-xs"
                    >
                      <option value="tunai">Tunai</option>
                      <option value="non_tunai">Non-Tunai</option>
                    </select>
                  </div>
                </div>

                {/* Dropdown Rekening Bank Perusahaan (Jika Non-Tunai) */}
                {editForm.jenis_pembayaran === 'non_tunai' && (
                  <div className="p-2.5 rounded-md bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-1 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        <span>Pilih Rekening Bank (Non-Tunai)</span>
                      </label>
                      <Link
                        href="/settings"
                        target="_blank"
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold underline"
                      >
                        Kelola Rekening
                      </Link>
                    </div>
                    <select
                      value={editForm.rekening_id || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, rekening_id: e.target.value }))}
                      className="w-full px-2.5 py-1.5 rounded border border-blue-300 dark:border-blue-800 bg-[var(--bg)] font-semibold text-xs text-[var(--text-primary)]"
                    >
                      <option value="">{LABEL_REKENING_DEFAULT}</option>
                      {rekeningList
                        .filter((r) => r.aktif)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nama_bank} - {r.nomor_rekening} (a.n {r.atas_nama}) {r.is_utama ? '(Utama)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Kategori Kas</label>
                  <select
                    value={editForm.kategori}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, kategori: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs"
                  >
                    {kategoriList.map((k) => (
                      <option key={k.id} value={k.nama_kategori}>
                        {formatKategoriLabel(k.nama_kategori)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Uraian / Keterangan</label>
                  <input
                    type="text"
                    value={editForm.keterangan || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, keterangan: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs font-medium"
                  />
                </div>

                <div>
                  <CurrencyInput
                    label="Nominal (Rp)"
                    value={editForm.nominal || 0}
                    onChange={(val) => setEditForm((prev) => ({ ...prev, nominal: val }))}
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Nama PIC Transaksi</label>
                  <input
                    type="text"
                    value={editForm.pic_nama || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, pic_nama: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditingTx(null)}
                    className="px-4 py-2 border border-[var(--border)] rounded-md font-medium text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white rounded-md font-medium text-xs"
                  >
                    {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Setor Tunai */}
        {isSetorTunaiOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-[var(--border)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Setor Tunai ke Bank</h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">Pindahkan saldo fisik ke rekening perusahaan</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSetorTunaiOpen(false)}
                  className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Saldo Saat Ini Box */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 block">
                    Saldo Tunai Saat Ini
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)] mt-0.5 block">
                    {formatRupiah(metrics.saldoTunai)}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                  <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 block">
                    Saldo Bank Saat Ini
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)] mt-0.5 block">
                    {formatRupiah(metrics.saldoNonTunai)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveSetorTunai} className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">
                      Nominal Setor Tunai *
                    </label>
                    {metrics.saldoTunai > 0 && (
                      <button
                        type="button"
                        onClick={() => setSetorNominal(metrics.saldoTunai)}
                        className="text-[11px] font-bold text-[var(--brand-primary)] hover:underline"
                      >
                        Setor Semua ({formatRupiah(metrics.saldoTunai)})
                      </button>
                    )}
                  </div>
                  <CurrencyInput
                    value={setorNominal}
                    onChange={(val) => setSetorNominal(val)}
                    placeholder="Rp 0"
                    className="w-full"
                  />
                  {setorNominal > metrics.saldoTunai && (
                    <p className="text-[11px] font-semibold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Nominal melebihi saldo kas fisik tunai ({formatRupiah(metrics.saldoTunai)})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Rekening Bank Tujuan *
                  </label>
                  <select
                    value={setorRekeningId}
                    onChange={(e) => setSetorRekeningId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                  >
                    <option value="">-- Pilih Rekening Bank Tujuan --</option>
                    {rekeningList
                      .filter((r) => r.aktif)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nama_bank} - {r.nomor_rekening} (a.n {r.atas_nama}) {r.is_utama ? '(Utama)' : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <DatePickerWIB
                      label="Tanggal Setor *"
                      value={setorTanggal}
                      onChange={(val) => setSetorTanggal(val)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                      Petugas (PIC) *
                    </label>
                    <input
                      type="text"
                      value={setorPicNama}
                      onChange={(e) => setSetorPicNama(e.target.value)}
                      required
                      placeholder="Nama staf penyetor"
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Catatan / Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={setorKeterangan}
                    onChange={(e) => setSetorKeterangan(e.target.value)}
                    placeholder="Contoh: Setoran tunai pendaftaran kursus"
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setIsSetorTunaiOpen(false)}
                    disabled={isSubmittingSetor}
                    className="px-3 py-2 rounded-md border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-[var(--text-secondary)]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isSubmittingSetor ||
                      setorNominal <= 0 ||
                      setorNominal > metrics.saldoTunai ||
                      !setorRekeningId
                    }
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingSetor ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Konfirmasi Setor Tunai</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PinGateDialog>
  );
}
