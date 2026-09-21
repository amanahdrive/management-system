'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { getAnalitikData, AnalitikData, AnalitikFilter } from '@/lib/actions/analitik';
import { formatRupiah } from '@/lib/utils/currency';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { addDaysToDateStr } from '@/lib/utils/date';
import {
  TrendingUp,
  TrendingDown,
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
  RefreshCw,
  FileText,
  AlertOctagon,
  ArrowRight,
  Filter,
  DollarSign,
  Phone,
  ShieldAlert,
} from 'lucide-react';
import { useAppRefresh, triggerAppRefresh } from '@/lib/utils/refresh-event';
import { purgeServerCache } from '@/lib/actions/cache';
import { AnalitikFunnelVisualizer } from '@/components/analitik/AnalitikFunnelVisualizer';
import { AnalitikBottleneckRadar } from '@/components/analitik/AnalitikBottleneckRadar';

// Dynamic imports for Recharts to prevent hydration mismatch
const AnalitikCashflowChart = dynamic(
  () => import('@/components/analitik/AnalitikInteractiveCharts').then((mod) => mod.AnalitikCashflowChart),
  { ssr: false, loading: () => <div className="h-72 rounded-none bg-black/5 dark:bg-white/5 animate-pulse" /> }
);
const AnalitikChannelChart = dynamic(
  () => import('@/components/analitik/AnalitikInteractiveCharts').then((mod) => mod.AnalitikChannelChart),
  { ssr: false, loading: () => <div className="h-64 rounded-none bg-black/5 dark:bg-white/5 animate-pulse" /> }
);
const AnalitikSlotChart = dynamic(
  () => import('@/components/analitik/AnalitikInteractiveCharts').then((mod) => mod.AnalitikSlotChart),
  { ssr: false, loading: () => <div className="h-64 rounded-none bg-black/5 dark:bg-white/5 animate-pulse" /> }
);
const AnalitikDayChart = dynamic(
  () => import('@/components/analitik/AnalitikInteractiveCharts').then((mod) => mod.AnalitikDayChart),
  { ssr: false, loading: () => <div className="h-64 rounded-none bg-black/5 dark:bg-white/5 animate-pulse" /> }
);
const AnalitikPackageDonutChart = dynamic(
  () => import('@/components/analitik/AnalitikInteractiveCharts').then((mod) => mod.AnalitikPackageDonutChart),
  { ssr: false, loading: () => <div className="h-64 rounded-none bg-black/5 dark:bg-white/5 animate-pulse" /> }
);
const AnalitikInstructorCapacityChart = dynamic(
  () => import('@/components/analitik/AnalitikInteractiveCharts').then((mod) => mod.AnalitikInstructorCapacityChart),
  { ssr: false, loading: () => <div className="h-64 rounded-none bg-black/5 dark:bg-white/5 animate-pulse" /> }
);

type AnalyticsTab = 'overview' | 'siswa' | 'keuangan' | 'armada' | 'instruktur' | 'bottleneck';
type PeriodOption = 'this_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'this_year' | 'all' | 'custom';

