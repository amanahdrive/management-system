'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { JadwalSesi, Staff, SlotWaktu } from '@/types/database';
import { getJadwalByTanggal, upsertJadwalSesi, deleteJadwalSesi, generateWhatsAppScheduleText } from '@/lib/actions/jadwal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getInstrukturList, getSlotWaktuList } from '@/lib/actions/master-data';
import { getSiswaList } from '@/lib/actions/siswa';
import { getTodayDateString, formatDateIndo } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { Calendar, Copy, Check, Plus, Eye, Car, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function JadwalPage() {
  const [selectedTanggal, setSelectedTanggal] = React.useState(getTodayDateString());
  const [selectedStaff, setSelectedStaff] = React.useState('semua');
  const [jadwalList, setJadwalList] = React.useState<JadwalSesi[]>([]);
  const [instrukturList, setInstrukturList] = React.useState<Staff[]>([]);
  const [slotList, setSlotList] = React.useState<SlotWaktu[]>([]);
  const [siswaList, setSiswaList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Copy WA State
  const [copied, setCopied] = React.useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<JadwalSesi>>({
    tanggal_sesi: getTodayDateString(),
    jenis_mobil: 'manual',
    nomor_sesi_ke: 1,
    total_sesi_paket: 10,
    status_sesi: 'terjadwal',
  });

  const loadData = async () => {
    setLoading(true);
    const [jList, iList, sList, swList] = await Promise.all([
      getJadwalByTanggal(selectedTanggal, selectedStaff),
      getInstrukturList(),
      getSiswaList(),
      getSlotWaktuList(),
    ]);
    setJadwalList(jList);
    setInstrukturList(iList);
    setSiswaList(sList);
    setSlotList(swList);

    if (iList.length > 0 && !formData.staff_id) {
      setFormData((prev) => ({ ...prev, staff_id: iList[0].id }));
    }
    if (sList.length > 0 && !formData.siswa_id) {
      setFormData((prev) => ({ ...prev, siswa_id: sList[0].id }));
    }
    if (swList.length > 0 && !formData.slot_waktu_id) {
      setFormData((prev) => ({ ...prev, slot_waktu_id: swList[0].id }));
    }

    setLoading(false);
  };

  React.useEffect(() => {
    loadData();
  }, [selectedTanggal, selectedStaff]);

  const handleCopyWA = async () => {
    const waText = await generateWhatsAppScheduleText(selectedTanggal, selectedStaff);
    await navigator.clipboard.writeText(waText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id || !formData.staff_id || !formData.slot_waktu_id) return;

    await upsertJadwalSesi({
      ...formData,
      tanggal_sesi: selectedTanggal,
    });
    setIsModalOpen(false);
    loadData();
  };

  const columns: ColumnDef<JadwalSesi>[] = [
    {
      accessorKey: 'siswa',
      header: 'Siswa',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-[var(--text-primary)]">
            {row.original.siswa?.nama || 'Siswa Kustom'}
          </div>
          <div className="text-xs text-[var(--text-secondary)] font-mono">
            {row.original.siswa?.kode_siswa || '-'}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'instruktur',
      header: 'Instruktur',
      cell: ({ row }) => (
        <span className="font-medium text-[var(--brand-primary)]">
          {row.original.instruktur?.nama || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'slot_waktu',
      header: 'Slot Waktu',
      cell: ({ row }) => {
        const slot = row.original.slot_waktu;
        return slot ? `${slot.nama_slot} (${slot.jam_mulai.substring(0, 5)}-${slot.jam_selesai.substring(0, 5)})` : '-';
      },
    },
    {
      accessorKey: 'nomor_sesi_ke',
      header: 'Progress Sesi',
      cell: ({ row }) => `${row.original.nomor_sesi_ke} dari ${row.original.total_sesi_paket}`,
    },
    {
      accessorKey: 'jenis_mobil',
      header: 'Mobil',
      cell: ({ row }) => (
        <span className="uppercase text-xs font-semibold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
          {row.original.jenis_mobil}
        </span>
      ),
    },
    {
      accessorKey: 'status_sesi',
      header: 'Status',
      cell: ({ row }) => {
        const st = row.original.status_sesi;
        return (
          <span
            className={`px-2 py-0.5 text-xs rounded font-bold text-white ${
              st === 'selesai'
                ? 'bg-[var(--success)]'
                : st === 'batal'
                ? 'bg-[var(--danger)]'
                : 'bg-[var(--info)]'
            }`}
          >
            {st === 'terjadwal' ? 'Terjadwal' : st === 'selesai' ? 'Selesai' : 'Batal'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/jadwal/${row.original.id}`}
            className="p-1.5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] rounded flex items-center gap-1 text-xs font-semibold"
          >
            <Eye className="w-4 h-4" />
            <span>Detail</span>
          </Link>
          <button
            onClick={() => setDeletingId(row.original.id)}
            className="p-1.5 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded flex items-center gap-1 text-xs font-semibold"
            title="Hapus Sesi"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    await deleteJadwalSesi(deletingId);
    setDeletingId(null);
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal Sesi Mengemudi"
        description="Kelola plotting sesi harian siswa dan instruktur mengemudi"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyWA}
              className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Copy Jadwal (WA)'}</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Jadwal</span>
            </button>
          </div>
        }
      />

      {/* Date & Instructor Filters Toolbar */}
      <div className="card-container p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="w-48">
            <DatePickerWIB
              label="Pilih Tanggal Sesi"
              value={selectedTanggal}
              onChange={(val) => setSelectedTanggal(val)}
            />
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1 font-medium">Filter Instruktur</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            >
              <option value="semua">Semua Instruktur</option>
              {instrukturList.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-[var(--text-secondary)] font-medium">
          Total Sesi: <span className="font-bold text-[var(--text-primary)]">{jadwalList.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="card-container">
        {loading ? (
          <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={jadwalList} searchKey="jadwal" />
        )}
      </div>

      {/* Modal Tambah Jadwal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-lg space-y-4">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Tambah Jadwal Sesi</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Pilih Siswa *
                </label>
                <select
                  value={formData.siswa_id}
                  onChange={(e) => setFormData({ ...formData, siswa_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                >
                  {siswaList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.kode_siswa})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Pilih Instruktur *
                </label>
                <select
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                >
                  {instrukturList.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Slot Waktu *
                  </label>
                  <select
                    value={formData.slot_waktu_id}
                    onChange={(e) => setFormData({ ...formData, slot_waktu_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    {slotList.map((sw) => (
                      <option key={sw.id} value={sw.id}>
                        {sw.nama_slot} ({sw.jam_mulai.substring(0, 5)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Jenis Mobil
                  </label>
                  <select
                    value={formData.jenis_mobil}
                    onChange={(e) => setFormData({ ...formData, jenis_mobil: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    <option value="manual">Manual</option>
                    <option value="matic">Matic</option>
                    <option value="mobil_sendiri">Mobil Sendiri</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Sesi Ke *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.nomor_sesi_ke || 1}
                    onChange={(e) =>
                      setFormData({ ...formData, nomor_sesi_ke: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Total Sesi Paket
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.total_sesi_paket || 10}
                    onChange={(e) =>
                      setFormData({ ...formData, total_sesi_paket: parseInt(e.target.value) || 10 })
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
                  Simpan Jadwal
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
        title="Hapus Jadwal Sesi"
        description="Apakah Anda yakin ingin menghapus jadwal sesi ini? Aksi ini tidak dapat dibatalkan."
        confirmText="Hapus Sesi"
        isDanger
      />
    </div>
  );
}
