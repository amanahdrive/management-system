'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Siswa, Paket } from '@/types/database';
import { getSimSiswaList, getSimMetricsSummary, updateStatusSim, SimMetricsSummary } from '@/lib/actions/sim';
import { getPaketList } from '@/lib/actions/master-data';
import { formatDateIndo, getTodayDateString, addDaysToDateStr } from '@/lib/utils/date';
import { formatRupiah } from '@/lib/utils/currency';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import {
  IdCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  ArrowUpDown,
  MessageCircle,
  ExternalLink,
  Archive,
  Layers,
  Sparkles,
  Edit2,
  Check,
  AlertTriangle,
  Receipt,
} from 'lucide-react';

type TabView = 'active' | 'archived' | 'all';
type DatePreset = 'all' | 'month' | '30days' | 'custom';
type SortField = 'tanggal_booking' | 'nama' | 'paket' | 'status_pembayaran' | 'status_sim' | 'tanggal_selesai_sim';

export default function ManajemenSimPage() {
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [metrics, setMetrics] = React.useState<SimMetricsSummary>({
    totalSim: 0,
    totalBelumSelesai: 0,
    totalSelesai: 0,
    totalSiapTerbit: 0,
    totalMenungguPelunasan: 0,
  });
  const [loading, setLoading] = React.useState(true);

  // Tab View: 'active' (belum selesai), 'archived' (selesai), 'all' (semua)
  const [currentTab, setCurrentTab] = React.useState<TabView>('active');

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterPembayaran, setFilterPembayaran] = React.useState<string>('all');
  const [filterPaket, setFilterPaket] = React.useState<string>('all');
  const [datePreset, setDatePreset] = React.useState<DatePreset>('all');
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');

  // Sorting (Default: tanggal_booking ASC - dari tanggal paling awal ke terbaru)
  const [sortField, setSortField] = React.useState<SortField>('tanggal_booking');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  // Modal State for Changing SIM Status
  const [selectedSiswa, setSelectedSiswa] = React.useState<Siswa | null>(null);
  const [modalTargetStatus, setModalTargetStatus] = React.useState<'belum' | 'selesai'>('selesai');
  const [modalTanggalSelesai, setModalTanggalSelesai] = React.useState<string>(getTodayDateString());
  const [modalCatatanSim, setModalCatatanSim] = React.useState<string>('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [modalError, setModalError] = React.useState<string | null>(null);

  // Modal Alert for Unpaid Student
  const [unpaidAlertStudent, setUnpaidAlertStudent] = React.useState<Siswa | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [students, metricsData, packages] = await Promise.all([
        getSimSiswaList({
          startDate: datePreset !== 'all' && startDate ? startDate : undefined,
          endDate: datePreset !== 'all' && endDate ? endDate : undefined,
          paketId: filterPaket !== 'all' ? filterPaket : undefined,
        }),
        getSimMetricsSummary(),
        getPaketList(),
      ]);
      setSiswaList(students);
      setMetrics(metricsData);
      setPaketList(packages.filter((p) => p.termasuk_sim));
    } catch (e) {
      console.error('Error loading SIM data:', e);
    } finally {
      setLoading(false);
    }
  }, [datePreset, startDate, endDate, filterPaket]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Preset Changes
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = getTodayDateString();
    if (preset === 'month') {
      const startOfMonth = today.slice(0, 8) + '01';
      setStartDate(startOfMonth);
      setEndDate(today);
    } else if (preset === '30days') {
      setStartDate(addDaysToDateStr(today, -30));
      setEndDate(today);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Toggle Sorting
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Open Modal to Change Status
  const handleOpenChangeStatus = (siswa: Siswa) => {
    // If attempting to mark as completed, but student hasn't paid in full
    if (siswa.status_sim !== 'selesai' && siswa.status_pembayaran_kode !== 'lunas') {
      setUnpaidAlertStudent(siswa);
      return;
    }

    setSelectedSiswa(siswa);
    setModalTargetStatus(siswa.status_sim === 'selesai' ? 'belum' : 'selesai');
    setModalTanggalSelesai(siswa.tanggal_selesai_sim || getTodayDateString());
    setModalCatatanSim(siswa.catatan_sim || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveStatusSim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa) return;

    setSaving(true);
    setModalError(null);

    const res = await updateStatusSim(
      selectedSiswa.id,
      modalTargetStatus,
      modalTargetStatus === 'selesai' ? modalTanggalSelesai : null,
      modalCatatanSim
    );

    setSaving(false);
    if (res.success) {
      setIsModalOpen(false);
      setSelectedSiswa(null);
      loadData();
    } else {
      setModalError(res.error || 'Gagal memperbarui status SIM.');
    }
  };

  // Filtered & Sorted Students
  const filteredStudents = React.useMemo(() => {
    return siswaList.filter((s) => {
      // Tab Filtering
      if (currentTab === 'active') {
        if (s.status_sim === 'selesai' || s.is_archived) return false;
      } else if (currentTab === 'archived') {
        if (s.status_sim !== 'selesai' && !s.is_archived) return false;
      }

      // Status Pembayaran Filter
      if (filterPembayaran !== 'all') {
        if (filterPembayaran === 'lunas' && s.status_pembayaran_kode !== 'lunas') return false;
        if (filterPembayaran === 'belum_lunas' && s.status_pembayaran_kode === 'lunas') return false;
        if (filterPembayaran === 'dp' && s.status_pembayaran_kode !== 'dp') return false;
        if (filterPembayaran === 'belum_bayar' && s.status_pembayaran_kode !== 'belum_bayar') return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nama = (s.nama || '').toLowerCase();
        const wa = (s.no_whatsapp || '').toLowerCase();
        const kode = (s.kode_siswa || '').toLowerCase();
        const paket = (s.paket?.nama_paket || '').toLowerCase();
        const alamat = (s.alamat || '').toLowerCase();
        const catatan = (s.catatan || '').toLowerCase();
        const catatanSim = (s.catatan_sim || '').toLowerCase();

        if (
          !nama.includes(q) &&
          !wa.includes(q) &&
          !kode.includes(q) &&
          !paket.includes(q) &&
          !alamat.includes(q) &&
          !catatan.includes(q) &&
          !catatanSim.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [siswaList, currentTab, filterPembayaran, searchQuery]);

  const sortedStudents = React.useMemo(() => {
    const list = [...filteredStudents];
    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'tanggal_booking') {
        valA = new Date(a.tanggal_booking).getTime();
        valB = new Date(b.tanggal_booking).getTime();
      } else if (sortField === 'nama') {
        valA = a.nama.toLowerCase();
        valB = b.nama.toLowerCase();
      } else if (sortField === 'paket') {
        valA = (a.paket?.nama_paket || '').toLowerCase();
        valB = (b.paket?.nama_paket || '').toLowerCase();
      } else if (sortField === 'status_pembayaran') {
        valA = a.status_pembayaran_kode;
        valB = b.status_pembayaran_kode;
      } else if (sortField === 'status_sim') {
        valA = a.status_sim || 'belum';
        valB = b.status_sim || 'belum';
      } else if (sortField === 'tanggal_selesai_sim') {
        valA = a.tanggal_selesai_sim ? new Date(a.tanggal_selesai_sim).getTime() : 0;
        valB = b.tanggal_selesai_sim ? new Date(b.tanggal_selesai_sim).getTime() : 0;
      }

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
    return list;
  }, [filteredStudents, sortField, sortOrder]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen SIM Siswa"
        description="Kelola penerbitan SIM, validasi status pelunasan siswa, dan arsip berkas SIM selesai terbit"
      />

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Siswa SIM */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-[var(--brand-primary)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Total Siswa Paket SIM
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
              <IdCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tabular-nums">
            {metrics.totalSim} <span className="text-xs font-semibold">Orang</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Mengambil paket kursus + SIM
          </div>
        </div>

        {/* SIM Belum Selesai (Pending) */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-amber-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              SIM Belum Selesai
            </span>
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 tabular-nums">
            {metrics.totalBelumSelesai} <span className="text-xs font-semibold">Proses</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
            <span>{metrics.totalMenungguPelunasan} menunggu pelunasan</span>
          </div>
        </div>

        {/* Siap Terbit (Prioritas / Sudah Lunas) */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-blue-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Siap Selesai (Lunas)
            </span>
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 tabular-nums">
            {metrics.totalSiapTerbit} <span className="text-xs font-semibold">Siap Proses</span>
          </div>
          <div className="text-[11px] text-blue-600 font-semibold">
            Sudah lunas & siap diterbitkan
          </div>
        </div>

        {/* SIM Selesai (Arsip) */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              SIM Selesai (Arsip)
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 tabular-nums">
            {metrics.totalSelesai} <span className="text-xs font-semibold">Selesai</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">
            Telah diterbitkan & diarsipkan
          </div>
        </div>
      </div>

      {/* Main Container: Tabs, Filters, and Table */}
      <div className="card-container space-y-4 p-5">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentTab('active')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'active'
                  ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>SIM Aktif / Belum Selesai</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                {metrics.totalBelumSelesai}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('archived')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'archived'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Daftar Arsip Selesai</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                {metrics.totalSelesai}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'all'
                  ? 'bg-[var(--text-primary)] text-[var(--bg)] shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua Siswa SIM</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                {metrics.totalSim}
              </span>
            </button>
          </div>

          <div className="text-xs text-[var(--text-secondary)]">
            Menampilkan <strong className="text-[var(--text-primary)]">{sortedStudents.length}</strong> data siswa (Urutan tanggal daftar awal &rarr; akhir)
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama, WA, kode, paket..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
              />
              <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-2.5 top-2.5" />
            </div>

            {/* Filter Status Pembayaran */}
            <div>
              <select
                value={filterPembayaran}
                onChange={(e) => setFilterPembayaran(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)]"
              >
                <option value="all">Semua Status Pembayaran</option>
                <option value="lunas">LUNAS (Siap Diterbitkan)</option>
                <option value="belum_lunas">BELUM LUNAS (DP / Belum Bayar)</option>
                <option value="dp">DP Saja</option>
                <option value="belum_bayar">Belum Bayar</option>
              </select>
            </div>

            {/* Filter Paket Kursus */}
            <div>
              <select
                value={filterPaket}
                onChange={(e) => setFilterPaket(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)]"
              >
                <option value="all">Semua Paket Kursus SIM</option>
                {paketList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_paket}
                  </option>
                ))}
              </select>
            </div>

            {/* Periode Preset */}
            <div className="flex items-center gap-1.5">
              {(
                [
                  { key: 'all', label: 'Semua' },
                  { key: 'month', label: 'Bulan Ini' },
                  { key: '30days', label: '30 Hari' },
                  { key: 'custom', label: 'Kustom' },
                ] as const
              ).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePresetChange(p.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    datePreset === p.key
                      ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {datePreset === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
              <DatePickerWIB
                label="Tanggal Daftar Mulai"
                value={startDate}
                onChange={setStartDate}
              />
              <DatePickerWIB
                label="Tanggal Daftar Selesai"
                value={endDate}
                onChange={setEndDate}
              />
            </div>
          )}
        </div>

        {/* Table of Students */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border)] select-none">
              <tr>
                <th
                  onClick={() => toggleSort('tanggal_booking')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                  title="Klik untuk mengurutkan tanggal daftar"
                >
                  <div className="flex items-center gap-1">
                    <span>Tgl Daftar (Booking)</span>
                    <ArrowUpDown className="w-3 h-3 text-[var(--brand-primary)]" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('nama')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Siswa</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('paket')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Paket Kursus</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('status_pembayaran')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Status Pembayaran</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('status_sim')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Status SIM</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('tanggal_selesai_sim')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Tgl Selesai SIM</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 font-bold whitespace-nowrap">Catatan SIM</th>
                <th className="p-3 font-bold text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    Memuat data siswa paket SIM...
                  </td>
                </tr>
              ) : sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <IdCard className="w-8 h-8 opacity-30 text-[var(--text-secondary)] mb-1" />
                      <span className="font-semibold text-[var(--text-primary)]">
                        Tidak ada data siswa paket SIM
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        {currentTab === 'active'
                          ? 'Semua siswa SIM pada filter ini telah selesai / masuk arsip.'
                          : 'Coba ubah filter atau pencarian Anda.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedStudents.map((s) => {
                  const isSelesai = s.status_sim === 'selesai';
                  const isLunas = s.status_pembayaran_kode === 'lunas';

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-[var(--bg-subtle)]/50 transition-colors"
                    >
                      {/* Tanggal Booking / Daftar */}
                      <td className="p-3 whitespace-nowrap font-medium text-[var(--text-primary)]">
                        <div className="font-bold">{formatDateIndo(s.tanggal_booking)}</div>
                        <div className="text-[10px] text-[var(--text-secondary)]">
                          Mulai: {formatDateIndo(s.tanggal_rencana_mulai)}
                        </div>
                      </td>

                      {/* Nama Siswa & WhatsApp */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-xs shrink-0">
                            {s.nama.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/siswa/${s.id}`}
                              className="font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary)] hover:underline"
                            >
                              {s.nama}
                            </Link>
                            <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                              <span>{s.kode_siswa}</span>
                              {s.no_whatsapp && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={`https://wa.me/${s.no_whatsapp.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                                  >
                                    <MessageCircle className="w-2.5 h-2.5" />
                                    <span>{s.no_whatsapp}</span>
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Paket Kursus */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-bold text-[11px] inline-flex items-center gap-1">
                          <IdCard className="w-3 h-3" />
                          <span>{s.paket?.nama_paket || 'Paket SIM'}</span>
                        </span>
                        <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-medium">
                          {formatRupiah(s.harga_final)}
                        </div>
                      </td>

                      {/* Status Pembayaran */}
                      <td className="p-3 whitespace-nowrap">
                        {isLunas ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            LUNAS
                          </span>
                        ) : s.status_pembayaran_kode === 'dp' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            DP ({formatRupiah(s.dp_nominal || 0)})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            BELUM BAYAR
                          </span>
                        )}
                      </td>

                      {/* Status SIM (Interaktif Click) */}
                      <td className="p-3 whitespace-nowrap">
                        {isSelesai ? (
                          <button
                            type="button"
                            onClick={() => handleOpenChangeStatus(s)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-[11px] hover:bg-emerald-100 transition-all inline-flex items-center gap-1"
                            title="Klik untuk mengubah status SIM"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>SELESAI (Arsip)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenChangeStatus(s)}
                            className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] transition-all inline-flex items-center gap-1 ${
                              isLunas
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 hover:bg-blue-100 animate-pulse'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 hover:bg-amber-100'
                            }`}
                            title={isLunas ? 'Klik untuk tandai selesai' : 'Perlu pelunasan sebelum selesai'}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>BELUM {isLunas ? '(Siap Terbit)' : ''}</span>
                          </button>
                        )}
                      </td>

                      {/* Tanggal Selesai SIM */}
                      <td className="p-3 whitespace-nowrap font-mono tabular-nums">
                        {s.tanggal_selesai_sim ? (
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            {formatDateIndo(s.tanggal_selesai_sim)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Catatan SIM */}
                      <td className="p-3 max-w-xs truncate text-[11px] text-[var(--text-secondary)]">
                        {s.catatan_sim || s.catatan || '-'}
                      </td>

                      {/* Aksi */}
                      <td className="p-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenChangeStatus(s)}
                            className="px-2 py-1 bg-[var(--brand-primary-light)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                            title="Ubah Status SIM & Tanggal Selesai"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Ubah</span>
                          </button>

                          <Link
                            href={`/siswa/${s.id}`}
                            className="p-1 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors"
                            title="Buka Detail Siswa"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <Link
                            href={`/nota?siswa_id=${s.id}`}
                            className="p-1 text-[var(--text-secondary)] hover:text-emerald-600 hover:bg-[var(--bg-subtle)] rounded-lg transition-colors"
                            title="Cetak Nota Pembayaran Siswa"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog Form: Ubah Status SIM & Tanggal Selesai */}
      {isModalOpen && selectedSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <IdCard className="w-5 h-5 text-[var(--brand-primary)]" />
                <span>Ubah Status SIM Siswa</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-[var(--danger)] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Info Siswa */}
            <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Nama Siswa:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedSiswa.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Paket Kursus:</span>
                <span className="font-semibold text-[var(--brand-primary)]">
                  {selectedSiswa.paket?.nama_paket}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Status Pembayaran:</span>
                <span className="font-bold text-emerald-600 uppercase">
                  {selectedSiswa.status_pembayaran_kode} (LUNAS)
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveStatusSim} className="space-y-4 text-xs">
              {/* Radio Pilihan Status */}
              <div>
                <label className="block text-[var(--text-secondary)] mb-1.5 font-bold">
                  Pilih Status Penerbitan SIM *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold cursor-pointer transition-all ${
                      modalTargetStatus === 'selesai'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modal_status_sim"
                      value="selesai"
                      checked={modalTargetStatus === 'selesai'}
                      onChange={() => setModalTargetStatus('selesai')}
                      className="sr-only"
                    />
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>SELESAI (Arsip)</span>
                  </label>

                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold cursor-pointer transition-all ${
                      modalTargetStatus === 'belum'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 shadow-xs'
                        : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modal_status_sim"
                      value="belum"
                      checked={modalTargetStatus === 'belum'}
                      onChange={() => setModalTargetStatus('belum')}
                      className="sr-only"
                    />
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>BELUM SELESAI</span>
                  </label>
                </div>
              </div>

              {/* Tanggal Selesai SIM (Hanya jika Selesai) */}
              {modalTargetStatus === 'selesai' && (
                <div>
                  <DatePickerWIB
                    label="Pilih Tanggal Selesai SIM *"
                    value={modalTanggalSelesai}
                    onChange={setModalTanggalSelesai}
                  />
                  <span className="text-[10px] text-[var(--text-secondary)] block mt-1">
                    Tanggal resmi SIM selesai diterbitkan / diambil siswa
                  </span>
                </div>
              )}

              {/* Catatan SIM */}
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Catatan / Keterangan SIM (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SIM A Polrestabes Palembang / Diambil Siswa"
                  value={modalCatatanSim}
                  onChange={(e) => setModalCatatanSim(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Status SIM</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alert: Pembayaran Belum Lunas */}
      {unpaidAlertStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg)] border border-rose-300 dark:border-rose-900/60 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  Pembayaran Belum Lunas!
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Siswa <strong className="text-[var(--text-primary)]">{unpaidAlertStudent.nama}</strong> saat ini berstatus{' '}
                  <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold uppercase text-[10px]">
                    {unpaidAlertStudent.status_pembayaran_kode}
                  </span>
                  .
                </p>
                <p className="text-xs text-rose-600 font-semibold pt-1">
                  Status SIM hanya dapat diselesaikan jika siswa telah melunasi seluruh biaya kursus.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Total Biaya Paket:</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {formatRupiah(unpaidAlertStudent.harga_final)}
                </span>
              </div>
              {unpaidAlertStudent.dp_nominal ? (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Sudah Dibayar (DP):</span>
                  <span className="font-semibold text-amber-600">
                    {formatRupiah(unpaidAlertStudent.dp_nominal)}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setUnpaidAlertStudent(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
              >
                Tutup
              </button>
              <Link
                href={`/siswa/${unpaidAlertStudent.id}`}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all inline-flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Pelunasan di Detail Siswa &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
