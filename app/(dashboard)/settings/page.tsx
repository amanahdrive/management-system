'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  sendTelegramMessageAction,
  getTelegramConfig,
  saveTelegramConfig,
  TelegramConfig,
} from '@/lib/actions/telegram';
import { verifyKasPin, updateKasPin } from '@/lib/actions/kas-pin';
import { resetSystemAllData } from '@/lib/actions/reset-system';
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

  // Reset System State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [resetLoading, setResetLoading] = React.useState(false);

  // Load Telegram Config on Mount
  React.useEffect(() => {
    async function loadTg() {
      setLoadingTelegram(true);
      const cfg = await getTelegramConfig();
      setTelegramConfig(cfg);
      setLoadingTelegram(false);
    }
    loadTg();
  }, []);

  const handleResetSystem = async () => {
    setResetLoading(true);
    const res = await resetSystemAllData();
    setResetLoading(false);
    setIsResetConfirmOpen(false);

    if (res.success) {
      setNamaPerusahaan('');
      setKota('');
      alert('Seluruh data sistem berhasil dikosongkan (0 data)!');
      window.location.href = '/dashboard';
    } else {
      alert('Gagal melakukan reset sistem: ' + res.error);
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

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (pinLama.length !== 6 || pinBaru.length !== 6) {
      setPinError('PIN lama dan PIN baru harus tepat 6 digit angka');
      return;
    }

    setPinLoading(true);
    const res = await updateKasPin(pinLama, pinBaru);
    setPinLoading(false);

    if (!res.success) {
      setPinError(res.error || 'Gagal memperbarui PIN');
      return;
    }

    setPinSuccess('PIN Kas & PWA Finance berhasil diperbarui di sistem!');
    setPinLama('');
    setPinBaru('');
  };

  const handleSaveAllSettings = () => {
    handleSaveTelegram();
    alert('Pengaturan Sistem Berhasil Disimpan!');
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Pengaturan Sistem"
        description="Konfigurasi parameter perusahaan, PIN kas, template WA, master harga BBM, dan Notifikasi Telegram"
        actions={
          <button
            onClick={handleSaveAllSettings}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold rounded-md shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Simpan Semua Pengaturan</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identitas Perusahaan & WA Template */}
        <div className="card-container space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-[var(--brand-primary)]" />
            Identitas Perusahaan & Template WA
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Nama Perusahaan / Brand
              </label>
              <input
                type="text"
                value={namaPerusahaan}
                onChange={(e) => setNamaPerusahaan(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Kota Operasional Utama
              </label>
              <input
                type="text"
                value={kota}
                onChange={(e) => setKota(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Template SOP / Catatan Instruktur (WA Generator)
              </label>
              <textarea
                rows={5}
                value={waTemplate}
                onChange={(e) => setWaTemplate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-[var(--border)] bg-[var(--bg)]"
              />
            </div>
          </div>
        </div>

        {/* Master Harga BBM */}
        <div className="card-container space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Fuel className="w-4 h-4 text-emerald-600" />
            Master Harga BBM per Liter
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Harga Pertalite (Rp / Liter)
              </label>
              <input
                type="number"
                value={pertalitePrice}
                onChange={(e) => setPertalitePrice(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Harga Pertamax (Rp / Liter)
              </label>
              <input
                type="number"
                value={pertamaxPrice}
                onChange={(e) => setPertamaxPrice(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
              />
            </div>
          </div>
        </div>

        {/* Pengaturan Ganti PIN Kas */}
        <div className="card-container space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" />
            Pengaturan PIN Kas
          </h3>

          <form onSubmit={handleChangePin} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                PIN Lama (6 digit)
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinLama}
                onChange={(e) => setPinLama(e.target.value)}
                placeholder="******"
                className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] font-mono tracking-widest"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                PIN Baru (6 digit)
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinBaru}
                onChange={(e) => setPinBaru(e.target.value)}
                placeholder="******"
                className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] font-mono tracking-widest"
              />
            </div>

            {pinError && <p className="text-xs text-[var(--danger)] font-medium">{pinError}</p>}
            {pinSuccess && <p className="text-xs text-[var(--success)] font-medium">{pinSuccess}</p>}

            <button
              type="submit"
              disabled={pinLoading || pinLama.length !== 6 || pinBaru.length !== 6}
              className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] disabled:opacity-50 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors"
            >
              {pinLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{pinLoading ? 'Memproses...' : 'Perbarui PIN Kas & PWA Finance'}</span>
            </button>
          </form>
        </div>

        {/* Pengaturan Automasi Telegram Lengkap */}
        <div className="card-container space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <span>Automasi Notifikasi Telegram</span>
            </h3>

            {/* Master Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={telegramConfig.otomasiAktif}
                onChange={(e) =>
                  setTelegramConfig({ ...telegramConfig, otomasiAktif: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--brand-primary)]"></div>
            </label>
          </div>

          {loadingTelegram ? (
            <div className="h-40 animate-pulse bg-black/5 dark:bg-white/5 rounded-xl flex items-center justify-center text-xs text-[var(--text-secondary)]">
              Memuat pengaturan Telegram...
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Sub-Switch 1: Laporan Pagi Harian */}
              <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">Laporan Operasional Pagi</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">Jadwal seluruh instruktur hari ini</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={telegramConfig.laporanPagiAktif && telegramConfig.otomasiAktif}
                      disabled={!telegramConfig.otomasiAktif}
                      onChange={(e) =>
                        setTelegramConfig({ ...telegramConfig, laporanPagiAktif: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 disabled:opacity-50"></div>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <span className="text-[11px] text-[var(--text-secondary)]">Jam Pengiriman:</span>
                  <input
                    type="time"
                    value={telegramConfig.laporanPagiJam}
                    disabled={!telegramConfig.otomasiAktif || !telegramConfig.laporanPagiAktif}
                    onChange={(e) =>
                      setTelegramConfig({ ...telegramConfig, laporanPagiJam: e.target.value })
                    }
                    className="px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--bg)] font-mono font-bold disabled:opacity-50"
                  />
                  <span className="text-[11px] text-[var(--text-secondary)]">WIB</span>
                </div>
              </div>

              {/* Sub-Switch 2: Rekap Sesi Malam */}
              <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">Rekap Hasil Sesi Malam</p>
                    <p className="text-[11px] text-[var(--text-secondary)]">Rekap sesi selesai, batal, dan terjadwal</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={telegramConfig.rekapMalamAktif && telegramConfig.otomasiAktif}
                      disabled={!telegramConfig.otomasiAktif}
                      onChange={(e) =>
                        setTelegramConfig({ ...telegramConfig, rekapMalamAktif: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 disabled:opacity-50"></div>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <span className="text-[11px] text-[var(--text-secondary)]">Jam Pengiriman:</span>
                  <input
                    type="time"
                    value={telegramConfig.rekapMalamJam}
                    disabled={!telegramConfig.otomasiAktif || !telegramConfig.rekapMalamAktif}
                    onChange={(e) =>
                      setTelegramConfig({ ...telegramConfig, rekapMalamJam: e.target.value })
                    }
                    className="px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--bg)] font-mono font-bold disabled:opacity-50"
                  />
                  <span className="text-[11px] text-[var(--text-secondary)]">WIB</span>
                </div>
              </div>

              {/* Sub-Switch 3: Pengingat Update Progress */}
              <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">Pengingat Update Progress</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">Pengingat instan malam hari untuk update sesi</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramConfig.pengingatProgressAktif && telegramConfig.otomasiAktif}
                    disabled={!telegramConfig.otomasiAktif}
                    onChange={(e) =>
                      setTelegramConfig({
                        ...telegramConfig,
                        pengingatProgressAktif: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 disabled:opacity-50"></div>
                </label>
              </div>

              {/* Bot Token & Chat ID */}
              <div className="space-y-3 pt-1 border-t border-[var(--border)]">
                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Telegram Bot Token
                  </label>
                  <input
                    type="password"
                    value={telegramConfig.botToken}
                    placeholder="Bot Token dari @BotFather"
                    onChange={(e) =>
                      setTelegramConfig({ ...telegramConfig, botToken: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                    Telegram Chat ID / Group ID
                  </label>
                  <input
                    type="text"
                    value={telegramConfig.chatId}
                    placeholder="Misal: -100123456789 atau 8333108212"
                    onChange={(e) =>
                      setTelegramConfig({ ...telegramConfig, chatId: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-mono text-xs"
                  />
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={testSending}
                  className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
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

        {/* Section Danger Zone: Reset Sistem */}
        <div className="card-container space-y-4 md:col-span-2 border-l-4 border-l-[var(--danger)] bg-rose-50/50 dark:bg-rose-950/10">
          <h3 className="font-bold text-sm text-[var(--danger)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[var(--danger)]" />
            Zona Bahaya — Reset Sistem Total
          </h3>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">Kosongkan Seluruh Data Sistem</p>
            </div>

            <button
              onClick={() => setIsResetConfirmOpen(true)}
              disabled={resetLoading}
              className="px-4 py-2.5 bg-[var(--danger)] hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-md flex items-center justify-center gap-2 shrink-0 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${resetLoading ? 'animate-spin' : ''}`} />
              <span>{resetLoading ? 'Proses Reset...' : 'Reset Semua Data Sistem'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Dialog Reset Sistem */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetSystem}
        title="KONFIRMASI RESET SISTEM TOTAL"
        description="PERINGATAN: Apakah Anda benar-benar yakin ingin MENGOSONGKAN SELURUH DATA SISTEM? Seluruh data siswa, jadwal, kas, kendaraan, staff, dan pengaturan akan dihapus permanen kembali ke nol."
        confirmText="Ya, Kosongkan Semua Data"
        isDanger
      />
    </div>
  );
}
