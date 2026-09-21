'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Siswa, Paket, Promosi, StatusPembayaranMaster } from '@/types/database';
import { deleteSiswa, getSiswaList, createOrUpdateSiswa, getSiswaSessionSummaries } from '@/lib/actions/siswa';
import { getPaketList, getPromosiList, getStatusPembayaranMaster } from '@/lib/actions/master-data';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, getTodayDateString, getJakartaDateParts } from '@/lib/utils/date';
import { ExportButton, ExportColumn } from '@/components/shared/ExportButton';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { Plus, Eye, Edit2, Trash2, Archive, Search, X, Calendar, Info, RefreshCw, CalendarPlus, Settings2, Calculator, Car, Check, Sparkles } from 'lucide-react';
import { useAppRefresh, triggerAppRefresh } from '@/lib/utils/refresh-event';
import { purgeServerCache } from '@/lib/actions/cache';
import { formatCarOptionsLabel } from '@/lib/utils/vehicle';
import { groupPaketForSelect, formatPaketOptionLabel, getDefaultPaketForRegistration } from '@/lib/utils/paket';
import Link from 'next/link';
import { Badge } from '@/components/shared/Badge';

export default function SiswaPage() {
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [promosiList, setPromosiList] = React.useState<Promosi[]>([]);
  const [statusList, setStatusList] = React.useState<StatusPembayaranMaster[]>([]);
  // Track session completion per siswa: key=siswa_id, value={ selesai, total, hasPending, terjadwal }
  const [siswaSessionMap, setSiswaSessionMap] = React.useState<Record<string, { selesai: number; total: number; hasPending: boolean; terjadwal: number }>>({});
  const [loading, setLoading] = React.useState(true);

  // Archive & Delete States
  const [showArchived, setShowArchived] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Filter States
  const [filterStatus, setFilterStatus] = React.useState('semua');
  const [filterPaket, setFilterPaket] = React.useState('semua');
  const [filterSumber, setFilterSumber] = React.useState('semua');
  const [filterJadwal, setFilterJadwal] = React.useState<'semua' | 'belum_jadwal' | 'terjadwal' | 'selesai'>('semua');
  const [filterNama, setFilterNama] = React.useState('');
  const [filterDateFrom, setFilterDateFrom] = React.useState('');
  const [filterDateTo, setFilterDateTo] = React.useState('');
  const [filterDateField, setFilterDateField] = React.useState<'tanggal_booking' | 'tanggal_rencana_mulai'>('tanggal_booking');

  // Modal State Tambah / Edit Data Diri
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<Siswa>>({
    nama: '',
    no_whatsapp: '',
    alamat: '',
    tanggal_booking: new Date().toISOString().slice(0, 10),
    tanggal_rencana_mulai: new Date().toISOString().slice(0, 10),
    paket_id: '',
    promosi_id: null,
    harga_final: 0,
    sumber: 'meta_ads',
    catatan: '',
    custom_jumlah_sesi: 5,
    custom_nama_paket: '',
    custom_jenis_mobil: 'manual',
    custom_termasuk_sim: false,
    custom_tarif_per_sesi: 170000,
  });

  const loadData = async () => {
    setLoading(true);
    const [sData, pData, prData, stData, sessionMap] = await Promise.all([
      getSiswaList(),
      getPaketList(),
      getPromosiList(),
      getStatusPembayaranMaster(),
      getSiswaSessionSummaries(),
    ]);
    setSiswaList(sData);
    setPaketList(pData);
    setPromosiList(prData);
    setStatusList(stData);
    setSiswaSessionMap(sessionMap);

    if (pData.length > 0 && !formData.paket_id) {
      const defaultPaket = getDefaultPaketForRegistration(pData);
      if (defaultPaket) {
        setFormData((prev) => ({
          ...prev,
          paket_id: defaultPaket.id,
          harga_final: defaultPaket.harga_promo || defaultPaket.harga_normal,
        }));
      }
    }

    setLoading(false);
  };

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  useAppRefresh(loadData);

  const handleManualSync = async () => {
    try {
      await purgeServerCache();
      await loadData();
      triggerAppRefresh();
    } catch (e) {
      console.error('Error syncing siswa:', e);
    }
  };

  const handleOpenAdd = () => {
    const defaultPaket = getDefaultPaketForRegistration(paketList);
    setFormData({
      nama: '',
      no_whatsapp: '',
      alamat: '',
      tanggal_booking: getTodayDateString(),
      tanggal_rencana_mulai: getTodayDateString(),
      paket_id: defaultPaket?.id || '',
      promosi_id: null,
      harga_final: defaultPaket ? defaultPaket.harga_promo || defaultPaket.harga_normal : 0,
      sumber: 'meta_ads',
      catatan: '',
      custom_jumlah_sesi: 5,
      custom_nama_paket: '',
      custom_jenis_mobil: 'manual',
      custom_termasuk_sim: false,
      custom_tarif_per_sesi: 170000,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditDataDiri = (siswa: Siswa) => {
    setFormData({
      id: siswa.id,
      kode_siswa: siswa.kode_siswa,
      nama: siswa.nama,
      no_whatsapp: siswa.no_whatsapp,
      alamat: siswa.alamat,
      tanggal_booking: siswa.tanggal_booking,
      tanggal_rencana_mulai: siswa.tanggal_rencana_mulai,
      paket_id: siswa.paket_id,
      promosi_id: siswa.promosi_id,
      harga_final: siswa.harga_final,
      sumber: siswa.sumber,
      sumber_kustom_text: siswa.sumber_kustom_text,
      catatan: siswa.catatan,
      custom_jumlah_sesi: siswa.custom_jumlah_sesi || 5,
      custom_nama_paket: siswa.custom_nama_paket || '',
      custom_jenis_mobil: siswa.custom_jenis_mobil || 'manual',
      custom_termasuk_sim: !!siswa.custom_termasuk_sim,
      custom_tarif_per_sesi: siswa.custom_tarif_per_sesi || 170000,
    });
    setIsModalOpen(true);
  };

  const calculatePrice = (paketId: string, promoId: string | null): number => {
    const selectedPaket = paketList.find((p) => p.id === paketId);
    if (!selectedPaket) return 0;

    let basePrice = selectedPaket.harga_promo || selectedPaket.harga_normal;
    if (promoId) {
      const promo = promosiList.find((pr) => pr.id === promoId);
      if (promo) {
        if (promo.tipe_potongan === 'persen') {
          basePrice = Math.round(basePrice * (1 - promo.nilai_potongan / 100));
        } else {
          basePrice = Math.max(0, basePrice - promo.nilai_potongan);
        }
      }
    }
    return basePrice;
  };

  const handlePaketChange = (paketId: string) => {
    const selected = paketList.find((p) => p.id === paketId);
    const isCustom = Boolean(selected?.is_custom || selected?.jumlah_sesi === 0);

    if (isCustom) {
      const sesi = formData.custom_jumlah_sesi || 5;
      const tarif = formData.custom_tarif_per_sesi || 170000;
      const simCost = formData.custom_termasuk_sim ? 950000 : 0;
      const calculatedCustom = (sesi * tarif) + simCost;

      setFormData((prev) => ({
        ...prev,
        paket_id: paketId,
        custom_jumlah_sesi: prev.custom_jumlah_sesi || 5,
        custom_tarif_per_sesi: prev.custom_tarif_per_sesi || 170000,
        custom_jenis_mobil: prev.custom_jenis_mobil || 'manual',
        custom_termasuk_sim: prev.custom_termasuk_sim ?? false,
        harga_final: (prev.harga_final ?? 0) > 0 && prev.harga_manual_override ? prev.harga_final : calculatedCustom,
      }));
    } else {
      const newPrice = calculatePrice(paketId, formData.promosi_id || null);
      setFormData((prev) => ({
        ...prev,
        paket_id: paketId,
        harga_final: newPrice,
      }));
    }
  };

  const handlePromoChange = (promoId: string | null) => {
    const newPrice = calculatePrice(formData.paket_id || '', promoId);
    setFormData((prev) => ({
      ...prev,
      promosi_id: promoId,
      harga_final: newPrice,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.paket_id) {
      alert('Nama Siswa dan Paket Kursus wajib diisi!');
      return;
    }

    const selected = paketList.find((p) => p.id === formData.paket_id);
    const isCustom = Boolean(selected?.is_custom || selected?.jumlah_sesi === 0);

    let payload: any = {
      ...formData,
      harga_manual_override: formData.harga_manual_override ?? false,
    };

    if (isCustom) {
      const sesi = Number(formData.custom_jumlah_sesi) || 5;
      const jenisMobil = formData.custom_jenis_mobil || 'manual';
      const termSIM = Boolean(formData.custom_termasuk_sim);
      const labelTransmisi =
        jenisMobil === 'matic'
          ? 'Matic'
          : jenisMobil === 'mobil_sendiri_manual'
          ? 'Mobil Sendiri Manual'
          : jenisMobil === 'mobil_sendiri_matic'
          ? 'Mobil Sendiri Matic'
          : jenisMobil === 'mobil_sendiri'
          ? 'Mobil Sendiri'
          : 'Manual';
      const defaultCustomName = `Kustom ${sesi} Sesi (${labelTransmisi})${termSIM ? ' + SIM' : ''}`;

      payload = {
        ...payload,
        custom_jumlah_sesi: sesi,
        custom_jenis_mobil: jenisMobil,
        custom_termasuk_sim: termSIM,
        custom_nama_paket: formData.custom_nama_paket?.trim() || defaultCustomName,
        custom_tarif_per_sesi: Number(formData.custom_tarif_per_sesi) || null,
        status_sim: termSIM ? 'belum' : (formData.status_sim || 'belum'),
      };
    }

    const res = await createOrUpdateSiswa(payload);
    if (res.success) {
      setIsModalOpen(false);
      loadData();
    } else {
      alert('Gagal mendaftarkan siswa: ' + res.error);
    }
  };

  const filteredData = React.useMemo(() => {
    return siswaList.filter((s) => {
      const isLunas = s.status_pembayaran_kode === 'lunas';
      const sessionInfo = siswaSessionMap[s.id];
      const isFullyDone = isLunas && sessionInfo
        ? (sessionInfo.selesai >= sessionInfo.total && !sessionInfo.hasPending && sessionInfo.total > 0)
        : false;
      const isArchivedStudent = isLunas && isFullyDone;

      if (!showArchived && isArchivedStudent) return false;
      if (showArchived && !isArchivedStudent) return false;
      if (filterStatus !== 'semua' && s.status_pembayaran_kode !== filterStatus) return false;
      if (filterPaket !== 'semua' && s.paket_id !== filterPaket) return false;
      if (filterSumber !== 'semua' && s.sumber !== filterSumber) return false;

      // Status Jadwal filter
      if (filterJadwal !== 'semua') {
        const sessionInfo = siswaSessionMap[s.id];
        const selesai = sessionInfo?.selesai || 0;
        const terjadwal = sessionInfo?.terjadwal || 0;
        const total = sessionInfo?.total || s.custom_jumlah_sesi || s.paket?.jumlah_sesi || 10;
        const totalDibuat = selesai + terjadwal;
        const isBelumJadwal = totalDibuat === 0;
        const isSelesai = selesai >= total && total > 0;
        const isTerjadwal = !isBelumJadwal && !isSelesai;

        if (filterJadwal === 'belum_jadwal' && !isBelumJadwal) return false;
        if (filterJadwal === 'terjadwal' && !isTerjadwal) return false;
        if (filterJadwal === 'selesai' && !isSelesai) return false;
      }

      // Name/code search
      if (filterNama.trim()) {
        const q = filterNama.trim().toLowerCase();
        const matchNama = s.nama.toLowerCase().includes(q);
        const matchKode = (s.kode_siswa || '').toLowerCase().includes(q);
        const matchWA = (s.no_whatsapp || '').includes(q);
        if (!matchNama && !matchKode && !matchWA) return false;
      }

      // Date range filter
      if (filterDateFrom || filterDateTo) {
        const dateVal = filterDateField === 'tanggal_booking'
          ? s.tanggal_booking
          : s.tanggal_rencana_mulai;
        if (filterDateFrom && dateVal < filterDateFrom) return false;
        if (filterDateTo && dateVal > filterDateTo) return false;
      }

      return true;
    });
  }, [siswaList, siswaSessionMap, showArchived, filterStatus, filterPaket, filterSumber, filterJadwal, filterNama, filterDateFrom, filterDateTo, filterDateField]);

  const countBelumJadwal = React.useMemo(() => {
    return siswaList.filter((s) => {
      const isLunas = s.status_pembayaran_kode === 'lunas';
      const sessionInfo = siswaSessionMap[s.id];
      const isFullyDone = isLunas && sessionInfo
        ? (sessionInfo.selesai >= sessionInfo.total && !sessionInfo.hasPending && sessionInfo.total > 0)
        : false;
      if (!showArchived && isFullyDone) return false;
      if (showArchived && !isFullyDone) return false;
      const selesai = sessionInfo?.selesai || 0;
      const terjadwal = sessionInfo?.terjadwal || 0;
      return (selesai + terjadwal) === 0;
    }).length;
  }, [siswaList, siswaSessionMap, showArchived]);

  const exportColumns: ExportColumn[] = [
    { header: 'Kode Siswa', key: 'kode_siswa', width: 14, align: 'center' },
    { header: 'Nama Lengkap Siswa', key: 'nama', width: 26 },
    { header: 'No. WhatsApp', key: 'no_whatsapp', width: 18, align: 'center' },
    {
      header: 'Paket Kursus',
      key: 'paket_id',
      width: 22,
      formatter: (_v, row) => row.custom_nama_paket || row.paket?.nama_paket || 'Paket Kustom',
    },
    {
      header: 'Opsi Kendaraan',
      key: 'jenis_mobil',
      width: 20,
      align: 'center',
      formatter: (_v, row) => formatCarOptionsLabel((row.custom_jenis_mobil || row.paket?.jenis_mobil || row.jenis_mobil) as any),
    },
    { header: 'Tgl Pendaftaran', key: 'tanggal_booking', width: 16, align: 'center', formatter: (v) => formatDateIndo(v) },
    {
      header: 'Status Jadwal',
      key: 'status_jadwal',
      width: 16,
      align: 'center',
      formatter: (_v, row) => {
        const info = siswaSessionMap[row.id];
        const selesai = info?.selesai || 0;
        const terjadwal = info?.terjadwal || 0;
        const total = info?.total || row.custom_jumlah_sesi || row.paket?.jumlah_sesi || 10;
        if (selesai + terjadwal === 0) return 'Belum Jadwal';
        if (selesai >= total && total > 0) return 'Selesai Kursus';
        return 'Terjadwal';
      },
    },
    {
      header: 'Progress Sesi',
      key: 'progress',
      width: 15,
      align: 'center',
      formatter: (_v, row) => {
        const info = siswaSessionMap[row.id];
        const selesai = info?.selesai || 0;
        const total = info?.total || row.custom_jumlah_sesi || row.paket?.jumlah_sesi || 10;
        return `${selesai} / ${total} Sesi`;
      },
    },
    { header: 'Total Harga', key: 'harga_final', width: 18, isCurrency: true },
    { header: 'DP Terbayar', key: 'dp_nominal', width: 18, isCurrency: true, formatter: (v) => v || 0 },
    {
      header: 'Status Pembayaran',
      key: 'status_pembayaran_kode',
      width: 18,
      align: 'center',
      formatter: (v) => (v === 'lunas' ? 'Lunas' : v === 'dp' ? 'DP (Uang Muka)' : 'Belum Bayar'),
    },
    {
      header: 'Status Kursus',
      key: 'status_kursus',
      width: 16,
      align: 'center',
      formatter: (v) => (v ? String(v).toUpperCase() : 'AKTIF'),
    },
  ];

  const columns: ColumnDef<Siswa>[] = [
    {
      accessorKey: 'kode_siswa',
      header: 'Kode',
      sortingFn: 'alphanumeric',
      cell: ({ row }) => (
        <span className="tabular-num font-bold text-[var(--brand-primary)]">
          {row.original.kode_siswa}
        </span>
      ),
    },
    {
      accessorKey: 'nama',
      header: 'Nama Siswa',
      sortingFn: 'text',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-[var(--text-primary)]">{row.original.nama}</div>
          <div className="text-xs text-[var(--text-secondary)]">{row.original.no_whatsapp}</div>
        </div>
      ),
    },
    {
      id: 'paket',
      header: 'Paket Kursus',
      accessorFn: (row) => row.custom_nama_paket || row.paket?.nama_paket || 'Khusus',
      sortingFn: 'text',
      cell: ({ row }) => {
        const isCustom = Boolean(row.original.paket?.is_custom || row.original.custom_jumlah_sesi);
        const displayName = row.original.custom_nama_paket || row.original.paket?.nama_paket || 'Khusus';
        const carLabel = row.original.custom_jenis_mobil
          ? formatCarOptionsLabel(row.original.custom_jenis_mobil as any)
          : formatCarOptionsLabel(row.original.paket?.jenis_mobil);
        const sessionCount = row.original.custom_jumlah_sesi || row.original.paket?.jumlah_sesi || 0;

        return (
          <div>
            <div className="font-medium text-[var(--text-primary)] flex items-center gap-1.5 flex-wrap">
              <span>{displayName}</span>
              {isCustom && (
                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800/40">
                  Kustom
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-[var(--text-secondary)]">
              {carLabel} • {sessionCount} Sesi
            </div>
          </div>
        );
      },
    },
    {
      id: 'status_jadwal',
      header: 'Status Jadwal',
      sortingFn: (rowA, rowB) => {
        const infoA = siswaSessionMap[rowA.original.id];
        const infoB = siswaSessionMap[rowB.original.id];
        const totalA = infoA?.total || rowA.original.custom_jumlah_sesi || rowA.original.paket?.jumlah_sesi || 10;
        const totalB = infoB?.total || rowB.original.custom_jumlah_sesi || rowB.original.paket?.jumlah_sesi || 10;
        const sA = (infoA?.selesai || 0) + (infoA?.terjadwal || 0) === 0 ? 0 : (infoA?.selesai || 0) >= totalA ? 2 : 1;
        const sB = (infoB?.selesai || 0) + (infoB?.terjadwal || 0) === 0 ? 0 : (infoB?.selesai || 0) >= totalB ? 2 : 1;
        return sA - sB;
      },
      cell: ({ row }) => {
        const sessionInfo = siswaSessionMap[row.original.id];
        const selesai = sessionInfo?.selesai || 0;
        const terjadwal = sessionInfo?.terjadwal || 0;
        const total = sessionInfo?.total || row.original.custom_jumlah_sesi || row.original.paket?.jumlah_sesi || 10;
        const totalDibuat = selesai + terjadwal;
        const isBelumJadwal = totalDibuat === 0;
        const isSelesai = selesai >= total && total > 0;

        if (isBelumJadwal) {
          return (
            <div className="space-y-1">
              <Badge variant="dot" color="amber" size="xs" dotPing>
                Belum Jadwal
              </Badge>
              <div>
                <Link
                  href="/jadwal"
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--brand-primary)] hover:underline font-semibold"
                  title="Buka menu Jadwal untuk input jadwal siswa ini"
                >
                  <CalendarPlus className="w-3 h-3" />
                  <span>+ Input Jadwal</span>
                </Link>
              </div>
            </div>
          );
        }

        if (isSelesai) {
          return (
            <div className="space-y-0.5">
              <Badge variant="dot" color="blue" size="xs">
                Selesai Kursus
              </Badge>
              <div className="text-[10.5px] text-[var(--text-secondary)] font-medium">
                {selesai}/{total} Sesi Selesai
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-0.5">
            <Badge variant="dot" color="emerald" size="xs">
              Terjadwal
            </Badge>
            <div className="text-[10.5px] text-[var(--text-secondary)] font-medium">
              {selesai}/{total} Sesi {terjadwal > 0 ? `(${terjadwal} aktif)` : ''}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'tanggal_booking',
      header: 'Tgl Booking',
      sortingFn: 'datetime',
      cell: ({ row }) => (
        <div className="text-xs">
          <div className="font-medium text-[var(--text-primary)]">{formatDateIndo(row.original.tanggal_booking)}</div>
          <div className="text-[var(--text-muted)] mt-0.5">Booking</div>
        </div>
      ),
    },
    {
      accessorKey: 'tanggal_rencana_mulai',
      header: 'Rencana Mulai',
      sortingFn: (rowA, rowB, columnId) => {
        const valA = rowA.getValue(columnId) ? new Date(rowA.getValue(columnId) as string).getTime() : 0;
        const valB = rowB.getValue(columnId) ? new Date(rowB.getValue(columnId) as string).getTime() : 0;
        return valA - valB;
      },
      cell: ({ row }) => (
        <div className="text-xs">
          <div className="font-semibold text-[var(--brand-primary)]">
            {row.original.tanggal_rencana_mulai ? formatDateIndo(row.original.tanggal_rencana_mulai) : <span className="text-[var(--text-muted)] italic">Belum diset</span>}
          </div>
          <div className="text-[var(--text-muted)] mt-0.5">Rencana mulai</div>
        </div>
      ),
    },
    {
      accessorKey: 'harga_final',
      header: 'Harga Final',
      sortingFn: 'basic',
      cell: ({ row }) => formatRupiah(row.original.harga_final),
    },
    {
      id: 'status_pembayaran',
      header: 'Status Bayar',
      accessorFn: (row) => row.status_pembayaran?.label || row.status_pembayaran_kode || '',
      sortingFn: 'text',
      cell: ({ row }) => {
        const s = row.original.status_pembayaran;
        const kode = row.original.status_pembayaran_kode;
        const hargaFinal = Number(row.original.harga_final) || 0;
        const dpNominal = Number(row.original.dp_nominal) || 0;

        const sisa = Math.max(0, hargaFinal - dpNominal);

        if (kode === 'lunas' || (kode === 'dp' && sisa === 0 && hargaFinal > 0)) {
          return (
            <div className="space-y-0.5">
              <Badge variant="dot" color="emerald" size="xs">
                Lunas (100%)
              </Badge>
              <div className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                Terbayar Penuh
              </div>
            </div>
          );
        }

        if (kode === 'dp') {
          const pct = hargaFinal > 0 ? Math.round((dpNominal / hargaFinal) * 100) : 0;
          return (
            <div className="space-y-0.5">
              <Badge variant="dot" color="amber" size="xs">
                DP {pct}% ({formatRupiah(dpNominal)})
              </Badge>
              <div className="text-[10.5px] text-rose-600 dark:text-rose-400 font-medium">
                Sisa Piutang: {formatRupiah(sisa)}
              </div>
            </div>
          );
        }

        if (kode === 'belum_bayar') {
          return (
            <div className="space-y-0.5">
              <Badge variant="dot" color="rose" size="xs">
                Belum Bayar
              </Badge>
              <div className="text-[10.5px] text-rose-600 dark:text-rose-400 font-medium">
                Piutang: {formatRupiah(hargaFinal)}
              </div>
            </div>
          );
        }

        return (
          <Badge variant="dot" color="zinc" size="xs">
            {s?.label || kode}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/siswa/${row.original.id}`}
            className="p-1.5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] rounded-md flex items-center gap-1 text-xs font-semibold"
            title="Lihat Detail Siswa"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleOpenEditDataDiri(row.original)}
            className="p-1.5 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md flex items-center gap-1 text-xs font-semibold"
            title="Update Data Diri Siswa"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingId(row.original.id)}
            className="p-1.5 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md flex items-center gap-1 text-xs font-semibold"
            title="Hapus Data Siswa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    await deleteSiswa(deletingId);
    setDeletingId(null);
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Data Siswa"
        description="Kelola pendaftaran siswa baru, paket kursus, promo, dan histori pembayaran"
        breadcrumbs={[{ label: 'Manajemen Siswa' }, { label: 'Data Siswa' }]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleManualSync}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg)] hover:bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-semibold rounded-md transition-all shadow-xs active:scale-95"
              title="Sinkronkan data siswa dengan database terbaru"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
            </button>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors border ${
                showArchived
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-[var(--bg)] text-[var(--text-primary)] border-[var(--border)] hover:border-amber-600'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>{showArchived ? 'Lihat Siswa Aktif' : 'Arsip Siswa Selesai'}</span>
            </button>
            <ExportButton
              data={filteredData}
              columns={exportColumns}
              filename={showArchived ? 'amanahdrive_siswa_arsip' : 'amanahdrive_siswa_aktif'}
              title={showArchived ? 'REKAPITULASI ARSIP DATA SISWA SELESAI' : 'REKAPITULASI DATA SISWA AKTIF KURSUS'}
              subtitle="Laporan Administrasi & Pendaftaran Siswa Kursus Mengemudi"
              periodLabel={filterDateFrom && filterDateTo ? `${filterDateFrom} s/d ${filterDateTo}` : 'Semua Periode Pendaftaran'}
              summaryMetrics={[
                { label: 'Total Siswa', value: `${filteredData.length} Orang` },
                {
                  label: 'Total Nilai Kursus',
                  value: filteredData.reduce((sum, s) => sum + (s.harga_final || 0), 0),
                },
                {
                  label: 'Total Uang Muka (DP)',
                  value: filteredData.reduce((sum, s) => sum + (s.dp_nominal || 0), 0),
                },
              ]}
              orientation="landscape"
            />
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Daftarkan Siswa Baru</span>
            </button>
          </div>
        }
      />

      {/* Filter Bar */}
      <div className="card-container space-y-3">
        {/* Row 1: Search + Sumber */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Cari nama, kode, atau WhatsApp..."
              value={filterNama}
              onChange={(e) => setFilterNama(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            />
            {filterNama && (
              <button onClick={() => setFilterNama('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--danger)]" />
              </button>
            )}
          </div>

          <div>
            <select
              value={filterJadwal}
              onChange={(e) => setFilterJadwal(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium"
            >
              <option value="semua">Semua Status Jadwal</option>
              <option value="belum_jadwal">
                ⚠️ Belum Jadwal {countBelumJadwal > 0 ? `(${countBelumJadwal})` : ''}
              </option>
              <option value="terjadwal">✅ Terjadwal</option>
              <option value="selesai">🎓 Selesai</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            >
              <option value="semua">Semua Status Bayar</option>
              {statusList.map((st) => (
                <option key={st.id} value={st.kode}>{st.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterPaket}
              onChange={(e) => setFilterPaket(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            >
              <option value="semua">Semua Paket</option>
              {paketList.map((p) => (
                <option key={p.id} value={p.id}>{p.nama_paket}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterSumber}
              onChange={(e) => setFilterSumber(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            >
              <option value="semua">Semua Sumber</option>
              <option value="meta_ads">Meta Ads (FB/IG)</option>
              <option value="tiktok">TikTok</option>
              <option value="referensi">Referensi</option>
              <option value="kustom">Lainnya</option>
            </select>
          </div>

          <div className="ml-auto text-xs text-[var(--text-secondary)] font-medium">
            <span className="font-bold text-[var(--text-primary)]">{filteredData.length}</span> siswa
          </div>
        </div>

        {/* Unassigned Schedule Alert Banner */}
        {countBelumJadwal > 0 && (
          <div className="flex items-center justify-between gap-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span>
                Ada <strong>{countBelumJadwal} siswa</strong> yang belum dibuatkan jadwal sesi kursus.
              </span>
            </div>
            {filterJadwal !== 'belum_jadwal' ? (
              <button
                type="button"
                onClick={() => setFilterJadwal('belum_jadwal')}
                className="text-amber-700 dark:text-amber-300 font-semibold hover:underline text-xs flex items-center gap-1 shrink-0"
              >
                <span>Lihat Siswa Belum Jadwal</span>
                <span>&rarr;</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFilterJadwal('semua')}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium text-xs flex items-center gap-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filter Jadwal</span>
              </button>
            )}
          </div>
        )}

        {/* Row 2: Date Range Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Filter Tanggal:</span>
            <select
              value={filterDateField}
              onChange={(e) => setFilterDateField(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            >
              <option value="tanggal_booking">Tgl Booking</option>
              <option value="tanggal_rencana_mulai">Rencana Mulai</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--text-muted)]">Dari</span>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            />
            <span className="text-xs text-[var(--text-muted)]">s/d</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            />

            {/* Quick Period Presets */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const todayStr = getTodayDateString();
                  const parts = getJakartaDateParts(todayStr);
                  const curYear = parts?.year ?? new Date().getFullYear();
                  const curMonth = parts?.month ?? (new Date().getMonth() + 1);
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const start = `${curYear}-${pad(curMonth)}-01`;
                  const lastDay = new Date(curYear, curMonth, 0).getDate();
                  const end = `${curYear}-${pad(curMonth)}-${pad(lastDay)}`;
                  setFilterDateFrom(start);
                  setFilterDateTo(end);
                }}
                className="px-2 py-1 rounded text-[11px] font-semibold bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  const todayStr = getTodayDateString();
                  const parts = getJakartaDateParts(todayStr);
                  const curYear = parts?.year ?? new Date().getFullYear();
                  const curMonth = parts?.month ?? (new Date().getMonth() + 1);
                  const lastMonthYear = curMonth === 1 ? curYear - 1 : curYear;
                  const lastMonthNum = curMonth === 1 ? 12 : curMonth - 1;
                  const pad = (n: number) => String(n).padStart(2, '0');
                  const start = `${lastMonthYear}-${pad(lastMonthNum)}-01`;
                  const lastDay = new Date(lastMonthYear, lastMonthNum, 0).getDate();
                  const end = `${lastMonthYear}-${pad(lastMonthNum)}-${pad(lastDay)}`;
                  setFilterDateFrom(start);
                  setFilterDateTo(end);
                }}
                className="px-2 py-1 rounded text-[11px] font-semibold bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors"
              >
                Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => {
                  const todayStr = getTodayDateString();
                  const parts = getJakartaDateParts(todayStr);
                  const curYear = parts?.year ?? new Date().getFullYear();
                  setFilterDateFrom(`${curYear}-01-01`);
                  setFilterDateTo(`${curYear}-12-31`);
                }}
                className="px-2 py-1 rounded text-[11px] font-semibold bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-colors"
              >
                Tahun Ini
              </button>
            </div>

            {(filterDateFrom || filterDateTo) && (
              <button
                onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-rose-600 border border-rose-200 rounded-md hover:bg-rose-50"
              >
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card-container">
        {loading ? (
          <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={filteredData} />
        )}
      </div>

      {/* Modal Form Tambah / Edit Data Diri Siswa */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="siswa-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="card-container max-w-xl w-full bg-[var(--bg)] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 id="siswa-modal-title" className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                {formData.id ? `Update Data Diri Siswa (${formData.kode_siswa})` : 'Pendaftaran Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                aria-label="Tutup dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama || ''}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Nama sesuai KTP"
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    No. WhatsApp Active *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.no_whatsapp || ''}
                    onChange={(e) => setFormData({ ...formData, no_whatsapp: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>

                <div>
                  <DatePickerWIB
                    label="Tanggal Booking *"
                    value={formData.tanggal_booking || getTodayDateString()}
                    onChange={(val) => setFormData({ ...formData, tanggal_booking: val })}
                  />
                </div>

                <div>
                  <DatePickerWIB
                    label="Rencana Tanggal Mulai *"
                    value={formData.tanggal_rencana_mulai || getTodayDateString()}
                    onChange={(val) => setFormData({ ...formData, tanggal_rencana_mulai: val })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  value={formData.alamat || ''}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Alamat domisili Palembang"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              {/* Paket & Promo Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border)]">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Pilih Paket Kursus *
                  </label>
                  <select
                    value={formData.paket_id || ''}
                    onChange={(e) => handlePaketChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)]"
                  >
                    {groupPaketForSelect(paketList).map((grp) => (
                      <optgroup key={grp.groupName} label={grp.groupName}>
                        {grp.items.map((p) => (
                          <option key={p.id} value={p.id}>
                            {formatPaketOptionLabel(p)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Pilih Promo / Campaign
                  </label>
                  <select
                    value={formData.promosi_id || ''}
                    onChange={(e) => {
                      const pId = e.target.value || null;
                      handlePromoChange(pId);
                    }}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold"
                  >
                    <option value="">Tanpa Promo</option>
                    {promosiList.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.nama_promo} (Potongan {pr.tipe_potongan === 'persen' ? `${pr.nilai_potongan}%` : formatRupiah(pr.nilai_potongan)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Konfigurasi Lengkap Paket Kustom / Fleksibel */}
                {(() => {
                  const selected = paketList.find((p) => p.id === formData.paket_id);
                  const isCustom = Boolean(selected?.is_custom || selected?.jumlah_sesi === 0);
                  if (!isCustom) return null;

                  const currentSesi = Number(formData.custom_jumlah_sesi) || 5;
                  const currentTarif = Number(formData.custom_tarif_per_sesi) || 170000;
                  const currentSim = Boolean(formData.custom_termasuk_sim);
                  const simEstimatedCost = 950000;
                  const calculatedEstimatedTotal = (currentSesi * currentTarif) + (currentSim ? simEstimatedCost : 0);

                  const handleSelectCarOption = (id: string) => {
                    const isMobilSendiri = id.startsWith('mobil_sendiri');
                    const suggestedTarif = isMobilSendiri ? 100000 : 170000;
                    setFormData((prev) => {
                      const newTarif = prev.custom_tarif_per_sesi === 170000 && isMobilSendiri
                        ? 100000
                        : prev.custom_tarif_per_sesi === 100000 && !isMobilSendiri
                        ? 170000
                        : prev.custom_tarif_per_sesi || suggestedTarif;
                      return {
                        ...prev,
                        custom_jenis_mobil: id,
                        custom_tarif_per_sesi: newTarif,
                      };
                    });
                  };

                  return (
                    <div className="md:col-span-2 p-4 rounded-xl border border-amber-300 dark:border-amber-800/70 bg-gradient-to-br from-amber-50/70 via-amber-50/25 to-transparent dark:from-amber-950/40 dark:via-amber-950/20 dark:to-transparent space-y-4 shadow-2xs animate-in fade-in zoom-in-98 duration-200">
                      {/* Header Section */}
                      <div className="flex items-center justify-between border-b border-amber-200/80 dark:border-amber-900/60 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                            <Settings2 className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                              <span>Detail & Spesifikasi Paket Kustom</span>
                              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            </h4>
                            <p className="text-[11px] text-[var(--text-secondary)]">
                              Konfigurasikan jumlah sesi, tipe transmisi, fasilitas SIM, dan kalkulasi harga final
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 shrink-0">
                          Fleksibel / Kustom
                        </span>
                      </div>

                      {/* Baris 1: Jumlah Sesi (Pertemuan) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-[var(--text-primary)]">
                            Jumlah Sesi Pertemuan (Wajib) *
                          </label>
                          <span className="text-[11px] text-[var(--text-secondary)]">
                            Total Durasi: <strong className="text-[var(--text-primary)] font-mono">{currentSesi * 2} Jam</strong> (2 jam/sesi)
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                          {/* Stepper Input */}
                          <div className="flex items-center border border-[var(--border)] rounded-xl bg-[var(--bg)] p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = Math.max(1, currentSesi - 1);
                                setFormData((prev) => ({ ...prev, custom_jumlah_sesi: nextVal }));
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              required
                              value={formData.custom_jumlah_sesi ?? 5}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                setFormData((prev) => ({ ...prev, custom_jumlah_sesi: val }));
                              }}
                              className="w-16 px-1 py-1 text-center font-bold text-sm font-mono bg-transparent border-none focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = Math.min(50, currentSesi + 1);
                                setFormData((prev) => ({ ...prev, custom_jumlah_sesi: nextVal }));
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all"
                            >
                              +
                            </button>
                          </div>

                          {/* Quick Select Buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap flex-1">
                            {[3, 5, 7, 8, 10, 12, 15].map((count) => (
                              <button
                                key={count}
                                type="button"
                                onClick={() => setFormData((prev) => ({ ...prev, custom_jumlah_sesi: count }))}
                                className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                                  currentSesi === count
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                                    : 'bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                              >
                                {count} Sesi
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Baris 2: Opsi Mobil & Transmisi */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[var(--text-primary)]">
                          Pilihan Armada Kendaraan & Transmisi *
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'manual', label: 'Manual', sub: 'Mobil Amanah' },
                            { id: 'matic', label: 'Matic', sub: 'Mobil Amanah' },
                            { id: 'mobil_sendiri_manual', label: 'Mobil Sendiri', sub: 'Manual' },
                            { id: 'mobil_sendiri_matic', label: 'Mobil Sendiri', sub: 'Matic' },
                          ].map((item) => {
                            const isSelected = (formData.custom_jenis_mobil || 'manual') === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectCarOption(item.id)}
                                className={`p-2.5 rounded-xl text-left border transition-all ${
                                  isSelected
                                    ? 'bg-[var(--bg)] border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                                    : 'bg-[var(--bg)] border-[var(--border)] hover:border-black/20 dark:hover:border-white/20'
                                }`}
                              >
                                <div className={`text-xs font-bold ${isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-[var(--text-primary)]'}`}>
                                  {item.label}
                                </div>
                                <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                                  {item.sub}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Baris 3: Fasilitas Pembuatan SIM A */}
                      <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] flex items-center justify-between gap-3 shadow-2xs">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <span>Fasilitas Pengurusan SIM A</span>
                            {currentSim ? (
                              <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                ✓ Termasuk SIM A
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] border border-[var(--border)]">
                                Tanpa SIM
                              </span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-[var(--text-secondary)]">
                            {currentSim
                              ? 'Siswa akan otomatis tercatat di modul SIM dan sinkron dengan pos pengeluaran SIM.'
                              : 'Hanya pelatihan kursus mengemudi tanpa pengurusan berkas SIM A.'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, custom_termasuk_sim: !prev.custom_termasuk_sim }))}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 ${
                            currentSim
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                        >
                          {currentSim ? '✓ Termasuk SIM A' : '+ Tambah SIM A'}
                        </button>
                      </div>

                      {/* Baris 4: Nama / Label Khusus Paket (Opsional) */}
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Nama / Label Paket Kustom (Opsional)
                        </label>
                        <input
                          type="text"
                          value={formData.custom_nama_paket || ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, custom_nama_paket: e.target.value }))}
                          placeholder={`Misal: Kustom ${currentSesi} Sesi (${(formData.custom_jenis_mobil || 'manual').includes('matic') ? 'Matic' : 'Manual'})${currentSim ? ' + SIM' : ''}`}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)]"
                        />
                      </div>

                      {/* Baris 5: Kalkulator Simulasi Biaya & Harga */}
                      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-300/70 dark:border-amber-800/50 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 dark:border-amber-900/40 pb-2">
                          <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-xs font-bold text-[var(--text-primary)]">
                              Kalkulator Simulasi Tarif Kustom
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                harga_final: calculatedEstimatedTotal,
                                harga_manual_override: true,
                              }));
                            }}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs active:scale-95"
                          >
                            Terapkan Hasil ke Harga Final ({formatRupiah(calculatedEstimatedTotal)})
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <CurrencyInput
                              label="Tarif Per Sesi (Rupiah)"
                              value={currentTarif}
                              onChange={(val) => setFormData((prev) => ({ ...prev, custom_tarif_per_sesi: val }))}
                            />
                            <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                              Standar Amanah: Rp 170.000 (Mobil Amanah) / Rp 100.000 (Mobil Sendiri)
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                              <span>Biaya Sesi ({currentSesi} Sesi × {formatRupiah(currentTarif)}):</span>
                              <span className="font-semibold text-[var(--text-primary)] font-mono">
                                {formatRupiah(currentSesi * currentTarif)}
                              </span>
                            </div>
                            {currentSim && (
                              <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400">
                                <span>Fasilitas Pengurusan SIM A:</span>
                                <span className="font-semibold font-mono">+{formatRupiah(simEstimatedCost)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)] border-t border-[var(--border)] pt-1.5">
                              <span>Total Estimasi Sistem:</span>
                              <span className="font-mono text-amber-600 dark:text-amber-400 text-sm">
                                {formatRupiah(calculatedEstimatedTotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="md:col-span-2 space-y-1">
                  <CurrencyInput
                    label="Harga Final Siswa (Rupiah) *"
                    value={formData.harga_final || 0}
                    disabled={!!formData.promosi_id}
                    className={formData.promosi_id ? 'bg-black/5 dark:bg-white/5 cursor-not-allowed font-bold text-[var(--brand-primary)]' : ''}
                    onChange={(val) => setFormData({ ...formData, harga_final: val, harga_manual_override: true })}
                  />
                    {formData.promosi_id && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                        Diskon promo: {promosiList.find(p => p.id === formData.promosi_id)?.nama_promo}
                      </p>
                    )}

                    {(() => {
                      if (!formData.id) return null;
                      const existing = siswaList.find((s) => s.id === formData.id);
                      if (!existing) return null;
                      const paid = existing.status_pembayaran_kode === 'lunas' ? existing.harga_final : (existing.dp_nominal || 0);
                      if (paid <= 0) return null;
                      const newFinal = formData.harga_final || 0;
                      const isCovered = newFinal <= paid;
                      return (
                        <div className={`mt-2 p-2.5 rounded-md text-xs border ${
                          isCovered
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                        }`}>
                          <div className="flex items-center justify-between font-semibold">
                            <span>Total Pembayaran Terdahulu:</span>
                            <span className="tabular-num font-bold">{formatRupiah(paid)}</span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span>Dampak Piutang Paket Baru:</span>
                            <span className="font-bold">
                              {isCovered
                                ? '✓ Otomatis Lunas (Sisa Piutang: Rp 0)'
                                : `Sisa Piutang Baru: ${formatRupiah(newFinal - paid)} (Status: DP)`}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Sumber Leads / Pemasaran *
                </label>
                <select
                  value={formData.sumber || 'meta_ads'}
                  onChange={(e) => setFormData({ ...formData, sumber: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                >
                  <option value="meta_ads">Meta Ads (FB/IG)</option>
                  <option value="tiktok">TikTok Ads / Organic</option>
                  <option value="referensi">Referensi Teman / Alumni</option>
                  <option value="kustom">Lainnya / Kustom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Catatan Khusus Siswa
                </label>
                <textarea
                  rows={2}
                  value={formData.catatan || ''}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Misal: Minta instruktur sabar, latihan di hari libur"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold border border-[var(--border)] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-98"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 text-xs font-semibold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl shadow-xs transition-colors active:scale-98"
                >
                  {formData.id ? 'Simpan Perubahan Data Diri' : 'Daftarkan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog Hapus Siswa */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Data Siswa"
        description="Apakah Anda yakin ingin menghapus data siswa ini? Aksi ini tidak dapat dibatalkan."
        confirmText="Hapus Siswa"
        isDanger
      />
    </div>
  );
}
