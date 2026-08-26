'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Insiden,
  Kendaraan,
  Staff,
  Siswa,
  KategoriInsidenEnum,
  TingkatKeparahanEnum,
  StatusPenangananEnum,
  PenanggungBiayaEnum,
} from '@/types/database';
import {
  getInsidenList,
  createInsiden,
  updateInsiden,
  updateInsidenStatus,
  deleteInsiden,
  getInsidenStats,
  generateWhatsAppInsidenText,
  InsidenFilter,
} from '@/lib/actions/insiden';
import { getKendaraanMasterList, getInstrukturList } from '@/lib/actions/master-data';
import { getSiswaList } from '@/lib/actions/siswa';
import { formatDateIndo, formatHariTanggalIndo, getTodayDateString } from '@/lib/utils/date';
import { formatRupiah } from '@/lib/utils/currency';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { TimePicker24H } from '@/components/shared/TimePicker24H';
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  Search,
  Filter,
  Car,
  User,
  MapPin,
  DollarSign,
  Copy,
  Check,
  Edit2,
  Trash2,
  Eye,
  X,
  FileText,
  Shield,
  Wrench,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

const KATEGORI_OPTIONS: { value: KategoriInsidenEnum; label: string }[] = [
  { value: 'tabrakan', label: 'Tabrakan / Kecelakaan' },
  { value: 'senggolan', label: 'Senggolan / Baret Ringan' },
  { value: 'baret_bodi', label: 'Baret / Penyok Bodi' },
  { value: 'kerusakan_mesin', label: 'Kerusakan Mesin / Kopling' },
  { value: 'ban_pecah', label: 'Ban Pecah / Bocor' },
  { value: 'tilang', label: 'Pelanggaran Lalu Lintas (Tilang)' },
  { value: 'kendala_siswa', label: 'Kendala / Komplain Siswa' },
  { value: 'kehilangan', label: 'Kehilangan Barang / Dokumen' },
  { value: 'lainnya', label: 'Lainnya' },
];

const KEPARAHAN_CONFIG: Record<
  TingkatKeparahanEnum,
  { label: string; bg: string; text: string; border: string }
