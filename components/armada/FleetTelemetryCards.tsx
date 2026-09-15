'use client';

import React from 'react';
import { Kendaraan, KendaraanStatus } from '@/types/database';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo } from '@/lib/utils/date';
import { sound } from '@/lib/sound/SoundFX';
import {
  Car,
  Gauge,
  Wrench,
  Fuel,
  Sparkles,
  Disc,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Plus,
  Zap,
} from 'lucide-react';

interface FleetTelemetryCardsProps {
  kendaraanList: Kendaraan[];
  onOpenOdoModal: (k: Kendaraan) => void;
  onOpenBbmModal: (k: Kendaraan) => void;
  onOpenOliModal: (k: Kendaraan) => void;
  onOpenCuciModal: (k: Kendaraan) => void;
  onOpenBanModal: (k: Kendaraan) => void;
  onOpenInspeksiModal: (k: Kendaraan) => void;
}

export function FleetTelemetryCards({
  kendaraanList,
  onOpenOdoModal,
  onOpenBbmModal,
  onOpenOliModal,
  onOpenCuciModal,
  onOpenBanModal,
  onOpenInspeksiModal,
}: FleetTelemetryCardsProps) {
  const [selectedTransmission, setSelectedTransmission] = React.useState<'semua' | 'manual' | 'matic'>('semua');

  const filtered = kendaraanList.filter((k) => {
    if (selectedTransmission === 'semua') return true;
    return k.tipe_transmisi === selectedTransmission;
  });

  return (
    <div className="space-y-4">
      {/* Filter Transmisi & Ringkasan Unit */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-[var(--border)]">
          {(['semua', 'manual', 'matic'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                sound.click();
                setSelectedTransmission(t);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-lg capitalize transition-all active:scale-95 ${
                selectedTransmission === t
                  ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t === 'semua' ? `Semua (${kendaraanList.length})` : t}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-medium text-[var(--text-muted)]">
          {filtered.length} Unit Armada Terpantau
        </span>
      </div>

      {/* Grid Kartu Armada (Compact & Futuristik) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filtered.map((k) => {
          const status = k.status;
          const currentOdo = status?.odometer_terkini || 0;
          const lastOliKm = status?.oli_km_terakhir || null;
          const kmSinceOli = lastOliKm !== null ? Math.max(0, currentOdo - lastOliKm) : 0;
          const oilAlert = lastOliKm !== null && kmSinceOli >= 4500;
          const oilCritical = lastOliKm !== null && kmSinceOli >= 5000;

          return (
            <div
              key={k.id}
              className="card-container relative overflow-hidden bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-sm hover:border-emerald-500/40 transition-all space-y-3.5 group"
            >
              {/* Subtle top indicator bar */}
              <div
                className={`absolute top-0 inset-x-0 h-1 ${
                  oilCritical
                    ? 'bg-rose-500 animate-pulse'
                    : oilAlert
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />

              {/* Header Kartu: Plat Nomor & Model */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black border border-emerald-500/20 shrink-0">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-black tracking-tight text-[var(--text-primary)]">
                        {k.plat_nomor}
                      </h4>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md ${
                          k.tipe_transmisi === 'manual'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {k.tipe_transmisi}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] font-medium">
                      {k.nama_kendaraan} • {k.tahun_produksi || 'Operasional'}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Siap Jalan
                  </span>
                </div>
              </div>

              {/* Odometer Banner (Angka Tabular Futuristik) */}
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">Odometer Terkini</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black font-mono tracking-tight text-[var(--text-primary)]">
                    {currentOdo.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] ml-1">KM</span>
                </div>
              </div>

              {/* 4 Telemetry Mini Tiles */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* 1. Servis Oli */}
                <div
                  className={`p-2 rounded-xl border transition-all ${
                    oilCritical
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                      : oilAlert
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                      : 'bg-black/5 dark:bg-white/5 border-[var(--border)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      Servis Oli
                    </span>
                    {oilCritical && <AlertTriangle className="w-3 h-3 animate-bounce" />}
                  </div>
                  <div className="font-mono font-bold text-[11px]">
                    {lastOliKm !== null ? `${kmSinceOli.toLocaleString('id-ID')} km / 5.000` : 'Belum tercatat'}
                  </div>
                  <div className="text-[9px] opacity-75 truncate">
                    {oilCritical
                      ? '⚠️ Lewat 5.000 km!'
                      : oilAlert
                      ? 'Mendekati Servis'
                      : lastOliKm !== null
                      ? `Sisa ${(5000 - kmSinceOli).toLocaleString('id-ID')} km`
                      : 'Perlu Input Odo Servis'}
                  </div>
                </div>

                {/* 2. Pengisian BBM */}
                <div className="p-2 rounded-xl border border-[var(--border)] bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-emerald-500" />
                      BBM Terakhir
                    </span>
                  </div>
                  <div className="font-mono font-bold text-[11px] truncate">
                    {status?.bensin_nominal_terakhir
                      ? formatRupiah(status.bensin_nominal_terakhir)
                      : 'Belum terisi'}
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)] truncate">
                    {status?.bensin_liter_terakhir
                      ? `${status.bensin_liter_terakhir} L (${status.bensin_jenis_terakhir || 'Pertalite'})`
                      : 'Belum ada log BBM'}
                  </div>
                </div>

                {/* 3. Cuci Mobil */}
                <div className="p-2 rounded-xl border border-[var(--border)] bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-500" />
                      Cuci Mobil
                    </span>
                  </div>
                  <div className="font-bold text-[11px] truncate">
                    {status?.cuci_tanggal_terakhir
                      ? formatDateIndo(status.cuci_tanggal_terakhir)
                      : 'Belum dicuci'}
                  </div>
                  <div className="text-[9px] text-[var(--text-muted)]">
                    {status?.cuci_tanggal_terakhir ? 'Bersih & Prima' : 'Jadwalkan Cuci'}
                  </div>
                </div>

                {/* 4. Kondisi Ban */}
                <div className="p-2 rounded-xl border border-[var(--border)] bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold flex items-center gap-1">
                      <Disc className="w-3 h-3 text-indigo-500" />
                      Kondisi Ban
                    </span>
                  </div>
                  <div className="font-bold text-[11px] truncate">
                    5 Titik Roda
                  </div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Siap Dipakai
                  </div>
                </div>
              </div>

              {/* Compact Quick Action Buttons Row (Thumb-Friendly) */}
              <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    onOpenOdoModal(k);
                  }}
                  className="flex-1 min-w-[75px] py-1.5 px-2 rounded-xl bg-[var(--bg)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] text-[11px] font-bold text-[var(--text-primary)] flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                >
                  <Gauge className="w-3 h-3 text-[var(--brand-primary)]" />
                  <span>+ Odo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    onOpenBbmModal(k);
                  }}
                  className="flex-1 min-w-[75px] py-1.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/25 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 transition-all active:scale-95 shadow-xs"
                >
                  <Fuel className="w-3 h-3 text-emerald-500" />
                  <span>+ BBM</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    onOpenOliModal(k);
                  }}
                  className="py-1.5 px-2.5 rounded-xl bg-[var(--bg)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                  title="Servis Oli"
                >
                  <Wrench className="w-3 h-3 text-amber-500" />
                  <span>Oli</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    onOpenCuciModal(k);
                  }}
                  className="py-1.5 px-2.5 rounded-xl bg-[var(--bg)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border)] text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                  title="Catat Cuci Mobil"
                >
                  <Sparkles className="w-3 h-3 text-cyan-500" />
                  <span>Cuci</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.click();
                    onOpenInspeksiModal(k);
                  }}
                  className="py-1.5 px-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/25 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 transition-all active:scale-95 shadow-xs"
                  title="Inspeksi Fisik"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Inspeksi</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
