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

const PALETTE = ['#0F7A73', '#2563EB', '#D97706', '#7C3AED', '#DC2626', '#059669'];

export function AnalitikCashflowChart({
  data,
  grouping = 'daily',
}: {
  data: CashflowItem[];
  grouping?: 'daily' | 'monthly';
}) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-[var(--text-secondary)]">Tidak ada data arus kas</div>;
  }

  // Ensure every item has a display label
  const formattedData = data.map((item) => ({
    ...item,
    displayLabel: item.dateLabel || item.bulanLabel || item.dateKey || item.bulanKey || '',
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pemasukanGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pengeluaranGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="displayLabel"
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={grouping === 'daily' ? 28 : 16}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            tickLine={false}
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
            formatter={(value: any, name: any) => [
              formatRupiah(Number(value) || 0),
              name === 'pemasukan' ? 'Pemasukan' : name === 'pengeluaran' ? 'Pengeluaran' : 'Laba Bersih',
            ]}
            labelFormatter={(label) => `Periode: ${label}`}
            contentStyle={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              borderRadius: '14px',
              boxShadow: 'var(--shadow-md)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
            itemStyle={{ color: 'var(--text-primary)' }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
          />
          <Legend
            wrapperStyle={{ fontSize: '10px', paddingTop: '8px', fontFamily: 'monospace' }}
            formatter={(value) => (value === 'pemasukan' ? 'Pemasukan' : value === 'pengeluaran' ? 'Pengeluaran' : 'Laba Bersih')}
          />
          <Area type="monotone" dataKey="pemasukan" stroke="#10B981" strokeWidth={1.5} fillOpacity={1} fill="url(#pemasukanGrad)" />
          <Area type="monotone" dataKey="pengeluaran" stroke="#EF4444" strokeWidth={1.5} fillOpacity={1} fill="url(#pengeluaranGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalitikChannelChart({ data }: { data: ChannelItem[] }) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-[var(--text-secondary)]">Tidak ada data channel</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
          <YAxis dataKey="channel" type="category" stroke="var(--text-muted)" fontSize={10} tickLine={false} width={80} />
          <Tooltip
            formatter={(value: any) => [`${value} Siswa`, 'Total Siswa']}
            contentStyle={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              borderRadius: '14px',
              boxShadow: 'var(--shadow-md)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
            itemStyle={{ color: 'var(--text-primary)' }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
          />
          <Bar dataKey="totalSiswa" radius={[0, 6, 6, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalitikSlotChart({ data }: { data: SlotItem[] }) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-[var(--text-secondary)]">Tidak ada data slot</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <XAxis dataKey="namaSlot" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
          <Tooltip
            formatter={(value: any) => [`${value} Sesi`, 'Total Sesi']}
            contentStyle={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              borderRadius: '14px',
              boxShadow: 'var(--shadow-md)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
            itemStyle={{ color: 'var(--text-primary)' }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
          />
          <Bar dataKey="totalSesi" fill="var(--brand-primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnalitikDayChart({ data }: { data: DayItem[] }) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-[var(--text-secondary)]">Tidak ada data hari</div>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <XAxis dataKey="dayName" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
          <Tooltip
            formatter={(value: any) => [`${value} Sesi`, 'Total Sesi']}
            contentStyle={{
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border)',
              borderRadius: '14px',
              boxShadow: 'var(--shadow-md)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
            itemStyle={{ color: 'var(--text-primary)' }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
          />
          <Bar dataKey="totalSesi" fill="#0F7A73" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
