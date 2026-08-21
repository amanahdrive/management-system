'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Kendaraan } from '@/types/database';
import { getKendaraanMasterList, upsertKendaraanMaster, deleteKendaraan } from '@/lib/actions/master-data';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Plus, Car, Trash2, Edit2, Eye } from 'lucide-react';
import { MasterDataSubNav } from '@/components/master-data/MasterDataSubNav';
import Link from 'next/link';

export default function MasterKendaraanPage() {
  const [kendaraanList, setKendaraanList] = React.useState<Kendaraan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const [editing, setEditing] = React.useState<Partial<Kendaraan>>({
    nama_kendaraan: '',
    plat_nomor: '',
    tipe_transmisi: 'manual',
    status_pembelian: 'baru',
    tahun_produksi: new Date().getFullYear(),
    tahun_pembelian: new Date().getFullYear(),
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

  const handleOpenAdd = () => {
    setEditing({
      nama_kendaraan: '',
      plat_nomor: '',
      tipe_transmisi: 'manual',
      status_pembelian: 'baru',
      tahun_produksi: new Date().getFullYear(),
      tahun_pembelian: new Date().getFullYear(),
      warna: 'Hitam',
      aktif: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (k: Kendaraan) => {
    setEditing({
      id: k.id,
      nama_kendaraan: k.nama_kendaraan,
      plat_nomor: k.plat_nomor,
      tipe_transmisi: k.tipe_transmisi,
      status_pembelian: k.status_pembelian,
      tahun_produksi: k.tahun_produksi,
      tahun_pembelian: k.tahun_pembelian || k.tahun_produksi,
      warna: k.warna,
      aktif: k.aktif ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await upsertKendaraanMaster(editing);
    setIsSaving(false);
    setIsModalOpen(false);
    loadData();
  };

  const columns: ColumnDef<Kendaraan>[] = [
    {
      accessorKey: 'nama_kendaraan',
      header: 'Nama Mobil',
      sortingFn: 'text',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
          <span className="font-semibold text-[var(--text-primary)]">{row.original.nama_kendaraan}</span>
        </div>
      ),
    },
    {
      accessorKey: 'plat_nomor',
      header: 'Plat Nomor',
      sortingFn: 'alphanumeric',
      cell: ({ row }) => (
        <span className="tabular-num font-bold text-[var(--brand-primary)]">
          {row.original.plat_nomor}
        </span>
      ),
    },
    {
      accessorKey: 'tipe_transmisi',
      header: 'Transmisi',
      sortingFn: 'text',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-xs rounded font-medium ${
            row.original.tipe_transmisi === 'manual'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
              : 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
          }`}
        >
          {row.original.tipe_transmisi === 'manual' ? 'Manual' : 'Automatic (Matic)'}
        </span>
      ),
    },
    { accessorKey: 'warna', header: 'Warna', sortingFn: 'text' },
    {
      id: 'tahun_produksi',
      header: 'Tahun',
      accessorFn: (row) => (row.tahun_produksi ? Number(row.tahun_produksi) : 0),
      sortingFn: 'basic',
      cell: ({ row }) => row.original.tahun_produksi || '-',
    },
    {
      accessorKey: 'status_pembelian',
      header: 'Kondisi Beli',
      sortingFn: 'text',
      cell: ({ row }) => (row.original.status_pembelian === 'baru' ? 'Baru' : 'Second'),
    },
    {
      id: 'aktif',
      header: 'Status',
      accessorFn: (row) => (row.aktif ? 1 : 0),
      sortingFn: 'basic',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-xs rounded font-medium ${
            row.original.aktif
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {row.original.aktif ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/kendaraan/${row.original.id}`}
            className="p-1.5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] rounded transition-colors"
            title="Lihat Log & Detail Operasional Kendaraan"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleOpenEdit(row.original)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors"
            title="Edit Detail Kendaraan"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingId(row.original.id)}
            className="p-1.5 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
            title="Hapus Kendaraan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
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
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Mobil</span>
          </button>
        }
      />

      <MasterDataSubNav />

      <div className="card-container">
        {loading ? (
          <div className="h-48 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={kendaraanList} searchKey="mobil" />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-lg w-full bg-[var(--bg)] shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Car className="w-5 h-5 text-[var(--brand-primary)]" />
                <span>{editing.id ? 'Edit Detail Kendaraan' : 'Tambah Kendaraan Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Nama Kendaraan / Mobil <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Toyota Calya Grey"
                  value={editing.nama_kendaraan || ''}
                  onChange={(e) => setEditing({ ...editing, nama_kendaraan: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Plat Nomor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="BG 1234 XY"
                    value={editing.plat_nomor || ''}
                    onChange={(e) => setEditing({ ...editing, plat_nomor: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm font-semibold uppercase rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Tipe Transmisi
                  </label>
                  <select
                    value={editing.tipe_transmisi}
                    onChange={(e) =>
                      setEditing({ ...editing, tipe_transmisi: e.target.value as any })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                  >
                    <option value="manual">Manual</option>
                    <option value="matic">Automatic (Matic)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Warna Mobil
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Silver Metalik"
                    value={editing.warna || ''}
                    onChange={(e) => setEditing({ ...editing, warna: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Kondisi Saat Beli
                  </label>
                  <select
                    value={editing.status_pembelian || 'baru'}
                    onChange={(e) =>
                      setEditing({ ...editing, status_pembelian: e.target.value as any })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                  >
                    <option value="baru">Baru</option>
                    <option value="second">Second / Bekas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Tahun Produksi
                  </label>
                  <input
                    type="number"
                    min={1990}
                    max={2040}
                    value={editing.tahun_produksi || 2023}
                    onChange={(e) =>
                      setEditing({ ...editing, tahun_produksi: parseInt(e.target.value) || 2023 })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Tahun Pembelian
                  </label>
                  <input
                    type="number"
                    min={1990}
                    max={2040}
                    value={editing.tahun_pembelian || editing.tahun_produksi || 2023}
                    onChange={(e) =>
                      setEditing({ ...editing, tahun_pembelian: parseInt(e.target.value) || 2023 })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Status Operasional
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="aktif_status"
                      checked={editing.aktif === true}
                      onChange={() => setEditing({ ...editing, aktif: true })}
                      className="text-[var(--brand-primary)]"
                    />
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Aktif Digunakan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="aktif_status"
                      checked={editing.aktif === false}
                      onChange={() => setEditing({ ...editing, aktif: false })}
                      className="text-[var(--brand-primary)]"
                    />
                    <span className="text-gray-500">Nonaktif / Perbaikan Total</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-md hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? 'Menyimpan...' : editing.id ? 'Simpan Perubahan' : 'Simpan Mobil'}
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
