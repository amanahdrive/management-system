'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Kendaraan, HargaBBM } from '@/types/database';
import { getKendaraanMasterList } from '@/lib/actions/master-data';
import {
  updateOdometerBasecampLog,
  updateOliKendaraan,
  addBanHistory,
  updateCuciMobil,
  recordPengisianBBM,
  getHargaBBMList,
} from '@/lib/actions/kendaraan';
import { formatRupiah } from '@/lib/utils/currency';
import { getTodayDateString } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Gauge, Wrench, Fuel, Sparkles, Disc, ArrowLeft, Plus } from 'lucide-react';

export default function KendaraanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [kendaraan, setKendaraan] = React.useState<Kendaraan | null>(null);
  const [hargaBbmList, setHargaBbmList] = React.useState<HargaBBM[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Active Tab for Rekap
  const [rekapTab, setRekapTab] = React.useState<'weekly' | 'monthly'>('weekly');

  // Modal States
  const [modalType, setModalType] = React.useState<'odometer' | 'oli' | 'ban' | 'cuci' | 'bbm' | null>(null);

  // Form Inputs
  const [tanggal, setTanggal] = React.useState(getTodayDateString());
  const [outKm, setOutKm] = React.useState<number | undefined>(undefined);
  const [inKm, setInKm] = React.useState<number | undefined>(undefined);
  const [oliKm, setOliKm] = React.useState<number>(35000);
  const [posisiBan, setPosisiBan] = React.useState<'depan_kiri' | 'depan_kanan' | 'belakang_kiri' | 'belakang_kanan' | 'serep'>('depan_kiri');
  const [banKm, setBanKm] = React.useState<number>(35000);
  const [bbmJenis, setBbmJenis] = React.useState<string>('pertalite');
  const [bbmNominal, setBbmNominal] = React.useState<number>(150000);

  const loadData = async () => {
    setLoading(true);
    const [kList, bbmList] = await Promise.all([getKendaraanMasterList(), getHargaBBMList()]);
    const found = kList.find((k) => k.id === id) || kList[0];
    setKendaraan(found);
    setHargaBbmList(bbmList);
    setLoading(false);
  };

  React.useEffect(() => {
    loadData();
  }, [id]);

  if (loading || !kendaraan) {
    return <div className="h-64 card-container animate-pulse bg-black/5 dark:bg-white/5" />;
  }

  const selectedHargaBbm = hargaBbmList.find((b) => b.jenis === bbmJenis)?.harga_per_liter || 10000;
  const estimatedLiter = (bbmNominal / selectedHargaBbm).toFixed(2);

  const handleSaveOdometer = async () => {
    await updateOdometerBasecampLog(kendaraan.id, tanggal, outKm, inKm);
    setModalType(null);
    loadData();
  };

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
    await recordPengisianBBM(kendaraan.id, tanggal, bbmJenis, bbmNominal, selectedHargaBbm);
    setModalType(null);
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Status & Log Kendaraan — ${kendaraan.nama_kendaraan}`}
        description={`Plat: ${kendaraan.plat_nomor} | Transmisi: ${kendaraan.tipe_transmisi.toUpperCase()}`}
        breadcrumbs={[{ label: 'Kendaraan', href: '/kendaraan' }, { label: kendaraan.plat_nomor }]}
        actions={
          <button
            onClick={() => router.push('/kendaraan')}
            className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] rounded-md text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        }
      />

      {/* Action Quick Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setModalType('odometer')}
          className="p-3 card-container hover:border-[var(--brand-primary)] flex flex-col items-center gap-1.5 text-center text-xs font-semibold text-[var(--brand-primary)]"
        >
          <Gauge className="w-5 h-5" />
          <span>Basecamp Out/In</span>
        </button>

        <button
          onClick={() => setModalType('oli')}
          className="p-3 card-container hover:border-[var(--brand-primary)] flex flex-col items-center gap-1.5 text-center text-xs font-semibold text-amber-700 dark:text-amber-400"
        >
          <Wrench className="w-5 h-5" />
          <span>Update Oli</span>
        </button>

        <button
          onClick={() => setModalType('ban')}
          className="p-3 card-container hover:border-[var(--brand-primary)] flex flex-col items-center gap-1.5 text-center text-xs font-semibold text-blue-700 dark:text-blue-400"
        >
          <Disc className="w-5 h-5" />
          <span>Update Ban</span>
        </button>

        <button
          onClick={() => setModalType('cuci')}
          className="p-3 card-container hover:border-[var(--brand-primary)] flex flex-col items-center gap-1.5 text-center text-xs font-semibold text-cyan-700 dark:text-cyan-400"
        >
          <Sparkles className="w-5 h-5" />
          <span>Update Cuci</span>
        </button>

        <button
          onClick={() => setModalType('bbm')}
          className="p-3 card-container hover:border-[var(--brand-primary)] flex flex-col items-center gap-1.5 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-400 col-span-2 sm:col-span-1"
        >
          <Fuel className="w-5 h-5" />
          <span>Isi BBM</span>
        </button>
      </div>

      {/* Vehicle Current Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-container space-y-3">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-[var(--brand-primary)]" />
            Odometer & Servis Terkini
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[var(--text-secondary)] block">Odometer Terkini:</span>
              <span className="font-bold text-base text-[var(--text-primary)]">
                {kendaraan.status?.odometer_terkini || 0} km
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Servis Oli Terakhir:</span>
              <span className="font-bold text-base text-[var(--text-primary)]">
                {kendaraan.status?.oli_km_terakhir || 0} km
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Tgl Servis Oli:</span>
              <span className="font-semibold">{kendaraan.status?.oli_tanggal_terakhir || '-'}</span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Tgl Cuci Terakhir:</span>
              <span className="font-semibold">{kendaraan.status?.cuci_tanggal_terakhir || '-'}</span>
            </div>
          </div>
        </div>

        <div className="card-container space-y-3">
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
              <span className="font-bold text-[var(--brand-primary)]">
                {kendaraan.status?.bensin_liter_terakhir || 0} Liter
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Nominal Rupiah:</span>
              <span className="font-bold text-emerald-600">
                {formatRupiah(kendaraan.status?.bensin_nominal_terakhir)}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Tanggal Pengisian:</span>
              <span className="font-semibold">{kendaraan.status?.bensin_tanggal_terakhir || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Rekap Section (Weekly vs Monthly) */}
      <div className="card-container space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">Rekap Performa & Efisiensi BBM</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRekapTab('weekly')}
              className={`px-3 py-1 text-xs font-semibold rounded-md ${
                rekapTab === 'weekly'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
              }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setRekapTab('monthly')}
              className={`px-3 py-1 text-xs font-semibold rounded-md ${
                rekapTab === 'monthly'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
              }`}
            >
              Bulanan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-[var(--bg-subtle)] rounded-md border border-[var(--border)]">
            <span className="text-[var(--text-secondary)] block">Total Jarak Tempuh</span>
            <span className="font-bold text-base text-[var(--text-primary)]">
              {rekapTab === 'weekly' ? '420 km' : '1.850 km'}
            </span>
          </div>
          <div className="p-3 bg-[var(--bg-subtle)] rounded-md border border-[var(--border)]">
            <span className="text-[var(--text-secondary)] block">Total Sesi Selesai</span>
            <span className="font-bold text-base text-[var(--text-primary)]">
              {rekapTab === 'weekly' ? '18 Sesi' : '72 Sesi'}
            </span>
          </div>
          <div className="p-3 bg-[var(--bg-subtle)] rounded-md border border-[var(--border)]">
            <span className="text-[var(--text-secondary)] block">Total Biaya BBM</span>
            <span className="font-bold text-base text-emerald-600">
              {rekapTab === 'weekly' ? formatRupiah(350000) : formatRupiah(1450000)}
            </span>
          </div>
          <div className="p-3 bg-[var(--bg-subtle)] rounded-md border border-[var(--border)]">
            <span className="text-[var(--text-secondary)] block">Rasio Efisiensi</span>
            <span className="font-bold text-base text-[var(--brand-primary)]">
              {rekapTab === 'weekly' ? '12,0 km/L' : '12,7 km/L'}
            </span>
          </div>
        </div>
      </div>

      {/* Modal Dialogs */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-sm w-full bg-[var(--bg)] shadow-lg space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] capitalize">
              Input {modalType} — {kendaraan.plat_nomor}
            </h3>

            <DatePickerWIB label="Tanggal" value={tanggal} onChange={setTanggal} />

            {modalType === 'odometer' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Odometer Basecamp Out (km)
                  </label>
                  <input
                    type="number"
                    value={outKm || ''}
                    onChange={(e) => setOutKm(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Odometer Basecamp In (km)
                  </label>
                  <input
                    type="number"
                    value={inKm || ''}
                    onChange={(e) => setInKm(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>
              </div>
            )}

            {modalType === 'oli' && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Odometer Saat Ganti Oli (km)
                </label>
                <input
                  type="number"
                  value={oliKm}
                  onChange={(e) => setOliKm(parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>
            )}

            {modalType === 'ban' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Posisi Ban
                  </label>
                  <select
                    value={posisiBan}
                    onChange={(e) => setPosisiBan(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    <option value="depan_kiri">Depan Kiri</option>
                    <option value="depan_kanan">Depan Kanan</option>
                    <option value="belakang_kiri">Belakang Kiri</option>
                    <option value="belakang_kanan">Belakang Kanan</option>
                    <option value="serep">Ban Serep</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Odometer Saat Ganti (km)
                  </label>
                  <input
                    type="number"
                    value={banKm}
                    onChange={(e) => setBanKm(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>
              </div>
            )}

            {modalType === 'bbm' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Jenis BBM
                  </label>
                  <select
                    value={bbmJenis}
                    onChange={(e) => setBbmJenis(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    <option value="pertalite">Pertalite (Rp 10.000 / L)</option>
                    <option value="pertamax">Pertamax (Rp 16.300 / L)</option>
                  </select>
                </div>

                <CurrencyInput
                  label="Nominal Pembelian Rupiah *"
                  value={bbmNominal}
                  onChange={setBbmNominal}
                />

                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-md text-xs font-medium text-emerald-800 dark:text-emerald-400">
                  Estimasi Liter: <span className="font-bold">{estimatedLiter} Liter</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-md"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={
                  modalType === 'odometer'
                    ? handleSaveOdometer
                    : modalType === 'oli'
                    ? handleSaveOli
                    : modalType === 'ban'
                    ? handleSaveBan
                    : modalType === 'cuci'
                    ? handleSaveCuci
                    : handleSaveBBM
                }
                className="px-4 py-2 text-xs font-semibold bg-[var(--brand-primary)] text-white rounded-md"
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
