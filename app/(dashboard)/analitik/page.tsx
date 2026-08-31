'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/PageHeader';
import { getAnalitikData, AnalitikData } from '@/lib/actions/analitik';
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
  Clock,
  IdCard,
  BarChart3,
  Layers,
  Fuel,
  Printer,
} from 'lucide-react';

// Dynamic import for Recharts to avoid SSR hydration mismatches
const AnalitikCashflowChart = dynamic(
  () => import('@/components/analitik/AnalitikInteractiveCharts').then((mod) => mod.AnalitikCashflowChart),
  { ssr: false, loading: () => <div className="h-72 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" /> }
);
const AnalitikChannelChart = dynamic(
  () => import('@/components/analitik/AnalitikInteractiveCharts').then((mod) => mod.AnalitikChannelChart),
  { ssr: false, loading: () => <div className="h-64 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" /> }
);
const AnalitikSlotChart = dynamic(
  () => import('@/components/analitik/AnalitikInteractiveCharts').then((mod) => mod.AnalitikSlotChart),
  { ssr: false, loading: () => <div className="h-64 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" /> }
);
const AnalitikDayChart = dynamic(
  () => import('@/components/analitik/AnalitikInteractiveCharts').then((mod) => mod.AnalitikDayChart),
  { ssr: false, loading: () => <div className="h-64 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" /> }
);

type AnalyticsTab = 'keuangan' | 'siswa' | 'sesi' | 'instruktur' | 'armada';
type PeriodOption = 'this_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'this_year' | 'all' | 'custom';

