'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Promosi } from '@/types/database';
import { getPromosiList, upsertPromosi } from '@/lib/actions/master-data';
import { formatRupiah } from '@/lib/utils/currency';
import { Plus } from 'lucide-react';
import { MasterDataSubNav } from '@/components/master-data/MasterDataSubNav';

export default function MasterPromosiPage() {
  const [promosiList, setPromosiList] = React.useState<Promosi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await upsertPromosi(editing);
    setIsModalOpen(false);
    loadData();
  };

  const columns: ColumnDef<Promosi>[] = [
    { accessorKey: 'nama_promo', header: 'Nama Promo' },
    {
      accessorKey: 'tipe_potongan',
      header: 'Tipe Potongan',
      cell: ({ row }) => (row.original.tipe_potongan === 'persen' ? 'Persentase (%)' : 'Nominal (Rp)'),
    },
    {
      accessorKey: 'nilai_potongan',
      header: 'Nilai Potongan',
      cell: ({ row }) =>
        row.original.tipe_potongan === 'persen'
          ? `${row.original.nilai_potongan}%`
          : formatRupiah(row.original.nilai_potongan),
    },
    { accessorKey: 'tanggal_mulai', header: 'Tanggal Mulai' },
    { accessorKey: 'tanggal_selesai', header: 'Tanggal Selesai' },
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
        title="Master Data Promosi & Campaign"
        description="Kelola voucher diskon dan campaign promosi siswa baru"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Promosi' }]}
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)] text-white text-xs font-semibold rounded-md"
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

      {/* Modal Form Tambah Promo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Tambah Campaign Promo</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Nama Promo
                </label>
                <input
                  type="text"
                  required
                  value={editing.nama_promo || ''}
                  onChange={(e) => setEditing({ ...editing, nama_promo: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Tipe Potongan
                  </label>
                  <select
                    value={editing.tipe_potongan}
                    onChange={(e) =>
                      setEditing({ ...editing, tipe_potongan: e.target.value as any })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    <option value="nominal">Nominal (Rp)</option>
                    <option value="persen">Persentase (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Nilai Potongan
                  </label>
                  <input
                    type="number"
                    required
                    value={editing.nilai_potongan || 0}
                    onChange={(e) =>
                      setEditing({ ...editing, nilai_potongan: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Tgl Mulai
                  </label>
                  <input
                    type="date"
                    required
                    value={editing.tanggal_mulai || ''}
                    onChange={(e) => setEditing({ ...editing, tanggal_mulai: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Tgl Selesai
                  </label>
                  <input
                    type="date"
                    required
                    value={editing.tanggal_selesai || ''}
                    onChange={(e) => setEditing({ ...editing, tanggal_selesai: e.target.value })}
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
                  Simpan Promo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
