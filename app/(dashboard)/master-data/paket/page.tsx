'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Paket } from '@/types/database';
import { getPaketList, upsertPaket } from '@/lib/actions/master-data';
import { formatRupiah } from '@/lib/utils/currency';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Plus, Edit2 } from 'lucide-react';

import { MasterDataSubNav } from '@/components/master-data/MasterDataSubNav';

export default function MasterPaketPage() {
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Form State
  const [editingPaket, setEditingPaket] = React.useState<Partial<Paket> | null>(null);

  const loadData = () => {
    setLoading(true);
    getPaketList().then((res) => {
      setPaketList(res);
      setLoading(false);
    });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingPaket({
      nama_paket: '',
      jumlah_sesi: 5,
      termasuk_sim: false,
      harga_normal: 0,
      harga_promo: null,
      jenis_mobil: ['manual', 'matic'],
      is_custom: false,
      aktif: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (paket: Paket) => {
    setEditingPaket(paket);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaket?.nama_paket) return;

    await upsertPaket(editingPaket);
    setIsModalOpen(false);
    loadData();
  };

  const columns: ColumnDef<Paket>[] = [
    {
      accessorKey: 'nama_paket',
      header: 'Nama Paket',
      cell: ({ row }) => (
        <span className="font-semibold text-[var(--text-primary)]">
          {row.original.nama_paket}
          {row.original.is_custom && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded">
              Kustom
            </span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'jumlah_sesi',
      header: 'Jumlah Sesi',
      cell: ({ row }) => `${row.original.jumlah_sesi} Sesi`,
    },
    {
      accessorKey: 'termasuk_sim',
      header: 'Fasilitas SIM',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-xs rounded font-medium ${
            row.original.termasuk_sim
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.original.termasuk_sim ? 'Termasuk SIM' : 'Tanpa SIM'}
        </span>
      ),
    },
    {
      accessorKey: 'harga_normal',
      header: 'Harga Normal',
      cell: ({ row }) => formatRupiah(row.original.harga_normal),
    },
    {
      accessorKey: 'harga_promo',
      header: 'Harga Promo',
      cell: ({ row }) => (row.original.harga_promo ? formatRupiah(row.original.harga_promo) : '-'),
    },
    {
      accessorKey: 'jenis_mobil',
      header: 'Opsi Mobil',
      cell: ({ row }) => (row.original.jenis_mobil || []).join(', '),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <button
          onClick={() => handleOpenEdit(row.original)}
          className="p-1 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] rounded"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data Paket Kursus"
        description="Kelola paket belajar mengemudi, jumlah sesi, fasilitas SIM, dan harga"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Paket' }]}
        actions={
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Paket</span>
          </button>
        }
      />

      <MasterDataSubNav />

      <div className="card-container">
        {loading ? (
          <div className="h-48 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={paketList} searchKey="paket" />
        )}
      </div>

      {/* Modal Form Tambah/Edit */}
      {isModalOpen && editingPaket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {editingPaket.id ? 'Edit Paket' : 'Tambah Paket Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Nama Paket
                </label>
                <input
                  type="text"
                  required
                  value={editingPaket.nama_paket || ''}
                  onChange={(e) =>
                    setEditingPaket({ ...editingPaket, nama_paket: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Jumlah Sesi
                  </label>
                  <input
                    type="number"
                    required
                    value={editingPaket.jumlah_sesi || 0}
                    onChange={(e) =>
                      setEditingPaket({ ...editingPaket, jumlah_sesi: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPaket.termasuk_sim || false}
                      onChange={(e) =>
                        setEditingPaket({ ...editingPaket, termasuk_sim: e.target.checked })
                      }
                      className="rounded border-gray-300 text-[var(--brand-primary)]"
                    />
                    <span>Termasuk SIM</span>
                  </label>
                </div>
              </div>

              <CurrencyInput
                label="Harga Normal"
                value={editingPaket.harga_normal}
                onChange={(val) => setEditingPaket({ ...editingPaket, harga_normal: val })}
              />

              <CurrencyInput
                label="Harga Promo (Opsional)"
                value={editingPaket.harga_promo}
                onChange={(val) => setEditingPaket({ ...editingPaket, harga_promo: val || null })}
              />

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
                  Simpan Paket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
