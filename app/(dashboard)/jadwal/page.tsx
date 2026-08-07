'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { JadwalSesi, Staff, SlotWaktu, Siswa } from '@/types/database';
import {
  getJadwalByTanggal,
  getJadwalByBulan,
  upsertJadwalBatch,
  updateSesiProgress,
  deleteJadwalSesi,
  generateWhatsAppScheduleText,
} from '@/lib/actions/jadwal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getInstrukturList, getSlotWaktuList } from '@/lib/actions/master-data';
import { getSiswaList } from '@/lib/actions/siswa';
import { getTodayDateString, formatDateIndo } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { Calendar, Copy, Check, Plus, Eye, Trash2, CalendarDays, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Sparkles } from 'lucide-react';
import Link from 'next/link';

const DAY_NAMES = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const DAY_NAMES_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
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
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Copy WA State
  const [copied, setCopied] = React.useState(false);
  const [isCopyWAModalOpen, setIsCopyWAModalOpen] = React.useState(false);
  const [waDateTarget, setWaDateTarget] = React.useState<string>(getTodayDateString());

  // Big Calendar State
  const [isBigCalendarOpen, setIsBigCalendarOpen] = React.useState(false);
  const [calCurrentYear, setCalCurrentYear] = React.useState(new Date().getFullYear());
  const [calCurrentMonth, setCalCurrentMonth] = React.useState(new Date().getMonth());
  const [monthlyJadwalList, setMonthlyJadwalList] = React.useState<JadwalSesi[]>([]);

  // Modal Progress Sesi State
  const [progressModalJadwal, setProgressModalJadwal] = React.useState<JadwalSesi | null>(null);
  const [progressSesiKe, setProgressSesiKe] = React.useState<number>(1);
  const [progressTanggal, setProgressTanggal] = React.useState<string>(getTodayDateString());

  // Modal Tambah Jadwal Baru State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<JadwalSesi>>({
    tanggal_sesi: getTodayDateString(),
    jenis_mobil: 'manual',
    total_sesi_paket: 10,
    status_sesi: 'terjadwal',
  });
  const [sessionDates, setSessionDates] = React.useState<string[]>([]);

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
    if (swList.length > 0 && !formData.slot_waktu_id) {
      setFormData((prev) => ({ ...prev, slot_waktu_id: swList[0].id }));
    }

    setLoading(false);
  };

  React.useEffect(() => {
    loadData();
  }, [selectedTanggal, selectedStaff]);

  React.useEffect(() => {
    if (isBigCalendarOpen) {
      getJadwalByBulan(calCurrentYear, calCurrentMonth).then((res) => {
        setMonthlyJadwalList(res);
      });
    }
  }, [isBigCalendarOpen, calCurrentYear, calCurrentMonth]);

  // --- FILTER SISWA YANG BELUM TERJADWAL DI TANGGAL INI ---
  const scheduledSiswaIds = React.useMemo(() => {
    return jadwalList.filter((j) => j.status_sesi !== 'batal').map((j) => j.siswa_id);
  }, [jadwalList]);

  // Group schedule list: 1 row PER STUDENT in main table view
  const displayJadwalList = React.useMemo(() => {
    const studentMap = new Map<string, JadwalSesi>();

    jadwalList.forEach((item) => {
      const key = item.siswa_id || item.id;
      if (!studentMap.has(key)) {
        studentMap.set(key, item);
      } else {
        const existing = studentMap.get(key)!;
        // Prioritize active scheduled session or latest session progress over completed ones
        if (existing.status_sesi === 'selesai' && item.status_sesi === 'terjadwal') {
          studentMap.set(key, item);
        } else if (item.nomor_sesi_ke > existing.nomor_sesi_ke && item.status_sesi !== 'batal') {
          studentMap.set(key, item);
        }
      }
    });

    return Array.from(studentMap.values());
  }, [jadwalList]);

  const availableSiswaList = React.useMemo(() => {
    return siswaList.filter((s) => !scheduledSiswaIds.includes(s.id));
  }, [siswaList, scheduledSiswaIds]);

  // Generate multi-date array for N sessions
  const generateDatesForCount = (count: number, startDateStr: string) => {
    const dates: string[] = [];
    const baseDate = new Date(startDateStr);
    for (let i = 0; i < count; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  };

  // Smart Instructor Slot Validation & Collision Detection (Per-Day Flexible Slot Matrix)
  const getSlotValidationStatus = React.useCallback(
    (dateStr: string, staffId: string, slotId: string) => {
      if (!dateStr || !staffId || !slotId) return { status: 'available', message: 'Tersedia' };

      const dateObj = new Date(dateStr);
      const dayNameEng = DAY_NAMES[dateObj.getDay()];
      const selectedIns = instrukturList.find((i) => i.id === staffId);

      // 1. Check Hari Kerja & Slot Ketersediaan Instruktur Per Hari
      const daySlots =
        selectedIns?.jadwal_ketersediaan?.[dayNameEng] ||
        (selectedIns?.hari_kerja?.includes(dayNameEng)
          ? selectedIns?.slot_kerja || ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6']
          : []);

      if (!selectedIns?.hari_kerja?.includes(dayNameEng) || daySlots.length === 0) {
        return {
          status: 'off',
          message: `${selectedIns?.nama || 'Instruktur'} Libur (Off) pada hari ${DAY_NAMES_INDO[dateObj.getDay()]}`,
        };
      }

      if (!daySlots.includes(slotId)) {
        return {
          status: 'off',
          message: `${selectedIns?.nama} tidak aktif di slot ini pada hari ${DAY_NAMES_INDO[dateObj.getDay()]}`,
        };
      }

      // 2. Check Double Booking Slot Collision
      const conflict = monthlyJadwalList.find(
        (j) =>
          j.staff_id === staffId &&
          j.slot_waktu_id === slotId &&
          j.tanggal_sesi === dateStr &&
          j.status_sesi !== 'batal'
      );

      if (conflict) {
        return {
          status: 'conflict',
          message: `Slot terisi oleh ${conflict.siswa?.nama || 'Siswa lain'}`,
          studentName: conflict.siswa?.nama,
        };
      }

      return { status: 'available', message: 'Slot Available (Bebas Bentrok)' };
    },
    [instrukturList, monthlyJadwalList]
  );

  // Auto Adjust Dates: Find N valid dates without collision / off days
  const handleAutoAdjustDates = () => {
    if (!formData.staff_id || !formData.slot_waktu_id) return;
    const count = sessionDates.length || 10;
    const validDates: string[] = [];
    let currDate = new Date(selectedTanggal);

    while (validDates.length < count) {
      const dateStr = currDate.toISOString().slice(0, 10);
      const check = getSlotValidationStatus(dateStr, formData.staff_id, formData.slot_waktu_id);

      if (check.status === 'available') {
        validDates.push(dateStr);
      }
      currDate.setDate(currDate.getDate() + 1);
    }

    setSessionDates(validDates);
  };

  // Handle student selection change in Add Modal
  const handleSiswaSelect = (siswaId: string) => {
    const sObj = siswaList.find((s) => s.id === siswaId);
    const totalSesi = sObj?.paket?.jumlah_sesi || 10;
    const dates = generateDatesForCount(totalSesi, selectedTanggal);

    setFormData((prev) => ({
      ...prev,
      siswa_id: siswaId,
      total_sesi_paket: totalSesi,
    }));
    setSessionDates(dates);
  };

  const handleOpenAddModal = () => {
    const firstAvail = availableSiswaList[0];
    const firstIns = instrukturList[0];
    const firstSlot = slotList[0];
    const totalSesi = firstAvail?.paket?.jumlah_sesi || 10;
    const dates = generateDatesForCount(totalSesi, selectedTanggal);

    setFormData({
      tanggal_sesi: selectedTanggal,
      siswa_id: firstAvail?.id || '',
      staff_id: firstIns?.id || '',
      slot_waktu_id: firstSlot?.id || '',
      jenis_mobil: 'manual',
      total_sesi_paket: totalSesi,
      status_sesi: 'terjadwal',
    });
    setSessionDates(dates);
    setIsModalOpen(true);
  };

  // Handle Open Progress Modal
  const handleOpenProgressModal = (jadwal: JadwalSesi) => {
    setProgressModalJadwal(jadwal);
    setProgressSesiKe(jadwal.nomor_sesi_ke || 1);
    setProgressTanggal(jadwal.tanggal_sesi || getTodayDateString());
  };

  // Save Progress Action
  const handleSaveProgressStatus = async (status: 'selesai' | 'batal' | 'terjadwal') => {
    if (!progressModalJadwal || !progressModalJadwal.siswa_id) return;

    await updateSesiProgress(
      progressModalJadwal.siswa_id,
      progressSesiKe,
      progressTanggal,
      status
    );

    setProgressModalJadwal(null);
    loadData();
  };

  const handleCopyWA = () => {
    setWaDateTarget(selectedTanggal);
    setIsCopyWAModalOpen(true);
  };

  // Submit Multi-Date Schedule Batch
  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.siswa_id || !formData.staff_id || !formData.slot_waktu_id) {
      alert('Mohon pilih Siswa, Instruktur, dan Slot Waktu!');
      return;
    }

    const hasConflictOrOff = sessionDates.some(
      (d) =>
        getSlotValidationStatus(d, formData.staff_id || '', formData.slot_waktu_id || '').status !==
        'available'
    );

    if (hasConflictOrOff) {
      alert(
        'Terdapat tanggal sesi yang bentrok atau di luar hari kerja instruktur. Silakan klik tombol "Auto-Adjust Tanggal Bebas Bentrok" untuk menyesuaikan tanggal secara otomatis.'
      );
      return;
    }

    const batchPayloads: Partial<JadwalSesi>[] = sessionDates.map((tgl, idx) => ({
      siswa_id: formData.siswa_id,
      staff_id: formData.staff_id,
      slot_waktu_id: formData.slot_waktu_id,
      jenis_mobil: formData.jenis_mobil || 'manual',
      tanggal_sesi: tgl,
      nomor_sesi_ke: idx + 1,
      total_sesi_paket: sessionDates.length,
      status_sesi: 'terjadwal',
    }));

    await upsertJadwalBatch(batchPayloads);
    setIsModalOpen(false);
    loadData();
  };

  const selectedSiswaObj = siswaList.find((s) => s.id === formData.siswa_id);
  const isCustomPaket = selectedSiswaObj?.paket?.is_custom === true;

  const columns: ColumnDef<JadwalSesi>[] = [
    {
      accessorKey: 'tanggal_sesi',
      header: 'Tanggal Sesi',
      cell: ({ row }) => formatDateIndo(row.original.tanggal_sesi),
    },
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
      cell: ({ row }) => `Sesi ${row.original.nomor_sesi_ke} dari ${row.original.total_sesi_paket}`,
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenProgressModal(row.original)}
            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold flex items-center gap-1"
            title="Update Progress Sesi per Siswa"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Progress</span>
          </button>

          <Link
            href={`/jadwal/${row.original.id}`}
            className="p-1 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] rounded"
            title="Lihat Detail"
          >
            <Eye className="w-4 h-4" />
          </Link>

          <button
            onClick={() => setDeletingId(row.original.id)}
            className="p-1 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
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
              onClick={handleOpenAddModal}
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
          Total Siswa Terjadwal: <span className="font-bold text-[var(--text-primary)]">{displayJadwalList.length} Siswa</span>
        </div>
      </div>

      {/* Table */}
      <div className="card-container">
        {loading ? (
          <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={displayJadwalList} searchKey="jadwal" />
        )}
      </div>

      {/* MODAL UPDATE PROGRESS SESI PER SISWA */}
      {progressModalJadwal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-lg space-y-4 text-xs">
            <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Update Progress Sesi per Siswa
            </h3>

            <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-md space-y-1">
              <p className="font-bold text-[var(--brand-primary)]">
                {progressModalJadwal.siswa?.nama} ({progressModalJadwal.siswa?.kode_siswa})
              </p>
              <p className="text-[var(--text-secondary)]">
                Paket: <span className="font-semibold text-[var(--text-primary)]">{progressModalJadwal.siswa?.paket?.nama_paket || 'Paket Sesi'}</span> ({progressModalJadwal.total_sesi_paket} Sesi Total)
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Pilih Sesi Ke-X *
                </label>
                <select
                  value={progressSesiKe}
                  onChange={(e) => setProgressSesiKe(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] font-bold"
                >
                  {Array.from({ length: progressModalJadwal.total_sesi_paket || 10 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Sesi Ke-{i + 1} dari {progressModalJadwal.total_sesi_paket || 10}
                    </option>
                  ))}
                </select>
              </div>

              <DatePickerWIB
                label="Pilih Tanggal Sesi Ke-X *"
                value={progressTanggal}
                onChange={(val) => setProgressTanggal(val)}
              />

              <div className="pt-2 border-t border-[var(--border)] space-y-2">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  Pilih Status Progress Sesi:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveProgressStatus('selesai')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Selesai (Tandai Sesi Selesai)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveProgressStatus('terjadwal')}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Terjadwal / Ubah Tanggal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveProgressStatus('batal')}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Batal (Tanggal Maju di Big Calendar)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setProgressModalJadwal(null)}
                className="px-4 py-1.5 text-xs font-medium border border-[var(--border)] rounded-md"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH SESI JADWAL BARU (MULTI-DATE PICKER MATRIX) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-xl w-full bg-[var(--bg)] shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
              Tambah Sesi Jadwal Baru (Multi-Tanggal)
            </h3>
            <form onSubmit={handleSubmitBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Pilih Siswa *
                </label>
                {availableSiswaList.length === 0 ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold p-2 bg-rose-50 dark:bg-rose-950/30 rounded border border-rose-200">
                    Seluruh siswa aktif sudah terdaftar jadwal pada tanggal ini ({formatDateIndo(selectedTanggal)}).
                  </p>
                ) : (
                  <select
                    value={formData.siswa_id}
                    onChange={(e) => handleSiswaSelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold"
                  >
                    {availableSiswaList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kode_siswa}) — {s.paket?.nama_paket || 'Paket Sesi'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedSiswaObj && (
                <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-md space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)] font-medium">Paket Kursus:</span>
                    <span className="font-bold text-[var(--brand-primary)]">
                      {selectedSiswaObj.paket?.nama_paket || 'Paket Khusus'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Jumlah Sesi Paket
                    </label>
                    <input
                      type="number"
                      required
                      readOnly={!isCustomPaket}
                      value={sessionDates.length}
                      onChange={(e) => {
                        const count = parseInt(e.target.value) || 1;
                        setSessionDates(generateDatesForCount(count, selectedTanggal));
                      }}
                      className={`w-full px-3 py-1.5 text-xs rounded-md border border-[var(--border)] ${
                        isCustomPaket
                          ? 'bg-[var(--bg)] font-bold text-[var(--text-primary)]'
                          : 'bg-black/5 dark:bg-white/5 font-bold text-[var(--brand-primary)] cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* 2. Pilih Instruktur & Mobil */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Pilih Instruktur Bertugas *
                  </label>
                  <select
                    value={formData.staff_id}
                    onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold"
                  >
                    {instrukturList.map((ins) => (
                      <option key={ins.id} value={ins.id}>
                        {ins.nama} (Instruktur)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Slot Waktu Sesi *
                  </label>
                  <select
                    value={formData.slot_waktu_id}
                    onChange={(e) => setFormData({ ...formData, slot_waktu_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold"
                  >
                    {slotList.map((sw) => (
                      <option key={sw.id} value={sw.id}>
                        {sw.nama_slot} ({sw.jam_mulai.substring(0, 5)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. MULTI-DATE PICKER MATRIX BERDASARKAN TOTAL SESI PAKET */}
              <div className="space-y-2 border-t border-[var(--border)] pt-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[var(--text-primary)]">
                    Setting Tanggal Per Sesi ({sessionDates.length} Sesi Paket) *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoAdjustDates}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Adjust Tanggal Bebas Bentrok</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 border border-[var(--border)] rounded-md bg-[var(--bg-subtle)]">
                  {sessionDates.map((d, idx) => {
                    const check = getSlotValidationStatus(
                      d,
                      formData.staff_id || '',
                      formData.slot_waktu_id || ''
                    );

                    return (
                      <div
                        key={idx}
                        className={`p-2 border rounded-md bg-[var(--bg)] space-y-1 ${
                          check.status === 'conflict'
                            ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20'
                            : check.status === 'off'
                            ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20'
                            : 'border-[var(--border)]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-[var(--brand-primary)]">
                            Sesi {idx + 1}:
                          </span>
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                              check.status === 'available'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : check.status === 'off'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                          >
                            {check.status === 'available'
                              ? '✓ Available'
                              : check.status === 'off'
                              ? '⚪ Libur'
                              : `✕ Bentrok (${check.studentName || 'Terisi'})`}
                          </span>
                        </div>

                        <DatePickerWIB
                          value={d}
                          onChange={(val) => {
                            const newArr = [...sessionDates];
                            newArr[idx] = val;
                            setSessionDates(newArr);
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
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
                  disabled={availableSiswaList.length === 0}
                  className="px-4 py-2 text-xs font-semibold bg-[var(--brand-primary)] text-white rounded-md disabled:opacity-50"
                >
                  Simpan Seluruh Sesi Jadwal ({sessionDates.length} Sesi)
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

                // Filter sessions for this date
                const daySessions = monthlyJadwalList.filter(
                  (j) => j.tanggal_sesi === cellDateStr
                );

                return (
                  <div
                    key={cellDateStr}
                    onClick={() => {
                      setSelectedTanggal(cellDateStr);
                      setIsBigCalendarOpen(false);
                    }}
                    className={`min-h-[110px] p-1.5 rounded-md border cursor-pointer flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-light)] shadow-sm'
                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-[var(--border)] pb-1 mb-1">
                      <span className={`font-bold text-xs ${isSunday ? 'text-rose-600' : 'text-[var(--text-primary)]'}`}>
                        {dayNum}
                      </span>
                      <span className="text-[9px] text-[var(--text-secondary)] font-semibold">
                        {DAY_NAMES[dateObj.getDay()].substring(0, 3).toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1 my-auto">
                      {instrukturList.length === 0 ? (
                        <span className="text-[10px] text-[var(--text-secondary)] italic">Tidak ada instruktur</span>
                      ) : (
                        instrukturList.map((ins) => {
                          const insFirstName = ins.nama.trim().split(' ')[0];
                          const dayNameEng = DAY_NAMES[dateObj.getDay()];
                          const daySlots =
                            ins.jadwal_ketersediaan?.[dayNameEng] ||
                            (ins.hari_kerja?.includes(dayNameEng)
                              ? ins.slot_kerja || ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6']
                              : []);

                          const isOff = !ins.hari_kerja?.includes(dayNameEng) || daySlots.length === 0;

                          if (isOff) {
                            return (
                              <div
                                key={ins.id}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700 truncate"
                                title={`${ins.nama}: Libur Operasional pada hari ${DAY_NAMES_INDO[dateObj.getDay()]}`}
                              >
                                {insFirstName}: Libur
                              </div>
                            );
                          }

                          const maxSlots = daySlots.length;
                          const insSessions = daySessions.filter((j) => j.staff_id === ins.id && j.status_sesi !== 'batal');
                          const bookedCount = insSessions.length;
                          const availCount = Math.max(0, maxSlots - bookedCount);

                          const activeStudentNames = insSessions
                            .map((j) => j.siswa?.nama?.trim().split(' ')[0])
                            .filter(Boolean)
                            .join(', ');

                          if (bookedCount === 0) {
                            return (
                              <div
                                key={ins.id}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 truncate"
                                title={`${ins.nama}: ${maxSlots} Slot Kosong (Tersedia)`}
                              >
                                {insFirstName}: {maxSlots} Slot Avail
                              </div>
                            );
                          } else if (availCount > 0) {
                            return (
                              <div
                                key={ins.id}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900 truncate"
                                title={`${ins.nama}: ${availCount} Slot Kosong (${activeStudentNames})`}
                              >
                                {insFirstName}: {availCount} Avail ({bookedCount}/{maxSlots})
                              </div>
                            );
                          } else {
                            return (
                              <div
                                key={ins.id}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 truncate"
                                title={`${ins.nama}: Penuh (${activeStudentNames})`}
                              >
                                {insFirstName}: Penuh ({bookedCount}/{maxSlots})
                              </div>
                            );
                          }
                        })
                      )}
                    </div>

                    <div className="text-[9px] font-bold text-[var(--brand-primary)] text-center border-t border-[var(--border)] pt-0.5 mt-1">
                      Pilih Tanggal &rarr;
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL COPY WA SCHEDULE DENGAN DATE PICKER */}
      {isCopyWAModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-sm w-full bg-[var(--bg)] shadow-lg space-y-4 text-xs">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
              <Copy className="w-4 h-4 text-emerald-600" />
              Copy WA Schedule (Pilih Tanggal)
            </h3>

            <DatePickerWIB
              label="Pilih Tanggal Jadwal WA *"
              value={waDateTarget}
              onChange={(val) => setWaDateTarget(val)}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsCopyWAModalOpen(false)}
                className="px-3 py-1.5 border border-[var(--border)] rounded-md font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const waText = await generateWhatsAppScheduleText(waDateTarget, selectedStaff);
                  await navigator.clipboard.writeText(waText);
                  setCopied(true);
                  setIsCopyWAModalOpen(false);
                  alert(`Jadwal WA tanggal ${formatDateIndo(waDateTarget)} berhasil disalin ke Clipboard!`);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Markdown WA</span>
              </button>
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
