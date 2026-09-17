'use client';

import React from 'react';
import Image from 'next/image';
import { Kendaraan } from '@/types/database';
import { formatDateIndo } from '@/lib/utils/date';
import { sound } from '@/lib/sound/SoundFX';
import {
  Car,
  Gauge,
  Wrench,
  Fuel,
  Droplets,
  Plus,
} from 'lucide-react';

interface FleetTelemetryCardsProps {
  kendaraanList: Kendaraan[];
  onOpenOdoModal: (k: Kendaraan) => void;
  onOpenOliModal: (k: Kendaraan) => void;
  onOpenCuciModal: (k: Kendaraan) => void;
  onOpenBanModal?: (k: Kendaraan) => void;
  onOpenInspeksiModal?: (k: Kendaraan) => void;
}

export function FleetTelemetryCards({
  kendaraanList,
  onOpenOdoModal,
  onOpenOliModal,
  onOpenCuciModal,
}: FleetTelemetryCardsProps) {
  return (
    <div className="space-y-3 font-sans">
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
        <span className="font-semibold text-[var(--text-primary)]">
          Status Armada Aktif ({kendaraanList.length})
        </span>
        <span>Operasional Harian</span>
      </div>

      <div className="space-y-3">
        {kendaraanList.map((k) => {
          const status = k.status;
          const currentOdo = status?.odometer_terkini || 0;
          const lastOliKm = status?.oli_km_terakhir || null;
          const kmSinceOli = lastOliKm !== null ? Math.max(0, currentOdo - lastOliKm) : 0;
          const sisaOliKm = lastOliKm !== null ? Math.max(0, 5000 - kmSinceOli) : null;

          return (
            <div
              key={k.id}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-xs space-y-3 transition-colors"
            >
              {/* Header Mobil: Foto WebP Realistis, Nama, Plat & Tombol Input Odo */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
                <div className="flex items-center gap-3 min-w-0">
                  {k.foto_url ? (
                    <div className="w-14 h-10 relative shrink-0">
                      <Image
                        src={k.foto_url}
                        alt={k.nama_kendaraan}
                        fill
                        className="object-contain"
                        sizes="60px"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5 text-[var(--brand-primary)]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">
                        {k.nama_kendaraan}
                      </h3>
                      <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">
                        {k.tipe_transmisi}
                      </span>
                    </div>
                    <div className="text-xs font-mono font-bold text-[var(--brand-primary)]">
                      {k.plat_nomor}
                    </div>
                  </div>
                </div>

                {/* Tombol Cepat 1-Klik: Input Odometer untuk mobil ini */}
                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    onOpenOdoModal(k);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all active:scale-95 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Input Odo</span>
                </button>
              </div>

              {/* 4 Data Kunci: Penyebutan Sama Persis dengan Console Utama (/kendaraan) */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* 1. Odometer Terkini */}
                <div className="flex items-start gap-2">
                  <Gauge className="w-4 h-4 text-[var(--text-secondary)] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-[var(--text-secondary)] block">
                      Odometer Terkini
                    </span>
                    <span className="font-bold font-mono text-[var(--text-primary)] text-sm">
                      {currentOdo.toLocaleString('id-ID')} km
                    </span>
                  </div>
                </div>

                {/* 2. Oli Terakhir */}
                <div className="flex items-start gap-2">
                  <Wrench className="w-4 h-4 text-[var(--text-secondary)] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-[var(--text-secondary)] block">
                      Oli Terakhir
                    </span>
                    <span className="font-semibold text-[var(--text-primary)] truncate block">
                      {formatDateIndo(status?.oli_tanggal_terakhir)}
                    </span>
                    {sisaOliKm !== null && (
                      <span className="text-[9.5px] text-[var(--text-muted)] block">
                        Sisa {sisaOliKm.toLocaleString('id-ID')} km
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Cuci Mobil Terakhir */}
                <div className="flex items-start gap-2 pt-2 border-t border-[var(--border)]">
                  <Droplets className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-[var(--text-secondary)] block">
                      Cuci Mobil Terakhir
                    </span>
                    <span className="font-semibold text-[var(--text-primary)] truncate block">
                      {status?.cuci_tanggal_terakhir
                        ? formatDateIndo(status.cuci_tanggal_terakhir)
                        : '-'}
                    </span>
                  </div>
                </div>

                {/* 4. BBM Terakhir (Compact) */}
                <div className="flex items-start gap-2 pt-2 border-t border-[var(--border)]">
                  <Fuel className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-secondary)] block">
                        BBM Terakhir
                      </span>
                      {status?.bensin_tanggal_terakhir && (
                        <span className="text-[9.5px] text-[var(--text-secondary)]">
                          {formatDateIndo(status.bensin_tanggal_terakhir)}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 truncate block text-[11px]">
                      {status?.bensin_nominal_terakhir || status?.bensin_liter_terakhir ? (
                        <>
                          {status.bensin_jenis_terakhir
                            ? status.bensin_jenis_terakhir.toUpperCase()
                            : 'BBM'}
                          {status.bensin_liter_terakhir ? ` (${status.bensin_liter_terakhir} L)` : ''}
                          {status.bensin_nominal_terakhir
                            ? ` • Rp ${Number(status.bensin_nominal_terakhir).toLocaleString('id-ID')}`
                            : ''}
                        </>
                      ) : (
                        '-'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-actions Cepat: Servis & Cuci */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)] text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    onOpenOliModal(k);
                  }}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold flex items-center gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  <span>Servis Oli</span>
                </button>
                <span className="text-[var(--border)]">•</span>
                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    onOpenCuciModal(k);
                  }}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold flex items-center gap-1"
                >
                  <Droplets className="w-3 h-3" />
                  <span>Catat Cuci</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
