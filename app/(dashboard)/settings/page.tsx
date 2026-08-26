'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  getGeneralSettings,
  saveCompanyProfile,
  saveSopTemplate,
  saveBbmPrices,
} from '@/lib/actions/settings';
import {
  sendTelegramMessageAction,
  getTelegramConfig,
  saveTelegramConfig,
  TelegramConfig,
} from '@/lib/actions/telegram';
import {
  getRekeningList,
  addRekening,
  updateRekening,
  deleteRekening,
} from '@/lib/actions/rekening';
import { RekeningBank } from '@/types/database';
import { verifyKasPin, updateKasPin } from '@/lib/actions/kas-pin';
import { resetModularData, ResetModuleKey } from '@/lib/actions/reset-system';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  Send,
  KeyRound,
  Building,
  Fuel,
  Bell,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Loader2,
  Clock,
  Settings,
  ShieldAlert,
  Save,
  Check,
  Banknote,
  Users,
  Calendar,
  Car,
  AlertOctagon,
  Package,
  UserCheck,
  Flame,
  CreditCard,
  Plus,
  Edit3,
  Copy,
  Star,
  Landmark,
} from 'lucide-react';

const INITIAL_TELEGRAM_CONFIG: TelegramConfig = {
  otomasiAktif: true,
  laporanPagiAktif: true,
  laporanPagiJam: '06:00',
  rekapMalamAktif: true,
  rekapMalamJam: '21:00',
  pengingatProgressAktif: true,
  botToken: '',
  chatId: '',
  includeOdometer: true,
};

interface ResetModuleItem {
  key: ResetModuleKey;
  title: string;
  description: string;
  icon: React.ElementType;
  badge: string;
  isHighDanger?: boolean;
}

const RESET_MODULES: ResetModuleItem[] = [
  {
    key: 'keuangan',
    title: 'Data Keuangan & Kas',
    description: 'Menghapus riwayat transaksi kas (pemasukan/pengeluaran), buku kas umum, data hutang & cicilan hutang.',
    icon: Banknote,
    badge: 'Keuangan',
  },
  {
    key: 'siswa',
    title: 'Data Siswa Kursus',
    description: 'Menghapus database siswa kursus, paket belajar yang diambil, status pembayaran, dan riwayat pendaftaran.',
    icon: Users,
    badge: 'Kesiswaan',
  },
  {
    key: 'jadwal',
    title: 'Data Jadwal Sesi',
    description: 'Menghapus seluruh entri jadwal sesi mengemudi harian, mingguan, dan riwayat progres sesi instruktur.',
    icon: Calendar,
    badge: 'Operasional',
  },
  {
    key: 'kendaraan_log',
    title: 'Log Armada Kendaraan',
    description: 'Menghapus catatan log harian mobil, riwayat bbm, kondisi ban, serta mereset odometer/servis.',
    icon: Car,
    badge: 'Armada',
  },
  {
    key: 'insiden',
    title: 'Data Insiden Operasional',
    description: 'Menghapus seluruh laporan insiden kendaraan, kerusakan bodi, klaim biaya, dan dossier penanganan.',
    icon: AlertOctagon,
    badge: 'Insiden',
  },
  {
    key: 'notifikasi',
    title: 'Log Notifikasi Telegram',
    description: 'Menghapus seluruh riwayat log notifikasi pengiriman pesan otomatis bot Telegram.',
    icon: Bell,
    badge: 'Notifikasi',
  },
  {
    key: 'master_staff',
    title: 'Data Master Staff & Instruktur',
    description: 'Menghapus daftar seluruh personil staff, instruktur mengemudi, dan mapping jabatan.',
    icon: UserCheck,
    badge: 'SDM',
  },
  {
    key: 'master_paket',
    title: 'Data Master Paket & Promosi',
    description: 'Menghapus master paket kursus pembelajaran mengemudi dan kode diskon / promosi.',
    icon: Package,
    badge: 'Master',
  },
];

