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
  getKasKategoriList,
  deleteKasTransaksi,
  getDpKustomList,
  DpKustomItem,
} from '@/lib/actions/kas';
import { getSiswaList } from '@/lib/actions/siswa';
import { getPaketList } from '@/lib/actions/master-data';
import { getTodayDateString, formatDateIndo } from '@/lib/utils/date';
import { Siswa, Paket } from '@/types/database';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  FileText,
  Trash2,
  User,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Star,
} from 'lucide-react';
import Link from 'next/link';

export default function KasOverviewPage() {
  const [metrics, setMetrics] = React.useState({
    saldoAktif: 0,
    saldoTunai: 0,
    saldoNonTunai: 0,
    totalPiutang: 0,
    totalHutang: 0,
  });
  const [transaksiList, setTransaksiList] = React.useState<any[]>([]);
  const [kategoriList, setKategoriList] = React.useState<any[]>([]);
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [dpKustomList, setDpKustomList] = React.useState<DpKustomItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

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

  // Custom DP States (untuk input DP tanpa data siswa terdaftar)
  const [customNama, setCustomNama] = React.useState('');
  const [customPaketId, setCustomPaketId] = React.useState('');
  const [customHargaPaket, setCustomHargaPaket] = React.useState(0);
  const [customDpNominal, setCustomDpNominal] = React.useState(0);

  const loadData = async () => {
    setLoading(true);
    const [mRes, tRes, kRes, sRes, pRes, dpKRes] = await Promise.all([
      getKasOverviewMetrics(),
      getKasTransaksiList(),
      getKasKategoriList(),
      getSiswaList(),
      getPaketList(),
      getDpKustomList(),
    ]);
    setMetrics(mRes);
    setTransaksiList(tRes);
    setKategoriList(kRes);
    setSiswaList(sRes);
    setPaketList(pRes);
    setDpKustomList(dpKRes);
    setLoading(false);
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

  // Available categories for selected type
  const availableKategoriList = React.useMemo(() => {
    return kategoriList.filter((k) => {
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

    await addKasTransaksi({
      tanggal: formData.tanggal,
      tipe: formData.tipe,
      kategori: formData.kategori,
      keterangan: formData.keterangan,
      nominal: formData.nominal,
      jenis_pembayaran: formData.jenis_pembayaran,
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
                    <option key={k.id} value={k.id}>
                      {k.nama_kategori}
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

                    {/* DP KUSTOM Option for DP Category */}
                    {isDpCategory && (
                      <option value="custom_dp" className="font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40">
                        ✨ [+ Input DP Kustom / Tanpa Data Siswa]
                      </option>
                    )}

                    {/* PELUNASAN: DP KUSTOM BERADA DI PALING ATAS */}
                    {isPelunasanCategory && unsettledDpKustom.length > 0 && (
                      <optgroup label="⭐ DAFTAR DP KUSTOM (BELUM LUNAS)">
                        {unsettledDpKustom.map((dp) => (
                          <option
                            key={`dp_kustom_${dp.id}`}
                            value={`dp_kustom_${dp.id}`}
                            className="font-bold text-amber-800 dark:text-amber-300"
                          >
                            ⭐ [DP Kustom] {dp.nama} — {dp.namaPaket} (Sisa: {formatRupiah(dp.sisaTagihan)})
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
                        <Sparkles className="w-4 h-4 text-amber-600" />
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
                            placeholder="Contoh: Budi Santoso"
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
                          💡 <strong>Harga paket dapat disesuaikan manual</strong> (misal harga negosiasi atau promo khusus). Total tagihan paket ini akan tercatat sebesar <strong>{formatRupiah(customHargaPaket)}</strong> dan sisa piutang pelunasan akan otomatis dihitung dari total harga ini.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Info Khusus Ketika Memilih DP Kustom untuk Pelunasan */}
                  {selectedDpKustom && (
                    <div className="pt-2 border-t border-[var(--border)] space-y-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
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
      </div>
    </PinGateDialog>
  );
}
