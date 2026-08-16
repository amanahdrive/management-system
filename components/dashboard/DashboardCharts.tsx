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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { formatRupiah } from '@/lib/utils/currency';
import { DashboardMetrics } from '@/lib/actions/dashboard';

const COLORS = ['#0F7A73', '#2563A8', '#B9821B', '#C13D3D'];

interface DashboardChartsProps {
  metrics: DashboardMetrics;
}

export function DashboardCharts({ metrics }: DashboardChartsProps) {
  return (
    <div className="space-y-6">
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tren Pendaftaran Siswa Bar Chart */}
        <div className="card-container space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--brand-primary)]" />
              Tren Pendaftaran Siswa (6 Bulan)
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.trenPendaftaran}>
                <XAxis dataKey="bulan" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tren Cashflow Line Chart */}
        <div className="card-container space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--brand-primary)]" />
              Tren Cashflow (Pemasukan vs Pengeluaran)
            </h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trenCashflow}>
                <XAxis dataKey="bulan" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(v) => `${v / 1000000}M`} />
                <Tooltip formatter={(value: any) => formatRupiah(value)} />
                <Legend />
                <Line type="monotone" dataKey="pemasukan" stroke="#1B8A5A" strokeWidth={2} name="Pemasukan" />
                <Line type="monotone" dataKey="pengeluaran" stroke="#C13D3D" strokeWidth={2} name="Pengeluaran" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sumber Leads Conversion Chart */}
      <div className="card-container space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-[var(--brand-primary)]" />
          Tingkat Konversi Sumber Leads (Siswa Baru)
        </h3>
        <div className="h-56 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={metrics.sumberLeads}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`
                }
              >
                {metrics.sumberLeads.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