export default function SettingsPage() {
  // Settings Form State
  const [namaPerusahaan, setNamaPerusahaan] = React.useState('Amanah Drive');
  const [kota, setKota] = React.useState('Palembang');
  const [waTemplate, setWaTemplate] = React.useState(
    '• Minta share lokasi kepada klien sebelum berangkat.\n' +
      '• Laporan keluar Basecamp beserta foto odometer.\n' +
      '• Laporan saat sesi dimulai.\n' +
      '• Laporan saat sesi selesai.\n' +
      '• Laporan kembali ke Basecamp beserta foto odometer.'
  );

  // BBM Prices
  const [pertalitePrice, setPertalitePrice] = React.useState(10000);
  const [pertamaxPrice, setPertamaxPrice] = React.useState(16300);

  // Saving states for individual sections
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [profileSuccess, setProfileSuccess] = React.useState(false);

  const [savingBbm, setSavingBbm] = React.useState(false);
  const [bbmSuccess, setBbmSuccess] = React.useState(false);

  const [savingSop, setSavingSop] = React.useState(false);
  const [sopSuccess, setSopSuccess] = React.useState(false);

  // PIN Change State
  const [pinLama, setPinLama] = React.useState('');
  const [pinBaru, setPinBaru] = React.useState('');
  const [pinLoading, setPinLoading] = React.useState(false);
  const [pinSuccess, setPinSuccess] = React.useState<string | null>(null);
  const [pinError, setPinError] = React.useState<string | null>(null);

  // Telegram Config State
  const [telegramConfig, setTelegramConfig] = React.useState<TelegramConfig>(INITIAL_TELEGRAM_CONFIG);
  const [loadingTelegram, setLoadingTelegram] = React.useState(true);
  const [savingTelegram, setSavingTelegram] = React.useState(false);
  const [telegramSaveSuccess, setTelegramSaveSuccess] = React.useState(false);
  const [testSending, setTestSending] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message?: string } | null>(null);

  // Rekening Bank Management State
  const [rekeningList, setRekeningList] = React.useState<RekeningBank[]>([]);
  const [loadingRekening, setLoadingRekening] = React.useState(true);
  const [showRekeningModal, setShowRekeningModal] = React.useState(false);
  const [editingRekening, setEditingRekening] = React.useState<RekeningBank | null>(null);
  const [formRekening, setFormRekening] = React.useState({
    nama_bank: 'BCA',
    nomor_rekening: '',
    atas_nama: '',
    aktif: true,
    is_utama: false,
    keterangan: '',
  });
  const [savingRekening, setSavingRekening] = React.useState(false);
  const [copiedRekeningId, setCopiedRekeningId] = React.useState<string | null>(null);

  // Modular Reset State
  const [activeResetModule, setActiveResetModule] = React.useState<{
    key: ResetModuleKey;
    title: string;
    description: string;
  } | null>(null);
  const [resetLoading, setResetLoading] = React.useState(false);
  const [resetSuccessBanner, setResetSuccessBanner] = React.useState<string | null>(null);

  // Load All Settings on Mount
  React.useEffect(() => {
    let isMounted = true;
    async function loadAllSettings() {
      setLoadingTelegram(true);
      setLoadingRekening(true);
      try {
        const [genCfg, tgCfg, rekList] = await Promise.all([
          getGeneralSettings(),
          getTelegramConfig(),
          getRekeningList(),
        ]);
        if (!isMounted) return;
        setNamaPerusahaan(genCfg.namaPerusahaan);
        setKota(genCfg.kotaOperasional);
        setWaTemplate(genCfg.waTemplate);
        setPertalitePrice(genCfg.pertalitePrice);
        setPertamaxPrice(genCfg.pertamaxPrice);
        setTelegramConfig(tgCfg);
        setRekeningList(rekList);
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        if (isMounted) {
          setLoadingTelegram(false);
          setLoadingRekening(false);
        }
      }
    }
    loadAllSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenAddRekening = () => {
    setEditingRekening(null);
    setFormRekening({
      nama_bank: 'BCA',
      nomor_rekening: '',
      atas_nama: namaPerusahaan || 'Amanah Drive',
      aktif: true,
      is_utama: rekeningList.length === 0,
      keterangan: '',
    });
    setShowRekeningModal(true);
  };

  const handleOpenEditRekening = (rek: RekeningBank) => {
    setEditingRekening(rek);
    setFormRekening({
      nama_bank: rek.nama_bank,
      nomor_rekening: rek.nomor_rekening,
      atas_nama: rek.atas_nama,
      aktif: rek.aktif,
      is_utama: rek.is_utama || false,
      keterangan: rek.keterangan || '',
    });
    setShowRekeningModal(true);
  };

  const handleSaveRekening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRekening.nama_bank || !formRekening.nomor_rekening || !formRekening.atas_nama) {
      alert('Nama Bank, Nomor Rekening, dan Atas Nama wajib diisi!');
      return;
    }
    setSavingRekening(true);

    if (editingRekening) {
      const res = await updateRekening(editingRekening.id, {
        nama_bank: formRekening.nama_bank,
        nomor_rekening: formRekening.nomor_rekening,
        atas_nama: formRekening.atas_nama,
        aktif: formRekening.aktif,
        is_utama: formRekening.is_utama,
        keterangan: formRekening.keterangan,
      });
      if (res.success) {
        const updated = await getRekeningList();
        setRekeningList(updated);
        setShowRekeningModal(false);
      } else {
        alert('Gagal mengubah rekening: ' + res.error);
      }
    } else {
      const res = await addRekening({
        nama_bank: formRekening.nama_bank,
        nomor_rekening: formRekening.nomor_rekening,
        atas_nama: formRekening.atas_nama,
        aktif: formRekening.aktif,
        is_utama: formRekening.is_utama,
        keterangan: formRekening.keterangan,
      });
      if (res.success) {
        const updated = await getRekeningList();
        setRekeningList(updated);
        setShowRekeningModal(false);
      } else {
        alert('Gagal menambah rekening: ' + res.error);
      }
    }
    setSavingRekening(false);
  };

  const handleDeleteRekening = async (id: string, nama: string) => {
    if (!confirm(`Hapus rekening ${nama}?`)) return;
    const res = await deleteRekening(id);
    if (res.success) {
      const updated = await getRekeningList();
      setRekeningList(updated);
    } else {
      alert('Gagal menghapus rekening: ' + res.error);
    }
  };

  const handleToggleAktifRekening = async (rek: RekeningBank) => {
    const res = await updateRekening(rek.id, { aktif: !rek.aktif });
    if (res.success) {
      const updated = await getRekeningList();
      setRekeningList(updated);
    }
  };

  const handleCopyRekening = (id: string, noRek: string) => {
    navigator.clipboard.writeText(noRek);
    setCopiedRekeningId(id);
    setTimeout(() => setCopiedRekeningId(null), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(false);
    const res = await saveCompanyProfile(namaPerusahaan, kota);
    setSavingProfile(false);
    if (res.success) {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } else {
      alert('Gagal menyimpan profil: ' + res.error);
    }
  };

  const handleSaveBbm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBbm(true);
    setBbmSuccess(false);
    const res = await saveBbmPrices(pertalitePrice, pertamaxPrice);
    setSavingBbm(false);
    if (res.success) {
      setBbmSuccess(true);
      setTimeout(() => setBbmSuccess(false), 3000);
    } else {
      alert('Gagal menyimpan harga BBM: ' + res.error);
    }
  };

  const handleSaveSopTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSop(true);
    setSopSuccess(false);
    const res = await saveSopTemplate(waTemplate);
    setSavingSop(false);
    if (res.success) {
      setSopSuccess(true);
      setTimeout(() => setSopSuccess(false), 3000);
    } else {
      alert('Gagal menyimpan template SOP: ' + res.error);
    }
  };

  const handleExecuteReset = async () => {
    if (!activeResetModule) return;
    setResetLoading(true);
    const res = await resetModularData(activeResetModule.key);
    setResetLoading(false);

    if (res.success) {
      const msg = `Berhasil mengosongkan ${activeResetModule.title}!`;
      setResetSuccessBanner(msg);
      setActiveResetModule(null);
      setTimeout(() => setResetSuccessBanner(null), 5000);

      if (activeResetModule.key === 'all') {
        setNamaPerusahaan('');
        setKota('');
        window.location.href = '/dashboard';
      }
    } else {
      alert(`Gagal mengosongkan ${activeResetModule.title}: ${res.error}`);
    }
  };

  const handleTestTelegram = async () => {
    setTestSending(true);
    setTestResult(null);

    const res = await sendTelegramMessageAction(
      '<b>TES NOTIFIKASI AMANAH DRIVE</b>\nSistem notifikasi Telegram berhasil terhubung!',
      'tes_notifikasi',
      'Tes Koneksi Telegram'
    );

    setTestSending(false);
    if (res.success) {
      setTestResult({ success: true, message: 'Pesan tes berhasil dikirim ke Telegram Chat!' });
    } else {
      setTestResult({
        success: false,
        message: res.error || 'Gagal mengirim. Pastikan Bot Token & Chat ID sudah benar.',
      });
    }
  };

  const handleSaveTelegram = async () => {
    setSavingTelegram(true);
    setTelegramSaveSuccess(false);
    const res = await saveTelegramConfig(telegramConfig);
    setSavingTelegram(false);

    if (res.success) {
      setTelegramSaveSuccess(true);
      setTimeout(() => setTelegramSaveSuccess(false), 3000);
    } else {
      alert('Gagal menyimpan pengaturan Telegram: ' + res.error);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinLoading(true);
    setPinError(null);
    setPinSuccess(null);

    if (pinBaru.length !== 6 || !/^\d+$/.test(pinBaru)) {
      setPinError('PIN Baru harus berupa 6 digit angka');
      setPinLoading(false);
      return;
    }

    try {
      const verifyRes = await verifyKasPin(pinLama);
      if (!verifyRes.success) {
        setPinError(verifyRes.error || 'PIN lama yang Anda masukkan salah');
        setPinLoading(false);
        return;
      }

      const updateRes = await updateKasPin(pinLama, pinBaru);
      if (updateRes.success) {
        setPinSuccess('PIN Keuangan & Kas berhasil diperbarui');
        setPinLama('');
        setPinBaru('');
      } else {
        setPinError(updateRes.error || 'Gagal memperbarui PIN');
      }
    } catch {
      setPinError('Terjadi kesalahan jaringan atau server');
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Sistem"
        description="Konfigurasi parameter operasional, keamanan PIN, notifikasi Telegram, dan pembersihan database"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      />

      {/* Success Notification Banner */}
      {resetSuccessBanner && (
        <div className="card-container bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 transition-all animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="font-semibold text-xs">{resetSuccessBanner}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Profil Perusahaan */}
        <div className="card-container space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-[var(--brand-primary)]" />
            Profil Usaha & Wilayah
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Nama Usaha</label>
              <input
                type="text"
                value={namaPerusahaan}
                onChange={(e) => setNamaPerusahaan(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)]"
              />
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Kota Operasional</label>
              <input
                type="text"
                value={kota}
                onChange={(e) => setKota(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)]"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] disabled:opacity-50 text-white font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors"
            >
              {savingProfile ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : profileSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{savingProfile ? 'Menyimpan...' : profileSuccess ? 'Tersimpan!' : 'Simpan Profil Usaha'}</span>
            </button>
          </form>
        </div>

        {/* Section 2: Ganti PIN Keuangan */}
        <div className="card-container space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-500" />
            Keamanan PIN Kas & Keuangan
          </h3>

          <form onSubmit={handlePinSubmit} className="space-y-3 text-xs">
            {pinError && (
              <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/30 text-[var(--danger)] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}
            {pinSuccess && (
              <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pinSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-semibold">PIN Lama</label>
              <input
                type="password"
                maxLength={6}
                value={pinLama}
                onChange={(e) => setPinLama(e.target.value.replace(/\D/g, ''))}
                placeholder="Masukkan 6 digit PIN saat ini"
                required
                className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-bold tabular-num tracking-widest"
              />
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-semibold">PIN Baru (6 Digit)</label>
              <input
                type="password"
                maxLength={6}
                value={pinBaru}
                onChange={(e) => setPinBaru(e.target.value.replace(/\D/g, ''))}
                placeholder="Masukkan 6 digit PIN baru"
                required
                className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-bold tabular-num tracking-widest"
              />
            </div>

            <button
              type="submit"
              disabled={pinLoading || pinLama.length !== 6 || pinBaru.length !== 6}
              className="w-full py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] disabled:opacity-50 text-white font-bold rounded-md flex items-center justify-center gap-1 transition-colors"
            >
              {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan PIN Baru</span>
            </button>
          </form>
        </div>

        {/* Section 3: Parameter BBM */}
        <div className="card-container space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Fuel className="w-4 h-4 text-emerald-500" />
            Parameter Harga BBM
          </h3>

          <form onSubmit={handleSaveBbm} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Pertalite (Rp/Liter)</label>
                <input
                  type="number"
                  value={pertalitePrice}
                  onChange={(e) => setPertalitePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Pertamax (Rp/Liter)</label>
                <input
                  type="number"
                  value={pertamaxPrice}
                  onChange={(e) => setPertamaxPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingBbm}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors"
            >
              {savingBbm ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : bbmSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{savingBbm ? 'Menyimpan...' : bbmSuccess ? 'Tersimpan!' : 'Simpan Harga BBM'}</span>
            </button>
          </form>
        </div>

        {/* Section 4: WhatsApp Template */}
        <div className="card-container space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-600" />
            Template Standar Operasional Sesi
          </h3>

          <form onSubmit={handleSaveSopTemplate} className="space-y-3 text-xs">
            <div>
              <textarea
                rows={5}
                value={waTemplate}
                onChange={(e) => setWaTemplate(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[11px] leading-relaxed font-medium"
                placeholder="Tuliskan format teks SOP atau instruksi SOP sesi..."
              />
            </div>

            <button
              type="submit"
              disabled={savingSop}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors"
            >
              {savingSop ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : sopSuccess ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{savingSop ? 'Menyimpan...' : sopSuccess ? 'Tersimpan!' : 'Simpan Template SOP'}</span>
            </button>
          </form>
        </div>

        {/* ── SECTION: KELOLA REKENING BANK PERUSAHAAN ── */}
        <div className="card-container space-y-4 md:col-span-2 border-l-4 border-l-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
            <div>
              <h3 className="font-bold text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600" />
                Kelola Rekening Bank Perusahaan
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Daftar rekening bank resmi untuk pilihan pembayaran uang masuk non-tunai (transfer bank) pada Kas & Keuangan, PWA Finance, dan Invoice/Nota.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddRekening}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Rekening</span>
            </button>
          </div>

          {loadingRekening ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Memuat data rekening...</span>
            </div>
          ) : rekeningList.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
              Belum ada rekening bank yang tersimpan. Klik tombol <strong>+ Tambah Rekening</strong> untuk menambahkan rekening pertama.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {rekeningList.map((rek) => (
                <div
                  key={rek.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all relative ${
                    rek.aktif
                      ? 'bg-[var(--bg)] border-[var(--border)] shadow-xs hover:border-emerald-500'
                      : 'bg-gray-100 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-60'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-[11px] uppercase tracking-wider">
                        {rek.nama_bank}
                      </span>
                      <div className="flex items-center gap-1">
                        {rek.is_utama && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            Utama
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            rek.aktif
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {rek.aktif ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--text-secondary)] font-medium">Nomor Rekening</span>
                        <button
                          type="button"
                          onClick={() => handleCopyRekening(rek.id, rek.nomor_rekening)}
                          className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5"
                          title="Salin No Rekening"
                        >
                          {copiedRekeningId === rek.id ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">Disalin!</span>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="text-sm font-bold font-mono tracking-wider text-[var(--text-primary)] mt-0.5">
                        {rek.nomor_rekening}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] font-medium">Atas Nama</span>
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {rek.atas_nama}
                      </div>
                    </div>

                    {rek.keterangan && (
                      <p className="text-[10px] text-[var(--text-secondary)] italic border-t border-[var(--border)] pt-1.5">
                        {rek.keterangan}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleAktifRekening(rek)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                        rek.aktif
                          ? 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      }`}
                    >
                      {rek.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditRekening(rek)}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                        title="Edit Rekening"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRekening(rek.id, `${rek.nama_bank} - ${rek.nomor_rekening}`)}
                        className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                        title="Hapus Rekening"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Konfigurasi Notifikasi Otomasi Telegram */}
        <div className="card-container space-y-4 md:col-span-2 border-l-4 border-l-sky-500 bg-sky-50/20 dark:bg-sky-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2">
            <h3 className="font-bold text-sm text-sky-700 dark:text-sky-400 flex items-center gap-2">
              <Bell className="w-4 h-4 text-sky-500" />
              Notifikasi Otomatis Telegram
            </h3>

            {/* Master Switch */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">Master Otomasi:</span>
              <button
                type="button"
                onClick={() =>
                  setTelegramConfig((prev) => ({
                    ...prev,
                    otomasiAktif: !prev.otomasiAktif,
                  }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  telegramConfig.otomasiAktif ? 'bg-sky-600' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    telegramConfig.otomasiAktif ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span
                className={`text-xs font-bold ${
                  telegramConfig.otomasiAktif ? 'text-sky-600 dark:text-sky-400' : 'text-gray-400'
                }`}
              >
                {telegramConfig.otomasiAktif ? 'AKTIF' : 'NONAKTIF'}
              </span>
            </div>
          </div>

          {loadingTelegram ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Credentials Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Bot Token Telegram</label>
                  <input
                    type="text"
                    value={telegramConfig.botToken}
                    onChange={(e) =>
                      setTelegramConfig((prev) => ({
                        ...prev,
                        botToken: e.target.value,
                      }))
                    }
                    placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                    Chat ID / Group ID Tujuan
                  </label>
                  <input
                    type="text"
                    value={telegramConfig.chatId}
                    onChange={(e) =>
                      setTelegramConfig((prev) => ({
                        ...prev,
                        chatId: e.target.value,
                      }))
                    }
                    placeholder="Contoh: -1001234567890 atau @channel_username"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-medium"
                  />
                </div>
              </div>

              {/* Switches & Schedule Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[var(--border)]">
                {/* 1. Laporan Jadwal Pagi */}
                <div className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--text-primary)]">1. Jadwal Mengemudi Pagi</span>
                    <input
                      type="checkbox"
                      checked={telegramConfig.laporanPagiAktif}
                      onChange={(e) =>
                        setTelegramConfig((prev) => ({
                          ...prev,
                          laporanPagiAktif: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-sky-600"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span className="text-[11px] text-[var(--text-secondary)]">Pukul Pengiriman:</span>
                    <input
                      type="time"
                      value={telegramConfig.laporanPagiJam || '06:00'}
                      onChange={(e) =>
                        setTelegramConfig((prev) => ({
                          ...prev,
                          laporanPagiJam: e.target.value,
                        }))
                      }
                      disabled={!telegramConfig.laporanPagiAktif}
                      className="px-2 py-1 border border-[var(--border)] rounded-md bg-[var(--bg)] font-bold text-xs disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* 2. Rekap Sesi Malam */}
                <div className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--text-primary)]">2. Rekap Sesi Malam</span>
                    <input
                      type="checkbox"
                      checked={telegramConfig.rekapMalamAktif}
                      onChange={(e) =>
                        setTelegramConfig((prev) => ({
                          ...prev,
                          rekapMalamAktif: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-sky-600"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span className="text-[11px] text-[var(--text-secondary)]">Pukul Pengiriman:</span>
                    <input
                      type="time"
                      value={telegramConfig.rekapMalamJam || '21:00'}
                      onChange={(e) =>
                        setTelegramConfig((prev) => ({
                          ...prev,
                          rekapMalamJam: e.target.value,
                        }))
                      }
                      disabled={!telegramConfig.rekapMalamAktif}
                      className="px-2 py-1 border border-[var(--border)] rounded-md bg-[var(--bg)] font-bold text-xs disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* 3. Pengingat Update Progress */}
                <div className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[var(--text-primary)]">3. Pengingat Sesi Terlewat</span>
                    <input
                      type="checkbox"
                      checked={telegramConfig.pengingatProgressAktif}
                      onChange={(e) =>
                        setTelegramConfig((prev) => ({
                          ...prev,
                          pengingatProgressAktif: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-sky-600"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--text-secondary)]">Odometer Kendaraan:</span>
                    <input
                      type="checkbox"
                      checked={telegramConfig.includeOdometer ?? true}
                      onChange={(e) =>
                        setTelegramConfig((prev) => ({
                          ...prev,
                          includeOdometer: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded text-sky-600"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={testSending || !telegramConfig.botToken || !telegramConfig.chatId}
                  className="py-2 px-3 border border-sky-400 dark:border-sky-700 bg-sky-100 dark:bg-sky-950/40 hover:bg-sky-200 dark:hover:bg-sky-900/50 disabled:opacity-50 text-sky-800 dark:text-sky-300 font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testSending ? 'Mengirim...' : 'Tes Notifikasi'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveTelegram}
                  disabled={savingTelegram}
                  className="py-2.5 px-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  {savingTelegram ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : telegramSaveSuccess ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{savingTelegram ? 'Menyimpan...' : telegramSaveSuccess ? 'Tersimpan!' : 'Simpan Telegram'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 6: MODULAR DATA RESET / KOSONGKAN DATA DATABASE ── */}
        <div className="card-container space-y-4 md:col-span-2 border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h3 className="font-bold text-sm text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-amber-600" />
              Pembersihan & Reset Data Modular
            </h3>
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
              Pilih modul spesifik yang ingin dikosongkan
            </span>
          </div>

          {/* Grid of Modular Reset Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {RESET_MODULES.map((mod) => {
              const IconComponent = mod.icon;
              return (
                <div
                  key={mod.key}
                  className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)] flex flex-col justify-between gap-3 shadow-xs hover:border-amber-400 dark:hover:border-amber-700 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="p-1.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-lg inline-flex">
                        <IconComponent className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-black/5 dark:bg-white/5 rounded text-[var(--text-secondary)]">
                        {mod.badge}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-[var(--text-primary)]">{mod.title}</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{mod.description}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveResetModule({
                        key: mod.key,
                        title: mod.title,
                        description: `PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh ${mod.title}? ${mod.description}`,
                      })
                    }
                    className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan {mod.badge}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 7: ZONA BAHAYA - RESET SISTEM TOTAL ── */}
        <div className="card-container space-y-4 md:col-span-2 border-l-4 border-l-[var(--danger)] bg-rose-50/50 dark:bg-rose-950/10">
          <h3 className="font-bold text-sm text-[var(--danger)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[var(--danger)]" />
            Zona Bahaya — Reset Total Seluruh Database
          </h3>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-[var(--text-primary)]">Kosongkan Seluruh Data Database (0 Data)</p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Menghapus total seluruh data: Siswa, Jadwal, Kas & Keuangan, Armada Log, Insiden, Staff, Paket, dan Notifikasi secara permanen kembali ke awal.
              </p>
            </div>

            <button
              onClick={() =>
                setActiveResetModule({
                  key: 'all',
                  title: 'SELURUH DATA SISTEM (RESET TOTAL)',
                  description:
                    'PERINGATAN KRITIS: Apakah Anda benar-benar yakin ingin MENGOSONGKAN SELURUH DATA SISTEM? Semua data siswa, jadwal, kas, kendaraan, insiden, staff, dan pengaturan akan dihapus permanen kembali ke nol!',
                })
              }
              disabled={resetLoading}
              className="px-4 py-2.5 bg-[var(--danger)] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shrink-0 transition-colors shadow-sm active:scale-95"
            >
              <Flame className={`w-4 h-4 ${resetLoading ? 'animate-spin' : ''}`} />
              <span>{resetLoading ? 'Memproses Reset...' : 'Reset Semua Data Total'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modular Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(activeResetModule)}
        onClose={() => setActiveResetModule(null)}
        onConfirm={handleExecuteReset}
        title={`KONFIRMASI: KOSONGKAN ${activeResetModule?.title?.toUpperCase() || 'DATA'}`}
        description={
          activeResetModule?.description ||
          'Apakah Anda yakin ingin mengosongkan data ini? Data yang dihapus tidak dapat dipulihkan.'
        }
        confirmText="Ya, Kosongkan Data Ini"
        isDanger
      />

      {/* Tambah / Edit Rekening Modal */}
      {showRekeningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600" />
                <span>{editingRekening ? 'Edit Rekening Bank' : 'Tambah Rekening Bank Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRekeningModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRekening} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Nama Bank *
                </label>
                <select
                  value={formRekening.nama_bank}
                  onChange={(e) => setFormRekening({ ...formRekening, nama_bank: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                >
                  <option value="BCA">BCA (Bank Central Asia)</option>
                  <option value="Mandiri">Bank Mandiri</option>
                  <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                  <option value="BNI">BNI (Bank Negara Indonesia)</option>
                  <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                  <option value="CIMB Niaga">CIMB Niaga</option>
                  <option value="Permata">Bank Permata</option>
                  <option value="Danamon">Bank Danamon</option>
                  <option value="BTN">BTN</option>
                  <option value="BJB">Bank BJB</option>
                  <option value="Lainnya">Lainnya / Bank Daerah</option>
                </select>
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Nomor Rekening *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 8535441234"
                  value={formRekening.nomor_rekening}
                  onChange={(e) => setFormRekening({ ...formRekening, nomor_rekening: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-mono font-bold tracking-wider text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Atas Nama (A.n) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Amanah Drive Palembang"
                  value={formRekening.atas_nama}
                  onChange={(e) => setFormRekening({ ...formRekening, atas_nama: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Keterangan / Catatan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Rekening Utama Penerimaan Kursus"
                  value={formRekening.keterangan}
                  onChange={(e) => setFormRekening({ ...formRekening, keterangan: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-[var(--border)]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRekening.is_utama}
                    onChange={(e) => setFormRekening({ ...formRekening, is_utama: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Jadikan Rekening Utama (Default Pilihan Pertama)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRekening.aktif}
                    onChange={(e) => setFormRekening({ ...formRekening, aktif: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Status Rekening Aktif
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowRekeningModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingRekening}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {savingRekening ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savingRekening ? 'Menyimpan...' : 'Simpan Rekening'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
