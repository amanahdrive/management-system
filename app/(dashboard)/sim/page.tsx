'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { ExportButton, ExportColumn } from '@/components/shared/ExportButton';
import { Siswa, Paket } from '@/types/database';
import {
  getSimSiswaList,
  getSimMetricsSummary,
  updateStatusSim,
  executeBatchSim,
  analyzeUnregisteredKasSimTransactions,
  addNonSiswaSimParticipant,
  SimMetricsSummary,
  KasSimCandidate,
} from '@/lib/actions/sim';
import { getPaketList } from '@/lib/actions/master-data';
import { formatDateIndo, getTodayDateString, addDaysToDateStr, formatHariTanggalLongIndo } from '@/lib/utils/date';
import { formatRupiah } from '@/lib/utils/currency';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { getModalSimSettings, saveModalSimSettings, ModalSimSettings } from '@/lib/actions/settings';
import {
  IdCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  ArrowUpDown,
  MessageCircle,
  ExternalLink,
  Archive,
  Layers,
  Sparkles,
  Edit2,
  Check,
  AlertTriangle,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings as SettingsIcon,
  X,
  ArrowRight,
  Zap,
  Copy,
  CheckSquare,
  Square,
  Filter,
  UserPlus,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';




type TabView = 'active' | 'archived' | 'all';
type DatePreset = 'all' | 'month' | '30days' | 'custom';
type SortField = 'tanggal_booking' | 'nama' | 'paket' | 'status_pembayaran' | 'status_sim' | 'tanggal_selesai_sim';

/**
 * Membangun URL WhatsApp Web dengan nomor telepon tervalidasi dan template pesan pengingat jadwal pembuatan SIM
 */
function getSimReminderWaUrl(siswa: Siswa): string {
  if (!siswa.no_whatsapp) return '#';
  let num = siswa.no_whatsapp.replace(/\D/g, '');
  if (num.startsWith('0')) {
    num = '62' + num.substring(1);
  } else if (!num.startsWith('62') && num.startsWith('8')) {
    num = '62' + num;
  }

  const nama = siswa.nama || 'Siswa';
  const kode = siswa.kode_siswa ? ` (${siswa.kode_siswa})` : '';
  const namaPaket = siswa.paket?.nama_paket || 'Paket Kursus + SIM';
  const jadwalTgl = siswa.tanggal_selesai_sim
    ? formatDateIndo(siswa.tanggal_selesai_sim)
    : siswa.catatan_sim
    ? siswa.catatan_sim
    : 'Segera dijadwalkan bersama tim Amanah Drive';

  const statusBayar =
    siswa.status_pembayaran_kode === 'lunas'
      ? 'LUNAS (Siap Diproses)'
      : siswa.status_pembayaran_kode === 'dp'
      ? `DP (Sisa Tagihan: ${formatRupiah(siswa.harga_final - (siswa.dp_nominal || 0))})`
      : 'Belum Lunas (Mohon selesaikan administrasi)';

  const message = `Halo Kak *${nama}*${kode},

Kami dari tim administrasi *Amanah Drive* ingin menginformasikan dan mengingatkan terkait agenda jadwal pembuatan & pengurusan SIM Kakak:

📋 *Detail Informasi SIM:*
• Nama Siswa: *${nama}*
• Paket: ${namaPaket}
• Jadwal SIM: *${jadwalTgl}*
• Status Administrasi: *${statusBayar}*

📌 *Persiapan yang wajib dibawa:*
1. KTP Asli & Fotokopi KTP (2 rangkap)
2. Memakai baju berkerah rapi (bukan kaos oblong / tanpa lengan)
3. Bersepatu rapi / tertutup
4. Hadir tepat waktu sesuai instruksi tim kami

Mohon konfirmasi ketersediaan & kehadiran Kakak dengan membalas pesan ini ya. Jika ada pertanyaan atau kendala jadwal, silakan langsung hubungi kami.

Terima kasih banyak dan semoga lancar! 🙏🚗
_Admin Amanah Drive_`;

  return `https://web.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(message)}`;
}

export default function ManajemenSimPage() {
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [metrics, setMetrics] = React.useState<SimMetricsSummary>({
    totalSim: 0,
    totalBelumSelesai: 0,
    totalSelesai: 0,
    totalSiapTerbit: 0,
    totalMenungguPelunasan: 0,
  });
  const [loading, setLoading] = React.useState(true);

  // Modal State for SIM Pricing Configuration
  const [isSimConfigModalOpen, setIsSimConfigModalOpen] = React.useState(false);
  const [simConfig, setSimConfig] = React.useState<ModalSimSettings>({
    hargaDefault: 850000,
    biayaPelatihanSim: 780000,
    feeAdmin: 70000,
    configPerJenis: { 'SIM A': 850000, 'SIM C': 650000, default: 850000 },
  });
  const [savingSimConfig, setSavingSimConfig] = React.useState(false);
  const [simConfigSuccess, setSimConfigSuccess] = React.useState(false);

  // Modal State for Batch SIM Execution
  const [isEksekusiModalOpen, setIsEksekusiModalOpen] = React.useState(false);
  const [eksekusiPeriode, setEksekusiPeriode] = React.useState<'bulan_ini' | 'bulan_lalu' | 'semua'>('bulan_ini');
  const [eksekusiStatusSim, setEksekusiStatusSim] = React.useState<'belum' | 'semua' | 'selesai'>('belum');
  const [eksekusiSimAFilter, setEksekusiSimAFilter] = React.useState(true);
  const [eksekusiSimCFilter, setEksekusiSimCFilter] = React.useState(true);
  const [eksekusiTanggal, setEksekusiTanggal] = React.useState<string>(getTodayDateString());
  const [selectedEksekusiIds, setSelectedEksekusiIds] = React.useState<string[]>([]);
  const [executingBatch, setExecutingBatch] = React.useState(false);
  const [waCopiedToast, setWaCopiedToast] = React.useState(false);
  const [eksekusiError, setEksekusiError] = React.useState<string | null>(null);
  const [eksekusiSuccessMsg, setEksekusiSuccessMsg] = React.useState<string | null>(null);

  // Header Dropdown Menu State
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = React.useState(false);
  const headerMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modal State for Adding Non-Siswa Participant
  const [isNonSiswaModalOpen, setIsNonSiswaModalOpen] = React.useState(false);
  const [nonSiswaNama, setNonSiswaNama] = React.useState('');
  const [nonSiswaWa, setNonSiswaWa] = React.useState('');
  const [nonSiswaJenisSim, setNonSiswaJenisSim] = React.useState<'SIM A' | 'SIM C'>('SIM A');
  const [nonSiswaHarga, setNonSiswaHarga] = React.useState<number>(850000);
  const [nonSiswaStatusBayar, setNonSiswaStatusBayar] = React.useState<'lunas' | 'dp' | 'belum_bayar'>('lunas');
  const [nonSiswaLinkedKasId, setNonSiswaLinkedKasId] = React.useState<string | undefined>(undefined);
  const [nonSiswaCatatan, setNonSiswaCatatan] = React.useState('');
  const [savingNonSiswa, setSavingNonSiswa] = React.useState(false);
  const [nonSiswaError, setNonSiswaError] = React.useState<string | null>(null);
  const [nonSiswaSuccess, setNonSiswaSuccess] = React.useState(false);

  // Automatic Kas Analysis Candidates
  const [kasCandidates, setKasCandidates] = React.useState<KasSimCandidate[]>([]);
  const [loadingKasCandidates, setLoadingKasCandidates] = React.useState(false);

  // Tab View: 'active' (belum selesai), 'archived' (selesai), 'all' (semua)
  const [currentTab, setCurrentTab] = React.useState<TabView>('active');



  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterPembayaran, setFilterPembayaran] = React.useState<string>('all');
  const [filterPaket, setFilterPaket] = React.useState<string>('all');
  const [datePreset, setDatePreset] = React.useState<DatePreset>('all');
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');

  // Pagination State
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);

  // Sorting (Default: tanggal_booking ASC - dari tanggal paling awal ke terbaru)
  const [sortField, setSortField] = React.useState<SortField>('tanggal_booking');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  // Modal State for Changing SIM Status
  const [selectedSiswa, setSelectedSiswa] = React.useState<Siswa | null>(null);
  const [modalTargetStatus, setModalTargetStatus] = React.useState<'belum' | 'selesai'>('selesai');
  const [modalTanggalSelesai, setModalTanggalSelesai] = React.useState<string>(getTodayDateString());
  const [modalCatatanSim, setModalCatatanSim] = React.useState<string>('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [modalError, setModalError] = React.useState<string | null>(null);

  // Modal Alert for Unpaid Student
  const [unpaidAlertStudent, setUnpaidAlertStudent] = React.useState<Siswa | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [students, metricsData, packages, simCfg] = await Promise.all([
        getSimSiswaList({
          startDate: datePreset !== 'all' && startDate ? startDate : undefined,
          endDate: datePreset !== 'all' && endDate ? endDate : undefined,
          paketId: filterPaket !== 'all' ? filterPaket : undefined,
        }),
        getSimMetricsSummary(),
        getPaketList(),
        getModalSimSettings(),
      ]);
      setSiswaList(students);
      setMetrics(metricsData);
      setPaketList(packages.filter((p) => p.termasuk_sim));
      setSimConfig(simCfg);
    } catch (e) {
      console.error('Error loading SIM data:', e);
    } finally {
      setLoading(false);
    }
  }, [datePreset, startDate, endDate, filterPaket]);

  const handleSaveSimConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSimConfig(true);
    setSimConfigSuccess(false);
    try {
      const res = await saveModalSimSettings(
        simConfig.biayaPelatihanSim ?? 780000,
        simConfig.feeAdmin ?? 70000,
        simConfig.configPerJenis
      );
      if (res.success) {
        setSimConfigSuccess(true);
        setTimeout(() => {
          setIsSimConfigModalOpen(false);
          setSimConfigSuccess(false);
          loadData();
        }, 1200);
      } else {
        alert(res.error || 'Gagal menyimpan pengaturan biaya pelatihan SIM');
      }
    } catch (err) {
      console.error('Error saving sim config:', err);
    } finally {
      setSavingSimConfig(false);
    }
  };

  // Filtered Students for Eksekusi Modal
  const eksekusiFilteredStudents = React.useMemo(() => {
    const todayStr = getTodayDateString();
    const currentYearMonth = todayStr.slice(0, 7); // "YYYY-MM"

    const [y, m] = currentYearMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    return siswaList.filter((s) => {
      // 1. Filter Periode
      const studentMonth = (s.tanggal_booking || s.created_at || '').slice(0, 7);
      if (eksekusiPeriode === 'bulan_ini' && studentMonth !== currentYearMonth) {
        return false;
      }
      if (eksekusiPeriode === 'bulan_lalu' && studentMonth !== prevYearMonth) {
        return false;
      }

      // 2. Filter Status SIM
      if (eksekusiStatusSim === 'belum') {
        // Default: BELUM (Siap Terbit) -> status_sim != 'selesai' AND status_pembayaran_kode = 'lunas'
        if (s.status_sim === 'selesai' || s.status_pembayaran_kode !== 'lunas') {
          return false;
        }
      } else if (eksekusiStatusSim === 'selesai') {
        if (s.status_sim !== 'selesai') {
          return false;
        }
      }

      // 3. Filter Jenis SIM
      const isSimC = (s.paket?.nama_paket || '').toLowerCase().includes('sim c');
      const isSimA = !isSimC;

      if (isSimA && !eksekusiSimAFilter) return false;
      if (isSimC && !eksekusiSimCFilter) return false;

      return true;
    });
  }, [siswaList, eksekusiPeriode, eksekusiStatusSim, eksekusiSimAFilter, eksekusiSimCFilter]);

  // Sync selected student IDs when Eksekusi Modal opens or filtered list changes
  React.useEffect(() => {
    if (isEksekusiModalOpen) {
      setSelectedEksekusiIds(eksekusiFilteredStudents.map((s) => s.id));
    }
  }, [isEksekusiModalOpen, eksekusiFilteredStudents]);

  const selectedStudentsList = React.useMemo(() => {
    return eksekusiFilteredStudents.filter((s) => selectedEksekusiIds.includes(s.id));
  }, [eksekusiFilteredStudents, selectedEksekusiIds]);

  const countSelected = selectedStudentsList.length;
  const biayaPelatihanUnit = simConfig.biayaPelatihanSim ?? 780000;
  const feeAdminUnit = simConfig.feeAdmin ?? 70000;

  const subtotalPelatihan = countSelected * biayaPelatihanUnit;
  const subtotalFeeAdmin = countSelected * feeAdminUnit;
  const totalEksekusi = countSelected * (biayaPelatihanUnit + feeAdminUnit);

  const toggleSelectAllEksekusi = () => {
    if (selectedEksekusiIds.length === eksekusiFilteredStudents.length) {
      setSelectedEksekusiIds([]);
    } else {
      setSelectedEksekusiIds(eksekusiFilteredStudents.map((s) => s.id));
    }
  };

  const toggleSelectStudentEksekusi = (id: string) => {
    setSelectedEksekusiIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const generateWaMarkdownText = () => {
    const tglFormatted = formatHariTanggalLongIndo(eksekusiTanggal || getTodayDateString());
    let text = `DAFTAR SISWA SIAP SIM\nTanggal: ${tglFormatted}\n\n`;

    if (selectedStudentsList.length === 0) {
      text += `- (Tidak ada siswa dipilih)\n\n`;
    } else {
      selectedStudentsList.forEach((s) => {
        const waNum = s.no_whatsapp ? s.no_whatsapp : 'Tanpa No WA';
        text += `- ${s.nama} (${waNum})\n`;
      });
      text += `\n`;
    }

    text += `Subtotal:\n`;
    text += `- Pelatihan: ${formatRupiah(subtotalPelatihan)}\n`;
    text += `- Fee Admin: ${formatRupiah(subtotalFeeAdmin)}\n\n`;
    text += `Total: ${formatRupiah(totalEksekusi)}`;

    return text;
  };

  const handleCopyWaMarkdown = async () => {
    const text = generateWaMarkdownText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setWaCopiedToast(true);
      setTimeout(() => setWaCopiedToast(false), 2500);
    } catch (err) {
      console.error('Failed to copy WA Markdown:', err);
      alert('Gagal menyalin ke clipboard');
    }
  };

  const handleExecuteBatchSimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEksekusiIds.length === 0) {
      setEksekusiError('Pilih minimal 1 siswa yang akan dieksekusi.');
      return;
    }

    setExecutingBatch(true);
    setEksekusiError(null);
    setEksekusiSuccessMsg(null);

    try {
      const res = await executeBatchSim(selectedEksekusiIds, eksekusiTanggal);
      if (res.success) {
        setEksekusiSuccessMsg(`Berhasil meng-eksekusi ${res.executedCount} siswa ke status SIM SELESAI.`);
        setTimeout(() => {
          setIsEksekusiModalOpen(false);
          setEksekusiSuccessMsg(null);
          loadData();
        }, 1500);
      } else {
        setEksekusiError(res.error || 'Gagal meng-eksekusi penerbitan SIM.');
      }
    } catch (err: any) {
      console.error('Error in batch execution:', err);
      setEksekusiError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setExecutingBatch(false);
    }
  };

  const handleOpenNonSiswaModal = async () => {
    setIsNonSiswaModalOpen(true);
    setNonSiswaNama('');
    setNonSiswaWa('');
    setNonSiswaJenisSim('SIM A');
    setNonSiswaHarga(simConfig.hargaDefault || 850000);
    setNonSiswaStatusBayar('lunas');
    setNonSiswaLinkedKasId(undefined);
    setNonSiswaCatatan('');
    setNonSiswaError(null);
    setNonSiswaSuccess(false);

    setLoadingKasCandidates(true);
    try {
      const candidates = await analyzeUnregisteredKasSimTransactions();
      setKasCandidates(candidates);
    } catch (err) {
      console.error('Error fetching kas candidates:', err);
    } finally {
      setLoadingKasCandidates(false);
    }
  };

  const handleSelectKasCandidate = (candidateId: string) => {
    if (!candidateId) {
      setNonSiswaLinkedKasId(undefined);
      return;
    }
    const found = kasCandidates.find((c) => c.id === candidateId);
    if (found) {
      setNonSiswaNama(found.namaExtracted);
      setNonSiswaHarga(found.nominal > 0 ? found.nominal : simConfig.hargaDefault || 850000);
      setNonSiswaLinkedKasId(found.id);
      setNonSiswaCatatan(`Ditautkan dari Pemasukan Kas (${formatDateIndo(found.tanggal)}: ${found.keterangan})`);
    }
  };

  const handleSaveNonSiswaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nonSiswaNama.trim()) {
      setNonSiswaError('Nama peserta non-siswa wajib diisi.');
      return;
    }
    if (!nonSiswaHarga || nonSiswaHarga <= 0) {
      setNonSiswaError('Nominal biaya pelatihan SIM harus lebih besar dari 0.');
      return;
    }

    setSavingNonSiswa(true);
    setNonSiswaError(null);

    try {
      const res = await addNonSiswaSimParticipant({
        nama: nonSiswaNama.trim(),
        noWhatsapp: nonSiswaWa.trim(),
        jenisSim: nonSiswaJenisSim,
        hargaFinal: nonSiswaHarga,
        statusPembayaran: nonSiswaStatusBayar,
        tanggalBooking: getTodayDateString(),
        catatan: nonSiswaCatatan.trim() || 'Peserta SIM Non-Siswa (Input Langsung)',
        linkedKasId: nonSiswaLinkedKasId,
      });

      if (res.success) {
        setNonSiswaSuccess(true);
        setTimeout(() => {
          setIsNonSiswaModalOpen(false);
          setNonSiswaSuccess(false);
          loadData();
        }, 1200);
      } else {
        setNonSiswaError(res.error || 'Gagal menambahkan peserta SIM non-siswa.');
      }
    } catch (err: any) {
      console.error('Error saving non-siswa SIM:', err);
      setNonSiswaError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSavingNonSiswa(false);
    }
  };




  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Preset Changes
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = getTodayDateString();
    if (preset === 'month') {
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

  // Toggle Sorting
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Open Modal to Change Status
  const handleOpenChangeStatus = (siswa: Siswa) => {
    // If attempting to mark as completed, but student hasn't paid in full
    if (siswa.status_sim !== 'selesai' && siswa.status_pembayaran_kode !== 'lunas') {
      setUnpaidAlertStudent(siswa);
      return;
    }

    setSelectedSiswa(siswa);
    setModalTargetStatus(siswa.status_sim === 'selesai' ? 'belum' : 'selesai');
    setModalTanggalSelesai(siswa.tanggal_selesai_sim || getTodayDateString());
    setModalCatatanSim(siswa.catatan_sim || '');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveStatusSim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa) return;

    setSaving(true);
    setModalError(null);

    const res = await updateStatusSim(
      selectedSiswa.id,
      modalTargetStatus,
      modalTargetStatus === 'selesai' ? modalTanggalSelesai : null,
      modalCatatanSim
    );

    setSaving(false);
    if (res.success) {
      setIsModalOpen(false);
      setSelectedSiswa(null);
      loadData();
    } else {
      setModalError(res.error || 'Gagal memperbarui status SIM.');
    }
  };

  // Filtered & Sorted Students
  const filteredStudents = React.useMemo(() => {
    return siswaList.filter((s) => {
      // Tab Filtering
      if (currentTab === 'active') {
        if (s.status_sim === 'selesai' || s.is_archived) return false;
      } else if (currentTab === 'archived') {
        if (s.status_sim !== 'selesai' && !s.is_archived) return false;
      }

      // Status Pembayaran Filter
      if (filterPembayaran !== 'all') {
        if (filterPembayaran === 'lunas' && s.status_pembayaran_kode !== 'lunas') return false;
        if (filterPembayaran === 'belum_lunas' && s.status_pembayaran_kode === 'lunas') return false;
        if (filterPembayaran === 'dp' && s.status_pembayaran_kode !== 'dp') return false;
        if (filterPembayaran === 'belum_bayar' && s.status_pembayaran_kode !== 'belum_bayar') return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nama = (s.nama || '').toLowerCase();
        const wa = (s.no_whatsapp || '').toLowerCase();
        const kode = (s.kode_siswa || '').toLowerCase();
        const paket = (s.paket?.nama_paket || '').toLowerCase();
        const alamat = (s.alamat || '').toLowerCase();
        const catatan = (s.catatan || '').toLowerCase();
        const catatanSim = (s.catatan_sim || '').toLowerCase();

        if (
          !nama.includes(q) &&
          !wa.includes(q) &&
          !kode.includes(q) &&
          !paket.includes(q) &&
          !alamat.includes(q) &&
          !catatan.includes(q) &&
          !catatanSim.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [siswaList, currentTab, filterPembayaran, searchQuery]);

  const sortedStudents = React.useMemo(() => {
    const list = [...filteredStudents];
    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'tanggal_booking') {
        valA = new Date(a.tanggal_booking).getTime();
        valB = new Date(b.tanggal_booking).getTime();
      } else if (sortField === 'nama') {
        valA = a.nama.toLowerCase();
        valB = b.nama.toLowerCase();
      } else if (sortField === 'paket') {
        valA = (a.paket?.nama_paket || '').toLowerCase();
        valB = (b.paket?.nama_paket || '').toLowerCase();
      } else if (sortField === 'status_pembayaran') {
        valA = a.status_pembayaran_kode;
        valB = b.status_pembayaran_kode;
      } else if (sortField === 'status_sim') {
        valA = a.status_sim || 'belum';
        valB = b.status_sim || 'belum';
      } else if (sortField === 'tanggal_selesai_sim') {
        valA = a.tanggal_selesai_sim ? new Date(a.tanggal_selesai_sim).getTime() : 0;
        valB = b.tanggal_selesai_sim ? new Date(b.tanggal_selesai_sim).getTime() : 0;
      }

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valA < valB ? 1 : valA > valB ? -1 : 0;
      }
    });
    return list;
  }, [filteredStudents, sortField, sortOrder]);

  // Reset page when filters change
  React.useEffect(() => {
    setPageIndex(0);
  }, [currentTab, filterPembayaran, filterPaket, datePreset, startDate, endDate, searchQuery]);

  const pageCount = Math.max(1, Math.ceil(sortedStudents.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const paginatedStudents = React.useMemo(() => {
    const start = safePageIndex * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, safePageIndex, pageSize]);

  // Page Numbers Generator
  const getPageNumbers = React.useCallback((): (number | string)[] => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    const current = safePageIndex + 1;

    if (current > 3) {
      pages.push('...');
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(pageCount - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < pageCount - 2) {
      pages.push('...');
    }

    pages.push(pageCount);
    return pages;
  }, [safePageIndex, pageCount]);

  const exportSimColumns: ExportColumn[] = [
    { header: 'Kode Siswa', key: 'kode_siswa', width: 14, align: 'center' },
    { header: 'Nama Siswa', key: 'nama', width: 25 },
    { header: 'No. WhatsApp', key: 'no_whatsapp', width: 18, align: 'center' },
    {
      header: 'Paket Kursus',
      key: 'paket_id',
      width: 22,
      formatter: (_v, row) => row.paket?.nama_paket || 'Paket SIM',
    },
    {
      header: 'Tanggal Daftar',
      key: 'tanggal_booking',
      width: 16,
      align: 'center',
      formatter: (v) => formatDateIndo(v),
    },
    {
      header: 'Status Pembayaran',
      key: 'status_pembayaran_kode',
      width: 18,
      align: 'center',
      formatter: (v) => (v === 'lunas' ? 'Lunas' : v === 'dp' ? 'DP' : 'Belum Bayar'),
    },
    {
      header: 'Status Penerbitan SIM',
      key: 'status_sim',
      width: 20,
      align: 'center',
      formatter: (v) => (v === 'selesai' ? 'SELESAI TERBIT' : 'MENUNGGU / PROSES'),
    },
    {
      header: 'Tanggal Selesai SIM',
      key: 'tanggal_selesai_sim',
      width: 18,
      align: 'center',
      formatter: (v) => (v ? formatDateIndo(v) : '-'),
    },
    { header: 'Catatan SIM', key: 'catatan_sim', width: 25, formatter: (v) => v || '-' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen SIM Siswa"
        description="Kelola penerbitan SIM, validasi status pelunasan siswa, dan arsip berkas SIM selesai terbit"
        breadcrumbs={[{ label: 'Manajemen Siswa' }, { label: 'Manajemen SIM' }]}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setIsEksekusiModalOpen(true);
                setEksekusiError(null);
                setEksekusiSuccessMsg(null);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Eksekusi Pelatihan SIM</span>
            </button>

            <div className="relative" ref={headerMenuRef}>
              <button
                type="button"
                onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                className="px-3.5 py-2 bg-[var(--bg)] hover:bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--text-primary)] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Menu Opsi SIM</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform duration-200 ${
                    isHeaderMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isHeaderMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-xl p-1.5 z-40 space-y-1 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleOpenNonSiswaModal();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-indigo-600" />
                    <span>+ Tambah Non-Siswa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      setIsSimConfigModalOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <SettingsIcon className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span>Pengaturan Biaya SIM</span>
                  </button>

                  <div className="border-t border-[var(--border)] my-1" />

                  <div className="px-1 py-0.5">
                    <ExportButton
                      data={sortedStudents}
                      columns={exportSimColumns}
                      filename={`amanahdrive_layanan_sim_${currentTab}`}
                      title="REKAPITULASI PENERBITAN SIM SISWA"
                      subtitle="Laporan Administrasi & Status Berkas SIM Siswa Amanah Drive"
                      summaryMetrics={[
                        { label: 'Total Siswa SIM', value: `${metrics.totalSim} Orang` },
                        { label: 'SIM Selesai Terbit', value: `${metrics.totalSelesai} Berkas` },
                        { label: 'Belum Selesai', value: `${metrics.totalBelumSelesai} Berkas` },
                        { label: 'Siap Terbit (Lunas)', value: `${metrics.totalSiapTerbit} Berkas` },
                      ]}
                      orientation="landscape"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        }

      />


      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Siswa SIM */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-[var(--brand-primary)] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Total Siswa Paket SIM
            </span>
            <div className="p-1.5 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
              <IdCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tabular-nums">
            {metrics.totalSim} <span className="text-xs font-semibold">Orang</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            Mengambil paket kursus + SIM
          </div>
        </div>

        {/* SIM Belum Selesai (Pending) */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-amber-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              SIM Belum Selesai
            </span>
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 tabular-nums">
            {metrics.totalBelumSelesai} <span className="text-xs font-semibold">Proses</span>
          </div>
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
            <span>{metrics.totalMenungguPelunasan} menunggu pelunasan</span>
          </div>
        </div>

        {/* Siap Terbit (Prioritas / Sudah Lunas) */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-blue-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Siap Selesai (Lunas)
            </span>
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-blue-600 tabular-nums">
            {metrics.totalSiapTerbit} <span className="text-xs font-semibold">Siap Proses</span>
          </div>
          <div className="text-[11px] text-blue-600 font-semibold">
            Sudah lunas & siap diterbitkan
          </div>
        </div>

        {/* SIM Selesai (Arsip) */}
        <div className="card-container p-4 space-y-1 bg-[var(--bg)] hover:border-emerald-500 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              SIM Selesai (Arsip)
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 tabular-nums">
            {metrics.totalSelesai} <span className="text-xs font-semibold">Selesai</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold">
            Telah diterbitkan & diarsipkan
          </div>
        </div>
      </div>

      {/* Main Container: Tabs, Filters, and Table */}
      <div className="card-container space-y-4 p-5">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentTab('active')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'active'
                  ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>SIM Aktif / Belum Selesai</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                {metrics.totalBelumSelesai}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('archived')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'archived'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Daftar Arsip Selesai</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                {metrics.totalSelesai}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('all')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                currentTab === 'all'
                  ? 'bg-[var(--text-primary)] text-[var(--bg)] shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Semua Siswa SIM</span>
              <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
                {metrics.totalSim}
              </span>
            </button>
          </div>

          <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
            Menampilkan <strong className="text-[var(--text-primary)]">{sortedStudents.length}</strong> data siswa (Urutan tanggal daftar awal <ArrowRight className="w-3 h-3 inline text-[var(--brand-primary)]" /> akhir)
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama, WA, kode, paket..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
              />
              <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-2.5 top-2.5" />
            </div>

            {/* Filter Status Pembayaran */}
            <div>
              <select
                value={filterPembayaran}
                onChange={(e) => setFilterPembayaran(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)]"
              >
                <option value="all">Semua Status Pembayaran</option>
                <option value="lunas">LUNAS (Siap Diterbitkan)</option>
                <option value="belum_lunas">BELUM LUNAS (DP / Belum Bayar)</option>
                <option value="dp">DP Saja</option>
                <option value="belum_bayar">Belum Bayar</option>
              </select>
            </div>

            {/* Filter Paket Kursus */}
            <div>
              <select
                value={filterPaket}
                onChange={(e) => setFilterPaket(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)]"
              >
                <option value="all">Semua Paket Kursus SIM</option>
                {paketList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_paket}
                  </option>
                ))}
              </select>
            </div>

            {/* Periode Preset */}
            <div className="flex items-center gap-1.5">
              {(
                [
                  { key: 'all', label: 'Semua' },
                  { key: 'month', label: 'Bulan Ini' },
                  { key: '30days', label: '30 Hari' },
                  { key: 'custom', label: 'Kustom' },
                ] as const
              ).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePresetChange(p.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    datePreset === p.key
                      ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--border)]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Picker */}
          {datePreset === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border)]">
              <DatePickerWIB
                label="Tanggal Daftar Mulai"
                value={startDate}
                onChange={setStartDate}
              />
              <DatePickerWIB
                label="Tanggal Daftar Selesai"
                value={endDate}
                onChange={setEndDate}
              />
            </div>
          )}
        </div>

        {/* Table of Students */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border)] select-none">
              <tr>
                <th
                  onClick={() => toggleSort('tanggal_booking')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                  title="Klik untuk mengurutkan tanggal daftar"
                >
                  <div className="flex items-center gap-1">
                    <span>Tgl Daftar (Booking)</span>
                    <ArrowUpDown className="w-3 h-3 text-[var(--brand-primary)]" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('nama')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Siswa</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('paket')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Paket Kursus</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('status_pembayaran')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Status Pembayaran</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('status_sim')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Status SIM</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('tanggal_selesai_sim')}
                  className="p-3 font-bold cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Tgl Selesai SIM</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 font-bold whitespace-nowrap">Catatan SIM</th>
                <th className="p-3 font-bold text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    Memuat data siswa paket SIM...
                  </td>
                </tr>
              ) : sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-[var(--text-secondary)]">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <IdCard className="w-8 h-8 opacity-30 text-[var(--text-secondary)] mb-1" />
                      <span className="font-semibold text-[var(--text-primary)]">
                        Tidak ada data siswa paket SIM
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        {currentTab === 'active'
                          ? 'Semua siswa SIM pada filter ini telah selesai / masuk arsip.'
                          : 'Coba ubah filter atau pencarian Anda.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => {
                  const isSelesai = s.status_sim === 'selesai';
                  const isLunas = s.status_pembayaran_kode === 'lunas';

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-[var(--bg-subtle)]/50 transition-colors"
                    >
                      {/* Tanggal Booking / Daftar */}
                      <td className="p-3 whitespace-nowrap font-medium text-[var(--text-primary)]">
                        <div className="font-bold">{formatDateIndo(s.tanggal_booking)}</div>
                        <div className="text-[10px] text-[var(--text-secondary)]">
                          Mulai: {formatDateIndo(s.tanggal_rencana_mulai)}
                        </div>
                      </td>

                      {/* Nama Siswa & WhatsApp */}
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-xs shrink-0">
                            {s.nama.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/siswa/${s.id}`}
                              className="font-bold text-[var(--text-primary)] hover:text-[var(--brand-primary)] hover:underline"
                            >
                              {s.nama}
                            </Link>
                            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)] mt-0.5">
                              <span>{s.kode_siswa}</span>
                              {s.no_whatsapp && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={getSimReminderWaUrl(s)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 hover:text-emerald-800 border border-emerald-200 dark:border-emerald-800 font-semibold text-[10px] transition-all shadow-2xs group"
                                    title="Kirim pengingat jadwal pembuatan SIM via WhatsApp Web"
                                  >
                                    <MessageCircle className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                                    <span>{s.no_whatsapp}</span>
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Paket Kursus */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-bold text-[11px] inline-flex items-center gap-1">
                          <IdCard className="w-3 h-3" />
                          <span>{s.paket?.nama_paket || 'Paket SIM'}</span>
                        </span>
                        <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-medium">
                          {formatRupiah(s.harga_final)}
                        </div>
                      </td>

                      {/* Status Pembayaran */}
                      <td className="p-3 whitespace-nowrap">
                        {isLunas ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            LUNAS
                          </span>
                        ) : s.status_pembayaran_kode === 'dp' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            DP ({formatRupiah(s.dp_nominal || 0)})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px] inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            BELUM BAYAR
                          </span>
                        )}
                      </td>

                      {/* Status SIM (Interaktif Click) */}
                      <td className="p-3 whitespace-nowrap">
                        {isSelesai ? (
                          <button
                            type="button"
                            onClick={() => handleOpenChangeStatus(s)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold text-[11px] hover:bg-emerald-100 transition-all inline-flex items-center gap-1"
                            title="Klik untuk mengubah status SIM"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>SELESAI (Arsip)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenChangeStatus(s)}
                            className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] transition-all inline-flex items-center gap-1 ${
                              isLunas
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 hover:bg-blue-100 animate-pulse'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 hover:bg-amber-100'
                            }`}
                            title={isLunas ? 'Klik untuk tandai selesai' : 'Perlu pelunasan sebelum selesai'}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>BELUM {isLunas ? '(Siap Terbit)' : ''}</span>
                          </button>
                        )}
                      </td>

                      {/* Tanggal Selesai SIM */}
                      <td className="p-3 whitespace-nowrap font-mono tabular-nums">
                        {s.tanggal_selesai_sim ? (
                          <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            {formatDateIndo(s.tanggal_selesai_sim)}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] italic text-[11px]">-</span>
                        )}
                      </td>

                      {/* Catatan SIM */}
                      <td className="p-3 max-w-xs truncate text-[11px] text-[var(--text-secondary)]">
                        {s.catatan_sim || s.catatan || '-'}
                      </td>

                      {/* Aksi */}
                      <td className="p-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {s.no_whatsapp && (
                            <a
                              href={getSimReminderWaUrl(s)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-[var(--text-secondary)] hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                              title="Kirim Pengingat Jadwal SIM via WhatsApp Web"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenChangeStatus(s)}
                            className="px-2 py-1 bg-[var(--brand-primary-light)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                            title="Ubah Status SIM & Tanggal Selesai"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Ubah</span>
                          </button>

                          <Link
                            href={`/siswa/${s.id}`}
                            className="p-1 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-[var(--bg-subtle)] rounded-lg transition-colors"
                            title="Buka Detail Siswa"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <Link
                            href={`/nota?siswa_id=${s.id}`}
                            className="p-1 text-[var(--text-secondary)] hover:text-emerald-600 hover:bg-[var(--bg-subtle)] rounded-lg transition-colors"
                            title="Cetak Nota Pembayaran Siswa"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Enterprise Pagination Bar */}
        {sortedStudents.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
            {/* Rows Per Page Selector & Summary */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span>Tampilkan:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPageIndex(0);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)] cursor-pointer"
                >
                  {[5, 10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size} baris
                    </option>
                  ))}
                </select>
              </div>

              <span>
                Menampilkan{' '}
                <strong className="text-[var(--text-primary)]">
                  {safePageIndex * pageSize + 1}
                </strong>{' '}
                -{' '}
                <strong className="text-[var(--text-primary)]">
                  {Math.min((safePageIndex + 1) * pageSize, sortedStudents.length)}
                </strong>{' '}
                dari{' '}
                <strong className="text-[var(--text-primary)]">{sortedStudents.length}</strong> data
              </span>
            </div>

            {/* Pagination Button Navigation */}
            <div className="flex items-center gap-1 select-none">
              {/* First Page */}
              <button
                type="button"
                onClick={() => setPageIndex(0)}
                disabled={safePageIndex === 0}
                className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={safePageIndex === 0}
                className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Numbered Page Buttons */}
              <div className="flex items-center gap-1 mx-1">
                {getPageNumbers().map((p, idx) => {
                  if (typeof p === 'string') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-[var(--text-muted)] font-bold">
                        {p}
                      </span>
                    );
                  }
                  const isActive = p === safePageIndex + 1;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPageIndex(p - 1)}
                      className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded-md border transition-colors ${
                        isActive
                          ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-xs'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                disabled={safePageIndex >= pageCount - 1}
                className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => setPageIndex(pageCount - 1)}
                disabled={safePageIndex >= pageCount - 1}
                className="p-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog Form: Ubah Status SIM & Tanggal Selesai */}
      {isModalOpen && selectedSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <IdCard className="w-5 h-5 text-[var(--brand-primary)]" />
                <span>Ubah Status SIM Siswa</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-[var(--danger)] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Info Siswa */}
            <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Nama Siswa:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedSiswa.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Paket Kursus:</span>
                <span className="font-semibold text-[var(--brand-primary)]">
                  {selectedSiswa.paket?.nama_paket}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Status Pembayaran:</span>
                <span className="font-bold text-emerald-600 uppercase">
                  {selectedSiswa.status_pembayaran_kode} (LUNAS)
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveStatusSim} className="space-y-4 text-xs">
              {/* Radio Pilihan Status */}
              <div>
                <label className="block text-[var(--text-secondary)] mb-1.5 font-bold">
                  Pilih Status Penerbitan SIM *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold cursor-pointer transition-all ${
                      modalTargetStatus === 'selesai'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modal_status_sim"
                      value="selesai"
                      checked={modalTargetStatus === 'selesai'}
                      onChange={() => setModalTargetStatus('selesai')}
                      className="sr-only"
                    />
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>SELESAI (Arsip)</span>
                  </label>

                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold cursor-pointer transition-all ${
                      modalTargetStatus === 'belum'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 shadow-xs'
                        : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modal_status_sim"
                      value="belum"
                      checked={modalTargetStatus === 'belum'}
                      onChange={() => setModalTargetStatus('belum')}
                      className="sr-only"
                    />
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>BELUM SELESAI</span>
                  </label>
                </div>
              </div>

              {/* Tanggal Selesai SIM (Hanya jika Selesai) */}
              {modalTargetStatus === 'selesai' && (
                <div>
                  <DatePickerWIB
                    label="Pilih Tanggal Selesai SIM *"
                    value={modalTanggalSelesai}
                    onChange={setModalTanggalSelesai}
                  />
                  <span className="text-[10px] text-[var(--text-secondary)] block mt-1">
                    Tanggal resmi SIM selesai diterbitkan / diambil siswa
                  </span>
                </div>
              )}

              {/* Catatan SIM */}
              <div>
                <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                  Catatan / Keterangan SIM (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SIM A Polrestabes Palembang / Diambil Siswa"
                  value={modalCatatanSim}
                  onChange={(e) => setModalCatatanSim(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Status SIM</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alert: Pembayaran Belum Lunas */}
      {unpaidAlertStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg)] border border-rose-300 dark:border-rose-900/60 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  Pembayaran Belum Lunas!
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Siswa <strong className="text-[var(--text-primary)]">{unpaidAlertStudent.nama}</strong> saat ini berstatus{' '}
                  <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold uppercase text-[10px]">
                    {unpaidAlertStudent.status_pembayaran_kode}
                  </span>
                  .
                </p>
                <p className="text-xs text-rose-600 font-semibold pt-1">
                  Status SIM hanya dapat diselesaikan jika siswa telah melunasi seluruh biaya kursus.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Total Biaya Paket:</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {formatRupiah(unpaidAlertStudent.harga_final)}
                </span>
              </div>
              {unpaidAlertStudent.dp_nominal ? (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Sudah Dibayar (DP):</span>
                  <span className="font-semibold text-amber-600">
                    {formatRupiah(unpaidAlertStudent.dp_nominal)}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setUnpaidAlertStudent(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
              >
                Tutup
              </button>
              <Link
                href={`/siswa/${unpaidAlertStudent.id}`}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all inline-flex items-center gap-1.5"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Pelunasan di Detail Siswa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Biaya SIM */}
      {isSimConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg)] rounded-2xl border border-[var(--border)] p-6 shadow-2xl space-y-4">
            <div className="border-b border-[var(--border)] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                  <SettingsIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Pengaturan Biaya
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Pengaturan rincian biaya pelatihan & fee admin penerbitan SIM
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSimConfigModalOpen(false)}
                className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSimConfig} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Biaya Pelatihan SIM *
                </label>
                <CurrencyInput
                  value={simConfig.biayaPelatihanSim ?? 780000}
                  onChange={(val) =>
                    setSimConfig((prev) => ({
                      ...prev,
                      biayaPelatihanSim: val,
                      hargaDefault: val + (prev.feeAdmin ?? 70000),
                    }))
                  }
                  className="w-full text-base font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Fee Admin SIM *
                </label>
                <CurrencyInput
                  value={simConfig.feeAdmin ?? 70000}
                  onChange={(val) =>
                    setSimConfig((prev) => ({
                      ...prev,
                      feeAdmin: val,
                      hargaDefault: (prev.biayaPelatihanSim ?? 780000) + val,
                    }))
                  }
                  className="w-full text-base font-bold"
                />
              </div>

              <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium">Total Modal SIM Per Siswa:</span>
                <span className="font-bold text-[var(--brand-primary)] text-sm">
                  {formatRupiah((simConfig.biayaPelatihanSim ?? 780000) + (simConfig.feeAdmin ?? 70000))}
                </span>
              </div>

              {simConfigSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 font-bold text-center text-xs flex items-center justify-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pengaturan biaya SIM berhasil disimpan!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsSimConfigModalOpen(false)}
                  className="px-4 py-2 font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSimConfig}
                  className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  {savingSimConfig ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eksekusi Pelatihan SIM */}
      {isEksekusiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--bg)] rounded-2xl border border-[var(--border)] p-6 shadow-2xl space-y-5">
            {/* Header Modal */}
            <div className="border-b border-[var(--border)] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    Eksekusi Pelatihan SIM
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Filter & pilih daftar siswa berstatus siap terbit, eksekusi status, atau salin WA Markdown
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEksekusiModalOpen(false)}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {eksekusiError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{eksekusiError}</span>
              </div>
            )}

            {eksekusiSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{eksekusiSuccessMsg}</span>
              </div>
            )}

            {/* Filter Section & Control Panel */}
            <div className="bg-[var(--bg-subtle)]/70 border border-[var(--border)] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                <Filter className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Filter & Parameter Eksekusi</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Filter Periode Bulan */}
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Periode Bulan
                  </label>
                  <select
                    value={eksekusiPeriode}
                    onChange={(e) => setEksekusiPeriode(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="bulan_ini">Bulan Ini</option>
                    <option value="bulan_lalu">Bulan Lalu</option>
                    <option value="semua">Semua Periode</option>
                  </select>
                </div>

                {/* Filter Status SIM */}
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Status SIM
                  </label>
                  <select
                    value={eksekusiStatusSim}
                    onChange={(e) => setEksekusiStatusSim(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--text-primary)] cursor-pointer"
                  >
                    <option value="belum">BELUM (Siap Terbit)</option>
                    <option value="semua">Semua Status</option>
                    <option value="selesai">Selesai Terbit</option>
                  </select>
                </div>

                {/* Filter Jenis SIM (Checkboxes) */}
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Jenis SIM
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={eksekusiSimAFilter}
                        onChange={(e) => setEksekusiSimAFilter(e.target.checked)}
                        className="rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                      />
                      <span className="font-semibold text-xs text-[var(--text-primary)]">SIM A</span>
                    </label>

                    <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={eksekusiSimCFilter}
                        onChange={(e) => setEksekusiSimCFilter(e.target.checked)}
                        className="rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
                      />
                      <span className="font-semibold text-xs text-[var(--text-primary)]">SIM C</span>
                    </label>
                  </div>
                </div>

                {/* Tanggal Pelatihan SIM */}
                <div>
                  <DatePickerWIB
                    label="Pilih Tanggal Pelatihan *"
                    value={eksekusiTanggal}
                    onChange={setEksekusiTanggal}
                  />
                </div>
              </div>
            </div>

            {/* Student Table List with Checkboxes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold text-[var(--text-primary)]">
                  Daftar Siswa Siap Terbit ({eksekusiFilteredStudents.length} Siswa Terfilter)
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAllEksekusi}
                  className="text-[var(--brand-primary)] hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer"
                >
                  {selectedEksekusiIds.length === eksekusiFilteredStudents.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                      <span>Batal Pilih Semua</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      <span>Pilih Semua ({eksekusiFilteredStudents.length})</span>
                    </>
                  )}
                </button>
              </div>

              <div className="border border-[var(--border)] rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border)] sticky top-0 z-10 select-none">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            eksekusiFilteredStudents.length > 0 &&
                            selectedEksekusiIds.length === eksekusiFilteredStudents.length
                          }
                          onChange={toggleSelectAllEksekusi}
                          className="rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                        />
                      </th>
                      <th className="p-2.5 font-bold">Nama Siswa</th>
                      <th className="p-2.5 font-bold">No. WhatsApp</th>
                      <th className="p-2.5 font-bold">Jenis SIM / Paket</th>
                      <th className="p-2.5 font-bold">Status Bayar</th>
                      <th className="p-2.5 font-bold">Tgl Booking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {eksekusiFilteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-xs text-[var(--text-secondary)]">
                          Tidak ada siswa yang memenuhi filter eksekusi.
                        </td>
                      </tr>
                    ) : (
                      eksekusiFilteredStudents.map((s) => {
                        const isSelected = selectedEksekusiIds.includes(s.id);
                        const isSimC = (s.paket?.nama_paket || '').toLowerCase().includes('sim c');
                        const jenisSim = isSimC ? 'SIM C' : 'SIM A';

                        return (
                          <tr
                            key={s.id}
                            onClick={() => toggleSelectStudentEksekusi(s.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[var(--brand-primary-light)]/40 hover:bg-[var(--brand-primary-light)]/60'
                                : 'hover:bg-[var(--bg-subtle)]/50'
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectStudentEksekusi(s.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                              />
                            </td>
                            <td className="p-2.5 font-bold text-[var(--text-primary)]">
                              {s.nama}
                            </td>
                            <td className="p-2.5 font-mono text-[var(--text-secondary)]">
                              {s.no_whatsapp || '-'}
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-md bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-bold text-[10px]">
                                {jenisSim}
                              </span>
                              <span className="text-[10px] text-[var(--text-secondary)] ml-1.5">
                                {s.paket?.nama_paket}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                                {s.status_pembayaran_kode?.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-2.5 text-[var(--text-secondary)]">
                              {formatDateIndo(s.tanggal_booking)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cost Breakdown & Subtotal Summary Box */}
            <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-[var(--text-secondary)]">
                <span>Ringkasan Eksekusi ({countSelected} Siswa Terpilih):</span>
                <span className="text-[11px] italic">Pelatihan Rp {formatRupiah(biayaPelatihanUnit)} + Fee Admin Rp {formatRupiah(feeAdminUnit)}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-[var(--border)]">
                <div className="p-2.5 bg-[var(--bg)] rounded-lg border border-[var(--border)] space-y-0.5">
                  <div className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase">
                    Subtotal Pelatihan
                  </div>
                  <div className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                    {formatRupiah(subtotalPelatihan)}
                  </div>
                </div>

                <div className="p-2.5 bg-[var(--bg)] rounded-lg border border-[var(--border)] space-y-0.5">
                  <div className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase">
                    Subtotal Fee Admin
                  </div>
                  <div className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                    {formatRupiah(subtotalFeeAdmin)}
                  </div>
                </div>

                <div className="p-2.5 bg-[var(--brand-primary-light)] rounded-lg border border-[var(--brand-primary)]/30 space-y-0.5">
                  <div className="text-[10px] text-[var(--brand-primary)] font-extrabold uppercase">
                    Total Keseluruhan
                  </div>
                  <div className="text-base font-black text-[var(--brand-primary)] tabular-nums">
                    {formatRupiah(totalEksekusi)}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
              <div className="relative">
                <button
                  type="button"
                  onClick={handleCopyWaMarkdown}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy WA Markdown</span>
                </button>
                {waCopiedToast && (
                  <span className="absolute -top-8 left-0 px-2.5 py-1 bg-black text-white text-[10px] rounded-lg shadow-md animate-fadeIn whitespace-nowrap z-20">
                    WA Markdown disalin ke clipboard!
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsEksekusiModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  Kembali
                </button>

                <button
                  type="button"
                  onClick={handleExecuteBatchSimSubmit}
                  disabled={executingBatch || countSelected === 0}
                  className="px-5 py-2 text-xs font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {executingBatch ? (
                    <span>Memproses Eksekusi...</span>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Eksekusi ({countSelected} Siswa)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Peserta SIM Non-Siswa */}

      {isNonSiswaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg)] rounded-2xl border border-[var(--border)] p-6 shadow-2xl space-y-4">
            {/* Header Modal */}
            <div className="border-b border-[var(--border)] pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    Input Peserta SIM Non-Siswa
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Pendaftaran peserta SIM di luar siswa reguler kursus
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNonSiswaModalOpen(false)}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification / Error Alerts */}
            {nonSiswaError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{nonSiswaError}</span>
              </div>
            )}

            {nonSiswaSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Peserta SIM non-siswa berhasil ditambahkan!</span>
              </div>
            )}

            {/* Analisa Kas Otomatis Suggestion Banner / Dropdown */}
            {loadingKasCandidates ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs flex items-center gap-2 font-medium">
                <Sparkles className="w-4 h-4 animate-spin shrink-0 text-amber-500" />
                <span>Memindai transaksi kas masuk SIM...</span>
              </div>
            ) : kasCandidates.length > 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Analisa Kas Otomatis Terdeteksi!</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Ditemukan {kasCandidates.length} transaksi pemasukan SIM di kas yang belum terdata di sistem:
                </p>
                <select
                  value={nonSiswaLinkedKasId || ''}
                  onChange={(e) => handleSelectKasCandidate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-[var(--bg)] font-semibold text-[var(--text-primary)] focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">-- Pilih dari Saran Transaksi Kas (Opsional) --</option>
                  {kasCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{formatDateIndo(c.tanggal)}] {c.namaExtracted} - {formatRupiah(c.nominal)} ({c.keterangan})
                    </option>
                  ))}
                </select>
                {nonSiswaLinkedKasId && (
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Ditautkan ke transaksi Kas. Pemasukan tidak akan diduplikasi di kas.</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Form Fields */}
            <form onSubmit={handleSaveNonSiswaSubmit} className="space-y-4 text-xs">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Nama Lengkap Peserta SIM *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={nonSiswaNama}
                  onChange={(e) => setNonSiswaNama(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-semibold text-xs focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Nomor WhatsApp (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={nonSiswaWa}
                  onChange={(e) => setNonSiswaWa(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium text-xs focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>

              {/* Grid: Jenis SIM & Status Pembayaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Jenis SIM */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Jenis SIM *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNonSiswaJenisSim('SIM A')}
                      className={`p-2 rounded-xl border font-bold text-xs transition-all ${
                        nonSiswaJenisSim === 'SIM A'
                          ? 'bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border-[var(--brand-primary)] shadow-xs'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      SIM A (Mobil)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNonSiswaJenisSim('SIM C')}
                      className={`p-2 rounded-xl border font-bold text-xs transition-all ${
                        nonSiswaJenisSim === 'SIM C'
                          ? 'bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border-[var(--brand-primary)] shadow-xs'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      SIM C (Motor)
                    </button>
                  </div>
                </div>

                {/* Status Pembayaran */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Status Pembayaran *
                  </label>
                  <select
                    value={nonSiswaStatusBayar}
                    onChange={(e) => setNonSiswaStatusBayar(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-bold text-xs cursor-pointer"
                  >
                    <option value="lunas">LUNAS (Siap Diterbitkan)</option>
                    <option value="dp">DP Saja</option>
                    <option value="belum_bayar">BELUM BAYAR</option>
                  </select>
                </div>
              </div>

              {/* Biaya Pelatihan SIM (Customizable) */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Biaya Pelatihan SIM (Dapat Diubah) *
                </label>
                <CurrencyInput
                  value={nonSiswaHarga}
                  onChange={(val) => setNonSiswaHarga(val)}
                  className="w-full text-base font-bold"
                />
                <span className="text-[10px] text-[var(--text-secondary)] block mt-1">
                  Nominal biaya tidak mengikat standar 850k (bebas disesuaikan).
                </span>
              </div>


              {/* Catatan / Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pendaftaran SIM Non-Siswa dari Instansi / Referensi"
                  value={nonSiswaCatatan}
                  onChange={(e) => setNonSiswaCatatan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsNonSiswaModalOpen(false)}
                  className="px-4 py-2 font-semibold text-xs rounded-xl border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={savingNonSiswa}
                  className="px-5 py-2 font-extrabold text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-xs transition-all flex items-center gap-1.5"
                >
                  {savingNonSiswa ? (
                    <span>Menyimpan Data...</span>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Simpan Peserta Non-Siswa</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


