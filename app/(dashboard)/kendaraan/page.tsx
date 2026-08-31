'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Kendaraan } from '@/types/database';
import { getKendaraanMasterList } from '@/lib/actions/master-data';
import { formatDateIndo } from '@/lib/utils/date';
import { KendaraanLogManager } from '@/components/kendaraan/KendaraanLogManager';
import { Car, Fuel, Gauge, Wrench, ArrowRight, AlertOctagon } from 'lucide-react';
import Link from 'next/link';

export default function KendaraanPage() {
  const [kendaraanList, setKendaraanList] = React.useState<Kendaraan[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadKendaraan = React.useCallback(() => {
    getKendaraanMasterList().then((res) => {
      setKendaraanList(res);
      setLoading(false);
    });
  }, []);

  React.useEffect(() => {
    loadKendaraan();
  }, [loadKendaraan]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kendaraan Operasional"
        description="Pantau odometer harian, jadwal servis oli, penggantian ban, cuci, dan BBM armada mobil"
        actions={
          <Link
            href="/insiden"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Pencatatan Insiden</span>
          </Link>
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
            className="text-xs text-[var(--brand-primary)] font-semibold hover:underline"
          >
            Kelola Master Armada &rarr;
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
                        <Fuel className="w-4 h-4 text-emerald-600" />
                        <div>
                          <span className="text-[10px] text-[var(--text-secondary)] block">BBM Terakhir</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {k.status?.bensin_jenis_terakhir
                              ? `${k.status.bensin_jenis_terakhir.toUpperCase()} (${k.status.bensin_liter_terakhir} L)`
                              : '-'}
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
    </div>
  );
}
