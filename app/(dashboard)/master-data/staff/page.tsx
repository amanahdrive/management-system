'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Staff, Jabatan } from '@/types/database';
import { getStaffList, getJabatanList, upsertStaff } from '@/lib/actions/master-data';
import { Plus, User, Edit2, Check } from 'lucide-react';
import { MasterDataSubNav } from '@/components/master-data/MasterDataSubNav';

export default function MasterStaffPage() {
  const [staffList, setStaffList] = React.useState<Staff[]>([]);
  const [jabatanList, setJabatanList] = React.useState<Jabatan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const [editingStaff, setEditingStaff] = React.useState<Partial<Staff>>({});
  const [selectedJabatanIds, setSelectedJabatanIds] = React.useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    const [stRes, jRes] = await Promise.all([getStaffList(), getJabatanList()]);
    setStaffList(stRes);
    setJabatanList(jRes);
    setLoading(false);
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingStaff({
      nama: '',
      no_whatsapp: '',
      alamat: 'Palembang',
      tahun_bergabung: new Date().getFullYear(),
      aktif: true,
    });
    setSelectedJabatanIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setSelectedJabatanIds((staff.jabatan_list || []).map((j) => j.id));
    setIsModalOpen(true);
  };

  const toggleJabatan = (id: string) => {
    setSelectedJabatanIds((prev) =>
      prev.includes(id) ? prev.filter((jId) => jId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff.nama || selectedJabatanIds.length === 0) return;

    await upsertStaff(editingStaff, selectedJabatanIds);
    setIsModalOpen(false);
    loadData();
  };

  const columns: ColumnDef<Staff>[] = [
    {
      accessorKey: 'nama',
      header: 'Nama Staff',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-xs">
            {row.original.nama.substring(0, 2).toUpperCase()}
          </div>
          <span className="font-semibold text-[var(--text-primary)]">{row.original.nama}</span>
        </div>
      ),
    },
    {
      accessorKey: 'jabatan_list',
      header: 'Jabatan',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.jabatan_list || []).map((j) => (
            <span
              key={j.id}
              className={`px-2 py-0.5 text-[10px] rounded font-medium ${
                j.nama_jabatan === 'Instruktur'
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {j.nama_jabatan}
            </span>
          ))}
        </div>
      ),
    },
    { accessorKey: 'no_whatsapp', header: 'No. WhatsApp' },
    { accessorKey: 'tahun_bergabung', header: 'Tahun Masuk' },
    {
      accessorKey: 'aktif',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-xs rounded font-medium ${
            row.original.aktif ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.original.aktif ? 'Aktif' : 'Resign / Nonaktif'}
        </span>
      ),
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
        title="Master Data Staff & Instruktur"
        description="Kelola seluruh personil Amanah Drive dan penugasan jabatannya"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Staff' }]}
        actions={
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)] text-white text-xs font-semibold rounded-md"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Staff</span>
          </button>
        }
      />

      <MasterDataSubNav />

      <div className="card-container">
        {loading ? (
          <div className="h-48 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={staffList} searchKey="staff" />
        )}
      </div>

      {/* Modal Form Tambah/Edit Staff */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-lg w-full bg-[var(--bg)] shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {editingStaff.id ? 'Edit Data Staff' : 'Tambah Staff Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editingStaff.nama || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, nama: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    No. WhatsApp
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStaff.no_whatsapp || ''}
                    onChange={(e) =>
                      setEditingStaff({ ...editingStaff, no_whatsapp: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Tahun Bergabung
                  </label>
                  <input
                    type="number"
                    required
                    value={editingStaff.tahun_bergabung || 2024}
                    onChange={(e) =>
                      setEditingStaff({
                        ...editingStaff,
                        tahun_bergabung: parseInt(e.target.value) || 2024,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Alamat
                </label>
                <textarea
                  rows={2}
                  value={editingStaff.alamat || ''}
                  onChange={(e) => setEditingStaff({ ...editingStaff, alamat: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              {/* Jabatan Multi-select */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[var(--text-secondary)]">
                    Jabatan Staff (Pilih Minimal 1)
                  </label>
                  {selectedJabatanIds.length === 0 && (
                    <span className="text-[10px] text-[var(--danger)] font-bold">Wajib pilih minimal 1</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 p-3 border border-[var(--border)] rounded-md bg-[var(--bg-subtle)] max-h-48 overflow-y-auto">
                  {jabatanList.length === 0 ? (
                    <p className="text-xs text-[var(--text-secondary)] italic">Memuat master data jabatan...</p>
                  ) : (
                    jabatanList.map((j) => {
                      const isSelected = selectedJabatanIds.includes(j.id);
                      return (
                        <button
                          key={j.id}
                          type="button"
                          onClick={() => toggleJabatan(j.id)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm'
                              : 'bg-[var(--bg)] text-[var(--text-primary)] border-[var(--border)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <div className="w-3.5 h-3.5 border border-gray-400 rounded-sm" />
                          )}
                          <span>{j.nama_jabatan}</span>
                        </button>
                      );
                    })
                  )}
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
                  disabled={selectedJabatanIds.length === 0}
                  className="px-4 py-2 text-xs font-semibold bg-[var(--brand-primary)] text-white rounded-md disabled:opacity-50"
                >
                  Simpan Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
