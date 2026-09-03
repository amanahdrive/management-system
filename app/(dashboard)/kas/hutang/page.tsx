'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Hutang } from '@/types/database';
import {
  getHutangList,
  addHutang,
  updateHutang,
  deleteHutang,
  payHutangCicilan,
  getHutangPembayaranList,
  updateHutangPembayaran,
  deleteHutangPembayaran,
  HutangPembayaranDetail,
} from '@/lib/actions/kas';
import { formatRupiah } from '@/lib/utils/currency';
import { getTodayDateString, formatDateIndo, getJakartaDateParts, addDaysToDateStr } from '@/lib/utils/date';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { StatCard } from '@/components/shared/StatCard';
import {
  Plus,
  CreditCard,
  ArrowLeft,
  Pencil,
  Trash2,
  History,
  FileText,
  CheckCircle2,
  Calendar,
  Search,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

type PeriodOption = 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';

export default function HutangPage() {
  const [hutangList, setHutangList] = React.useState<Hutang[]>([]);
  const [pembayaranList, setPembayaranList] = React.useState<HutangPembayaranDetail[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'hutang' | 'cicilan'>('hutang');

  // Period Filter State
  const [period, setPeriod] = React.useState<PeriodOption>('all');
  const [customStart, setCustomStart] = React.useState<string>('');
  const [customEnd, setCustomEnd] = React.useState<string>('');

  // Status & Search Filter States
  const [statusFilterHutang, setStatusFilterHutang] = React.useState<'all' | 'berjalan' | 'lunas'>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Modals for Hutang
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [payModalHutang, setPayModalHutang] = React.useState<Hutang | null>(null);
  const [editHutang, setEditHutang] = React.useState<Hutang | null>(null);
  const [deletingHutang, setDeletingHutang] = React.useState<Hutang | null>(null);

  // Modals for Cicilan
  const [editPembayaran, setEditPembayaran] = React.useState<HutangPembayaranDetail | null>(null);
  const [deletingPembayaran, setDeletingPembayaran] = React.useState<HutangPembayaranDetail | null>(null);

  // Form Inputs - Add Hutang
  const [newHutang, setNewHutang] = React.useState<Partial<Hutang>>({
    nama_hutang: '',
    jenis: 'cicilan_kendaraan',
    total_hutang: 0,
    tanggal_mulai: getTodayDateString(),
    jatuh_tempo_bulanan: 10,
    cicilan_per_bulan: 0,
  });

  // Form Inputs - Edit Hutang
  const [editHutangForm, setEditHutangForm] = React.useState<Partial<Hutang>>({});

  // Form Inputs - Pay Cicilan
  const [bayarTanggal, setBayarTanggal] = React.useState(getTodayDateString());
  const [bayarNominal, setBayarNominal] = React.useState(0);
  const [bayarMetode, setBayarMetode] = React.useState<'tunai' | 'non_tunai'>('non_tunai');

  // Form Inputs - Edit Cicilan
  const [editCicilanNominal, setEditCicilanNominal] = React.useState(0);
  const [editCicilanTanggal, setEditCicilanTanggal] = React.useState(getTodayDateString());
  const [editCicilanMetode, setEditCicilanMetode] = React.useState<'tunai' | 'non_tunai'>('non_tunai');

  const loadData = async () => {
    setLoading(true);
    try {
      const [hList, pList] = await Promise.allSettled([
        getHutangList(),
        getHutangPembayaranList(),
      ]);

      if (hList.status === 'fulfilled') setHutangList(hList.value);
      if (pList.status === 'fulfilled') setPembayaranList(pList.value);
    } catch (err) {
      console.error('Error loading hutang & cicilan data:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // Compute Period Bounds
  const periodBounds = React.useMemo(() => {
    const todayStr = getTodayDateString();
    const parts = getJakartaDateParts(todayStr);
    const curYear = parts?.year ?? new Date().getFullYear();
    const curMonth = parts?.month ?? (new Date().getMonth() + 1);

    if (period === 'this_month') {
      const start = `${curYear}-${String(curMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(curYear, curMonth, 0).getDate();
      const end = `${curYear}-${String(curMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { start, end, label: `Bulan Ini (${String(curMonth).padStart(2, '0')}/${curYear})` };
    }
    if (period === 'last_month') {
      const lastMonthYear = curMonth === 1 ? curYear - 1 : curYear;
      const lastMonthNum = curMonth === 1 ? 12 : curMonth - 1;
      const start = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}-01`;
      const lastDay = new Date(lastMonthYear, lastMonthNum, 0).getDate();
      const end = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { start, end, label: `Bulan Lalu (${String(lastMonthNum).padStart(2, '0')}/${lastMonthYear})` };
    }
    if (period === 'this_year') {
      const start = `${curYear}-01-01`;
      const end = `${curYear}-12-31`;
      return { start, end, label: `Tahun ${curYear}` };
    }
    if (period === 'custom' && customStart && customEnd) {
      const maxEnd = addDaysToDateStr(customStart, 180);
      const clampedEnd = customEnd > maxEnd ? maxEnd : customEnd < customStart ? customStart : customEnd;
      return { start: customStart, end: clampedEnd, label: `${formatDateIndo(customStart)} – ${formatDateIndo(clampedEnd)}` };
    }
    return { start: null, end: null, label: 'Semua Periode' };
  }, [period, customStart, customEnd]);

  // Filtered Hutang List
  const filteredHutangList = React.useMemo(() => {
    return hutangList.filter((h) => {
      // Period filter
      if (periodBounds.start && periodBounds.end) {
        const tgl = (h.tanggal_mulai || '').slice(0, 10);
        if (tgl && (tgl < periodBounds.start || tgl > periodBounds.end)) {
          return false;
        }
      }

      // Status filter
      if (statusFilterHutang === 'berjalan' && h.status !== 'berjalan') return false;
      if (statusFilterHutang === 'lunas' && h.status !== 'lunas') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = h.nama_hutang?.toLowerCase().includes(q);
        const matchJenis = h.jenis?.toLowerCase().includes(q);
        if (!matchNama && !matchJenis) return false;
      }

      return true;
    });
  }, [hutangList, periodBounds, statusFilterHutang, searchQuery]);

  // Filtered Pembayaran Cicilan List
  const filteredPembayaranList = React.useMemo(() => {
    return pembayaranList.filter((p) => {
      // Period filter
      if (periodBounds.start && periodBounds.end) {
        const tgl = (p.tanggal_bayar || '').slice(0, 10);
        if (tgl && (tgl < periodBounds.start || tgl > periodBounds.end)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = p.nama_hutang?.toLowerCase().includes(q);
        const matchPic = p.pic_nama?.toLowerCase().includes(q);
        if (!matchNama && !matchPic) return false;
      }

      return true;
    });
  }, [pembayaranList, periodBounds, searchQuery]);

  // Summary Metrics
  const totalHutangKeseluruhan = React.useMemo(
    () => filteredHutangList.reduce((sum, h) => sum + (Number(h.total_hutang) || 0), 0),
    [filteredHutangList]
  );
  const totalSisaHutang = React.useMemo(
    () => filteredHutangList.filter((h) => h.status === 'berjalan').reduce((sum, h) => sum + (Number(h.sisa_hutang) || 0), 0),
    [filteredHutangList]
  );
  const totalCicilanTerbayar = React.useMemo(
    () => filteredPembayaranList.reduce((sum, p) => sum + (Number(p.nominal) || 0), 0),
    [filteredPembayaranList]
  );

  // Submit Handlers - Hutang
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHutang.nama_hutang || !newHutang.total_hutang) return;
    await addHutang(newHutang);
    setIsAddModalOpen(false);
    setNewHutang({
      nama_hutang: '',
      jenis: 'cicilan_kendaraan',
      total_hutang: 0,
      tanggal_mulai: getTodayDateString(),
      jatuh_tempo_bulanan: 10,
      cicilan_per_bulan: 0,
    });
    loadData();
  };

  const handleEditOpen = (h: Hutang) => {
    setEditHutang(h);
    setEditHutangForm({
      nama_hutang: h.nama_hutang,
      jenis: h.jenis,
      total_hutang: h.total_hutang,
      sisa_hutang: h.sisa_hutang,
      jatuh_tempo_bulanan: h.jatuh_tempo_bulanan || 10,
      cicilan_per_bulan: h.cicilan_per_bulan || 0,
      status: h.status,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHutang) return;
    await updateHutang(editHutang.id, editHutangForm);
    setEditHutang(null);
    loadData();
  };

  const handleDeleteHutangConfirm = async () => {
    if (!deletingHutang) return;
    await deleteHutang(deletingHutang.id);
    setDeletingHutang(null);
    loadData();
  };

  // Submit Handlers - Cicilan
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalHutang || bayarNominal <= 0) return;
    await payHutangCicilan(payModalHutang.id, bayarTanggal, bayarNominal, bayarMetode);
    setPayModalHutang(null);
    loadData();
  };

  const handleEditPembayaranOpen = (p: HutangPembayaranDetail) => {
    setEditPembayaran(p);
    setEditCicilanNominal(Number(p.nominal) || 0);
    setEditCicilanTanggal(p.tanggal_bayar ? p.tanggal_bayar.slice(0, 10) : getTodayDateString());
    setEditCicilanMetode(p.jenis_pembayaran === 'tunai' ? 'tunai' : 'non_tunai');
  };

  const handleEditPembayaranSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPembayaran || editCicilanNominal <= 0) return;
    await updateHutangPembayaran(editPembayaran.id, {
      nominal: editCicilanNominal,
      tanggal_bayar: editCicilanTanggal,
      jenis_pembayaran: editCicilanMetode,
    });
    setEditPembayaran(null);
    loadData();
  };

  const handleDeletePembayaranConfirm = async () => {
    if (!deletingPembayaran) return;
    await deleteHutangPembayaran(deletingPembayaran.id);
    setDeletingPembayaran(null);
    loadData();
  };

  // Table Columns - Hutang
  const hutangColumns: ColumnDef<Hutang>[] = [
    { accessorKey: 'nama_hutang', header: 'Nama Hutang / Cicilan', sortingFn: 'text' },
    {
      accessorKey: 'jenis',
      header: 'Jenis',
      sortingFn: 'text',
      cell: ({ row }) =>
        row.original.jenis === 'cicilan_kendaraan'
          ? 'Cicilan Kendaraan'
          : row.original.jenis === 'pinjaman_perusahaan'
          ? 'Pinjaman Modal'
          : 'Lainnya',
    },
    {
      accessorKey: 'total_hutang',
      header: 'Total Hutang',
      sortingFn: 'basic',
      cell: ({ row }) => formatRupiah(row.original.total_hutang),
    },
    {
      accessorKey: 'sisa_hutang',
      header: 'Sisa Hutang',
      sortingFn: 'basic',
      cell: ({ row }) => (
        <span className="font-bold text-rose-700">{formatRupiah(row.original.sisa_hutang)}</span>
      ),
    },
    {
      accessorKey: 'jatuh_tempo_bulanan',
      header: 'Jatuh Tempo',
      sortingFn: 'basic',
      cell: ({ row }) => `Tgl ${row.original.jatuh_tempo_bulanan || '-'} tiap bulan`,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      sortingFn: 'text',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-xs rounded font-bold uppercase ${
            row.original.status === 'lunas'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setPayModalHutang(row.original);
              setBayarNominal(row.original.cicilan_per_bulan || 0);
            }}
            disabled={row.original.status === 'lunas'}
            className="flex items-center gap-1 px-2.5 py-1 bg-[var(--brand-primary)] text-white text-xs font-semibold rounded hover:bg-[var(--brand-primary-dark)] disabled:opacity-40 transition-colors"
            title="Bayar Cicilan"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Bayar Cicilan</span>
          </button>

          <button
            onClick={() => handleEditOpen(row.original)}
            className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition-colors border border-amber-200 dark:border-amber-900"
            title="Edit Hutang"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setDeletingHutang(row.original)}
            className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors border border-rose-200 dark:border-rose-900"
            title="Hapus Hutang"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  // Table Columns - Cicilan Pembayaran
  const cicilanColumns: ColumnDef<HutangPembayaranDetail>[] = [
    {
      accessorKey: 'tanggal_bayar',
      header: 'Tanggal Bayar',
      sortingFn: 'text',
      cell: ({ row }) => formatDateIndo(row.original.tanggal_bayar),
    },
    {
      accessorKey: 'nama_hutang',
      header: 'Hutang / Cicilan',
      sortingFn: 'text',
      cell: ({ row }) => (
        <span className="font-semibold text-[var(--text-primary)]">
          {row.original.nama_hutang || 'Hutang Perusahaan'}
        </span>
      ),
    },
    {
      accessorKey: 'nominal',
      header: 'Nominal Cicilan',
      sortingFn: 'basic',
      cell: ({ row }) => (
        <span className="font-bold text-emerald-700 dark:text-emerald-400">
          {formatRupiah(row.original.nominal)}
        </span>
      ),
    },
    {
      accessorKey: 'jenis_pembayaran',
      header: 'Metode',
      sortingFn: 'text',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-xs rounded font-semibold ${
            row.original.jenis_pembayaran === 'tunai'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
          }`}
        >
          {row.original.jenis_pembayaran === 'tunai' ? 'Tunai (Kas)' : 'Non-Tunai (Bank)'}
        </span>
      ),
    },
    {
      accessorKey: 'pic_nama',
      header: 'PIC Transaksi',
      sortingFn: 'text',
      cell: ({ row }) => row.original.pic_nama || 'Finance',
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleEditPembayaranOpen(row.original)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-800 rounded transition-colors"
            title="Edit Riwayat Cicilan"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>

          <button
            onClick={() => setDeletingPembayaran(row.original)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-300 dark:border-rose-800 rounded transition-colors"
            title="Hapus Riwayat Cicilan"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <PinGateDialog>
      <div className="space-y-6">
        <PageHeader
          title="Manajemen Hutang & Cicilan"
          description="Pencatatan pinjaman modal & cicilan armada kendaraan Amanah Drive dengan fitur edit, hapus, dan riwayat pembayaran"
          breadcrumbs={[{ label: 'Kas', href: '/kas' }, { label: 'Hutang' }]}
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/kas/piutang"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors"
              >
                <span>Piutang Siswa</span>
              </Link>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ Catat Hutang Baru</span>
              </button>
              <Link
                href="/kas"
                className="px-3 py-1.5 border border-[var(--border)] rounded-md text-xs font-medium flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </Link>
            </div>
          }
        />

        {/* Filter Bar Periode (Standar Analitik) */}
        <div className="card-container p-4 space-y-3 border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Filter Periode:</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] text-[11px] font-mono font-bold text-[var(--brand-primary)]">
                {periodBounds.label}
              </span>
            </div>

            {/* Quick Period Buttons */}
            <div className="flex items-center p-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-xs font-semibold flex-wrap">
              {(
                [
                  { key: 'this_month', label: 'Bulan Ini' },
                  { key: 'last_month', label: 'Bulan Lalu' },
                  { key: 'this_year', label: 'Tahun Ini' },
                  { key: 'all', label: 'Semua' },
                  { key: 'custom', label: 'Kustom' },
                ] as const
              ).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1 rounded-md transition-all text-xs ${
                    period === p.key
                      ? 'bg-[var(--brand-primary)] text-white shadow-xs font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Bar with 6 Months Limiter */}
          {period === 'custom' && (
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-2 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DatePickerWIB
                  label="Tanggal Awal"
                  value={customStart}
                  onChange={(val) => {
                    setCustomStart(val);
                    if (val && customEnd) {
                      const maxEnd = addDaysToDateStr(val, 180);
                      if (customEnd < val) setCustomEnd(val);
                      else if (customEnd > maxEnd) setCustomEnd(maxEnd);
                    }
                  }}
                />
                <DatePickerWIB
                  label="Tanggal Akhir (Maksimal 6 Bulan dari Awal)"
                  value={customEnd}
                  onChange={(val) => {
                    if (customStart && val) {
                      const maxEnd = addDaysToDateStr(customStart, 180);
                      if (val > maxEnd) {
                        setCustomEnd(maxEnd);
                      } else if (val < customStart) {
                        setCustomEnd(customStart);
                      } else {
                        setCustomEnd(val);
                      }
                    } else {
                      setCustomEnd(val);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Search & Status Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={activeTab === 'hutang' ? 'Cari nama hutang, jenis pinjaman...' : 'Cari riwayat cicilan, PIC, nama hutang...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] w-full focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>

            <div>
              <select
                value={statusFilterHutang}
                onChange={(e) => setStatusFilterHutang(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              >
                <option value="all">Semua Status Hutang</option>
                <option value="berjalan">Hutang Berjalan (Belum Lunas)</option>
                <option value="lunas">Hutang Lunas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Hutang Tercatat"
            value={formatRupiah(totalHutangKeseluruhan)}
            icon={<FileText className="w-5 h-5 text-rose-600" />}
            description={`${filteredHutangList.length} hutang sesuai filter aktif`}
          />
          <StatCard
            label="Sisa Hutang Berjalan"
            value={formatRupiah(totalSisaHutang)}
            icon={<CreditCard className="w-5 h-5 text-amber-600" />}
            description="Kewajiban perusahaan belum lunas"
          />
          <StatCard
            label="Total Cicilan Terbayar"
            value={formatRupiah(totalCicilanTerbayar)}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            description={`${filteredPembayaranList.length} kali pembayaran cicilan`}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border)] gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('hutang')}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'hutang'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Daftar Hutang & Cicilan ({filteredHutangList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cicilan')}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'cicilan'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Cicilan Terbayar ({filteredPembayaranList.length})</span>
          </button>
        </div>

        {/* Tab 1: Daftar Hutang */}
        {activeTab === 'hutang' && (
          <div className="card-container">
            {loading ? (
              <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
            ) : (
              <DataTable columns={hutangColumns} data={filteredHutangList} initialPageSize={10} />
            )}
          </div>
        )}

        {/* Tab 2: Riwayat Pembayaran Cicilan */}
        {activeTab === 'cicilan' && (
          <div className="card-container">
            {loading ? (
              <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
            ) : (
              <DataTable columns={cicilanColumns} data={filteredPembayaranList} initialPageSize={10} />
            )}
          </div>
        )}

        {/* Modal Tambah Hutang */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-lg space-y-4 animate-fadeIn">
              <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
                Tambah Catatan Hutang Baru
              </h3>
              <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">
                    Nama Hutang / Pinjaman *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Cicilan Kendaraan Xenia Hitam"
                    value={newHutang.nama_hutang || ''}
                    onChange={(e) => setNewHutang({ ...newHutang, nama_hutang: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[var(--text-secondary)] mb-1">
                      Jenis Hutang *
                    </label>
                    <select
                      value={newHutang.jenis}
                      onChange={(e) => setNewHutang({ ...newHutang, jenis: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)]"
                    >
                      <option value="cicilan_kendaraan">Cicilan Kendaraan</option>
                      <option value="pinjaman_perusahaan">Pinjaman Modal</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-[var(--text-secondary)] mb-1">
                      Jatuh Tempo Bulanan
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={newHutang.jatuh_tempo_bulanan || 10}
                      onChange={(e) =>
                        setNewHutang({
                          ...newHutang,
                          jatuh_tempo_bulanan: parseInt(e.target.value) || 10,
                        })
                      }
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)]"
                    />
                  </div>
                </div>

                <CurrencyInput
                  label="Total Nominal Hutang *"
                  value={newHutang.total_hutang}
                  onChange={(val) => setNewHutang({ ...newHutang, total_hutang: val })}
                />

                <CurrencyInput
                  label="Estimasi Cicilan per Bulan"
                  value={newHutang.cicilan_per_bulan}
                  onChange={(val) => setNewHutang({ ...newHutang, cicilan_per_bulan: val })}
                />

                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 border border-[var(--border)] rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 font-semibold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-md shadow-sm transition-colors"
                  >
                    Simpan Hutang
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit Hutang */}
        {editHutang && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-lg space-y-4 animate-fadeIn">
              <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-600" />
                <span>Edit Data Hutang</span>
              </h3>
              <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">
                    Nama Hutang / Pinjaman *
                  </label>
                  <input
                    type="text"
                    required
                    value={editHutangForm.nama_hutang || ''}
                    onChange={(e) => setEditHutangForm({ ...editHutangForm, nama_hutang: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[var(--text-secondary)] mb-1">
                      Jenis Hutang *
                    </label>
                    <select
                      value={editHutangForm.jenis}
                      onChange={(e) => setEditHutangForm({ ...editHutangForm, jenis: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)]"
                    >
                      <option value="cicilan_kendaraan">Cicilan Kendaraan</option>
                      <option value="pinjaman_perusahaan">Pinjaman Modal</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-[var(--text-secondary)] mb-1">
                      Status Pelunasan *
                    </label>
                    <select
                      value={editHutangForm.status}
                      onChange={(e) => setEditHutangForm({ ...editHutangForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold"
                    >
                      <option value="berjalan">Berjalan (Belum Lunas)</option>
                      <option value="lunas">Lunas</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <CurrencyInput
                    label="Total Hutang *"
                    value={editHutangForm.total_hutang}
                    onChange={(val) => setEditHutangForm({ ...editHutangForm, total_hutang: val })}
                  />
                  <CurrencyInput
                    label="Sisa Hutang Aktif *"
                    value={editHutangForm.sisa_hutang}
                    onChange={(val) => setEditHutangForm({ ...editHutangForm, sisa_hutang: val })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <CurrencyInput
                    label="Cicilan per Bulan"
                    value={editHutangForm.cicilan_per_bulan}
                    onChange={(val) => setEditHutangForm({ ...editHutangForm, cicilan_per_bulan: val })}
                  />
                  <div>
                    <label className="block font-medium text-[var(--text-secondary)] mb-1">
                      Tgl Jatuh Tempo
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={editHutangForm.jatuh_tempo_bulanan || 10}
                      onChange={(e) =>
                        setEditHutangForm({
                          ...editHutangForm,
                          jatuh_tempo_bulanan: parseInt(e.target.value) || 10,
                        })
                      }
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditHutang(null)}
                    className="px-3 py-1.5 border border-[var(--border)] rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-sm transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Bayar Cicilan */}
        {payModalHutang && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card-container max-w-sm w-full bg-[var(--bg)] shadow-lg space-y-4 animate-fadeIn">
              <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
                Bayar Cicilan — {payModalHutang.nama_hutang}
              </h3>
              <form onSubmit={handlePaySubmit} className="space-y-3 text-xs">
                <DatePickerWIB label="Tanggal Bayar *" value={bayarTanggal} onChange={setBayarTanggal} />

                <CurrencyInput
                  label="Nominal Pembayaran Cicilan *"
                  value={bayarNominal}
                  onChange={setBayarNominal}
                />

                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md">
                  Sisa Hutang Saat Ini: <span className="font-bold text-rose-600">{formatRupiah(payModalHutang.sisa_hutang)}</span>
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Metode Pembayaran Kas *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`flex items-center justify-center gap-1.5 p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                        bayarMetode === 'non_tunai'
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)]'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="hutang_pay_metode"
                        value="non_tunai"
                        checked={bayarMetode === 'non_tunai'}
                        onChange={() => setBayarMetode('non_tunai')}
                        className="sr-only"
                      />
                      <span>Rekening Bank</span>
                    </label>

                    <label
                      className={`flex items-center justify-center gap-1.5 p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                        bayarMetode === 'tunai'
                          ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="hutang_pay_metode"
                        value="tunai"
                        checked={bayarMetode === 'tunai'}
                        onChange={() => setBayarMetode('tunai')}
                        className="sr-only"
                      />
                      <span>Kas Fisik (Tunai)</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setPayModalHutang(null)}
                    className="px-3 py-1.5 border border-[var(--border)] rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 font-semibold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-md shadow-sm transition-colors"
                  >
                    Proses Pembayaran
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Edit Cicilan */}
        {editPembayaran && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card-container max-w-sm w-full bg-[var(--bg)] shadow-lg space-y-4 animate-fadeIn">
              <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-600" />
                <span>Edit Pembayaran Cicilan</span>
              </h3>
              <form onSubmit={handleEditPembayaranSubmit} className="space-y-3 text-xs">
                <div className="p-2 bg-[var(--bg-subtle)] border border-[var(--border)] rounded">
                  <span className="text-[var(--text-secondary)] block text-[10px]">Hutang Terkait:</span>
                  <span className="font-bold text-[var(--text-primary)]">{editPembayaran.nama_hutang}</span>
                </div>

                <DatePickerWIB
                  label="Tanggal Pembayaran *"
                  value={editCicilanTanggal}
                  onChange={setEditCicilanTanggal}
                />

                <CurrencyInput
                  label="Nominal Pembayaran (Rp) *"
                  value={editCicilanNominal}
                  onChange={setEditCicilanNominal}
                />

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditCicilanMetode('non_tunai')}
                      className={`py-1.5 rounded-md border text-xs font-semibold transition-all ${
                        editCicilanMetode === 'non_tunai'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)]'
                      }`}
                    >
                      Non-Tunai (Bank)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCicilanMetode('tunai')}
                      className={`py-1.5 rounded-md border text-xs font-semibold transition-all ${
                        editCicilanMetode === 'tunai'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)]'
                      }`}
                    >
                      Tunai (Kas Fisik)
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditPembayaran(null)}
                    className="px-3 py-1.5 border border-[var(--border)] rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md shadow-sm transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Dialog Hapus Hutang */}
        <ConfirmDialog
          isOpen={!!deletingHutang}
          onClose={() => setDeletingHutang(null)}
          onConfirm={handleDeleteHutangConfirm}
          title="Hapus Catatan Hutang"
          description={`Apakah Anda yakin ingin menghapus data hutang "${deletingHutang?.nama_hutang}"? Riwayat pembayaran cicilan hutang ini juga akan dihapus.`}
          confirmText="Hapus Hutang"
          isDanger
        />

        {/* Confirm Dialog Hapus Cicilan */}
        <ConfirmDialog
          isOpen={!!deletingPembayaran}
          onClose={() => setDeletingPembayaran(null)}
          onConfirm={handleDeletePembayaranConfirm}
          title="Hapus Riwayat Cicilan"
          description={`Apakah Anda yakin ingin menghapus catatan pembayaran cicilan sebesar ${formatRupiah(
            deletingPembayaran?.nominal || 0
          )}? Sisa hutang perusahaan akan otomatis dikembalikan (bertambah) sebesar nominal ini.`}
          confirmText="Hapus Cicilan & Kembalikan Hutang"
          isDanger
        />
      </div>
    </PinGateDialog>
  );
}
