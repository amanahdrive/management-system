'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface DailyTrendItem {
  tanggal: string;
  total: number;
  jadi_siswa: number;
}

interface PackageItem {
  paket_nama: string;
  total: number;
}

interface EventItem {
  event_name: string;
  total: number;
}

const COLORS = ['#0F7A73', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

export function DailyLeadsTrendChart({ data }: { data: DailyTrendItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)]">
        Belum ada data riwayat leads harian.
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    displayDate: d.tanggal.slice(5), // MM-DD
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0F7A73" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0F7A73" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorSiswa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
          <XAxis dataKey="displayDate" stroke="#888888" fontSize={10} tickLine={false} />
          <YAxis stroke="#888888" fontSize={10} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontSize: '11px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Area
            type="monotone"
            dataKey="total"
            name="Leads Masuk"
            stroke="#0F7A73"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorTotal)"
          />
          <Area
            type="monotone"
            dataKey="jadi_siswa"
            name="Menjadi Siswa"
            stroke="#10B981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorSiswa)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PackageDistributionChart({ data }: { data: PackageItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)]">
        Belum ada data minat paket.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" horizontal={false} />
          <XAxis type="number" stroke="#888888" fontSize={10} tickLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="paket_nama"
            stroke="#888888"
            fontSize={10}
            tickLine={false}
            width={90}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '11px',
            }}
          />
          <Bar dataKey="total" name="Peminat" radius={[0, 4, 4, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EventBreakdownChart({ data }: { data: EventItem[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-[var(--text-muted)]">
        Belum ada event tracking tercatat.
      </div>
    );
  }

  const formatEventName = (name: string) => {
    switch (name) {
      case 'lead_submit':
        return 'Form Booking Submit';
      case 'wa_click':
        return 'Klik Tombol WA';
      case 'maps_click':
        return 'Buka Google Maps';
      case 'time_on_page':
        return 'Waktu Kunjungan (Durasi)';
      case 'scroll_depth':
        return 'Scroll Depth Halaman';
      default:
        return name;
    }
  };

  const chartData = data.map((d) => ({
    name: formatEventName(d.event_name),
    value: d.total,
  }));

  return (
    <div className="h-64 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={3}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '11px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '10px' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
