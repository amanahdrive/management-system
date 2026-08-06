'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Kendaraan } from '@/types/database';
import { getKendaraanMasterList, upsertKendaraanMaster, deleteKendaraan } from '@/lib/actions/master-data';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Plus, Car, Trash2, Edit2 } from 'lucide-react';

export default function MasterKendaraanPage() {
  const [kendaraanList, setKendaraanList] = React.useState<Kendaraan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const [editing, setEditing] = React.useState<Partial<Kendaraan>>({
    nama_kendaraan: '',
    plat_nomor: '',
    tipe_transmisi: 'manual',
    status_pembelian: 'baru',
    tahun_produksi: 2023,
    tahun_pembelian: 2023,
    warna: 'Hitam',
    aktif: true,
  });

  const loadData = () => {
    setLoading(true);
    getKendaraanMasterList().then((res) => {
      setKendaraanList(res);
      setLoading(false);
    });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertKendaraanMaster(editing);
    setIsModalOpen(false);
    loadData();
  };

  const columns: ColumnDef<Kendaraan>[] = [
    {
      accessorKey: 'nama_kendaraan',
      header: 'Nama Mobil',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-[var(--brand-primary)]" />
          <span className="font-semibold text-[var(--text-primary)]">{row.original.nama_kendaraan}</span>
        </div>
      ),
    },
    { accessorKey: 'plat_nomor', header: 'Plat Nomor' },
    {
      accessorKey: 'tipe_transmisi',
      header: 'Transmisi',
      cell: ({ row }) => (row.original.tipe_transmisi === 'manual' ? 'Manual' : 'Automatic (Matic)'),
    },
    { accessorKey: 'warna', header: 'Warna' },
    { accessorKey: 'tahun_produksi', header: 'Tahun' },
    {
      accessorKey: 'status_pembelian',
      header: 'Kondisi Beli',
      cell: ({ row }) => (row.original.status_pembelian === 'baru' ? 'Baru' : 'Second'),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <button
          onClick={() => setDeletingId(row.original.id)}
          className="p-1.5 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded flex items-center gap-1 text-xs font-semibold"
          title="Hapus Kendaraan"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    await deleteKendaraan(deletingId);
    setDeletingId(null);
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data Kendaraan Operasional"
        description="Kelola armada mobil mengemudi Amanah Drive"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Kendaraan' }]}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)] text-white text-xs font-semibold rounded-md"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Mobil</span>
          </button>
        }
      />

      <div className="card-container">
        {loading ? (
          <div className="h-48 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={kendaraanList} searchKey="mobil" />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Tambah Kendaraan</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Nama Kendaraan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Toyota Calya"
                  value={editing.nama_kendaraan || ''}
                  onChange={(e) => setEditing({ ...editing, nama_kendaraan: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Plat Nomor
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="BG 1234 XY"
                    value={editing.plat_nomor || ''}
                    onChange={(e) => setEditing({ ...editing, plat_nomor: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Transmisi
                  </label>
                  <select
                    value={editing.tipe_transmisi}
                    onChange={(e) =>
                      setEditing({ ...editing, tipe_transmisi: e.target.value as any })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    <option value="manual">Manual</option>
                    <option value="matic">Matic</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Warna
                  </label>
                  <input
                    type="text"
                    value={editing.warna || ''}
                    onChange={(e) => setEditing({ ...editing, warna: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Tahun Produksi
                  </label>
                  <input
                    type="number"
                    value={editing.tahun_produksi || 2023}
                    onChange={(e) =>
                      setEditing({ ...editing, tahun_produksi: parseInt(e.target.value) || 2023 })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>
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
                  Simpan Mobil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Master Kendaraan"
        description="Apakah Anda yakin ingin menghapus mobil ini dari data master? Aksi ini tidak dapat dibatalkan."
        confirmText="Hapus Kendaraan"
        isDanger
      />
    </div>
  );
}