> = {
  ringan: {
    label: 'Ringan',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  sedang: {
    label: 'Sedang',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  berat: {
    label: 'Berat',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
  },
  kritis: {
    label: 'Kritis',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
  },
};

const STATUS_CONFIG: Record<
  StatusPenangananEnum,
  { label: string; bg: string; text: string }
> = {
  dilaporkan: {
    label: 'Dilaporkan',
    bg: 'bg-sky-100 dark:bg-sky-950/50',
    text: 'text-sky-700 dark:text-sky-400',
  },
  dalam_investigasi: {
    label: 'Dalam Investigasi',
    bg: 'bg-purple-100 dark:bg-purple-950/50',
    text: 'text-purple-700 dark:text-purple-400',
  },
  dalam_perbaikan: {
    label: 'Dalam Perbaikan',
    bg: 'bg-amber-100 dark:bg-amber-950/50',
    text: 'text-amber-700 dark:text-amber-400',
  },
  selesai: {
    label: 'Selesai',
    bg: 'bg-emerald-100 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  klaim_asuransi: {
    label: 'Klaim Asuransi',
    bg: 'bg-indigo-100 dark:bg-indigo-950/50',
    text: 'text-indigo-700 dark:text-indigo-400',
  },
  ditolak: {
    label: 'Ditolak / Batal',
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
  },
};

const PENANGGUNG_OPTIONS: { value: PenanggungBiayaEnum; label: string }[] = [
  { value: 'perusahaan', label: 'Perusahaan (Amanah Drive)' },
  { value: 'instruktur', label: 'Instruktur Bertugas' },
  { value: 'siswa', label: 'Siswa Terkait' },
  { value: 'pihak_ketiga', label: 'Pihak Ketiga (Penabrak)' },
  { value: 'asuransi', label: 'Klaim Asuransi' },
  { value: 'bersama', label: 'Patungan / Bersama' },
];

export default function InsidenPage() {
  const [insidenList, setInsidenList] = React.useState<Insiden[]>([]);
  const [kendaraanList, setKendaraanList] = React.useState<Kendaraan[]>([]);
  const [staffList, setStaffList] = React.useState<Staff[]>([]);
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Statistics State
  const [stats, setStats] = React.useState({
    totalInsiden: 0,
    dalamPenanganan: 0,
    selesai: 0,
    totalEstimasiBiaya: 0,
    totalBiayaAktual: 0,
  });

  // Filter State
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('semua');
  const [kategoriFilter, setKategoriFilter] = React.useState('semua');
  const [keparahanFilter, setKeparahanFilter] = React.useState('semua');
  const [kendaraanFilter, setKendaraanFilter] = React.useState('semua');
  const [staffFilter, setStaffFilter] = React.useState('semua');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  // Modal Input Insiden State
  const [isInputModalOpen, setIsInputModalOpen] = React.useState(false);
  const [editingInsiden, setEditingInsiden] = React.useState<Insiden | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Form State
  const [formData, setFormData] = React.useState({
    tanggal_insiden: getTodayDateString(),
    jam_insiden: '09:00',
    kendaraan_id: '',
    staff_id: '',
    siswa_id: '',
    kategori: 'tabrakan' as KategoriInsidenEnum,
    tingkat_keparahan: 'ringan' as TingkatKeparahanEnum,
    lokasi_kejadian: '',
    deskripsi_kejadian: '',
    kronologi_singkat: '',
    kondisi_kendaraan: '',
    kondisi_pengemudi: '',
    estimasi_biaya: 0,
    biaya_aktual: 0,
    penanggung_biaya: 'perusahaan' as PenanggungBiayaEnum,
    status_penanganan: 'dilaporkan' as StatusPenangananEnum,
    tindakan_penanganan: '',
    catatan: '',
  });

  // Detail Modal State
  const [selectedDetail, setSelectedDetail] = React.useState<Insiden | null>(null);

  // Quick Status Update Modal State
  const [statusModalInsiden, setStatusModalInsiden] = React.useState<Insiden | null>(null);
  const [quickStatus, setQuickStatus] = React.useState<StatusPenangananEnum>('dalam_perbaikan');
  const [quickTindakan, setQuickTindakan] = React.useState('');
  const [quickBiayaAktual, setQuickBiayaAktual] = React.useState(0);
  const [quickCatatKeKas, setQuickCatatKeKas] = React.useState(true);
  const [quickJenisPembayaran, setQuickJenisPembayaran] = React.useState<'tunai' | 'non_tunai'>('non_tunai');

  // Delete Confirm State
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // WhatsApp Copy Toast State
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Load All Data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    const filterParams: InsidenFilter = {
      search: search.trim() || undefined,
      status: statusFilter !== 'semua' ? statusFilter : undefined,
      kategori: kategoriFilter !== 'semua' ? kategoriFilter : undefined,
      tingkatKeparahan: keparahanFilter !== 'semua' ? keparahanFilter : undefined,
      kendaraanId: kendaraanFilter !== 'semua' ? kendaraanFilter : undefined,
      staffId: staffFilter !== 'semua' ? staffFilter : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    const [list, kList, sList, swList, statsData] = await Promise.all([
      getInsidenList(filterParams),
      getKendaraanMasterList(),
      getInstrukturList(),
      getSiswaList(),
      getInsidenStats(),
    ]);

    setInsidenList(list);
    setKendaraanList(kList);
    setStaffList(sList);
    setSiswaList(swList);
    setStats({
      totalInsiden: statsData.totalInsiden,
      dalamPenanganan: statsData.dalamPenanganan,
      selesai: statsData.selesai,
      totalEstimasiBiaya: statsData.totalEstimasiBiaya,
      totalBiayaAktual: statsData.totalBiayaAktual,
    });
    setLoading(false);
  }, [search, statusFilter, kategoriFilter, keparahanFilter, kendaraanFilter, staffFilter, startDate, endDate]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Form for Create
  const handleOpenCreateModal = () => {
    setEditingInsiden(null);
    setFormData({
      tanggal_insiden: getTodayDateString(),
      jam_insiden: new Date().toTimeString().substring(0, 5),
      kendaraan_id: kendaraanList[0]?.id || '',
      staff_id: staffList[0]?.id || '',
      siswa_id: '',
      kategori: 'senggolan',
      tingkat_keparahan: 'ringan',
      lokasi_kejadian: '',
      deskripsi_kejadian: '',
      kronologi_singkat: '',
      kondisi_kendaraan: '',
      kondisi_pengemudi: '',
      estimasi_biaya: 0,
      biaya_aktual: 0,
      penanggung_biaya: 'perusahaan',
      status_penanganan: 'dilaporkan',
      tindakan_penanganan: '',
      catatan: '',
    });
    setIsInputModalOpen(true);
  };

  // Open Form for Edit
  const handleOpenEditModal = (item: Insiden) => {
    setEditingInsiden(item);
    setFormData({
      tanggal_insiden: item.tanggal_insiden,
      jam_insiden: item.jam_insiden || '08:00',
      kendaraan_id: item.kendaraan_id || '',
      staff_id: item.staff_id || '',
      siswa_id: item.siswa_id || '',
      kategori: item.kategori,
      tingkat_keparahan: item.tingkat_keparahan,
      lokasi_kejadian: item.lokasi_kejadian,
      deskripsi_kejadian: item.deskripsi_kejadian,
      kronologi_singkat: item.kronologi_singkat || '',
      kondisi_kendaraan: item.kondisi_kendaraan || '',
      kondisi_pengemudi: item.kondisi_pengemudi || '',
      estimasi_biaya: Number(item.estimasi_biaya || 0),
      biaya_aktual: Number(item.biaya_aktual || 0),
      penanggung_biaya: item.penanggung_biaya,
      status_penanganan: item.status_penanganan,
      tindakan_penanganan: item.tindakan_penanganan || '',
      catatan: item.catatan || '',
    });
    setIsInputModalOpen(true);
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lokasi_kejadian.trim() || !formData.deskripsi_kejadian.trim()) {
      alert('Mohon isi lokasi kejadian dan deskripsi kejadian insiden!');
      return;
    }

    setSubmitting(true);
    const payload = {
      tanggal_insiden: formData.tanggal_insiden,
      jam_insiden: formData.jam_insiden,
      kendaraan_id: formData.kendaraan_id || null,
      staff_id: formData.staff_id || null,
      siswa_id: formData.siswa_id || null,
      jadwal_sesi_id: null,
      kategori: formData.kategori,
      tingkat_keparahan: formData.tingkat_keparahan,
      lokasi_kejadian: formData.lokasi_kejadian.trim(),
      deskripsi_kejadian: formData.deskripsi_kejadian.trim(),
      kronologi_singkat: formData.kronologi_singkat.trim() || null,
      kondisi_kendaraan: formData.kondisi_kendaraan.trim() || null,
      kondisi_pengemudi: formData.kondisi_pengemudi.trim() || null,
      estimasi_biaya: formData.estimasi_biaya,
      biaya_aktual: formData.biaya_aktual || null,
      penanggung_biaya: formData.penanggung_biaya,
      status_penanganan: formData.status_penanganan,
      tindakan_penanganan: formData.tindakan_penanganan.trim() || null,
      foto_bukti_urls: null,
      catatan: formData.catatan.trim() || null,
    };

    let res;
    if (editingInsiden) {
      res = await updateInsiden(editingInsiden.id, payload);
    } else {
      res = await createInsiden(payload);
    }

    setSubmitting(false);
    if (res.success) {
      setIsInputModalOpen(false);
      loadData();
    } else {
      alert('Gagal menyimpan: ' + res.error);
    }
  };

  // Execute Quick Status Update
  const handleSaveQuickStatus = async () => {
    if (!statusModalInsiden) return;
    setSubmitting(true);
    const res = await updateInsidenStatus(
      statusModalInsiden.id,
      quickStatus,
      quickTindakan.trim() || undefined,
      quickBiayaAktual,
      quickCatatKeKas,
      quickJenisPembayaran
    );
    setSubmitting(false);
    if (res.success) {
      setStatusModalInsiden(null);
      loadData();
    } else {
      alert('Gagal memperbarui status: ' + res.error);
    }
  };

  // Execute Delete
  const handleExecuteDelete = async () => {
    if (!deletingId) return;
    const res = await deleteInsiden(deletingId);
    setDeletingId(null);
    if (res.success) {
      loadData();
    } else {
      alert('Gagal menghapus data: ' + res.error);
    }
  };

  // Copy WhatsApp Markdown
  const handleCopyWhatsApp = async (insidenId: string) => {
    const text = await generateWhatsAppInsidenText(insidenId);
    navigator.clipboard.writeText(text);
    setCopiedId(insidenId);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pencatatan Data Insiden & Kendala"
        description="Pencatatan komprehensif insiden operasional, kecelakaan, kerusakan armada mobil, komplain siswa, dan riwayat penanganan klaim"
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Data Insiden' }]}
        actions={
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Input Insiden Baru</span>
          </button>
        }
      />

      {/* ── METRIC STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Insiden */}
        <div className="card-container flex items-center gap-3.5 p-4 border border-[var(--border)]">
          <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center font-bold">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[var(--text-secondary)] font-semibold block">
              Total Insiden Tercatat
            </span>
            <span className="text-xl font-bold text-[var(--text-primary)]">
              {stats.totalInsiden} <span className="text-xs font-normal text-[var(--text-secondary)]">Kejadian</span>
            </span>
          </div>
        </div>

        {/* Dalam Penanganan */}
        <div className="card-container flex items-center gap-3.5 p-4 border border-[var(--border)]">
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[var(--text-secondary)] font-semibold block">
              Dalam Penanganan / Investigasi
            </span>
            <span className="text-xl font-bold text-amber-600">
              {stats.dalamPenanganan} <span className="text-xs font-normal text-[var(--text-secondary)]">Kasus</span>
            </span>
          </div>
        </div>

        {/* Selesai / Klaim */}
        <div className="card-container flex items-center gap-3.5 p-4 border border-[var(--border)]">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[var(--text-secondary)] font-semibold block">
              Penanganan Selesai
            </span>
            <span className="text-xl font-bold text-emerald-600">
              {stats.selesai} <span className="text-xs font-normal text-[var(--text-secondary)]">Kasus</span>
            </span>
          </div>
        </div>

        {/* Total Estimasi Biaya */}
        <div className="card-container flex items-center gap-3.5 p-4 border border-[var(--border)]">
          <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-[var(--text-secondary)] font-semibold block">
              Total Estimasi Kerugian
            </span>
            <span className="text-base font-bold text-[var(--text-primary)]">
              {formatRupiah(stats.totalEstimasiBiaya)}
            </span>
          </div>
        </div>
      </div>

      {/* ── FILTER TOOLBAR ── */}
      <div className="card-container p-4 space-y-3 border border-[var(--border)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Quick Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Cari kode, lokasi, mobil, nama siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium"
            >
              <option value="semua">Semua Status</option>
              <option value="dilaporkan">Dilaporkan</option>
              <option value="dalam_investigasi">Dalam Investigasi</option>
              <option value="dalam_perbaikan">Dalam Perbaikan</option>
              <option value="selesai">Selesai</option>
              <option value="klaim_asuransi">Klaim Asuransi</option>
            </select>
          </div>

          {/* Keparahan Filter */}
          <div>
            <select
              value={keparahanFilter}
              onChange={(e) => setKeparahanFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium"
            >
              <option value="semua">Semua Keparahan</option>
              <option value="ringan">Ringan</option>
              <option value="sedang">Sedang</option>
              <option value="berat">Berat</option>
              <option value="kritis">Kritis</option>
            </select>
          </div>

          {/* Kategori Filter */}
          <div>
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium"
            >
              <option value="semua">Semua Kategori</option>
              {KATEGORI_OPTIONS.map((kat) => (
                <option key={kat.value} value={kat.value}>
                  {kat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Kendaraan Filter */}
          <div>
            <select
              value={kendaraanFilter}
              onChange={(e) => setKendaraanFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium"
            >
              <option value="semua">Semua Armada Mobil</option>
              {kendaraanList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.plat_nomor} ({k.nama_kendaraan})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)] font-semibold shrink-0">Rentang Tanggal:</span>
            <div className="w-36">
              <DatePickerWIB
                label="Dari Tanggal"
                value={startDate}
                onChange={(val) => setStartDate(val)}
              />
            </div>
            <span className="text-[var(--text-secondary)]">s/d</span>
            <div className="w-36">
              <DatePickerWIB
                label="Sampai Tanggal"
                value={endDate}
                onChange={(val) => setEndDate(val)}
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-[var(--danger)] hover:underline font-medium text-[11px]"
              >
                Reset Tanggal
              </button>
            )}
          </div>

          <div className="text-[var(--text-secondary)] font-medium">
            Menampilkan <span className="font-bold text-[var(--text-primary)]">{insidenList.length}</span> insiden
          </div>
        </div>
      </div>

      {/* ── INCIDENT LIST & CARDS ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 card-container animate-pulse bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      ) : insidenList.length === 0 ? (
        <div className="card-container p-12 text-center space-y-3 border border-[var(--border)]">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-[var(--text-primary)]">
            Tidak Ada Data Insiden
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
            Semua operasional aman terkendali. Klik tombol input insiden jika ingin mencatat insiden atau kerusakan armada baru.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
          >
            + Input Insiden Baru
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insidenList.map((item) => {
            const keparahan = KEPARAHAN_CONFIG[item.tingkat_keparahan] || KEPARAHAN_CONFIG.ringan;
            const status = STATUS_CONFIG[item.status_penanganan] || STATUS_CONFIG.dilaporkan;

            return (
              <div
                key={item.id}
                className="card-container p-4 flex flex-col justify-between space-y-3 border border-[var(--border)] hover:border-[var(--brand-primary)]/50 transition-all shadow-sm"
              >
                {/* Card Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-num text-xs font-bold text-[var(--brand-primary)]">
                          {item.kode_insiden}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center ${keparahan.bg} ${keparahan.text} ${keparahan.border}`}
                        >
                          <span>{keparahan.label}</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)] font-medium block mt-0.5">
                        {formatHariTanggalIndo(item.tanggal_insiden)} • {item.jam_insiden || '08:00'} WIB
                      </span>
                    </div>

                    {/* Status Badge */}
                    <button
                      type="button"
                      onClick={() => {
                        setStatusModalInsiden(item);
                        setQuickStatus(item.status_penanganan);
                        setQuickTindakan(item.tindakan_penanganan || '');
                        setQuickBiayaAktual(Number(item.biaya_aktual || 0));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center shadow-sm transition-all hover:opacity-80 ${status.bg} ${status.text}`}
                      title="Klik untuk ubah status penanganan"
                    >
                      <span>{status.label}</span>
                    </button>
                  </div>

                  {/* Armada & Personil */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                      <Car className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                      <span className="truncate">
                        {item.kendaraan ? `${item.kendaraan.nama_kendaraan} (${item.kendaraan.plat_nomor})` : 'Tanpa Mobil'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                      <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">
                        {item.staff?.nama || 'Staff Umum'}
                        {item.siswa ? ` • ${item.siswa.nama}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[var(--text-secondary)] col-span-2 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate font-medium">{item.lokasi_kejadian}</span>
                    </div>
                  </div>

                  {/* Deskripsi Kejadian */}
                  <div className="p-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-xs text-[var(--text-primary)]">
                    <p className="line-clamp-2 font-normal leading-relaxed">{item.deskripsi_kejadian}</p>
                  </div>

                  {/* Financial & Responsibility */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] block">Estimasi Biaya</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {formatRupiah(item.estimasi_biaya || 0)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[var(--text-secondary)] block">Penanggung Jawab</span>
                      <span className="font-bold text-[var(--brand-primary)] uppercase text-[11px]">
                        {item.penanggung_biaya.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setSelectedDetail(item)}
                    className="flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)] hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Kronologi Detail</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Copy WA Report */}
                    <button
                      type="button"
                      onClick={() => handleCopyWhatsApp(item.id)}
                      className={`p-1.5 rounded-md border text-xs font-medium transition-all ${
                        copiedId === item.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-[var(--border)] text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      }`}
                      title="Salin Laporan WhatsApp"
                    >
                      {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-md border border-[var(--border)] text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
                      title="Edit Data Insiden"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setDeletingId(item.id)}
                      className="p-1.5 rounded-md border border-[var(--border)] text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      title="Hapus Insiden"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL INPUT INSIDEN LENGKAP ── */}
      {isInputModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card-container max-w-2xl w-full bg-[var(--bg)] shadow-2xl space-y-4 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>{editingInsiden ? `Edit Data Insiden: ${editingInsiden.kode_insiden}` : 'Input Pencatatan Insiden Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsInputModalOpen(false)}
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Bagian 1: Waktu & Lokasi */}
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
                <h4 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                  <span>1. Waktu & Lokasi Kejadian</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <DatePickerWIB
                      label="Tanggal Kejadian *"
                      value={formData.tanggal_insiden}
                      onChange={(val) => setFormData((prev) => ({ ...prev, tanggal_insiden: val }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Jam Kejadian (Format 24 Jam WIB) *
                    </label>
                    <TimePicker24H
                      value={formData.jam_insiden || '12:00'}
                      onChange={(val) => setFormData((prev) => ({ ...prev, jam_insiden: val }))}
                      className="w-full justify-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Lokasi / Alamat Kejadian *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Jl. Sudirman depan Bank Mandiri"
                      value={formData.lokasi_kejadian}
                      onChange={(e) => setFormData((prev) => ({ ...prev, lokasi_kejadian: e.target.value }))}
                      required
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 2: Pihak & Armada */}
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
                <h4 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-blue-500" />
                  <span>2. Armada Mobil & Personil Terlibat</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Armada Kendaraan *
                    </label>
                    <select
                      value={formData.kendaraan_id}
                      onChange={(e) => setFormData((prev) => ({ ...prev, kendaraan_id: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-xs"
                    >
                      <option value="">-- Tanpa Mobil / Lainnya --</option>
                      {kendaraanList.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.plat_nomor} - {k.nama_kendaraan} ({k.tipe_transmisi.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Instruktur / Staff Bertugas *
                    </label>
                    <select
                      value={formData.staff_id}
                      onChange={(e) => setFormData((prev) => ({ ...prev, staff_id: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-xs"
                    >
                      <option value="">-- Tanpa Staff Khusus --</option>
                      {staffList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Siswa Terlibat (Opsional)
                    </label>
                    <select
                      value={formData.siswa_id}
                      onChange={(e) => setFormData((prev) => ({ ...prev, siswa_id: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-xs"
                    >
                      <option value="">-- Tidak Ada Siswa (Luar Jam Kursus) --</option>
                      {siswaList.map((sw) => (
                        <option key={sw.id} value={sw.id}>
                          {sw.kode_siswa} - {sw.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Bagian 3: Klasifikasi & Kronologi */}
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
                <h4 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>3. Klasifikasi & Kronologi Insiden</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Kategori Insiden *
                    </label>
                    <select
                      value={formData.kategori}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          kategori: e.target.value as KategoriInsidenEnum,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-xs"
                    >
                      {KATEGORI_OPTIONS.map((kat) => (
                        <option key={kat.value} value={kat.value}>
                          {kat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Tingkat Keparahan *
                    </label>
                    <select
                      value={formData.tingkat_keparahan}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tingkat_keparahan: e.target.value as TingkatKeparahanEnum,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-xs"
                    >
                      <option value="ringan">Ringan (Baret kecil / lecet cat)</option>
                      <option value="sedang">Sedang (Penyok / kendala mesin lokal)</option>
                      <option value="berat">Berat (Kerusakan bodi besar / mogok derek)</option>
                      <option value="kritis">Kritis (Kecelakaan fatal / cedera)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Deskripsi & Kronologi Lengkap Kejadian *
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Jelaskan secara runtut bagaimana peristiwa terjadi, posisi mobil, penyebab, dan respon awal..."
                      value={formData.deskripsi_kejadian}
                      onChange={(e) => setFormData((prev) => ({ ...prev, deskripsi_kejadian: e.target.value }))}
                      required
                      className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Kondisi Kendaraan Pasca Kejadian
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Bumper depan penyok 10cm, lampu kanan pecah"
                      value={formData.kondisi_kendaraan}
                      onChange={(e) => setFormData((prev) => ({ ...prev, kondisi_kendaraan: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Kondisi Pengemudi / Siswa
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Sehat, tidak ada luka, sedikit syok"
                      value={formData.kondisi_pengemudi}
                      onChange={(e) => setFormData((prev) => ({ ...prev, kondisi_pengemudi: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bagian 4: Finansial & Penanganan */}
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
                <h4 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>4. Estimasi Biaya & Penanggung Jawab</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <CurrencyInput
                      label="Estimasi Biaya Kerusakan (Rp)"
                      value={formData.estimasi_biaya}
                      onChange={(val) => setFormData((prev) => ({ ...prev, estimasi_biaya: val }))}
                    />
                  </div>

                  <div>
                    <CurrencyInput
                      label="Biaya Aktual Realisasi (Rp)"
                      value={formData.biaya_aktual}
                      onChange={(val) => setFormData((prev) => ({ ...prev, biaya_aktual: val }))}
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Penanggung Jawab Biaya *
                    </label>
                    <select
                      value={formData.penanggung_biaya}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          penanggung_biaya: e.target.value as PenanggungBiayaEnum,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-xs"
                    >
                      {PENANGGUNG_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Status Penanganan Awal *
                    </label>
                    <select
                      value={formData.status_penanganan}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          status_penanganan: e.target.value as StatusPenangananEnum,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-xs"
                    >
                      <option value="dilaporkan">Dilaporkan (Menunggu review)</option>
                      <option value="dalam_investigasi">Dalam Investigasi</option>
                      <option value="dalam_perbaikan">Masuk Bengkel / Perbaikan</option>
                      <option value="selesai">Selesai Diperbaiki</option>
                      <option value="klaim_asuransi">Pengajuan Klaim Asuransi</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Tindakan Penanganan / Rencana Solusi
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Masuk Bengkel Kurnia Motor, target selesai 2 hari"
                      value={formData.tindakan_penanganan}
                      onChange={(e) => setFormData((prev) => ({ ...prev, tindakan_penanganan: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                      Catatan Tambahan / Rekomendasi
                    </label>
                    <input
                      type="text"
                      placeholder="Catatan tambahan untuk manajemen / instruktur..."
                      value={formData.catatan}
                      onChange={(e) => setFormData((prev) => ({ ...prev, catatan: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsInputModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border)] rounded-lg font-medium hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Menyimpan...' : editingInsiden ? 'Simpan Perubahan' : 'Simpan Data Insiden'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DETAIL DOSSIER INSIDEN ── */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card-container max-w-xl w-full bg-[var(--bg)] shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Dossier Insiden: {selectedDetail.kode_insiden}</span>
                </h3>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {formatHariTanggalIndo(selectedDetail.tanggal_insiden)} • {selectedDetail.jam_insiden} WIB
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    KEPARAHAN_CONFIG[selectedDetail.tingkat_keparahan]?.bg
                  } ${KEPARAHAN_CONFIG[selectedDetail.tingkat_keparahan]?.text} ${
                    KEPARAHAN_CONFIG[selectedDetail.tingkat_keparahan]?.border
                  }`}
                >
                  Tingkat Keparahan: {KEPARAHAN_CONFIG[selectedDetail.tingkat_keparahan]?.label}
                </span>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    STATUS_CONFIG[selectedDetail.status_penanganan]?.bg
                  } ${STATUS_CONFIG[selectedDetail.status_penanganan]?.text}`}
                >
                  Status: {STATUS_CONFIG[selectedDetail.status_penanganan]?.label}
                </span>
              </div>

              {/* Lokasi & Terlibat */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl">
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block font-semibold">
                    Lokasi Kejadian
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {selectedDetail.lokasi_kejadian}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block font-semibold">
                    Kategori Insiden
                  </span>
                  <span className="font-bold text-[var(--text-primary)] capitalize">
                    {selectedDetail.kategori.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block font-semibold">
                    Armada Mobil
                  </span>
                  <span className="font-bold text-[var(--brand-primary)]">
                    {selectedDetail.kendaraan
                      ? `${selectedDetail.kendaraan.nama_kendaraan} (${selectedDetail.kendaraan.plat_nomor})`
                      : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block font-semibold">
                    Instruktur & Siswa
                  </span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {selectedDetail.staff?.nama || '-'}
                    {selectedDetail.siswa ? ` • ${selectedDetail.siswa.nama}` : ''}
                  </span>
                </div>
              </div>

              {/* Kronologi */}
              <div className="space-y-1">
                <span className="font-bold text-xs text-[var(--text-primary)] block">
                  Deskripsi & Kronologi Kejadian:
                </span>
                <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl leading-relaxed whitespace-pre-wrap">
                  {selectedDetail.deskripsi_kejadian}
                </div>
              </div>

              {/* Kondisi Pasca Kejadian */}
              {(selectedDetail.kondisi_kendaraan || selectedDetail.kondisi_pengemudi) && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedDetail.kondisi_kendaraan && (
                    <div className="p-2.5 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] block">
                        Kondisi Armada:
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {selectedDetail.kondisi_kendaraan}
                      </span>
                    </div>
                  )}
                  {selectedDetail.kondisi_pengemudi && (
                    <div className="p-2.5 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] block">
                        Kondisi Pengemudi / Siswa:
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {selectedDetail.kondisi_pengemudi}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Finansial & Tindakan */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl">
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block">Estimasi Biaya</span>
                  <span className="font-bold text-base text-[var(--text-primary)]">
                    {formatRupiah(selectedDetail.estimasi_biaya || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block">Biaya Aktual Realisasi</span>
                  <span className="font-bold text-base text-emerald-600">
                    {selectedDetail.biaya_aktual ? formatRupiah(selectedDetail.biaya_aktual) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block">Penanggung Jawab</span>
                  <span className="font-bold text-xs text-[var(--brand-primary)] uppercase">
                    {selectedDetail.penanggung_biaya.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {selectedDetail.tindakan_penanganan && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block">
                    Tindakan Penanganan:
                  </span>
                  <span className="font-medium text-emerald-900 dark:text-emerald-200">
                    {selectedDetail.tindakan_penanganan}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 border border-[var(--border)] rounded-md font-medium"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={() => handleCopyWhatsApp(selectedDetail.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow"
              >
                {copiedId === selectedDetail.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === selectedDetail.id ? 'Tersalin!' : 'Salin Laporan WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL UPDATE STATUS CEPAT ── */}
      {statusModalInsiden && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Update Status Penanganan: {statusModalInsiden.kode_insiden}
              </h3>
              <button
                type="button"
                onClick={() => setStatusModalInsiden(null)}
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Status Baru *
                </label>
                <select
                  value={quickStatus}
                  onChange={(e) => setQuickStatus(e.target.value as StatusPenangananEnum)}
                  className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-bold text-xs"
                >
                  <option value="dilaporkan">Dilaporkan</option>
                  <option value="dalam_investigasi">Dalam Investigasi</option>
                  <option value="dalam_perbaikan">Dalam Perbaikan / Bengkel</option>
                  <option value="selesai">Selesai Diperbaiki</option>
                  <option value="klaim_asuransi">Klaim Asuransi</option>
                  <option value="ditolak">Ditolak / Batal</option>
                </select>
              </div>

              <div>
                <CurrencyInput
                  label="Biaya Aktual Realisasi (Rp)"
                  value={quickBiayaAktual}
                  onChange={(val) => setQuickBiayaAktual(val)}
                />
              </div>

              {quickBiayaAktual > 0 && (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={quickCatatKeKas}
                      onChange={(e) => setQuickCatatKeKas(e.target.checked)}
                      className="w-4 h-4 rounded text-[var(--brand-primary)] border-gray-300"
                    />
                    <span className="font-semibold text-xs text-[var(--text-primary)]">
                      Catat Pengeluaran ke Buku Kas Keuangan
                    </span>
                  </label>

                  {quickCatatKeKas && (
                    <div className="pt-2 border-t border-amber-200 dark:border-amber-900">
                      <span className="text-[11px] text-[var(--text-secondary)] font-semibold block mb-1">
                        Sumber Pembayaran Kas:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <label
                          className={`flex items-center justify-center gap-1.5 p-1.5 rounded-md border text-[11px] font-semibold cursor-pointer transition-all ${
                            quickJenisPembayaran === 'non_tunai'
                              ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)]'
                              : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="inc_pay_metode"
                            value="non_tunai"
                            checked={quickJenisPembayaran === 'non_tunai'}
                            onChange={() => setQuickJenisPembayaran('non_tunai')}
                            className="sr-only"
                          />
                          <span>Transfer Bank</span>
                        </label>

                        <label
                          className={`flex items-center justify-center gap-1.5 p-1.5 rounded-md border text-[11px] font-semibold cursor-pointer transition-all ${
                            quickJenisPembayaran === 'tunai'
                              ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                              : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="inc_pay_metode"
                            value="tunai"
                            checked={quickJenisPembayaran === 'tunai'}
                            onChange={() => setQuickJenisPembayaran('tunai')}
                            className="sr-only"
                          />
                          <span>Kas Tunai</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Catatan Tindakan / Progres Penanganan
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Bodi sudah di-cat ulang di bengkel, mobil siap beroperasi kembali..."
                  value={quickTindakan}
                  onChange={(e) => setQuickTindakan(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setStatusModalInsiden(null)}
                className="px-4 py-2 border border-[var(--border)] rounded-md font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveQuickStatus}
                disabled={submitting}
                className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-bold rounded-md shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Perbarui Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        title="Hapus Data Insiden"
        description="Apakah Anda yakin ingin menghapus catatan insiden ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Insiden"
        isDanger={true}
        onConfirm={handleExecuteDelete}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}
