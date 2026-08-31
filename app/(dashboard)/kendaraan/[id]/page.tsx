'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Kendaraan, HargaBBM } from '@/types/database';
import { getKendaraanMasterList } from '@/lib/actions/master-data';
import {
  updateOliKendaraan,
  addBanHistory,
  updateCuciMobil,
  recordPengisianBBM,
  getHargaBBMList,
} from '@/lib/actions/kendaraan';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { KendaraanLogManager } from '@/components/kendaraan/KendaraanLogManager';
import { Gauge, Wrench, Fuel, Sparkles, Disc, ArrowLeft, AlertOctagon } from 'lucide-react';
import Link from 'next/link';

export default function KendaraanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [kendaraan, setKendaraan] = React.useState<Kendaraan | null>(null);
  const [hargaBbmList, setHargaBbmList] = React.useState<HargaBBM[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Modal States for Maintenance
  const [modalType, setModalType] = React.useState<'oli' | 'ban' | 'cuci' | 'bbm' | null>(null);

  // Form Inputs
  const [tanggal, setTanggal] = React.useState(getTodayDateString());
  const [oliKm, setOliKm] = React.useState<number>(35000);
  const [posisiBan, setPosisiBan] = React.useState<'depan_kiri' | 'depan_kanan' | 'belakang_kiri' | 'belakang_kanan' | 'serep'>('depan_kiri');
  const [banKm, setBanKm] = React.useState<number>(35000);
  const [bbmJenis, setBbmJenis] = React.useState<string>('pertalite');
  const [bbmNominal, setBbmNominal] = React.useState<number>(150000);
  const [bbmMetode, setBbmMetode] = React.useState<'tunai' | 'non_tunai'>('tunai');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [kList, bbmList] = await Promise.all([
      getKendaraanMasterList(),
      getHargaBBMList(),
    ]);
    const found = kList.find((k) => k.id === id) || null;
    setKendaraan(found);
    setHargaBbmList(bbmList);
    if (found?.status?.odometer_terkini) {
      setOliKm(found.status.odometer_terkini);
      setBanKm(found.status.odometer_terkini);
    }
    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !kendaraan) {
    return <div className="h-64 card-container animate-pulse bg-black/5 dark:bg-white/5 rounded-2xl" />;
  }

  const selectedHargaBbm = hargaBbmList.find((b) => b.jenis === bbmJenis)?.harga_per_liter || 10000;
  const estimatedLiter = (bbmNominal / selectedHargaBbm).toFixed(2);

  const handleSaveOli = async () => {
    await updateOliKendaraan(kendaraan.id, tanggal, oliKm);
    setModalType(null);
    loadData();
  };

  const handleSaveBan = async () => {
    await addBanHistory({
      kendaraan_id: kendaraan.id,
      posisi_ban: posisiBan,
      tanggal_ganti: tanggal,
      km_saat_ganti: banKm,
      status_beli: 'baru',
    });
    setModalType(null);
    loadData();
  };

  const handleSaveCuci = async () => {
    await updateCuciMobil(kendaraan.id, tanggal);
    setModalType(null);
    loadData();
  };

  const handleSaveBBM = async () => {
    await recordPengisianBBM(kendaraan.id, tanggal, bbmJenis, bbmNominal, selectedHargaBbm, bbmMetode);
    setModalType(null);
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Status & Log Kendaraan — ${kendaraan.nama_kendaraan}`}
        description={`Plat: ${kendaraan.plat_nomor} | Transmisi: ${kendaraan.tipe_transmisi.toUpperCase()} | Warna: ${kendaraan.warna || '-'}`}
        breadcrumbs={[{ label: 'Kendaraan', href: '/kendaraan' }, { label: kendaraan.plat_nomor }]}
        actions={
          <button
            onClick={() => router.push('/kendaraan')}
            className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] rounded-xl text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Armada</span>
          </button>
        }
      />

      {/* Action Quick Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setModalType('oli')}
          className="p-3 card-container hover:border-amber-500 flex flex-col items-center gap-1.5 text-center text-xs font-bold text-amber-700 dark:text-amber-400 transition-all active:scale-95"
        >
          <Wrench className="w-5 h-5" />
          <span>Update Servis Oli</span>
        </button>

        <button
          onClick={() => setModalType('ban')}
          className="p-3 card-container hover:border-blue-500 flex flex-col items-center gap-1.5 text-center text-xs font-bold text-blue-700 dark:text-blue-400 transition-all active:scale-95"
        >
          <Disc className="w-5 h-5" />
          <span>Ganti Ban</span>
        </button>

        <button
          onClick={() => setModalType('cuci')}
          className="p-3 card-container hover:border-cyan-500 flex flex-col items-center gap-1.5 text-center text-xs font-bold text-cyan-700 dark:text-cyan-400 transition-all active:scale-95"
        >
          <Sparkles className="w-5 h-5" />
          <span>Update Cuci</span>
        </button>

        <button
          onClick={() => setModalType('bbm')}
          className="p-3 card-container hover:border-emerald-500 flex flex-col items-center gap-1.5 text-center text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-all active:scale-95"
        >
          <Fuel className="w-5 h-5" />
          <span>Isi BBM Mobil</span>
        </button>

        <Link
          href="/insiden"
          className="p-3 card-container hover:border-rose-500 flex flex-col items-center gap-1.5 text-center text-xs font-bold text-rose-700 dark:text-rose-400 transition-all active:scale-95"
        >
          <AlertOctagon className="w-5 h-5" />
          <span>Log Insiden</span>
        </Link>
      </div>

      {/* Vehicle Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-container space-y-3 p-5">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[var(--brand-primary)]" />
            Odometer & Servis Terkini
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[var(--text-secondary)] block">Odometer Terkini:</span>
              <span className="font-bold text-lg font-mono text-[var(--text-primary)]">
                {(kendaraan.status?.odometer_terkini || 0).toLocaleString('id-ID')} km
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Servis Oli Terakhir:</span>
              <span className="font-bold text-lg font-mono text-[var(--text-primary)]">
                {(kendaraan.status?.oli_km_terakhir || 0).toLocaleString('id-ID')} km
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Tgl Servis Oli:</span>
              <span className="font-semibold">{formatDateIndo(kendaraan.status?.oli_tanggal_terakhir)}</span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Tgl Cuci Terakhir:</span>
              <span className="font-semibold">{formatDateIndo(kendaraan.status?.cuci_tanggal_terakhir)}</span>
            </div>
          </div>
        </div>

        <div className="card-container space-y-3 p-5">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Fuel className="w-4 h-4 text-emerald-600" />
            Pengisian BBM Terakhir
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[var(--text-secondary)] block">Jenis BBM:</span>
              <span className="font-bold uppercase text-[var(--text-primary)]">
                {kendaraan.status?.bensin_jenis_terakhir || '-'}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Volume Terakhir:</span>
              <span className="font-bold text-base font-mono text-[var(--brand-primary)]">
                {kendaraan.status?.bensin_liter_terakhir || 0} Liter
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Nominal Rupiah:</span>
              <span className="font-bold text-base text-emerald-600">
                {formatRupiah(kendaraan.status?.bensin_nominal_terakhir)}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Tanggal Pengisian:</span>
              <span className="font-semibold">{formatDateIndo(kendaraan.status?.bensin_tanggal_terakhir)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Real Log Manager specifically for this vehicle */}
      <KendaraanLogManager
        kendaraanList={[kendaraan]}
        lockedKendaraanId={kendaraan.id}
        onDataChange={loadData}
      />

      {/* Modal Dialogs */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="card-container max-w-sm w-full bg-[var(--bg)] shadow-2xl space-y-4 p-5">
            <h3 className="text-base font-bold text-[var(--text-primary)] capitalize">
              Input {modalType} — {kendaraan.plat_nomor}
            </h3>

            <DatePickerWIB label="Tanggal" value={tanggal} onChange={setTanggal} />

            {modalType === 'oli' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Odometer Saat Ganti Oli (km) *
                </label>
                <input
                  type="number"
                  value={oliKm}
                  onChange={(e) => setOliKm(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono font-bold text-[var(--text-primary)]"
                />
              </div>
            )}

            {modalType === 'ban' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Posisi Ban *
                  </label>
                  <select
                    value={posisiBan}
                    onChange={(e) => setPosisiBan(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-semibold"
                  >
                    <option value="depan_kiri">Depan Kiri</option>
                    <option value="depan_kanan">Depan Kanan</option>
                    <option value="belakang_kiri">Belakang Kiri</option>
                    <option value="belakang_kanan">Belakang Kanan</option>
                    <option value="serep">Ban Serep</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Odometer Saat Ganti (km) *
                  </label>
                  <input
                    type="number"
                    value={banKm}
                    onChange={(e) => setBanKm(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono font-bold text-[var(--text-primary)]"
                  />
                </div>
              </div>
            )}

            {modalType === 'cuci' && (
              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl border border-cyan-200 text-xs text-cyan-900 dark:text-cyan-200">
                Pencatatan tanggal cuci mobil operasional terkini: <strong>{formatDateIndo(tanggal)}</strong>
              </div>
            )}

            {modalType === 'bbm' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Jenis BBM
                  </label>
                  <select
                    value={bbmJenis}
                    onChange={(e) => setBbmJenis(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-semibold"
                  >
                    <option value="pertalite">Pertalite (Rp 10.000 / L)</option>
                    <option value="pertamax">Pertamax (Rp 16.300 / L)</option>
                    <option value="solar">Solar / Dexlite</option>
                  </select>
                </div>

                <CurrencyInput
                  label="Nominal Pembelian Rupiah *"
                  value={bbmNominal}
                  onChange={setBbmNominal}
                />

                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 dark:text-emerald-400">
                  Estimasi Liter: <span className="font-bold">{estimatedLiter} Liter</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Metode Pembayaran Kas *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        bbmMetode === 'tunai'
                          ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bbm_metode"
                        value="tunai"
                        checked={bbmMetode === 'tunai'}
                        onChange={() => setBbmMetode('tunai')}
                        className="sr-only"
                      />
                      <span>Tunai (Kas Fisik)</span>
                    </label>

                    <label
                      className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        bbmMetode === 'non_tunai'
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)]'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bbm_metode"
                        value="non_tunai"
                        checked={bbmMetode === 'non_tunai'}
                        onChange={() => setBbmMetode('non_tunai')}
                        className="sr-only"
                      />
                      <span>Transfer / Debit</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 text-xs font-semibold border border-[var(--border)] rounded-xl hover:bg-[var(--bg-subtle)] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={
                  modalType === 'oli'
                    ? handleSaveOli
                    : modalType === 'ban'
                    ? handleSaveBan
                    : modalType === 'cuci'
                    ? handleSaveCuci
                    : handleSaveBBM
                }
                className="px-5 py-2 text-xs font-bold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl shadow-xs transition-all"
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
