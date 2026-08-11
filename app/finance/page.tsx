'use client';

import React from 'react';
import { KasTransaksi } from '@/types/database';
import {
  getKasOverviewMetrics,
  getKasTransaksiList,
  addKasTransaksi,
  getKasKategoriList,
} from '@/lib/actions/kas';
import { verifyKasPin } from '@/lib/actions/kas-pin';
import { formatRupiah } from '@/lib/utils/currency';
import { getTodayDateString, formatDateIndo, formatDateLongIndo } from '@/lib/utils/date';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  RefreshCw,
  Download,
  Check,
  X,
  Banknote,
  CreditCard,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  BarChart3,
  Clock,
  Lock,
  KeyRound,
  ShieldCheck,
  Loader2,
  Calendar,
} from 'lucide-react';

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}Jt`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}Rb`;
  return String(n);
}

const JENIS_PEMBAYARAN_OPTIONS = [
  { value: 'tunai', label: '💵 Tunai (Cash)', color: '#0F7A73' },
  { value: 'non_tunai', label: '🏦 Non-Tunai (Transfer/QRIS)', color: '#2563EB' },
];

const TODAY = getTodayDateString();
const GREETING = (() => {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
})();

export default function FinancePortalPage() {
  // Auth gate – Synchronized with main system Kas PIN
  const [pinVerified, setPinVerified] = React.useState(false);
  const [pinInput, setPinInput] = React.useState('');
  const [pinError, setPinError] = React.useState<string | null>(null);
  const [pinLoading, setPinLoading] = React.useState(false);

  // Data State
  const [metrics, setMetrics] = React.useState({
    saldoAktif: 0,
    saldoTunai: 0,
    saldoNonTunai: 0,
    totalPiutang: 0,
    totalHutang: 0,
  });
  const [recentTx, setRecentTx] = React.useState<KasTransaksi[]>([]);
  const [kategoriList, setKategoriList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = React.useState(false);

  // Add transaction bottom sheet
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [formData, setFormData] = React.useState({
    tanggal: TODAY,
    tipe: 'pengeluaran' as 'pemasukan' | 'pengeluaran',
    kategori: 'operasional',
    keterangan: '',
    nominal: 0,
    jenis_pembayaran: 'tunai' as 'tunai' | 'non_tunai',
    pic_tipe: 'finance' as 'admin' | 'finance',
    pic_nama: 'Finance',
    sumber_otomatis: false,
  });
  const [submitting, setSubmitting] = React.useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'riwayat'>('dashboard');

  // ── Auth Check on Mount (Session valid for 8 hours) ──
  React.useEffect(() => {
    const saved = localStorage.getItem('amanah_finance_pin_ok');
    const savedTime = localStorage.getItem('amanah_finance_pin_time');
    if (saved === 'true' && savedTime) {
      const elapsed = Date.now() - parseInt(savedTime, 10);
      const EIGHT_HOURS = 8 * 60 * 60 * 1000;
      if (elapsed < EIGHT_HOURS) {
        setPinVerified(true);
      } else {
        localStorage.removeItem('amanah_finance_pin_ok');
        localStorage.removeItem('amanah_finance_pin_time');
      }
    }
  }, []);

  React.useEffect(() => {
    if (!pinVerified) return;
    loadData();
  }, [pinVerified]);

  // ── PWA Install Prompt Listener ──
  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('fin_pwa_dismissed')) setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!standalone && !sessionStorage.getItem('fin_pwa_dismissed')) {
      if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) setShowInstallBanner(true);
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ── Data Loading ──
  const loadData = async () => {
    setLoading(true);
    const [m, txList, kList] = await Promise.all([
      getKasOverviewMetrics(),
      getKasTransaksiList(),
      getKasKategoriList(),
    ]);
    setMetrics(m as any);
    setRecentTx(txList.slice(0, 30));
    setKategoriList(kList);
    if (kList.length > 0) {
      setFormData((prev) => ({ ...prev, kategori: kList[0].nama_kategori }));
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    showToast('Data keuangan berhasil disinkronkan!');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── PIN Verification Handler ──
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 6) {
      setPinError('PIN harus 6 digit angka');
      return;
    }

    setPinLoading(true);
    setPinError(null);

    const res = await verifyKasPin(pinInput);
    setPinLoading(false);

    if (res.success) {
      setPinVerified(true);
      localStorage.setItem('amanah_finance_pin_ok', 'true');
      localStorage.setItem('amanah_finance_pin_time', Date.now().toString());
      setPinInput('');
    } else {
      setPinError(res.error || 'PIN Kas salah!');
      setPinInput('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('amanah_finance_pin_ok');
    localStorage.removeItem('amanah_finance_pin_time');
    setPinVerified(false);
    setPinInput('');
  };

  // ── Form Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keterangan || formData.nominal <= 0) {
      showToast('Mohon lengkapi nominal dan keterangan transaksi!');
      return;
    }
    setSubmitting(true);
    const res = await addKasTransaksi({
      ...formData,
      pic_nama: formData.pic_tipe === 'finance' ? 'Lia (Finance)' : formData.pic_nama,
    });
    setSubmitting(false);
    if (res.success) {
      showToast(formData.tipe === 'pemasukan' ? '✅ Pemasukan kas berhasil dicatat!' : '✅ Pengeluaran kas berhasil dicatat!');
      setFormData((prev) => ({ ...prev, keterangan: '', nominal: 0 }));
      setShowAddForm(false);
      await loadData();
    } else {
      showToast('❌ Gagal: ' + res.error);
    }
  };

  // ── PWA Install Action ──
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      alert('Untuk memasang di HP: Buka menu opsi browser (titik tiga atau tombol Share) lalu pilih "Tambahkan ke Layar Utama" / "Add to Home Screen".');
    }
    setShowInstallBanner(false);
    sessionStorage.setItem('fin_pwa_dismissed', 'true');
  };

  // ── Computed 7-day Bar Chart ──
  const last7Days = React.useMemo(() => {
    const days: { date: string; masuk: number; keluar: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const dayTx = recentTx.filter((t) => t.tanggal === ds);
      days.push({
        date: ds,
        masuk: dayTx.filter((t) => t.tipe === 'pemasukan').reduce((s, t) => s + t.nominal, 0),
        keluar: dayTx.filter((t) => t.tipe === 'pengeluaran').reduce((s, t) => s + t.nominal, 0),
      });
    }
    return days;
  }, [recentTx]);

  const maxBar = Math.max(...last7Days.map((d) => Math.max(d.masuk, d.keluar)), 1);

  // ────────────────────────────────────────
  // RENDER: PIN Gate Screen (Amanah Brand)
  // ────────────────────────────────────────
  if (!pinVerified) {
    return (
      <div className="fin-root min-h-screen flex items-center justify-center p-4">
        <div className="fin-card max-w-sm w-full p-8 rounded-3xl space-y-6 text-center shadow-2xl border border-[var(--border-strong)]">
          {/* Logo & Shield Icon */}
          <div
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 122, 115, 0.25), rgba(11, 37, 69, 0.4))',
              border: '1.5px solid rgba(26, 173, 164, 0.4)',
            }}
          >
            <Lock className="w-8 h-8 text-[#1AADA4]" />
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#1AADA4] px-2.5 py-1 rounded-full bg-[#1AADA4]/10 border border-[#1AADA4]/20 inline-block mb-2">
              Amanah Drive Palembang
            </span>
            <h1 className="fin-display text-xl font-bold text-[#F0FAF9]">Portal Finance</h1>
            <p className="fin-label text-xs mt-1 text-[#8EA8A5]">
              Sistem Input & Monitoring Kas Operasional
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-5">
            <div>
              <label className="fin-label text-xs font-semibold mb-2 block text-[#8EA8A5]">
                Masukkan 6 Digit PIN Kas
              </label>
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, ''));
                    setPinError(null);
                  }}
                  placeholder="••••••"
                  className="fin-input w-full text-center text-2xl tracking-[0.35em] font-mono font-bold py-3.5 pl-10 pr-4 rounded-xl"
                  autoFocus
                />
                <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8EA8A5] opacity-50" />
              </div>

              {pinError && (
                <p className="text-xs mt-2 font-medium flex items-center justify-center gap-1.5 text-[#F43F5E] animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </p>
              )}

              <p className="text-[11px] text-[#5A7774] mt-2.5">
                PIN ini sama dengan PIN Kas di Dashboard Utama (dapat diubah di menu Pengaturan).
              </p>
            </div>

            <button
              type="submit"
              disabled={pinLoading || pinInput.length !== 6}
              className="fin-btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {pinLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi PIN...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Buka Akses Finance</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────
  // RENDER: Main Finance Portal (Amanah Brand)
  // ────────────────────────────────────────
  return (
    <div className="fin-root min-h-screen pb-28 text-[#F0FAF9]">
      {/* Toast Notification Alert */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl fin-toast animate-in fade-in zoom-in-95">
          <Check className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto fin-card p-4 space-y-3 rounded-2xl border border-[#1AADA4]/30 shadow-2xl animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(15, 122, 115, 0.2)', border: '1px solid rgba(26, 173, 164, 0.4)' }}
            >
              <Download className="w-5 h-5 text-[#1AADA4]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#F0FAF9]">Install PWA Finance Amanah Drive</p>
              <p className="text-[11px] mt-0.5 text-[#8EA8A5]">
                Tambahkan ke layar utama HP untuk akses cepat pencatatan kas tanpa browser.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1A3B37]">
            <button
              onClick={() => {
                setShowInstallBanner(false);
                sessionStorage.setItem('fin_pwa_dismissed', 'true');
              }}
              className="px-3 py-1.5 text-xs font-semibold text-[#8EA8A5] hover:text-[#F0FAF9]"
            >
              Nanti Saja
            </button>
            <button
              onClick={handleInstall}
              className="fin-btn-primary px-4 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install Sekarang</span>
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="px-4 pt-6 pb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#8EA8A5]">{GREETING}, Tim Finance</p>
            <h1 className="fin-display font-extrabold text-base mt-0.5 text-[#F0FAF9] flex items-center gap-2">
              <span>Amanah Drive Finance</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#0F7A73]/30 text-[#1AADA4] border border-[#0F7A73]/40">
                PWA
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="fin-icon-btn text-[#1AADA4]"
              title="Sinkronkan Data Terkini"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="fin-icon-btn text-[#8EA8A5] hover:text-[#F43F5E]"
              title="Kunci / Logout"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-[#8EA8A5] flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-[#1AADA4]" />
          <span>{formatDateLongIndo(TODAY)}</span>
        </p>
      </header>

      {/* ── BALANCE HERO CARD (Signature Teal to Navy Gradient) ── */}
      <div className="px-4 mb-4">
        <div className="fin-balance-hero rounded-[26px] p-6 relative overflow-hidden shadow-xl border border-[#1AADA4]/30">
          {/* Luminous Glow Ambient Orbs */}
          <div className="fin-glow-teal" />
          <div className="fin-glow-navy" />

          <div className="flex items-center justify-between relative z-10 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A5E3DE]">
              Total Saldo Kas Aktif
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/20 text-[#A5E3DE] border border-white/10">
              Live Real-Time
            </span>
          </div>

          <p
            className="fin-display font-extrabold text-3xl relative z-10 text-white tracking-tight"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {loading ? 'Memuat...' : formatRupiah(metrics.saldoAktif)}
          </p>

          {/* Saldo Breakdown: Tunai vs Non-Tunai */}
          <div className="mt-5 grid grid-cols-2 gap-3 relative z-10">
            <div className="fin-sub-stat rounded-2xl p-3.5 transition-all">
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote className="w-4 h-4 text-[#1AADA4]" />
                <span className="text-[11px] font-bold text-[#A5E3DE]">Kas Tunai</span>
              </div>
              <p
                className="fin-display font-extrabold text-base"
                style={{
                  color: metrics.saldoTunai >= 0 ? '#10B981' : '#F43F5E',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {loading ? '...' : formatRupiah(metrics.saldoTunai)}
              </p>
            </div>

            <div className="fin-sub-stat rounded-2xl p-3.5 transition-all">
              <div className="flex items-center gap-1.5 mb-1">
                <CreditCard className="w-4 h-4 text-[#60A5FA]" />
                <span className="text-[11px] font-bold text-[#BFDBFE]">Non-Tunai</span>
              </div>
              <p
                className="fin-display font-extrabold text-base"
                style={{
                  color: metrics.saldoNonTunai >= 0 ? '#60A5FA' : '#F43F5E',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {loading ? '...' : formatRupiah(metrics.saldoNonTunai)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK METRIC CHIPS ── */}
      <div className="px-4 mb-4 grid grid-cols-2 gap-3">
        <div className="fin-card rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4 text-[#F59E0B]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8EA8A5]">
              Piutang Siswa
            </span>
          </div>
          <p
            className="fin-display font-extrabold text-sm text-[#F59E0B]"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {loading ? '...' : formatRupiah(metrics.totalPiutang)}
          </p>
          <p className="text-[10px] text-[#5A7774]">Tagihan belum lunas</p>
        </div>

        <div className="fin-card rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <ArrowDownRight className="w-4 h-4 text-[#F43F5E]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8EA8A5]">
              Sisa Hutang
            </span>
          </div>
          <p
            className="fin-display font-extrabold text-sm text-[#F43F5E]"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {loading ? '...' : formatRupiah(metrics.totalHutang)}
          </p>
          <p className="text-[10px] text-[#5A7774]">Cicilan & pinjaman aktif</p>
        </div>
      </div>

      {/* ── TAB NAVIGATION ── */}
      <div className="px-4 mb-4">
        <div className="flex rounded-2xl p-1 bg-[#0E2321] border border-[#1A3B37]">
          {[
            { id: 'dashboard', label: 'Ringkasan & Grafik', icon: BarChart3 },
            { id: 'riwayat', label: 'Riwayat Transaksi', icon: Clock },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#0F7A73] text-white shadow-md'
                    : 'text-[#8EA8A5] hover:text-[#F0FAF9]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB: DASHBOARD ── */}
      {activeTab === 'dashboard' && (
        <div className="px-4 space-y-4">
          {/* 7-day Bar Chart */}
          <div className="fin-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-[#F0FAF9]">Arus Kas 7 Hari Terakhir</h3>
              <div className="flex items-center gap-3 text-[10px] text-[#8EA8A5]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full inline-block bg-[#10B981]"></span>
                  Masuk
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full inline-block bg-[#F43F5E]"></span>
                  Keluar
                </span>
              </div>
            </div>

            <div className="flex items-end justify-between gap-1 h-32 pt-2">
              {last7Days.map((day) => {
                const isToday = day.date === TODAY;
                const masukH = Math.max((day.masuk / maxBar) * 100, 3);
                const keluarH = Math.max((day.keluar / maxBar) * 100, 3);
                const d = new Date(day.date);
                const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex items-end justify-center gap-1" style={{ height: '95px' }}>
                      <div
                        className="w-[45%] rounded-t-md transition-all"
                        style={{
                          height: `${masukH}%`,
                          background: isToday ? '#10B981' : 'rgba(16, 185, 129, 0.45)',
                          minHeight: 3,
                        }}
                        title={`Masuk: ${formatRupiah(day.masuk)}`}
                      />
                      <div
                        className="w-[45%] rounded-t-md transition-all"
                        style={{
                          height: `${keluarH}%`,
                          background: 'rgba(244, 63, 94, 0.55)',
                          minHeight: 3,
                        }}
                        title={`Keluar: ${formatRupiah(day.keluar)}`}
                      />
                    </div>
                    <span
                      className={`text-[9.5px] font-bold ${
                        isToday ? 'text-[#1AADA4] underline underline-offset-2' : 'text-[#8EA8A5]'
                      }`}
                    >
                      {isToday ? 'Hari ini' : dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's Transactions */}
          <div className="fin-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1A3B37] pb-2">
              <h3 className="text-xs font-bold text-[#F0FAF9] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1AADA4]" />
                <span>Transaksi Kas Hari Ini</span>
              </h3>
              <span className="text-[10px] text-[#8EA8A5] font-semibold">
                {recentTx.filter((t) => t.tanggal === TODAY).length} transaksi
              </span>
            </div>

            {(() => {
              const todayTx = recentTx.filter((t) => t.tanggal === TODAY);
              if (loading) return <div className="h-20 fin-skeleton rounded-xl" />;
              if (todayTx.length === 0) {
                return (
                  <div className="text-center py-6 space-y-1">
                    <p className="text-xs font-medium text-[#8EA8A5]">Belum ada transaksi kas yang dicatat hari ini.</p>
                    <p className="text-[11px] text-[#5A7774]">Tekan tombol (+) di bawah untuk mencatat transaksi baru.</p>
                  </div>
                );
              }
              return (
                <div className="space-y-2">
                  {todayTx.map((tx) => (
                    <div key={tx.id} className="fin-tx-row flex items-center gap-3 p-3 rounded-xl">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: tx.tipe === 'pemasukan' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        }}
                      >
                        {tx.tipe === 'pemasukan' ? (
                          <TrendingUp className="w-4 h-4 text-[#10B981]" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-[#F43F5E]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#F0FAF9] truncate">{tx.keterangan}</p>
                        <p className="text-[10px] text-[#8EA8A5] mt-0.5">
                          {tx.kategori.replace(/_/g, ' ').toUpperCase()} •{' '}
                          <span
                            className={`px-1.5 py-0.2 rounded font-semibold ${
                              (tx.jenis_pembayaran || 'tunai') === 'tunai'
                                ? 'bg-[#0F7A73]/20 text-[#1AADA4]'
                                : 'bg-blue-900/30 text-blue-400'
                            }`}
                          >
                            {(tx.jenis_pembayaran || 'tunai') === 'tunai' ? '💵 Tunai' : '🏦 Non-Tunai'}
                          </span>
                        </p>
                      </div>
                      <span
                        className="fin-display text-xs font-bold tabular-nums shrink-0"
                        style={{ color: tx.tipe === 'pemasukan' ? '#10B981' : '#F43F5E' }}
                      >
                        {tx.tipe === 'pemasukan' ? '+' : '−'} {fmt(tx.nominal)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── TAB: RIWAYAT ── */}
      {activeTab === 'riwayat' && (
        <div className="px-4 space-y-2">
          <p className="text-xs font-semibold mb-2 text-[#8EA8A5]">30 Catatan Transaksi Kas Terbaru</p>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 fin-skeleton rounded-xl" />
              ))}
            </div>
          ) : recentTx.length === 0 ? (
            <div className="fin-card rounded-2xl p-8 text-center text-xs text-[#8EA8A5]">
              Belum ada riwayat transaksi kas tercatat.
            </div>
          ) : (
            <div className="space-y-2">
              {recentTx.map((tx) => (
                <div key={tx.id} className="fin-tx-row flex items-center gap-3 p-3 rounded-xl fin-card">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: tx.tipe === 'pemasukan' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                    }}
                  >
                    {tx.tipe === 'pemasukan' ? (
                      <TrendingUp className="w-4 h-4 text-[#10B981]" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-[#F43F5E]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#F0FAF9] truncate">{tx.keterangan}</p>
                    <p className="text-[10px] text-[#8EA8A5] mt-0.5">
                      {formatDateIndo(tx.tanggal)} • {tx.kategori.replace(/_/g, ' ').toUpperCase()} •{' '}
                      <span
                        className={`px-1.5 py-0.2 rounded font-semibold ${
                          (tx.jenis_pembayaran || 'tunai') === 'tunai'
                            ? 'bg-[#0F7A73]/20 text-[#1AADA4]'
                            : 'bg-blue-900/30 text-blue-400'
                        }`}
                      >
                        {(tx.jenis_pembayaran || 'tunai') === 'tunai' ? '💵 Tunai' : '🏦 Non-Tunai'}
                      </span>
                    </p>
                  </div>
                  <span
                    className="fin-display text-xs font-bold tabular-nums shrink-0"
                    style={{ color: tx.tipe === 'pemasukan' ? '#10B981' : '#F43F5E' }}
                  >
                    {tx.tipe === 'pemasukan' ? '+' : '−'} {fmt(tx.nominal)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FLOATING ACTION BUTTON (+) ── */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-6 right-4 w-14 h-14 rounded-full flex items-center justify-center z-40 transition-transform active:scale-95 shadow-2xl fin-fab"
        title="Catat Transaksi Kas Baru"
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* ── ADD TRANSACTION BOTTOM SHEET ── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-lg fin-sheet rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto border-t border-[#1AADA4]/30 shadow-2xl animate-in slide-in-from-bottom-6">
            {/* Sheet Handle */}
            <div className="w-12 h-1 rounded-full mx-auto mb-2 bg-[#1A3B37]" />

            <div className="flex items-center justify-between border-b border-[#1A3B37] pb-3">
              <h3 className="fin-display font-extrabold text-base text-[#F0FAF9] flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#1AADA4]" />
                <span>Catat Transaksi Kas</span>
              </h3>
              <button onClick={() => setShowAddForm(false)} className="fin-icon-btn">
                <X className="w-4 h-4 text-[#8EA8A5]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Tipe Toggle: Pengeluaran vs Pemasukan */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[#8EA8A5]">Tipe Transaksi *</label>
                <div className="flex rounded-xl p-1 bg-[#0E2321] border border-[#1A3B37]">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipe: 'pengeluaran' })}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      formData.tipe === 'pengeluaran'
                        ? 'bg-[#F43F5E] text-white shadow-md'
                        : 'text-[#8EA8A5] hover:text-white'
                    }`}
                  >
                    − Pengeluaran Kas
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, tipe: 'pemasukan' })}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                      formData.tipe === 'pemasukan'
                        ? 'bg-[#10B981] text-white shadow-md'
                        : 'text-[#8EA8A5] hover:text-white'
                    }`}
                  >
                    + Pemasukan Kas
                  </button>
                </div>
              </div>

              {/* Jenis Pembayaran: Tunai vs Non-Tunai */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[#8EA8A5]">Jenis Pembayaran *</label>
                <div className="flex rounded-xl p-1 bg-[#0E2321] border border-[#1A3B37]">
                  {JENIS_PEMBAYARAN_OPTIONS.map((opt) => {
                    const isSelected = formData.jenis_pembayaran === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, jenis_pembayaran: opt.value as any })}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-[#0F7A73] text-white shadow-md'
                            : 'text-[#8EA8A5] hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nominal Currency Input */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[#8EA8A5]">Nominal Rupiah (Rp) *</label>
                <div className="fin-input-wrap">
                  <CurrencyInput
                    label=""
                    value={formData.nominal}
                    onChange={(val) => setFormData({ ...formData, nominal: val })}
                  />
                </div>
              </div>

              {/* Tanggal Transaksi */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[#8EA8A5]">Tanggal Transaksi *</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="fin-input w-full"
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[#8EA8A5]">Kategori Kas *</label>
                <div className="relative">
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="fin-input w-full appearance-none pr-8 capitalize"
                  >
                    {kategoriList.map((k) => (
                      <option key={k.id} value={k.nama_kategori} className="bg-[#0E2321] text-white">
                        {k.nama_kategori.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[#8EA8A5]" />
                </div>
              </div>

              {/* Keterangan Transaksi */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-[#8EA8A5]">Keterangan Transaksi *</label>
                <input
                  type="text"
                  required
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Misal: Pembelian BBM Avanza / Pembayaran Kursus"
                  className="fin-input w-full"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="fin-btn-primary w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : formData.tipe === 'pemasukan' ? (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>+ Simpan Pemasukan Kas</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    <span>− Simpan Pengeluaran Kas</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── STYLES (Amanah Drive Brand System) ── */}
      <style>{`
        .fin-root {
          background: #071413;
          font-family: var(--font-inter), 'Inter', -apple-system, sans-serif;
        }
        .fin-display {
          font-family: var(--font-space-grotesk), var(--font-inter), sans-serif;
          font-variant-numeric: tabular-nums;
        }
        .fin-label {
          font-family: var(--font-inter), sans-serif;
        }
        .fin-card {
          background: #0F2220;
          border: 1px solid #1A3B37;
        }
        .fin-balance-hero {
          background: linear-gradient(135deg, #0F7A73 0%, #0c3d38 50%, #0B2545 100%);
          border: 1px solid rgba(26, 173, 164, 0.35);
          position: relative;
          overflow: hidden;
        }
        .fin-glow-teal {
          position: absolute;
          top: -40px;
          right: -20px;
          width: 170px;
          height: 170px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(26, 173, 164, 0.45) 0%, transparent 70%);
          pointer-events: none;
        }
        .fin-glow-navy {
          position: absolute;
          bottom: -30px;
          left: 20px;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(11, 37, 69, 0.7) 0%, transparent 70%);
          pointer-events: none;
        }
        .fin-sub-stat {
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .fin-icon-btn {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          border: 1px solid #1A3B37;
          background: #0F2220;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease-in-out;
        }
        .fin-icon-btn:hover {
          background: #14302D;
          border-color: #1AADA4;
        }
        .fin-btn-primary {
          background: #0F7A73;
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          transition: all 0.15s ease-in-out;
        }
        .fin-btn-primary:hover {
          background: #0A5954;
        }
        .fin-fab {
          background: #0F7A73;
          box-shadow: 0 8px 25px rgba(15, 122, 115, 0.45);
        }
        .fin-fab:hover {
          background: #0A5954;
        }
        .fin-input {
          background: #0E2321;
          border: 1px solid #1A3B37;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          outline: none;
          width: 100%;
          transition: border-color 0.15s;
          color: #F0FAF9;
        }
        .fin-input:focus {
          border-color: #1AADA4;
          box-shadow: 0 0 0 2px rgba(26, 173, 164, 0.2);
        }
        .fin-input::placeholder {
          color: #5A7774;
        }
        .fin-sheet {
          background: #071413;
          border-top: 1px solid #1A3B37;
        }
        .fin-tx-row {
          background: #0E2321;
          border: 1px solid #1A3B37;
          transition: background 0.15s;
        }
        .fin-tx-row:hover {
          background: #132D2A;
        }
        .fin-toast {
          background: #0F7A73;
          color: #FFFFFF;
          border: 1px solid #1AADA4;
        }
        .fin-skeleton {
          background: linear-gradient(90deg, #0F2220 25%, #153330 50%, #0F2220 75%);
          background-size: 200% 100%;
          animation: fin-shimmer 1.5s infinite;
        }
        @keyframes fin-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .fin-input-wrap label {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
