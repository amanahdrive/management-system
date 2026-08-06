'use client';

import React from 'react';
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
  PieChart as PieIcon,
  BarChart3,
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils/currency';
import { getDashboardMetrics, DashboardMetrics } from '@/lib/actions/dashboard';
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

const COLORS = ['#0F7A73', '#2563A8', '#B9821B', '#C13D3D'];

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
            <div key={i} className="h-28 card-container animate-pulse bg-black/5 dark:bg-white/5" />
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
                {metrics.sumberLeads.map((entry, index) => (
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
