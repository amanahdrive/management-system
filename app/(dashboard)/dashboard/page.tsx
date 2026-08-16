'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import {
  Users,
  CalendarCheck,
  CheckCircle2,
  UserPlus,
  TrendingUp,
  Wallet,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils/currency';
import { getDashboardMetrics, DashboardMetrics } from '@/lib/actions/dashboard';

const DashboardCharts = dynamic(
  () => import('@/components/dashboard/DashboardCharts').then((mod) => mod.DashboardCharts),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bento-tile animate-pulse bg-black/5 dark:bg-white/5" />
          <div className="h-64 bento-tile animate-pulse bg-black/5 dark:bg-white/5" />
        </div>
        <div className="h-56 bento-tile animate-pulse bg-black/5 dark:bg-white/5" />
      </div>
    ),
  }
);

export default function DashboardPage() {
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getDashboardMetrics().then((res) => {
      setMetrics(res);
      setLoading(false);
    });
  }, []);

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard Overview" description="Ringkasan operasional data & performa bisnis" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bento-tile animate-pulse bg-black/5 dark:bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Dashboard Overview"
        description="Ringkasan operasional kursus, jadwal instruktur, dan kas terkini Amanah Drive"
      />

      {/* 4 Main Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Siswa Belum Terjadwal"
          value={metrics.siswaBelumDijadwalkan}
          description="Siswa baru aktif bulan ini"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Siswa On Progress"
          value={metrics.siswaOnProgress}
          description="Sedang berjalan sesi kursus"
          icon={<CalendarCheck className="w-5 h-5" />}
        />
        <StatCard
          label="Siswa Selesai"
          value={metrics.siswaSelesai}
          description="Lulus paket bulan ini"
          icon={<CheckCircle2 className="w-5 h-5" />}
          trendType="positive"
          trend="Lulus"
        />
        <StatCard
          label="Booking Baru (Bulan Ini)"
          value={metrics.siswaBaruBulanIni}
          description="Total pendaftaran siswa baru"
          icon={<UserPlus className="w-5 h-5" />}
        />
      </div>

      {/* 3 Secondary Bento Cards (Revenue & Cashflow Heroes) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Pendapatan (Bulan Ini)"
          value={formatRupiah(metrics.totalPendapatanBulanIni)}
          description="Pemasukan dari DP & Pelunasan"
          icon={<TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          isHero={true}
        />
        <StatCard
          label="Saldo Kas Aktif"
          value={formatRupiah(metrics.saldoKasAktif)}
          description="Klik untuk rincian kas & mutasi"
          icon={<Wallet className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
          isHero={true}
          onClick={() => (window.location.href = '/kas')}
        />
        <StatCard
          label="Sesi Terjadwal Hari Ini"
          value={`${metrics.sesiTerjadwalHariIni} Sesi`}
          description="Sesi mengemudi aktif hari ini"
          icon={<Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          onClick={() => (window.location.href = '/jadwal')}
        />
      </div>

      {/* Kendaraan Perlu Perhatian Alert Banner */}
      {metrics.kendaraanPerluPerhatian.length > 0 && (
        <div className="bento-tile border-l-4 border-l-[var(--danger)] bg-rose-500/5 p-5">
          <div className="flex items-center gap-3.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-[var(--danger)] shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="eyebrow-label text-[var(--danger)]">Peringatan Armada</span>
              <h4 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">Kendaraan Perlu Perhatian Segera</h4>
              <ul className="text-xs text-[var(--text-secondary)] mt-1.5 space-y-1">
                {metrics.kendaraanPerluPerhatian.map((k, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {k.nama} ({k.plat})
                    </span>
                    <span className="text-[var(--text-muted)]">—</span>
                    <span>{k.alasan}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Dynamically Loaded Bento Charts */}
      <DashboardCharts metrics={metrics} />
    </div>
  );
}
