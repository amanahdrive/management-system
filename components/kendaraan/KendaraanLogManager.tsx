'use client';

import React from 'react';
import { Kendaraan, KendaraanLogHarian, HargaBBM } from '@/types/database';
import {
  getKendaraanLogList,
  upsertKendaraanLog,
  quickInputBasecampIn,
  deleteKendaraanLog,
  getHargaBBMList,
} from '@/lib/actions/kendaraan';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, getTodayDateString, addDaysToDateStr } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
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
  Edit2,
  Trash2,
  BarChart3,
  Check,
  AlertCircle,
  Activity,
  Layers,
} from 'lucide-react';

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

  // Modal States
  const [showLogModal, setShowLogModal] = React.useState(false);
  const [editingLog, setEditingLog] = React.useState<KendaraanLogHarian | null>(null);

  // Quick BC In Modal State
  const [quickBcInLog, setQuickBcInLog] = React.useState<KendaraanLogHarian | null>(null);
  const [quickInKm, setQuickInKm] = React.useState<string>('');
  const [quickTanggalAkhir, setQuickTanggalAkhir] = React.useState<string>(getTodayDateString());

  // Delete Confirm Dialog
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  // Form State
  const [formKendaraanId, setFormKendaraanId] = React.useState<string>(
    lockedKendaraanId || (kendaraanList[0]?.id || '')
  );
  const [formTanggalAwal, setFormTanggalAwal] = React.useState<string>(getTodayDateString());
  const [formTanggalAkhir, setFormTanggalAkhir] = React.useState<string>('');
  const [formOutKm, setFormOutKm] = React.useState<string>('');
  const [formInKm, setFormInKm] = React.useState<string>('');
  const [formCatatan, setFormCatatan] = React.useState<string>('');

  // Optional Fuel Section in Modal
  const [formIsiBbm, setFormIsiBbm] = React.useState<boolean>(false);
  const [formBbmJenis, setFormBbmJenis] = React.useState<string>('pertalite');
  const [formBbmNominal, setFormBbmNominal] = React.useState<number>(150000);
  const [formBbmLiter, setFormBbmLiter] = React.useState<string>('');

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
    } catch (e) {
      console.error('Error loading log data:', e);
    } finally {
      setLoading(false);
    }
  }, [lockedKendaraanId, selectedKendaraanId, datePreset, startDate, endDate]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Open Log Modal (Create / Edit)
  const handleOpenAddLog = () => {
    setEditingLog(null);
    const defaultKid = lockedKendaraanId || kendaraanList[0]?.id || '';
    setFormKendaraanId(defaultKid);
    setFormTanggalAwal(getTodayDateString());
    setFormTanggalAkhir('');
    
    // Auto-fill outKm from latest vehicle status if available
    const selectedVeh = kendaraanList.find((k) => k.id === defaultKid);
    const currentOdo = selectedVeh?.status?.odometer_terkini || 0;
    setFormOutKm(currentOdo > 0 ? currentOdo.toString() : '');
    setFormInKm('');
    setFormCatatan('');
    setFormIsiBbm(false);
    setFormBbmJenis('pertalite');
    setFormBbmNominal(150000);
    setFormBbmLiter('');
    setFormError(null);
    setShowLogModal(true);
  };

  const handleOpenEditLog = (log: KendaraanLogHarian) => {
    setEditingLog(log);
    setFormKendaraanId(log.kendaraan_id);
    setFormTanggalAwal(log.tanggal);
    setFormTanggalAkhir(log.tanggal_akhir || '');
    setFormOutKm(log.odometer_basecamp_out !== null ? log.odometer_basecamp_out.toString() : '');
    setFormInKm(log.odometer_basecamp_in !== null ? log.odometer_basecamp_in.toString() : '');
    setFormCatatan(log.catatan || '');
    if (log.bbm_nominal || log.bbm_liter) {
      setFormIsiBbm(true);
      setFormBbmJenis(log.bbm_jenis || 'pertalite');
      setFormBbmNominal(log.bbm_nominal || 150000);
      setFormBbmLiter(log.bbm_liter ? log.bbm_liter.toString() : '');
    } else {
      setFormIsiBbm(false);
      setFormBbmJenis('pertalite');
      setFormBbmNominal(150000);
      setFormBbmLiter('');
    }
    setFormError(null);
    setShowLogModal(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKendaraanId || !formTanggalAwal) {
      setFormError('Armada dan Tanggal Awal wajib diisi');
      return;
    }

    const outNum = formOutKm ? parseInt(formOutKm, 10) : undefined;
    const inNum = formInKm ? parseInt(formInKm, 10) : undefined;

    if (outNum !== undefined && inNum !== undefined && inNum < outNum) {
      setFormError('Odometer Basecamp In tidak boleh lebih kecil dari Odometer Basecamp Out');
      return;
    }

    setSaving(true);
    setFormError(null);

    let calculatedLiter: number | undefined = undefined;
    if (formIsiBbm) {
      if (formBbmLiter) {
        calculatedLiter = parseFloat(formBbmLiter);
      } else if (formBbmNominal > 0) {
        const pricePerLiter =
          hargaBbmList.find((b) => b.jenis === formBbmJenis)?.harga_per_liter || 10000;
        calculatedLiter = parseFloat((formBbmNominal / pricePerLiter).toFixed(2));
      }
    }

    const res = await upsertKendaraanLog({
      id: editingLog?.id,
      kendaraan_id: formKendaraanId,
      tanggal: formTanggalAwal,
      tanggal_akhir: formTanggalAkhir || null,
      odometer_basecamp_out: outNum,
      odometer_basecamp_in: inNum,
      bbm_liter: formIsiBbm ? calculatedLiter : null,
      bbm_nominal: formIsiBbm ? formBbmNominal : null,
      bbm_jenis: formIsiBbm ? formBbmJenis : null,
      catatan: formCatatan || null,
    });

    setSaving(false);
    if (res.success) {
      setShowLogModal(false);
      loadData();
      if (onDataChange) onDataChange();
    } else {
      setFormError(res.error || 'Gagal menyimpan log armada');
    }
  };

  // Quick BC In Handler
  const handleOpenQuickBcIn = (log: KendaraanLogHarian) => {
    setQuickBcInLog(log);
    setQuickInKm(log.odometer_basecamp_out ? (log.odometer_basecamp_out + 20).toString() : '');
    setQuickTanggalAkhir(getTodayDateString());
  };

  const handleSaveQuickBcIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBcInLog || !quickInKm) return;

    const inNum = parseInt(quickInKm, 10);
    const outNum = quickBcInLog.odometer_basecamp_out || 0;

    if (inNum < outNum) {
      alert('Odometer BC In harus lebih besar atau sama dengan Odometer BC Out!');
      return;
    }

    setSaving(true);
    const res = await quickInputBasecampIn(quickBcInLog.id, inNum, quickTanggalAkhir);
    setSaving(false);

    if (res.success) {
      setQuickBcInLog(null);
      loadData();
      if (onDataChange) onDataChange();
    } else {
      alert('Gagal menginput Basecamp In: ' + res.error);
    }
  };

  // Delete Handler
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setSaving(true);
    const res = await deleteKendaraanLog(deleteTargetId);
    setSaving(false);
    setDeleteTargetId(null);
    if (res.success) {
      loadData();
      if (onDataChange) onDataChange();
    } else {
      alert('Gagal menghapus log: ' + res.error);
    }
  };

  // Compute Enriched Logs with Effective Distance across Checkpoint / Periodic Snapshots
  const enrichedLogs = React.useMemo(() => {
    // Group all logs by vehicle
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
      // Sort chronologically ascending
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
      // Vehicle Filter
      if (
        !lockedKendaraanId &&
        selectedKendaraanId !== 'all' &&
        log.kendaraan_id !== selectedKendaraanId
      ) {
        return false;
      }

      // Status Filter
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

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const vName = log.kendaraan?.nama_kendaraan?.toLowerCase() || '';
        const vPlate = log.kendaraan?.plat_nomor?.toLowerCase() || '';
        const catatan = (log.catatan || '').toLowerCase();
        if (!vName.includes(q) && !vPlate.includes(q) && !catatan.includes(q)) {
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
    const literPerKm =
      totalJarakKm > 0 && totalLiterBbm > 0
        ? parseFloat((totalLiterBbm / totalJarakKm).toFixed(4))
        : 0;
    const literPer100Km =
      totalJarakKm > 0 && totalLiterBbm > 0
        ? parseFloat(((totalLiterBbm / totalJarakKm) * 100).toFixed(2))
        : 0;
    const biayaPerKm =
      totalJarakKm > 0 && totalBiayaBbm > 0 ? Math.round(totalBiayaBbm / totalJarakKm) : 0;

    return {
      totalJarakKm,
      totalLiterBbm: parseFloat(totalLiterBbm.toFixed(1)),
      totalBiayaBbm,
      rasioEfisiensi,
      literPerKm,
      literPer100Km,
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
      displayDate: d.tanggal.slice(5), // MM-DD
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

  // Live calculation for the modal form
  const modalPreviewJarak = React.useMemo<{
    jarak: number;
    type: 'single' | 'periodic' | 'initial' | 'same';
    prevOdo?: number;
    prevDate?: string;
    currOdo?: number;
  } | null>(() => {
    const outN = formOutKm ? parseInt(formOutKm, 10) : null;
    const inN = formInKm ? parseInt(formInKm, 10) : null;

    if (outN !== null && inN !== null && inN > outN) {
      return { jarak: inN - outN, type: 'single' };
    }

    const currN = inN !== null ? inN : outN;
    if (currN !== null && !isNaN(Number(currN))) {
      const numVal = Number(currN);
      // Find prior log for this vehicle
      const priorLogs = logs
        .filter(
          (l) =>
            l.kendaraan_id === formKendaraanId &&
            (!editingLog || l.id !== editingLog.id) &&
            new Date(l.tanggal).getTime() <= new Date(formTanggalAwal).getTime()
        )
        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

      const prevLog = priorLogs[0];
      const prevOdo =
        prevLog?.odometer_basecamp_in !== null && prevLog?.odometer_basecamp_in !== undefined
          ? prevLog.odometer_basecamp_in
          : prevLog?.odometer_basecamp_out !== null && prevLog?.odometer_basecamp_out !== undefined
          ? prevLog.odometer_basecamp_out
          : null;

      if (prevOdo !== null && numVal > prevOdo) {
        return {
          jarak: numVal - prevOdo,
          type: 'periodic',
          prevOdo,
          prevDate: prevLog.tanggal,
        };
      } else if (prevOdo !== null && numVal === prevOdo) {
        return { jarak: 0, type: 'same' };
      } else if (prevOdo === null) {
        return { jarak: 0, type: 'initial', currOdo: numVal };
      }
    }
    return null;
  }, [formOutKm, formInKm, formKendaraanId, formTanggalAwal, editingLog, logs]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Gauge className="w-5 h-5 text-[var(--brand-primary)]" />
            <span>Log Odometer & Monitoring Armada</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Pencatatan Basecamp Out/In, akumulasi jarak operasional, dan konsumsi BBM armada real-time
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddLog}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Catat Log Armada / BC Out</span>
        </button>
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
          {/* Vehicle Dropdown (if not locked) */}
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
                Status Armada
              </label>
              <div className="px-3 py-2 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] font-bold text-[var(--brand-primary)]">
                {kendaraanList.find((k) => k.id === lockedKendaraanId)?.nama_kendaraan} —{' '}
                {kendaraanList.find((k) => k.id === lockedKendaraanId)?.plat_nomor}
              </div>
            </div>
          )}

          {/* Status Trip Filter */}
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

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              Pencarian
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari armada, plat, catatan..."
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
        {/* Total Jarak */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-[var(--brand-primary)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Total Jarak Tempuh
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tabular-nums">
            {metrics.totalJarakKm.toLocaleString('id-ID')} <span className="text-xs font-semibold">km</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>{metrics.tripSelesai} trip selesai</span>
            {metrics.tripBerjalan > 0 && (
              <span className="text-amber-600 font-bold">({metrics.tripBerjalan} jalan)</span>
            )}
          </div>
        </div>

        {/* Total BBM */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Total Konsumsi BBM
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 tabular-nums">
            {metrics.totalLiterBbm.toLocaleString('id-ID')} <span className="text-xs font-semibold">Liter</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Biaya: <span className="font-bold text-[var(--text-primary)]">{formatRupiah(metrics.totalBiayaBbm)}</span>
          </div>
        </div>

        {/* Efisiensi BBM */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-blue-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Efisiensi BBM
            </span>
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--brand-primary)] tabular-nums">
            {metrics.rasioEfisiensi > 0 ? `${metrics.rasioEfisiensi}` : '-'}{' '}
            <span className="text-xs font-semibold">km/L</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Konsumsi:{' '}
            <span className="font-semibold text-[var(--text-primary)]">
              {metrics.literPer100Km > 0 ? `${metrics.literPer100Km} L/100km` : '-'}
            </span>
          </div>
        </div>

        {/* Biaya per KM */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-purple-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Biaya Operasional / KM
            </span>
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-purple-600 tabular-nums">
            {metrics.biayaPerKm > 0 ? formatRupiah(metrics.biayaPerKm) : '-'}{' '}
            <span className="text-xs font-semibold text-[var(--text-secondary)]">/ km</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            {metrics.totalTrip} total catatan periode ini
          </div>
        </div>
      </div>

      {/* Interactive Visualizations */}
      <div className="card-container space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--brand-primary)]" />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Grafik Tren & Visualisasi Log Armada
            </h3>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setChartTab('distance')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                chartTab === 'distance'
                  ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Jarak Tempuh (km)
            </button>
            <button
              type="button"
              onClick={() => setChartTab('fuel')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                chartTab === 'fuel'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              BBM (Liter)
            </button>
            <button
              type="button"
              onClick={() => setChartTab('efficiency')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                chartTab === 'efficiency'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Efisiensi (km/L)
            </button>
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

      {/* Interactive Log Table */}
      <div className="card-container p-0 overflow-hidden space-y-0">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-[var(--brand-primary)]" />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Riwayat Log Odometer & Trip Armada ({sortedLogs.length})
            </h3>
          </div>
          <span className="text-[11px] text-[var(--text-secondary)]">
            Klik header kolom untuk mengurutkan (Sort)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border)] select-none">
              <tr>
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
                    <span>Jarak (km)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('bbm')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>BBM</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('efisiensi')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Efisiensi</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 font-bold">Status</th>
                <th className="p-3 font-bold">Catatan</th>
                <th className="p-3 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    Memuat data log armada...
                  </td>
                </tr>
              ) : sortedLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    Belum ada catatan log armada yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                sortedLogs.map((log) => {
                  const isCompleted =
                    log.isPeriodicDelta ||
                    log.isInitialBaseline ||
                    (log.odometer_basecamp_in !== null && log.odometer_basecamp_out !== null);
                  const isPendingIn =
                    log.odometer_basecamp_out !== null &&
                    log.odometer_basecamp_in === null &&
                    !log.isPeriodicDelta &&
                    !log.isInitialBaseline;
                  const efisiensi = log.calculatedEfisiensi ? `${log.calculatedEfisiensi}` : null;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-[var(--bg-subtle)]/50 transition-colors"
                    >
                      {/* Tanggal */}
                      <td className="p-3 whitespace-nowrap font-medium text-[var(--text-primary)]">
                        <div>{formatDateIndo(log.tanggal)}</div>
                        {log.tanggal_akhir && log.tanggal_akhir !== log.tanggal && (
                          <div className="text-[10px] text-[var(--text-secondary)]">
                            s/d {formatDateIndo(log.tanggal_akhir)}
                          </div>
                        )}
                      </td>

                      {/* Armada */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="font-bold text-[var(--text-primary)]">
                          {log.kendaraan?.nama_kendaraan || 'Armada'}
                        </div>
                        <div className="text-[10px] font-mono font-bold text-[var(--brand-primary)]">
                          {log.kendaraan?.plat_nomor}
                        </div>
                      </td>

                      {/* BC Out */}
                      <td className="p-3 whitespace-nowrap font-mono tabular-nums">
                        {log.odometer_basecamp_out !== null ? (
                          <span className="font-semibold text-[var(--text-primary)]">
                            {log.odometer_basecamp_out.toLocaleString('id-ID')} km
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </td>

                      {/* BC In */}
                      <td className="p-3 whitespace-nowrap font-mono tabular-nums">
                        {log.odometer_basecamp_in !== null ? (
                          <span className="font-semibold text-[var(--text-primary)]">
                            {log.odometer_basecamp_in.toLocaleString('id-ID')} km
                          </span>
                        ) : isPendingIn ? (
                          <button
                            type="button"
                            onClick={() => handleOpenQuickBcIn(log)}
                            className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-[10px] font-bold hover:bg-amber-200 transition-all active:scale-95 flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>+ Input BC In</span>
                          </button>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </td>

                      {/* Jarak Tempuh */}
                      <td className="p-3 whitespace-nowrap font-mono tabular-nums">
                        {log.effectiveJarak > 0 ? (
                          <div>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-900">
                              {log.effectiveJarak.toLocaleString('id-ID')} km
                            </span>
                            {log.isPeriodicDelta && log.deltaFromDate && (
                              <div className="text-[10px] text-[var(--text-secondary)] font-sans font-medium mt-0.5">
                                dari {formatDateIndo(log.deltaFromDate)}
                              </div>
                            )}
                          </div>
                        ) : log.isInitialBaseline ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold border border-blue-200 text-[10px]">
                            Titik Awal ({((log.odometer_basecamp_in ?? log.odometer_basecamp_out) ?? 0).toLocaleString('id-ID')} km)
                          </span>
                        ) : isPendingIn ? (
                          <span className="text-amber-600 font-semibold italic text-[11px]">Sedang jalan</span>
                        ) : (
                          <span className="text-[var(--text-muted)]">0 km</span>
                        )}
                      </td>

                      {/* BBM */}
                      <td className="p-3 whitespace-nowrap text-[11px]">
                        {log.bbm_liter || log.bbm_nominal ? (
                          <div>
                            <div className="font-bold text-emerald-600">
                              {log.bbm_liter ? `${log.bbm_liter} L` : ''}{' '}
                              <span className="uppercase text-[10px] text-[var(--text-secondary)] font-semibold">
                                {log.bbm_jenis}
                              </span>
                            </div>
                            {log.bbm_nominal && (
                              <div className="text-[10px] text-[var(--text-secondary)]">
                                {formatRupiah(log.bbm_nominal)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </td>

                      {/* Efisiensi */}
                      <td className="p-3 whitespace-nowrap font-mono">
                        {efisiensi ? (
                          <span className="font-bold text-[var(--brand-primary)]">{efisiensi} km/L</span>
                        ) : (
                          <span className="text-[var(--text-muted)]">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        {isCompleted ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Selesai
                          </span>
                        ) : isPendingIn ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                            Sedang Berjalan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-[10px] font-semibold">
                            Tercatat
                          </span>
                        )}
                      </td>

                      {/* Catatan */}
                      <td className="p-3 max-w-xs truncate text-[11px] text-[var(--text-secondary)]">
                        {log.catatan || '-'}
                      </td>

                      {/* Aksi */}
                      <td className="p-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditLog(log)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                            title="Edit Catatan Log"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(log.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Hapus Log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog Form (Create / Edit Log) */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>{editingLog ? 'Edit Log Armada' : 'Catat Log Armada / Basecamp Out'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-[var(--danger)] text-xs flex items-center gap-2">
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

              {/* Tanggal Awal & Akhir */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DatePickerWIB
                  label="Tanggal Awal / Berangkat *"
                  value={formTanggalAwal}
                  onChange={setFormTanggalAwal}
                />
                <DatePickerWIB
                  label="Tanggal Akhir / Kembali (Opsional)"
                  value={formTanggalAkhir}
                  onChange={setFormTanggalAkhir}
                />
              </div>

              {/* Odometer BC Out & BC In */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                    Odometer BC Out (km) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 45000"
                    value={formOutKm}
                    onChange={(e) => setFormOutKm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono font-bold text-sm text-[var(--text-primary)]"
                  />
                  <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                    Angka km saat mobil keluar
                  </span>
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                    Odometer BC In (km){' '}
                    <span className="font-normal text-amber-600">(Skip jika belum kembali)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Kosongkan jika masih jalan"
                    value={formInKm}
                    onChange={(e) => setFormInKm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono font-bold text-sm text-[var(--text-primary)]"
                  />
                  <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                    Angka km saat mobil tiba kembali
                  </span>
                </div>

                {modalPreviewJarak !== null && (
                  <div className="col-span-1 sm:col-span-2 pt-2 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <span className="font-semibold text-[var(--text-secondary)]">
                      {modalPreviewJarak.type === 'single'
                        ? 'Kalkulasi Trip Selesai:'
                        : modalPreviewJarak.type === 'periodic'
                        ? `Akumulasi Berkala (sejak ${formatDateIndo(modalPreviewJarak.prevDate || '')}):`
                        : modalPreviewJarak.type === 'initial'
                        ? 'Status Odometer:'
                        : 'Kalkulasi Jarak:'}
                    </span>
                    <span className="font-extrabold text-sm text-emerald-600 font-mono">
                      {modalPreviewJarak.type === 'initial'
                        ? `Titik Awal (${(modalPreviewJarak.currOdo || 0).toLocaleString('id-ID')} km)`
                        : `+${modalPreviewJarak.jarak.toLocaleString('id-ID')} km`}
                    </span>
                  </div>
                )}
              </div>

              {/* Optional BBM Toggle */}
              <div className="space-y-3 pt-1 border-t border-[var(--border)]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsiBbm}
                    onChange={(e) => setFormIsiBbm(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Catat Pengisian BBM pada perjalanan/hari ini</span>
                  </span>
                </label>

                {formIsiBbm && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                    <div>
                      <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                        Jenis BBM
                      </label>
                      <select
                        value={formBbmJenis}
                        onChange={(e) => setFormBbmJenis(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                      >
                        <option value="pertalite">Pertalite</option>
                        <option value="pertamax">Pertamax</option>
                        <option value="solar">Solar / Dexlite</option>
                      </select>
                    </div>

                    <div>
                      <CurrencyInput
                        label="Nominal Pembelian (Rp)"
                        value={formBbmNominal}
                        onChange={setFormBbmNominal}
                      />
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                        Volume Liter (Opsional — default hitung otomatis dari harga BBM)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Contoh: 15.0"
                        value={formBbmLiter}
                        onChange={(e) => setFormBbmLiter(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono text-[var(--text-primary)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Catatan Operasional / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Sesi siswa luar kota / Antar jemput / Operasional reguler"
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] disabled:opacity-50 text-white flex items-center gap-1.5 transition-all shadow-xs"
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

      {/* Quick BC In Modal */}
      {quickBcInLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Input Odometer Basecamp In</span>
              </h3>
              <button
                type="button"
                onClick={() => setQuickBcInLog(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs space-y-1">
              <div className="font-bold text-[var(--text-primary)]">
                {quickBcInLog.kendaraan?.nama_kendaraan} ({quickBcInLog.kendaraan?.plat_nomor})
              </div>
              <div className="text-[var(--text-secondary)]">
                Tanggal Keluar: {formatDateIndo(quickBcInLog.tanggal)}
              </div>
              <div className="font-mono text-[var(--brand-primary)] font-bold">
                Odometer Out: {quickBcInLog.odometer_basecamp_out?.toLocaleString('id-ID')} km
              </div>
            </div>

            <form onSubmit={handleSaveQuickBcIn} className="space-y-3 text-xs">
              <DatePickerWIB
                label="Tanggal Kembali / Basecamp In"
                value={quickTanggalAkhir}
                onChange={setQuickTanggalAkhir}
              />

              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Odometer Basecamp In (km) *
                </label>
                <input
                  type="number"
                  required
                  autoFocus
                  placeholder="Masukkan angka odometer terkini"
                  value={quickInKm}
                  onChange={(e) => setQuickInKm(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-mono font-bold text-base text-[var(--text-primary)]"
                />
              </div>

              {quickInKm && quickBcInLog.odometer_basecamp_out && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center justify-between font-medium">
                  <span>Jarak Trip Ini:</span>
                  <span className="font-bold font-mono text-sm">
                    {Math.max(0, parseInt(quickInKm, 10) - quickBcInLog.odometer_basecamp_out).toLocaleString(
                      'id-ID'
                    )}{' '}
                    km
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setQuickBcInLog(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || !quickInKm}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-all shadow-xs"
                >
                  {saving ? (
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{saving ? 'Menyimpan...' : 'Tutup Trip & Simpan BC In'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="HAPUS CATATAN LOG ARMADA"
        description="Apakah Anda yakin ingin menghapus catatan log odometer ini? Data yang dihapus tidak dapat dipulihkan."
        confirmText="Ya, Hapus Log"
        isDanger
      />
    </div>
  );
}
