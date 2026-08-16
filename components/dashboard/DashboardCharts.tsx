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

const CATEGORY_COLORS = ['#0F7A73', '#2563A8', '#B9821B', '#C13D3D'];

interface DashboardChartsProps {
  metrics: DashboardMetrics;
}

export function DashboardCharts({ metrics }: DashboardChartsProps) {
  return (
    <div className="space-y-6">
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tren Pendaftaran Siswa Bar Chart */}
        <div className="card-container space-y-4">
          <div>
            <span className="eyebrow-label">Statistik Pertumbuhan</span>
            <h3 className="text-sm md:text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mt-0.5">
              <BarChart3 className="w-4 h-4 text-[var(--brand-primary)]" />
              Tren Pendaftaran Siswa (6 Bulan)
            </h3>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.trenPendaftaran} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="bulan" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bento-bg)',
                    border: '1px solid var(--bento-border)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="total" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tren Cashflow Line Chart */}
        <div className="card-container space-y-4">
          <div>
            <span className="eyebrow-label">Laporan Finansial</span>
            <h3 className="text-sm md:text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mt-0.5">
              <TrendingUp className="w-4 h-4 text-[var(--brand-primary)]" />
              Tren Cashflow (Pemasukan vs Pengeluaran)
            </h3>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trenCashflow} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="bulan" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
                <Tooltip
                  formatter={(value: any) => formatRupiah(value)}
                  contentStyle={{
                    backgroundColor: 'var(--bento-bg)',
                    border: '1px solid var(--bento-border)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="pemasukan" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Pemasukan" />
                <Line type="monotone" dataKey="pengeluaran" stroke="#F43F5E" strokeWidth={2} dot={{ r: 3 }} name="Pengeluaran" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sumber Leads Conversion Chart */}
      <div className="card-container space-y-4">
        <div>
          <span className="eyebrow-label">Analisis Marketing & Akuisisi</span>
          <h3 className="text-sm md:text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mt-0.5">
            <PieIcon className="w-4 h-4 text-[var(--brand-primary)]" />
            Tingkat Konversi Sumber Leads (Siswa Baru)
          </h3>
        </div>
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
                  <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bento-bg)',
                  border: '1px solid var(--bento-border)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
