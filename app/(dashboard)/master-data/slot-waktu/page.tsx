'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { SlotWaktu } from '@/types/database';
import { getSlotWaktuList, upsertSlotWaktu } from '@/lib/actions/master-data';
import { Edit2 } from 'lucide-react';
import { MasterDataSubNav } from '@/components/master-data/MasterDataSubNav';

export default function MasterSlotWaktuPage() {
  const [slotList, setSlotList] = React.useState<SlotWaktu[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingSlot, setEditingSlot] = React.useState<Partial<SlotWaktu> | null>(null);

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

  const handleOpenEdit = (slot: SlotWaktu) => {
    setEditingSlot(slot);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    await upsertSlotWaktu(editingSlot);
    setIsModalOpen(false);
    loadData();
  };

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
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => (
        <button
          onClick={() => handleOpenEdit(row.original)}
          className="p-1.5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] rounded transition-colors"
          title="Edit Slot Waktu"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      ),
    },
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

      {/* Modal Edit Slot Waktu */}
      {isModalOpen && editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-sm w-full bg-[var(--bg)] shadow-lg space-y-4 text-xs">
            <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
              Edit Slot Waktu — {editingSlot.nama_slot}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-medium text-[var(--text-secondary)] mb-1">
                  Nama Slot
                </label>
                <input
                  type="text"
                  required
                  value={editingSlot.nama_slot || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, nama_slot: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    required
                    value={editingSlot.jam_mulai ? editingSlot.jam_mulai.substring(0, 5) : '09:00'}
                    onChange={(e) => setEditingSlot({ ...editingSlot, jam_mulai: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    required
                    value={editingSlot.jam_selesai ? editingSlot.jam_selesai.substring(0, 5) : '10:30'}
                    onChange={(e) => setEditingSlot({ ...editingSlot, jam_selesai: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[var(--text-secondary)] mb-1">
                  Kategori
                </label>
                <select
                  value={editingSlot.kategori || 'reguler'}
                  onChange={(e) => setEditingSlot({ ...editingSlot, kategori: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                >
                  <option value="reguler">Reguler (Siang / Sore)</option>
                  <option value="malam">Malam</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[var(--brand-primary)] text-white rounded-md"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
