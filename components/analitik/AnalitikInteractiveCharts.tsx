'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { formatRupiah } from '@/lib/utils/currency';

interface CashflowItem {
  dateKey?: string;
  dateLabel?: string;
  bulanKey?: string;
  bulanLabel?: string;
  pemasukan: number;
  pengeluaran: number;
  netProfit: number;
}

interface ChannelItem {
  channel: string;
  totalSiswa: number;
  totalOmzet: number;
  persentase: number;
  conversionRate?: number;
}

interface SlotItem {
  slotId: string;
  namaSlot: string;
  urutan: number;
  totalSesi: number;
  persentase: number;
}

interface DayItem {
  dayIndex: number;
  dayName: string;
  totalSesi: number;
  persentase: number;
}

interface PackageItem {
  namaPaket: string;
  termasukSim: boolean;
  totalTerjual: number;
  totalOmzet: number;
  persentase: number;
}

interface InstructorCapacityItem {
  nama: string;
  capacityUtilization: number;
  sesiSelesai: number;
  sesiBatal: number;
}

export interface FunnelStreamDataPoint {
  stage: string;
  shortLabel: string;
  volume: number;
  retention: number;
  dropOff: number;
  revenue: number;
}

const GRADIENT_PALETTES = [
  { id: 'grad-teal', from: '#0F7A73', to: '#14B8A6' },
  { id: 'grad-indigo', from: '#4F46E5', to: '#818CF8' },
  { id: 'grad-violet', from: '#7C3AED', to: '#A78BFA' },
  { id: 'grad-amber', from: '#D97706', to: '#FBBF24' },
  { id: 'grad-rose', from: '#E11D48', to: '#FB7185' },
  { id: 'grad-emerald', from: '#059669', to: '#34D399' },
  { id: 'grad-cyan', from: '#0284C7', to: '#38BDF8' },
  { id: 'grad-fuchsia', from: '#C026D3', to: '#E879F9' },
];

/**
 * 1. CASHFLOW AREA CHART (Dual Glowing Gradients & Net Line)
 */
