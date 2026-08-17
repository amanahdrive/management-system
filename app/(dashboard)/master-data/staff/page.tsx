'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Staff, Jabatan } from '@/types/database';
import { getStaffList, getJabatanList, upsertStaff } from '@/lib/actions/master-data';
import { Plus, Edit2, Check, Calendar, Clock, Sparkles } from 'lucide-react';
import { MasterDataSubNav } from '@/components/master-data/MasterDataSubNav';

const HARI_OPTIONS = [
  { id: 'senin', label: 'Senin' },
  { id: 'selasa', label: 'Selasa' },
  { id: 'rabu', label: 'Rabu' },
  { id: 'kamis', label: 'Kamis' },
  { id: 'jumat', label: 'Jumat' },
  { id: 'sabtu', label: 'Sabtu' },
  { id: 'minggu', label: 'Minggu' },
];

const SLOT_OPTIONS = [
  { id: 'sl1', label: 'Slot 1 (09:00)' },
  { id: 'sl2', label: 'Slot 2 (11:00)' },
  { id: 'sl3', label: 'Slot 3 (13:30)' },
  { id: 'sl4', label: 'Slot 4 (15:30)' },
  { id: 'sl5', label: 'Slot 5 (18:30)' },
  { id: 'sl6', label: 'Slot 6 (20:15)' },
];

const DEFAULT_JADWAL_KETERSEDIAAN: Record<string, string[]> = {
  senin: ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'],
  selasa: ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'],
  rabu: ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'],
  kamis: ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'],
  jumat: ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'],
  sabtu: ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'],
  minggu: [],
};

