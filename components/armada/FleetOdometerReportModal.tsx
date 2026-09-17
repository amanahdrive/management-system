'use client';

import React from 'react';
import Image from 'next/image';
import { Kendaraan } from '@/types/database';
import { upsertKendaraanLog } from '@/lib/actions/kendaraan';
import { getTodayDateString } from '@/lib/utils/date';
import { sound } from '@/lib/sound/SoundFX';
import {
  X,
  Gauge,
  Calendar,
  Check,
  AlertCircle,
  Car,
  Loader2,
} from 'lucide-react';

interface FleetOdometerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  kendaraanList: Kendaraan[];
  defaultKendaraanId?: string;
  onSuccess: (updatedKm?: number, kendaraanNama?: string) => void;
}

export function FleetOdometerReportModal({
  isOpen,
  onClose,
  kendaraanList,
  defaultKendaraanId,
  onSuccess,
}: FleetOdometerReportModalProps) {
  const [selectedKendaraanId, setSelectedKendaraanId] = React.useState<string>(
    defaultKendaraanId || kendaraanList[0]?.id || ''
  );
  const [tanggal, setTanggal] = React.useState<string>(getTodayDateString());
  const [tipeLaporan, setTipeLaporan] = React.useState<'masuk' | 'keluar'>('masuk');
  const [odoInput, setOdoInput] = React.useState<string>('');
  const [catatan, setCatatan] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Update default kendaraan jika prop berubah
  React.useEffect(() => {
    if (defaultKendaraanId) {
      setSelectedKendaraanId(defaultKendaraanId);
    } else if (kendaraanList.length > 0 && !selectedKendaraanId) {
      setSelectedKendaraanId(kendaraanList[0].id);
    }
  }, [defaultKendaraanId, kendaraanList, selectedKendaraanId]);

  const currentVehicle = kendaraanList.find((k) => k.id === selectedKendaraanId) || kendaraanList[0];
  const previousOdo = currentVehicle?.status?.odometer_terkini || 0;

  if (!isOpen) return null;

  const inputKmNum = parseInt(odoInput.replace(/\D/g, ''), 10) || 0;
  const deltaKm = inputKmNum > 0 ? inputKmNum - previousOdo : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedKendaraanId) {
      setErrorMsg('Pilih unit armada terlebih dahulu');
      return;
    }

    if (!inputKmNum || inputKmNum <= 0) {
      setErrorMsg('Masukkan angka odometer yang valid');
      return;
    }

    try {
      setIsSubmitting(true);
      sound.click();

      const res = await upsertKendaraanLog({
        kendaraan_id: selectedKendaraanId,
        tanggal,
        odometer_basecamp_in: tipeLaporan === 'masuk' ? inputKmNum : null,
        odometer_basecamp_out: tipeLaporan === 'keluar' ? inputKmNum : (previousOdo > 0 ? previousOdo : null),
        catatan: catatan.trim() || null,
      });

      if (res.success) {
        sound.pop();
        onSuccess(inputKmNum, currentVehicle?.nama_kendaraan);
        setOdoInput('');
        setCatatan('');
        onClose();
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan laporan odometer');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn font-sans">
      <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Input Laporan Odometer
            </h2>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Catat pembacaan KM harian armada operasional
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Isi */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Pilih Armada (Ayla / Xenia) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--text-secondary)] block">
              Pilih Armada
            </label>
            <div className="grid grid-cols-2 gap-2">
              {kendaraanList.map((k) => {
                const isSelected = k.id === selectedKendaraanId;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => {
                      sound.click();
                      setSelectedKendaraanId(k.id);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] ring-1 ring-[var(--brand-primary)]'
                        : 'border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {k.foto_url ? (
                      <div className="w-10 h-7 relative shrink-0">
                        <Image
                          src={k.foto_url}
                          alt={k.nama_kendaraan}
                          fill
                          className="object-contain"
                          sizes="40px"
                        />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4 text-[var(--text-secondary)]" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {k.nama_kendaraan}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-secondary)]">
                        {k.plat_nomor}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tipe Laporan & Tanggal */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                Status Odometer
              </label>
              <div className="flex rounded-lg border border-[var(--border)] p-0.5 bg-black/5 dark:bg-white/5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTipeLaporan('masuk')}
                  className={`flex-1 py-1 rounded-md font-medium transition-all ${
                    tipeLaporan === 'masuk'
                      ? 'bg-[var(--bg)] text-[var(--text-primary)] font-bold shadow-xs'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Selesai (In)
                </button>
                <button
                  type="button"
                  onClick={() => setTipeLaporan('keluar')}
                  className={`flex-1 py-1 rounded-md font-medium transition-all ${
                    tipeLaporan === 'keluar'
                      ? 'bg-[var(--bg)] text-[var(--text-primary)] font-bold shadow-xs'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Awal (Out)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Tanggal Laporan</span>
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
          </div>

          {/* 3. Input Angka Odometer */}
          <div className="space-y-1.5 pt-1 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Odometer Terkini (KM)</span>
              </label>
              <span className="text-[10px] text-[var(--text-secondary)]">
                Sebelumnya: <strong className="font-mono text-[var(--text-primary)]">{previousOdo.toLocaleString('id-ID')} km</strong>
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                placeholder={previousOdo > 0 ? String(previousOdo) : 'Contoh: 221850'}
                value={odoInput}
                onChange={(e) => setOdoInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono text-base font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] pr-12"
                autoFocus
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                KM
              </span>
            </div>

            {/* Real-time Calculation Indicator */}
            {inputKmNum > 0 && (
              <div className="flex items-center justify-between px-2 py-1 text-[11px] rounded-lg bg-black/5 dark:bg-white/5">
                <span className="text-[var(--text-secondary)]">Estimasi Jarak Sesi:</span>
                <span
                  className={`font-mono font-bold ${
                    deltaKm >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {deltaKm >= 0 ? `+${deltaKm.toLocaleString('id-ID')} km` : `${deltaKm.toLocaleString('id-ID')} km (Angka lebih kecil)`}
                </span>
              </div>
            )}
          </div>

          {/* 4. Catatan Opsional */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[var(--text-secondary)] block">
              Catatan Sesi / Rute (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Sesi rute kota lancar, kondisi aman"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          {/* Tombol Simpan */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !inputKmNum}
              className="flex-1 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Laporan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
