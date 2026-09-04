'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getDashboardMetrics, DashboardMetrics } from '@/lib/actions/dashboard';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, formatHariTanggalIndo, getTodayDateString } from '@/lib/utils/date';
import {
  Users,
  CalendarCheck,
  CheckCircle2,
  UserPlus,
  TrendingUp,
  Wallet,
  Calendar,
  AlertTriangle,
  Clock,
  Car,
  IdCard,
  MessageCircle,
  Receipt,
  ChevronRight,
  BarChart3,
} from 'lucide-react';

const DashboardCharts = dynamic(
  () => import('@/components/dashboard/DashboardCharts').then((mod) => mod.DashboardCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-none bg-black/5 dark:bg-white/5 animate-pulse border border-[var(--border)]" />
        <div className="h-64 rounded-none bg-black/5 dark:bg-white/5 animate-pulse border border-[var(--border)]" />
      </div>
    ),
  }
);

export default function DashboardPage() {
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sesiFilter, setSesiFilter] = React.useState<'all' | 'terjadwal' | 'selesai'>('all');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDashboardMetrics();
      setMetrics(res);
    } catch (e) {
      console.error('Error loading dashboard metrics:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !metrics) {
    return (
      <div className="space-y-6">
        <div className="h-12 rounded-none bg-black/5 dark:bg-white/5 animate-pulse border border-[var(--border)]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-none bg-black/5 dark:bg-white/5 animate-pulse border border-[var(--border)]" />
          ))}
        </div>
        <div className="h-96 rounded-none bg-black/5 dark:bg-white/5 animate-pulse border border-[var(--border)]" />
      </div>
    );
  }

  const todayStr = getTodayDateString();
  const filteredSesiHariIni = metrics.sesiHariIniList.filter((s) => {
    if (sesiFilter === 'all') return true;
    return s.statusSesi === sesiFilter;
  });

  return (
    <div className="space-y-4 pb-10">
      {/* Top Header & Quick Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight">
            Dashboard Operasional
          </h1>
          <span className="px-2 py-0.5 bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-mono text-[10px] border border-[var(--border)]">
            {formatHariTanggalIndo(todayStr)}
          </span>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href="/siswa"
            className="px-3 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Siswa Baru</span>
          </Link>
          <Link
            href="/jadwal"
            className="px-3 py-1.5 border border-[var(--border)] bg-[var(--bg)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>+ Jadwal</span>
          </Link>
          <Link
            href="/kas"
            className="px-3 py-1.5 border border-[var(--border)] bg-[var(--bg)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Catat Kas</span>
          </Link>
          <Link
            href="/sim"
            className="px-3 py-1.5 border border-[var(--border)] bg-[var(--bg)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <IdCard className="w-3.5 h-3.5 text-blue-600" />
            <span>SIM</span>
          </Link>
        </div>
      </div>

      {/* 4 Primary KPI Metrics Row (Swiss Hairline 1px Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Pendapatan Kas Bulan Ini */}
        <div className="p-3.5 border border-[var(--border)] bg-[var(--bg)] space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
            <span>Kas Masuk (Bulan Ini)</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-[var(--text-primary)] tabular-nums">
            {formatRupiah(metrics.totalPendapatanBulanIni)}
          </div>
          <div className="text-[10px] font-mono text-[var(--text-secondary)] flex justify-between pt-0.5">
            <span>Keluar: {formatRupiah(metrics.totalPengeluaranBulanIni)}</span>
            <span className={`font-semibold ${metrics.labaBersihBulanIni >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Net: {formatRupiah(metrics.labaBersihBulanIni)}
            </span>
          </div>
        </div>

        {/* Saldo Kas Aktif */}
        <Link
          href="/kas"
          className="p-3.5 border border-[var(--border)] bg-[var(--bg)] hover:border-emerald-500 transition-colors space-y-1 block"
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
            <span>Saldo Kas Likuid</span>
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-emerald-600 tabular-nums">
            {formatRupiah(metrics.saldoKasAktif)}
          </div>
          <div className="text-[10px] font-mono text-[var(--text-secondary)] pt-0.5">Kas Tunai & Rekening Bank</div>
        </Link>

        {/* Siswa On Progress */}
        <Link
          href="/siswa"
          className="p-3.5 border border-[var(--border)] bg-[var(--bg)] hover:border-blue-500 transition-colors space-y-1 block"
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
            <span>Siswa On Progress</span>
            <Users className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-blue-600 tabular-nums">
            {metrics.siswaOnProgress} <span className="text-xs font-normal text-[var(--text-secondary)]">Siswa</span>
          </div>
          <div className="text-[10px] font-mono text-[var(--text-secondary)] flex justify-between pt-0.5">
            <span>+{metrics.siswaBaruBulanIni} Booking</span>
            <span className="text-emerald-600 font-semibold">{metrics.siswaSelesai} Lulus</span>
          </div>
        </Link>

        {/* Sesi Hari Ini */}
        <Link
          href="/jadwal"
          className="p-3.5 border border-[var(--border)] bg-[var(--bg)] hover:border-purple-500 transition-colors space-y-1 block"
        >
          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
            <span>Sesi Hari Ini</span>
            <CalendarCheck className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-lg sm:text-xl font-mono font-bold text-purple-600 tabular-nums">
            {metrics.sesiHariIniList.length} <span className="text-xs font-normal text-[var(--text-secondary)]">Sesi</span>
          </div>
          <div className="text-[10px] font-mono text-[var(--text-secondary)] flex justify-between pt-0.5">
            <span className="text-emerald-600 font-semibold">{metrics.sesiSelesaiHariIni} Selesai</span>
            <span className="text-amber-600 font-semibold">{metrics.sesiTerjadwalHariIni} Terjadwal</span>
          </div>
        </Link>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Col (2 Cols): Jadwal Sesi Hari Ini Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 border border-[var(--border)] bg-[var(--bg)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Jadwal Kursus Lapangan ({formatDateIndo(todayStr)})</span>
              </span>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-0.5 border border-[var(--border)] text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setSesiFilter('all')}
                  className={`px-2 py-0.5 transition-colors text-[11px] ${
                    sesiFilter === 'all' ? 'bg-[var(--brand-primary)] text-white font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Semua ({metrics.sesiHariIniList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSesiFilter('terjadwal')}
                  className={`px-2 py-0.5 transition-colors text-[11px] ${
                    sesiFilter === 'terjadwal' ? 'bg-amber-600 text-white font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Terjadwal ({metrics.sesiTerjadwalHariIni})
                </button>
                <button
                  type="button"
                  onClick={() => setSesiFilter('selesai')}
                  className={`px-2 py-0.5 transition-colors text-[11px] ${
                    sesiFilter === 'selesai' ? 'bg-emerald-600 text-white font-bold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Selesai ({metrics.sesiSelesaiHariIni})
                </button>
              </div>
            </div>

            {/* List Sesi */}
            {filteredSesiHariIni.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-secondary)] font-mono">
                Tidak ada sesi mengemudi untuk hari ini pada filter ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="text-[var(--text-secondary)] border-b border-[var(--border)] font-mono text-[10px] uppercase">
                    <tr>
                      <th className="py-2 font-semibold">Slot Waktu</th>
                      <th className="py-2 font-semibold">Nama Siswa</th>
                      <th className="py-2 font-semibold">Sesi</th>
                      <th className="py-2 font-semibold">Instruktur</th>
                      <th className="py-2 font-semibold">Armada</th>
                      <th className="py-2 font-semibold text-center">Status</th>
                      <th className="py-2 font-semibold text-right">Kontak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredSesiHariIni.map((s) => (
                      <tr key={s.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="py-2 font-mono font-bold text-[var(--brand-primary)]">
                          Slot {s.urutanSlot} ({s.namaSlot.replace(/Slot\s*\d+/i, '').trim() || s.namaSlot})
                        </td>
                        <td className="py-2 font-semibold text-[var(--text-primary)]">
                          <Link href={`/siswa/${s.siswaId}`} className="hover:underline hover:text-[var(--brand-primary)]">
                            {s.namaSiswa}
                          </Link>
                        </td>
                        <td className="py-2 font-mono tabular-nums text-[var(--text-secondary)]">
                          {s.nomorSesiKe}/{s.totalSesiPaket}
                        </td>
                        <td className="py-2 text-[var(--text-primary)]">{s.namaInstruktur}</td>
                        <td className="py-2 text-[var(--text-secondary)] font-mono text-[11px]">
                          {s.namaKendaraan} {s.platNomor !== '-' ? `(${s.platNomor})` : ''}
                        </td>
                        <td className="py-2 text-center">
                          {s.statusSesi === 'selesai' ? (
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[10px] uppercase">
                              Selesai
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono text-[10px] uppercase">
                              Terjadwal
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {s.noWhatsapp && (
                            <a
                              href={`https://wa.me/${s.noWhatsapp.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:underline font-mono text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WA</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Interactive Charts Component */}
          <DashboardCharts metrics={metrics} />
        </div>

        {/* Right Col (1 Col): Urgent Alerts & Shortcuts */}
        <div className="space-y-4">
          {/* Action Alerts Box */}
          <div className="p-4 border border-[var(--border)] bg-[var(--bg)] space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-bold text-[var(--text-primary)] font-mono uppercase tracking-wider">
                Status Operasional
              </span>
            </div>

            <div className="space-y-2">
              {/* Alert 1: SIM Siap */}
              <Link
                href="/sim"
                className="p-3 border border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/20 hover:border-blue-500 flex items-center justify-between transition-colors block"
              >
                <div className="flex items-center gap-2.5">
                  <IdCard className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] block">SIM Siap Diterbitkan</span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">{metrics.siswaSiapSimCount} siswa siap diproses</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-600" />
              </Link>

              {/* Alert 2: Follow Up Pelunasan */}
              <Link
                href="/kas/piutang"
                className="p-3 border border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/20 hover:border-amber-500 flex items-center justify-between transition-colors block"
              >
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] block">Follow Up Pelunasan</span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">{metrics.siswaBelumLunasCount} siswa belum lunas</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600" />
              </Link>

              {/* Alert 3: Armada Servis */}
              {metrics.kendaraanPerluPerhatian.length > 0 && (
                <Link
                  href="/kendaraan"
                  className="p-3 border border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/20 hover:border-rose-500 flex items-center justify-between transition-colors block"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">Servis Armada</span>
                      <span className="text-[10px] font-mono text-rose-600">{metrics.kendaraanPerluPerhatian.length} unit perlu ganti oli</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-600" />
                </Link>
              )}
            </div>
          </div>

          {/* Quick Link to Analitik */}
          <Link
            href="/analitik"
            className="p-4 border border-[var(--border)] bg-[var(--bg-subtle)] hover:border-[var(--brand-primary)] transition-colors flex items-center justify-between block group"
          >
            <div>
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Pusat Analitik & Performa</span>
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] font-mono text-[10px] mt-0.5 block">Laporan keuangan, SDM & armada</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--brand-primary)] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
