'use client';

import React from 'react';
import Link from 'next/link';
import { getDashboardMetrics, DashboardMetrics, SesiHariIniItem } from '@/lib/actions/dashboard';
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
  ArrowRight,
  Clock,
  Car,
  IdCard,
  BarChart3,
  Sparkles,
  AlertCircle,
  PlusCircle,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Receipt,
  Layers,
  Activity,
  ShieldCheck,
} from 'lucide-react';

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
        <div className="h-16 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
          <div className="h-96 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  const todayStr = getTodayDateString();
  const filteredSesiHariIni = metrics.sesiHariIniList.filter((s) => {
    if (sesiFilter === 'all') return true;
    return s.statusSesi === sesiFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Command Center Welcome & Quick Actions Bar */}
      <div className="card-container p-5 bg-gradient-to-r from-[var(--bg)] via-[var(--bg-subtle)] to-[var(--bg)] border border-[var(--border)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Sistem Operasional Aktif</span>
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              • {formatHariTanggalIndo(todayStr)}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight mt-1">
            Dashboard Operasional Amanah Drive
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Pantau arus kas, jadwal mengemudi harian, siswa aktif, dan kesiapan armada dalam satu layar terintegrasi.
          </p>
        </div>

        {/* Quick Launcher Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/siswa"
            className="px-3 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Siswa Baru</span>
          </Link>

          <Link
            href="/jadwal"
            className="px-3 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>+ Jadwal Sesi</span>
          </Link>

          <Link
            href="/kas"
            className="px-3 py-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Catat Kas / BBM</span>
          </Link>

          <Link
            href="/analitik"
            className="px-3 py-2 rounded-xl bg-[var(--brand-primary-light)] hover:bg-[var(--brand-primary)] hover:text-white text-[var(--brand-primary)] text-xs font-bold transition-all flex items-center gap-1.5"
            title="Buka Pusat Analitik & Evaluasi Bisnis"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Pusat Analitik &rarr;</span>
          </Link>
        </div>
      </div>

      {/* 2. Tier 1 SaaS Metric Cards (Executive Pulse) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pendapatan Bulan Ini */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-[var(--brand-primary)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Pendapatan Kas (Bulan Ini)
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tabular-nums">
            {formatRupiah(metrics.totalPendapatanBulanIni)}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between pt-0.5">
            <span>Pengeluaran: {formatRupiah(metrics.totalPengeluaranBulanIni)}</span>
            <span className={`font-bold ${metrics.labaBersihBulanIni >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Net: {formatRupiah(metrics.labaBersihBulanIni)}
            </span>
          </div>
        </div>

        {/* Saldo Kas Aktif Likuid */}
        <div
          onClick={() => (window.location.href = '/kas')}
          className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-emerald-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Saldo Kas Likuiditas
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 tabular-nums">
            {formatRupiah(metrics.saldoKasAktif)}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between pt-0.5">
            <span>Kas Tunai & Rekening Bank</span>
            <span className="text-[var(--brand-primary)] font-semibold flex items-center gap-0.5">
              Rincian &rarr;
            </span>
          </div>
        </div>

        {/* Siswa Aktif Belajar (On Progress) */}
        <div
          onClick={() => (window.location.href = '/siswa')}
          className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-blue-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Siswa On Progress
            </span>
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 tabular-nums">
            {metrics.siswaOnProgress} <span className="text-xs font-semibold">Siswa</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between pt-0.5">
            <span>+{metrics.siswaBaruBulanIni} Booking Baru</span>
            <span className="text-emerald-600 font-bold">{metrics.siswaSelesai} Lulus</span>
          </div>
        </div>

        {/* Sesi Mengemudi Hari Ini */}
        <div
          onClick={() => (window.location.href = '/jadwal')}
          className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-purple-500 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Sesi Kursus Hari Ini
            </span>
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-600 tabular-nums">
            {metrics.sesiHariIniList.length} <span className="text-xs font-semibold">Total Sesi</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between pt-0.5">
            <span className="text-emerald-600 font-bold">{metrics.sesiSelesaiHariIni} Selesai</span>
            <span className="text-amber-600 font-bold">{metrics.sesiTerjadwalHariIni} Berjalan/Akan Datang</span>
          </div>
        </div>
      </div>

      {/* 3. Main Operational Command Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Live Today's Schedule & Trends */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sesi Mengemudi Hari Ini (Live Timeline Table) */}
          <div className="card-container p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">
                    Jadwal Kursus Lapangan Hari Ini ({formatDateIndo(todayStr)})
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Pantau giliran slot waktu, nama siswa, instruktur bertugas, dan armada yang jalan
                  </p>
                </div>
              </div>

              {/* Filter Sesi Toggle */}
              <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border)] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSesiFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    sesiFilter === 'all' ? 'bg-[var(--brand-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Semua ({metrics.sesiHariIniList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSesiFilter('terjadwal')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    sesiFilter === 'terjadwal' ? 'bg-amber-600 text-white shadow-xs' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Terjadwal ({metrics.sesiTerjadwalHariIni})
                </button>
                <button
                  type="button"
                  onClick={() => setSesiFilter('selesai')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    sesiFilter === 'selesai' ? 'bg-emerald-600 text-white shadow-xs' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Selesai ({metrics.sesiSelesaiHariIni})
                </button>
              </div>
            </div>

            {/* List Sesi Hari Ini */}
            <div className="space-y-2.5">
              {filteredSesiHariIni.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-[var(--border)] rounded-2xl bg-[var(--bg-subtle)] space-y-2">
                  <Calendar className="w-8 h-8 opacity-30 text-[var(--text-secondary)] mx-auto" />
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    Tidak ada sesi mengemudi pada filter ini untuk hari ini.
                  </p>
                  <Link
                    href="/jadwal"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)] hover:underline"
                  >
                    <span>Buka Kalender Jadwal &rarr;</span>
                  </Link>
                </div>
              ) : (
                filteredSesiHariIni.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]/50 hover:bg-[var(--bg-subtle)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      {/* Slot Badge */}
                      <div className="px-2.5 py-1.5 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-extrabold text-xs shrink-0 text-center">
                        <span className="block text-[10px] uppercase font-medium">Slot {s.urutanSlot}</span>
                        <span>{s.namaSlot.replace(/Slot\s*\d+/i, '').trim() || s.namaSlot}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/siswa/${s.siswaId}`}
                            className="font-bold text-xs text-[var(--text-primary)] hover:text-[var(--brand-primary)] hover:underline"
                          >
                            {s.namaSiswa}
                          </Link>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/5 font-semibold text-[var(--text-secondary)]">
                            Sesi ke-{s.nomorSesiKe} / {s.totalSesiPaket}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-[var(--text-secondary)] mt-0.5">
                          <span className="flex items-center gap-1">
                            <span className="font-semibold text-[var(--text-primary)]">Instruktur:</span> {s.namaInstruktur}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            <span>{s.namaKendaraan} {s.platNomor !== '-' ? `(${s.platNomor})` : ''}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {s.noWhatsapp && (
                        <a
                          href={`https://wa.me/${s.noWhatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100 transition-colors"
                          title="Hubungi Siswa via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {s.statusSesi === 'selesai' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Selesai</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Terjadwal</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Arus Kas & Pendaftaran Siswa Mini Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Arus Kas Bulanan */}
            <div className="card-container p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Tren Arus Kas (6 Bulan)</span>
                </h3>
                <Link href="/kas" className="text-[11px] text-[var(--brand-primary)] hover:underline font-semibold">
                  Kelola Kas &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-6 gap-1.5 pt-2">
                {metrics.trenCashflow.map((cf, idx) => (
                  <div key={idx} className="text-center space-y-1">
                    <div className="h-20 bg-[var(--bg-subtle)] rounded-lg flex items-end justify-center p-1 relative overflow-hidden">
                      <div
                        className="w-full bg-emerald-500 rounded-md transition-all"
                        style={{ height: `${Math.min(Math.max((cf.pemasukan / 15000000) * 100, 8), 100)}%` }}
                        title={`${cf.bulan}: Masuk ${formatRupiah(cf.pemasukan)} / Keluar ${formatRupiah(cf.pengeluaran)}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] block">{cf.bulan}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tren Pendaftaran Siswa */}
            <div className="card-container p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Tren Pendaftaran Siswa</span>
                </h3>
                <Link href="/siswa" className="text-[11px] text-[var(--brand-primary)] hover:underline font-semibold">
                  Lihat Siswa &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-6 gap-1.5 pt-2">
                {metrics.trenPendaftaran.map((t, idx) => (
                  <div key={idx} className="text-center space-y-1">
                    <div className="h-20 bg-[var(--bg-subtle)] rounded-lg flex items-end justify-center p-1 relative overflow-hidden">
                      <div
                        className="w-full bg-[var(--brand-primary)] rounded-md transition-all"
                        style={{ height: `${Math.min(Math.max((t.total / 15) * 100, 8), 100)}%` }}
                        title={`${t.bulan}: ${t.total} Siswa Mendaftar`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] block">{t.bulan}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Action Required Alerts & Fleet Health */}
        <div className="space-y-6">
          {/* Tindakan Prioritas (Action Required) */}
          <div className="card-container p-5 space-y-3 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">
                  Prioritas & Perlu Tindakan
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded">
                Live Alerts
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Alert 1: Siswa Siap Selesai SIM */}
              <Link
                href="/sim"
                className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 hover:border-blue-400 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950">
                    <IdCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">Penerbitan SIM Siap</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {metrics.siswaSiapSimCount} siswa sudah lunas & siap terbit
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Alert 2: Siswa Belum Lunas */}
              <Link
                href="/kas/piutang"
                className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 hover:border-amber-400 flex items-center justify-between transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">Follow Up Pelunasan</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {metrics.siswaBelumLunasCount} siswa menunggu pelunasan
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform" />
              </Link>

              {/* Alert 3: Kendaraan Servis / Ganti Oli */}
              {metrics.kendaraanPerluPerhatian.length > 0 && (
                <Link
                  href="/kendaraan"
                  className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 hover:border-rose-400 flex items-center justify-between transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[var(--text-primary)] block">Servis Armada</span>
                      <span className="text-[11px] text-rose-600 font-medium">
                        {metrics.kendaraanPerluPerhatian.length} unit perlu ganti oli
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>
          </div>

          {/* Banner Menuju Pusat Analitik Bisnis */}
          <div className="card-container p-5 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white space-y-3 shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h3 className="font-bold text-sm">Pusat Analitik & Laporan Rapat</h3>
            </div>
            <p className="text-xs text-white/90 leading-relaxed">
              Akses statistik mendalam per siswa, utilisasi sesi, leaderboard instruktur, dan efisiensi BBM armada untuk evaluasi awal bulan.
            </p>
            <Link
              href="/analitik"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[var(--brand-primary)] hover:bg-white/90 text-xs font-extrabold shadow-xs transition-all w-full justify-center"
            >
              <span>Buka Menu Analitik Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Distribusi Sumber Leads Marketing */}
          <div className="card-container p-5 space-y-3">
            <h3 className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border)] pb-2 flex items-center justify-between">
              <span>Channel Leads Marketing</span>
              <span className="text-[10px] font-normal text-[var(--text-secondary)]">Semua Siswa</span>
            </h3>

            <div className="space-y-2">
              {metrics.sumberLeads.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)]" />
                    <span>{s.name}</span>
                  </span>
                  <span className="font-bold text-[var(--text-primary)] tabular-nums">{s.value} Siswa</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
