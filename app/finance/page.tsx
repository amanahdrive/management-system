'use client';

import React from 'react';
import { KasTransaksi } from '@/types/database';
import {
  getKasOverviewMetrics,
  getKasTransaksiList,
  addKasTransaksi,
  getKasKategoriList,
} from '@/lib/actions/kas';
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
} from 'lucide-react';

// ─────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────
const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'
];

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}Jt`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}Rb`;
  return String(n);
}

const JENIS_PEMBAYARAN_OPTIONS = [
  { value: 'tunai', label: '💵 Tunai (Cash)', color: '#c3f24d' },
  { value: 'non_tunai', label: '🏦 Non-Tunai (Transfer/QRIS)', color: '#57e0a8' },
];

const TODAY = getTodayDateString();
const GREETING = (() => {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
})();

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function FinancePortalPage() {
  // Auth gate – simple localStorage PIN
  const [pinVerified, setPinVerified] = React.useState(false);
  const [pinInput, setPinInput] = React.useState('');
  const [pinError, setPinError] = React.useState(false);

  // Data
  const [metrics, setMetrics] = React.useState({
    saldoAktif: 0, saldoTunai: 0, saldoNonTunai: 0,
    totalPiutang: 0, totalHutang: 0,
  });
  const [recentTx, setRecentTx] = React.useState<KasTransaksi[]>([]);
  const [kategoriList, setKategoriList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  // PWA install
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = React.useState(false);

  // Add transaction panel
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

  // Tab
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'riwayat'>('dashboard');

  // ── Effects ──
  React.useEffect(() => {
    const saved = localStorage.getItem('amanah_finance_pin_ok');
    if (saved === 'true') setPinVerified(true);
  }, []);

  React.useEffect(() => {
    if (!pinVerified) return;
    loadData();
  }, [pinVerified]);

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
    // Set default kategori from list
    if (kList.length > 0) {
      setFormData((prev) => ({ ...prev, kategori: kList[0].nama_kategori }));
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    showToast('Data diperbarui!');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── PIN Gate ──
  const FINANCE_PIN = process.env.NEXT_PUBLIC_FINANCE_PIN || '2024';

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === FINANCE_PIN) {
      setPinVerified(true);
      localStorage.setItem('amanah_finance_pin_ok', 'true');
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  // ── Form Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keterangan || formData.nominal <= 0) {
      showToast('Lengkapi semua field!');
      return;
    }
    setSubmitting(true);
    const res = await addKasTransaksi({
      ...formData,
      pic_nama: formData.pic_tipe === 'finance' ? 'Finance (Lia)' : formData.pic_nama,
    });
    setSubmitting(false);
    if (res.success) {
      showToast(formData.tipe === 'pemasukan' ? '✅ Pemasukan berhasil dicatat!' : '✅ Pengeluaran berhasil dicatat!');
      setFormData((prev) => ({ ...prev, keterangan: '', nominal: 0 }));
      setShowAddForm(false);
      await loadData();
    } else {
      showToast('❌ Gagal: ' + res.error);
    }
  };

  // ── PWA Install ──
  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      alert('Buka menu browser → "Tambah ke Layar Utama" / "Add to Home Screen"');
    }
    setShowInstallBanner(false);
    sessionStorage.setItem('fin_pwa_dismissed', 'true');
  };

  // ── Computed for chart ──
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
  // RENDER: PIN Gate
  // ────────────────────────────────────────
  if (!pinVerified) {
    return (
      <div className="fin-root min-h-screen flex items-center justify-center p-4">
        <div className="fin-card max-w-xs w-full p-8 space-y-6 text-center">
          {/* Logo */}
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c3f24d22, #57e0a822)', border: '1.5px solid #c3f24d44' }}>
            <Wallet className="w-7 h-7" style={{ color: '#c3f24d' }} />
          </div>
          <div>
            <h1 className="fin-display text-lg font-bold" style={{ color: '#f2f6ff' }}>Finance Portal</h1>
            <p className="fin-label text-xs mt-1" style={{ color: '#8fa0bf' }}>Amanah Drive — Akses Terbatas</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <label className="fin-label text-xs mb-2 block" style={{ color: '#8fa0bf' }}>Masukkan PIN Finance</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
                placeholder="••••"
                className="fin-input w-full text-center text-2xl tracking-widest font-bold py-3"
                style={{ color: '#f2f6ff', letterSpacing: '0.3em' }}
                autoFocus
              />
              {pinError && (
                <p className="text-xs mt-1.5 flex items-center justify-center gap-1" style={{ color: '#ff7a7a' }}>
                  <AlertCircle className="w-3.5 h-3.5" /> PIN salah, coba lagi
                </p>
              )}
            </div>
            <button type="submit" className="fin-btn-primary w-full py-3 text-sm font-bold">
              Masuk
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────
  // RENDER: Main Portal
  // ────────────────────────────────────────
  return (
    <div className="fin-root min-h-screen pb-28">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg fin-toast">
          <Check className="w-4 h-4" />{toast}
        </div>
      )}

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto fin-card p-4 space-y-3 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#c3f24d22', border: '1px solid #c3f24d44' }}>
              <Download className="w-4 h-4" style={{ color: '#c3f24d' }} />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: '#f2f6ff' }}>Install Aplikasi Finance</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#8fa0bf' }}>Akses cepat dari layar utama HP Anda</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1" style={{ borderTop: '1px solid #ffffff10' }}>
            <button onClick={() => { setShowInstallBanner(false); sessionStorage.setItem('fin_pwa_dismissed', 'true'); }}
              className="px-3 py-1.5 text-xs font-semibold" style={{ color: '#8fa0bf' }}>
              Nanti
            </button>
            <button onClick={handleInstall} className="fin-btn-primary px-4 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Install
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="px-4 pt-6 pb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold" style={{ color: '#8fa0bf' }}>{GREETING}, Finance Team</p>
            <h1 className="fin-display font-bold text-base mt-0.5" style={{ color: '#f2f6ff' }}>Amanah Drive Finance</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} disabled={isRefreshing}
              className="fin-icon-btn" title="Refresh data">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} style={{ color: '#57e0a8' }} />
            </button>
            <button onClick={() => { localStorage.removeItem('amanah_finance_pin_ok'); setPinVerified(false); setPinInput(''); }}
              className="fin-icon-btn" title="Logout">
              <X className="w-4 h-4" style={{ color: '#8fa0bf' }} />
            </button>
          </div>
        </div>
        <p className="text-xs" style={{ color: '#8fa0bf' }}>
          <Clock className="w-3 h-3 inline mr-1" />{formatDateLongIndo(TODAY)}
        </p>
      </header>

      {/* ── BALANCE HERO CARD ── */}
      <div className="px-4 mb-4">
        <div className="fin-balance-hero rounded-[26px] p-6 relative overflow-hidden">
          {/* Blurred glow orbs */}
          <div className="fin-glow-mint" />
          <div className="fin-glow-lime" />

          <p className="text-xs font-semibold mb-1 relative z-10" style={{ color: '#57e0a8aa' }}>Total Saldo Aktif</p>
          <p className="fin-display font-bold text-3xl relative z-10" style={{ color: '#f2f6ff', fontVariantNumeric: 'tabular-nums' }}>
            {loading ? '...' : formatRupiah(metrics.saldoAktif)}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 relative z-10">
            <div className="fin-sub-stat rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote className="w-3.5 h-3.5" style={{ color: '#c3f24d' }} />
                <span className="text-[10px] font-semibold" style={{ color: '#8fa0bf' }}>Tunai</span>
              </div>
              <p className="fin-display font-bold text-sm" style={{ color: metrics.saldoTunai >= 0 ? '#57e0a8' : '#ff7a7a', fontVariantNumeric: 'tabular-nums' }}>
                {loading ? '...' : formatRupiah(metrics.saldoTunai)}
              </p>
            </div>
            <div className="fin-sub-stat rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <CreditCard className="w-3.5 h-3.5" style={{ color: '#57e0a8' }} />
                <span className="text-[10px] font-semibold" style={{ color: '#8fa0bf' }}>Non-Tunai</span>
              </div>
              <p className="fin-display font-bold text-sm" style={{ color: metrics.saldoNonTunai >= 0 ? '#57e0a8' : '#ff7a7a', fontVariantNumeric: 'tabular-nums' }}>
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
            <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#ff7a7a' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#8fa0bf' }}>Piutang Siswa</span>
          </div>
          <p className="fin-display font-bold text-sm" style={{ color: '#ff7a7a', fontVariantNumeric: 'tabular-nums' }}>
            {loading ? '...' : formatRupiah(metrics.totalPiutang)}
          </p>
          <p className="text-[10px]" style={{ color: '#8fa0bf' }}>Belum lunas</p>
        </div>
        <div className="fin-card rounded-2xl p-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5" style={{ color: '#ff7a7a' }} />
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#8fa0bf' }}>Hutang Aktif</span>
          </div>
          <p className="fin-display font-bold text-sm" style={{ color: '#ff7a7a', fontVariantNumeric: 'tabular-nums' }}>
            {loading ? '...' : formatRupiah(metrics.totalHutang)}
          </p>
          <p className="text-[10px]" style={{ color: '#8fa0bf' }}>Cicilan berjalan</p>
        </div>
      </div>

      {/* ── TAB NAV ── */}
      <div className="px-4 mb-4">
        <div className="flex rounded-xl p-1" style={{ background: '#17233c', border: '1px solid #ffffff0f' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'riwayat', label: 'Riwayat', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: activeTab === tab.id ? '#c3f24d' : 'transparent',
                color: activeTab === tab.id ? '#0e1626' : '#8fa0bf',
              }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB: DASHBOARD ── */}
      {activeTab === 'dashboard' && (
        <div className="px-4 space-y-4">
          {/* 7-day bar chart */}
          <div className="fin-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold" style={{ color: '#f2f6ff' }}>7 Hari Terakhir</h3>
              <div className="flex items-center gap-3 text-[10px]" style={{ color: '#8fa0bf' }}>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#57e0a8' }}></span>Masuk</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#ff7a7a' }}></span>Keluar</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-1 h-28">
              {last7Days.map((day, i) => {
                const isToday = day.date === TODAY;
                const masukH = Math.max((day.masuk / maxBar) * 100, 2);
                const keluarH = Math.max((day.keluar / maxBar) * 100, 2);
                const d = new Date(day.date);
                const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center gap-0.5" style={{ height: '88px' }}>
                      <div className="w-[45%] rounded-t transition-all"
                        style={{ height: `${masukH}%`, background: isToday ? '#c3f24d' : '#57e0a844', minHeight: 2 }} />
                      <div className="w-[45%] rounded-t transition-all"
                        style={{ height: `${keluarH}%`, background: '#ff7a7a44', minHeight: 2 }} />
                    </div>
                    <span className="text-[9px] font-semibold" style={{ color: isToday ? '#c3f24d' : '#8fa0bf' }}>{dayLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Today's transactions */}
          <div className="fin-card rounded-2xl p-4">
            <h3 className="text-xs font-bold mb-3" style={{ color: '#f2f6ff' }}>Transaksi Hari Ini</h3>
            {(() => {
              const todayTx = recentTx.filter((t) => t.tanggal === TODAY);
              if (loading) return <div className="h-16 fin-skeleton rounded-lg" />;
              if (todayTx.length === 0) return (
                <p className="text-xs text-center py-4" style={{ color: '#8fa0bf' }}>Belum ada transaksi hari ini</p>
              );
              return (
                <div className="space-y-2">
                  {todayTx.map((tx) => (
                    <div key={tx.id} className="fin-tx-row flex items-center gap-3 p-3 rounded-xl">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: tx.tipe === 'pemasukan' ? '#57e0a822' : '#ff7a7a22' }}>
                        {tx.tipe === 'pemasukan'
                          ? <TrendingUp className="w-4 h-4" style={{ color: '#57e0a8' }} />
                          : <TrendingDown className="w-4 h-4" style={{ color: '#ff7a7a' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: '#f2f6ff' }}>{tx.keterangan}</p>
                        <p className="text-[10px]" style={{ color: '#8fa0bf' }}>
                          {tx.kategori.replace(/_/g, ' ')} • {(tx.jenis_pembayaran || 'tunai') === 'tunai' ? '💵' : '🏦'} {(tx.jenis_pembayaran || 'tunai') === 'tunai' ? 'Tunai' : 'Non-Tunai'}
                        </p>
                      </div>
                      <span className="fin-display text-xs font-bold tabular-nums shrink-0"
                        style={{ color: tx.tipe === 'pemasukan' ? '#57e0a8' : '#ff7a7a' }}>
                        {tx.tipe === 'pemasukan' ? '+' : '−'}{fmt(tx.nominal)}
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
          <p className="text-xs font-semibold mb-2" style={{ color: '#8fa0bf' }}>30 Transaksi Terbaru</p>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 fin-skeleton rounded-xl" />)}
            </div>
          ) : recentTx.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: '#8fa0bf' }}>Belum ada transaksi</p>
          ) : (
            <div className="space-y-2">
              {recentTx.map((tx) => (
                <div key={tx.id} className="fin-tx-row flex items-center gap-3 p-3 rounded-xl fin-card">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: tx.tipe === 'pemasukan' ? '#57e0a822' : '#ff7a7a22' }}>
                    {tx.tipe === 'pemasukan'
                      ? <TrendingUp className="w-4 h-4" style={{ color: '#57e0a8' }} />
                      : <TrendingDown className="w-4 h-4" style={{ color: '#ff7a7a' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: '#f2f6ff' }}>{tx.keterangan}</p>
                    <p className="text-[10px]" style={{ color: '#8fa0bf' }}>
                      {formatDateIndo(tx.tanggal)} • {tx.kategori.replace(/_/g, ' ')} •{' '}
                      {(tx.jenis_pembayaran || 'tunai') === 'tunai' ? '💵 Tunai' : '🏦 Non-Tunai'}
                    </p>
                  </div>
                  <span className="fin-display text-xs font-bold tabular-nums shrink-0"
                    style={{ color: tx.tipe === 'pemasukan' ? '#57e0a8' : '#ff7a7a' }}>
                    {tx.tipe === 'pemasukan' ? '+' : '−'}{fmt(tx.nominal)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FAB: Add Transaction ── */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-6 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40 transition-transform active:scale-95"
        style={{ background: '#c3f24d', boxShadow: '0 8px 32px #c3f24d55' }}
        title="Catat Transaksi Baru"
      >
        <Plus className="w-6 h-6" style={{ color: '#0e1626' }} />
      </button>

      {/* ── ADD TRANSACTION BOTTOM SHEET ── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-lg fin-sheet rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: '#ffffff20' }} />

            <div className="flex items-center justify-between">
              <h3 className="fin-display font-bold text-base" style={{ color: '#f2f6ff' }}>Catat Transaksi</h3>
              <button onClick={() => setShowAddForm(false)} className="fin-icon-btn">
                <X className="w-4 h-4" style={{ color: '#8fa0bf' }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipe Toggle */}
              <div className="flex rounded-xl p-1" style={{ background: '#17233c', border: '1px solid #ffffff0f' }}>
                <button type="button"
                  onClick={() => setFormData({ ...formData, tipe: 'pengeluaran' })}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: formData.tipe === 'pengeluaran' ? '#ff7a7a' : 'transparent',
                    color: formData.tipe === 'pengeluaran' ? '#0e1626' : '#8fa0bf',
                  }}
                >
                  − Pengeluaran
                </button>
                <button type="button"
                  onClick={() => setFormData({ ...formData, tipe: 'pemasukan' })}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: formData.tipe === 'pemasukan' ? '#57e0a8' : 'transparent',
                    color: formData.tipe === 'pemasukan' ? '#0e1626' : '#8fa0bf',
                  }}
                >
                  + Pemasukan
                </button>
              </div>

              {/* Jenis Pembayaran */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#8fa0bf' }}>Jenis Pembayaran</label>
                <div className="flex rounded-xl p-1" style={{ background: '#17233c', border: '1px solid #ffffff0f' }}>
                  {JENIS_PEMBAYARAN_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setFormData({ ...formData, jenis_pembayaran: opt.value as any })}
                      className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: formData.jenis_pembayaran === opt.value ? opt.color : 'transparent',
                        color: formData.jenis_pembayaran === opt.value ? '#0e1626' : '#8fa0bf',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#8fa0bf' }}>Nominal (Rp)</label>
                <div className="fin-input-wrap">
                  <CurrencyInput
                    label=""
                    value={formData.nominal}
                    onChange={(val) => setFormData({ ...formData, nominal: val })}
                  />
                </div>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#8fa0bf' }}>Tanggal</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="fin-input w-full"
                  style={{ color: '#f2f6ff' }}
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#8fa0bf' }}>Kategori</label>
                <div className="relative">
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                    className="fin-input w-full appearance-none pr-8"
                    style={{ color: '#f2f6ff' }}
                  >
                    {kategoriList.map((k) => (
                      <option key={k.id} value={k.nama_kategori} style={{ background: '#17233c' }}>
                        {k.nama_kategori.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#8fa0bf' }} />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#8fa0bf' }}>Keterangan *</label>
                <input
                  type="text"
                  required
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Misal: Pembelian BBM Avanza"
                  className="fin-input w-full"
                  style={{ color: '#f2f6ff' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: formData.tipe === 'pemasukan' ? '#57e0a8' : '#c3f24d',
                  color: '#0e1626',
                }}
              >
                {submitting ? 'Menyimpan...' : formData.tipe === 'pemasukan' ? '+ Simpan Pemasukan' : '− Simpan Pengeluaran'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── FINANCE CSS ── */}
      <style>{`
        .fin-root {
          background: #0a1120;
          font-family: 'Inter', -apple-system, sans-serif;
        }
        .fin-display {
          font-family: var(--font-space-grotesk), 'Inter', sans-serif;
          font-variant-numeric: tabular-nums;
        }
        .fin-label {
          font-family: 'Inter', -apple-system, sans-serif;
        }
        .fin-card {
          background: #17233c;
          border: 1px solid #ffffff0f;
          padding: 1rem;
        }
        .fin-balance-hero {
          background: linear-gradient(135deg, #1c3a2f, #16324a, #14213b);
          border: 1px solid #ffffff12;
          position: relative;
          overflow: hidden;
        }
        .fin-glow-mint {
          position: absolute;
          top: -40px;
          right: -20px;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          background: radial-gradient(circle, #57e0a840 0%, transparent 70%);
          pointer-events: none;
        }
        .fin-glow-lime {
          position: absolute;
          bottom: -30px;
          left: 30px;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle, #c3f24d30 0%, transparent 70%);
          pointer-events: none;
        }
        .fin-sub-stat {
          background: #ffffff08;
          border: 1px solid #ffffff10;
        }
        .fin-icon-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #ffffff10;
          background: #17233c;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .fin-icon-btn:hover { background: #1d2c49; }
        .fin-btn-primary {
          background: #c3f24d;
          color: #0e1626;
          border: none;
          border-radius: 12px;
          font-weight: 700;
          transition: all 0.15s;
        }
        .fin-btn-primary:hover { background: #d4f770; }
        .fin-input {
          background: #17233c;
          border: 1px solid #ffffff14;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          outline: none;
          width: 100%;
          transition: border-color 0.15s;
          color: #f2f6ff;
        }
        .fin-input:focus { border-color: #57e0a8; }
        .fin-input::placeholder { color: #8fa0bf; }
        .fin-sheet {
          background: #0e1626;
          border: 1px solid #ffffff10;
        }
        .fin-tx-row {
          background: #17233c;
          border: 1px solid #ffffff07;
          transition: background 0.15s;
        }
        .fin-toast {
          background: #57e0a8;
          color: #0e1626;
        }
        .fin-skeleton {
          background: linear-gradient(90deg, #17233c 25%, #1d2c49 50%, #17233c 75%);
          background-size: 200% 100%;
          animation: fin-shimmer 1.5s infinite;
        }
        @keyframes fin-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .fin-input-wrap label { display: none !important; }
      `}</style>
    </div>
  );
}