export default function MasterStaffPage() {
  const [staffList, setStaffList] = React.useState<Staff[]>([]);
  const [jabatanList, setJabatanList] = React.useState<Jabatan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const [editingStaff, setEditingStaff] = React.useState<Partial<Staff>>({});
  const [selectedJabatanIds, setSelectedJabatanIds] = React.useState<string[]>([]);
  const [jadwalKetersediaan, setJadwalKetersediaan] = React.useState<Record<string, string[]>>(DEFAULT_JADWAL_KETERSEDIAAN);

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
    setJadwalKetersediaan({ ...DEFAULT_JADWAL_KETERSEDIAAN });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setSelectedJabatanIds((staff.jabatan_list || []).map((j) => j.id));

    if (staff.jadwal_ketersediaan && typeof staff.jadwal_ketersediaan === 'object') {
      setJadwalKetersediaan(staff.jadwal_ketersediaan);
    } else {
      // Fallback from staff.hari_kerja & staff.slot_kerja
      const activeHari = staff.hari_kerja || ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
      const activeSlot = staff.slot_kerja || ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'];
      const initial: Record<string, string[]> = {};
      HARI_OPTIONS.forEach((h) => {
        initial[h.id] = activeHari.includes(h.id) ? [...activeSlot] : [];
      });
      setJadwalKetersediaan(initial);
    }

    setIsModalOpen(true);
  };

  const toggleJabatan = (id: string) => {
    setSelectedJabatanIds((prev) =>
      prev.includes(id) ? prev.filter((jId) => jId !== id) : [...prev, id]
    );
  };

  // Toggle active day
  const toggleDayActive = (dayId: string) => {
    setJadwalKetersediaan((prev) => {
      const current = prev[dayId] || [];
      if (current.length > 0) {
        return { ...prev, [dayId]: [] };
      } else {
        return { ...prev, [dayId]: ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'] };
      }
    });
  };

  // Toggle specific slot on a specific day
  const toggleDaySlot = (dayId: string, slotId: string) => {
    setJadwalKetersediaan((prev) => {
      const current = prev[dayId] || [];
      const updated = current.includes(slotId)
        ? current.filter((s) => s !== slotId)
        : [...current, slotId];
      return { ...prev, [dayId]: updated };
    });
  };

  // Set preset slots for a specific day
  const setDayPreset = (dayId: string, slots: string[]) => {
    setJadwalKetersediaan((prev) => ({
      ...prev,
      [dayId]: slots,
    }));
  };

  const isInstrukturSelected = selectedJabatanIds.some(
    (id) => jabatanList.find((j) => j.id === id)?.nama_jabatan === 'Instruktur'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff.nama || selectedJabatanIds.length === 0) return;

    // Calculate active days & all unique slots from jadwalKetersediaan
    const activeDays = Object.keys(jadwalKetersediaan).filter(
      (d) => (jadwalKetersediaan[d] || []).length > 0
    );
    const allSlots = Array.from(new Set(Object.values(jadwalKetersediaan).flat()));

    const payload = {
      ...editingStaff,
      hari_kerja: activeDays,
      slot_kerja: allSlots,
      jadwal_ketersediaan: jadwalKetersediaan,
    };

    const res = await upsertStaff(payload, selectedJabatanIds);
    if (res.success) {
      setIsModalOpen(false);
      loadData();
    } else {
      alert('Gagal menyimpan staff: ' + res.error);
    }
  };

  const columns: ColumnDef<Staff>[] = [
    {
      accessorKey: 'nama',
      header: 'Nama Staff',
      sortingFn: 'text',
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
      id: 'jabatan_list',
      header: 'Jabatan',
      accessorFn: (row) => (row.jabatan_list || []).map((j) => j.nama_jabatan).join(', '),
      sortingFn: 'text',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(row.original.jabatan_list || []).map((j) => (
            <span
              key={j.id}
              className={`px-2 py-0.5 text-[10px] rounded font-medium ${
                j.nama_jabatan === 'Instruktur'
                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
              }`}
            >
              {j.nama_jabatan}
            </span>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'no_whatsapp',
      header: 'No. WhatsApp',
      sortingFn: 'alphanumeric',
    },
    {
      id: 'tahun_bergabung',
      header: 'Tahun Masuk',
      accessorFn: (row) => (row.tahun_bergabung ? Number(row.tahun_bergabung) : 0),
      sortingFn: 'basic',
      cell: ({ row }) => row.original.tahun_bergabung || '-',
    },
    {
      id: 'aktif',
      header: 'Status',
      accessorFn: (row) => (row.aktif ? 1 : 0),
      sortingFn: 'basic',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-xs rounded font-medium ${
            row.original.aktif ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.original.aktif ? 'Aktif' : 'Resign / Nonaktif'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => (
        <button
          onClick={() => handleOpenEdit(row.original)}
          className="p-1 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] rounded"
          title="Edit Staff"
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
            className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
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
          <div className="card-container max-w-2xl w-full bg-[var(--bg)] shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
              {editingStaff.id ? 'Edit Data Staff & Instruktur' : 'Tambah Staff Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Nama Lengkap *
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
                    No. WhatsApp *
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
                    Tahun Bergabung *
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
                    Jabatan Staff (Pilih Minimal 1) *
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

              {/* Section Fleksibel: Ketersediaan Slot per Hari untuk Instruktur */}
              {isInstrukturSelected && (
                <div className="p-3.5 border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/20 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-teal-200 dark:border-teal-900 pb-2">
                    <h4 className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      Jadwal Ketersediaan Slot per Hari (Fleksibel)
                    </h4>
                    <span className="text-[10px] text-teal-700 dark:text-teal-400 italic">
                      Setting slot mandiri per tiap hari
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {HARI_OPTIONS.map((h) => {
                      const daySlots = jadwalKetersediaan[h.id] || [];
                      const isDayActive = daySlots.length > 0;

                      return (
                        <div
                          key={h.id}
                          className={`p-2.5 rounded-lg border transition-all space-y-2 ${
                            isDayActive
                              ? 'bg-[var(--bg)] border-teal-300 dark:border-teal-800 shadow-xs'
                              : 'bg-[var(--bg-subtle)] border-[var(--border)] opacity-60'
                          }`}
                        >
                          {/* Day Header Bar */}
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isDayActive}
                                onChange={() => toggleDayActive(h.id)}
                                className="w-4 h-4 rounded border-[var(--border)] text-teal-600 focus:ring-teal-500"
                              />
                              <span className="text-xs font-bold text-[var(--text-primary)]">
                                {h.label}
                              </span>
                            </label>

                            {isDayActive ? (
                              <div className="flex items-center gap-1 text-[10px]">
                                <span className="font-semibold text-teal-700 dark:text-teal-400 mr-1">
                                  {daySlots.length} Slot Aktif
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setDayPreset(h.id, ['sl1', 'sl2', 'sl3', 'sl4'])}
                                  className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg)] hover:bg-teal-50 dark:hover:bg-teal-950 font-medium"
                                  title="Slot 1-4 (Siang)"
                                >
                                  1–4
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDayPreset(h.id, ['sl5', 'sl6'])}
                                  className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg)] hover:bg-teal-50 dark:hover:bg-teal-950 font-medium"
                                  title="Slot 5-6 (Malam)"
                                >
                                  5–6
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDayPreset(h.id, ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'])}
                                  className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg)] hover:bg-teal-50 dark:hover:bg-teal-950 font-medium"
                                  title="Semua Slot (1-6)"
                                >
                                  Semua
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[var(--text-secondary)] italic">
                                Libur / Tidak Bertugas
                              </span>
                            )}
                          </div>

                          {/* Slot Selector Grid */}
                          {isDayActive && (
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 pt-1 border-t border-[var(--border)]">
                              {SLOT_OPTIONS.map((slot) => {
                                const isSlotSelected = daySlots.includes(slot.id);
                                return (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => toggleDaySlot(h.id, slot.id)}
                                    className={`px-1.5 py-1 rounded text-[10px] font-semibold border transition-all text-center truncate ${
                                      isSlotSelected
                                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                                        : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)] hover:border-teal-500'
                                    }`}
                                  >
                                    {slot.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  disabled={selectedJabatanIds.length === 0}
                  className="px-4 py-2 text-xs font-semibold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-md disabled:opacity-50 transition-colors"
                >
                  Simpan Data Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
