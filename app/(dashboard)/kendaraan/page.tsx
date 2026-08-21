'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Kendaraan } from '@/types/database';
import { getKendaraanMasterList } from '@/lib/actions/master-data';
import { formatDateIndo } from '@/lib/utils/date';
import { Car, Fuel, Gauge, Wrench, ArrowRight, AlertOctagon } from 'lucide-react';
import Link from 'next/link';

export default function KendaraanPage() {
  const [kendaraanList, setKendaraanList] = React.useState<Kendaraan[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getKendaraanMasterList().then((res) => {
      setKendaraanList(res);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kendaraan Operasional"
        description="Pantau odometer harian, jadwal servis oli, penggantian ban, cuci, dan BBM armada mobil"
        actions={
          <Link
            href="/insiden"
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Pencatatan Insiden</span>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? [1, 2].map((i) => (
              <div key={i} className="h-48 card-container animate-pulse bg-black/5 dark:bg-white/5" />
            ))
          : kendaraanList.map((k) => (
              <div key={k.id} className="card-container flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between border-b border-[var(--border)] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold">
                        <Car className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[var(--text-primary)]">{k.nama_kendaraan}</h3>
                        <p className="text-xs font-bold text-[var(--brand-primary)]">
                          {k.plat_nomor}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-gray-100 dark:bg-gray-800 rounded">
                      {k.tipe_transmisi}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-[var(--text-secondary)]" />
                      <div>
                        <span className="text-[var(--text-secondary)] block">Odometer Terkini</span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {k.status?.odometer_terkini || 0} km
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-[var(--text-secondary)]" />
                      <div>
                        <span className="text-[var(--text-secondary)] block">Oli Terakhir</span>
                        <span className="font-semibold">{formatDateIndo(k.status?.oli_tanggal_terakhir)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 col-span-2">
                      <Fuel className="w-4 h-4 text-[var(--text-secondary)]" />
                      <div>
                        <span className="text-[var(--text-secondary)] block">BBM Terakhir</span>
                        <span className="font-semibold">
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
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[var(--bg-subtle)] hover:bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-xs font-semibold rounded-md border border-[var(--border)] transition-colors"
                >
                  <span>Kelola Status & Log Odometer</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
      </div>
    </div>
  );
}
