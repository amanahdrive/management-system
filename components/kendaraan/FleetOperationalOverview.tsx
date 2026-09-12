'use client';

import React from 'react';
import {
  Car, Fuel, Wrench, Gauge, TrendingUp, TrendingDown,
  Minus, ChevronLeft, ChevronRight, MapPin, Calendar,
  BarChart3, Zap, PiggyBank, AlertTriangle, CheckCircle2, Search,
} from 'lucide-react';
import { getArmadaOperasionalMonthlyStats, ArmadaOperasionalOverview, ArmadaMonthlyStats } from '@/lib/actions/kendaraan';
import { formatRupiah } from '@/lib/utils/currency';
import { Kendaraan } from '@/types/database';

const BULAN_LABEL: Record<string, string> = {
  '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
  '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
  '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember',
};

function getBulanLabel(bulan: string) {
  const [y, m] = bulan.split('-');
  return `${BULAN_LABEL[m] ?? m} ${y}`;
}

function getActiveBulan() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function stepBulan(bulan: string, delta: number): string {
  const [y, m] = bulan.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Generate last N months list for quick picker
function getRecentMonths(n: number): string[] {
  const result: string[] = [];
  let cur = getActiveBulan();
  for (let i = 0; i < n; i++) {
    result.push(cur);
    cur = stepBulan(cur, -1);
  }
  return result;
}

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function KPICard({ label, value, sub, icon, accent = 'text-[var(--brand-primary)]', trend }: KPICardProps) {
  return (
    <div className="card-container p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-xl bg-black/5 dark:bg-white/5 ${accent}`}>{icon}</div>
        {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
        {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
        {trend === 'neutral' && <Minus className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">{label}</p>
        <p className="text-xl font-black text-[var(--text-primary)] leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function EfficiencyBar({ actual, target, label }: { actual: number; target: number; label: string }) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 120) : 0;
  const isGood = actual >= target;
  const isClose = actual >= target * 0.85;
  const color = isGood ? 'bg-emerald-500' : isClose ? 'bg-amber-400' : 'bg-rose-400';
  const statusIcon = isGood
    ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
    : <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-[var(--text-secondary)] font-semibold flex items-center gap-1">
          {statusIcon}
          {label}
        </span>
        <span className="font-bold text-[var(--text-primary)]">
          {actual > 0 ? `${actual.toFixed(1)} km/L` : '—'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-[9px] text-[var(--text-muted)]">Target: {target} km/L</p>
    </div>
  );
}

function ArmadaSpotlightCard({ armada, target }: { armada: ArmadaMonthlyStats; target: number }) {
  const hasData = armada.totalKm > 0 || armada.bbmNominal > 0;

  return (
    <div className="card-container p-4 space-y-4">
      {/* Vehicle Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center">
            <Car className="w-[18px] h-[18px]" />
          </div>
          <div>
            <p className="font-bold text-sm text-[var(--text-primary)]">{armada.namaKendaraan}</p>
            <p className="text-[10px] font-bold font-mono text-[var(--brand-primary)]">{armada.platNomor}</p>
          </div>
        </div>
        {!hasData && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-muted)] font-semibold">
            Belum ada data
          </span>
        )}
      </div>

      {/* 3 Big Answer Badges */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          {
            icon: <BarChart3 className="w-3.5 h-3.5" />,
            label: 'Biaya / Bulan',
            value: hasData ? formatRupiah(armada.totalBebanKomprehensif) : '—',
            color: 'text-[var(--brand-primary)]',
          },
          {
            icon: <MapPin className="w-3.5 h-3.5" />,
            label: 'Biaya / KM',
            value: hasData && armada.totalKm > 0 ? `Rp ${armada.biayaPerKm.toLocaleString('id-ID')}` : '—',
            color: 'text-orange-600 dark:text-orange-400',
          },
          {
            icon: <Calendar className="w-3.5 h-3.5" />,
            label: 'Biaya / Sesi',
            value: hasData && armada.sesiSelesai > 0 ? `Rp ${armada.biayaPerSesi.toLocaleString('id-ID')}` : '—',
            color: 'text-violet-600 dark:text-violet-400',
          },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] p-2.5 space-y-1">
            <div className={`flex items-center justify-center ${color}`}>{icon}</div>
            <p className={`font-black text-sm leading-tight ${color}`}>{value}</p>
            <p className="text-[9px] text-[var(--text-muted)] font-semibold">{label}</p>
          </div>
        ))}
      </div>

      {/* BBM Efficiency Bar */}
      <EfficiencyBar actual={armada.efisiensiBbmKmPerL} target={target} label="Efisiensi BBM" />

      {/* Maintenance Sinking Fund */}
      <div className="rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-500/15 p-3 space-y-1.5">
        <p className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
          <PiggyBank className="w-3 h-3" />
          Cadangan Maintenance
        </p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">Disisihkan</span>
          <span className="font-bold text-orange-700 dark:text-orange-300">
            {formatRupiah(armada.cadanganMaintenanceDisisihkan)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">Terpakai (servis)</span>
          <span className="font-bold text-rose-600">
            {armada.servisTermakai > 0 ? `− ${formatRupiah(armada.servisTermakai)}` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs border-t border-orange-200/50 dark:border-orange-500/20 pt-1.5">
          <span className="font-bold text-[var(--text-secondary)]">Saldo Cadangan</span>
          <span className={`font-black ${armada.saldoCadangan >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatRupiah(Math.abs(armada.saldoCadangan))}
            {armada.saldoCadangan < 0 ? ' (defisit)' : ''}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
        <div>
          <p className="font-bold text-[var(--text-primary)]">{armada.totalKm.toLocaleString('id-ID')} km</p>
          <p className="text-[var(--text-muted)]">Jarak</p>
        </div>
        <div>
          <p className="font-bold text-[var(--text-primary)]">{armada.sesiSelesai}</p>
          <p className="text-[var(--text-muted)]">Sesi Selesai</p>
        </div>
        <div>
          <p className="font-bold text-[var(--text-primary)]">
            {armada.bbmLiter > 0 ? `${Number(armada.bbmLiter).toFixed(1)} L` : '—'}
          </p>
          <p className="text-[var(--text-muted)]">BBM</p>
        </div>
      </div>
    </div>
  );
}

function FleetComparisonTable({ overview, selectedId }: { overview: ArmadaOperasionalOverview; selectedId: string }) {
  const armada = selectedId === 'all'
    ? overview.armada
    : overview.armada.filter((a) => a.kendaraanId === selectedId);
  const ft = overview.fleetTotal;
  if (armada.length === 0) return null;

  return (
    <div className="card-container overflow-hidden">
      <div className="p-4 border-b border-[var(--border)] flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-[var(--brand-primary)]" />
        <h4 className="font-bold text-sm text-[var(--text-primary)]">
          {selectedId === 'all' ? 'Perbandingan Armada' : 'Detail Armada'}
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]">
              {['Armada', 'KM', 'Sesi', 'BBM', 'Cadangan', 'Servis', 'Beban Total', 'Rp/KM', 'Rp/Sesi', 'Efisiensi'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-bold text-[var(--text-secondary)] uppercase text-[10px] tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {armada.map((a) => (
              <tr key={a.kendaraanId} className="border-b border-[var(--border)] hover:bg-[var(--bg-subtle)] transition-colors">
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <p className="font-bold text-[var(--text-primary)]">{a.namaKendaraan}</p>
                  <p className="text-[9px] font-mono text-[var(--brand-primary)]">{a.platNomor}</p>
                </td>
                <td className="px-3 py-2.5 font-mono font-bold text-[var(--text-primary)] whitespace-nowrap">
                  {a.totalKm.toLocaleString('id-ID')}
                </td>
                <td className="px-3 py-2.5 font-bold text-center text-[var(--text-primary)]">{a.sesiSelesai}</td>
                <td className="px-3 py-2.5 text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap">
                  {a.bbmNominal > 0 ? formatRupiah(a.bbmNominal) : '—'}
                </td>
                <td className="px-3 py-2.5 text-orange-600 font-semibold whitespace-nowrap">
                  {a.cadanganMaintenanceDisisihkan > 0 ? formatRupiah(a.cadanganMaintenanceDisisihkan) : '—'}
                </td>
                <td className="px-3 py-2.5 text-rose-600 font-semibold whitespace-nowrap">
                  {a.servisTermakai > 0 ? formatRupiah(a.servisTermakai) : '—'}
                </td>
                <td className="px-3 py-2.5 font-bold text-[var(--text-primary)] whitespace-nowrap">
                  {a.totalBebanKomprehensif > 0 ? formatRupiah(a.totalBebanKomprehensif) : '—'}
                </td>
                <td className="px-3 py-2.5 font-mono text-[var(--text-primary)] whitespace-nowrap">
                  {a.biayaPerKm > 0 ? `Rp ${a.biayaPerKm.toLocaleString('id-ID')}` : '—'}
                </td>
                <td className="px-3 py-2.5 font-mono text-[var(--text-primary)] whitespace-nowrap">
                  {a.biayaPerSesi > 0 ? `Rp ${a.biayaPerSesi.toLocaleString('id-ID')}` : '—'}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {a.efisiensiBbmKmPerL > 0 ? (
                    <span className={`font-bold ${a.efisiensiBbmKmPerL >= overview.targetEfisiensiBbm ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {a.efisiensiBbmKmPerL.toFixed(1)} km/L
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
            {/* Fleet Total Row — only show when viewing all */}
            {selectedId === 'all' && (
              <tr className="bg-[var(--bg-subtle)] font-bold border-t-2 border-[var(--border)]">
                <td className="px-3 py-2.5 text-[var(--text-primary)]">
                  <p className="font-black">Total Armada</p>
                  <p className="text-[9px] text-[var(--text-muted)] font-semibold">{overview.armada.length} kendaraan</p>
                </td>
                <td className="px-3 py-2.5 font-mono font-black text-[var(--text-primary)]">{ft.totalKm.toLocaleString('id-ID')}</td>
                <td className="px-3 py-2.5 font-black text-center text-[var(--text-primary)]">{ft.sesiSelesai}</td>
                <td className="px-3 py-2.5 text-emerald-700 dark:text-emerald-400 font-black">
                  {ft.bbmNominal > 0 ? formatRupiah(ft.bbmNominal) : '—'}
                </td>
                <td className="px-3 py-2.5 text-orange-600 font-black">
                  {ft.cadanganTotal > 0 ? formatRupiah(ft.cadanganTotal) : '—'}
                </td>
                <td className="px-3 py-2.5 text-rose-600 font-black">
                  {ft.servisTotal > 0 ? formatRupiah(ft.servisTotal) : '—'}
                </td>
                <td className="px-3 py-2.5 font-black text-[var(--text-primary)]">
                  {ft.totalBeban > 0 ? formatRupiah(ft.totalBeban) : '—'}
                </td>
                <td className="px-3 py-2.5 font-mono font-black text-[var(--text-primary)]">
                  {ft.biayaPerKm > 0 ? `Rp ${ft.biayaPerKm.toLocaleString('id-ID')}` : '—'}
                </td>
                <td className="px-3 py-2.5 font-mono font-black text-[var(--text-primary)]">
                  {ft.biayaPerSesi > 0 ? `Rp ${ft.biayaPerSesi.toLocaleString('id-ID')}` : '—'}
                </td>
                <td className="px-3 py-2.5 font-black text-[var(--text-primary)]">
                  {ft.efisiensiBbm > 0 ? `${ft.efisiensiBbm.toFixed(1)} km/L` : '—'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface FleetOperationalOverviewProps {
  tarifMaintenancePerKm: number;
  targetEfisiensiBbm: number;
  kendaraanList: Kendaraan[];
}

export function FleetOperationalOverview({ tarifMaintenancePerKm, targetEfisiensiBbm, kendaraanList }: FleetOperationalOverviewProps) {
  const [bulan, setBulan] = React.useState(getActiveBulan());
  const [selectedKendaraanId, setSelectedKendaraanId] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [overview, setOverview] = React.useState<ArmadaOperasionalOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  const recentMonths = React.useMemo(() => getRecentMonths(6), []);

  const loadData = React.useCallback(async (b: string, tarif: number, target: number) => {
    setLoading(true);
    const data = await getArmadaOperasionalMonthlyStats(b, tarif, target);
    setOverview(data);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadData(bulan, tarifMaintenancePerKm, targetEfisiensiBbm);
  }, [bulan, tarifMaintenancePerKm, targetEfisiensiBbm, loadData]);

  // Compute filtered/selected armada view
  const filteredArmada = React.useMemo(() => {
    if (!overview) return [];
    let list = overview.armada;
    if (selectedKendaraanId !== 'all') {
      list = list.filter((a) => a.kendaraanId === selectedKendaraanId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (a) => a.namaKendaraan.toLowerCase().includes(q) || a.platNomor.toLowerCase().includes(q)
      );
    }
    return list;
  }, [overview, selectedKendaraanId, searchQuery]);

  // KPI metrics — show selected armada or fleet total
  const kpiData = React.useMemo(() => {
    if (!overview) return null;
    if (selectedKendaraanId !== 'all') {
      const a = overview.armada.find((x) => x.kendaraanId === selectedKendaraanId);
      if (!a) return null;
      return {
        totalBeban: a.totalBebanKomprehensif,
        bbmNominal: a.bbmNominal,
        biayaPerKm: a.biayaPerKm,
        totalKm: a.totalKm,
        biayaPerSesi: a.biayaPerSesi,
        sesiSelesai: a.sesiSelesai,
        cadanganTotal: a.cadanganMaintenanceDisisihkan,
        servisTotal: a.servisTermakai,
        biayaRiilKas: a.biayaRiilKas,
        efisiensiBbm: a.efisiensiBbmKmPerL,
      };
    }
    const ft = overview.fleetTotal;
    return {
      totalBeban: ft.totalBeban,
      bbmNominal: ft.bbmNominal,
      biayaPerKm: ft.biayaPerKm,
      totalKm: ft.totalKm,
      biayaPerSesi: ft.biayaPerSesi,
      sesiSelesai: ft.sesiSelesai,
      cadanganTotal: ft.cadanganTotal,
      servisTotal: ft.servisTotal,
      biayaRiilKas: ft.biayaRiilKas,
      efisiensiBbm: ft.efisiensiBbm,
    };
  }, [overview, selectedKendaraanId]);

  return (
    <div className="space-y-5">
      {/* ── Filter & Toolbar ─────────────────────────────────── */}
      <div className="card-container p-4 space-y-4">
        {/* Row 1: Bulan Presets + Month Navigator */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5" />
            Periode:
          </span>
          {recentMonths.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBulan(b)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                bulan === b
                  ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              {getBulanLabel(b)}
            </button>
          ))}
          {/* navigator for older months */}
          <div className="flex items-center gap-1 ml-auto bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-1 py-1">
            <button
              type="button"
              onClick={() => setBulan(stepBulan(bulan, -1))}
              className="p-1 rounded-lg hover:bg-[var(--bg)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold text-[var(--text-primary)] min-w-[110px] text-center">
              {getBulanLabel(bulan)}
            </span>
            <button
              type="button"
              onClick={() => setBulan(stepBulan(bulan, 1))}
              disabled={bulan >= getActiveBulan()}
              className="p-1 rounded-lg hover:bg-[var(--bg)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Armada filter + Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
          {/* Armada dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              Pilih Armada
            </label>
            <select
              value={selectedKendaraanId}
              onChange={(e) => setSelectedKendaraanId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)]"
            >
              <option value="all">Semua Armada Kendaraan</option>
              {kendaraanList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama_kendaraan} ({k.plat_nomor})
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              Pencarian Armada
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama kendaraan, plat nomor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
              />
              <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 card-container animate-pulse bg-black/5 dark:bg-white/5 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              label="Total Beban Komprehensif"
              value={kpiData && kpiData.totalBeban > 0 ? formatRupiah(kpiData.totalBeban) : '—'}
              sub={kpiData && kpiData.bbmNominal > 0 ? `BBM ${formatRupiah(kpiData.bbmNominal)}` : undefined}
              icon={<BarChart3 className="w-4 h-4" />}
              accent="text-[var(--brand-primary)]"
            />
            <KPICard
              label="Biaya per KM"
              value={kpiData && kpiData.biayaPerKm > 0 ? `Rp ${kpiData.biayaPerKm.toLocaleString('id-ID')}` : '—'}
              sub={kpiData && kpiData.totalKm > 0 ? `${kpiData.totalKm.toLocaleString('id-ID')} km ditempuh` : undefined}
              icon={<MapPin className="w-4 h-4" />}
              accent="text-orange-600"
            />
            <KPICard
              label="Biaya per Sesi"
              value={kpiData && kpiData.biayaPerSesi > 0 ? `Rp ${kpiData.biayaPerSesi.toLocaleString('id-ID')}` : '—'}
              sub={kpiData && kpiData.sesiSelesai > 0 ? `${kpiData.sesiSelesai} sesi selesai` : undefined}
              icon={<Calendar className="w-4 h-4" />}
              accent="text-violet-600"
            />
            <KPICard
              label="Cadangan Maintenance"
              value={kpiData && kpiData.cadanganTotal > 0 ? formatRupiah(kpiData.cadanganTotal) : '—'}
              sub={kpiData && kpiData.servisTotal > 0 ? `Servis terpakai ${formatRupiah(kpiData.servisTotal)}` : 'Servis terpakai —'}
              icon={<PiggyBank className="w-4 h-4" />}
              accent="text-orange-600"
            />
          </div>

          {/* Fleet Info Summary Bar */}
          {kpiData && kpiData.totalKm > 0 && (
            <div className="rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-xs">
                <div>
                  <p className="font-black text-lg text-[var(--text-primary)]">{kpiData.totalKm.toLocaleString('id-ID')}</p>
                  <p className="text-[var(--text-secondary)] font-semibold">Total KM</p>
                </div>
                <div>
                  <p className="font-black text-lg text-emerald-600">{kpiData.sesiSelesai}</p>
                  <p className="text-[var(--text-secondary)] font-semibold">Sesi Selesai</p>
                </div>
                <div>
                  <p className="font-black text-lg text-[var(--text-primary)]">
                    {kpiData.efisiensiBbm > 0 ? `${kpiData.efisiensiBbm.toFixed(1)} km/L` : '—'}
                  </p>
                  <p className="text-[var(--text-secondary)] font-semibold">Efisiensi BBM</p>
                </div>
                <div>
                  <p className="font-black text-lg text-[var(--text-primary)]">
                    {kpiData.biayaRiilKas > 0 ? formatRupiah(kpiData.biayaRiilKas) : '—'}
                  </p>
                  <p className="text-[var(--text-secondary)] font-semibold">Biaya Riil Kas</p>
                </div>
              </div>
            </div>
          )}

          {/* Per-Armada Spotlight Cards */}
          {filteredArmada.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredArmada.map((a) => (
                <ArmadaSpotlightCard key={a.kendaraanId} armada={a} target={targetEfisiensiBbm} />
              ))}
            </div>
          )}

          {/* Comparison Table */}
          {overview && filteredArmada.length > 0 && (
            <FleetComparisonTable overview={overview} selectedId={selectedKendaraanId} />
          )}

          {/* Empty State */}
          {filteredArmada.length === 0 && (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <Car className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">
                {searchQuery ? 'Armada tidak ditemukan' : 'Belum ada data operasional pada periode ini'}
              </p>
              <p className="text-xs mt-1">
                {searchQuery ? 'Coba kata kunci lain' : 'Cek pencatatan log odometer & BBM pada bulan ini'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
