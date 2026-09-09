'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Kendaraan } from '@/types/database';
import { getKendaraanMasterList } from '@/lib/actions/master-data';
import { getGeneralSettings, saveBbmPrices } from '@/lib/actions/settings';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo } from '@/lib/utils/date';
import { KendaraanLogManager } from '@/components/kendaraan/KendaraanLogManager';
import { Car, Fuel, Gauge, Wrench, ArrowRight, AlertOctagon, Settings, Check, Loader2, X, Save } from 'lucide-react';
import Link from 'next/link';

export default function KendaraanPage() {
  const [kendaraanList, setKendaraanList] = React.useState<Kendaraan[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Parameter Harga BBM State
  const [pertalitePrice, setPertalitePrice] = React.useState(10000);
  const [pertamaxPrice, setPertamaxPrice] = React.useState(16300);
  const [isBbmModalOpen, setIsBbmModalOpen] = React.useState(false);
  const [savingBbm, setSavingBbm] = React.useState(false);
  const [bbmSuccess, setBbmSuccess] = React.useState(false);

  const loadKendaraan = React.useCallback(() => {
    getKendaraanMasterList().then((res) => {
      setKendaraanList(res);
      setLoading(false);
    });
    getGeneralSettings().then((genCfg) => {
      if (genCfg.pertalitePrice) setPertalitePrice(genCfg.pertalitePrice);
      if (genCfg.pertamaxPrice) setPertamaxPrice(genCfg.pertamaxPrice);
    });
  }, []);

  React.useEffect(() => {
    loadKendaraan();
  }, [loadKendaraan]);

  const handleSaveBbm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBbm(true);
    setBbmSuccess(false);
    const res = await saveBbmPrices(pertalitePrice, pertamaxPrice);
    setSavingBbm(false);
    if (res.success) {
      setBbmSuccess(true);
      setTimeout(() => {
        setBbmSuccess(false);
        setIsBbmModalOpen(false);
      }, 1200);
    } else {
      alert('Gagal menyimpan harga BBM: ' + res.error);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kendaraan Operasional"
        description="Pantau odometer harian, jadwal servis oli, penggantian ban, cuci, dan BBM armada mobil"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsBbmModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--bg)] hover:bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95"
              title="Atur parameter standar harga BBM literan"
            >
              <Fuel className="w-4 h-4 text-emerald-600" />
              <span>Harga BBM ({formatRupiah(pertalitePrice)} / {formatRupiah(pertamaxPrice)})</span>
            </button>
            <Link
              href="/insiden"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Pencatatan Insiden</span>
            </Link>
          </div>
        }
      />

      {/* Overview Cards of Fleet Vehicles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Car className="w-4 h-4 text-[var(--brand-primary)]" />
            <span>Status Armada Aktif ({kendaraanList.length})</span>
          </h3>
          <Link
            href="/master-data/kendaraan"
            className="text-xs text-[var(--brand-primary)] font-semibold hover:underline inline-flex items-center gap-1"
          >
            <span>Kelola Master Armada</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading
            ? [1, 2].map((i) => (
                <div key={i} className="h-48 card-container animate-pulse bg-black/5 dark:bg-white/5 rounded-2xl" />
              ))
            : kendaraanList.map((k) => (
                <div key={k.id} className="card-container flex flex-col justify-between space-y-4 p-5 hover:border-[var(--brand-primary)] transition-all">
                  <div>
                    <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold">
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-[var(--text-primary)]">{k.nama_kendaraan}</h3>
                          <p className="text-xs font-bold font-mono text-[var(--brand-primary)]">
                            {k.plat_nomor}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-black/5 dark:bg-white/10 rounded-md text-[var(--text-secondary)]">
                        {k.tipe_transmisi}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-[var(--text-secondary)]" />
                        <div>
                          <span className="text-[10px] text-[var(--text-secondary)] block">Odometer Terkini</span>
                          <span className="font-bold font-mono text-[var(--text-primary)]">
                            {(k.status?.odometer_terkini || 0).toLocaleString('id-ID')} km
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-[var(--text-secondary)]" />
                        <div>
                          <span className="text-[10px] text-[var(--text-secondary)] block">Oli Terakhir</span>
                          <span className="font-semibold">{formatDateIndo(k.status?.oli_tanggal_terakhir)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 col-span-2 pt-1 border-t border-[var(--border)]">
                        <Fuel className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[var(--text-secondary)] block">BBM Terakhir</span>
                            {k.status?.bensin_tanggal_terakhir && (
                              <span className="text-[10px] text-[var(--text-secondary)]">
                                {formatDateIndo(k.status.bensin_tanggal_terakhir)}
                              </span>
                            )}
                          </div>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400 truncate block">
                            {k.status?.bensin_nominal_terakhir || k.status?.bensin_liter_terakhir ? (
                              <>
                                {k.status.bensin_jenis_terakhir
                                  ? k.status.bensin_jenis_terakhir.toUpperCase()
                                  : 'BBM'}
                                {k.status.bensin_liter_terakhir ? ` (${k.status.bensin_liter_terakhir} L)` : ''}
                                {k.status.bensin_nominal_terakhir
                                  ? ` • Rp ${Number(k.status.bensin_nominal_terakhir).toLocaleString('id-ID')}`
                                  : ''}
                              </>
                            ) : (
                              '-'
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/kendaraan/${k.id}`}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[var(--bg-subtle)] hover:bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-xs font-bold rounded-xl border border-[var(--border)] transition-colors"
                  >
                    <span>Detail & Servis Mobil</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
        </div>
      </div>

      {/* Full Fleet Log Manager & Interactive Visualizations */}
      {!loading && (
        <KendaraanLogManager
          kendaraanList={kendaraanList}
          onDataChange={loadKendaraan}
        />
      )}

      {/* Modal Dialog: Parameter Standar Harga BBM */}
      {isBbmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    Parameter Harga BBM Literan
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Standar harga per liter untuk pencatatan log armada mobil
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBbmModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBbm} className="space-y-4 text-xs">
              <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl space-y-1">
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Harga ini digunakan sebagai acuan perhitungan otomatis pengeluaran BBM saat instruktur atau staf menginput liter pada catatan log armada.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                    Pertalite (Rp/Liter) *
                  </label>
                  <input
                    type="number"
                    min={1000}
                    value={pertalitePrice}
                    onChange={(e) => setPertalitePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-bold text-sm text-[var(--text-primary)]"
                    required
                  />
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
                    {formatRupiah(pertalitePrice)}
                  </span>
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                    Pertamax (Rp/Liter) *
                  </label>
                  <input
                    type="number"
                    min={1000}
                    value={pertamaxPrice}
                    onChange={(e) => setPertamaxPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-bold text-sm text-[var(--text-primary)]"
                    required
                  />
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
                    {formatRupiah(pertamaxPrice)}
                  </span>
                </div>
              </div>

              {bbmSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 font-bold text-center text-xs flex items-center justify-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4" />
                  <span>Harga BBM berhasil diperbarui!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsBbmModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingBbm}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingBbm ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Harga BBM</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
