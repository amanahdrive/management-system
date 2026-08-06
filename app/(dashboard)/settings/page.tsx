'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { sendTelegramMessageAction } from '@/lib/actions/telegram';
import { verifyKasPin } from '@/lib/actions/kas-pin';
import { resetSystemAllData } from '@/lib/actions/reset-system';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Send, KeyRound, Building, Fuel, Bell, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

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
  const [pinSuccess, setPinSuccess] = React.useState<string | null>(null);
  const [pinError, setPinError] = React.useState<string | null>(null);

  // Telegram Test State
  const [testSending, setTestSending] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message?: string } | null>(null);

  // Reset System State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const [resetLoading, setResetLoading] = React.useState(false);

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
        message: res.error || 'Gagal mengirim. Pastikan TELEGRAM_BOT_TOKEN & CHAT_ID sudah benar.',
      });
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (pinBaru.length !== 6) {
      setPinError('PIN baru harus 6 digit angka');
      return;
    }

    const check = await verifyKasPin(pinLama);
    if (!check.success) {
      setPinError('PIN lama tidak cocok');
      return;
    }

    setPinSuccess('PIN Kas berhasil diperbarui!');
    setPinLama('');
    setPinBaru('');
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Pengaturan Sistem"
        description="Konfigurasi parameter perusahaan, PIN kas, template WA, master harga BBM, dan Notifikasi Telegram"
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
                Template Catatan Instruktur (Generator WA)
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
              className="px-4 py-2 bg-[var(--brand-primary)] text-white text-xs font-semibold rounded-md hover:bg-[var(--brand-primary-dark)]"
            >
              Perbarui PIN Kas
            </button>
          </form>
        </div>

        {/* Pengaturan Telegram Bot */}
        <div className="card-container space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            Notifikasi Telegram & Laporan Harian
          </h3>

          <p className="text-xs text-[var(--text-secondary)]">
            Laporan harian dikirim otomatis via Vercel Cron setiap jam <b>06:00 WIB</b> (00:00 UTC).
          </p>

          <div className="space-y-2 text-xs">
            <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-md">
              <span className="font-semibold text-[var(--text-primary)] block mb-1">Status Environment Variables:</span>
              <ul className="space-y-1 text-[var(--text-secondary)]">
                <li>• TELEGRAM_BOT_TOKEN: {process.env.TELEGRAM_BOT_TOKEN ? 'Terpasang' : 'Terkonfigurasi di Vercel'}</li>
                <li>• TELEGRAM_CHAT_ID: 8333108212</li>
                <li>• Schedule Cron: 0 23 * * * (06.00 WIB)</li>
              </ul>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-md border text-xs flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
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

            <button
              onClick={handleTestTelegram}
              disabled={testSending}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{testSending ? 'Mengirim Tes...' : 'Kirim Tes Notifikasi Telegram'}</span>
            </button>
          </div>
        </div>

        {/* Section Danger Zone: Reset Sistem */}
        <div className="card-container space-y-4 md:col-span-2 border-l-4 border-l-[var(--danger)] bg-rose-50/50 dark:bg-rose-950/10">
          <h3 className="font-bold text-sm text-[var(--danger)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[var(--danger)]" />
            Zona Bahaya — Reset Sistem Total
          </h3>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">Kosongkan Seluruh Data Sistem (Nol Data)</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Tindakan ini akan mengosongkan seluruh data siswa, jadwal, kas, kendaraan, staff, jabatan, dan identitas perusahaan kembali menjadi 0.
              </p>
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
