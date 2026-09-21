'use client';

import React from 'react';
import {
  Kendaraan,
  KendaraanLogHarian,
  KendaraanLogItem,
  OdometerLogType,
  HargaBBM,
} from '@/types/database';
import {
  getKendaraanLogList,
  saveKendaraanLogItem,
  deleteKendaraanLogItem,
  deleteKendaraanLog,
  getHargaBBMList,
  SaveKendaraanLogItemInput,
} from '@/lib/actions/kendaraan';
import { getJadwalByTanggal } from '@/lib/actions/jadwal';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, getTodayDateString, addDaysToDateStr } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ExportButton, ExportColumn } from '@/components/shared/ExportButton';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  Gauge,
  Fuel,
  TrendingUp,
  Calendar,
  Plus,
  ArrowUpDown,
  Search,
  CheckCircle2,
  Clock,
  Car,
  Trash2,
  BarChart3,
  Check,
  AlertCircle,
  Activity,
  Layers,
  X,
  LogOut,
  LogIn,
  Play,
  Flag,
  User,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAppRefresh } from '@/lib/utils/refresh-event';
import { Badge } from '@/components/shared/Badge';

interface KendaraanLogManagerProps {
  kendaraanList: Kendaraan[];
  lockedKendaraanId?: string;
  onDataChange?: () => void;
}

type DatePreset = 'today' | '7days' | 'month' | '30days' | 'all' | 'custom';
type ChartTab = 'distance' | 'fuel' | 'efficiency';

