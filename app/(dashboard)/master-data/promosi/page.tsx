'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Promosi } from '@/types/database';
import { getPromosiList, upsertPromosi, deletePromosi } from '@/lib/actions/master-data';
import { formatRupiah } from '@/lib/utils/currency';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { MasterDataSubNav } from '@/components/master-data/MasterDataSubNav';

export default function MasterPromosiPage() {
  const [promosiList, setPromosiList] = React.useState<Promosi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const [editing, setEditing] = React.useState<Partial<Promosi>>({
    nama_promo: '',
    tipe_potongan: 'nominal',
    nilai_potongan: 100000,
    tanggal_mulai: new Date().toISOString().slice(0, 10),
    tanggal_selesai: new Date().toISOString().slice(0, 10),
    aktif: true,
  });

  const loadData = () => {
    setLoading(true);
    getPromosiList().then((res) => {
      setPromosiList(res);
      setLoading(false);
    });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditing({
      nama_promo: '',
      tipe_potongan: 'nominal',
      nilai_potongan: 100000,
      tanggal_mulai: new Date().toISOString().slice(0, 10),
      tanggal_selesai: new Date().toISOString().slice(0, 10),
      aktif: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Promosi) => {
    setEditing({
      id: p.id,
      nama_promo: p.nama_promo,
      tipe_potongan: p.tipe_potongan,
      nilai_potongan: p.nilai_potongan,
      tanggal_mulai: p.tanggal_mulai,
      tanggal_selesai: p.tanggal_selesai,
      aktif: p.aktif ?? true,
    });
    setIsModalOpen(true);
  };

  const handleToggleAktif = async (p: Promosi) => {
    await upsertPromosi({ id: p.id, aktif: !p.aktif });
    loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    await deletePromosi(deletingId);
    setDeletingId(null);
    loadData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing.nama_promo) return;
    await upsertPromosi(editing);
    setIsModalOpen(false);
    loadData();
  };

  const columns: ColumnDef<Promosi>[] = [
    {
      accessorKey: 'nama_promo',
      header: 'Nama Promo',
      sortingFn: 'text',
      cell: ({ row }) => (
        <span className="font-semibold text-[var(--text-primary)]">{row.original.nama_promo}</span>
      ),
    },
    {
      accessorKey: 'tipe_potongan',
      header: 'Tipe Potongan',
      sortingFn: 'text',
      cell: ({ row }) => (row.original.tipe_potongan === 'persen' ? 'Persentase (%)' : 'Nominal (Rp)'),
    },
    {
      accessorKey: 'nilai_potongan',
      header: 'Nilai Potongan',
      sortingFn: 'basic',
      cell: ({ row }) =>
        row.original.tipe_potongan === 'persen'
          ? `${row.original.nilai_potongan}%`
          : formatRupiah(row.original.nilai_potongan),
    },
    { accessorKey: 'tanggal_mulai', header: 'Tanggal Mulai', sortingFn: 'datetime' },
    { accessorKey: 'tanggal_selesai', header: 'Tanggal Selesai', sortingFn: 'datetime' },
    {
      id: 'aktif',
      header: 'Status',
      accessorFn: (row) => (row.aktif ? 1 : 0),
      sortingFn: 'basic',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => handleToggleAktif(row.original)}
          className={`px-2.5 py-0.5 text-xs rounded font-bold cursor-pointer transition-all ${
            row.original.aktif
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:opacity-80'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:opacity-80'
          }`}
          title="Klik untuk mengubah status aktif"
        >
          {row.original.aktif ? 'Aktif' : 'Nonaktif'}
        </button>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenEdit(row.original)}
            className="p-1.5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] rounded transition-colors"
            title="Edit Promo"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingId(row.original.id)}
            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
            title="Hapus Promo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data Promosi & Campaign"
        description="Kelola voucher diskon dan campaign promosi siswa baru"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Promosi' }]}
        actions={
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Promo</span>
          </button>
        }
      />

      <MasterDataSubNav />

      <div className="card-container">
        {loading ? (
          <div className="h-48 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={promosiList} searchKey="promo" />
        )}
      </div>

      {/* Modal Form Tambah / Edit Promo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-lg space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
              {editing.id ? 'Edit Campaign Promo' : 'Tambah Campaign Promo Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-[var(--text-secondary)] mb-1">
                  Nama Promo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Promo Merdeka 17an"
                  value={editing.nama_promo || ''}
                  onChange={(e) => setEditing({ ...editing, nama_promo: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">
                    Tipe Potongan
                  </label>
                  <select
                    value={editing.tipe_potongan}
                    onChange={(e) =>
                      setEditing({ ...editing, tipe_potongan: e.target.value as any })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                  >
                    <option value="nominal">Nominal (Rp)</option>
                    <option value="persen">Persentase (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">
                    Nilai Potongan *
                  </label>
                  <input
                    type="number"
                    required
                    value={editing.nilai_potongan || 0}
                    onChange={(e) =>
                      setEditing({ ...editing, nilai_potongan: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">
                    Tgl Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={editing.tanggal_mulai || ''}
                    onChange={(e) => setEditing({ ...editing, tanggal_mulai: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">
                    Tgl Selesai
                  </label>
                  <input
                    type="date"
                    required
                    value={editing.tanggal_selesai || ''}
                    onChange={(e) => setEditing({ ...editing, tanggal_selesai: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={editing.aktif ?? true}
                    onChange={(e) => setEditing({ ...editing, aktif: e.target.checked })}
                    className="rounded border-gray-300 text-[var(--brand-primary)]"
                  />
                  <span className="font-semibold text-[var(--text-primary)]">Promo Aktif Digunakan</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-md transition-colors"
                >
                  {editing.id ? 'Simpan Perubahan' : 'Simpan Promo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        title="Hapus Campaign Promo"
        description="Apakah Anda yakin ingin menghapus campaign promosi ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus Promo"
        isDanger={true}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}
