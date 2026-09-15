'use client';

import React from 'react';
import { Kendaraan, HargaBBM, KendaraanLogHarian } from '@/types/database';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { recordPengisianBBM } from '@/lib/actions/kendaraan';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { sound } from '@/lib/sound/SoundFX';
import {
  Fuel,
  TrendingUp,
  CreditCard,
  Banknote,
  Send,
  Loader2,
  Car,
  Calendar,
  Zap,
  CheckCircle2,
  Droplet,
} from 'lucide-react';

interface FleetFuelManagerProps {
  kendaraanList: Kendaraan[];
  hargaBbmList: HargaBBM[];
  logs: KendaraanLogHarian[];
  onRefresh: () => void;
  initialKendaraanId?: string;
}

export function FleetFuelManager({
  kendaraanList,
  hargaBbmList,
  logs,
  onRefresh,
  initialKendaraanId,
}: FleetFuelManagerProps) {
  const [selectedKendaraanId, setSelectedKendaraanId] = React.useState<string>(
    initialKendaraanId || kendaraanList[0]?.id || ''
  );
  const [tanggal, setTanggal] = React.useState<string>(getTodayDateString());
  const [jenisBbm, setJenisBbm] = React.useState<string>('pertalite');
  const [nominal, setNominal] = React.useState<number>(150000);
  const [metodeBayar, setMetodeBayar] = React.useState<'tunai' | 'non_tunai'>('tunai');
  const [catatKeKas, setCatatKeKas] = React.useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Cari harga per liter berdasarkan jenis BBM yang dipilih
  const currentPricePerLiter =
    hargaBbmList.find((b) => b.jenis.toLowerCase() === jenisBbm.toLowerCase())?.harga_per_liter ||
    (jenisBbm === 'pertamax' ? 12950 : jenisBbm === 'solar' ? 6800 : 10000);

  // Kalkulasi liter otomatis
  const estimatedLiter = (nominal / (currentPricePerLiter || 10000)).toFixed(2);

  // Filter log yang memiliki pengisian BBM
  const bbmLogs = logs.filter(
    (l) => (l.bbm_nominal && l.bbm_nominal > 0) || (l.bbm_liter && Number(l.bbm_liter) > 0)
  );

  // Hitung total metrik bulan ini
  const totalBiayaBbmBulanIni = bbmLogs.reduce((sum, l) => sum + (l.bbm_nominal || 0), 0);
  const totalLiterBbmBulanIni = bbmLogs.reduce((sum, l) => sum + (Number(l.bbm_liter) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKendaraanId || nominal <= 0) return;

    try {
      setIsSubmitting(true);
      sound.click();

      const res = await recordPengisianBBM(
        selectedKendaraanId,
        tanggal,
        jenisBbm,
        nominal,
        currentPricePerLiter,
        metodeBayar,
        catatKeKas
      );

      if (res.success) {
        sound.pop();
        setNominal(150000);
        onRefresh();
      } else {
        alert(res.error || 'Gagal mencatat pengisian BBM');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Metrik Ringkas BBM */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="card-container p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">
            <Fuel className="w-3.5 h-3.5 text-emerald-500" />
            <span>Total Pengisian</span>
          </div>
          <div className="text-base font-black font-mono tracking-tight text-[var(--text-primary)] truncate">
            {formatRupiah(totalBiayaBbmBulanIni)}
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">Periode bulan berjalan</p>
        </div>

        <div className="card-container p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">
            <Droplet className="w-3.5 h-3.5 text-cyan-500" />
            <span>Volume Terisi</span>
          </div>
          <div className="text-base font-black font-mono tracking-tight text-[var(--text-primary)] truncate">
            {totalLiterBbmBulanIni.toFixed(1)} <span className="text-xs font-bold text-[var(--text-muted)]">Liter</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">Konsumsi energi armada</p>
        </div>
      </div>

      {/* 2. Form Cepat Catat Isi Bensin */}
      <div className="card-container bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Fuel className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
              Catat Pengisian Bensin
            </h3>
            <p className="text-[10px] text-[var(--text-muted)]">Sinkronisasi otomatis ke buku kas armada</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row: Armada & Tanggal */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Pilih Armada
              </label>
              <select
                value={selectedKendaraanId}
                onChange={(e) => setSelectedKendaraanId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                required
              >
                {kendaraanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.plat_nomor} — {k.nama_kendaraan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Tanggal Isi
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Jenis BBM Selector Chips */}
          <div>
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1.5">
              Jenis Bahan Bakar
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'pertalite', label: 'Pertalite', price: 10000 },
                { id: 'pertamax', label: 'Pertamax', price: 12950 },
                { id: 'solar', label: 'Solar / Dex', price: 6800 },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    sound.click();
                    setJenisBbm(b.id);
                  }}
                  className={`p-2 rounded-xl border text-center transition-all active:scale-95 ${
                    jenisBbm === b.id
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs'
                      : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="text-xs font-bold capitalize">{b.label}</div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)]">
                    Rp {b.price.toLocaleString('id-ID')}/L
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input Nominal & Estimasi Liter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-[var(--text-secondary)]">
                Nominal Pembelian
              </label>
              <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Estimasi: {estimatedLiter} Liter
              </span>
            </div>
            <CurrencyInput
              value={nominal}
              onChange={(val) => setNominal(val)}
              className="w-full text-base font-mono font-bold"
              placeholder="Rp 150.000"
            />
          </div>

          {/* Metode Bayar & Toggle Sinkron Kas */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-xl border border-[var(--border)]">
              {(['tunai', 'non_tunai'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    sound.click();
                    setMetodeBayar(m);
                  }}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg capitalize transition-all active:scale-95 ${
                    metodeBayar === m
                      ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {m === 'tunai' ? 'Tunai (Cash)' : 'Transfer / QRIS'}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={catatKeKas}
                onChange={(e) => setCatatKeKas(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] leading-tight">
                Sinkronkan ke Kas Operasional
              </span>
            </label>
          </div>

          {/* Tombol Simpan */}
          <button
            type="submit"
            disabled={isSubmitting || nominal <= 0}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Catat Pengisian BBM ({estimatedLiter} L)</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 3. Riwayat Pengisian BBM */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
          Riwayat Pengisian BBM Terakhir ({bbmLogs.length})
        </h4>

        <div className="space-y-2">
          {bbmLogs.slice(0, 10).map((l) => {
            const car = l.kendaraan || kendaraanList.find((k) => k.id === l.kendaraan_id);
            return (
              <div
                key={l.id}
                className="card-container p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[var(--text-primary)]">
                        {car?.plat_nomor || 'Armada'}
                      </span>
                      <span className="text-[10px] font-bold capitalize px-1.5 py-0.2 bg-black/5 dark:bg-white/5 rounded-md text-[var(--text-secondary)]">
                        {l.bbm_jenis || 'Pertalite'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {formatDateIndo(l.tanggal)} {l.catatan ? `• ${l.catatan}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono font-black text-[var(--text-primary)]">
                    {l.bbm_nominal ? formatRupiah(l.bbm_nominal) : '-'}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {l.bbm_liter ? `${l.bbm_liter} L` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
