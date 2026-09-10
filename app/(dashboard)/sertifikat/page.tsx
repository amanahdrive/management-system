'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { ExportButton, ExportColumn } from '@/components/shared/ExportButton';
import {
  SiswaSertifikatItem,
  StatusSertifikatEnum,
  getSiswaSertifikatList,
  updateStatusSertifikat,
  updateNomorSertifikat,
} from '@/lib/actions/sertifikat';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { useAppRefresh, triggerAppRefresh } from '@/lib/utils/refresh-event';
import { purgeServerCache } from '@/lib/actions/cache';
import {
  Award,
  CheckCircle2,
  Clock,
  Search,
  Copy,
  Check,
  Pencil,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Filter,
  X,
  MessageCircle,
  FileCheck2,
  Calendar,
  User,
  Hash,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

type FilterTab = 'all' | 'siap_cetak' | 'selesai_cetak' | 'belum_cetak';

export default function SertifikatPage() {
  const [students, setStudents] = React.useState<SiswaSertifikatItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Copy feedback state: key = `${studentId}-${type}`
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  // Status updating indicator
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);

  // Edit Certificate Number Modal State
  const [editingStudent, setEditingStudent] = React.useState<SiswaSertifikatItem | null>(null);
  const [editNomorInput, setEditNomorInput] = React.useState('');
  const [editCatatanInput, setEditCatatanInput] = React.useState('');
  const [savingEdit, setSavingEdit] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await getSiswaSertifikatList();
      setStudents(list);
    } catch (err) {
      console.error('Error loading certificate data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  useAppRefresh(loadData);

  const handleManualSync = async () => {
    try {
      await purgeServerCache();
      await loadData();
      triggerAppRefresh();
    } catch (e) {
      console.error('Error syncing sertifikat:', e);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleCopyDesignSummary = (item: SiswaSertifikatItem) => {
    const summary = [
      `Nomor Sertifikat: ${item.nomor_sertifikat}`,
      `Nama Siswa: ${item.nama}`,
      `Tanggal Kursus: ${item.tanggal_kursus_formatted}`,
      `Instruktur: ${item.instruktur_terbanyak}`,
      `Paket: ${item.paket_nama} (${item.total_sesi_selesai}/${item.jumlah_sesi_paket} Sesi)`,
    ].join('\n');

    handleCopy(summary, `${item.id}-summary`);
  };

  const handleToggleStatus = async (item: SiswaSertifikatItem) => {
    const isCurrentlySelesai = item.status_sertifikat === 'selesai_cetak';
    const nextStatus = isCurrentlySelesai ? 'belum_cetak' : 'selesai_cetak';

    setUpdatingId(item.id);
    try {
      const res = await updateStatusSertifikat(item.id, nextStatus, item.nomor_sertifikat);
      if (res.success) {
        await loadData();
      } else {
        alert('Gagal memperbarui status: ' + res.error);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenEditModal = (item: SiswaSertifikatItem) => {
    setEditingStudent(item);
    setEditNomorInput(item.nomor_sertifikat);
    setEditCatatanInput(item.catatan_sertifikat || '');
  };

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    if (!editNomorInput.trim()) {
      alert('Nomor sertifikat tidak boleh kosong');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await updateNomorSertifikat(
        editingStudent.id,
        editNomorInput.trim(),
        editCatatanInput.trim()
      );
      if (res.success) {
        setEditingStudent(null);
        await loadData();
      } else {
        alert('Gagal menyimpan nomor sertifikat: ' + res.error);
      }
    } catch (err) {
      console.error('Error saving nomor sertifikat:', err);
    } finally {
      setSavingEdit(false);
    }
  };

  // Metrics
  const metrics = React.useMemo(() => {
    const total = students.length;
    const siap = students.filter((s) => s.status_sertifikat === 'siap_cetak').length;
    const selesai = students.filter((s) => s.status_sertifikat === 'selesai_cetak').length;
    const belum = students.filter((s) => s.status_sertifikat === 'belum_cetak').length;
    return { total, siap, selesai, belum };
  }, [students]);

  // Filtered Students
  const filteredStudents = React.useMemo(() => {
    return students.filter((s) => {
      // Tab filter
      if (activeTab !== 'all' && s.status_sertifikat !== activeTab) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNama = s.nama?.toLowerCase().includes(q);
        const matchKode = s.kode_siswa?.toLowerCase().includes(q);
        const matchWA = s.no_whatsapp?.toLowerCase().includes(q);
        const matchPaket = s.paket_nama?.toLowerCase().includes(q);
        const matchInstruktur = s.instruktur_terbanyak?.toLowerCase().includes(q);
        const matchNomor = s.nomor_sertifikat?.toLowerCase().includes(q);
        if (!matchNama && !matchKode && !matchWA && !matchPaket && !matchInstruktur && !matchNomor) {
          return false;
        }
      }

      return true;
    });
  }, [students, activeTab, searchQuery]);

  // Export Columns Definition for Excel and PDF
  const exportColumns: ExportColumn<SiswaSertifikatItem>[] = [
    {
      header: 'Status',
      accessor: (item) => {
        if (item.status_sertifikat === 'selesai_cetak') return 'Selesai Cetak';
        if (item.status_sertifikat === 'siap_cetak') return 'Siap Cetak';
        return 'Belum Siap';
      },
      pdfWidth: '12%',
    },
    {
      header: 'Nomor Sertifikat',
      accessor: 'nomor_sertifikat',
      pdfWidth: '18%',
    },
    {
      header: 'Nama Siswa',
      accessor: 'nama',
      pdfWidth: '20%',
    },
    {
      header: 'Paket Kursus',
      accessor: (item) => `${item.paket_nama} (${item.total_sesi_selesai}/${item.jumlah_sesi_paket} Sesi)`,
      pdfWidth: '16%',
    },
    {
      header: 'Tanggal Kursus',
      accessor: 'tanggal_kursus_formatted',
      pdfWidth: '18%',
    },
    {
      header: 'Instruktur Terbanyak',
      accessor: (item) =>
        item.instruktur_sesi_count > 0
          ? `${item.instruktur_terbanyak} (${item.instruktur_sesi_count} Sesi)`
          : item.instruktur_terbanyak,
      pdfWidth: '16%',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Sertifikat Siswa"
        description="Monitoring status sertifikat, siap cetak (H-2 sesi akhir), nomor sertifikat, rentang tanggal, dan instruktur untuk tim desain"
        breadcrumbs={[{ label: 'Manajemen Siswa', href: '/siswa' }, { label: 'Sertifikat Siswa' }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <ExportButton
              data={filteredStudents}
              columns={exportColumns}
              filename={`rekap-sertifikat-siswa-${getTodayDateString()}`}
              sheetName="Data Sertifikat"
              documentTitle="REKAPITULASI SERTIFIKAT KELULUSAN SISWA"
              documentSubtitle="Daftar siswa untuk pengarsipan dan pencetakan sertifikat resmi Amanah Drive"
              documentNumber={`CERT/${getTodayDateString().replace(/-/g, '')}`}
              periodLabel={`Per ${formatDateIndo(getTodayDateString())}`}
              summaryMetrics={[
                { label: 'Siap Cetak', value: `${metrics.siap} Siswa` },
                { label: 'Selesai Dicetak', value: `${metrics.selesai} Siswa` },
                { label: 'Belum Siap', value: `${metrics.belum} Siswa` },
                { label: 'Total Siswa', value: `${metrics.total} Siswa` },
              ]}
              orientation="landscape"
            />
            <button
              type="button"
              onClick={handleManualSync}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--bg)] hover:bg-[var(--bg-subtle)] border border-[var(--border)] rounded-full text-xs font-semibold transition-all shadow-xs active:scale-95 hover:-translate-y-0.5 text-[var(--text-primary)]"
              title="Sinkronkan data sertifikat dengan database terbaru"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{loading ? 'Menyinkronkan...' : 'Refresh'}</span>
            </button>
          </div>
        }
      />

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Siap Cetak (Prioritas)"
          value={`${metrics.siap} Siswa`}
          description="Sudah masuk 2 sesi terakhir"
          icon={<Sparkles className="w-5 h-5 text-amber-500" />}
          className={activeTab === 'siap_cetak' ? 'ring-2 ring-amber-500/50' : ''}
          onClick={() => setActiveTab('siap_cetak')}
        />
        <StatCard
          label="Selesai Dicetak"
          value={`${metrics.selesai} Siswa`}
          description="Fisik sertifikat sudah dicetak"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          className={activeTab === 'selesai_cetak' ? 'ring-2 ring-emerald-500/50' : ''}
          onClick={() => setActiveTab('selesai_cetak')}
        />
        <StatCard
          label="Belum Siap Cetak"
          value={`${metrics.belum} Siswa`}
          description="Masih di awal atau pertengahan sesi"
          icon={<Clock className="w-5 h-5 text-slate-500" />}
          className={activeTab === 'belum_cetak' ? 'ring-2 ring-slate-500/50' : ''}
          onClick={() => setActiveTab('belum_cetak')}
        />
        <StatCard
          label="Total Siswa Terdata"
          value={`${metrics.total} Siswa`}
          description="Seluruh siswa kursus terdaftar"
          icon={<Award className="w-5 h-5 text-[var(--brand-primary)]" />}
          className={activeTab === 'all' ? 'ring-2 ring-[var(--brand-primary)]/50' : ''}
          onClick={() => setActiveTab('all')}
        />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card-container p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'all'
                  ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)] border border-[var(--border)]'
              }`}
            >
              Semua ({metrics.total})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('siap_cetak')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === 'siap_cetak'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Siap Cetak ({metrics.siap})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('selesai_cetak')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === 'selesai_cetak'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Selesai Cetak ({metrics.selesai})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('belum_cetak')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'belum_cetak'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg)] border border-[var(--border)]'
              }`}
            >
              Belum Siap ({metrics.belum})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Cari siswa, kode, instruktur, nomor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-[var(--bg)] border border-[var(--border)] rounded-full focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card-container overflow-hidden p-0 border border-[var(--border)] shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border)] text-[var(--text-secondary)] uppercase tracking-wider text-[10.5px]">
              <tr>
                <th className="py-3 px-4 font-bold">Status</th>
                <th className="py-3 px-4 font-bold">Nomor Sertifikat</th>
                <th className="py-3 px-4 font-bold">Nama Siswa</th>
                <th className="py-3 px-4 font-bold">Paket & Progress</th>
                <th className="py-3 px-4 font-bold">Rentang Tanggal Kursus</th>
                <th className="py-3 px-4 font-bold">Instruktur Terbanyak</th>
                <th className="py-3 px-4 font-bold text-center">Aksi Desain & Cetak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--text-secondary)]">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" />
                      <span>Memuat data sertifikat...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[var(--text-secondary)]">
                    <Award className="w-8 h-8 text-[var(--text-secondary)]/40 mx-auto mb-2" />
                    <p className="font-semibold">Tidak ada data siswa ditemukan</p>
                    <p className="text-[11px] mt-0.5">Coba ubah filter atau kata kunci pencarian</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((item) => {
                  const isSiap = item.status_sertifikat === 'siap_cetak';
                  const isSelesai = item.status_sertifikat === 'selesai_cetak';
                  const isUpdating = updatingId === item.id;
                  const percent = Math.min(
                    100,
                    Math.round((item.total_sesi_selesai / (item.jumlah_sesi_paket || 1)) * 100)
                  );

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-[var(--bg-subtle)]/70 ${
                        isSiap
                          ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.05]'
                          : isSelesai
                          ? 'bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04]'
                          : ''
                      }`}
                    >
                      {/* 1. Status Cetak */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isSelesai ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Selesai Cetak</span>
                          </span>
                        ) : isSiap ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Siap Cetak</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                            <Clock className="w-3 h-3" />
                            <span>Belum Siap</span>
                          </span>
                        )}
                      </td>

                      {/* 2. Nomor Sertifikat */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-[var(--brand-primary)] bg-[var(--brand-primary)]/5 px-2 py-0.5 rounded border border-[var(--brand-primary)]/20 select-all">
                            {item.nomor_sertifikat}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.nomor_sertifikat, `${item.id}-nomor`)}
                            className="p-1 hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] rounded transition-colors"
                            title="Salin Nomor Sertifikat"
                          >
                            {copiedKey === `${item.id}-nomor` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-blue-600 rounded transition-colors"
                            title="Ubah Nomor Sertifikat"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* 3. Nama Siswa */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-xs shrink-0">
                            {item.nama.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/siswa/${item.id}`}
                              className="font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary)] hover:underline flex items-center gap-1"
                            >
                              <span>{item.nama}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </Link>
                            <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--text-secondary)] mt-0.5">
                              <span className="font-mono font-semibold">{item.kode_siswa}</span>
                              {item.no_whatsapp && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={`https://wa.me/${item.no_whatsapp.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-emerald-600 hover:underline inline-flex items-center gap-0.5 font-medium"
                                  >
                                    <MessageCircle className="w-2.5 h-2.5" />
                                    <span>{item.no_whatsapp}</span>
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 4. Paket & Progress */}
                      <td className="py-3 px-4">
                        <div className="space-y-1 max-w-[170px]">
                          <div className="font-semibold text-xs text-[var(--text-primary)] truncate">
                            {item.paket_nama}
                          </div>
                          <div className="flex items-center justify-between text-[10.5px] text-[var(--text-secondary)]">
                            <span>
                              {item.total_sesi_selesai} / {item.jumlah_sesi_paket} Sesi
                            </span>
                            <span className="font-bold text-[var(--text-primary)]">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isSelesai
                                  ? 'bg-emerald-600'
                                  : isSiap
                                  ? 'bg-amber-500'
                                  : 'bg-[var(--brand-primary)]'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 5. Rentang Tanggal Kursus */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-xs text-[var(--text-primary)]">
                            {item.tanggal_kursus_formatted}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(item.tanggal_kursus_formatted, `${item.id}-tanggal`)
                            }
                            className="p-1 hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] rounded transition-colors"
                            title="Salin Rentang Tanggal"
                          >
                            {copiedKey === `${item.id}-tanggal` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 6. Instruktur Terbanyak */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {item.instruktur_terbanyak.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-[var(--text-primary)]">
                              {item.instruktur_terbanyak}
                            </div>
                            {item.instruktur_sesi_count > 0 && (
                              <div className="text-[10.5px] text-[var(--text-secondary)]">
                                {item.instruktur_sesi_count} Sesi Terbanyak
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 7. Aksi */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Toggle Status Cetak */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            disabled={isUpdating}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 ${
                              isSelesai
                                ? 'bg-[var(--bg-subtle)] hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--text-secondary)] border border-[var(--border)]'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                            title={
                              isSelesai
                                ? 'Kembalikan status menjadi Belum Dicetak'
                                : 'Tandai sertifikat fisik sudah selesai dicetak'
                            }
                          >
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isSelesai ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>{isSelesai ? 'Batal' : 'Tandai Selesai'}</span>
                          </button>

                          {/* 1-Click Copy Data Desain */}
                          <button
                            type="button"
                            onClick={() => handleCopyDesignSummary(item)}
                            className="px-2.5 py-1.5 bg-[var(--bg)] hover:bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] rounded-lg text-xs font-medium flex items-center gap-1 transition-all shadow-2xs hover:-translate-y-0.5"
                            title="Salin Data Lengkap Format Teks untuk Desain Sertifikat (Canva / Photoshop)"
                          >
                            {copiedKey === `${item.id}-summary` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600 font-bold">Tersalin!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                                <span>Salin Desain</span>
                              </>
                            )}
                          </button>
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

      {/* Modal Edit Nomor Sertifikat */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  Ubah Nomor Sertifikat
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {editingStudent.nama} ({editingStudent.kode_siswa})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Nomor Sertifikat
                </label>
                <input
                  type="text"
                  required
                  value={editNomorInput}
                  onChange={(e) => setEditNomorInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  placeholder="Contoh: SS024/AMD/IX/2026"
                />
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Format standar: [KODE_SISWA]/AMD/[BULAN_ROMAWI]/[TAHUN]
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Catatan Desain / Sertifikat (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={editCatatanInput}
                  onChange={(e) => setEditCatatanInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  placeholder="Catatan khusus untuk sertifikat ini..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white shadow-xs flex items-center gap-1.5"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingEdit ? 'Menyimpan...' : 'Simpan Nomor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
