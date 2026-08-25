'use client';

import React from 'react';
import { KasTransaksi, Siswa, Paket } from '@/types/database';
import {
  getKasOverviewMetrics,
  getKasTransaksiList,
  addKasTransaksi,
  getKasKategoriList,
  getDpKustomList,
  DpKustomItem,
} from '@/lib/actions/kas';
import { getSiswaList } from '@/lib/actions/siswa';
import { getPaketList } from '@/lib/actions/master-data';
import { verifyKasPin } from '@/lib/actions/kas-pin';
import { formatRupiah } from '@/lib/utils/currency';
import { getTodayDateString, formatDateIndo, formatDateLongIndo } from '@/lib/utils/date';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { PwaInstallModal } from '@/components/shared/PwaInstallModal';
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
  User,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Star,
} from 'lucide-react';

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}Jt`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}Rb`;
  return String(n);
}

const JENIS_PEMBAYARAN_OPTIONS = [
  { value: 'tunai', label: 'Tunai (Cash)' },
  { value: 'non_tunai', label: 'Non-Tunai' },
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
  // PIN Auth Gate
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
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [dpKustomList, setDpKustomList] = React.useState<DpKustomItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  // Custom DP States
  const [customNama, setCustomNama] = React.useState('');
  const [customPaketId, setCustomPaketId] = React.useState('');
  const [customHargaPaket, setCustomHargaPaket] = React.useState(0);
  const [customDpNominal, setCustomDpNominal] = React.useState(0);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallModal, setShowInstallModal] = React.useState(false);
  const [showPwaBanner, setShowPwaBanner] = React.useState(false);

  // Add Transaction Bottom Sheet
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [formData, setFormData] = React.useState({
    tanggal: TODAY,
    tipe: 'pengeluaran' as 'pemasukan' | 'pengeluaran',
    kategori: 'operasional',
    keterangan: '',
    nominal: 0,
    jenis_pembayaran: 'tunai' as 'tunai' | 'non_tunai',
    pic_tipe: 'finance' as 'admin' | 'finance',
    pic_nama: 'Lia (Finance)',
    siswa_id: '',
    sumber_otomatis: false,
  });
  const [submitting, setSubmitting] = React.useState(false);

  // Tab State
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'riwayat'>('dashboard');

  // Check PIN session on mount (8-hour session)
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

  // PWA beforeinstallprompt Listener
  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('fin_pwa_dismissed')) {
        setShowPwaBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

    if (!isStandalone && !sessionStorage.getItem('fin_pwa_dismissed')) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        setShowPwaBanner(true);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Load Data
  const loadData = async () => {
    setLoading(true);
    const [m, txList, kList, sList, pList, dpKList] = await Promise.all([
      getKasOverviewMetrics(),
      getKasTransaksiList(),
      getKasKategoriList(),
      getSiswaList(),
      getPaketList(),
      getDpKustomList(),
    ]);
    setMetrics(m as any);
    setRecentTx(txList.slice(0, 30));
    setKategoriList(kList);
    setSiswaList(sList);
    setPaketList(pList);
    setDpKustomList(dpKList);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    showToast('Data kas berhasil diperbarui');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Type, Category, and Student Handlers
  const handleTipeChange = (newTipe: 'pemasukan' | 'pengeluaran') => {
    const defaultKategori = newTipe === 'pemasukan' ? 'dp_siswa' : 'operasional';
    setFormData((prev) => ({
      ...prev,
      tipe: newTipe,
      kategori: defaultKategori,
      siswa_id: '',
      keterangan: '',
      nominal: 0,
    }));
    setCustomNama('');
    setCustomPaketId('');
    setCustomHargaPaket(0);
    setCustomDpNominal(0);
  };

  const handleKategoriChange = (newKategori: string) => {
    setFormData((prev) => ({
      ...prev,
      kategori: newKategori,
      siswa_id: '',
      keterangan: '',
      nominal: 0,
    }));
    setCustomNama('');
    setCustomPaketId('');
    setCustomHargaPaket(0);
    setCustomDpNominal(0);
  };

  const handleCustomPaketChange = (paketId: string) => {
    const p = paketList.find((item) => item.id === paketId);
    const price = p ? (p.harga_promo || p.harga_normal) : 2000000;
    const suggestedDp = Math.round(price * 0.5);
    setCustomPaketId(paketId);
    setCustomHargaPaket(price);
    setCustomDpNominal(suggestedDp);
    setFormData((prev) => ({
      ...prev,
      nominal: suggestedDp,
      keterangan: `DP Kustom - ${customNama || 'Customer'} | Paket: ${p?.nama_paket || 'Paket Kursus'} | Total: ${formatRupiah(price)}`,
    }));
  };

  const handleCustomNamaChange = (nama: string) => {
    setCustomNama(nama);
    const p = paketList.find((item) => item.id === customPaketId) || paketList[0];
    const price = customHargaPaket || (p ? (p.harga_promo || p.harga_normal) : 2000000);
    setFormData((prev) => ({
      ...prev,
      keterangan: `DP Kustom - ${nama || 'Customer'} | Paket: ${p?.nama_paket || 'Paket Kursus'} | Total: ${formatRupiah(price)}`,
    }));
  };

  const handleCustomDpNominalChange = (nominal: number) => {
    setCustomDpNominal(nominal);
    setFormData((prev) => ({
      ...prev,
      nominal,
    }));
  };

  const handleSiswaChange = (siswaId: string) => {
    // 1. Kasus DP Kustom
    if (siswaId === 'custom_dp') {
      const defaultPaket = paketList[0];
      const defaultPrice = defaultPaket ? (defaultPaket.harga_promo || defaultPaket.harga_normal) : 2000000;
      const defaultDp = Math.round(defaultPrice * 0.5);

      setCustomPaketId(defaultPaket?.id || '');
      setCustomHargaPaket(defaultPrice);
      setCustomDpNominal(defaultDp);

      setFormData((prev) => ({
        ...prev,
        siswa_id: 'custom_dp',
        keterangan: `DP Kustom - ${customNama || 'Customer'} | Paket: ${defaultPaket?.nama_paket || 'Paket Kursus'} | Total: ${formatRupiah(defaultPrice)}`,
        nominal: defaultDp,
      }));
      return;
    }

    // 2. Kasus Pelunasan DP Kustom (Memilih DP Kustom yang belum lunas)
    if (siswaId.startsWith('dp_kustom_')) {
      const dpId = siswaId.replace('dp_kustom_', '');
      const dpItem = dpKustomList.find((item) => item.id === dpId);
      if (dpItem) {
        setFormData((prev) => ({
          ...prev,
          siswa_id: siswaId,
          keterangan: `Pelunasan DP Kustom - ${dpItem.nama} | Paket: ${dpItem.namaPaket} | Sisa: ${formatRupiah(dpItem.sisaTagihan)} [Ref: ${dpItem.id}]`,
          nominal: dpItem.sisaTagihan,
        }));
      }
      return;
    }

    // 3. Kasus Siswa Terdaftar Reguler
    const s = siswaList.find((item) => item.id === siswaId);
    if (!s) {
      setFormData((prev) => ({ ...prev, siswa_id: '', keterangan: '', nominal: 0 }));
      return;
    }

    if (formData.kategori === 'dp_siswa') {
      const suggestedDp = Math.round(s.harga_final * 0.5);
      setFormData((prev) => ({
        ...prev,
        siswa_id: siswaId,
        keterangan: `Pembayaran DP Kursus - ${s.nama} (${s.kode_siswa})`,
        nominal: suggestedDp,
      }));
    } else if (formData.kategori === 'pelunasan_siswa') {
      const sisaTagihan = Math.max(0, s.harga_final - (s.dp_nominal || 0));
      setFormData((prev) => ({
        ...prev,
        siswa_id: siswaId,
        keterangan: `Pelunasan Kursus - ${s.nama} (${s.kode_siswa})`,
        nominal: sisaTagihan,
      }));
    } else if (formData.kategori === 'refund_siswa') {
      const totalBayar = s.status_pembayaran_kode === 'lunas' ? s.harga_final : (s.dp_nominal || 0);
      setFormData((prev) => ({
        ...prev,
        siswa_id: siswaId,
        keterangan: `Refund Pembatalan Kursus - ${s.nama} (${s.kode_siswa})`,
        nominal: totalBayar,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        siswa_id: siswaId,
      }));
    }
  };

  const isDpCategory = formData.kategori === 'dp_siswa';
  const isPelunasanCategory = formData.kategori === 'pelunasan_siswa';
  const isRefundCategory = formData.kategori === 'refund_siswa';
  const isStudentRelated = isDpCategory || isPelunasanCategory || isRefundCategory;

  const filteredSiswaDropdown = React.useMemo(() => {
    if (isDpCategory) {
      return siswaList.filter((s) => s.status_pembayaran_kode === 'belum_bayar');
    }
    if (isPelunasanCategory) {
      return siswaList.filter((s) => s.status_pembayaran_kode === 'dp');
    }
    if (isRefundCategory) {
      return siswaList.filter(
        (s) => s.status_pembayaran_kode === 'dp' || s.status_pembayaran_kode === 'lunas'
      );
    }
    return [];
  }, [siswaList, isDpCategory, isPelunasanCategory, isRefundCategory]);

  const isCustomDpSelected = formData.siswa_id === 'custom_dp';
  const selectedDpKustom = formData.siswa_id.startsWith('dp_kustom_')
    ? dpKustomList.find((dp) => dp.id === formData.siswa_id.replace('dp_kustom_', ''))
    : null;
  const unsettledDpKustom = React.useMemo(() => dpKustomList.filter((dp) => !dp.isLunas), [dpKustomList]);

  const selectedSiswa = !isCustomDpSelected && !selectedDpKustom
    ? siswaList.find((s) => s.id === formData.siswa_id)
    : null;

  // Available categories for selected type
  const availableKategoriList = React.useMemo(() => {
    return kategoriList.filter((k) => {
      if (formData.tipe === 'pemasukan') {
        return k.tipe === 'pemasukan' || k.tipe === 'keduanya';
      }
      return k.tipe === 'pengeluaran' || k.tipe === 'keduanya';
    });
  }, [kategoriList, formData.tipe]);

  // PIN Verification
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 6) {
      setPinError('PIN harus 6 digit');
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
      setPinError(res.error || 'PIN Salah');
      setPinInput('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('amanah_finance_pin_ok');
    localStorage.removeItem('amanah_finance_pin_time');
    setPinVerified(false);
    setPinInput('');
  };

  // Submit Transaction
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keterangan || formData.nominal <= 0) {
      showToast('Lengkapi nominal & keterangan');
      return;
    }
    setSubmitting(true);
    const isCustom = formData.siswa_id === 'custom_dp' || formData.siswa_id.startsWith('dp_kustom_');
    const finalSiswaId = isCustom ? null : (formData.siswa_id || null);

    const res = await addKasTransaksi({
      tanggal: formData.tanggal,
      tipe: formData.tipe,
      kategori: formData.kategori,
      keterangan: formData.keterangan,
      nominal: formData.nominal,
      jenis_pembayaran: formData.jenis_pembayaran,
      pic_tipe: 'finance',
      pic_nama: 'Lia (Finance)',
      siswa_id: finalSiswaId,
      sumber_otomatis: false,
    });
    setSubmitting(false);
    if (res.success) {
      showToast(formData.tipe === 'pemasukan' ? 'Pemasukan tersimpan' : 'Pengeluaran tersimpan');
      setFormData((prev) => ({
        ...prev,
        keterangan: '',
        nominal: 0,
        siswa_id: '',
      }));
      setCustomNama('');
      setCustomPaketId('');
      setCustomHargaPaket(0);
      setCustomDpNominal(0);
      setShowAddForm(false);
      await loadData();
    } else {
      showToast('Gagal: ' + res.error);
    }
  };

  // 7-day Bar Chart Data
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
  // RENDER: PIN Gate Screen
  // ────────────────────────────────────────
  if (!pinVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-subtle)] text-[var(--text-primary)]">
        <div className="card-container max-w-sm w-full p-8 rounded-3xl space-y-6 text-center shadow-xl border border-[var(--border)]">
          <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Portal Finance</h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Amanah Drive Palembang</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
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
                  className="w-full text-center text-2xl tracking-[0.3em] font-bold tabular-num py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                  autoFocus
                />
                <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-50" />
              </div>

              {pinError && (
                <p className="text-xs mt-2 font-medium flex items-center justify-center gap-1 text-[var(--danger)]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={pinLoading || pinInput.length !== 6}
              className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-sm font-bold flex items-center justify-center gap-2 rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{pinLoading ? 'Memverifikasi...' : 'Buka Akses Finance'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────
  // RENDER: Main Finance Portal
  // ────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 pb-28 min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* PWA Install Modal (iOS + Android) */}
      <PwaInstallModal
        appName="Portal Finance — Amanah Drive"
        appDescription="Pencatatan kas dan monitoring saldo realtime"
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onInstalled={() => showToast('Aplikasi finance berhasil dipasang!')}
      />

      {/* PWA Bottom Banner */}
      {showPwaBanner && (
        <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--brand-primary)] flex items-center justify-between gap-3 shadow-sm animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">Pasang Aplikasi Finance</p>
              <p className="text-[10px] text-[var(--text-secondary)]">Akses cepat di layar utama HP</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setShowPwaBanner(false);
                sessionStorage.setItem('fin_pwa_dismissed', 'true');
              }}
              className="p-1.5 text-xs text-[var(--text-secondary)]"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowInstallModal(true)}
              className="px-3 py-1.5 text-xs font-bold bg-[var(--brand-primary)] text-white rounded-xl hover:bg-[var(--brand-primary-dark)]"
            >
              Pasang
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)]">{GREETING}, Tim Finance</p>
            <h1 className="text-sm font-extrabold text-[var(--brand-primary)] mt-0.5">Portal Kas & Keuangan</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)]"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[var(--brand-primary)]' : ''}`} />
            </button>

            {/* LIGHT / DARK THEME TOGGLE */}
            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-rose-600 hover:border-rose-300"
              title="Kunci / Keluar"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
          <span>{formatDateLongIndo(TODAY)}</span>
        </p>
      </header>

      {/* ── BALANCE HERO CARD ── */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-[#0F7A73] via-[#0c4a45] to-[#0B2545] text-white shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-1 text-xs font-bold uppercase tracking-wider text-emerald-100 opacity-90">
          <span>Total Saldo Kas Aktif</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 text-white font-semibold">Real-Time</span>
        </div>

        <p className="text-3xl font-extrabold tracking-tight tabular-nums mt-1">
          {loading ? '...' : formatRupiah(metrics.saldoAktif)}
        </p>

        {/* Breakdown Tunai & Non-Tunai */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-black/25 border border-white/10">
            <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-emerald-200">
              <Banknote className="w-4 h-4 text-emerald-300" />
              <span>Kas Tunai</span>
            </div>
            <p className="text-sm font-extrabold tabular-nums">
              {loading ? '...' : formatRupiah(metrics.saldoTunai)}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 border border-white/10">
            <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-blue-200">
              <CreditCard className="w-4 h-4 text-blue-300" />
              <span>Non-Tunai</span>
            </div>
            <p className="text-sm font-extrabold tabular-nums">
              {loading ? '...' : formatRupiah(metrics.saldoNonTunai)}
            </p>
          </div>
        </div>
      </div>

      {/* ── QUICK METRIC CHIPS ── */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="card-container p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-600 font-bold uppercase tracking-wider text-[10px]">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Piutang Siswa</span>
          </div>
          <p className="text-sm font-bold text-amber-600 tabular-nums">
            {loading ? '...' : formatRupiah(metrics.totalPiutang)}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)]">Belum lunas</p>
        </div>

        <div className="card-container p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-rose-600 font-bold uppercase tracking-wider text-[10px]">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Sisa Hutang</span>
          </div>
          <p className="text-sm font-bold text-rose-600 tabular-nums">
            {loading ? '...' : formatRupiah(metrics.totalHutang)}
          </p>
          <p className="text-[10px] text-[var(--text-secondary)]">Cicilan berjalan</p>
        </div>
      </div>

      {/* ── TAB NAV ── */}
      <div className="flex rounded-2xl p-1 bg-[var(--bg-subtle)] border border-[var(--border)]">
        {[
          { id: 'dashboard', label: 'Ringkasan & Grafik', icon: BarChart3 },
          { id: 'riwayat', label: 'Riwayat Transaksi', icon: Clock },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB: DASHBOARD ── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* 7-day Bar Chart */}
          <div className="card-container p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--text-primary)]">Arus Kas 7 Hari Terakhir</h3>
              <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Masuk
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
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
                        className="w-[45%] rounded-t-md transition-all bg-emerald-500/80"
                        style={{ height: `${masukH}%`, minHeight: 3 }}
                      />
                      <div
                        className="w-[45%] rounded-t-md transition-all bg-rose-500/80"
                        style={{ height: `${keluarH}%`, minHeight: 3 }}
                      />
                    </div>
                    <span
                      className={`text-[9.5px] font-bold ${
                        isToday ? 'text-[var(--brand-primary)]' : 'text-[var(--text-secondary)]'
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
          <div className="card-container p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Transaksi Hari Ini</span>
              </h3>
              <span className="text-[10px] text-[var(--text-secondary)] font-semibold">
                {recentTx.filter((t) => t.tanggal === TODAY).length} data
              </span>
            </div>

            {(() => {
              const todayTx = recentTx.filter((t) => t.tanggal === TODAY);
              if (loading) return <div className="h-16 animate-pulse bg-black/5 dark:bg-white/5 rounded-xl" />;
              if (todayTx.length === 0) {
                return <p className="text-xs text-center py-5 text-[var(--text-secondary)]">Tidak ada transaksi hari ini.</p>;
              }
              return (
                <div className="space-y-2">
                  {todayTx.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            tx.tipe === 'pemasukan' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                          }`}
                        >
                          {tx.tipe === 'pemasukan' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{tx.keterangan}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">
                            {tx.kategori.replace(/_/g, ' ').toUpperCase()} •{' '}
                            <span className="font-semibold">
                              {(tx.jenis_pembayaran || 'tunai') === 'tunai' ? 'Tunai' : 'Non-Tunai'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-extrabold tabular-nums shrink-0 ml-2 ${
                          tx.tipe === 'pemasukan' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                        }`}
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
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">30 Transaksi Terbaru</p>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse bg-black/5 dark:bg-white/5 rounded-xl" />
              ))}
            </div>
          ) : recentTx.length === 0 ? (
            <div className="card-container p-8 text-center text-xs text-[var(--text-secondary)]">
              Belum ada riwayat transaksi.
            </div>
          ) : (
            <div className="space-y-2">
              {recentTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.tipe === 'pemasukan' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                      }`}
                    >
                      {tx.tipe === 'pemasukan' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{tx.keterangan}</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">
                        {formatDateIndo(tx.tanggal)} • {tx.kategori.replace(/_/g, ' ').toUpperCase()} •{' '}
                        <span className="font-semibold">
                          {(tx.jenis_pembayaran || 'tunai') === 'tunai' ? 'Tunai' : 'Non-Tunai'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-extrabold tabular-nums shrink-0 ml-2 ${
                      tx.tipe === 'pemasukan' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                    }`}
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
        className="fixed bottom-6 right-4 w-14 h-14 rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white flex items-center justify-center z-40 transition-transform active:scale-95 shadow-xl"
        title="Catat Transaksi"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* ── ADD TRANSACTION BOTTOM SHEET ── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative w-full max-w-lg bg-[var(--bg-elevated)] border-t border-[var(--border)] rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-6 text-xs">
            <div className="w-12 h-1 rounded-full mx-auto mb-2 bg-[var(--border-strong)]" />

            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Catat Transaksi Kas</span>
              </h3>
              <button onClick={() => setShowAddForm(false)} className="p-1 rounded text-[var(--text-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipe */}
              <div>
                <label className="block font-semibold mb-1.5 text-[var(--text-secondary)]">Tipe Transaksi *</label>
                <div className="flex rounded-xl p-1 bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => handleTipeChange('pengeluaran')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      formData.tipe === 'pengeluaran' ? 'bg-rose-600 text-white shadow-sm' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    − Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTipeChange('pemasukan')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      formData.tipe === 'pemasukan' ? 'bg-emerald-600 text-white shadow-sm' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    + Pemasukan
                  </button>
                </div>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block font-semibold mb-1.5 text-[var(--text-secondary)]">Tanggal Transaksi *</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs"
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block font-semibold mb-1.5 text-[var(--text-secondary)]">Kategori Kas *</label>
                <div className="relative">
                  <select
                    value={formData.kategori}
                    onChange={(e) => handleKategoriChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs appearance-none pr-8 font-semibold"
                  >
                    {availableKategoriList.map((k) => (
                      <option key={k.id} value={k.nama_kategori}>
                        {k.nama_kategori === 'dp_siswa'
                          ? 'DP SISWA KURSUS (PEMASUKAN)'
                          : k.nama_kategori === 'pelunasan_siswa'
                          ? 'PELUNASAN SISWA KURSUS (PEMASUKAN)'
                          : k.nama_kategori === 'refund_siswa'
                          ? 'REFUND / PEMBATALAN SISWA (PENGELUARAN)'
                          : k.nama_kategori.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-secondary)]" />
                </div>
              </div>

              {/* Dynamic Student Dropdown for DP, Pelunasan, and Refund */}
              {isStudentRelated && (
                <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[var(--brand-primary)] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>
                        {isDpCategory
                          ? 'Pilih Siswa (Belum Bayar) *'
                          : isPelunasanCategory
                          ? 'Pilih Siswa (Status DP) *'
                          : 'Pilih Siswa (Status DP / Lunas) *'}
                      </span>
                    </label>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {filteredSiswaDropdown.length} siswa
                    </span>
                  </div>

                  <div className="relative">
                    <select
                      value={formData.siswa_id}
                      required
                      onChange={(e) => handleSiswaChange(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs appearance-none pr-8 font-medium"
                    >
                      <option value="">-- Pilih Siswa / DP Kustom --</option>

                      {/* DP KUSTOM Option for DP Category */}
                      {isDpCategory && (
                        <option value="custom_dp" className="font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40">
                          ✨ [+ Input DP Kustom / Tanpa Data Siswa]
                        </option>
                      )}

                      {/* PELUNASAN: DP KUSTOM BERADA DI PALING ATAS */}
                      {isPelunasanCategory && unsettledDpKustom.length > 0 && (
                        <optgroup label="⭐ DAFTAR DP KUSTOM (BELUM LUNAS)">
                          {unsettledDpKustom.map((dp) => (
                            <option
                              key={`dp_kustom_${dp.id}`}
                              value={`dp_kustom_${dp.id}`}
                              className="font-bold text-amber-800 dark:text-amber-300"
                            >
                              ⭐ [DP Kustom] {dp.nama} — {dp.namaPaket} (Sisa: {formatRupiah(dp.sisaTagihan)})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {/* DAFTAR SISWA TERDAFTAR */}
                      {isPelunasanCategory && (
                        <optgroup label="Daftar Siswa Terdaftar (Status DP)">
                          {filteredSiswaDropdown.map((s) => {
                            const sisaTagihan = Math.max(0, s.harga_final - (s.dp_nominal || 0));
                            return (
                              <option key={s.id} value={s.id}>
                                {s.kode_siswa} - {s.nama} (Sisa Piutang: {formatRupiah(sisaTagihan)})
                              </option>
                            );
                          })}
                        </optgroup>
                      )}

                      {isDpCategory && (
                        <optgroup label="Daftar Siswa Terdaftar (Belum Bayar)">
                          {filteredSiswaDropdown.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.kode_siswa} - {s.nama} (Total Tagihan: {formatRupiah(s.harga_final)})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {isRefundCategory && (
                        <optgroup label="Daftar Siswa Terdaftar (DP / Lunas)">
                          {filteredSiswaDropdown.map((s) => {
                            const totalPaid = s.status_pembayaran_kode === 'lunas' ? s.harga_final : (s.dp_nominal || 0);
                            return (
                              <option key={s.id} value={s.id}>
                                {s.kode_siswa} - {s.nama} (Terbayar: {formatRupiah(totalPaid)} [{s.status_pembayaran_kode.toUpperCase()}])
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-secondary)]" />
                  </div>

                  {/* Form Khusus Input DP Kustom */}
                  {isCustomDpSelected && (
                    <div className="pt-2 border-t border-[var(--border)] space-y-3 p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>Form Input DP Kustom (Non-Siswa)</span>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                            Nama Customer / Calon Siswa *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Budi Santoso"
                            value={customNama}
                            onChange={(e) => handleCustomNamaChange(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                            Pilihan Paket Kursus *
                          </label>
                          <div className="relative">
                            <select
                              value={customPaketId}
                              onChange={(e) => handleCustomPaketChange(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)] appearance-none pr-8"
                            >
                              {paketList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nama_paket} ({formatRupiah(p.harga_promo || p.harga_normal)})
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-secondary)]" />
                          </div>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-amber-100/70 dark:bg-amber-900/30 text-[10px] text-amber-800 dark:text-amber-300">
                        💡 <strong>Info:</strong> Transaksi DP Kustom ini disimpan tanpa data siswa terdaftar. Saat pelunasan nantinya, nama ini akan otomatis muncul di <strong>bagian paling atas dropdown Pelunasan</strong>.
                      </div>
                    </div>
                  )}

                  {/* Info Khusus Ketika Memilih DP Kustom untuk Pelunasan */}
                  {selectedDpKustom && (
                    <div className="pt-2 border-t border-[var(--border)] space-y-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          Pelunasan DP Kustom (Non-Siswa)
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">Ref ID: {selectedDpKustom.id.slice(0, 8)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-[var(--bg)] p-2.5 rounded-xl border border-[var(--border)]">
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Nama Customer</span>
                          <span className="font-bold text-[var(--text-primary)]">{selectedDpKustom.nama}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Paket Dipilih</span>
                          <span className="font-semibold text-[var(--text-primary)]">{selectedDpKustom.namaPaket}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Total Biaya Paket</span>
                          <span className="font-bold text-[var(--brand-primary)]">{formatRupiah(selectedDpKustom.hargaPaket)}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">DP Awal Terbayar</span>
                          <span className="font-semibold text-emerald-600">{formatRupiah(selectedDpKustom.dpNominal)}</span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-[var(--border)] flex justify-between items-center">
                          <span className="text-[var(--text-secondary)] text-[10px]">Sisa Tagihan Pelunasan:</span>
                          <span className="font-bold text-rose-600 text-xs">{formatRupiah(selectedDpKustom.sisaTagihan)}</span>
                        </div>
                      </div>

                      {formData.nominal === selectedDpKustom.sisaTagihan && (
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                          <div>
                            <strong>Pelunasan Penuh!</strong> Sisa tagihan DP Kustom ini sebesar <strong>{formatRupiah(selectedDpKustom.sisaTagihan)}</strong> akan lunas seluruhnya.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Context Info & Real-time Calculation Box */}
                  {selectedSiswa && (
                    <div className="pt-2 border-t border-[var(--border)] space-y-2 text-[11px]">
                      <div className="grid grid-cols-2 gap-2 bg-[var(--bg)] p-2.5 rounded-xl border border-[var(--border)]">
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Paket Kursus</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {selectedSiswa.paket?.nama_paket || 'Khusus'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Total Biaya Paket</span>
                          <span className="font-bold text-[var(--brand-primary)]">
                            {formatRupiah(selectedSiswa.harga_final)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Sudah Terbayar</span>
                          <span className="font-semibold text-emerald-600">
                            {formatRupiah(
                              selectedSiswa.status_pembayaran_kode === 'lunas'
                                ? selectedSiswa.harga_final
                                : selectedSiswa.dp_nominal || 0
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-secondary)] block text-[10px]">Sisa Piutang Berjalan</span>
                          <span className="font-bold text-rose-600">
                            {formatRupiah(
                              isPelunasanCategory
                                ? Math.max(0, selectedSiswa.harga_final - (selectedSiswa.dp_nominal || 0))
                                : isDpCategory
                                ? selectedSiswa.harga_final
                                : 0
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Real-time Validation / Comparison Alert */}
                      {isDpCategory && formData.nominal > 0 && (
                        <div
                          className={`p-2 rounded-xl flex items-start gap-1.5 ${
                            formData.nominal >= selectedSiswa.harga_final
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                              : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                          }`}
                        >
                          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <div>
                            {formData.nominal >= selectedSiswa.harga_final ? (
                              <span>
                                <strong>Lunas Penuh!</strong> Nominal DP melunasi seluruh paket. Status siswa otomatis menjadi <strong>LUNAS</strong>.
                              </span>
                            ) : (
                              <span>
                                DP <strong>{formatRupiah(formData.nominal)}</strong> dicatat. Sisa piutang: <strong>{formatRupiah(selectedSiswa.harga_final - formData.nominal)}</strong> (Status: <strong>DP</strong>).
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {isPelunasanCategory && formData.nominal > 0 && (
                        (() => {
                          const sisaPiutang = Math.max(0, selectedSiswa.harga_final - (selectedSiswa.dp_nominal || 0));
                          if (formData.nominal === sisaPiutang) {
                            return (
                              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                                <div>
                                  <strong>Pembayaran PAS!</strong> Sisa piutang lunas sepenuhnya (Rp 0). Status siswa menjadi <strong>LUNAS</strong>.
                                </div>
                              </div>
                            );
                          } else if (formData.nominal < sisaPiutang) {
                            return (
                              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 flex items-start gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                                <div>
                                  <strong>Pembayaran Sebagian.</strong> Sisa piutang tersisa <strong>{formatRupiah(sisaPiutang - formData.nominal)}</strong> (Status tetap DP).
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-start gap-1.5">
                                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-600" />
                                <div>
                                  <strong>Pembayaran Lebih.</strong> Kelebihan bayar: <strong>{formatRupiah(formData.nominal - sisaPiutang)}</strong> (Status menjadi LUNAS).
                                </div>
                              </div>
                            );
                          }
                        })()
                      )}

                      {isRefundCategory && (
                        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-start gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-600" />
                          <div>
                            <strong>Refund Pengeluaran:</strong> Pengembalian dana <strong>{formatRupiah(formData.nominal)}</strong>. Status siswa otomatis menjadi <strong>BATAL</strong> dan piutang dihapus.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Keterangan */}
              <div>
                <label className="block font-semibold mb-1.5 text-[var(--text-secondary)]">Keterangan Transaksi *</label>
                <input
                  type="text"
                  required
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Keterangan transaksi"
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs"
                />
              </div>

              {/* Nominal */}
              <div>
                <CurrencyInput
                  label="Nominal Rupiah (Rp) *"
                  value={formData.nominal}
                  onChange={(val) => setFormData({ ...formData, nominal: val })}
                />
              </div>

              {/* Jenis Pembayaran */}
              <div>
                <label className="block font-semibold mb-1.5 text-[var(--text-secondary)]">Jenis Pembayaran *</label>
                <div className="flex rounded-xl p-1 bg-[var(--bg-subtle)] border border-[var(--border)]">
                  {JENIS_PEMBAYARAN_OPTIONS.map((opt) => {
                    const isSelected = formData.jenis_pembayaran === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, jenis_pembayaran: opt.value as any })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                          isSelected ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-60 transition-all"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : formData.tipe === 'pemasukan' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span>{submitting ? 'Menyimpan...' : 'Simpan Transaksi Kas'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
