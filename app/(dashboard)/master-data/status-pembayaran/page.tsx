'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { StatusPembayaranMaster } from '@/types/database';
import { getStatusPembayaranMaster } from '@/lib/actions/master-data';
import { MasterDataSubNav } from '@/components/master-data/MasterDataSubNav';

export default function MasterStatusPembayaranPage() {
  const [list, setList] = React.useState<StatusPembayaranMaster[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getStatusPembayaranMaster().then((res) => {
      setList(res);
      setLoading(false);
    });
  }, []);

  const columns: ColumnDef<StatusPembayaranMaster>[] = [
    { accessorKey: 'kode', header: 'Kode Status' },
    { accessorKey: 'label', header: 'Label Tampilan' },
    {
      accessorKey: 'warna_badge',
      header: 'Badge Warna',
      cell: ({ row }) => (
        <span
          className="px-2 py-1 text-xs text-white font-bold rounded"
          style={{ backgroundColor: row.original.warna_badge }}
        >
          {row.original.label}
        </span>
      ),
    },
    { accessorKey: 'urutan', header: 'Urutan' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Status Pembayaran"
        description="Daftar status pembayaran siswa (Belum Bayar, DP, Lunas, Batal)"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Status Pembayaran' }]}
      />

      <MasterDataSubNav />
      <div className="card-container">
        {loading ? (
          <div className="h-48 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={list} searchKey="status" />
        )}
      </div>
    </div>
  );
}
