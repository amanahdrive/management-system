'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/PageHeader';
import { getHomepageTrackingStats } from '@/lib/actions/homepage-manager';
import {
  Users,
  GraduationCap,
  MessageCircle,
  MousePointerClick,
  TrendingUp,
  RefreshCw,
  Clock,
  Sparkles,
  MapPin,
  FileText,
  Activity,
} from 'lucide-react';

const DailyLeadsTrendChart = dynamic(
  () => import('@/components/homepage/HomepageCharts').then((m) => m.DailyLeadsTrendChart),
  { ssr: false, loading: () => <div className="h-64 bg-black/5 dark:bg-white/5 animate-pulse rounded-lg" /> }
);

const PackageDistributionChart = dynamic(
  () => import('@/components/homepage/HomepageCharts').then((m) => m.PackageDistributionChart),
  { ssr: false, loading: () => <div className="h-64 bg-black/5 dark:bg-white/5 animate-pulse rounded-lg" /> }
);

const EventBreakdownChart = dynamic(
  () => import('@/components/homepage/HomepageCharts').then((m) => m.EventBreakdownChart),
  { ssr: false, loading: () => <div className="h-64 bg-black/5 dark:bg-white/5 animate-pulse rounded-lg" /> }
);

export default function HomepageTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHomepageTrackingStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load tracking stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = stats?.summary || {
    total_leads: 0,
    leads_today: 0,
    leads_week: 0,
    leads_month: 0,
    status_baru: 0,
    status_dihubungi: 0,
    status_siswa: 0,
    status_batal: 0,
  };

  const conversionRate =
    summary.total_leads > 0
      ? Math.round((summary.status_siswa / summary.total_leads) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Tracking Homepage"
        description="Analitik konversi pendaftaran, perilaku pengunjung, klik WhatsApp, dan minat paket kursus dari landing page publik."
        breadcrumbs={[
          { label: 'Homepage Manager', href: '/homepage-manager/submissions' },
          { label: 'Internal Tracking' },
        ]}
        actions={
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Perbarui Data</span>
          </button>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Leads */}
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Total Leads Masuk</span>
            <div className="p-2 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {summary.total_leads}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-mono">
            <span className="text-[#10B981] font-semibold">+{summary.leads_today} hari ini</span>
            <span>•</span>
            <span>+{summary.leads_week} minggu ini</span>
          </div>
        </div>

        {/* Card 2: Konversi Siswa */}
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Konversi Jadi Siswa</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {summary.status_siswa}
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {conversionRate}% Rate
            </span>
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Siswa resmi hasil pendaftaran homepage
          </div>
        </div>

        {/* Card 3: Status Pipeline */}
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Pipeline Follow-up</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-3 text-sm">
            <div>
              <span className="text-xl font-bold text-amber-600">{summary.status_baru}</span>
              <span className="text-[10px] text-[var(--text-muted)] ml-1">Baru</span>
            </div>
            <span>/</span>
            <div>
              <span className="text-xl font-bold text-blue-600">{summary.status_dihubungi}</span>
              <span className="text-[10px] text-[var(--text-muted)] ml-1">Dihubungi</span>
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            {summary.status_baru > 0 ? 'Perlu follow-up segera via WhatsApp' : 'Semua lead sudah diproses'}
          </div>
        </div>

        {/* Card 4: Interaksi Form & WA */}
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Total Interaksi Tracking</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {(stats?.eventStats || []).reduce((acc: number, cur: any) => acc + cur.total, 0)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            Event tercatat (WA, form, maps)
          </div>
        </div>
      </div>

      {/* Row 1 Charts: Daily Trend (8 cols) & Event Breakdown (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Tren Leads Harian (14 Hari Terakhir)</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Jumlah submission form pendaftaran &amp; perolehan siswa baru</p>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--brand-primary)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-time</span>
            </div>
          </div>
          <DailyLeadsTrendChart data={stats?.dailyTrend || []} />
        </div>

        <div className="lg:col-span-4 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs space-y-3">
          <div className="border-b border-[var(--border)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Aktivitas Interaksi</h2>
            <p className="text-[11px] text-[var(--text-muted)]">Distribusi event tombol dan formulir</p>
          </div>
          <EventBreakdownChart data={stats?.eventStats || []} />
        </div>
      </div>

      {/* Row 2 Charts: Package Ranking (6 cols) & Recent Stream (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs space-y-3">
          <div className="border-b border-[var(--border)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Peringkat Minat Paket Kursus</h2>
            <p className="text-[11px] text-[var(--text-muted)]">Pilihan paket yang paling sering dipilih calon siswa pada formulir</p>
          </div>
          <PackageDistributionChart data={stats?.packageStats || []} />
        </div>

        <div className="lg:col-span-6 p-5 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs space-y-3">
          <div className="border-b border-[var(--border)] pb-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Live Event Activity Stream</h2>
            <p className="text-[11px] text-[var(--text-muted)]">Log interaksi terkini dari pengunjung homepage</p>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {(!stats?.recentEvents || stats.recentEvents.length === 0) ? (
              <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                Belum ada aktivitas interaksi baru.
              </div>
            ) : (
              stats.recentEvents.map((evt: any) => {
                const isForm = evt.event_name === 'lead_submit';
                const isWA = evt.event_name === 'wa_click';
                return (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)] text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-1.5 rounded-md ${
                          isForm
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : isWA
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-blue-500/10 text-blue-600'
                        }`}
                      >
                        {isForm ? (
                          <FileText className="w-3.5 h-3.5" />
                        ) : isWA ? (
                          <MessageCircle className="w-3.5 h-3.5" />
                        ) : (
                          <MousePointerClick className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[var(--text-primary)] truncate">
                          {evt.event_name === 'lead_submit'
                            ? `Form Submit: ${evt.event_data?.nama || 'Lead Baru'}`
                            : evt.event_name === 'wa_click'
                            ? `Klik WhatsApp: ${evt.event_data?.source || 'Tombol'}`
                            : evt.event_name}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] truncate">
                          {evt.source || 'homepage'} • IP: {evt.ip_address || 'Anonim'}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-[var(--text-muted)] shrink-0 ml-2">
                      {new Date(evt.created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
