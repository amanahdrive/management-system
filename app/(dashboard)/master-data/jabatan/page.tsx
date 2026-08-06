'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Jabatan } from '@/types/database';
import { getJabatanList, upsertJabatan } from '@/lib/actions/master-data';
import { Plus } from 'lucide-react';
import { MasterDataSubNav } from '@/components/master-data/MasterDataSubNav';

export default function MasterJabatanPage() {
  const [jabatanList, setJabatanList] = React.useState<Jabatan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [namaJabatan, setNamaJabatan] = React.useState('');

  const loadData = () => {
    setLoading(true);
    getJabatanList().then((res) => {
      setJabatanList(res);
      setLoading(false);
    });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaJabatan) return;
    await upsertJabatan({ nama_jabatan: namaJabatan, aktif: true });
    setNamaJabatan('');
    setIsModalOpen(false);
    loadData();
  };

  const columns: ColumnDef<Jabatan>[] = [
    { accessorKey: 'nama_jabatan', header: 'Nama Jabatan' },
    {
      accessorKey: 'aktif',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-xs rounded font-medium ${
            row.original.aktif ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.original.aktif ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data Jabatan"
        description="Kelola daftar struktur posisi/jabatan organisasi Amanah Drive"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Jabatan' }]}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)] text-white text-xs font-semibold rounded-md"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jabatan</span>
          </button>
        }
      />

      <MasterDataSubNav />

      <div className="card-container">
        {loading ? (
          <div className="h-48 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={jabatanList} searchKey="jabatan" />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-sm w-full bg-[var(--bg)] shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Tambah Jabatan Baru</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Nama Jabatan
                </label>
                <input
                  type="text"
                  required
                  value={namaJabatan}
                  onChange={(e) => setNamaJabatan(e.target.value)}
                  placeholder="Misal: Operational Coordinator"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
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
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