export function KendaraanLogManager({
  kendaraanList,
  lockedKendaraanId,
  onDataChange,
}: KendaraanLogManagerProps) {
  const [logs, setLogs] = React.useState<KendaraanLogHarian[]>([]);
  const [hargaBbmList, setHargaBbmList] = React.useState<HargaBBM[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filters
  const [datePreset, setDatePreset] = React.useState<DatePreset>('30days');
  const [startDate, setStartDate] = React.useState<string>(addDaysToDateStr(getTodayDateString(), -30));
  const [endDate, setEndDate] = React.useState<string>(getTodayDateString());
  const [selectedKendaraanId, setSelectedKendaraanId] = React.useState<string>(
    lockedKendaraanId || 'all'
  );
  const [selectedStatus, setSelectedStatus] = React.useState<'all' | 'selesai' | 'berjalan'>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Sorting
  const [sortField, setSortField] = React.useState<
    'tanggal' | 'jarak' | 'out' | 'in' | 'bbm' | 'efisiensi'
  >('tanggal');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Chart View
  const [chartTab, setChartTab] = React.useState<ChartTab>('distance');

  // Accordion Expand State for Date Groups
  const [expandedLogIds, setExpandedLogIds] = React.useState<Record<string, boolean>>({});

  // Modal States
  const [showLogModal, setShowLogModal] = React.useState(false);
  const [formKendaraanId, setFormKendaraanId] = React.useState<string>(
    lockedKendaraanId || (kendaraanList[0]?.id || '')
  );
  const [formTanggal, setFormTanggal] = React.useState<string>(getTodayDateString());
  const [formTipe, setFormTipe] = React.useState<OdometerLogType>('ODO BC OUT');
  const [formOdo, setFormOdo] = React.useState<string>('');
  const [formCatatan, setFormCatatan] = React.useState<string>('');
  const [selectedSiswaId, setSelectedSiswaId] = React.useState<string>('');
  const [selectedSiswaNama, setSelectedSiswaNama] = React.useState<string>('');

  // Siswa list on chosen date
  const [availableSiswa, setAvailableSiswa] = React.useState<
    { id: string; nama: string; slot?: string }[]
  >([]);
  const [loadingSiswa, setLoadingSiswa] = React.useState(false);

  // Overwrite Confirmation Modal State
  const [overwriteConfirmData, setOverwriteConfirmData] = React.useState<{
    input: SaveKendaraanLogItemInput;
    existingItem: KendaraanLogItem;
    vehicleName: string;
  } | null>(null);

  // Delete Confirm Dialog (Whole Day)
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  // Delete Confirm Dialog (Single Sub-Item)
  const [deleteItemTarget, setDeleteItemTarget] = React.useState<{
    logId: string;
    item: KendaraanLogItem;
  } | null>(null);

  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Load Data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedLogs, bbmPrices] = await Promise.all([
        getKendaraanLogList({
          kendaraanId: lockedKendaraanId || (selectedKendaraanId !== 'all' ? selectedKendaraanId : undefined),
          startDate: datePreset !== 'all' ? startDate : undefined,
          endDate: datePreset !== 'all' ? endDate : undefined,
        }),
        getHargaBBMList(),
      ]);
      setLogs(fetchedLogs);
      setHargaBbmList(bbmPrices);

      // Auto-expand latest 3 logs by default
      if (fetchedLogs.length > 0) {
        setExpandedLogIds((prev) => {
          const nextState = { ...prev };
          fetchedLogs.slice(0, 3).forEach((l) => {
            if (nextState[l.id] === undefined) {
              nextState[l.id] = true;
            }
          });
          return nextState;
        });
      }
    } catch (e) {
      console.error('Error loading log data:', e);
    } finally {
      setLoading(false);
    }
  }, [lockedKendaraanId, selectedKendaraanId, datePreset, startDate, endDate]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  useAppRefresh(loadData);

  // Fetch students scheduled on formTanggal
  React.useEffect(() => {
    if (!formTanggal) return;
    let isMounted = true;
    setLoadingSiswa(true);
    getJadwalByTanggal(formTanggal)
      .then((jadwalList) => {
        if (!isMounted) return;
        const siswaMap = new Map<string, { id: string; nama: string; slot?: string }>();
        for (const j of jadwalList) {
          if (j.siswa && j.siswa.id) {
            const slotName = j.slot_waktu
              ? `${j.slot_waktu.nama_slot} (${j.slot_waktu.jam_mulai} - ${j.slot_waktu.jam_selesai})`
              : undefined;
            siswaMap.set(j.siswa.id, {
              id: j.siswa.id,
              nama: j.siswa.nama || 'Siswa',
              slot: slotName,
            });
          }
        }
        setAvailableSiswa(Array.from(siswaMap.values()));
      })
      .catch((err) => console.error('Error fetching students for date:', err))
      .finally(() => {
        if (isMounted) setLoadingSiswa(false);
      });

    return () => {
      isMounted = false;
    };
  }, [formTanggal]);

  // Handle Preset Changes
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = getTodayDateString();
    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === '7days') {
      setStartDate(addDaysToDateStr(today, -7));
      setEndDate(today);
    } else if (preset === 'month') {
      const startOfMonth = today.slice(0, 8) + '01';
      setStartDate(startOfMonth);
      setEndDate(today);
    } else if (preset === '30days') {
      setStartDate(addDaysToDateStr(today, -30));
      setEndDate(today);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Toggle Accordion Expansion
  const toggleExpand = (logId: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  // Open Log Modal (Create New Entry)
  const handleOpenAddLog = (presetTipe?: OdometerLogType, presetDate?: string, presetKid?: string) => {
    const targetKid = presetKid || lockedKendaraanId || formKendaraanId || kendaraanList[0]?.id || '';
    setFormKendaraanId(targetKid);
    setFormTanggal(presetDate || getTodayDateString());
    setFormTipe(presetTipe || 'ODO BC OUT');

    // Auto-fill odometer from latest vehicle status if available
    const selectedVeh = kendaraanList.find((k) => k.id === targetKid);
    const currentOdo = selectedVeh?.status?.odometer_terkini || 0;
    setFormOdo(currentOdo > 0 ? currentOdo.toString() : '');
    setFormCatatan('');
    setSelectedSiswaId('');
    setSelectedSiswaNama('');
    setFormError(null);
    setShowLogModal(true);
  };

  // Students available for ODO SESI SELESAI (must have ODO SESI MULAI recorded)
  const startedStudentsOnDate = React.useMemo(() => {
    const dayLog = logs.find(
      (l) => l.kendaraan_id === formKendaraanId && l.tanggal === formTanggal
    );
    if (!dayLog || !dayLog.log_items) return [];

    const list: { id: string; nama: string; startOdo: number }[] = [];
    for (const item of dayLog.log_items) {
      if (item.tipe === 'ODO SESI MULAI' && item.siswa_id) {
        list.push({
          id: item.siswa_id,
          nama: item.siswa_nama || 'Siswa',
          startOdo: item.odometer,
        });
      }
    }
    return list;
  }, [logs, formKendaraanId, formTanggal]);

  // Handle Form Submission
  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKendaraanId || !formTanggal) {
      setFormError('Armada dan Tanggal wajib diisi');
      return;
    }

    if (!formOdo || isNaN(Number(formOdo)) || Number(formOdo) <= 0) {
      setFormError('Angka odometer harus berupa angka positif yang valid');
      return;
    }

    if (formTipe === 'ODO SESI MULAI' && !selectedSiswaId) {
      setFormError('Pilih nama siswa yang memulai sesi latihan');
      return;
    }

    if (formTipe === 'ODO SESI SELESAI' && !selectedSiswaId) {
      setFormError('Pilih nama siswa yang menyelesaikan sesi latihan');
      return;
    }

    setSaving(true);
    setFormError(null);

    const vehicleObj = kendaraanList.find((k) => k.id === formKendaraanId);
    const vName = vehicleObj ? `${vehicleObj.nama_kendaraan} (${vehicleObj.plat_nomor})` : 'Armada';

    const inputPayload: SaveKendaraanLogItemInput = {
      kendaraan_id: formKendaraanId,
      tanggal: formTanggal,
      tipe: formTipe,
      odometer: Math.round(Number(formOdo)),
      siswa_id: selectedSiswaId || null,
      siswa_nama: selectedSiswaNama || null,
      catatan: formCatatan.trim() || null,
      forceOverwrite: false,
    };

    const res = await saveKendaraanLogItem(inputPayload);
    setSaving(false);

    if (res.duplicateFound && res.existingItem) {
      // Tampilkan notifikasi / modal konfirmasi timpa
      setOverwriteConfirmData({
        input: {
          ...inputPayload,
          forceOverwrite: true,
        },
        existingItem: res.existingItem,
        vehicleName: vName,
      });
      return;
    }

    if (res.success) {
      setShowLogModal(false);
      await loadData();
      if (onDataChange) onDataChange();
    } else {
      setFormError(res.error || 'Gagal menyimpan log armada');
    }
  };

  // Confirm Overwrite Handler
  const handleConfirmOverwrite = async () => {
    if (!overwriteConfirmData) return;
    setSaving(true);
    try {
      const res = await saveKendaraanLogItem(overwriteConfirmData.input);
      if (res.success) {
        setOverwriteConfirmData(null);
        setShowLogModal(false);
        await loadData();
        if (onDataChange) onDataChange();
      } else {
        setFormError(res.error || 'Gagal menimpa log data');
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete Whole Day Log Handler
  const handleConfirmDeleteDay = async () => {
    if (!deleteTargetId) return;
    setSaving(true);
    const res = await deleteKendaraanLog(deleteTargetId);
    setSaving(false);
    setDeleteTargetId(null);
    if (res.success) {
      await loadData();
      if (onDataChange) onDataChange();
    } else {
      alert('Gagal menghapus log hari ini: ' + res.error);
    }
  };

  // Delete Single Sub-Item Handler
  const handleConfirmDeleteItem = async () => {
    if (!deleteItemTarget) return;
    setSaving(true);
    const res = await deleteKendaraanLogItem(deleteItemTarget.logId, deleteItemTarget.item.id);
    setSaving(false);
    setDeleteItemTarget(null);
    if (res.success) {
      await loadData();
      if (onDataChange) onDataChange();
    } else {
      alert('Gagal menghapus sub-item log: ' + res.error);
    }
  };

  // Compute Enriched Logs with Effective Distance across Checkpoint / Periodic Snapshots
  const enrichedLogs = React.useMemo(() => {
    const vehicleGroups = new Map<string, KendaraanLogHarian[]>();
    for (const log of logs) {
      if (!vehicleGroups.has(log.kendaraan_id)) {
        vehicleGroups.set(log.kendaraan_id, []);
      }
      vehicleGroups.get(log.kendaraan_id)!.push(log);
    }

    const result: (KendaraanLogHarian & {
      effectiveJarak: number;
      isPeriodicDelta: boolean;
      isInitialBaseline: boolean;
      deltaFromDate?: string;
      calculatedEfisiensi?: number | null;
    })[] = [];

    for (const [, vLogs] of vehicleGroups.entries()) {
      vLogs.sort(
        (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
      );

      let lastKnownOdo: number | null = null;
      let lastKnownDate: string | null = null;

      for (const log of vLogs) {
        const outKm = log.odometer_basecamp_out;
        const inKm = log.odometer_basecamp_in;
        const currOdo = inKm !== null ? inKm : outKm;

        let effectiveJarak = 0;
        let isPeriodicDelta = false;
        let isInitialBaseline = false;
        let deltaFromDate: string | undefined = undefined;

        if (outKm !== null && inKm !== null && inKm > outKm) {
          effectiveJarak = inKm - outKm;
          lastKnownOdo = inKm;
          lastKnownDate = log.tanggal;
        } else if (log.jarak_tempuh && log.jarak_tempuh > 0) {
          effectiveJarak = log.jarak_tempuh;
          if (currOdo) {
            lastKnownOdo = currOdo;
            lastKnownDate = log.tanggal;
          }
        } else if (currOdo !== null) {
          if (lastKnownOdo !== null && currOdo > lastKnownOdo) {
            effectiveJarak = currOdo - lastKnownOdo;
            isPeriodicDelta = true;
            deltaFromDate = lastKnownDate || undefined;
            lastKnownOdo = currOdo;
            lastKnownDate = log.tanggal;
          } else if (lastKnownOdo === null) {
            effectiveJarak = 0;
            isInitialBaseline = true;
            lastKnownOdo = currOdo;
            lastKnownDate = log.tanggal;
          } else {
            effectiveJarak = 0;
          }
        }

        const calculatedEfisiensi =
          log.bbm_liter && log.bbm_liter > 0 && effectiveJarak > 0
            ? parseFloat((effectiveJarak / log.bbm_liter).toFixed(1))
            : null;

        result.push({
          ...log,
          effectiveJarak,
          isPeriodicDelta,
          isInitialBaseline,
          deltaFromDate,
          calculatedEfisiensi,
        });
      }
    }

    return result;
  }, [logs]);

  // Filtered & Sorted Logs (Client-side)
  const filteredLogs = React.useMemo(() => {
    return enrichedLogs.filter((log) => {
      if (
        !lockedKendaraanId &&
        selectedKendaraanId !== 'all' &&
        log.kendaraan_id !== selectedKendaraanId
      ) {
        return false;
      }

      if (selectedStatus === 'selesai') {
        if (
          !log.isPeriodicDelta &&
          !log.isInitialBaseline &&
          (log.odometer_basecamp_in === null || log.odometer_basecamp_out === null)
        ) {
          return false;
        }
      } else if (selectedStatus === 'berjalan') {
        if (
          log.odometer_basecamp_out === null ||
          log.odometer_basecamp_in !== null ||
          log.isPeriodicDelta ||
          log.isInitialBaseline
        ) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const vName = log.kendaraan?.nama_kendaraan?.toLowerCase() || '';
        const vPlate = log.kendaraan?.plat_nomor?.toLowerCase() || '';
        const catatan = (log.catatan || '').toLowerCase();
        const hasMatchingItem = (log.log_items || []).some(
          (item) =>
            item.tipe.toLowerCase().includes(q) ||
            (item.siswa_nama || '').toLowerCase().includes(q) ||
            (item.catatan || '').toLowerCase().includes(q)
        );
        if (!vName.includes(q) && !vPlate.includes(q) && !catatan.includes(q) && !hasMatchingItem) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedLogs, lockedKendaraanId, selectedKendaraanId, selectedStatus, searchQuery]);

  const sortedLogs = React.useMemo(() => {
    const arr = [...filteredLogs];
    arr.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'tanggal') {
        valA = new Date(a.tanggal).getTime();
        valB = new Date(b.tanggal).getTime();
      } else if (sortField === 'jarak') {
        valA = a.effectiveJarak || 0;
        valB = b.effectiveJarak || 0;
      } else if (sortField === 'out') {
        valA = a.odometer_basecamp_out || 0;
        valB = b.odometer_basecamp_out || 0;
      } else if (sortField === 'in') {
        valA = a.odometer_basecamp_in || 0;
        valB = b.odometer_basecamp_in || 0;
      } else if (sortField === 'bbm') {
        valA = a.bbm_liter || 0;
        valB = b.bbm_liter || 0;
      } else if (sortField === 'efisiensi') {
        valA = a.calculatedEfisiensi || 0;
        valB = b.calculatedEfisiensi || 0;
      }

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
    return arr;
  }, [filteredLogs, sortField, sortOrder]);

  // Aggregate Metrics Live Calculation
  const metrics = React.useMemo(() => {
    let totalJarakKm = 0;
    let totalLiterBbm = 0;
    let totalBiayaBbm = 0;
    let tripSelesai = 0;
    let tripBerjalan = 0;

    for (const log of filteredLogs) {
      totalJarakKm += log.effectiveJarak;
      if (
        log.effectiveJarak > 0 ||
        log.isInitialBaseline ||
        (log.odometer_basecamp_in !== null && log.odometer_basecamp_out !== null)
      ) {
        tripSelesai += 1;
      } else if (log.odometer_basecamp_out !== null && log.odometer_basecamp_in === null) {
        tripBerjalan += 1;
      }

      if (log.bbm_liter && Number(log.bbm_liter) > 0) {
        totalLiterBbm += Number(log.bbm_liter);
      }
      if (log.bbm_nominal && Number(log.bbm_nominal) > 0) {
        totalBiayaBbm += Number(log.bbm_nominal);
      }
    }

    const rasioEfisiensi =
      totalLiterBbm > 0 && totalJarakKm > 0
        ? parseFloat((totalJarakKm / totalLiterBbm).toFixed(2))
        : 0;
    const biayaPerKm =
      totalJarakKm > 0 && totalBiayaBbm > 0 ? Math.round(totalBiayaBbm / totalJarakKm) : 0;

    return {
      totalJarakKm,
      totalLiterBbm: parseFloat(totalLiterBbm.toFixed(1)),
      totalBiayaBbm,
      rasioEfisiensi,
      biayaPerKm,
      tripSelesai,
      tripBerjalan,
      totalTrip: filteredLogs.length,
    };
  }, [filteredLogs]);

  // Chart Data Generation (Chronological)
  const chartData = React.useMemo(() => {
    const map = new Map<
      string,
      { tanggal: string; jarak: number; liter: number; nominal: number; trips: number }
    >();

    const sortedAsc = [...filteredLogs].sort(
      (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
    );

    for (const log of sortedAsc) {
      const key = log.tanggal;
      const cur = map.get(key) || { tanggal: key, jarak: 0, liter: 0, nominal: 0, trips: 0 };
      cur.jarak += log.effectiveJarak;
      if (log.bbm_liter) {
        cur.liter += Number(log.bbm_liter);
      }
      if (log.bbm_nominal) {
        cur.nominal += Number(log.bbm_nominal);
      }
      cur.trips += 1;
      map.set(key, cur);
    }

    return Array.from(map.values()).map((d) => ({
      ...d,
      displayDate: d.tanggal.slice(5),
      efisiensi: d.liter > 0 ? parseFloat((d.jarak / d.liter).toFixed(1)) : 0,
    }));
  }, [filteredLogs]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Helper styling function for Log Item Badges
  const getItemBadgeStyle = (tipe: OdometerLogType) => {
    switch (tipe) {
      case 'ODO BC OUT':
        return {
          bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
          dot: 'bg-sky-500',
          icon: <LogOut className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />,
          label: 'BC OUT',
        };
      case 'ODO SESI MULAI':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          dot: 'bg-emerald-500',
          icon: <Play className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 fill-current" />,
          label: 'SESI MULAI',
        };
      case 'ODO SESI SELESAI':
        return {
          bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
          dot: 'bg-indigo-500',
          icon: <Flag className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />,
          label: 'SESI SELESAI',
        };
      case 'ODO BC IN':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          dot: 'bg-amber-500',
          icon: <LogIn className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />,
          label: 'BC IN',
        };
    }
  };

  // Export Columns Configuration
  const exportColumns: ExportColumn<any>[] = [
    { header: 'Tanggal', accessor: (row) => formatDateIndo(row.tanggal) },
    { header: 'Armada Mobil', accessor: (row) => row.kendaraan?.nama_kendaraan || '' },
    { header: 'Plat Nomor', accessor: (row) => row.kendaraan?.plat_nomor || '' },
    { header: 'Odometer BC Out (km)', accessor: (row) => row.odometer_basecamp_out ?? '' },
    { header: 'Odometer BC In (km)', accessor: (row) => row.odometer_basecamp_in ?? '' },
    { header: 'Jarak Tempuh (km)', accessor: (row) => row.effectiveJarak || '' },
    { header: 'Jumlah Sub-Log', accessor: (row) => (row.log_items || []).length },
    { header: 'Catatan', accessor: (row) => row.catatan || '' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Gauge className="w-5 h-5 text-[var(--brand-primary)]" />
            <span>Manajemen Log Armada & Odometer</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Pencatatan rute bertahap: Basecamp Out, Sesi Siswa, hingga Basecamp In dalam 1 linimasa harian.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <ExportButton
            data={sortedLogs}
            columns={exportColumns}
            filename={`Log_Armada_${startDate || 'all'}_sd_${endDate || 'all'}`}
            sheetName="Log Odometer"
            title="Rekap Log Odometer & Trip Armada"
            orientation="landscape"
          />
          <button
            type="button"
            onClick={() => handleOpenAddLog()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Log Armada</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card-container space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5" />
            Periode:
          </span>
          {(
            [
              { key: 'today', label: 'Hari Ini' },
              { key: '7days', label: '7 Hari Terakhir' },
              { key: 'month', label: 'Bulan Ini' },
              { key: '30days', label: '30 Hari Terakhir' },
              { key: 'all', label: 'Semua Waktu' },
              { key: 'custom', label: 'Rentang Kustom' },
            ] as const
          ).map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePresetChange(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                datePreset === p.key
                  ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Range Picker */}
        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
            <DatePickerWIB
              label="Tanggal Awal"
              value={startDate}
              onChange={setStartDate}
            />
            <DatePickerWIB
              label="Tanggal Akhir"
              value={endDate}
              onChange={setEndDate}
            />
          </div>
        )}

        {/* Secondary Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[var(--border)]">
          {!lockedKendaraanId ? (
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Pilih Armada
              </label>
              <select
                value={selectedKendaraanId}
                onChange={(e) => setSelectedKendaraanId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)]"
              >
                <option value="all">Semua Armada Kendaraan</option>
                {kendaraanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama_kendaraan} ({k.plat_nomor})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Status Armada Terpilih
              </label>
              <div className="px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] font-bold text-[var(--brand-primary)]">
                {kendaraanList.find((k) => k.id === lockedKendaraanId)?.nama_kendaraan} —{' '}
                {kendaraanList.find((k) => k.id === lockedKendaraanId)?.plat_nomor}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              Status Perjalanan
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)]"
            >
              <option value="all">Semua Status (Selesai & Berjalan)</option>
              <option value="selesai">Selesai (In & Out Terisi)</option>
              <option value="berjalan">Sedang Berjalan (BC In Pending)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              Pencarian
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari armada, siswa, tipe log..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
              />
              <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Live Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-container p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="font-semibold">Total Jarak Tempuh</span>
            <Activity className="w-4 h-4 text-[var(--brand-primary)]" />
          </div>
          <div className="text-2xl font-extrabold text-[var(--text-primary)] font-mono">
            {metrics.totalJarakKm.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-[var(--text-secondary)] ml-1">km</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
            <span>{metrics.tripSelesai} hari selesai</span>
            {metrics.tripBerjalan > 0 && (
              <span className="text-amber-600 font-semibold">• {metrics.tripBerjalan} jalan</span>
            )}
          </div>
        </div>

        <div className="card-container p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="font-semibold">Konsumsi BBM</span>
            <Fuel className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono">
            {metrics.totalLiterBbm.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-[var(--text-secondary)] ml-1">Liter</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Total Biaya: {formatRupiah(metrics.totalBiayaBbm)}
          </div>
        </div>

        <div className="card-container p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="font-semibold">Rasio Efisiensi Rata-rata</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600 font-mono">
            {metrics.rasioEfisiensi > 0 ? metrics.rasioEfisiensi : '-'}
            <span className="text-xs font-normal text-[var(--text-secondary)] ml-1">km/L</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            {metrics.biayaPerKm > 0 ? `${formatRupiah(metrics.biayaPerKm)}/km` : 'Biaya per KM'}
          </div>
        </div>

        <div className="card-container p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="font-semibold">Total Hari Tercatat</span>
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-purple-600 font-mono">
            {metrics.totalTrip}
            <span className="text-xs font-normal text-[var(--text-secondary)] ml-1">Hari</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            {metrics.tripBerjalan > 0 ? `${metrics.tripBerjalan} perlu BC In` : 'Semua log terkendali'}
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card-container p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--brand-primary)]" />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Grafik Analisis Log & Efisiensi Perjalanan
            </h3>
          </div>
          <div className="flex items-center gap-1 bg-[var(--bg-subtle)] p-1 rounded-xl">
            {(
              [
                { key: 'distance', label: 'Jarak (km)' },
                { key: 'fuel', label: 'BBM (L)' },
                { key: 'efficiency', label: 'Efisiensi (km/L)' },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setChartTab(t.key)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  chartTab === t.key
                    ? 'bg-[var(--bg)] text-[var(--text-primary)] shadow-xs font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-xs text-[var(--text-secondary)]">
            <Layers className="w-8 h-8 opacity-40 mb-2" />
            <span>Belum ada data log pada periode yang dipilih.</span>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartTab === 'distance' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="displayDate" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} unit=" km" />
                  <Tooltip
                    formatter={(val: any) => [`${val} km`, 'Jarak Tempuh']}
                    labelFormatter={(lbl) => `Tanggal: ${lbl}`}
                    contentStyle={{
                      backgroundColor: 'var(--bento-bg)',
                      border: '1px solid var(--bento-border)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="jarak" fill="var(--brand-primary)" radius={[6, 6, 0, 0]} name="Jarak Tempuh (km)" />
                </BarChart>
              ) : chartTab === 'fuel' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="displayDate" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} unit=" L" />
                  <Tooltip
                    formatter={(val: any) => [`${val} Liter`, 'Konsumsi BBM']}
                    labelFormatter={(lbl) => `Tanggal: ${lbl}`}
                    contentStyle={{
                      backgroundColor: 'var(--bento-bg)',
                      border: '1px solid var(--bento-border)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="liter" fill="#10B981" radius={[6, 6, 0, 0]} name="BBM (Liter)" />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="displayDate" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} unit=" km/L" />
                  <Tooltip
                    formatter={(val: any) => [`${val} km/L`, 'Rasio Efisiensi']}
                    labelFormatter={(lbl) => `Tanggal: ${lbl}`}
                    contentStyle={{
                      backgroundColor: 'var(--bento-bg)',
                      border: '1px solid var(--bento-border)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="efisiensi"
                    stroke="#2563EB"
                    fill="#3B82F6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="Efisiensi (km/L)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Interactive Log Records Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-[var(--brand-primary)]" />
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            Riwayat Log Odometer Harian ({sortedLogs.length} Hari)
          </h3>
        </div>
        <span className="text-[11px] text-[var(--text-secondary)]">
          Klik baris/kartu untuk mengurai linimasa sub-log
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 1. DESKTOP VIEW: Table with Sublist Accordion (hidden md:block)            */}
      {/* ========================================================================= */}
      <div className="hidden md:block card-container p-0 overflow-hidden space-y-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border)] select-none">
              <tr>
                <th className="p-3 w-8"></th>
                <th
                  onClick={() => toggleSort('tanggal')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Tanggal</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 font-bold">Armada Mobil</th>
                <th
                  onClick={() => toggleSort('out')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>BC Out</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('in')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>BC In</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('jarak')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Total Jarak</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 font-bold">Sub-Log / Sesi</th>
                <th className="p-3 font-bold">Status</th>
                <th className="p-3 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    Memuat data log armada...
                  </td>
                </tr>
              ) : sortedLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    Belum ada catatan log armada yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                sortedLogs.map((log) => {
                  const isExpanded = !!expandedLogIds[log.id];
                  const logItems = log.log_items || [];
                  const isCompleted =
                    log.isPeriodicDelta ||
                    log.isInitialBaseline ||
                    (log.odometer_basecamp_out !== null && log.odometer_basecamp_in !== null);

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleExpand(log.id)}
                        className={`hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ${
                          isExpanded ? 'bg-[var(--bg-subtle)]/60' : ''
                        }`}
                      >
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(log.id);
                            }}
                            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-transform"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>

                        <td className="p-3 font-semibold text-[var(--text-primary)]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                            <span>{formatDateIndo(log.tanggal)}</span>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-[var(--text-primary)]">
                            {log.kendaraan?.nama_kendaraan}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                            {log.kendaraan?.plat_nomor}
                          </div>
                        </td>

                        <td className="p-3 font-mono font-bold">
                          {log.odometer_basecamp_out !== null ? (
                            <span className="text-sky-700 dark:text-sky-400">
                              {log.odometer_basecamp_out.toLocaleString('id-ID')} km
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)]">-</span>
                          )}
                        </td>

                        <td className="p-3 font-mono font-bold">
                          {log.odometer_basecamp_in !== null ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              {log.odometer_basecamp_in.toLocaleString('id-ID')} km
                            </span>
                          ) : (
                            <span className="text-amber-600 font-normal italic text-[11px]">
                              Sedang Jalan
                            </span>
                          )}
                        </td>

                        <td className="p-3 font-mono font-extrabold">
                          {log.effectiveJarak > 0 ? (
                            <span className="text-emerald-600">
                              +{log.effectiveJarak.toLocaleString('id-ID')} km
                            </span>
                          ) : (
                            <span className="text-[var(--text-muted)] font-normal">-</span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg)] border border-[var(--border)] font-semibold text-[11px] text-[var(--text-primary)]">
                            <Layers className="w-3 h-3 text-[var(--brand-primary)]" />
                            <span>{logItems.length} Catatan</span>
                            {log.total_slot_selesai ? (
                              <span className="text-[var(--text-secondary)]">
                                ({log.total_slot_selesai} Sesi)
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="p-3">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Selesai</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3" />
                              <span>Sedang Jalan</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <div
                            className="inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenAddLog(undefined, log.tanggal, log.kendaraan_id)}
                              title="Tambah Sub-Log Pada Hari Ini"
                              className="p-1.5 rounded-lg text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTargetId(log.id)}
                              title="Hapus Rekap Log Hari Ini"
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Sublist Accordion Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-0 bg-[var(--bg-subtle)]/40 border-b border-[var(--border)]">
                            <div className="p-4 pl-10 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                                  <span>
                                    Linimasa Sub-Log Odometer ({formatDateIndo(log.tanggal)})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddLog(undefined, log.tanggal, log.kendaraan_id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-lg border border-[var(--brand-primary)]/30 transition-all cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Tambah Sub-Log Hari Ini</span>
                                </button>
                              </div>

                              {logItems.length === 0 ? (
                                <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-xs text-[var(--text-secondary)] text-center">
                                  Belum ada rincian event log pada hari ini.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {logItems.map((item, idx) => {
                                    const style = getItemBadgeStyle(item.tipe);
                                    // Calculate delta for sesi selesai if possible
                                    let sessionDelta: number | null = null;
                                    if (item.tipe === 'ODO SESI SELESAI' && item.siswa_id) {
                                      const startItem = logItems.find(
                                        (i) => i.tipe === 'ODO SESI MULAI' && i.siswa_id === item.siswa_id
                                      );
                                      if (startItem && item.odometer >= startItem.odometer) {
                                        sessionDelta = item.odometer - startItem.odometer;
                                      }
                                    }

                                    return (
                                      <div
                                        key={item.id || idx}
                                        className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] flex items-center justify-between gap-3 text-xs shadow-2xs"
                                      >
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                          {/* Type Badge */}
                                          <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold border ${style.bg}`}
                                          >
                                            {style.icon}
                                            <span>{item.tipe}</span>
                                          </span>

                                          {/* Odometer Value */}
                                          <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                                            {item.odometer.toLocaleString('id-ID')} km
                                          </span>

                                          {/* Session Delta if available */}
                                          {sessionDelta !== null && (
                                            <span className="font-mono font-bold text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                              +{sessionDelta} km sesi
                                            </span>
                                          )}

                                          {/* Student Info if session */}
                                          {item.siswa_nama && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                                              <User className="w-3 h-3 text-[var(--brand-primary)]" />
                                              <span>Siswa: <strong className="text-[var(--text-primary)]">{item.siswa_nama}</strong></span>
                                            </span>
                                          )}

                                          {/* Notes if available */}
                                          {item.catatan && (
                                            <span className="text-[11px] text-[var(--text-muted)] italic">
                                              ({item.catatan})
                                            </span>
                                          )}
                                        </div>

                                        {/* Action: Delete Sub-Item */}
                                        <button
                                          type="button"
                                          onClick={() => setDeleteItemTarget({ logId: log.id, item })}
                                          title="Hapus Event Ini"
                                          className="p-1.5 text-[var(--text-secondary)] hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MOBILE VIEW: Responsive Card Feed (block md:hidden)                     */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-2xl bg-[var(--bg-subtle)] animate-pulse border border-[var(--border)]"
              />
            ))}
          </div>
        ) : sortedLogs.length === 0 ? (
          <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] text-center text-xs text-[var(--text-secondary)]">
            Belum ada catatan log armada pada filter yang dipilih.
          </div>
        ) : (
          sortedLogs.map((log) => {
            const isExpanded = !!expandedLogIds[log.id];
            const logItems = log.log_items || [];
            const isCompleted =
              log.isPeriodicDelta ||
              log.isInitialBaseline ||
              (log.odometer_basecamp_out !== null && log.odometer_basecamp_in !== null);

            return (
              <div
                key={log.id}
                className="card-container p-4 space-y-3 border border-[var(--border)] rounded-2xl shadow-xs"
              >
                {/* Mobile Card Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
                    <span className="font-bold text-xs text-[var(--text-primary)]">
                      {formatDateIndo(log.tanggal)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Selesai</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3 h-3" />
                        <span>Jalan</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Vehicle & Metrics */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-sm text-[var(--text-primary)]">
                      {log.kendaraan?.nama_kendaraan}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                      {log.kendaraan?.plat_nomor}
                    </div>
                  </div>

                  {log.effectiveJarak > 0 && (
                    <div className="text-right">
                      <div className="text-sm font-extrabold font-mono text-emerald-600">
                        +{log.effectiveJarak.toLocaleString('id-ID')} km
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)]">Total Hari Ini</div>
                    </div>
                  )}
                </div>

                {/* Mobile Odometer Gauge Bar */}
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] block font-semibold">
                      BC Out (Keluar):
                    </span>
                    <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                      {log.odometer_basecamp_out !== null
                        ? `${log.odometer_basecamp_out.toLocaleString('id-ID')} km`
                        : '-'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[var(--text-secondary)] block font-semibold">
                      BC In (Kembali):
                    </span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                      {log.odometer_basecamp_in !== null ? (
                        `${log.odometer_basecamp_in.toLocaleString('id-ID')} km`
                      ) : (
                        <span className="text-amber-600 font-normal italic text-[11px]">
                          Sedang Jalan
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Mobile Accordion Toggle Button */}
                <button
                  type="button"
                  onClick={() => toggleExpand(log.id)}
                  className="w-full py-2 px-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--bg-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    <span>Rincian Linimasa ({logItems.length} Event)</span>
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[var(--brand-primary)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                  )}
                </button>

                {/* Mobile Expanded Timeline Sublist */}
                {isExpanded && (
                  <div className="pt-2 border-t border-[var(--border)] space-y-2">
                    {logItems.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] rounded-xl">
                        Belum ada sub-log tercatat pada hari ini.
                      </div>
                    ) : (
                      logItems.map((item, idx) => {
                        const style = getItemBadgeStyle(item.tipe);
                        let sessionDelta: number | null = null;
                        if (item.tipe === 'ODO SESI SELESAI' && item.siswa_id) {
                          const startItem = logItems.find(
                            (i) => i.tipe === 'ODO SESI MULAI' && i.siswa_id === item.siswa_id
                          );
                          if (startItem && item.odometer >= startItem.odometer) {
                            sessionDelta = item.odometer - startItem.odometer;
                          }
                        }

                        return (
                          <div
                            key={item.id || idx}
                            className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${style.bg}`}
                              >
                                {style.icon}
                                <span>{item.tipe}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setDeleteItemTarget({ logId: log.id, item })}
                                className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="font-mono font-bold text-sm text-[var(--text-primary)]">
                                {item.odometer.toLocaleString('id-ID')} km
                              </span>
                              {sessionDelta !== null && (
                                <span className="font-mono font-bold text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                  +{sessionDelta} km sesi
                                </span>
                              )}
                            </div>

                            {item.siswa_nama && (
                              <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 pt-0.5">
                                <User className="w-3 h-3 text-[var(--brand-primary)]" />
                                <span>Siswa: <strong className="text-[var(--text-primary)]">{item.siswa_nama}</strong></span>
                              </div>
                            )}

                            {item.catatan && (
                              <div className="text-[10px] text-[var(--text-muted)] italic pt-0.5">
                                {item.catatan}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Mobile Card Action Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAddLog(undefined, log.tanggal, log.kendaraan_id)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Log Lanjutan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(log.id)}
                    className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL INPUT: Catat Log Armada (Multi-Event Odometer)                    */}
      {/* ========================================================================= */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Catat Log Armada / Odometer</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLog} className="space-y-4 text-xs">
              {/* Armada Selection */}
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Armada Mobil *
                </label>
                <select
                  value={formKendaraanId}
                  onChange={(e) => setFormKendaraanId(e.target.value)}
                  disabled={Boolean(lockedKendaraanId)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-bold text-[var(--text-primary)]"
                >
                  {kendaraanList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama_kendaraan} — {k.plat_nomor} ({k.tipe_transmisi.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal Input */}
              <div>
                <DatePickerWIB
                  label="Tanggal Operasional *"
                  value={formTanggal}
                  onChange={setFormTanggal}
                />
              </div>

              {/* Tipe Input Selection (4 Interactive Cards) */}
              <div>
                <label className="block text-[var(--text-secondary)] mb-1.5 font-semibold">
                  Pilih Tipe Input Odometer *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      {
                        tipe: 'ODO BC OUT' as OdometerLogType,
                        label: 'ODO BC OUT',
                        desc: 'Keluar Basecamp',
                        icon: <LogOut className="w-4 h-4 text-sky-600" />,
                        activeClass:
                          'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 ring-2 ring-sky-400',
                      },
                      {
                        tipe: 'ODO SESI MULAI' as OdometerLogType,
                        label: 'ODO SESI MULAI',
                        desc: 'Siswa Mulai Latihan',
                        icon: <Play className="w-4 h-4 text-emerald-600 fill-current" />,
                        activeClass:
                          'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-400',
                      },
                      {
                        tipe: 'ODO SESI SELESAI' as OdometerLogType,
                        label: 'ODO SESI SELESAI',
                        desc: 'Siswa Selesai Latihan',
                        icon: <Flag className="w-4 h-4 text-indigo-600" />,
                        activeClass:
                          'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-400',
                      },
                      {
                        tipe: 'ODO BC IN' as OdometerLogType,
                        label: 'ODO BC IN',
                        desc: 'Kembali ke Basecamp',
                        icon: <LogIn className="w-4 h-4 text-amber-600" />,
                        activeClass:
                          'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 ring-2 ring-amber-400',
                      },
                    ] as const
                  ).map((opt) => {
                    const isSelected = formTipe === opt.tipe;
                    return (
                      <button
                        key={opt.tipe}
                        type="button"
                        onClick={() => {
                          setFormTipe(opt.tipe);
                          setSelectedSiswaId('');
                          setSelectedSiswaNama('');
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? opt.activeClass
                            : 'border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {opt.icon}
                          <span className="font-extrabold text-xs">{opt.label}</span>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)] block">
                          {opt.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Dropdown Siswa for ODO SESI MULAI */}
              {formTipe === 'ODO SESI MULAI' && (
                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5 animate-fadeIn">
                  <label className="block text-[var(--text-primary)] font-bold">
                    Pilih Siswa (Jadwal Tanggal {formatDateIndo(formTanggal)}) *
                  </label>
                  {loadingSiswa ? (
                    <div className="text-[11px] text-[var(--text-secondary)] italic">
                      Memuat jadwal siswa pada tanggal ini...
                    </div>
                  ) : availableSiswa.length === 0 ? (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                      Tidak ada jadwal siswa yang terdaftar pada tanggal ini. Anda tetap dapat memasukkan nama siswa secara manual di catatan.
                    </div>
                  ) : (
                    <select
                      value={selectedSiswaId}
                      onChange={(e) => {
                        const sid = e.target.value;
                        setSelectedSiswaId(sid);
                        const sObj = availableSiswa.find((s) => s.id === sid);
                        setSelectedSiswaNama(sObj ? sObj.nama : '');
                      }}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                    >
                      <option value="">-- Pilih Siswa Yang Mulai Sesi --</option>
                      {availableSiswa.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} {s.slot ? `— ${s.slot}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Dynamic Dropdown Siswa for ODO SESI SELESAI */}
              {formTipe === 'ODO SESI SELESAI' && (
                <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 space-y-1.5 animate-fadeIn">
                  <label className="block text-[var(--text-primary)] font-bold">
                    Pilih Siswa (Yang Sudah Memiliki ODO SESI MULAI) *
                  </label>
                  {startedStudentsOnDate.length === 0 ? (
                    <div className="text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-800 flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Belum ada siswa dengan status <strong>ODO SESI MULAI</strong> pada armada ini untuk tanggal {formatDateIndo(formTanggal)}. Harap catat ODO SESI MULAI terlebih dahulu.
                      </span>
                    </div>
                  ) : (
                    <select
                      value={selectedSiswaId}
                      onChange={(e) => {
                        const sid = e.target.value;
                        setSelectedSiswaId(sid);
                        const sObj = startedStudentsOnDate.find((s) => s.id === sid);
                        setSelectedSiswaNama(sObj ? sObj.nama : '');
                      }}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                    >
                      <option value="">-- Pilih Siswa Yang Selesai Sesi --</option>
                      {startedStudentsOnDate.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nama} — (Odo Mulai: {s.startOdo.toLocaleString('id-ID')} km)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Odometer Input */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-1">
                <label className="block text-[var(--text-secondary)] font-bold">
                  Angka Odometer (km) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    placeholder="Contoh: 222350"
                    value={formOdo}
                    onChange={(e) => setFormOdo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono font-extrabold text-base text-[var(--text-primary)]"
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-[var(--text-muted)]">
                    KM
                  </span>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] block">
                  Pastikan angka sesuai tampilan spidometer riil mobil.
                </span>
              </div>

              {/* Catatan Operasional (Opsional) */}
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Catatan Operasional (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Rute luar kota / Kondisi jalan macet / Cuaca hujan..."
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !formOdo ||
                    (formTipe === 'ODO SESI SELESAI' && startedStudentsOnDate.length === 0)
                  }
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] disabled:opacity-50 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  {saving ? (
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{saving ? 'Menyimpan...' : 'Simpan Log Armada'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. OVERWRITE CONFIRMATION MODAL                                           */}
      {/* ========================================================================= */}
      {overwriteConfirmData && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[var(--text-primary)]">
                  Konfirmasi Timpa Data Log
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Ditemukan data log dengan tipe yang sama pada tanggal ini.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2 text-xs">
              <div className="text-[var(--text-secondary)]">
                Armada: <strong className="text-[var(--text-primary)]">{overwriteConfirmData.vehicleName}</strong>
              </div>
              <div className="text-[var(--text-secondary)]">
                Tanggal: <strong className="text-[var(--text-primary)]">{formatDateIndo(overwriteConfirmData.input.tanggal)}</strong>
              </div>
              <div className="text-[var(--text-secondary)]">
                Tipe Log: <span className="font-bold text-[var(--brand-primary)]">{overwriteConfirmData.input.tipe}</span>
                {overwriteConfirmData.input.siswa_nama && (
                  <span> (Siswa: {overwriteConfirmData.input.siswa_nama})</span>
                )}
              </div>

              <div className="pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-semibold">
                    Data Sebelumnya
                  </span>
                  <span className="font-mono font-bold text-sm text-rose-700 dark:text-rose-300">
                    {overwriteConfirmData.existingItem.odometer.toLocaleString('id-ID')} km
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">
                    Data Baru (Pengganti)
                  </span>
                  <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300">
                    {overwriteConfirmData.input.odometer.toLocaleString('id-ID')} km
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              Apakah Anda yakin ingin menimpa (*overwrite*) catatan log sebelumnya dengan angka odometer baru?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setOverwriteConfirmData(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmOverwrite}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                {saving ? (
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Ya, Timpa Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Day Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDeleteDay}
        title="HAPUS SELURUH LOG HARI INI"
        description="Apakah Anda yakin ingin menghapus seluruh catatan log armada pada tanggal ini? Semua linimasa sub-log pada hari tersebut akan terhapus."
        confirmText="Ya, Hapus Semua Log Hari Ini"
        isDanger
      />

      {/* Delete Sub-Item Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteItemTarget)}
        onClose={() => setDeleteItemTarget(null)}
        onConfirm={handleConfirmDeleteItem}
        title="HAPUS SUB-EVENT ODOMETER"
        description={`Apakah Anda yakin ingin menghapus catatan "${deleteItemTarget?.item.tipe} (${deleteItemTarget?.item.odometer.toLocaleString('id-ID')} km)"? Data ringkasan hari ini akan dihitung ulang secara otomatis.`}
        confirmText="Ya, Hapus Sub-Log"
        isDanger
      />
    </div>
  );
}
