'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { SlotWaktu } from '@/types/database';
import { getSlotWaktuList, upsertSlotWaktu } from '@/lib/actions/master-data';
import { Plus } from 'lucide-react';
import { MasterDataSubNav } from '@/components/master-data/MasterDataSubNav';

export default function MasterSlotWaktuPage() {
  const [slotList, setSlotList] = React.useState<SlotWaktu[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadData = () => {
    setLoading(true);
    getSlotWaktuList().then((res) => {
      setSlotList(res);
      setLoading(false);
    });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const columns: ColumnDef<SlotWaktu>[] = [
    { accessorKey: 'nama_slot', header: 'Nama Slot', sortingFn: 'text' },
    {
      accessorKey: 'jam_mulai',
      header: 'Jam Sesi',
      sortingFn: 'text',
      cell: ({ row }) =>
        `${row.original.jam_mulai.substring(0, 5)} - ${row.original.jam_selesai.substring(0, 5)} WIB`,
    },
    {
      accessorKey: 'kategori',
      header: 'Kategori',
      sortingFn: 'text',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-xs rounded font-medium ${
            row.original.kategori === 'malam'
              ? 'bg-[var(--brand-navy)] text-white'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {row.original.kategori === 'malam' ? 'Slot Malam' : 'Reguler'}
        </span>
      ),
    },
    { accessorKey: 'urutan', header: 'Urutan', sortingFn: 'basic' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data Slot Waktu"
        description="Pengaturan jam slot sesi mengemudi harian"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Slot Waktu' }]}
      />

      <MasterDataSubNav />

      <div className="card-container">
        {loading ? (
          <div className="h-48 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={slotList} searchKey="slot" />
        )}
      </div>
    </div>
  );
}
