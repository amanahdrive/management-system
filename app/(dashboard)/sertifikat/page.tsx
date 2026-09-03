'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import {
  SiswaSertifikatItem,
  getSiswaSertifikatList,
} from '@/lib/actions/sertifikat';
import { getStaffList } from '@/lib/actions/master-data';
import { formatDateIndo, getTodayDateString, getJakartaDateParts, addDaysToDateStr } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { StatCard } from '@/components/shared/StatCard';
import { CertificateModal } from '@/components/sertifikat/CertificateModal';
import {
  Award,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  FileCheck2,
  Users,
  MessageCircle,
  IdCard,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

type PeriodOption = 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';

export default function SertifikatPage() {
  const [allStudents, setAllStudents] = React.useState<SiswaSertifikatItem[]>([]);
  const [staffList, setStaffList] = React.useState<{ id: string; nama: string }[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filter States
  const [period, setPeriod] = React.useState<PeriodOption>('all');
  const [customStart, setCustomStart] = React.useState<string>('');
  const [customEnd, setCustomEnd] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<'lulus' | 'all'>('lulus');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Selected Student for Certificate Modal
  const [selectedForCertificate, setSelectedForCertificate] = React.useState<SiswaSertifikatItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, staff] = await Promise.all([
        getSiswaSertifikatList(),
        getStaffList(),
      ]);
      setAllStudents(list);
      setStaffList(staff.map((s) => ({ id: s.id, nama: s.nama })));
    } catch (err) {
      console.error('Error loading certificate data:', err);
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
    const curMonth = parts?.month ?? new Date().getMonth() + 1;

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

  // Filtered Students
  const filteredStudents = React.useMemo(() => {
    return allStudents.filter((s) => {
      // Period filter on tanggal_selesai_sesi or tanggal_mulai_sesi
      if (periodBounds.start && periodBounds.end) {
        const tgl = (s.tanggal_selesai_sesi || s.tanggal_mulai_sesi || '').slice(0, 10);
        if (tgl && (tgl < periodBounds.start || tgl > periodBounds.end)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === 'lulus' && !s.is_lulus) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = s.nama?.toLowerCase().includes(q);
        const matchKode = s.kode_siswa?.toLowerCase().includes(q);
        const matchWA = s.no_whatsapp?.toLowerCase().includes(q);
        const matchPaket = s.paket_nama?.toLowerCase().includes(q);
        const matchInstruktur = s.instruktur_nama?.toLowerCase().includes(q);
        if (!matchNama && !matchKode && !matchWA && !matchPaket && !matchInstruktur) return false;
      }

      return true;
    });
  }, [allStudents, periodBounds, statusFilter, searchQuery]);

  // Metrics
  const totalLulus = React.useMemo(() => allStudents.filter((s) => s.is_lulus).length, [allStudents]);
  const totalSiapCetak = React.useMemo(() => filteredStudents.filter((s) => s.is_lulus).length, [filteredStudents]);
  const totalBerjalan = React.useMemo(() => allStudents.filter((s) => !s.is_lulus).length, [allStudents]);

  // Table Columns
  const columns: ColumnDef<SiswaSertifikatItem>[] = [
    {
      accessorKey: 'kode_siswa',
      header: 'Kode',
      sortingFn: 'alphanumeric',
      cell: ({ row }) => (
        <span className="tabular-num font-bold text-[var(--brand-primary)]">
          {row.original.kode_siswa}
        </span>
      ),
    },
    {
      accessorKey: 'nama',
      header: 'Nama Siswa',
      sortingFn: 'text',
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-xs shrink-0">
            {row.original.nama.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-[var(--text-primary)]">{row.original.nama}</div>
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
              {row.original.no_whatsapp && (
                <a
                  href={`https://wa.me/${row.original.no_whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                >
                  <MessageCircle className="w-2.5 h-2.5" />
                  <span>{row.original.no_whatsapp}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'paket_nama',
      header: 'Paket Kursus',
      sortingFn: 'text',
      cell: ({ row }) => (
        <div>
          <span className="px-2 py-0.5 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-bold text-[11px] inline-flex items-center gap-1">
            <IdCard className="w-3 h-3" />
            <span>{row.original.paket_nama}</span>
          </span>
          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-medium">
            Target: {row.original.jumlah_sesi_paket} Sesi
          </div>
        </div>
      ),
    },
    {
      id: 'progress_sesi',
      header: 'Progress Sesi',
      accessorFn: (row) => row.total_sesi_selesai,
      sortingFn: 'basic',
      cell: ({ row }) => {
        const selesai = row.original.total_sesi_selesai;
        const total = row.original.jumlah_sesi_paket;
        const isComplete = row.original.is_lulus;

        return (
          <div className="space-y-1">
            <span
              className={`px-2.5 py-0.5 text-xs font-bold rounded-md inline-flex items-center gap-1 ${
                isComplete
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {isComplete ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              ) : (
                <Clock className="w-3 h-3 text-amber-600" />
              )}
              <span>
                {selesai} / {total} Selesai
              </span>
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'tanggal_range_formatted',
      header: 'Rentang Tanggal Sesi',
      sortingFn: 'text',
      cell: ({ row }) => (
        <span className="font-semibold text-xs text-[var(--text-primary)]">
          {row.original.tanggal_range_formatted}
        </span>
      ),
    },
    {
      accessorKey: 'instruktur_nama',
      header: 'Instruktur',
      sortingFn: 'text',
      cell: ({ row }) => (
        <div className="font-semibold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold">
            {row.original.instruktur_nama.charAt(0).toUpperCase()}
          </div>
          <span>{row.original.instruktur_nama}</span>
        </div>
      ),
    },
    {
      accessorKey: 'nomor_sertifikat',
      header: 'Nomor Sertifikat',
      sortingFn: 'text',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-[#007a87]">
          {row.original.nomor_sertifikat}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedForCertificate(student)}
              className="px-3 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-xs hover:shadow"
              title="Cetak dan Unduh Sertifikat (PDF / JPG)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Sertifikat</span>
            </button>

            <Link
              href={`/siswa/${student.id}`}
              className="p-1.5 border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors"
              title="Lihat Detail Siswa"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Sertifikat Siswa"
        description="Penerbitan dan pencetakan sertifikat kelulusan kursus mengemudi mobil Amanah Drive format A4 Landscape"
        breadcrumbs={[{ label: 'Siswa', href: '/siswa' }, { label: 'Sertifikat Siswa' }]}
      />

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Siswa Selesai Kursus"
          value={`${totalLulus} Siswa`}
          description="Telah menyelesaikan seluruh sesi paket"
          icon={<Award className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          label="Siap Cetak Sertifikat (Filter Aktif)"
          value={`${totalSiapCetak} Siswa`}
          description={`Sesuai filter periode: ${periodBounds.label}`}
          icon={<FileCheck2 className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          label="Siswa Sesi Berjalan"
          value={`${totalBerjalan} Siswa`}
          description="Masih dalam tahapan sesi latihan"
          icon={<Users className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Filter Bar Periode (Standar Enterprise Analitik) */}
      <div className="card-container p-4 space-y-3 border border-[var(--border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Filter Periode Selesai:</span>
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
              placeholder="Cari nama siswa, kode siswa, paket, atau nama instruktur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] w-full focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
            >
              <option value="lulus">Hanya Siswa Selesai Kursus / Lulus</option>
              <option value="all">Semua Siswa (Termasuk Sesi Berjalan)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table with Enterprise Pagination & Sorting */}
      <div className="card-container">
        {loading ? (
          <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={filteredStudents} initialPageSize={10} />
        )}
      </div>

      {/* Certificate Modal Dialog */}
      {selectedForCertificate && (
        <CertificateModal
          item={selectedForCertificate}
          onClose={() => setSelectedForCertificate(null)}
          staffList={staffList}
        />
      )}
    </div>
  );
}
