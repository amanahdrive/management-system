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
  TrendingUp,
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
  const [odoOut, setOdoOut] = React.useState<string>('');
  const [odoIn, setOdoIn] = React.useState<string>('');
  const [catatan, setCatatan] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Update selected kendaraan saat prop berubah
  React.useEffect(() => {
    if (defaultKendaraanId) {
      setSelectedKendaraanId(defaultKendaraanId);
    } else if (kendaraanList.length > 0 && !selectedKendaraanId) {
      setSelectedKendaraanId(kendaraanList[0].id);
    }
  }, [defaultKendaraanId, kendaraanList, selectedKendaraanId]);

  const currentVehicle = kendaraanList.find((k) => k.id === selectedKendaraanId) || kendaraanList[0];
  const previousOdo = currentVehicle?.status?.odometer_terkini || 0;

  // Auto-populate Odo Out dari odometer terkini kendaraan yang dipilih
  React.useEffect(() => {
    if (currentVehicle?.status?.odometer_terkini) {
      setOdoOut(String(currentVehicle.status.odometer_terkini));
    } else {
      setOdoOut('');
    }
    setOdoIn('');
    setErrorMsg(null);
  }, [selectedKendaraanId, currentVehicle]);

  if (!isOpen) return null;

  const outKmNum = odoOut.trim() ? parseInt(odoOut.replace(/\D/g, ''), 10) : 0;
  const inKmNum = odoIn.trim() ? parseInt(odoIn.replace(/\D/g, ''), 10) : null;

  // Perhitungan kalkulasi jarak
  const tripDelta = inKmNum !== null && outKmNum > 0 ? inKmNum - outKmNum : null;
  const previousDelta = outKmNum > 0 && previousOdo > 0 ? outKmNum - previousOdo : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedKendaraanId) {
      setErrorMsg('Pilih unit armada terlebih dahulu');
      return;
    }

    if (!outKmNum || outKmNum <= 0) {
      setErrorMsg('Odometer BC Out (km) wajib diisi dengan angka valid');
      return;
    }

    if (inKmNum !== null && inKmNum < outKmNum) {
      setErrorMsg('Odometer BC In tidak boleh lebih kecil dari Odometer BC Out');
      return;
    }

    try {
      setIsSubmitting(true);
      sound.click();

      const res = await upsertKendaraanLog({
        kendaraan_id: selectedKendaraanId,
        tanggal,
        odometer_basecamp_out: outKmNum,
        odometer_basecamp_in: inKmNum,
        catatan: catatan.trim() || null,
      });

      if (res.success) {
        sound.pop();
        onSuccess(inKmNum ?? outKmNum, currentVehicle?.nama_kendaraan);
        setOdoIn('');
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
              Catat Odo Keluar (Out) & Odo Masuk (In Opsional)
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

          {/* 1. Pilih Armada */}
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

          {/* 2. Tanggal Laporan */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              <span>Tanggal Laporan *</span>
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
              required
            />
          </div>

          {/* 3. Input Odometer BC Out & BC In */}
          <div className="space-y-3 pt-1 border-t border-[var(--border)]">
            {/* Odometer BC Out (Wajib) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                  <span>Odometer BC Out (km) *</span>
                </label>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  Tercatat: <strong className="font-mono text-[var(--text-primary)]">{previousOdo.toLocaleString('id-ID')} km</strong>
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  placeholder={previousOdo > 0 ? String(previousOdo) : 'Contoh: 45000'}
                  value={odoOut}
                  onChange={(e) => setOdoOut(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono text-sm font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] pr-12"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                  KM
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                Angka km saat mobil keluar basecamp
              </span>
            </div>

            {/* Odometer BC In (Opsional) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Odometer BC In (km)</span>
                  <span className="font-normal text-[10px] text-amber-600 dark:text-amber-400">(Opsional)</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Kosongkan jika masih jalan / belum kembali"
                  value={odoIn}
                  onChange={(e) => setOdoIn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono text-sm font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] pr-12"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-secondary)]">
                  KM
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] block">
                Angka km saat mobil tiba kembali di basecamp (bisa diisi nanti)
              </span>
            </div>

            {/* Real-time Calculation Indicator */}
            {tripDelta !== null ? (
              <div className="flex items-center justify-between px-3 py-2 text-[11px] rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)]">
                <span className="text-[var(--text-secondary)] flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kalkulasi Jarak Trip Selesai:</span>
                </span>
                <span
                  className={`font-mono font-bold ${
                    tripDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400 text-xs' : 'text-rose-600 text-xs'
                  }`}
                >
                  {tripDelta >= 0 ? `+${tripDelta.toLocaleString('id-ID')} km` : `${tripDelta.toLocaleString('id-ID')} km (Angka In lebih kecil)`}
                </span>
              </div>
            ) : previousDelta !== null && previousDelta !== 0 ? (
              <div className="flex items-center justify-between px-3 py-1.5 text-[11px] rounded-xl bg-black/5 dark:bg-white/5">
                <span className="text-[var(--text-secondary)]">Kenaikan Odo Out:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {previousDelta > 0 ? `+${previousDelta.toLocaleString('id-ID')} km` : `${previousDelta.toLocaleString('id-ID')} km`}
                </span>
              </div>
            ) : null}
          </div>

          {/* 4. Catatan Opsional */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-medium text-[var(--text-secondary)] block">
              Catatan Operasional / Keterangan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Sesi rute kota, kondisi kendaraan prima"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          {/* Tombol Simpan */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !outKmNum}
              className="flex-1 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
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
