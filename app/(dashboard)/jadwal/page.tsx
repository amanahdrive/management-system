'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { JadwalSesi, Staff, SlotWaktu, Paket, Promosi } from '@/types/database';
import { getJadwalByTanggal, upsertJadwalSesi, deleteJadwalSesi, generateWhatsAppScheduleText } from '@/lib/actions/jadwal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getInstrukturList, getSlotWaktuList, getPaketList, getPromosiList } from '@/lib/actions/master-data';
import { getSiswaList } from '@/lib/actions/siswa';
import { getTodayDateString, formatDateIndo } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { Calendar, Copy, Check, Plus, Eye, Trash2, CalendarDays, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const DAY_NAMES = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const MONTH_NAMES_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function JadwalPage() {
  const [selectedTanggal, setSelectedTanggal] = React.useState(getTodayDateString());
  const [selectedStaff, setSelectedStaff] = React.useState('semua');
  const [jadwalList, setJadwalList] = React.useState<JadwalSesi[]>([]);
  const [instrukturList, setInstrukturList] = React.useState<Staff[]>([]);
  const [slotList, setSlotList] = React.useState<SlotWaktu[]>([]);
  const [siswaList, setSiswaList] = React.useState<any[]>([]);
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [promosiList, setPromosiList] = React.useState<Promosi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Copy WA State
  const [copied, setCopied] = React.useState(false);

  // Big Calendar State
  const [isBigCalendarOpen, setIsBigCalendarOpen] = React.useState(false);
  const [calCurrentYear, setCalCurrentYear] = React.useState(new Date().getFullYear());
  const [calCurrentMonth, setCalCurrentMonth] = React.useState(new Date().getMonth());

  // Modal Tambah Jadwal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedPaketId, setSelectedPaketId] = React.useState('');
  const [selectedPromoId, setSelectedPromoId] = React.useState('');
  const [formData, setFormData] = React.useState<Partial<JadwalSesi>>({
    tanggal_sesi: getTodayDateString(),
    jenis_mobil: 'manual',
    nomor_sesi_ke: 1,
    total_sesi_paket: 10,
    status_sesi: 'terjadwal',
  });

  const loadData = async () => {
    setLoading(true);
    const [jList, iList, sList, swList, pkList, prList] = await Promise.all([
      getJadwalByTanggal(selectedTanggal, selectedStaff),
      getInstrukturList(),
      getSiswaList(),
      getSlotWaktuList(),
      getPaketList(),
      getPromosiList(),
    ]);
    setJadwalList(jList);
    setInstrukturList(iList);
    setSiswaList(sList);
    setSlotList(swList);
    setPaketList(pkList);
    setPromosiList(prList);

    if (iList.length > 0 && !formData.staff_id) {
      setFormData((prev) => ({ ...prev, staff_id: iList[0].id }));
    }
    if (sList.length > 0 && !formData.siswa_id) {
      setFormData((prev) => ({ ...prev, siswa_id: sList[0].id }));
    }
    if (swList.length > 0 && !formData.slot_waktu_id) {
      setFormData((prev) => ({ ...prev, slot_waktu_id: swList[0].id }));
    }
    if (pkList.length > 0 && !selectedPaketId) {
      setSelectedPaketId(pkList[0].id);
      setFormData((prev) => ({ ...prev, total_sesi_paket: pkList[0].jumlah_sesi }));
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

  const handlePaketSelectChange = (paketId: string) => {
    setSelectedPaketId(paketId);
    const found = paketList.find((p) => p.id === paketId);
    if (found) {
      setFormData((prev) => ({ ...prev, total_sesi_paket: found.jumlah_sesi }));
    }
  };

  // --- ANTI TABRAKAN LOGIC (COLLISION & AVAILABILITY CHECK) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id || !formData.staff_id || !formData.slot_waktu_id) {
      alert('Mohon lengkapi Siswa, Instruktur, dan Slot Waktu!');
      return;
    }

    const selectedInstruktur = instrukturList.find((i) => i.id === formData.staff_id);
    const selectedSlotObj = slotList.find((sw) => sw.id === formData.slot_waktu_id);
    const dateObj = new Date(selectedTanggal);
    const dayOfWeekStr = DAY_NAMES[dateObj.getDay()];

    // Check 1: Instructor Working Day Check
    if (selectedInstruktur?.hari_kerja && selectedInstruktur.hari_kerja.length > 0) {
      if (!selectedInstruktur.hari_kerja.includes(dayOfWeekStr)) {
        alert(
          `PERINGATAN JADWAL:\nInstruktur ${selectedInstruktur.nama} tidak memiliki jadwal tugas di hari ${dayOfWeekStr.toUpperCase()}!`
        );
        return;
      }
    }

    // Check 2: Instructor Working Slot Check
    if (selectedInstruktur?.slot_kerja && selectedInstruktur.slot_kerja.length > 0) {
      if (!selectedInstruktur.slot_kerja.includes(formData.slot_waktu_id)) {
        alert(
          `PERINGATAN JADWAL:\nInstruktur ${selectedInstruktur.nama} tidak bertugas pada ${selectedSlotObj?.nama_slot || 'slot ini'}!`
        );
        return;
      }
    }

    // Check 3: Anti-Collision (Instructor is ALREADY booked at date + slot)
    const existingInstructorBooking = jadwalList.find(
      (j) =>
        j.staff_id === formData.staff_id &&
        j.slot_waktu_id === formData.slot_waktu_id &&
        j.status_sesi === 'terjadwal' &&
        j.id !== formData.id
    );

    if (existingInstructorBooking) {
      alert(
        `TABRAKAN JADWAL DITOLAK!\nInstruktur ${selectedInstruktur?.nama || 'ini'} SUDAH MENGAMBIL SESI dengan siswa ${existingInstructorBooking.siswa?.nama || ''} pada ${selectedSlotObj?.nama_slot} tanggal ${formatDateIndo(selectedTanggal)}.`
      );
      return;
    }

    // Check 4: Slot capacity check (max 1 student per instructor)
    const sameSlotBookings = jadwalList.filter(
      (j) => j.slot_waktu_id === formData.slot_waktu_id && j.status_sesi === 'terjadwal'
    );
    if (sameSlotBookings.length >= instrukturList.length && instrukturList.length > 0) {
      alert(
        `KAPASITAS SLOT PENUH!\nSlot ${selectedSlotObj?.nama_slot} sudah terisi ${sameSlotBookings.length} siswa (seluruh ${instrukturList.length} instruktur sudah penuh bertugas).`
      );
      return;
    }

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

  // --- BIG CALENDAR HELPER DATA ---
  const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal Sesi Mengemudi"
        description="Kelola plotting sesi harian siswa, slot instruktur, dan kalkulasi anti-tabrakan"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsBigCalendarOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Big Calendar (Bulanan)</span>
            </button>
            <button
              onClick={handleCopyWA}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Copy WA Schedule'}</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Sesi Jadwal</span>
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
              <option value="semua">Semua Instruktur ({instrukturList.length})</option>
              {instrukturList.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-[var(--text-secondary)] font-medium">
          Total Sesi Hari Ini: <span className="font-bold text-[var(--text-primary)]">{jadwalList.length}</span>
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

      {/* Modal Tambah Sesi Jadwal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-lg w-full bg-[var(--bg)] shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
              Tambah Sesi Jadwal Baru
            </h3>
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

              {/* Master Data Paket & Promo Integration */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-md">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Paket Kursus *
                  </label>
                  <select
                    value={selectedPaketId}
                    onChange={(e) => handlePaketSelectChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    {paketList.map((pk) => (
                      <option key={pk.id} value={pk.id}>
                        {pk.nama_paket} ({pk.jumlah_sesi} Sesi)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Promo Campaign
                  </label>
                  <select
                    value={selectedPromoId}
                    onChange={(e) => setSelectedPromoId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    <option value="">Tanpa Promo</option>
                    {promosiList.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.nama_promo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Pilih Instruktur Bertugas *
                </label>
                <select
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                >
                  {instrukturList.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.nama} (Instruktur)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Slot Waktu Sesi *
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
                    readOnly
                    value={formData.total_sesi_paket || 10}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg-subtle)] font-bold text-[var(--brand-primary)]"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Sistem otomatis memvalidasi <b>anti-tabrakan jadwal</b>: instruktur tidak dapat mengajar 2 siswa pada slot waktu yang sama.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
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
                  Simpan Sesi Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Big Calendar (Diagram Kalender Bulanan & Slot Instruktur) */}
      {isBigCalendarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card-container max-w-4xl w-full bg-[var(--bg)] shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Big Calendar — Diagram Slot Kosong Instruktur
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (calCurrentMonth === 0) {
                      setCalCurrentMonth(11);
                      setCalCurrentYear(calCurrentYear - 1);
                    } else {
                      setCalCurrentMonth(calCurrentMonth - 1);
                    }
                  }}
                  className="p-1.5 border border-[var(--border)] rounded hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-[var(--brand-primary)] w-36 text-center">
                  {MONTH_NAMES_INDO[calCurrentMonth]} {calCurrentYear}
                </span>

                <button
                  onClick={() => {
                    if (calCurrentMonth === 11) {
                      setCalCurrentMonth(0);
                      setCalCurrentYear(calCurrentYear + 1);
                    } else {
                      setCalCurrentMonth(calCurrentMonth + 1);
                    }
                  }}
                  className="p-1.5 border border-[var(--border)] rounded hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsBigCalendarOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold border border-[var(--border)] rounded-md ml-4"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Grid Header 7 Hari */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[var(--text-secondary)] border-b border-[var(--border)] pb-2">
              <div className="text-rose-600">Minggu</div>
              <div>Senin</div>
              <div>Selasa</div>
              <div>Rabu</div>
              <div>Kamis</div>
              <div>Jumat</div>
              <div>Sabtu</div>
            </div>

            {/* Grid Days Cells */}
            <div className="grid grid-cols-7 gap-1.5 text-xs">
              {/* Empty padding cells for first week */}
              {Array.from({ length: firstDayIndex }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-24 p-1 rounded bg-[var(--bg-subtle)] opacity-30" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
                const dayNum = dayIdx + 1;
                const mStr = String(calCurrentMonth + 1).padStart(2, '0');
                const dStr = String(dayNum).padStart(2, '0');
                const cellDateStr = `${calCurrentYear}-${mStr}-${dStr}`;

                const isSelected = selectedTanggal === cellDateStr;
                const dateObj = new Date(calCurrentYear, calCurrentMonth, dayNum);
                const isSunday = dateObj.getDay() === 0;

                // Total max available slot per day across active instructors = 6 slots * total active instructors
                const totalActiveInstructors = instrukturList.length || 3;
                const totalMaxSlotPerDay = totalActiveInstructors * 6;

                return (
                  <div
                    key={cellDateStr}
                    onClick={() => {
                      setSelectedTanggal(cellDateStr);
                      setIsBigCalendarOpen(false);
                    }}
                    className={`h-24 p-1.5 rounded-md border cursor-pointer flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-light)]'
                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-xs ${isSunday ? 'text-rose-600' : 'text-[var(--text-primary)]'}`}>
                        {dayNum}
                      </span>
                      <span className="text-[9px] px-1 bg-teal-100 text-teal-800 rounded font-semibold">
                        {totalActiveInstructors} Instruktur
                      </span>
                    </div>

                    <div className="space-y-0.5 my-auto">
                      {instrukturList.slice(0, 3).map((ins) => (
                        <div key={ins.id} className="text-[9px] truncate text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">{ins.nama}:</span> 6 Slot Avail
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 text-center border-t border-[var(--border)] pt-0.5">
                      Pilih Tanggal &rarr;
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog Hapus Sesi */}
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
