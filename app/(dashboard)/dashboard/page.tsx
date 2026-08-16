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
          <div className="h-64 card-container animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
          <div className="h-64 card-container animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        </div>
        <div className="h-56 card-container animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
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
        <PageHeader title="Dashboard" description="Ringkasan operasional & performa bisnis" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 card-container animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
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
          label="Siswa Belum Dijadwalkan"
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
        />
        <StatCard
          label="Booking Baru (Bulan Ini)"
          value={metrics.siswaBaruBulanIni}
          description="Total pendaftaran siswa baru"
          icon={<UserPlus className="w-5 h-5" />}
        />
      </div>

      {/* 3 Secondary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Pendapatan (Bulan Ini)"
          value={formatRupiah(metrics.totalPendapatanBulanIni)}
          description="Pemasukan dari DP & Pelunasan"
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          label="Saldo Kas Aktif"
          value={formatRupiah(metrics.saldoKasAktif)}
          description="Klik untuk detail Kas (Butuh PIN)"
          icon={<Wallet className="w-5 h-5 text-teal-600" />}
          onClick={() => (window.location.href = '/kas')}
        />
        <StatCard
          label="Sesi Terjadwal Hari Ini"
          value={`${metrics.sesiTerjadwalHariIni} Sesi`}
          description="Sesi mengemudi aktif hari ini"
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
          onClick={() => (window.location.href = '/jadwal')}
        />
      </div>

      {/* Kendaraan Perlu Perhatian Alert Banner */}
      {metrics.kendaraanPerluPerhatian.length > 0 && (
        <div className="card-container border-l-4 border-l-[var(--danger)] bg-rose-50 dark:bg-rose-950/20 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)] shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-[var(--danger)]">Perhatian Kendaraan Operasional</h4>
              <ul className="text-xs text-[var(--text-secondary)] mt-1 space-y-0.5">
                {metrics.kendaraanPerluPerhatian.map((k, idx) => (
                  <li key={idx}>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {k.nama} ({k.plat})
                    </span>
                    : {k.alasan}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Dynamically Loaded Charts */}
      <DashboardCharts metrics={metrics} />
    </div>
  );
}
