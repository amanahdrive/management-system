'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { JadwalSesi, Staff, SlotWaktu, Siswa } from '@/types/database';
import {
  getJadwalByTanggal,
  getJadwalByBulan,
  getJadwalConflictCheckList,
  upsertJadwalBatch,
  upsertJadwalSesi,
  updateSesiProgress,
  deleteJadwalSesi,
  generateWhatsAppScheduleText,
  generateWhatsAppWeeklyScheduleText,
  generateWhatsAppRecapText,
} from '@/lib/actions/jadwal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { getInstrukturList, getSlotWaktuList } from '@/lib/actions/master-data';
import { getSiswaList } from '@/lib/actions/siswa';
import { getTodayDateString, formatDateIndo } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import {
  Calendar,
  Copy,
  Check,
  Plus,
  Eye,
  Trash2,
  CalendarDays,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Filter,
  X,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

const DAY_NAMES = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const DAY_NAMES_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Timezone-safe local day-of-week resolver:
const getDayIndexFromDateStr = (dateStr: string) => {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length < 3) return 0;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return new Date(y, m, d).getDay(); // 0 = Minggu, 1 = Senin, ... 6 = Sabtu
};

export default function JadwalPage() {
  // ── Filter State ──────────────────────────────────────────
  // filterMode: 'single' | 'range' | 'week' | 'month' | '3month' | '6month' | 'year'
  const [filterMode, setFilterMode] = React.useState<'single' | 'range' | 'week' | 'month' | '3month' | '6month' | 'year'>('single');
  const [selectedTanggal, setSelectedTanggal] = React.useState(getTodayDateString());
  const [dateFrom, setDateFrom] = React.useState(getTodayDateString());
  const [dateTo, setDateTo] = React.useState(getTodayDateString());
  const [selectedStaff, setSelectedStaff] = React.useState('semua');
  const [filterBentrok, setFilterBentrok] = React.useState(false);

  const [jadwalList, setJadwalList] = React.useState<JadwalSesi[]>([]);
  const [instrukturList, setInstrukturList] = React.useState<Staff[]>([]);
  const [slotList, setSlotList] = React.useState<SlotWaktu[]>([]);
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deletingSiswaId, setDeletingSiswaId] = React.useState<string | null>(null);

  // Copy WA State
  const [copied, setCopied] = React.useState(false);
  const [isCopyWAModalOpen, setIsCopyWAModalOpen] = React.useState(false);
  const [waCopyMode, setWaCopyMode] = React.useState<'harian' | 'mingguan' | 'rekap_slot'>('harian');
  const [waDateTarget, setWaDateTarget] = React.useState<string>(getTodayDateString());
  const [waDateFrom, setWaDateFrom] = React.useState<string>(getTodayDateString());
  const [waDateTo, setWaDateTo] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  });
  const [waSelectedStaff, setWaSelectedStaff] = React.useState<string>('semua');
  const [waPreviewText, setWaPreviewText] = React.useState<string>('');
  const [loadingWAPreview, setLoadingWAPreview] = React.useState<boolean>(false);

  // Recap Panel State
  const [recapDate, setRecapDate] = React.useState(getTodayDateString());
  const [recapStaff, setRecapStaff] = React.useState('semua');

  // Big Calendar State
  const [isBigCalendarOpen, setIsBigCalendarOpen] = React.useState(false);
  const [calCurrentYear, setCalCurrentYear] = React.useState(new Date().getFullYear());
  const [calCurrentMonth, setCalCurrentMonth] = React.useState(new Date().getMonth());
  const [monthlyJadwalList, setMonthlyJadwalList] = React.useState<JadwalSesi[]>([]);

  // Modal Progress Sesi State
  const [progressModalJadwal, setProgressModalJadwal] = React.useState<JadwalSesi | null>(null);
  const [progressSesiKe, setProgressSesiKe] = React.useState<number>(1);
  const [progressTanggal, setProgressTanggal] = React.useState<string>(getTodayDateString());
  const [isReschedulingProgress, setIsReschedulingProgress] = React.useState<boolean>(false);
  const [rescheduleTargetDate, setRescheduleTargetDate] = React.useState<string>(getTodayDateString());

  // Modal Tambah Jadwal Baru State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<JadwalSesi>>({
    tanggal_sesi: getTodayDateString(),
    jenis_mobil: 'manual',
    total_sesi_paket: 10,
    status_sesi: 'terjadwal',
  });
  const [sessionDates, setSessionDates] = React.useState<string[]>([]);

  // ── Compute effective date range from filterMode ───────────────────────
  const getEffectiveDateRange = React.useCallback((): { from: string; to: string } => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (filterMode === 'single') return { from: selectedTanggal, to: selectedTanggal };
    if (filterMode === 'range') return { from: dateFrom, to: dateTo };

    // Quick ranges — all start from today
    const daysAgo = (n: number) => { const d = new Date(today); d.setDate(today.getDate() - 0); return d; };
    const daysLater = (n: number) => { const d = new Date(today); d.setDate(today.getDate() + n); return d; };

    if (filterMode === 'week') {
      // This week: Mon-Sun
      const day = today.getDay() === 0 ? 7 : today.getDay();
      const mon = new Date(today); mon.setDate(today.getDate() - day + 1);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: fmt(mon), to: fmt(sun) };
    }
    if (filterMode === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: fmt(start), to: fmt(end) };
    }
    if (filterMode === '3month') return { from: fmt(today), to: fmt(daysLater(90)) };
    if (filterMode === '6month') return { from: fmt(today), to: fmt(daysLater(180)) };
    if (filterMode === 'year') return { from: fmt(today), to: fmt(daysLater(365)) };
    return { from: selectedTanggal, to: selectedTanggal };
  }, [filterMode, selectedTanggal, dateFrom, dateTo]);

  // Comprehensive fresh load — supports single date, date range, and quick period
  const loadData = React.useCallback(async () => {
    setLoading(true);
    const { from, to } = getEffectiveDateRange();

    // Fetch all sessions in the date range
    let jList: JadwalSesi[] = [];
    if (from === to) {
      // Single date — use targeted query
      jList = await getJadwalByTanggal(from, selectedStaff);
    } else {
      // Range — use conflict list filtered by range + staff
      // We reuse monthlyJadwal approach: fetch conflict list which covers 120-day window
      // For ranges beyond that, fallback to conflict check list and filter client-side
      jList = await getJadwalByBulan(
        new Date(from).getFullYear(),
        new Date(from).getMonth()
      );
      // Extend across multiple months if range spans them
      const fromDate = new Date(from);
      const toDate = new Date(to);
      let curYear = fromDate.getFullYear();
      let curMonth = fromDate.getMonth();
      const extraFetches: Promise<JadwalSesi[]>[] = [];

      while (curYear < toDate.getFullYear() || (curYear === toDate.getFullYear() && curMonth < toDate.getMonth())) {
        curMonth++;
        if (curMonth > 11) { curMonth = 0; curYear++; }
        extraFetches.push(getJadwalByBulan(curYear, curMonth));
      }

      if (extraFetches.length > 0) {
        const extras = await Promise.all(extraFetches);
        extras.forEach((e) => { jList = [...jList, ...e]; });
      }

      // Deduplicate by ID
      const seen = new Set<string>();
      jList = jList.filter((j) => { if (seen.has(j.id)) return false; seen.add(j.id); return true; });

      // Filter by date range
      jList = jList.filter((j) => j.tanggal_sesi >= from && j.tanggal_sesi <= to);

      // Filter by staff if not 'semua'
      if (selectedStaff && selectedStaff !== 'semua') {
        jList = jList.filter((j) => j.staff_id === selectedStaff);
      }
    }

    const [iList, sList, swList, mList] = await Promise.all([
      getInstrukturList(),
      getSiswaList(),
      getSlotWaktuList(),
      getJadwalConflictCheckList(),
    ]);

    setJadwalList(jList);
    setInstrukturList(iList);
    setSiswaList(sList);
    setSlotList(swList);
    setMonthlyJadwalList(mList);

    if (iList.length > 0 && !formData.staff_id) {
      setFormData((prev) => ({ ...prev, staff_id: iList[0].id }));
    }
    if (swList.length > 0 && !formData.slot_waktu_id) {
      setFormData((prev) => ({ ...prev, slot_waktu_id: swList[0].id }));
    }

    setLoading(false);
  }, [getEffectiveDateRange, selectedStaff, formData.staff_id, formData.slot_waktu_id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // --- FILTER SISWA YANG BELUM MEMILIKI JADWAL SAMA SEKALI DI SELURUH DATABASE ---
  const allScheduledSiswaIds = React.useMemo(() => {
    return Array.from(
      new Set(
        monthlyJadwalList
          .filter((j) => j.status_sesi !== 'batal')
          .map((j) => j.siswa_id)
          .filter(Boolean)
      )
    );
  }, [monthlyJadwalList]);

  // Group schedule list: show all rows when in range mode, 1-per-student in single date mode
  const displayJadwalList = React.useMemo(() => {
    let list: JadwalSesi[];

    if (filterMode === 'single') {
      // Single date: group 1 row per student
      const studentMap = new Map<string, JadwalSesi>();
      jadwalList.forEach((item) => {
        const key = item.siswa_id || item.id;
        if (!studentMap.has(key)) {
          studentMap.set(key, item);
        } else {
          const existing = studentMap.get(key)!;
          if (existing.status_sesi === 'selesai' && item.status_sesi === 'terjadwal') {
            studentMap.set(key, item);
          } else if (item.nomor_sesi_ke > existing.nomor_sesi_ke && item.status_sesi !== 'batal') {
            studentMap.set(key, item);
          }
        }
      });
      list = Array.from(studentMap.values());
    } else {
      // Range mode: show all individual sessions, sorted by date
      list = [...jadwalList].sort((a, b) => a.tanggal_sesi.localeCompare(b.tanggal_sesi));
    }

    // Filter bentrok: only show sessions with conflict or off-day
    if (filterBentrok) {
      list = list.filter((sesi) => {
        if (!sesi.staff_id || !sesi.slot_waktu_id || sesi.status_sesi === 'batal') return false;
        const dayIdx = (() => {
          const parts = sesi.tanggal_sesi.split('-');
          return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getDay();
        })();
        const dayNames = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
        const dayNameEng = dayNames[dayIdx];
        const ins = instrukturList.find((i) => i.id === sesi.staff_id);
        if (!ins) return false;
        // Off day
        if (!ins.hari_kerja?.includes(dayNameEng)) return true;
        // Slot conflict
        const hasConflict = monthlyJadwalList.some((j) => {
          if (j.id === sesi.id || j.tanggal_sesi !== sesi.tanggal_sesi) return false;
          if (j.status_sesi === 'batal' || j.staff_id !== sesi.staff_id) return false;
          const jSlots = [j.slot_waktu_id, j.slot_waktu_id_akhir].filter(Boolean);
          const mySlots = [sesi.slot_waktu_id, sesi.slot_waktu_id_akhir].filter(Boolean);
          return mySlots.some((s) => jSlots.includes(s));
        });
        return hasConflict;
      });
    }

    return list;
  }, [jadwalList, filterMode, filterBentrok, instrukturList, monthlyJadwalList]);

  const availableSiswaList = React.useMemo(() => {
    return siswaList.filter((s) => !allScheduledSiswaIds.includes(s.id));
  }, [siswaList, allScheduledSiswaIds]);

  // Generate multi-date array for N sessions
  const generateDatesForCount = (count: number, startDateStr: string) => {
    const dates: string[] = [];
    const parts = startDateStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const baseDate = new Date(y, m, d);

    for (let i = 0; i < count; i++) {
      const cur = new Date(baseDate);
      cur.setDate(cur.getDate() + i);
      const curY = cur.getFullYear();
      const curM = String(cur.getMonth() + 1).padStart(2, '0');
      const curD = String(cur.getDate()).padStart(2, '0');
      dates.push(`${curY}-${curM}-${curD}`);
    }
    return dates;
  };

  // Smart Instructor Slot Validation & Collision Detection (Per-Day Flexible Slot Matrix)
  const getSlotValidationStatus = React.useCallback(
    (dateStr: string, staffId: string, slotId: string, slotIdAkhir?: string | null, excludeId?: string) => {
      if (!dateStr || !staffId || !slotId) return { status: 'available', message: 'Tersedia' };

      const dayIdx = getDayIndexFromDateStr(dateStr);
      const dayNameEng = DAY_NAMES[dayIdx];
      const selectedIns = instrukturList.find((i) => i.id === staffId);

      const checkSingleSlot = (sId: string) => {
        const daySlots =
          selectedIns?.jadwal_ketersediaan?.[dayNameEng] ||
          (selectedIns?.hari_kerja?.includes(dayNameEng)
            ? selectedIns?.slot_kerja || ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6']
            : []);

        if (!selectedIns?.hari_kerja?.includes(dayNameEng) || daySlots.length === 0) {
          return {
            status: 'off',
            message: `${selectedIns?.nama || 'Instruktur'} Libur pada hari ${DAY_NAMES_INDO[dayIdx]}`,
          };
        }

        const slotObj = slotList.find((s) => s.id === sId);
        let mappedSlotCode = sId;
        if (slotObj) {
          if (slotObj.urutan === 1) mappedSlotCode = 'sl1';
          else if (slotObj.urutan === 2) mappedSlotCode = 'sl2';
          else if (slotObj.urutan === 3) mappedSlotCode = 'sl3';
          else if (slotObj.urutan === 4) mappedSlotCode = 'sl4';
          else if (slotObj.urutan === 5) mappedSlotCode = 'sl5';
          else if (slotObj.urutan === 6) mappedSlotCode = 'sl6';
          else {
            const slotName = slotObj.nama_slot?.toLowerCase() || '';
            if (slotName.includes('slot 1')) mappedSlotCode = 'sl1';
            else if (slotName.includes('slot 2')) mappedSlotCode = 'sl2';
            else if (slotName.includes('slot 3')) mappedSlotCode = 'sl3';
            else if (slotName.includes('slot 4')) mappedSlotCode = 'sl4';
            else if (slotName.includes('slot 5')) mappedSlotCode = 'sl5';
            else if (slotName.includes('slot 6')) mappedSlotCode = 'sl6';
          }
        }

        if (!daySlots.includes(mappedSlotCode)) {
          return {
            status: 'off',
            message: `${selectedIns?.nama} tidak aktif di slot ini pada hari ${DAY_NAMES_INDO[dayIdx]}`,
          };
        }
        return null;
      };

      // Check start slot
      const startCheck = checkSingleSlot(slotId);
      if (startCheck) return startCheck;

      // Check end slot if provided
      if (slotIdAkhir && slotIdAkhir !== slotId) {
        const endCheck = checkSingleSlot(slotIdAkhir);
        if (endCheck) return endCheck;
      }

      // 2. Check Double Booking Slot Collision
      // excludeId: skip the current session itself to prevent self-conflict detection
      const conflict = monthlyJadwalList.find((j) => {
        if (j.tanggal_sesi !== dateStr || j.status_sesi === 'batal' || j.staff_id !== staffId) return false;
        if (excludeId && j.id === excludeId) return false; // exclude self

        const jSlots = [j.slot_waktu_id];
        if (j.slot_waktu_id_akhir) jSlots.push(j.slot_waktu_id_akhir);

        const candSlots = [slotId];
        if (slotIdAkhir && slotIdAkhir !== slotId) candSlots.push(slotIdAkhir);

        return candSlots.some((cs) => jSlots.includes(cs));
      });

      if (conflict) {
        return {
          status: 'conflict',
          message: `Slot terisi oleh ${conflict.siswa?.nama || 'Siswa lain'}`,
          studentName: conflict.siswa?.nama,
        };
      }

      return { status: 'available', message: 'Slot Available (Bebas Bentrok)' };
    },
    [instrukturList, monthlyJadwalList, slotList]
  );

  // Auto Adjust Dates: Find N valid dates without collision / off days
  const handleAutoAdjustDates = () => {
    if (!formData.staff_id || !formData.slot_waktu_id) return;
    const count = sessionDates.length || 10;
    const validDates: string[] = [];

    const parts = selectedTanggal.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const currDate = new Date(y, m, d);

    let iterations = 0;
    while (validDates.length < count && iterations < 90) {
      const curY = currDate.getFullYear();
      const curM = String(currDate.getMonth() + 1).padStart(2, '0');
      const curD = String(currDate.getDate()).padStart(2, '0');
      const dateStr = `${curY}-${curM}-${curD}`;

      const check = getSlotValidationStatus(
        dateStr,
        formData.staff_id || '',
        formData.slot_waktu_id || '',
        formData.slot_waktu_id_akhir || null
      );

      if (check.status === 'available') {
        validDates.push(dateStr);
      }
      currDate.setDate(currDate.getDate() + 1);
      iterations++;
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
    setIsReschedulingProgress(false);

    // Default reschedule: tomorrow
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    setRescheduleTargetDate(tom.toISOString().split('T')[0]);
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
    setIsReschedulingProgress(false);
    loadData();
  };

  // Save Reschedule Action
  const handleSaveReschedule = async () => {
    if (!progressModalJadwal || !progressModalJadwal.siswa_id) return;

    await updateSesiProgress(
      progressModalJadwal.siswa_id,
      progressSesiKe,
      rescheduleTargetDate,
      'terjadwal'
    );

    setProgressModalJadwal(null);
    setIsReschedulingProgress(false);
    loadData();
  };

  const handleCopyWA = () => {
    setWaDateTarget(selectedTanggal);
    setWaDateFrom(selectedTanggal);
    const d = new Date(selectedTanggal);
    d.setDate(d.getDate() + 6);
    setWaDateTo(d.toISOString().split('T')[0]);
    setWaSelectedStaff(selectedStaff);
    setIsCopyWAModalOpen(true);
  };

  // Update WA preview effect
  const updateWAPreview = React.useCallback(async () => {
    setLoadingWAPreview(true);
    let text = '';
    const staffParam = waSelectedStaff !== 'semua' ? waSelectedStaff : undefined;

    if (waCopyMode === 'harian') {
      text = await generateWhatsAppScheduleText(waDateTarget, staffParam);
    } else if (waCopyMode === 'mingguan') {
      text = await generateWhatsAppWeeklyScheduleText(waDateFrom, waDateTo, staffParam);
    } else if (waCopyMode === 'rekap_slot') {
      text = await generateWhatsAppRecapText(waDateTarget, staffParam);
    }

    setWaPreviewText(text);
    setLoadingWAPreview(false);
  }, [waCopyMode, waDateTarget, waDateFrom, waDateTo, waSelectedStaff]);

  React.useEffect(() => {
    if (isCopyWAModalOpen) {
      updateWAPreview();
    }
  }, [isCopyWAModalOpen, updateWAPreview]);

  const handleExecuteCopyWA = () => {
    if (!waPreviewText) return;
    navigator.clipboard.writeText(waPreviewText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
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
        getSlotValidationStatus(
          d,
          formData.staff_id || '',
          formData.slot_waktu_id || '',
          formData.slot_waktu_id_akhir || null
        ).status !== 'available'
    );

    // Tidak lagi memblokir proses — warning akan ditampilkan langsung di list sesi
    // Proses tetap berjalan; pengguna bisa edit tanggal lewat halaman detail

    const batchPayloads: Partial<JadwalSesi>[] = sessionDates.map((tgl, idx) => ({
      siswa_id: formData.siswa_id,
      staff_id: formData.staff_id,
      slot_waktu_id: formData.slot_waktu_id,
      slot_waktu_id_akhir: formData.slot_waktu_id_akhir || null,
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
      cell: ({ row }) => {
        const sesi = row.original;
        // Pass sesi.id as excludeId to prevent self-conflict detection
        const check = sesi.staff_id && sesi.slot_waktu_id
          ? getSlotValidationStatus(
              sesi.tanggal_sesi,
              sesi.staff_id,
              sesi.slot_waktu_id,
              sesi.slot_waktu_id_akhir || null,
              sesi.id  // exclude self from conflict check
            )
          : null;

        const isConflict = check?.status === 'conflict';
        const isOff = check?.status === 'off';
        const hasWarning = isConflict || isOff;

        return (
          <div className="flex flex-col gap-0.5">
            <span className={`font-medium ${
              isConflict ? 'text-[var(--danger)]' : isOff ? 'text-[var(--warning)]' : 'text-[var(--text-primary)]'
            }`}>
              {formatDateIndo(sesi.tanggal_sesi)}
            </span>
            {hasWarning && (
              <Link
                href={`/jadwal/${sesi.id}`}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold w-fit ${
                  isConflict
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 hover:bg-rose-200'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 hover:bg-amber-200'
                }`}
                title="Klik untuk edit tanggal sesi"
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                {isConflict
                  ? `⚠ Bentrok${check?.studentName ? ` (${check.studentName})` : ''} — Edit`
                  : '⚠ Hari Libur — Edit'}
              </Link>
            )}
          </div>
        );
      },
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
            onClick={() => {
              setDeletingId(row.original.id);
              setDeletingSiswaId(row.original.siswa_id || null);
            }}
            className="p-1 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
            title="Hapus Sesi Siswa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Calendar Calculation for Big Calendar Modal
  const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal Sesi Mengemudi"
        description="Kelola penugasan siswa, instruktur, mobil, dan slot waktu harian"
        breadcrumbs={[{ label: 'Operasional' }, { label: 'Jadwal Sesi' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsBigCalendarOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Big Calendar</span>
            </button>

            <button
              onClick={handleCopyWA}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copy WA Jadwal</span>
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

      {/* ── Filter Toolbar ── */}
      <div className="card-container space-y-3">
        {/* Row 1: Period Quick-Select Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)] shrink-0">Rentang:</span>
          {([
            { key: 'single', label: 'Tanggal' },
            { key: 'range',  label: 'Dari — Ke' },
            { key: 'week',   label: 'Minggu Ini' },
            { key: 'month',  label: 'Bulan Ini' },
            { key: '3month', label: '3 Bulan' },
            { key: '6month', label: '6 Bulan' },
            { key: 'year',   label: '1 Tahun' },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilterMode(opt.key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                filterMode === opt.key
                  ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                  : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Row 2: Date Inputs + Instruktur + Bentrok Toggle */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Date Picker(s) */}
          {filterMode === 'single' && (
            <div className="w-44">
              <DatePickerWIB
                label="Pilih Tanggal Sesi"
                value={selectedTanggal}
                onChange={(val) => setSelectedTanggal(val)}
              />
            </div>
          )}
          {filterMode === 'range' && (
            <>
              <div className="w-44">
                <DatePickerWIB
                  label="Dari Tanggal"
                  value={dateFrom}
                  onChange={(val) => setDateFrom(val)}
                />
              </div>
              <div className="w-44">
                <DatePickerWIB
                  label="Sampai Tanggal"
                  value={dateTo}
                  onChange={(val) => setDateTo(val)}
                />
              </div>
            </>
          )}
          {!['single', 'range'].includes(filterMode) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg-subtle)] text-xs text-[var(--text-secondary)]">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-medium">
                {(() => {
                  const { from, to } = getEffectiveDateRange();
                  return `${formatDateIndo(from)} — ${formatDateIndo(to)}`;
                })()}
              </span>
            </div>
          )}

          {/* Instruktur Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wide">Instruktur</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium"
            >
              <option value="semua">Semua ({instrukturList.length})</option>
              {instrukturList.map((ins) => (
                <option key={ins.id} value={ins.id}>{ins.nama}</option>
              ))}
            </select>
          </div>

          {/* Filter Bentrok Toggle */}
          <button
            onClick={() => setFilterBentrok((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-semibold transition-all ${
              filterBentrok
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)] hover:border-rose-400 hover:text-rose-600'
            }`}
            title="Tampilkan hanya jadwal yang bentrok atau di hari libur instruktur"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{filterBentrok ? 'Hanya Bentrok' : 'Filter Bentrok'}</span>
            {filterBentrok && (
              <X className="w-3 h-3 ml-0.5" onClick={(e) => { e.stopPropagation(); setFilterBentrok(false); }} />
            )}
          </button>

          {/* Result count */}
          <div className="ml-auto text-xs text-[var(--text-secondary)] font-medium">
            Menampilkan{' '}
            <span className="font-bold text-[var(--text-primary)]">{displayJadwalList.length}</span>
            {' '}jadwal
            {filterBentrok && <span className="ml-1 text-rose-600 font-bold">(bentrok)</span>}
          </div>
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

      {/* ── Rekap Penyelesaian Slot Harian ── */}
      {(() => {
        // Compute recap from monthlyJadwalList (or jadwalList for selected date)
        const recapSessions = monthlyJadwalList.filter((j) => {
          if (j.tanggal_sesi !== recapDate) return false;
          if (j.status_sesi === 'batal') return false;
          if (recapStaff !== 'semua' && j.staff_id !== recapStaff) return false;
          return true;
        });

        // Group by slot (using slot_waktu urutan for sorting)
        const slotMap = new Map<string, {
          slotId: string;
          namaSlot: string;
          jamMulai: string;
          jamSelesai: string;
          urutan: number;
          sessions: typeof recapSessions;
        }>();

        recapSessions.forEach((j) => {
          const slotId = j.slot_waktu_id;
          const slot = j.slot_waktu;
          if (!slotMap.has(slotId)) {
            slotMap.set(slotId, {
              slotId,
              namaSlot: slot?.nama_slot || slotId,
              jamMulai: slot?.jam_mulai?.substring(0, 5) || '',
              jamSelesai: slot?.jam_selesai?.substring(0, 5) || '',
              urutan: slot?.urutan ?? 99,
              sessions: [],
            });
          }
          slotMap.get(slotId)!.sessions.push(j);
          // Also index in slot_akhir if double-slot
          if (j.slot_waktu_id_akhir && j.slot_waktu_id_akhir !== slotId) {
            const slotAkhirId = j.slot_waktu_id_akhir;
            if (!slotMap.has(slotAkhirId)) {
              const slotAkhir = j.slot_waktu_akhir;
              slotMap.set(slotAkhirId, {
                slotId: slotAkhirId,
                namaSlot: slotAkhir?.nama_slot || slotAkhirId,
                jamMulai: slotAkhir?.jam_mulai?.substring(0, 5) || '',
                jamSelesai: slotAkhir?.jam_selesai?.substring(0, 5) || '',
                urutan: slotAkhir?.urutan ?? 99,
                sessions: [],
              });
            }
            // Don't double-add; slot akhir is accounted in slot mulai
          }
        });

        const sortedSlots = Array.from(slotMap.values()).sort((a, b) => a.urutan - b.urutan);
        const totalSelesai = recapSessions.filter((j) => j.status_sesi === 'selesai').length;
        const totalTerjadwal = recapSessions.filter((j) => j.status_sesi === 'terjadwal').length;

        return (
          <div className="card-container space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Rekap Penyelesaian Slot Harian</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-40">
                  <DatePickerWIB
                    label="Pilih Tanggal"
                    value={recapDate}
                    onChange={(val) => setRecapDate(val)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wide">Instruktur</label>
                  <select
                    value={recapStaff}
                    onChange={(e) => setRecapStaff(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                  >
                    <option value="semua">Semua Instruktur</option>
                    {instrukturList.map((ins) => (
                      <option key={ins.id} value={ins.id}>{ins.nama}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[var(--text-secondary)]">Selesai: <strong className="text-emerald-600">{totalSelesai}</strong></span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="text-[var(--text-secondary)]">Terjadwal: <strong className="text-amber-600">{totalTerjadwal}</strong></span>
                  </span>
                </div>
              </div>
            </div>

            {sortedSlots.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-secondary)] font-medium">
                Tidak ada sesi pada tanggal ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedSlots.map((slotEntry) => {
                  const selesai = slotEntry.sessions.filter((j) => j.status_sesi === 'selesai').length;
                  const total = slotEntry.sessions.length;
                  const pct = total > 0 ? Math.round((selesai / total) * 100) : 0;
                  return (
                    <div key={slotEntry.slotId} className="border border-[var(--border)] rounded-lg overflow-hidden">
                      {/* Slot Header */}
                      <div className={`px-3 py-2 flex items-center justify-between ${
                        pct === 100 ? 'bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-900'
                        : pct > 0   ? 'bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900'
                        : 'bg-[var(--bg-subtle)] border-b border-[var(--border)]'
                      }`}>
                        <div>
                          <span className="font-bold text-xs text-[var(--text-primary)]">{slotEntry.namaSlot}</span>
                          <span className="ml-2 text-[10px] text-[var(--text-secondary)]">
                            {slotEntry.jamMulai}{slotEntry.jamSelesai ? `–${slotEntry.jamSelesai}` : ''} WIB
                          </span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          pct === 100 ? 'bg-emerald-600 text-white' : pct > 0 ? 'bg-amber-500 text-white' : 'bg-[var(--text-muted)] text-white'
                        }`}>
                          {selesai}/{total}
                        </span>
                      </div>
                      {/* Session List */}
                      <div className="divide-y divide-[var(--border)]">
                        {slotEntry.sessions.map((j) => (
                          <div key={j.id} className="px-3 py-1.5 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-[var(--text-primary)] truncate">{j.siswa?.nama || '-'}</p>
                              <p className="text-[10px] text-[var(--text-secondary)]">
                                {j.instruktur?.nama || '-'} • Sesi {j.nomor_sesi_ke}/{j.total_sesi_paket}
                              </p>
                            </div>
                            <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              j.status_sesi === 'selesai' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                            }`}>
                              {j.status_sesi === 'selesai' ? '✓ Selesai' : '⏳ Terjadwal'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* MODAL UPDATE PROGRESS SESI PER SISWA */}
      {progressModalJadwal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-xl space-y-4 text-xs">
            <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              Update Progress Sesi per Siswa
            </h3>

            <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl space-y-1">
              <p className="font-bold text-sm text-[var(--brand-primary)]">
                {progressModalJadwal.siswa?.nama} ({progressModalJadwal.siswa?.kode_siswa})
              </p>
              <p className="text-[var(--text-secondary)]">
                Paket: {progressModalJadwal.siswa?.paket?.nama_paket || 'Paket Sesi'} ({progressModalJadwal.total_sesi_paket} Total Sesi)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Pilih Nomor Sesi
                </label>
                <select
                  value={progressSesiKe}
                  onChange={(e) => setProgressSesiKe(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-bold text-[var(--brand-primary)]"
                >
                  {Array.from({ length: progressModalJadwal.total_sesi_paket || 10 }).map((_, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      Sesi {idx + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <DatePickerWIB
                  label="Tanggal Sesi Saat Ini"
                  value={progressTanggal}
                  onChange={(val) => setProgressTanggal(val)}
                />
              </div>
            </div>

            {/* STATUS ACTIONS & RESCHEDULE TOGGLE */}
            <div className="pt-2 border-t border-[var(--border)] space-y-3">
              <p className="font-semibold text-[var(--text-primary)]">Pilih Status Aksi Sesi Ini:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveProgressStatus('selesai')}
                  className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-1 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Selesai</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveProgressStatus('terjadwal')}
                  className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-1 shadow-sm"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Terjadwal</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveProgressStatus('batal')}
                  className="px-2.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg flex items-center justify-center gap-1 shadow-sm"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Batal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReschedulingProgress(!isReschedulingProgress)}
                  className={`px-2.5 py-2 font-bold rounded-lg flex items-center justify-center gap-1 shadow-sm border transition-colors ${
                    isReschedulingProgress
                      ? 'bg-amber-600 text-white border-amber-700'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Reschedule</span>
                </button>
              </div>

              {/* RESCHEDULE DATE PICKER PANEL */}
              {isReschedulingProgress && (
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-900 rounded-xl space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-900/50 pb-1.5">
                    <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Penundaan / Reschedule Jadwal
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                      Pilih Tanggal Baru Dilanjutkan:
                    </label>
                    <DatePickerWIB
                      value={rescheduleTargetDate}
                      onChange={(val) => setRescheduleTargetDate(val)}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1 border-t border-amber-200 dark:border-amber-900/50">
                    <button
                      type="button"
                      onClick={() => setIsReschedulingProgress(false)}
                      className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-xs hover:bg-black/5"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveReschedule}
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Reschedule</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setProgressModalJadwal(null);
                  setIsReschedulingProgress(false);
                }}
                className="px-4 py-1.5 border border-[var(--border)] rounded-md font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COPY WA SCHEDULE (HARIAN, MINGGUAN & REKAP STATUS) */}
      {isCopyWAModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-lg w-full bg-[var(--bg)] shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Copy className="w-4 h-4 text-emerald-600" />
                <span>Salin Jadwal WhatsApp (Markdown)</span>
              </h3>
              <button
                onClick={() => setIsCopyWAModalOpen(false)}
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl p-1 bg-[var(--bg-subtle)] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setWaCopyMode('harian')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  waCopyMode === 'harian'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                📅 Harian
              </button>
              <button
                type="button"
                onClick={() => setWaCopyMode('mingguan')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  waCopyMode === 'mingguan'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                🗓️ Mingguan (7 Hari)
              </button>
              <button
                type="button"
                onClick={() => setWaCopyMode('rekap_slot')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                  waCopyMode === 'rekap_slot'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                📊 Rekap Slot
              </button>
            </div>

            {/* Filter Date & Staff Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {waCopyMode === 'mingguan' ? (
                <>
                  <div>
                    <DatePickerWIB
                      label="Tanggal Mulai"
                      value={waDateFrom}
                      onChange={(val) => setWaDateFrom(val)}
                    />
                  </div>
                  <div>
                    <DatePickerWIB
                      label="Tanggal Selesai"
                      value={waDateTo}
                      onChange={(val) => setWaDateTo(val)}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <DatePickerWIB
                    label="Pilih Tanggal Jadwal"
                    value={waDateTarget}
                    onChange={(val) => setWaDateTarget(val)}
                  />
                </div>
              )}

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Pilih Instruktur
                </label>
                <select
                  value={waSelectedStaff}
                  onChange={(e) => setWaSelectedStaff(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold"
                >
                  <option value="semua">Semua Instruktur</option>
                  {instrukturList.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.nama} (Instruktur)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Markdown Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-[var(--text-secondary)]">
                  Preview Format WhatsApp:
                </label>
                {loadingWAPreview && (
                  <span className="text-[10px] text-[var(--brand-primary)] font-semibold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Memuat format...
                  </span>
                )}
              </div>
              <textarea
                readOnly
                rows={9}
                value={waPreviewText}
                className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] font-mono text-[11px] text-[var(--text-primary)] leading-relaxed select-all"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsCopyWAModalOpen(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-md font-medium hover:bg-black/5"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={handleExecuteCopyWA}
                disabled={loadingWAPreview || !waPreviewText}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Tersalin ke WhatsApp!' : 'Salin ke Clipboard'}</span>
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

              {/* 2. Pilih Instruktur & Slot Waktu */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    Slot Waktu Mulai *
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

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Slot Waktu Selesai (Opsional)
                  </label>
                  <select
                    value={formData.slot_waktu_id_akhir || ''}
                    onChange={(e) => setFormData({ ...formData, slot_waktu_id_akhir: e.target.value || null })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold"
                  >
                    <option value="">-- Hanya 1 Slot --</option>
                    {slotList.map((sw) => (
                      <option key={sw.id} value={sw.id}>
                        {sw.nama_slot} ({sw.jam_selesai.substring(0, 5)})
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
                      formData.slot_waktu_id || '',
                      formData.slot_waktu_id_akhir || null
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

              {/* Warning Banner jika ada tanggal bermasalah */}
              {(() => {
                const problemCount = sessionDates.filter((d) => {
                  const c = getSlotValidationStatus(
                    d,
                    formData.staff_id || '',
                    formData.slot_waktu_id || '',
                    formData.slot_waktu_id_akhir || null
                  );
                  return c.status !== 'available';
                }).length;

                if (problemCount === 0) return null;

                return (
                  <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-800 dark:text-amber-300">
                      <span className="font-bold">{problemCount} sesi</span> memiliki tanggal{' '}
                      <span className="font-semibold">bentrok atau hari libur instruktur</span>.{' '}
                      Jadwal tetap akan disimpan — perbaiki tanggalnya melalui{' '}
                      <span className="font-semibold">halaman detail sesi</span> setelah disimpan,
                      atau gunakan <span className="font-semibold">Auto-Adjust</span> di atas.
                    </div>
                  </div>
                );
              })()}

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
                  className="p-1 rounded border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-[var(--text-primary)] min-w-[120px] text-center">
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
                  className="p-1 rounded border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsBigCalendarOpen(false)}
                  className="ml-4 text-xs font-semibold px-2.5 py-1 rounded bg-black/5 dark:bg-white/10"
                >
                  ✕ Tutup
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
                const dayOfWeekIndex = getDayIndexFromDateStr(cellDateStr);
                const isSunday = dayOfWeekIndex === 0;

                // Filter sessions for this date (excluding cancelled)
                const daySessions = monthlyJadwalList.filter(
                  (j) => j.tanggal_sesi === cellDateStr && j.status_sesi !== 'batal'
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
                        {DAY_NAMES[dayOfWeekIndex].substring(0, 3).toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1 my-auto">
                      {instrukturList.length === 0 ? (
                        <span className="text-[10px] text-[var(--text-secondary)] italic">Tidak ada instruktur</span>
                      ) : (
                        instrukturList.map((ins) => {
                          const insFirstName = ins.nama.trim().split(' ')[0];
                          const dayNameEng = DAY_NAMES[dayOfWeekIndex];
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
                                title={`${ins.nama}: Libur Operasional pada hari ${DAY_NAMES_INDO[dayOfWeekIndex]}`}
                              >
                                {insFirstName}: Libur
                              </div>
                            );
                          }

                          const maxSlots = daySlots.length;
                          const insSessions = daySessions.filter((j) => j.staff_id === ins.id && j.status_sesi !== 'batal');
                          const bookedCount = insSessions.reduce((acc, curr) => {
                            let count = 1;
                            if (curr.slot_waktu_id_akhir && curr.slot_waktu_id_akhir !== curr.slot_waktu_id) {
                              count = 2;
                            }
                            return acc + count;
                          }, 0);
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
                                title={`${ins.nama}: ${availCount} Slot Kosong, ${bookedCount} Terisi (${activeStudentNames})`}
                              >
                                {insFirstName}: {availCount} Avail ({bookedCount}/{maxSlots})
                              </div>
                            );
                          } else {
                            return (
                              <div
                                key={ins.id}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 truncate"
                                title={`${ins.nama}: Penuh (${bookedCount}/${maxSlots}) - Siswa: ${activeStudentNames}`}
                              >
                                {insFirstName}: Penuh ({bookedCount}/{maxSlots})
                              </div>
                            );
                          }
                        })
                      )}
                    </div>

                    <div className="text-[9px] text-[var(--text-secondary)] border-t border-[var(--border)] pt-0.5 text-right font-medium">
                      {daySessions.length} Sesi Terjadwal
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={!!deletingId}
        title="Hapus Jadwal Sesi Siswa"
        description="Apakah Anda yakin ingin menghapus jadwal sesi siswa ini? Tindakan ini akan membersihkan seluruh data sesi siswa tersebut dari kalender dan database secara permanen."
        confirmText="Hapus Jadwal"
        isDanger={true}
        onConfirm={async () => {
          if (deletingId) {
            await deleteJadwalSesi(deletingId, deletingSiswaId || undefined);
            setDeletingId(null);
            setDeletingSiswaId(null);
            loadData();
          }
        }}
        onClose={() => {
          setDeletingId(null);
          setDeletingSiswaId(null);
        }}
      />
    </div>
  );
}