export default function AnalitikPage() {
  const [data, setData] = React.useState<AnalitikData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<AnalyticsTab>('keuangan');
  const [period, setPeriod] = React.useState<PeriodOption>('this_month');
  const [customStart, setCustomStart] = React.useState<string>('');
  const [customEnd, setCustomEnd] = React.useState<string>('');

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

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pusat Analitik & Performa"
          description="Data analitik komprehensif perkembangan bisnis, kinerja instruktur, dan efisiensi armada"
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse border border-[var(--border)]" />
          ))}
        </div>
        <div className="h-96 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse border border-[var(--border)]" />
      </div>
    );
  }

  const { summaryKPI, siswaGrowth, sesiOperations, instrukturLeaderboard, armadaAnalytics, finansialExecutive } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Clean Period Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--brand-primary)]" />
              <span>Pusat Analitik & Performa</span>
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-mono text-[11px] border border-[var(--border)]">
              {data.periodeLabel}
            </span>
          </div>
        </div>

        {/* Period Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center p-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-xs font-semibold">
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
                className={`px-2.5 py-1 rounded-md transition-all ${
                  period === p.key
                    ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Cetak Halaman"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Date Picker Bar */}
      {period === 'custom' && (
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DatePickerWIB label="Tanggal Awal" value={customStart} onChange={setCustomStart} />
          <DatePickerWIB label="Tanggal Akhir" value={customEnd} onChange={setCustomEnd} />
        </div>
      )}

      {/* Top Metric Strip (Real Data, Zero Fluff) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Omzet Booking */}
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
          <span className="text-[11px] font-medium text-[var(--text-secondary)] block">Omzet Booking</span>
          <div className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
            {formatRupiah(summaryKPI.totalOmzet)}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">{summaryKPI.totalSiswa} Siswa Terdaftar</span>
        </div>

        {/* Pemasukan Kas */}
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
          <span className="text-[11px] font-medium text-[var(--text-secondary)] block">Pemasukan Kas</span>
          <div className="text-base sm:text-lg font-bold text-emerald-600 tabular-nums mt-0.5">
            {formatRupiah(finansialExecutive.totalPemasukan)}
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Terbayar Riil</span>
        </div>

        {/* Piutang Belum Tertagih */}
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
          <span className="text-[11px] font-medium text-[var(--text-secondary)] block">Sisa Piutang</span>
          <div className="text-base sm:text-lg font-bold text-amber-600 tabular-nums mt-0.5">
            {formatRupiah(summaryKPI.totalPiutang)}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">DP & Belum Bayar</span>
        </div>

        {/* Laba Bersih Operasional */}
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
          <span className="text-[11px] font-medium text-[var(--text-secondary)] block">Laba Bersih Kas</span>
          <div className={`text-base sm:text-lg font-bold tabular-nums mt-0.5 ${summaryKPI.labaBersih >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatRupiah(summaryKPI.labaBersih)}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">{summaryKPI.profitMargin}% Net Margin</span>
        </div>

        {/* Sesi Selesai */}
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
          <span className="text-[11px] font-medium text-[var(--text-secondary)] block">Sesi Selesai</span>
          <div className="text-base sm:text-lg font-bold text-blue-600 tabular-nums mt-0.5">
            {summaryKPI.totalSesiSelesai} <span className="text-xs font-normal text-[var(--text-secondary)]">Sesi</span>
          </div>
          <span className="text-[10px] text-blue-600 font-medium">{summaryKPI.completionRateSesi}% Selesai</span>
        </div>

        {/* Jarak Tempuh Armada */}
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
          <span className="text-[11px] font-medium text-[var(--text-secondary)] block">Jarak Tempuh Armada</span>
          <div className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
            {summaryKPI.totalKmOperasional.toLocaleString('id-ID')} <span className="text-xs font-normal text-[var(--text-secondary)]">KM</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">{summaryKPI.rataRataEfisiensiBBM} km/L BBM</span>
        </div>
      </div>

      {/* Modern Compact Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] pb-2 overflow-x-auto text-xs font-semibold">
        {(
          [
            { key: 'keuangan', label: '1. Arus Kas & Finansial', icon: Wallet },
            { key: 'siswa', label: '2. Siswa & Channel Leads', icon: Users },
            { key: 'sesi', label: '3. Operasional Sesi & Jam Belajar', icon: Calendar },
            { key: 'instruktur', label: '4. Leaderboard & Kinerja Instruktur', icon: Award },
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
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--text-primary)] text-[var(--bg)] font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: KEUANGAN & ARUS KAS */}
      {activeTab === 'keuangan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Arus Kas */}
            <div className="lg:col-span-2 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Arus Kas Historis (Pemasukan vs Pengeluaran 6 Bulan)
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">Nominal Kas Riil</span>
              </div>
              <AnalitikCashflowChart data={finansialExecutive.cashflowMonthly} />
            </div>

            {/* Rincian Beban Biaya Pengeluaran */}
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Rincian Pengeluaran Kas ({data.periodeLabel})
                </span>
                <span className="text-xs font-bold text-rose-600 tabular-nums">
                  {formatRupiah(finansialExecutive.totalPengeluaran)}
                </span>
              </div>

              <div className="space-y-2">
                {finansialExecutive.expenseBreakdown.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-secondary)]">Belum ada pengeluaran kas</div>
                ) : (
                  finansialExecutive.expenseBreakdown.map((exp, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-[var(--text-primary)]">{exp.label}</span>
                        <span className="text-[var(--text-primary)] font-bold tabular-nums">
                          {formatRupiah(exp.nominal)} ({exp.persentase}%)
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-subtle)] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${Math.max(exp.persentase, 3)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SISWA & CHANNEL MARKETING */}
      {activeTab === 'siswa' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart Channel Marketing */}
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Akuisisi Siswa per Channel Marketing
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">{summaryKPI.totalSiswa} Siswa Total</span>
              </div>
              <AnalitikChannelChart data={siswaGrowth.byChannel} />
            </div>

            {/* Tabel Kontribusi Channel */}
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Data Omzet per Channel Marketing
                </span>
              </div>

              <table className="w-full text-xs text-left border-collapse">
                <thead className="text-[var(--text-secondary)] border-b border-[var(--border)]">
                  <tr>
                    <th className="py-2 font-semibold">Channel</th>
                    <th className="py-2 font-semibold text-center">Siswa</th>
                    <th className="py-2 font-semibold text-center">Porsi (%)</th>
                    <th className="py-2 font-semibold text-right">Kontribusi Omzet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {siswaGrowth.byChannel.map((ch, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-semibold text-[var(--text-primary)]">{ch.channel}</td>
                      <td className="py-2 text-center tabular-nums font-bold">{ch.totalSiswa}</td>
                      <td className="py-2 text-center tabular-nums text-[var(--text-secondary)]">{ch.persentase}%</td>
                      <td className="py-2 text-right tabular-nums font-bold text-emerald-600">{formatRupiah(ch.totalOmzet)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabel Distribusi Paket Kursus */}
          <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Distribusi Penjualan Paket Kursus ({data.periodeLabel})
              </span>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead className="text-[var(--text-secondary)] border-b border-[var(--border)]">
                <tr>
                  <th className="py-2 font-semibold">Nama Paket</th>
                  <th className="py-2 font-semibold text-center">Tipe</th>
                  <th className="py-2 font-semibold text-center">Siswa Mendaftar</th>
                  <th className="py-2 font-semibold text-center">Porsi Penjualan</th>
                  <th className="py-2 font-semibold text-right">Total Omzet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {siswaGrowth.byPackage.map((pkg, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-semibold text-[var(--text-primary)]">{pkg.namaPaket}</td>
                    <td className="py-2 text-center">
                      {pkg.termasukSim ? (
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-[10px]">
                          Kursus + SIM
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-medium text-[10px]">
                          Kursus Saja
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-center tabular-nums font-bold">{pkg.totalTerjual}</td>
                    <td className="py-2 text-center tabular-nums text-[var(--text-secondary)]">{pkg.persentase}%</td>
                    <td className="py-2 text-right tabular-nums font-bold text-[var(--brand-primary)]">{formatRupiah(pkg.totalOmzet)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: OPERASIONAL SESI & JADWAL */}
      {activeTab === 'sesi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Slot Waktu Heatmap */}
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Volume Sesi per Slot Waktu (Jam Belajar)
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">Slot 1 s/d Slot 6</span>
              </div>
              <AnalitikSlotChart data={sesiOperations.bySlotWaktu} />
            </div>

            {/* Hari Belajar Tersibuk */}
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Volume Sesi per Hari (Senin s/d Minggu)
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">Total Sesi Lapangan</span>
              </div>
              <AnalitikDayChart data={sesiOperations.byDayOfWeek} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KINERJA INSTRUKTUR (SDM) */}
      {activeTab === 'instruktur' && (
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Data Kinerja & Produktivitas Instruktur ({data.periodeLabel})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="text-[var(--text-secondary)] border-b border-[var(--border)]">
                <tr>
                  <th className="py-2.5 font-semibold">Nama Instruktur</th>
                  <th className="py-2.5 font-semibold text-center">Total Sesi</th>
                  <th className="py-2.5 font-semibold text-center">Selesai</th>
                  <th className="py-2.5 font-semibold text-center">Mobil Ops / Pribadi</th>
                  <th className="py-2.5 font-semibold text-center">Siswa Dibimbing</th>
                  <th className="py-2.5 font-semibold text-center">Hari Kerja Aktif</th>
                  <th className="py-2.5 font-semibold text-center">Completion Rate</th>
                  <th className="py-2.5 font-semibold text-right">Estimasi Gaji / Honor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {instrukturLeaderboard.map((ins, idx) => (
                  <tr key={ins.id}>
                    <td className="py-2.5 font-bold text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[var(--text-secondary)] font-mono">#{idx + 1}</span>
                        <span>{ins.nama}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center tabular-nums font-semibold">{ins.totalSesi}</td>
                    <td className="py-2.5 text-center tabular-nums font-bold text-emerald-600">{ins.sesiSelesai}</td>
                    <td className="py-2.5 text-center tabular-nums text-[var(--text-secondary)]">
                      {ins.sesiMobilOps} Ops / {ins.sesiMobilPribadi} Pribadi
                    </td>
                    <td className="py-2.5 text-center tabular-nums font-medium">{ins.totalSiswa} Siswa</td>
                    <td className="py-2.5 text-center tabular-nums font-medium">{ins.hariAktif} Hari</td>
                    <td className="py-2.5 text-center tabular-nums">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        ins.completionRate >= 90
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {ins.completionRate}%
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-bold text-[var(--brand-primary)]">
                      {formatRupiah(ins.totalEstimasiGaji)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ARMADA MOBIL & BBM */}
      {activeTab === 'armada' && (
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Data Utilisasi Armada & Konsumsi Bahan Bakar ({data.periodeLabel})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="text-[var(--text-secondary)] border-b border-[var(--border)]">
                <tr>
                  <th className="py-2.5 font-semibold">Armada</th>
                  <th className="py-2.5 font-semibold text-center">Sesi Selesai</th>
                  <th className="py-2.5 font-semibold text-center">Jarak Tempuh</th>
                  <th className="py-2.5 font-semibold text-center">Konsumsi BBM</th>
                  <th className="py-2.5 font-semibold text-center">Efisiensi (km/L)</th>
                  <th className="py-2.5 font-semibold text-center">Biaya / KM</th>
                  <th className="py-2.5 font-semibold text-center">Status Ganti Oli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {armadaAnalytics.map((arm) => (
                  <tr key={arm.id}>
                    <td className="py-2.5 font-bold text-[var(--text-primary)]">
                      <div>{arm.nama}</div>
                      <div className="text-[10px] text-[var(--text-secondary)] font-mono">{arm.plat}</div>
                    </td>
                    <td className="py-2.5 text-center tabular-nums font-semibold">{arm.totalSesi}</td>
                    <td className="py-2.5 text-center tabular-nums font-bold text-blue-600">
                      {arm.totalJarakKm.toLocaleString('id-ID')} km
                    </td>
                    <td className="py-2.5 text-center tabular-nums">
                      {arm.totalLiterBBM.toLocaleString('id-ID')} L ({formatRupiah(arm.totalBiayaBBM)})
                    </td>
                    <td className="py-2.5 text-center tabular-nums font-bold text-emerald-600">
                      {arm.kmPerLiter} km/L
                    </td>
                    <td className="py-2.5 text-center tabular-nums font-medium">
                      {formatRupiah(arm.biayaPerKm)} / km
                    </td>
                    <td className="py-2.5 text-center">
                      {arm.perluPerhatian ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                          Perlu Servis ({arm.kmSejakGantiOli} km)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                          Normal ({arm.kmSejakGantiOli} km)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