export default function AnalitikPage() {
  const [data, setData] = React.useState<AnalitikData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<AnalyticsTab>('overview');
  const [period, setPeriod] = React.useState<PeriodOption>('this_month');
  const [showComparison, setShowComparison] = React.useState<boolean>(true);
  const [customStart, setCustomStart] = React.useState<string>('');
  const [customEnd, setCustomEnd] = React.useState<string>('');
  const [activeAiQuery, setActiveAiQuery] = React.useState<'leakage' | 'fleet' | 'instructor' | 'marketing'>('leakage');

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

  useAppRefresh(loadData);

  const handleManualSync = async () => {
    try {
      await purgeServerCache();
      await loadData();
      triggerAppRefresh();
    } catch (e) {
      console.error('Error syncing analitik:', e);
    }
  };

  const renderDeltaBadge = (delta: number, isInverse: boolean = false) => {
    if (!showComparison || !data?.comparisonMoM?.hasComparison) return null;
    const isPositive = delta > 0;
    const isZero = delta === 0;
    const isGood = isInverse ? !isPositive : isPositive;

    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-none ${
          isZero
            ? 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
            : isGood
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
        }`}
        title={`Perubahan dibanding ${data.comparisonMoM.prevPeriodeLabel}`}
      >
        {isZero ? null : isPositive ? (
          <TrendingUp className="w-2.5 h-2.5" />
        ) : (
          <TrendingDown className="w-2.5 h-2.5" />
        )}
        <span>{delta > 0 ? `+${delta}%` : `${delta}%`}</span>
      </span>
    );
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pusat Analitik & Intelijen Bisnis"
          description="Enterprise SaaS business analytics, conversion funnels, unit economics, dan diagnostik bottleneck"
        />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-none bg-black/5 dark:bg-white/5 animate-pulse border border-[var(--border)]" />
          ))}
        </div>
        <div className="h-96 rounded-none bg-black/5 dark:bg-white/5 animate-pulse border border-[var(--border)]" />
      </div>
    );
  }

  const {
    summaryKPI,
    comparisonMoM,
    conversionFunnel,
    sesiFunnel,
    unitEconomics,
    agingPiutang,
    bottlenecks,
    siswaGrowth,
    sesiOperations,
    instrukturLeaderboard,
    armadaAnalytics,
    finansialExecutive,
    strategicInsights,
  } = data;

  const criticalBottleneckCount = bottlenecks.filter((b) => b.severity === 'critical').length;

  return (
    <div className="space-y-6 pb-16">
      {/* Executive Header & Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[var(--brand-primary)]" />
              <span>Pusat Analitik & Intelijen Bisnis</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-mono text-[10px] font-bold uppercase tracking-wider">
              Enterprise Suite
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-mono text-[11px] border border-[var(--border)] font-semibold">
              {data.periodeLabel}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Visualisasi funnel multi-tahap, intelijen keuangan akrual vs kas, efisiensi operasional armada, dan deteksi hambatan bisnis
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Compare Toggle */}
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className={`px-3 py-1.5 border text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs ${
              showComparison
                ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-subtle)]'
            }`}
            title="Bandingkan metrik dengan periode sebelumnya (MoM)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">MoM vs {comparisonMoM.prevPeriodeLabel || 'Lalu'}</span>
            <span className="sm:hidden">MoM</span>
          </button>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={loading}
            className="px-3 py-1.5 border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
            title="Bersihkan cache server dan sinkronkan data analitik dengan database terbaru"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
          </button>

          {/* Period Selector Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs font-semibold overflow-x-auto shadow-xs">
            {(
              [
                { key: 'this_month', label: 'Bulan Ini' },
                { key: 'last_month', label: 'Bulan Lalu' },
                { key: 'q3', label: 'Q3' },
                { key: 'this_year', label: 'Tahun Ini' },
                { key: 'all', label: 'Semua' },
                { key: 'custom', label: 'Kustom' },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap ${
                  period === p.key
                    ? 'bg-[var(--card-bg)] text-[var(--brand-primary)] shadow-xs font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Print Report */}
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shadow-xs"
            title="Cetak Ringkasan Eksekutif"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Date Picker Bar */}
      {period === 'custom' && (
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] space-y-2 animate-fadeIn shadow-xs">
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
                  if (val > maxEnd) setCustomEnd(maxEnd);
                  else if (val < customStart) setCustomEnd(customStart);
                  else setCustomEnd(val);
                } else {
                  setCustomEnd(val);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Top Metric Strip (6 Core KPI Scorecards with Ambient Gradients & MoM Badges) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. Omzet Booking (Akrual) */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-1.5 relative overflow-hidden group hover:border-[var(--brand-primary)]/40 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              <span>Omzet Booking</span>
            </span>
            {renderDeltaBadge(comparisonMoM.deltaOmzet)}
          </div>
          <div className="text-base sm:text-lg font-black text-[var(--text-primary)] tabular-nums font-mono">
            {formatRupiah(summaryKPI.totalOmzet)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            {summaryKPI.totalSiswa} Siswa Terdaftar
          </span>
        </div>

        {/* 2. Pemasukan Kas Riil */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-1.5 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kas Riil Masuk</span>
            </span>
            {renderDeltaBadge(comparisonMoM.deltaPemasukan)}
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-600 tabular-nums font-mono">
            {formatRupiah(finansialExecutive.totalPemasukan)}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold block">
            Terbayar Tunai / Transfer
          </span>
        </div>

        {/* 3. Sisa Piutang */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-1.5 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Sisa Piutang</span>
            </span>
            <span className="text-[10px] font-mono text-amber-600 font-bold">
              {summaryKPI.totalOmzet > 0 ? Math.round((summaryKPI.totalPiutang / summaryKPI.totalOmzet) * 100) : 0}% Omzet
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-amber-600 tabular-nums font-mono">
            {formatRupiah(summaryKPI.totalPiutang)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            {agingPiutang.siswaUnpaidCount} Siswa Belum Lunas
          </span>
        </div>

        {/* 4. Laba Bersih Kas */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-1.5 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Laba Bersih Kas</span>
            </span>
            {renderDeltaBadge(comparisonMoM.deltaLabaBersih)}
          </div>
          <div
            className={`text-base sm:text-lg font-black tabular-nums font-mono ${
              summaryKPI.labaBersih >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatRupiah(summaryKPI.labaBersih)}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            Margin: {summaryKPI.profitMargin}%
          </span>
        </div>

        {/* 5. Sesi Selesai */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-1.5 relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Sesi Selesai</span>
            </span>
            {renderDeltaBadge(comparisonMoM.deltaSesiSelesai)}
          </div>
          <div className="text-base sm:text-lg font-black text-blue-600 tabular-nums font-mono">
            {summaryKPI.totalSesiSelesai} <span className="text-xs font-normal text-[var(--text-muted)]">Sesi</span>
          </div>
          <span className="text-[10px] text-blue-600 font-semibold block">
            {summaryKPI.completionRateSesi}% Completion Rate
          </span>
        </div>

        {/* 6. Utilisasi Jarak Armada */}
        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-1.5 relative overflow-hidden group hover:border-teal-500/40 transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-teal-500/10 to-transparent rounded-bl-3xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              <span>Jarak Armada</span>
            </span>
            {renderDeltaBadge(comparisonMoM.deltaEfisiensiBBM)}
          </div>
          <div className="text-base sm:text-lg font-black text-[var(--text-primary)] tabular-nums font-mono">
            {summaryKPI.totalKmOperasional.toLocaleString('id-ID')} <span className="text-xs font-normal text-[var(--text-muted)]">KM</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block">
            Efisiensi: {summaryKPI.rataRataEfisiensiBBM} km/L BBM
          </span>
        </div>
      </div>

      {/* Modern Enterprise Tabs (6 Categories) */}
      <div className="flex items-center gap-1 border-b border-[var(--border)] pb-2 overflow-x-auto text-xs font-semibold">
        {(
          [
            { key: 'overview', label: '1. Ringkasan & Funnel', icon: TrendingUp, badge: null, badgeColor: undefined },
            { key: 'siswa', label: '2. Data Siswa & Akuisisi', icon: Users, badge: `${summaryKPI.totalSiswa}`, badgeColor: undefined },
            { key: 'keuangan', label: '3. Data Keuangan & Kas', icon: Wallet, badge: null, badgeColor: undefined },
            { key: 'armada', label: '4. Data Armada & BBM', icon: Car, badge: `${armadaAnalytics.length}`, badgeColor: undefined },
            { key: 'instruktur', label: '5. Data Instruktur & SDM', icon: Award, badge: `${instrukturLeaderboard.length}`, badgeColor: undefined },
            {
              key: 'bottleneck',
              label: '6. Bottleneck Bisnis & Friksi',
              icon: AlertOctagon,
              badge: criticalBottleneckCount > 0 ? `${criticalBottleneckCount} Kritis` : `${bottlenecks.length}`,
              badgeColor: criticalBottleneckCount > 0 ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white',
            },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap text-xs font-semibold ${
                isActive
                  ? 'bg-[var(--text-primary)] text-[var(--bg)] font-bold shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.badge && (
                <span
                  className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full ${
                    isActive
                      ? 'bg-[var(--bg)] text-[var(--text-primary)]'
                      : t.badgeColor || 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)]'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: RINGKASAN EKSEKUTIF & MASTER FUNNEL */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Unit Economics Strip */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Unit Economics & Rasio Efisiensi Bisnis</span>
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                Agregasi Periode {data.periodeLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-1">
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]/60">
                <span className="text-[10px] text-[var(--text-muted)] block font-medium">ARPU (Omzet / Siswa)</span>
                <span className="text-sm sm:text-base font-black text-[var(--text-primary)] font-mono tabular-nums">
                  {formatRupiah(unitEconomics.arpu)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]/60">
                <span className="text-[10px] text-[var(--text-muted)] block font-medium">Biaya Rata-rata / Siswa</span>
                <span className="text-sm sm:text-base font-black text-rose-600 font-mono tabular-nums">
                  {formatRupiah(unitEconomics.avgCostPerSiswa)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]/60">
                <span className="text-[10px] text-[var(--text-muted)] block font-medium">Gross Margin / Sesi</span>
                <span
                  className={`text-sm sm:text-base font-black font-mono tabular-nums ${
                    unitEconomics.grossMarginPerSesi >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatRupiah(unitEconomics.grossMarginPerSesi)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]/60">
                <span className="text-[10px] text-[var(--text-muted)] block font-medium">Utilisasi Armada</span>
                <span className="text-sm sm:text-base font-black text-blue-600 font-mono tabular-nums">
                  {unitEconomics.fleetUtilizationRate}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]/60">
                <span className="text-[10px] text-[var(--text-muted)] block font-medium">Beban Rata-rata Instruktur</span>
                <span className="text-sm sm:text-base font-black text-[var(--brand-primary)] font-mono tabular-nums">
                  {unitEconomics.instructorAvgLoad} Sesi / Orang
                </span>
              </div>
            </div>
          </div>

          {/* Master Conversion Funnel Visualizer */}
          <AnalitikFunnelVisualizer
            stages={conversionFunnel.stages}
            overallConversionRate={conversionFunnel.overallConversionRate}
            totalRevenueLeakage={conversionFunnel.totalRevenueLeakage}
            activeVelocityDays={conversionFunnel.activeVelocityDays}
            students={conversionFunnel.funnelStudents}
          />

          {/* Executive Intelligence Grid (Image 1 Style: AI Assist & Created Pipeline Milestones) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. AI Assist & Pipeline Milestones (Image 1 Style) */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3.5 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      AI Assist & Business Intelijen
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-mono text-[9px] font-bold">
                    Advisor v3.0
                  </span>
                </div>

                {/* Interactive Query Box */}
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                    Pilih Topik Intelijen Cepat:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: 'leakage', label: 'Kebocoran Omzet' },
                      { key: 'fleet', label: 'Rotasi Armada' },
                      { key: 'instructor', label: 'Beban Instruktur' },
                      { key: 'marketing', label: 'Saluran Promosi' },
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        type="button"
                        onClick={() => setActiveAiQuery(btn.key as any)}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all text-left ${
                          activeAiQuery === btn.key
                            ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-xs'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--card-bg)]'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* AI Response Card */}
                  <div className="p-3 rounded-xl bg-gradient-to-br from-[var(--bg-subtle)] to-[var(--card-bg)] border border-[var(--border)] text-xs text-[var(--text-secondary)] leading-relaxed mt-2 animate-fadeIn">
                    {activeAiQuery === 'leakage' && (
                      <div>
                        <span className="font-bold text-[var(--text-primary)] block mb-1">
                          Diagnosa Kebocoran Konversi:
                        </span>
                        Terdapat <span className="font-bold text-rose-600 font-mono">{formatRupiah(conversionFunnel.totalRevenueLeakage)}</span> potensi omzet tertahan pada siswa yang belum melunasi biaya kursus setelah DP. Disarankan mengaktifkan pesan penagihan otomatis saat jadwal sesi ke-3 siswa disetujui.
                      </div>
                    )}
                    {activeAiQuery === 'fleet' && (
                      <div>
                        <span className="font-bold text-[var(--text-primary)] block mb-1">
                          Kondisi Armada Operasional:
                        </span>
                        Tingkat utilisasi armada berada pada <span className="font-bold text-blue-600 font-mono">{unitEconomics.fleetUtilizationRate}%</span>. Armada dengan efisiensi tertinggi mencapai <span className="font-bold text-emerald-600 font-mono">{summaryKPI.rataRataEfisiensiBBM} km/L</span>. Pastikan servis berkala sebelum 5.000 km.
                      </div>
                    )}
                    {activeAiQuery === 'instructor' && (
                      <div>
                        <span className="font-bold text-[var(--text-primary)] block mb-1">
                          Optimasi Beban Kerja SDM:
                        </span>
                        Rata-rata instruktur menangani <span className="font-bold text-[var(--brand-primary)] font-mono">{unitEconomics.instructorAvgLoad} sesi</span> pada periode ini. Pertahankan pembagian slot merata agar kepuasan siswa tetap prima.
                      </div>
                    )}
                    {activeAiQuery === 'marketing' && (
                      <div>
                        <span className="font-bold text-[var(--text-primary)] block mb-1">
                          Efektivitas Saluran Promosi:
                        </span>
                        Saluran dengan rasio pelunasan tertinggi adalah <span className="font-bold text-emerald-600">{siswaGrowth.byChannel[0]?.channel || 'Organik'}</span> ({siswaGrowth.byChannel[0]?.conversionRate || 0}% rasio lunas). Alokasikan fokus tindak lanjut ke saluran ini.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Created Automations & Pipeline Milestones (Image 1 Style) */}
              <div className="pt-3 border-t border-[var(--border)] space-y-2">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider block">
                  Automations & Pipeline Milestones
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]/70 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span className="font-bold text-[var(--text-primary)]">New Opportunity</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">Entry point pendaftaran</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]/70 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="font-bold text-[var(--text-primary)]">First Drive Booked</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">Aktivasi latihan perdana</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]/70 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="font-bold text-[var(--text-primary)]">Convert & Alumni</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">Kelulusan & Penerbitan SIM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Top Critical Bottlenecks Radar Preview */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                  <span>Deteksi Bottleneck Bisnis ({bottlenecks.length} Teridentifikasi)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('bottleneck')}
                  className="text-[11px] font-bold text-[var(--brand-primary)] hover:underline flex items-center gap-1"
                >
                  <span>Lihat Detail</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {bottlenecks.slice(0, 3).map((b) => (
                  <div
                    key={b.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      b.severity === 'critical'
                        ? 'border-rose-200 dark:border-rose-950/80 bg-rose-50/50 dark:bg-rose-950/20'
                        : 'border-amber-200 dark:border-amber-950/80 bg-amber-50/50 dark:bg-amber-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-primary)]">{b.title}</span>
                      <span className="text-[10px] font-mono text-rose-600 font-bold">{b.impactValue}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">{b.rootCause}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Strategic Executive Insights */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>Bahan Evaluasi Manajemen</span>
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">Actionable Insights</span>
              </div>

              <div className="space-y-2 pt-1">
                {strategicInsights.slice(0, 3).map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      insight.type === 'action'
                        ? 'border-rose-200 dark:border-rose-950/80 bg-rose-50/50 dark:bg-rose-950/20'
                        : insight.type === 'warning'
                        ? 'border-amber-200 dark:border-amber-950/80 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border-[var(--border)] bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="font-bold text-[var(--text-primary)]">{insight.title}</div>
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">{insight.description}</p>
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      💡 {insight.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DATA SISWA & FUNNEL AKUISISI */}
      {activeTab === 'siswa' && (
        <div className="space-y-6">
          {/* Funnel Stepped Component */}
          <AnalitikFunnelVisualizer
            stages={conversionFunnel.stages}
            overallConversionRate={conversionFunnel.overallConversionRate}
            totalRevenueLeakage={conversionFunnel.totalRevenueLeakage}
            activeVelocityDays={conversionFunnel.activeVelocityDays}
            students={conversionFunnel.funnelStudents}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart Channel Marketing */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Akuisisi Siswa per Saluran Marketing
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">{summaryKPI.totalSiswa} Siswa Total</span>
              </div>
              <AnalitikChannelChart data={siswaGrowth.byChannel} />
            </div>

            {/* Tabel Kontribusi Channel */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Data Efisiensi Saluran & Rasio Pelunasan
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
                    <tr>
                      <th className="py-2.5 px-2 font-semibold">Saluran</th>
                      <th className="py-2.5 px-2 font-semibold text-center">Siswa</th>
                      <th className="py-2.5 px-2 font-semibold text-center">Porsi (%)</th>
                      <th className="py-2.5 px-2 font-semibold text-center">Rasio Lunas</th>
                      <th className="py-2.5 px-2 font-semibold text-right">Kontribusi Omzet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {siswaGrowth.byChannel.map((ch, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                        <td className="py-2.5 px-2 font-semibold text-[var(--text-primary)]">{ch.channel}</td>
                        <td className="py-2.5 px-2 text-center tabular-nums font-bold">{ch.totalSiswa}</td>
                        <td className="py-2.5 px-2 text-center tabular-nums text-[var(--text-secondary)]">{ch.persentase}%</td>
                        <td className="py-2.5 px-2 text-center tabular-nums font-mono font-bold text-emerald-600">
                          {ch.conversionRate}%
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-bold text-emerald-600 font-mono">
                          {formatRupiah(ch.totalOmzet)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bauran Paket Kursus & Donut Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Bauran Paket Kursus Terjual
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">Porsi Penjualan</span>
              </div>
              <AnalitikPackageDonutChart data={siswaGrowth.byPackage} />
            </div>

            <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Rincian Penjualan Paket Kursus & Bundling SIM
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
                    <tr>
                      <th className="py-2.5 px-2 font-semibold">Nama Paket</th>
                      <th className="py-2.5 px-2 font-semibold text-center">Tipe</th>
                      <th className="py-2.5 px-2 font-semibold text-center">Siswa Mendaftar</th>
                      <th className="py-2.5 px-2 font-semibold text-center">Porsi (%)</th>
                      <th className="py-2.5 px-2 font-semibold text-right">Total Omzet</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {siswaGrowth.byPackage.map((pkg, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                        <td className="py-2.5 px-2 font-semibold text-[var(--text-primary)]">{pkg.namaPaket}</td>
                        <td className="py-2.5 px-2 text-center">
                          {pkg.termasukSim ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-[10px]">
                              Kursus + SIM
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-medium text-[10px]">
                              Kursus Saja
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center tabular-nums font-bold">{pkg.totalTerjual}</td>
                        <td className="py-2.5 px-2 text-center tabular-nums text-[var(--text-secondary)]">{pkg.persentase}%</td>
                        <td className="py-2.5 px-2 text-right tabular-nums font-bold text-[var(--brand-primary)] font-mono">
                          {formatRupiah(pkg.totalOmzet)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATA KEUANGAN & KAS */}
      {activeTab === 'keuangan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Arus Kas */}
            <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {finansialExecutive.cashflowChartTitle || 'Arus Kas (Pemasukan vs Pengeluaran)'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)] font-mono">
                  {finansialExecutive.cashflowGrouping === 'daily' ? 'Agregasi Harian' : 'Agregasi Bulanan'}
                </span>
              </div>
              <AnalitikCashflowChart
                data={finansialExecutive.cashflowTrend || finansialExecutive.cashflowMonthly}
                grouping={finansialExecutive.cashflowGrouping}
              />
            </div>

            {/* Rincian Beban Biaya OPEX */}
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Rincian Pengeluaran Kas (OPEX)
                </span>
                <span className="text-xs font-bold text-rose-600 tabular-nums font-mono">
                  {formatRupiah(finansialExecutive.totalPengeluaran)}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {finansialExecutive.expenseBreakdown.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-secondary)]">Belum ada pengeluaran kas</div>
                ) : (
                  finansialExecutive.expenseBreakdown.map((exp, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-[var(--text-primary)]">{exp.label}</span>
                        <span className="text-[var(--text-primary)] font-bold tabular-nums font-mono">
                          {formatRupiah(exp.nominal)} ({exp.persentase}%)
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-subtle)] h-2 rounded-full overflow-hidden border border-[var(--border)]/40">
                        <div
                          className="bg-gradient-to-r from-rose-500 to-rose-600 h-full rounded-full"
                          style={{ width: `${Math.max(exp.persentase, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Aging Piutang & Top Debtors (Penuaan Piutang) */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Jadwal Penuaan Piutang (Aging Schedule) & Potensi Piutang Macet</span>
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Analisis risiko penagihan piutang berdasarkan lama waktu sejak tanggal pendaftaran siswa
                </p>
              </div>
              <span className="text-xs font-bold text-amber-600 font-mono">
                Total Piutang: {formatRupiah(agingPiutang.totalPiutang)}
              </span>
            </div>

            {/* 4 Aging Brackets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {agingPiutang.brackets.map((b, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] block">{b.label}</span>
                  <div className="text-sm font-bold text-[var(--text-primary)] font-mono tabular-nums">
                    {formatRupiah(b.nominal)}
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {b.count} Siswa ({b.persentase}%)
                  </span>
                </div>
              ))}
            </div>

            {/* Top Debtors Table */}
            {agingPiutang.topDebtors.length > 0 && (
              <div className="pt-2">
                <div className="text-xs font-bold text-[var(--text-primary)] mb-2">
                  Daftar Siswa dengan Sisa Tagihan Tertinggi:
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Nama Siswa</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Status Bayar</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Umur Piutang</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Sisa Tagihan</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Aksi Follow-Up</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {agingPiutang.topDebtors.map((deb) => (
                        <tr key={deb.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">{deb.nama}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {deb.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                            <span className={deb.daysAging > 14 ? 'text-rose-600 font-bold' : 'text-[var(--text-secondary)]'}>
                              {deb.daysAging} Hari
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600 font-mono tabular-nums">
                            {formatRupiah(deb.sisaPiutang)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {deb.noWhatsapp ? (
                              <a
                                href={`https://wa.me/${deb.noWhatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] transition-colors shadow-xs"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>Tagih WA</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-[var(--text-muted)]">-</span>
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
        </div>
      )}

      {/* TAB 4: DATA ARMADA & TELEMATIKA */}
      {activeTab === 'armada' && (
        <div className="space-y-6">
          {/* Fleet Operational Capacity Funnel Strip */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Car className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Kapasitas Armada & Efisiensi Operasional Lapangan</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                Utilisasi: {sesiFunnel.utilisasiKapasitas}% Kapasitas Terisi
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block font-medium">Total Jarak Operasional</span>
                <span className="text-base sm:text-lg font-black text-[var(--text-primary)] font-mono">
                  {summaryKPI.totalKmOperasional.toLocaleString('id-ID')} km
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block font-medium">Konsumsi BBM Riil</span>
                <span className="text-base sm:text-lg font-black text-amber-600 font-mono">
                  {summaryKPI.totalLiterBBM.toLocaleString('id-ID')} Liter
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block font-medium">Rata-rata Konsumsi BBM</span>
                <span className="text-base sm:text-lg font-black text-emerald-600 font-mono">
                  {summaryKPI.rataRataEfisiensiBBM} km/L
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
                <span className="text-[10px] text-[var(--text-muted)] block font-medium">Unit Perlu Servis Rutin</span>
                <span className="text-base sm:text-lg font-black text-rose-600 font-mono">
                  {armadaAnalytics.filter((a) => a.perluPerhatian).length} Mobil
                </span>
              </div>
            </div>
          </div>

          {/* Tabel Detail Utilisasi Armada */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Leaderboard Efisiensi BBM & Utilisasi Tiap Unit Mobil
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Armada</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Sesi Selesai</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Jarak Tempuh</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Konsumsi BBM</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Efisiensi (km/L)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Biaya / KM</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status Servis Oli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {armadaAnalytics.map((arm) => (
                    <tr key={arm.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">
                        <div>{arm.nama}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-mono">{arm.plat}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-semibold">{arm.totalSesi}</td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-bold text-blue-600 font-mono">
                        {arm.totalJarakKm.toLocaleString('id-ID')} km
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-mono">
                        {arm.totalLiterBBM.toLocaleString('id-ID')} L ({formatRupiah(arm.totalBiayaBBM)})
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-bold text-emerald-600 font-mono">
                        {arm.kmPerLiter} km/L
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-medium font-mono">
                        {formatRupiah(arm.biayaPerKm)} / km
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {arm.perluPerhatian ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                            Perlu Servis ({arm.kmSejakGantiOli} km)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
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
        </div>
      )}

      {/* TAB 5: DATA INSTRUKTUR & SDM */}
      {activeTab === 'instruktur' && (
        <div className="space-y-6">
          {/* Capacity Load Chart & Operational Sesi Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Beban Kapasitas Instruktur (% Slot Terisi)
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">Workload Load</span>
              </div>
              <AnalitikInstructorCapacityChart data={instrukturLeaderboard} />
            </div>

            <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Operasional Jam & Hari Belajar
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1.5">
                    Slot Jam Belajar Terpadat:
                  </span>
                  <AnalitikSlotChart data={sesiOperations.bySlotWaktu} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1.5">
                    Volume Hari Belajar:
                  </span>
                  <AnalitikDayChart data={sesiOperations.byDayOfWeek} />
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Leaderboard Instruktur */}
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Data Kinerja, Rasio Penyelesaian & Estimasi Honor Instruktur
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="text-[var(--text-muted)] border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Nama Instruktur</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Total Sesi</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Selesai</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Mobil Ops / Pribadi</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Siswa Bimbingan</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Hari Kerja</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Completion Rate</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Estimasi Gaji/Honor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {instrukturLeaderboard.map((ins, idx) => (
                    <tr key={ins.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--text-muted)] font-mono">#{idx + 1}</span>
                          <span>{ins.nama}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-semibold font-mono">{ins.totalSesi}</td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-bold text-emerald-600 font-mono">{ins.sesiSelesai}</td>
                      <td className="py-2.5 px-3 text-center tabular-nums text-[var(--text-muted)] font-mono">
                        {ins.sesiMobilOps} Ops / {ins.sesiMobilPribadi} Pribadi
                      </td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-medium">{ins.totalSiswa} Siswa</td>
                      <td className="py-2.5 px-3 text-center tabular-nums font-medium">{ins.hariAktif} Hari</td>
                      <td className="py-2.5 px-3 text-center tabular-nums">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] font-mono ${
                            ins.completionRate >= 90
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {ins.completionRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-[var(--brand-primary)] font-mono">
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

      {/* TAB 6: BOTTLENECK BISNIS & DIAGNOSTIK FRIKSI */}
      {activeTab === 'bottleneck' && (
        <div className="space-y-6">
          <AnalitikBottleneckRadar bottlenecks={bottlenecks} />
        </div>
      )}
    </div>
  );
}
