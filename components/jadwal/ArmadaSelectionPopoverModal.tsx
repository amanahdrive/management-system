'use client';

import React from 'react';
import { Kendaraan } from '@/types/database';
import { getKendaraanImage } from '@/lib/utils/vehicle';
import { sound } from '@/lib/sound/SoundFX';
import { Car, UserCheck, Check, X, ShieldCheck } from 'lucide-react';

export interface ArmadaSelectionPopoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (kendaraanId: string | null, tipeKendaraan: 'operasional' | 'pribadi') => void | Promise<void>;
  kendaraanList: Kendaraan[];
  sessionInfo?: {
    namaSiswa?: string;
    nomorSesi?: number;
    totalSesi?: number;
    slotWaktu?: string;
    tanggal?: string;
  };
  initialKendaraanId?: string | null;
  initialTipeKendaraan?: 'operasional' | 'pribadi';
  isLoading?: boolean;
}

export function ArmadaSelectionPopoverModal({
  isOpen,
  onClose,
  onConfirm,
  kendaraanList,
  sessionInfo,
  initialKendaraanId,
  initialTipeKendaraan = 'operasional',
  isLoading = false,
}: ArmadaSelectionPopoverModalProps) {
  const [selectedTipe, setSelectedTipe] = React.useState<'operasional' | 'pribadi'>(initialTipeKendaraan);
  const [selectedKendaraanId, setSelectedKendaraanId] = React.useState<string | null>(initialKendaraanId || null);

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const defaultId = initialKendaraanId || kendaraanList[0]?.id || null;
      setSelectedKendaraanId(defaultId);
      setSelectedTipe(initialTipeKendaraan);
    }
  }, [isOpen, initialKendaraanId, initialTipeKendaraan, kendaraanList]);

  if (!isOpen) return null;

  const handleSelectCar = (k: Kendaraan) => {
    sound.click();
    setSelectedTipe('operasional');
    setSelectedKendaraanId(k.id);
  };

  const handleSelectPribadi = () => {
    sound.click();
    setSelectedTipe('pribadi');
    setSelectedKendaraanId(null);
  };

  const handleExecute = () => {
    sound.chime();
    onConfirm(selectedKendaraanId, selectedTipe);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600/10 via-emerald-500/5 to-transparent border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-[var(--text-primary)]">
                Pilih Armada Mobil Sesi
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                Sesi selesai • Catat jam terbang armada aktual
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sound.click();
              onClose();
            }}
            disabled={isLoading}
            className="p-1.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Sesi Siswa yang Sedang Diselesaikan */}
        {sessionInfo && (
          <div className="px-5 py-3 bg-[var(--bg-subtle)] border-b border-[var(--border)] text-xs flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-[var(--text-primary)] truncate">
                {sessionInfo.namaSiswa || 'Siswa Mengemudi'}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] truncate">
                {sessionInfo.tanggal ? `${sessionInfo.tanggal} • ` : ''}
                {sessionInfo.slotWaktu || 'Sesi Latihan'}
              </div>
            </div>
            {sessionInfo.nomorSesi && (
              <span className="shrink-0 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                Sesi {sessionInfo.nomorSesi} {sessionInfo.totalSesi ? `/ ${sessionInfo.totalSesi}` : ''}
              </span>
            )}
          </div>
        )}

        {/* Konten Pilihan Mobil */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pilih Armada Mobil:</span>
          </div>

          {/* List Armada Mobil Operasional */}
          <div className="grid grid-cols-1 gap-2.5">
            {kendaraanList.map((k) => {
              const isSelected = selectedTipe === 'operasional' && selectedKendaraanId === k.id;
              const carImg = getKendaraanImage(k);

              return (
                <div
                  key={k.id}
                  onClick={() => handleSelectCar(k)}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/30'
                      : 'border-[var(--border)] bg-[var(--card-bg)] hover:border-emerald-500/50 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {/* Visual Gambar Mobil (WebP Ringan & Bebas Background) */}
                  <div className="relative w-24 h-16 sm:w-28 sm:h-20 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-b from-black/5 to-transparent dark:from-white/5 border border-[var(--border)] flex items-center justify-center p-1">
                    <img
                      src={carImg}
                      alt={k.nama_kendaraan}
                      className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-200 select-none"
                      loading="eager"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const isAyla = k.nama_kendaraan.toLowerCase().includes('ayla');
                        const fallbackUrl = isAyla ? '/assets/gambar-ayla.webp' : '/assets/gambar-xenia.webp';
                        if (target.src !== fallbackUrl) {
                          target.src = fallbackUrl;
                        }
                      }}
                    />
                  </div>

                  {/* Informasi Detail Mobil & Plat Nomor */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-black text-sm text-[var(--text-primary)] truncate">
                        {k.nama_kendaraan}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        {k.tipe_transmisi || 'MANUAL'}
                      </span>
                    </div>

                    {/* Badge Plat Nomor Standar Indonesia */}
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-mono font-black text-[11px] tracking-wider shadow-2xs">
                      <span>{k.plat_nomor}</span>
                    </div>

                    <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium truncate">
                      Armada Operasional Resmi
                    </p>
                  </div>

                  {/* Indikator Checkmark Terpilih */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-[var(--border)] text-transparent bg-[var(--bg)]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>
              );
            })}

            {/* Opsi Mobil Pribadi / Siswa */}
            <div
              onClick={handleSelectPribadi}
              className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                selectedTipe === 'pribadi'
                  ? 'border-purple-500 bg-purple-500/10 shadow-md ring-2 ring-purple-500/30'
                  : 'border-[var(--border)] bg-[var(--card-bg)] hover:border-purple-500/50 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <div className="w-24 h-16 sm:w-28 sm:h-18 shrink-0 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col items-center justify-center text-purple-600 dark:text-purple-400">
                <UserCheck className="w-7 h-7" />
                <span className="text-[9px] font-bold mt-0.5">Mobil Siswa</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-black text-sm text-[var(--text-primary)] truncate">
                    Mobil Pribadi Siswa
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                    PRIBADI
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                  Siswa memakai kendaraan pribadinya sendiri
                </p>
                <p className="text-[9.5px] text-[var(--text-muted)] mt-0.5">
                  Fee instruktur dihitung sesuai tarif mobil pribadi
                </p>
              </div>

              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                  selectedTipe === 'pribadi'
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'border-[var(--border)] text-transparent bg-[var(--bg)]'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[var(--bg-subtle)] border-t border-[var(--border)] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              sound.click();
              onClose();
            }}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:bg-black/5 dark:hover:bg-white/5 font-bold text-xs text-[var(--text-secondary)] transition-all active:scale-95 cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExecute}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Konfirmasi & Selesai</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
