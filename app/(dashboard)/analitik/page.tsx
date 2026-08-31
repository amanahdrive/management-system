'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { getAnalitikData, AnalitikData, AnalitikFilter } from '@/lib/actions/analitik';
import { formatRupiah } from '@/lib/utils/currency';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import {
  TrendingUp,
  Users,
  Calendar,
  Car,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  IdCard,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  ShieldCheck,
  Target,
  BarChart3,
  Layers,
  Fuel,
  Activity,
  AlertCircle,
  HelpCircle,
  Briefcase,
} from 'lucide-react';

type AnalyticsTab = 'executive' | 'siswa' | 'sesi' | 'instruktur' | 'armada';
type PeriodOption = 'this_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'this_year' | 'all' | 'custom';

export default function AnalitikPage() {
  const [data, setData] = React.useState<AnalitikData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<AnalyticsTab>('executive');
  const [period, setPeriod] = React.useState<PeriodOption>('this_month');
  const [customStart, setCustomStart] = React.useState<string>('');
  const [customEnd, setCustomEnd] = React.useState<string>('');
  const [isMeetingMode, setIsMeetingMode] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAnalitikData({
        period,
        startDate: period === 'custom' ? customStart : undefined,
        endDate: period === 'custom' ? customEnd : undefined,
      });
      setData(res);
    } catch (e) {
      console.error('Error loading analitik:', e);
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrint = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pusat Analitik & Laporan Performa"
          description="Evaluasi perjalanan bisnis, kinerja instruktur, dan strategi pertumbuhan operasional"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
      </div>
    );
  }

  const { summaryKPI, siswaGrowth, sesiOperations, instrukturLeaderboard, armadaAnalytics, finansialExecutive, strategicInsights } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-bold text-[10px] uppercase tracking-wider">
              Leadership & Business Intelligence
            </span>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">• {data.periodeLabel}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight mt-1 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[var(--brand-primary)]" />
            <span>Pusat Analitik & Evaluasi Bisnis</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Dashboard data performa bulanan, bahan rapat koordinasi pengurus & evaluasi menyeluruh staff/instruktur
          </p>
        </div>

        {/* Period Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === p.key
                    ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Mode Rapat / Presentasi Toggle */}
          <button
            type="button"
            onClick={() => setIsMeetingMode(!isMeetingMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              isMeetingMode
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--border)]'
            }`}
            title="Aktifkan tampilan bahan rapat awal bulan"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isMeetingMode ? 'Tutup Mode Rapat' : 'Bahan Rapat Awal Bulan'}</span>
          </button>

          {/* Print / Export */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)] transition-all"
            title="Cetak Dokumen Laporan Analitik"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Date Pickers */}
      {period === 'custom' && (
        <div className="card-container p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DatePickerWIB label="Tanggal Awal Periode" value={customStart} onChange={setCustomStart} />
          <DatePickerWIB label="Tanggal Akhir Periode" value={customEnd} onChange={setCustomEnd} />
        </div>
      )}

      {/* Strategic Insights & Executive AI Summary (Bahan Rapat) */}
      <div className="card-container p-5 border-l-4 border-l-[var(--brand-primary)] bg-[var(--bg)] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Rangkuman Eksekutif & Catatan Rapat ({data.periodeLabel})
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Poin evaluasi otomatis berdasarkan data riil transaksi, pendaftaran, dan operasional lapangan
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2 py-1 rounded-md">
            Auto-Generated Insights
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {strategicInsights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border space-y-1.5 ${
                insight.type === 'positive'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                  : insight.type === 'warning'
                  ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                  : insight.type === 'action'
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200'
                  : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                {insight.type === 'positive' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                {insight.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                {insight.type === 'action' && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
                {insight.type === 'info' && <Sparkles className="w-3.5 h-3.5 text-blue-600" />}
                <span>{insight.title}</span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">{insight.description}</p>
              <div className="pt-1 text-[11px] font-semibold flex items-start gap-1">
                <span className="shrink-0 text-[var(--brand-primary)]">&rarr;</span>
                <span><strong>Rekomendasi Rapat:</strong> {insight.recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary KPI Metrics (Executive Tier 1) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omzet Terdaftar */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-[var(--brand-primary)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Total Omzet Booking
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tabular-nums">
            {formatRupiah(summaryKPI.totalOmzet)}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
            <span>Dari {summaryKPI.totalSiswa} Siswa Baru</span>
            <span className="text-emerald-600 font-bold">Terbayar: {formatRupiah(summaryKPI.totalTerbayar)}</span>
          </div>
        </div>

        {/* Laba Bersih Kas */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Laba Bersih Kas
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-extrabold tabular-nums ${summaryKPI.labaBersih >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatRupiah(summaryKPI.labaBersih)}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
            <span>Margin Operasional</span>
            <span className="font-bold text-emerald-600">{summaryKPI.profitMargin}% Profit</span>
          </div>
        </div>

        {/* Sesi Selesai & Completion Rate */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-blue-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Kinerja Sesi Kursus
            </span>
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 tabular-nums">
            {summaryKPI.totalSesiSelesai} <span className="text-xs font-normal text-[var(--text-secondary)]">/ {summaryKPI.totalSesiSelesai + summaryKPI.totalSesiTerjadwal + summaryKPI.totalSesiBatal} Sesi</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
            <span>Tingkat Kelancaran</span>
            <span className="font-bold text-blue-600">{summaryKPI.completionRateSesi}% Selesai</span>
          </div>
        </div>

        {/* Efisiensi Armada & BBM */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-amber-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Jarak Tempuh & BBM
            </span>
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 tabular-nums">
            {summaryKPI.totalKmOperasional.toLocaleString('id-ID')} <span className="text-xs font-semibold">KM</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
            <span>Konsumsi: {summaryKPI.totalLiterBBM.toLocaleString('id-ID')} Liter</span>
            <span className="font-bold text-amber-600">{summaryKPI.rataRataEfisiensiBBM} km/L</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs for Deep Dive Sections */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 overflow-x-auto">
        {(
          [
            { key: 'executive', label: '1. Ikhtisar & Keuangan', icon: Wallet },
            { key: 'siswa', label: '2. Siswa & Marketing Growth', icon: Users },
            { key: 'sesi', label: '3. Operasional Sesi & Jadwal', icon: Calendar },
            { key: 'instruktur', label: '4. Kinerja Instruktur (SDM)', icon: Award },
            { key: 'armada', label: '5. Armada Mobil & BBM', icon: Car },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: IKHTISAR EKSEKUTIF & KEUANGAN */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Struktur Pemasukan vs Pengeluaran */}
            <div className="card-container p-5 space-y-4">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Struktur Arus Kas ({data.periodeLabel})</span>
                </span>
                <span className="text-xs font-normal text-[var(--text-secondary)]">Kas Masuk vs Keluar</span>
              </h3>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">Total Pemasukan Kas</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">Dari DP & Pelunasan Kursus</span>
                  </div>
                  <span className="text-base font-extrabold text-emerald-600 tabular-nums">
                    {formatRupiah(finansialExecutive.totalPemasukan)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-300 block">Total Pengeluaran Kas</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">BBM, Gaji, Operasional, Perawatan</span>
                  </div>
                  <span className="text-base font-extrabold text-rose-600 tabular-nums">
                    {formatRupiah(finansialExecutive.totalPengeluaran)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)] block">Laba Bersih Operasional (Net Profit)</span>
                    <span className="text-[11px] text-emerald-600 font-semibold">{summaryKPI.profitMargin}% Margin Laba</span>
                  </div>
                  <span className={`text-lg font-extrabold tabular-nums ${finansialExecutive.labaBersih >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatRupiah(finansialExecutive.labaBersih)}
                  </span>
                </div>
              </div>
            </div>

            {/* Rincian Beban Biaya Pengeluaran */}
            <div className="card-container p-5 space-y-4">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <span>Komposisi Pengeluaran Operasional</span>
                </span>
                <span className="text-xs font-normal text-[var(--text-secondary)]">Alokasi Kas Keluar</span>
              </h3>

              <div className="space-y-2.5">
                {finansialExecutive.expenseBreakdown.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    Belum ada data pengeluaran kas pada periode ini.
                  </div>
                ) : (
                  finansialExecutive.expenseBreakdown.map((exp, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[var(--text-primary)]">{exp.label}</span>
                        <span className="text-[var(--text-primary)] tabular-nums">
                          {formatRupiah(exp.nominal)} ({exp.persentase}%)
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-subtle)] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(exp.persentase, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Tren Arus Kas 6 Bulan Terakhir */}
          <div className="card-container p-5 space-y-4">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Tren Historis Arus Kas (Pemasukan vs Pengeluaran 6 Bulan)</span>
              </span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {finansialExecutive.cashflowMonthly.map((cf, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] block text-center border-b border-[var(--border)] pb-1">
                    {cf.bulanLabel}
                  </span>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Masuk:</span>
                      <span className="font-bold text-emerald-600 tabular-nums">{formatRupiah(cf.pemasukan)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Keluar:</span>
                      <span className="font-bold text-rose-600 tabular-nums">{formatRupiah(cf.pengeluaran)}</span>
                    </div>
                    <div className="flex justify-between border-t border-[var(--border)] pt-1">
                      <span className="text-[var(--text-secondary)]">Net:</span>
                      <span className={`font-extrabold tabular-nums ${cf.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatRupiah(cf.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SISWA & MARKETING GROWTH */}
      {activeTab === 'siswa' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sumber Leads & Akuisisi Marketing */}
            <div className="card-container p-5 space-y-4">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Efektivitas Channel Marketing & Leads</span>
                </span>
                <span className="text-xs font-normal text-[var(--text-secondary)]">Akuisisi Siswa</span>
              </h3>

              <div className="space-y-3">
                {siswaGrowth.byChannel.map((ch, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)]" />
                        <span>{ch.channel}</span>
                      </span>
                      <span className="font-extrabold text-[var(--brand-primary)] tabular-nums">
                        {ch.totalSiswa} Siswa ({ch.persentase}%)
                      </span>
                    </div>
                    <div className="w-full bg-black/5 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[var(--brand-primary)] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(ch.persentase, 5)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-[var(--text-secondary)] pt-0.5">
                      <span>Kontribusi Omzet:</span>
                      <span className="font-bold text-[var(--text-primary)] tabular-nums">{formatRupiah(ch.totalOmzet)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Paket Kursus Terlaris */}
            <div className="card-container p-5 space-y-4">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Distribusi Paket Kursus & Bundling SIM</span>
                </span>
                <span className="text-xs font-normal text-[var(--text-secondary)]">Paling Diminati</span>
              </h3>

              <div className="space-y-3">
                {siswaGrowth.byPackage.map((pkg, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                        {pkg.termasukSim ? (
                          <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-[10px] font-bold">
                            + SIM
                          </span>
                        ) : null}
                        <span>{pkg.namaPaket}</span>
                      </span>
                      <span className="font-extrabold text-emerald-600 tabular-nums">
                        {pkg.totalTerjual} Siswa ({pkg.persentase}%)
                      </span>
                    </div>
                    <div className="w-full bg-black/5 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pkg.persentase, 5)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-[var(--text-secondary)] pt-0.5">
                      <span>Total Omzet:</span>
                      <span className="font-bold text-[var(--text-primary)] tabular-nums">{formatRupiah(pkg.totalOmzet)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status Kelulusan & Status Pembayaran */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-container p-4 space-y-1">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Siswa Lunas</span>
              <div className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                {siswaGrowth.completionRate.siswaLulus} Siswa
              </div>
              <span className="text-xs text-[var(--text-secondary)]">Telah menyelesaikan seluruh biaya</span>
            </div>

            <div className="card-container p-4 space-y-1">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Siswa DP (Belum Lunas)</span>
              <div className="text-2xl font-extrabold text-amber-600 tabular-nums">
                {siswaGrowth.completionRate.siswaOnProgress} Siswa
              </div>
              <span className="text-xs text-[var(--text-secondary)]">Menunggu pelunasan</span>
            </div>

            <div className="card-container p-4 space-y-1">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase">Belum Bayar</span>
              <div className="text-2xl font-extrabold text-rose-600 tabular-nums">
                {siswaGrowth.completionRate.siswaBelumJadwal} Siswa
              </div>
              <span className="text-xs text-[var(--text-secondary)]">Perlu konfirmasi admin</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OPERASIONAL SESI & JADWAL */}
      {activeTab === 'sesi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Slot Waktu Terpadat */}
            <div className="card-container p-5 space-y-4">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Heatmap Slot Waktu Belajar (Jam Terfavorit)</span>
                </span>
              </h3>

              <div className="space-y-2.5">
                {sesiOperations.bySlotWaktu.map((sl, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text-primary)]">{sl.namaSlot}</span>
                      <span className="text-blue-600 font-bold tabular-nums">
                        {sl.totalSesi} Sesi ({sl.persentase}%)
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-subtle)] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(sl.persentase, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hari Belajar Tersibuk */}
            <div className="card-container p-5 space-y-4">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Distribusi Volume Sesi per Hari (Senin - Minggu)</span>
                </span>
              </h3>

              <div className="space-y-2.5">
                {sesiOperations.byDayOfWeek.map((day, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-[var(--text-primary)]">{day.dayName}</span>
                      <span className="text-purple-600 font-bold tabular-nums">
                        {day.totalSesi} Sesi ({day.persentase}%)
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-subtle)] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(day.persentase, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KINERJA INSTRUKTUR & SDM */}
      {activeTab === 'instruktur' && (
        <div className="space-y-6">
          <div className="card-container p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>Leaderboard & Evaluasi Kinerja Instruktur</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Data produktivitas sesi selesai, jam terbang, dan estimasi kompensasi gaji instruktur
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border)]">
                  <tr>
                    <th className="p-3 font-bold">Peringkat & Instruktur</th>
                    <th className="p-3 font-bold text-center">Total Sesi</th>
                    <th className="p-3 font-bold text-center">Selesai</th>
                    <th className="p-3 font-bold text-center">Mobil Ops / Pribadi</th>
                    <th className="p-3 font-bold text-center">Siswa Ditangani</th>
                    <th className="p-3 font-bold text-center">Hari Aktif</th>
                    <th className="p-3 font-bold text-center">Completion Rate</th>
                    <th className="p-3 font-bold text-right">Estimasi Gaji ({data.periodeLabel})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {instrukturLeaderboard.map((ins, idx) => (
                    <tr key={ins.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                      <td className="p-3 font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[11px] ${
                          idx === 0
                            ? 'bg-amber-400 text-amber-950 shadow-xs'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-900'
                            : idx === 2
                            ? 'bg-amber-700 text-amber-100'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                        }`}>
                          {idx + 1}
                        </span>
                        <span>{ins.nama}</span>
                      </td>

                      <td className="p-3 text-center font-bold tabular-nums text-[var(--text-primary)]">
                        {ins.totalSesi} Sesi
                      </td>

                      <td className="p-3 text-center font-bold text-emerald-600 tabular-nums">
                        {ins.sesiSelesai}
                      </td>

                      <td className="p-3 text-center font-medium text-[var(--text-secondary)] tabular-nums">
                        {ins.sesiMobilOps} Ops / {ins.sesiMobilPribadi} Pribadi
                      </td>

                      <td className="p-3 text-center font-bold tabular-nums">
                        {ins.totalSiswa} Siswa
                      </td>

                      <td className="p-3 text-center font-semibold tabular-nums">
                        {ins.hariAktif} Hari
                      </td>

                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          ins.completionRate >= 90
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {ins.completionRate}%
                        </span>
                      </td>

                      <td className="p-3 text-right font-extrabold text-[var(--brand-primary)] tabular-nums text-sm">
                        {formatRupiah(ins.totalEstimasiGaji)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ARMADA & EFISIENSI BBM */}
      {activeTab === 'armada' && (
        <div className="space-y-6">
          <div className="card-container p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                  <Car className="w-5 h-5 text-emerald-600" />
                  <span>Utilisasi Armada & Analitik Efisiensi BBM</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Monitoring jarak tempuh, konsumsi bahan bakar, dan rasio biaya per kilometer
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border)]">
                  <tr>
                    <th className="p-3 font-bold">Armada Mobil</th>
                    <th className="p-3 font-bold text-center">Sesi Selesai</th>
                    <th className="p-3 font-bold text-center">Jarak Tempuh</th>
                    <th className="p-3 font-bold text-center">Konsumsi BBM</th>
                    <th className="p-3 font-bold text-center">Efisiensi (km/L)</th>
                    <th className="p-3 font-bold text-center">Biaya / KM</th>
                    <th className="p-3 font-bold text-center">Status Servis / Oli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {armadaAnalytics.map((arm) => (
                    <tr key={arm.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                      <td className="p-3 font-bold text-[var(--text-primary)]">
                        <div>{arm.nama}</div>
                        <div className="text-[10px] text-[var(--text-secondary)] font-normal">{arm.plat}</div>
                      </td>

                      <td className="p-3 text-center font-bold tabular-nums">
                        {arm.totalSesi} Sesi
                      </td>

                      <td className="p-3 text-center font-bold text-blue-600 tabular-nums">
                        {arm.totalJarakKm.toLocaleString('id-ID')} km
                      </td>

                      <td className="p-3 text-center font-semibold tabular-nums">
                        {arm.totalLiterBBM.toLocaleString('id-ID')} Liter ({formatRupiah(arm.totalBiayaBBM)})
                      </td>

                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                          {arm.kmPerLiter} km/L
                        </span>
                      </td>

                      <td className="p-3 text-center font-bold tabular-nums">
                        {formatRupiah(arm.biayaPerKm)} / km
                      </td>

                      <td className="p-3 text-center">
                        {arm.perluPerhatian ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Perlu Ganti Oli</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                            Prima ({arm.kmSejakGantiOli} km)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
