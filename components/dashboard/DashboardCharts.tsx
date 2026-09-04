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
    <div className="space-y-4">
      {/* Charts Hairline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tren Pendaftaran Siswa Bar Chart */}
        <div className="liquid-glass-card rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div>
              <span className="eyebrow-label text-[10px] font-mono tracking-widest text-[var(--text-muted)]">TELEMETRI AKUISISI</span>
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tracking-tight mt-0.5">
                Tren Pendaftaran Siswa (6 Bulan)
              </h3>
            </div>
            <span className="font-mono text-[10px] text-[var(--brand-primary)] px-1.5 py-0.5 rounded-full border border-[var(--brand-primary)]/20 bg-[var(--brand-primary-light)]">
              HISTORIKAL
            </span>
          </div>
          <div className="h-60 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.trenPendaftaran} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="bulan" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                />
                <Bar dataKey="total" fill="var(--brand-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tren Cashflow Line Chart */}
        <div className="liquid-glass-card rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div>
              <span className="eyebrow-label text-[10px] font-mono tracking-widest text-[var(--text-muted)]">FINANSIAL OPERASIONAL</span>
              <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tracking-tight mt-0.5">
                Cashflow (Pemasukan vs Pengeluaran)
              </h3>
            </div>
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10">
              REALTIME
            </span>
          </div>
          <div className="h-60 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.trenCashflow} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="bulan" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
                <Tooltip
                  formatter={(value: any) => formatRupiah(value)}
                  contentStyle={{
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '8px', fontFamily: 'monospace' }} />
                <Line type="monotone" dataKey="pemasukan" stroke="#10B981" strokeWidth={1.5} dot={{ r: 2 }} name="Pemasukan" />
                <Line type="monotone" dataKey="pengeluaran" stroke="#F43F5E" strokeWidth={1.5} dot={{ r: 2 }} name="Pengeluaran" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sumber Leads Conversion Chart */}
      <div className="liquid-glass-card rounded-3xl p-5 sm:p-6 space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <div>
            <span className="eyebrow-label text-[10px] font-mono tracking-widest text-[var(--text-muted)]">DISTRIBUSI KANAL MARKETING</span>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tracking-tight mt-0.5">
              Proporsi Sumber Leads Siswa Terdaftar
            </h3>
          </div>
          <span className="font-mono text-[10px] text-zinc-500 px-1.5 py-0.5 rounded-full border border-[var(--border)]">
            KONVERSI
          </span>
        </div>
        <div className="h-56 flex items-center justify-center pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={metrics.sumberLeads}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
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
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