export function AnalitikCashflowChart({
  data,
  grouping = 'daily',
}: {
  data: CashflowItem[];
  grouping?: 'daily' | 'monthly';
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-xs text-[var(--text-secondary)] font-medium">
        Tidak ada data arus kas pada periode ini.
      </div>
    );
  }

  const formattedData = data.map((item) => ({
    ...item,
    displayLabel: item.dateLabel || item.bulanLabel || item.dateKey || item.bulanKey || '',
  }));

  return (
    <div className="h-72 w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 12, right: 12, left: -4, bottom: 0 }}>
          <defs>
            <linearGradient id="cfPemasukanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.45} />
              <stop offset="60%" stopColor="#10B981" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="cfPengeluaranGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.4} />
              <stop offset="60%" stopColor="#F43F5E" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="cfNetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#6366F1" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
          <XAxis
            dataKey="displayLabel"
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval="preserveStartEnd"
            minTickGap={grouping === 'daily' ? 28 : 16}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            tickFormatter={(v) => {
              if (v === 0) return '0';
              if (Math.abs(v) >= 1_000_000) {
                const jt = (v / 1_000_000).toFixed(1).replace('.0', '');
                return `${jt}jt`;
              }
              if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}rb`;
              return String(v);
            }}
          />
          <Tooltip
            formatter={(value: any, name: any) => {
              const val = Number(value) || 0;
              const label =
                name === 'pemasukan'
                  ? 'Pemasukan Kas'
                  : name === 'pengeluaran'
                  ? 'Pengeluaran (OPEX)'
                  : 'Laba Bersih';
              return [formatRupiah(val), label];
            }}
            labelFormatter={(label) => `Periode: ${label}`}
            contentStyle={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border)',
              borderRadius: '14px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '10px 14px',
            }}
            itemStyle={{ padding: '2px 0' }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '6px' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            formatter={(value) => (
              <span className="text-[var(--text-secondary)] font-medium">
                {value === 'pemasukan' ? 'Pemasukan Kas' : value === 'pengeluaran' ? 'Pengeluaran Kas' : 'Laba Bersih'}
              </span>
            )}
          />
          <Area
            type="monotone"
            dataKey="pemasukan"
            stroke="#10B981"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#cfPemasukanGrad)"
            activeDot={{ r: 5, stroke: '#10B981', strokeWidth: 2, fill: '#FFFFFF' }}
          />
          <Area
            type="monotone"
            dataKey="pengeluaran"
            stroke="#F43F5E"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#cfPengeluaranGrad)"
            activeDot={{ r: 5, stroke: '#F43F5E', strokeWidth: 2, fill: '#FFFFFF' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 2. MARKETING CHANNELS HORIZONTAL BAR CHART WITH GRADIENTS
 */
export function AnalitikChannelChart({ data }: { data: ChannelItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-secondary)]">
        Tidak ada data saluran akuisisi
      </div>
    );
  }

  return (
    <div className="h-64 w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 36, left: 16, bottom: 4 }}>
          <defs>
            {GRADIENT_PALETTES.map((p) => (
              <linearGradient key={p.id} id={p.id} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={p.from} />
                <stop offset="100%" stopColor={p.to} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.4} />
          <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis
            dataKey="channel"
            type="category"
            stroke="var(--text-secondary)"
            fontSize={11}
            fontWeight={600}
            tickLine={false}
            axisLine={false}
            width={95}
          />
          <Tooltip
            formatter={(value: any, _name: any, item: any) => [
              `${value} Siswa (${item.payload?.persentase || 0}%) — ${formatRupiah(item.payload?.totalOmzet || 0)}`,
              'Akuisisi Siswa',
            ]}
            contentStyle={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border)',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '8px 12px',
            }}
          />
          <Bar dataKey="totalSiswa" radius={[0, 8, 8, 0]}>
            {data.map((_, index) => {
              const pal = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];
              return <Cell key={`cell-ch-${index}`} fill={`url(#${pal.id})`} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 3. PACKAGE DONUT CHART WITH SVG GRADIENTS & CENTRAL METRIC
 */
export function AnalitikPackageDonutChart({ data }: { data: PackageItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-secondary)]">
        Tidak ada data paket kursus
      </div>
    );
  }

  const totalSiswa = data.reduce((acc, curr) => acc + curr.totalTerjual, 0);

  return (
    <div className="h-64 w-full flex flex-col items-center justify-between select-none relative">
      <div className="relative w-full h-44 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {GRADIENT_PALETTES.map((p) => (
                <linearGradient key={`donut-${p.id}`} id={`donut-${p.id}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={p.from} />
                  <stop offset="100%" stopColor={p.to} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={74}
              paddingAngle={4}
              dataKey="totalTerjual"
              nameKey="namaPaket"
              stroke="var(--bg)"
              strokeWidth={2}
            >
              {data.map((_, index) => {
                const pal = GRADIENT_PALETTES[index % GRADIENT_PALETTES.length];
                return <Cell key={`donut-cell-${index}`} fill={`url(#donut-${pal.id})`} />;
              })}
            </Pie>
            <Tooltip
              formatter={(value: any, name: any, item: any) => [
                `${value} Siswa (${item.payload?.persentase}%) — ${formatRupiah(item.payload?.totalOmzet || 0)}`,
                String(name),
              ]}
              contentStyle={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                color: 'var(--text-primary)',
                fontSize: '11px',
                fontFamily: 'monospace',
                padding: '8px 12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Metric Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-black text-[var(--text-primary)] font-mono tracking-tight leading-none">
            {totalSiswa}
          </span>
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mt-0.5">
            Siswa
          </span>
        </div>
      </div>

      {/* Pill Legend with Gradients */}
      <div className="w-full flex flex-wrap items-center justify-center gap-2 text-[10px] text-[var(--text-secondary)] px-2 pt-1 border-t border-[var(--border)]">
        {data.slice(0, 4).map((p, idx) => {
          const pal = GRADIENT_PALETTES[idx % GRADIENT_PALETTES.length];
          return (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] font-medium"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                style={{ background: `linear-gradient(135deg, ${pal.from}, ${pal.to})` }}
              />
              <span className="truncate max-w-[110px]" title={p.namaPaket}>
                {p.namaPaket}
              </span>
              <span className="font-mono font-bold text-[var(--text-primary)]">{p.persentase}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 4. SLOT WAKTU BAR CHART (Peak Hours Highlighted with Gradient)
 */
export function AnalitikSlotChart({ data }: { data: SlotItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-secondary)]">
        Tidak ada data slot waktu
      </div>
    );
  }

  const maxSesi = Math.max(...data.map((d) => d.totalSesi), 1);

  return (
    <div className="h-64 w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 10, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="slotNormalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F7A73" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#14B8A6" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="slotPeakGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={1} />
              <stop offset="100%" stopColor="#D97706" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
          <XAxis dataKey="namaSlot" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value: any, _n: any, item: any) => [
              `${value} Sesi (${item.payload?.persentase}%)`,
              'Volume Pelatihan',
            ]}
            contentStyle={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border)',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '8px 12px',
            }}
          />
          <Bar dataKey="totalSesi" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => {
              const isPeak = entry.totalSesi === maxSesi && maxSesi > 0;
              return <Cell key={`slot-cell-${index}`} fill={isPeak ? 'url(#slotPeakGrad)' : 'url(#slotNormalGrad)'} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 5. DAY OF WEEK BAR CHART (Volume Belajar Mingguan)
 */
export function AnalitikDayChart({ data }: { data: DayItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-secondary)]">
        Tidak ada data hari
      </div>
    );
  }

  const maxSesi = Math.max(...data.map((d) => d.totalSesi), 1);

  return (
    <div className="h-64 w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 10, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="dayNormalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#818CF8" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="dayPeakGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F7A73" stopOpacity={1} />
              <stop offset="100%" stopColor="#14B8A6" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
          <XAxis dataKey="dayName" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value: any, _n: any, item: any) => [
              `${value} Sesi (${item.payload?.persentase}%)`,
              'Total Sesi Terjadwal',
            ]}
            contentStyle={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border)',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '8px 12px',
            }}
          />
          <Bar dataKey="totalSesi" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => {
              const isPeak = entry.totalSesi === maxSesi && maxSesi > 0;
              return <Cell key={`day-cell-${index}`} fill={isPeak ? 'url(#dayPeakGrad)' : 'url(#dayNormalGrad)'} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 6. INSTRUCTOR CAPACITY UTILIZATION CHART (Status-Colored Gradients)
 */
export function AnalitikInstructorCapacityChart({ data }: { data: InstructorCapacityItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-secondary)]">
        Tidak ada data kapasitas instruktur
      </div>
    );
  }

  return (
    <div className="h-64 w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 30, left: 24, bottom: 4 }}>
          <defs>
            <linearGradient id="capGreen" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="capAmber" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#FBBF24" />
            </linearGradient>
            <linearGradient id="capRed" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#DC2626" />
              <stop offset="100%" stopColor="#F87171" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.4} />
          <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickLine={false} domain={[0, 100]} unit="%" />
          <YAxis
            dataKey="nama"
            type="category"
            stroke="var(--text-secondary)"
            fontSize={11}
            fontWeight={600}
            tickLine={false}
            axisLine={false}
            width={85}
          />
          <Tooltip
            formatter={(value: any, _n: any, item: any) => [
              `${value}% Beban (${item.payload?.sesiSelesai || 0} Selesai, ${item.payload?.sesiBatal || 0} Batal)`,
              'Utilisasi Kapasitas',
            ]}
            contentStyle={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border)',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '8px 12px',
            }}
          />
          <Bar dataKey="capacityUtilization" radius={[0, 8, 8, 0]}>
            {data.map((item, index) => {
              const fill =
                item.capacityUtilization > 85
                  ? 'url(#capRed)'
                  : item.capacityUtilization > 65
                  ? 'url(#capAmber)'
                  : 'url(#capGreen)';
              return <Cell key={`cap-cell-${index}`} fill={fill} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 7. FUNNEL STREAM FLOW AREA CHART (Image 1 Style: Leads Flow Overview with Warm Sunset / Emerald Gradients)
 */
export function AnalitikFunnelStreamChart({
  stages,
}: {
  stages: {
    id: string;
    shortLabel: string;
    count: number;
    valueNominal: number;
    stepConvRate: number;
    overallConvRate: number;
    dropOffCount: number;
  }[];
}) {
  if (!stages || stages.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-secondary)]">
        Data flow funnel belum tersedia.
      </div>
    );
  }

  const streamData = stages.map((s) => ({
    stage: s.shortLabel,
    volume: s.count,
    retention: Math.round((s.count * s.overallConvRate) / 100),
    dropOff: s.dropOffCount,
    revenue: s.valueNominal,
    convRate: s.overallConvRate,
  }));

  return (
    <div className="h-72 w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={streamData} margin={{ top: 16, right: 16, left: -10, bottom: 4 }}>
          <defs>
            {/* Sunset Orange to Amber Warm Flow Gradient */}
            <linearGradient id="streamWarmGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EA580C" stopOpacity={0.55} />
              <stop offset="60%" stopColor="#F97316" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity={0.02} />
            </linearGradient>

            {/* Indigo / Violet Layer */}
            <linearGradient id="streamCoolGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
              <stop offset="60%" stopColor="#818CF8" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#C7D2FE" stopOpacity={0.0} />
            </linearGradient>

            {/* Emerald Brand Bottom Layer */}
            <linearGradient id="streamBrandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F7A73" stopOpacity={0.65} />
              <stop offset="100%" stopColor="#14B8A6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
          <XAxis
            dataKey="stage"
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <Tooltip
            formatter={(value: any, name: any, item: any) => {
              if (name === 'volume') {
                return [`${value} Siswa (${item.payload?.convRate}% Retensi)`, 'Volume Siswa'];
              }
              if (name === 'dropOff') {
                return [`${value} Siswa Terhenti`, 'Drop-off'];
              }
              return [formatRupiah(value), 'Estimasi Nilai'];
            }}
            labelFormatter={(label) => `Tahapan: ${label}`}
            contentStyle={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border)',
              borderRadius: '14px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'monospace',
              padding: '10px 14px',
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            formatter={(val) => (
              <span className="text-[var(--text-secondary)] font-medium">
                {val === 'volume' ? 'Volume Alur Siswa (Leads Flow)' : 'Drop-off Terhenti'}
              </span>
            )}
          />
          <Area
            type="natural"
            dataKey="volume"
            stroke="#EA580C"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#streamWarmGrad)"
            activeDot={{ r: 6, stroke: '#EA580C', strokeWidth: 2.5, fill: '#FFFFFF' }}
          />
          <Area
            type="natural"
            dataKey="dropOff"
            stroke="#6366F1"
            strokeWidth={1.5}
            fillOpacity={1}
            fill="url(#streamCoolGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
