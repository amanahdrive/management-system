'use client';

import React from 'react';
import { Kendaraan, KendaraanBan, PosisiBanEnum } from '@/types/database';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { updateOliKendaraan, addBanHistory, updateCuciMobil } from '@/lib/actions/kendaraan';
import { sound } from '@/lib/sound/SoundFX';
import {
  Wrench,
  Sparkles,
  Disc,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Gauge,
  Plus,
  Car,
  Loader2,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface FleetMaintenanceHubProps {
  kendaraanList: Kendaraan[];
  onRefresh: () => void;
  initialKendaraanId?: string;
}

export function FleetMaintenanceHub({
  kendaraanList,
  onRefresh,
  initialKendaraanId,
}: FleetMaintenanceHubProps) {
  const [selectedKendaraanId, setSelectedKendaraanId] = React.useState<string>(
    initialKendaraanId || kendaraanList[0]?.id || ''
  );
  const [activeSubTab, setActiveSubTab] = React.useState<'oli' | 'ban' | 'cuci'>('oli');

  const selectedKendaraan =
    kendaraanList.find((k) => k.id === selectedKendaraanId) || kendaraanList[0];

  // Oli Form States
  const [oliTanggal, setOliTanggal] = React.useState<string>(getTodayDateString());
  const [oliKm, setOliKm] = React.useState<number>(
    selectedKendaraan?.status?.odometer_terkini || 0
  );
  const [isSavingOli, setIsSavingOli] = React.useState(false);

  // Cuci Form States
  const [cuciTanggal, setCuciTanggal] = React.useState<string>(getTodayDateString());
  const [isSavingCuci, setIsSavingCuci] = React.useState(false);

  // Ban Form States
  const [posisiBan, setPosisiBan] = React.useState<PosisiBanEnum>('depan_kiri');
  const [banKm, setBanKm] = React.useState<number>(
    selectedKendaraan?.status?.odometer_terkini || 0
  );
  const [banStatusBeli, setBanStatusBeli] = React.useState<'baru' | 'second'>('baru');
  const [banTanggal, setBanTanggal] = React.useState<string>(getTodayDateString());
  const [isSavingBan, setIsSavingBan] = React.useState(false);

  // Update odometer defaults when switching vehicle
  React.useEffect(() => {
    if (selectedKendaraan?.status?.odometer_terkini) {
      setOliKm(selectedKendaraan.status.odometer_terkini);
      setBanKm(selectedKendaraan.status.odometer_terkini);
    }
  }, [selectedKendaraan]);

  const currentOdo = selectedKendaraan?.status?.odometer_terkini || 0;
  const lastOliKm = selectedKendaraan?.status?.oli_km_terakhir || null;
  const kmSinceOli = lastOliKm !== null ? Math.max(0, currentOdo - lastOliKm) : 0;
  const oliProgressPercent = Math.min(100, Math.round((kmSinceOli / 5000) * 100));
  const isOliCritical = kmSinceOli >= 5000;
  const isOliWarning = kmSinceOli >= 4500 && kmSinceOli < 5000;

  // Handle Save Oli
  const handleSaveOli = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKendaraan) return;
    try {
      setIsSavingOli(true);
      sound.click();
      const res = await updateOliKendaraan(selectedKendaraan.id, oliTanggal, oliKm);
      if (res.success) {
        sound.pop();
        onRefresh();
      } else {
        alert(res.error || 'Gagal menyimpan status oli');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSavingOli(false);
    }
  };

  // Handle Save Cuci
  const handleSaveCuci = async (customDate?: string) => {
    if (!selectedKendaraan) return;
    try {
      setIsSavingCuci(true);
      sound.click();
      const dateToSave = customDate || cuciTanggal;
      const res = await updateCuciMobil(selectedKendaraan.id, dateToSave);
      if (res.success) {
        sound.pop();
        onRefresh();
      } else {
        alert(res.error || 'Gagal menyimpan data cuci mobil');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSavingCuci(false);
    }
  };

  // Handle Save Ban
  const handleSaveBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKendaraan) return;
    try {
      setIsSavingBan(true);
      sound.click();
      const res = await addBanHistory({
        kendaraan_id: selectedKendaraan.id,
        posisi_ban: posisiBan,
        tanggal_ganti: banTanggal,
        km_saat_ganti: banKm,
        status_beli: banStatusBeli,
      });
      if (res.success) {
        sound.pop();
        onRefresh();
      } else {
        alert(res.error || 'Gagal mencatat pergantian ban');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSavingBan(false);
    }
  };

  const TYRE_POSITIONS: { id: PosisiBanEnum; label: string; short: string; positionClass: string }[] = [
    { id: 'depan_kiri', label: 'Depan Kiri', short: 'FL', positionClass: 'top-2 left-2' },
    { id: 'depan_kanan', label: 'Depan Kanan', short: 'FR', positionClass: 'top-2 right-2' },
    { id: 'belakang_kiri', label: 'Belakang Kiri', short: 'RL', positionClass: 'bottom-2 left-2' },
    { id: 'belakang_kanan', label: 'Belakang Kanan', short: 'RR', positionClass: 'bottom-2 right-2' },
    { id: 'serep', label: 'Ban Serep / Cadangan', short: 'SP', positionClass: 'bottom-16 left-1/2 -translate-x-1/2' },
  ];

  return (
    <div className="space-y-4">
      {/* Selector Armada */}
      <div className="card-container p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-[var(--brand-primary)]" />
          <span className="text-xs font-bold text-[var(--text-secondary)]">Pilih Armada:</span>
        </div>
        <select
          value={selectedKendaraanId}
          onChange={(e) => setSelectedKendaraanId(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
        >
          {kendaraanList.map((k) => (
            <option key={k.id} value={k.id}>
              {k.plat_nomor} — {k.nama_kendaraan}
            </option>
          ))}
        </select>
      </div>

      {/* Sub-Tabs: Servis Oli | Ganti Ban | Cuci Mobil */}
      <div className="flex items-center p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-[var(--border)] gap-1">
        <button
          type="button"
          onClick={() => {
            sound.click();
            setActiveSubTab('oli');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            activeSubTab === 'oli'
              ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 text-amber-500" />
          <span>Servis Oli</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.click();
            setActiveSubTab('ban');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            activeSubTab === 'ban'
              ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Disc className="w-3.5 h-3.5 text-indigo-500" />
          <span>Ban 5 Titik</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sound.click();
            setActiveSubTab('cuci');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
            activeSubTab === 'cuci'
              ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          <span>Cuci Mobil</span>
        </button>
      </div>

      {/* 1. KONTEN TAB: SERVIS OLI */}
      {activeSubTab === 'oli' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Card Interval & Health Meter */}
          <div className="card-container p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                  Status Servis Oli Mesin
                </span>
                <h4 className="text-sm font-black text-[var(--text-primary)] mt-0.5">
                  Interval Standar: 5.000 KM
                </h4>
              </div>

              <span
                className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase border ${
                  isOliCritical
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse'
                    : isOliWarning
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {isOliCritical
                  ? 'Segera Servis!'
                  : isOliWarning
                  ? 'Mendekati Servis'
                  : 'Kondisi Prima'}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-[var(--text-secondary)]">
                  {kmSinceOli.toLocaleString('id-ID')} KM terpakai
                </span>
                <span className="text-[var(--text-muted)]">
                  Maks. 5.000 KM
                </span>
              </div>
              <div className="w-full h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOliCritical ? 'bg-rose-500' : isOliWarning ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${oliProgressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>Ganti Terakhir: {selectedKendaraan?.status?.oli_km_terakhir?.toLocaleString('id-ID') || '0'} KM</span>
                <span>Sisa: {Math.max(0, 5000 - kmSinceOli).toLocaleString('id-ID')} KM</span>
              </div>
            </div>
          </div>

          {/* Form Catat Servis Oli */}
          <form
            onSubmit={handleSaveOli}
            className="card-container p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-3"
          >
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-500" />
              <span>Catat Penggantian Oli Baru</span>
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                  Tanggal Ganti
                </label>
                <input
                  type="date"
                  value={oliTanggal}
                  onChange={(e) => setOliTanggal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                  Kilometer Saat Ganti
                </label>
                <input
                  type="number"
                  value={oliKm}
                  onChange={(e) => setOliKm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingOli}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
            >
              {isSavingOli ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Perbarui Status Servis Oli'}
            </button>
          </form>
        </div>
      )}

      {/* 2. KONTEN TAB: DIAGRAM BAN 5 TITIK */}
      {activeSubTab === 'ban' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          <div className="card-container p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                  Diagram Roda & Ban 5 Titik
                </h4>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Klik titik roda untuk mencatat pergantian atau cek kondisi
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                5 Titik Terpantau
              </span>
            </div>

            {/* Visual Car Silhouette Chassis with 5 Wheels */}
            <div className="relative w-full max-w-[260px] mx-auto h-52 bg-black/5 dark:bg-white/5 rounded-3xl border-2 border-dashed border-[var(--border)] p-3 flex flex-col justify-between items-center my-2">
              <span className="text-[9px] font-black tracking-widest text-[var(--text-muted)] uppercase">
                ▲ DEPAN MOBIL ▲
              </span>

              {/* Central Vehicle Info */}
              <div className="text-center">
                <span className="text-xs font-black font-mono text-[var(--text-primary)] block">
                  {selectedKendaraan.plat_nomor}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">
                  {selectedKendaraan.nama_kendaraan}
                </span>
              </div>

              <span className="text-[9px] font-black tracking-widest text-[var(--text-muted)] uppercase">
                ▼ BELAKANG MOBIL ▼
              </span>

              {/* 5 Wheel Buttons */}
              {TYRE_POSITIONS.map((pos) => {
                const isSelected = posisiBan === pos.id;
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => {
                      sound.click();
                      setPosisiBan(pos.id);
                    }}
                    className={`absolute ${pos.positionClass} px-2 py-1.5 rounded-xl text-center border font-mono transition-all active:scale-95 shadow-xs ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-400/40'
                        : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border)] hover:border-indigo-400'
                    }`}
                  >
                    <div className="text-[10px] font-black">{pos.short}</div>
                    <div className="text-[8px] opacity-80 whitespace-nowrap">{pos.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Pergantian Ban */}
          <form
            onSubmit={handleSaveBan}
            className="card-container p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-3"
          >
            <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-indigo-500" />
                <span>Catat Penggantian Ban</span>
              </span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 capitalize">
                Posisi: {posisiBan.replace('_', ' ')}
              </span>
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                  Kondisi Beli
                </label>
                <select
                  value={banStatusBeli}
                  onChange={(e) => setBanStatusBeli(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)]"
                >
                  <option value="baru">Ban Baru</option>
                  <option value="second">Ban Bekas / Second Layak</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                  Kilometer Ganti
                </label>
                <input
                  type="number"
                  value={banKm}
                  onChange={(e) => setBanKm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingBan}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.99] transition-all"
            >
              {isSavingBan ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Riwayat Pergantian Ban'}
            </button>
          </form>
        </div>
      )}

      {/* 3. KONTEN TAB: CUCI MOBIL */}
      {activeSubTab === 'cuci' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          <div className="card-container p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-sm font-black text-[var(--text-primary)]">
                Status Kebersihan Armada
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Cuci Terakhir:{' '}
                <span className="font-bold text-[var(--text-primary)]">
                  {selectedKendaraan.status?.cuci_tanggal_terakhir
                    ? formatDateIndo(selectedKendaraan.status.cuci_tanggal_terakhir)
                    : 'Belum pernah dicatat'}
                </span>
              </p>
            </div>

            {/* 1-Tap Quick Wash Done Button */}
            <button
              type="button"
              onClick={() => handleSaveCuci(getTodayDateString())}
              disabled={isSavingCuci}
              className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              {isSavingCuci ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tandai Mobil Selesai Dicuci Hari Ini</span>
                </>
              )}
            </button>
          </div>

          {/* Form Tanggal Kustom Cuci */}
          <div className="card-container p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-sm space-y-3">
            <span className="text-xs font-bold text-[var(--text-secondary)] block">
              Atur Tanggal Cuci Manual:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={cuciTanggal}
                onChange={(e) => setCuciTanggal(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)]"
              />
              <button
                type="button"
                onClick={() => handleSaveCuci()}
                disabled={isSavingCuci}
                className="px-4 py-2 rounded-xl bg-[var(--bg)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] text-xs font-bold text-[var(--text-primary)]"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
