'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Siswa, Paket, RekeningBank } from '@/types/database';
import { getSiswaList } from '@/lib/actions/siswa';
import { getPaketList } from '@/lib/actions/master-data';
import { getRekeningList } from '@/lib/actions/rekening';
import { LABEL_REKENING_DEFAULT } from '@/lib/constants/finance';
import { formatRupiah } from '@/lib/utils/currency';
import { getTodayDateString, formatDateIndo, getJakartaDateParts } from '@/lib/utils/date';
import { NotaDocumentPaper } from '@/components/shared/NotaDocumentPaper';
import {
  NotaJenis,
  NotaData,
  InvoiceItem,
  getJenisInfo,
  generateNomorDokumen,
  executePrint,
  downloadMultiPageJpg,
  downloadMultiPagePdf,
  copyPageToClipboard,
} from '@/lib/utils/nota-generator';
import {
  Receipt,
  Printer,
  Copy,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  FileDown,
  Info,
  CreditCard,
  Banknote,
  QrCode,
  Stamp,
  Users,
  SlidersHorizontal,
  Search,
  ArrowUpDown,
  X,
  ExternalLink,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Layers,
  Plus,
  Trash2,
  Calendar,
  CalendarDays,
  RotateCcw,
  Filter,
} from 'lucide-react';

export type PeriodFilterType = 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom';

export type SortKeyType =
  | 'date_asc'
  | 'date_desc'
  | 'name_asc'
  | 'name_desc'
  | 'nominal_desc'
  | 'nominal_asc'
  | 'sisa_desc'
  | 'sisa_asc';

const PERIOD_OPTIONS: { key: PeriodFilterType; label: string }[] = [
  { key: 'all', label: 'Semua Waktu' },
  { key: 'today', label: 'Hari Ini' },
  { key: 'this_week', label: 'Minggu Ini' },
  { key: 'this_month', label: 'Bulan Ini' },
  { key: 'last_month', label: 'Bulan Lalu' },
  { key: 'this_year', label: 'Tahun Ini' },
  { key: 'custom', label: 'Rentang Kustom' },
];

const SORT_OPTIONS: { key: SortKeyType; label: string }[] = [
  { key: 'date_asc', label: 'Tanggal: Terlama ke Terbaru (FIFO)' },
  { key: 'date_desc', label: 'Tanggal: Terbaru ke Terlama (LIFO)' },
  { key: 'name_asc', label: 'Nama Siswa: A → Z' },
  { key: 'name_desc', label: 'Nama Siswa: Z → A' },
  { key: 'nominal_desc', label: 'Uang Masuk: Tertinggi' },
  { key: 'nominal_asc', label: 'Uang Masuk: Terendah' },
  { key: 'sisa_desc', label: 'Sisa Piutang: Terbesar' },
  { key: 'sisa_asc', label: 'Sisa Piutang: Terkecil' },
];

const JENIS_DOC_ITEMS: { value: NotaJenis; label: string; desc: string; size: string }[] = [
  {
    value: 'nota_dp',
    label: 'Nota DP',
    desc: 'Pembayaran Uang Muka (DP)',
    size: 'A5 Landscape',
  },
  {
    value: 'nota_pelunasan',
    label: 'Nota Pelunasan',
    desc: 'Pelunasan Sisa Biaya Kursus',
    size: 'A5 Landscape',
  },
  {
    value: 'nota_pembayaran',
    label: 'Kwitansi / Nota Umum',
    desc: 'Pembayaran Umum / Angsuran',
    size: 'A5 Landscape',
  },
  {
    value: 'nota_tagihan',
    label: 'Nota Rincian Tagihan',
    desc: 'Rincian Tagihan Piutang Siswa',
    size: 'A5 Landscape',
  },
  {
    value: 'invoice_tagihan',
    label: 'Invoice Resmi',
    desc: 'Invoice Tagihan Pelatihan',
    size: 'A4 Portrait',
  },
];

export default function NotaPage() {
  // Data State
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [rekeningList, setRekeningList] = React.useState<RekeningBank[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Tab View: 'queue' (Antrean Siswa) vs 'studio' (Cetak Bebas / Manual)
  const [viewMode, setViewMode] = React.useState<'queue' | 'studio'>('queue');

  // Filter & Search State for Queue
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'dp' | 'lunas'>('all');
  const [paketFilter, setPaketFilter] = React.useState<string>('all');
  const [periodFilter, setPeriodFilter] = React.useState<PeriodFilterType>('all');
  const [customStartDate, setCustomStartDate] = React.useState<string>('');
  const [customEndDate, setCustomEndDate] = React.useState<string>('');
  const [dateFieldBasis, setDateFieldBasis] = React.useState<'dp_tanggal' | 'tanggal_booking'>('dp_tanggal');
  const [sortKey, setSortKey] = React.useState<SortKeyType>('date_asc');

  // Base64 Images for bulletproof html2canvas capture (no CORS)
  const [logoBase64, setLogoBase64] = React.useState<string>('/assets/logo-amdri-landscape.png');
  const [stampBase64, setStampBase64] = React.useState<string>('/assets/cap-amanah.png');

  // Active Document State
  const [jenis, setJenis] = React.useState<NotaJenis>('nota_dp');
  const [nomorDokumen, setNomorDokumen] = React.useState(() => generateNomorDokumen('nota_dp'));
  const [tanggal, setTanggal] = React.useState(getTodayDateString());

  // Siswa Info
  const [namaSiswa, setNamaSiswa] = React.useState('Ahmad Fauzi');
  const [kodeSiswa, setKodeSiswa] = React.useState('SS001');
  const [noWhatsapp, setNoWhatsapp] = React.useState('0812-3456-7890');
  const [alamatSiswa, setAlamatSiswa] = React.useState('Kota Palembang, Sumatera Selatan');

  // Paket Info
  const [namaPaket, setNamaPaket] = React.useState('Paket Silver 10 Sesi (Manual)');
  const [jumlahSesi, setJumlahSesi] = React.useState(10);
  const [tipeMobil, setTipeMobil] = React.useState('Manual');
  const [catatanPaket, setCatatanPaket] = React.useState('Pelatihan Mengemudi Mobil Manual Dasar s/d Mahir');

  // Biaya & Pembayaran
  const [hargaPaket, setHargaPaket] = React.useState(2500000);
  const [diskonNominal, setDiskonNominal] = React.useState(0);
  const [dpTerbayar, setDpTerbayar] = React.useState(0);
  const [nominalBayarIni, setNominalBayarIni] = React.useState(1250000);

  // Detail Pembayaran
  const [metodePembayaran, setMetodePembayaran] = React.useState<'tunai' | 'transfer' | 'qris'>('transfer');
  const [namaBank, setNamaBank] = React.useState('BCA (8535441234 a.n PT Amanah Drive)');
  const [catatanPembayaran, setCatatanPembayaran] = React.useState('Pembayaran Uang Muka (DP) 50% Pelatihan Mengemudi');

  // Otorisasi
  const [kota, setKota] = React.useState('Palembang');
  const [picNama, setPicNama] = React.useState('Admin Amanah Drive');
  const [picJabatan, setPicJabatan] = React.useState('Petugas Administrasi');
  const [showStempel, setShowStempel] = React.useState(true);

  // Modal Pop-Up State for 1-Click Print
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedStudentForModal, setSelectedStudentForModal] = React.useState<Siswa | null>(null);

  // Action Loading & Toast Feedback
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Zoom & Multi-Page View State
  const [studioZoom, setStudioZoom] = React.useState<number>(1);
  const [studioActivePage, setStudioActivePage] = React.useState<number>(0); // 0 = all pages
  const [studioTotalPages, setStudioTotalPages] = React.useState<number>(1);

  const [modalActivePage, setModalActivePage] = React.useState<number>(0);
  const [modalTotalPages, setModalTotalPages] = React.useState<number>(1);

  // Custom Items (for Multi-Item / Extra Fees / Overflow Testing)
  const [customItems, setCustomItems] = React.useState<InvoiceItem[]>([]);

  // Document Paper Ref for Capture
  const documentPaperRef = React.useRef<HTMLDivElement>(null);
  const modalPaperRef = React.useRef<HTMLDivElement>(null);

  // Load Initial Data and preload images to Base64
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sList, pList, rList] = await Promise.all([getSiswaList(), getPaketList(), getRekeningList()]);
        setSiswaList(sList);
        setPaketList(pList);
        setRekeningList(rList);
        const def = rList.find((r) => r.aktif && r.is_utama) || rList.find((r) => r.aktif);
        if (def) {
          setNamaBank(`${def.nama_bank} (${def.nomor_rekening} a.n ${def.atas_nama})`);
        }
      } catch (err) {
        console.error('Error loading nota data:', err);
      } finally {
        setLoading(false);
      }
    })();

    const convertAssetToBase64 = async (url: string, setter: (val: string) => void) => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setter(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn('Could not preload base64 for', url, err);
      }
    };

    convertAssetToBase64('/assets/logo-amdri-landscape.png', setLogoBase64);
    convertAssetToBase64('/assets/cap-amanah.png', setStampBase64);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Calculations
  const totalTagihanBersih = Math.max(0, hargaPaket - diskonNominal);
  const totalBayarAkumulasi = dpTerbayar + nominalBayarIni;
  const sisaPiutang = Math.max(0, totalTagihanBersih - totalBayarAkumulasi);

  // Compute Period Bounds (Asia/Jakarta WIB)
  const periodBounds = React.useMemo(() => {
    const todayStr = getTodayDateString();
    const parts = getJakartaDateParts(todayStr);
    const curYear = parts?.year ?? new Date().getFullYear();
    const curMonth = parts?.month ?? (new Date().getMonth() + 1);
    const curDay = parts?.day ?? new Date().getDate();

    const pad = (n: number) => String(n).padStart(2, '0');

    if (periodFilter === 'today') {
      return { start: todayStr, end: todayStr, label: `Hari Ini (${formatDateIndo(todayStr)})` };
    }

    if (periodFilter === 'this_week') {
      const curDate = new Date(curYear, curMonth - 1, curDay);
      const dayOfWeek = curDate.getDay(); // 0 = Sunday, 1 = Monday
      const diffToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(curDate);
      monday.setDate(curDate.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const start = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
      const end = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;
      return { start, end, label: `Minggu Ini (${formatDateIndo(start)} – ${formatDateIndo(end)})` };
    }

    if (periodFilter === 'this_month') {
      const start = `${curYear}-${pad(curMonth)}-01`;
      const lastDay = new Date(curYear, curMonth, 0).getDate();
      const end = `${curYear}-${pad(curMonth)}-${pad(lastDay)}`;
      return { start, end, label: `Bulan Ini (${pad(curMonth)}/${curYear})` };
    }

    if (periodFilter === 'last_month') {
      const lastMonthYear = curMonth === 1 ? curYear - 1 : curYear;
      const lastMonthNum = curMonth === 1 ? 12 : curMonth - 1;
      const start = `${lastMonthYear}-${pad(lastMonthNum)}-01`;
      const lastDay = new Date(lastMonthYear, lastMonthNum, 0).getDate();
      const end = `${lastMonthYear}-${pad(lastMonthNum)}-${pad(lastDay)}`;
      return { start, end, label: `Bulan Lalu (${pad(lastMonthNum)}/${lastMonthYear})` };
    }

    if (periodFilter === 'this_year') {
      const start = `${curYear}-01-01`;
      const end = `${curYear}-12-31`;
      return { start, end, label: `Tahun ${curYear}` };
    }

    if (periodFilter === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate, label: `${formatDateIndo(customStartDate)} – ${formatDateIndo(customEndDate)}` };
    }

    return { start: null, end: null, label: 'Semua Waktu' };
  }, [periodFilter, customStartDate, customEndDate]);

  // Filtered and Sorted Students Queue
  const studentsNeedingReceipt = React.useMemo(() => {
    // 1. Base filter: DP or Lunas students only
    let list = siswaList.filter(
      (s) => s.status_pembayaran_kode === 'dp' || s.status_pembayaran_kode === 'lunas'
    );

    // 2. Status Filter
    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status_pembayaran_kode === statusFilter);
    }

    // 3. Paket Kursus Filter
    if (paketFilter !== 'all') {
      list = list.filter((s) => s.paket_id === paketFilter);
    }

    // 4. Period Filter
    if (periodBounds.start && periodBounds.end) {
      list = list.filter((s) => {
        let tglStr = '';
        if (dateFieldBasis === 'dp_tanggal') {
          tglStr = (s.dp_tanggal || s.tanggal_booking || s.created_at || '').slice(0, 10);
        } else {
          tglStr = (s.tanggal_booking || s.created_at || '').slice(0, 10);
        }
        if (!tglStr) return false;
        return tglStr >= periodBounds.start! && tglStr <= periodBounds.end!;
      });
    }

    // 5. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const matchNama = s.nama.toLowerCase().includes(q);
        const matchKode = (s.kode_siswa || '').toLowerCase().includes(q);
        const matchWA = (s.no_whatsapp || '').includes(q);
        const matchPaket = (s.paket?.nama_paket || '').toLowerCase().includes(q);
        return matchNama || matchKode || matchWA || matchPaket;
      });
    }

    // 6. Comprehensive Sorting
    return list.sort((a, b) => {
      const dateA = a.dp_tanggal || a.tanggal_booking || a.created_at || '';
      const dateB = b.dp_tanggal || b.tanggal_booking || b.created_at || '';
      const hargaFinalA = Number(a.harga_final) || 0;
      const hargaFinalB = Number(b.harga_final) || 0;
      const dpA = Number(a.dp_nominal) || 0;
      const dpB = Number(b.dp_nominal) || 0;
      const masukA = a.status_pembayaran_kode === 'lunas' ? hargaFinalA : dpA;
      const masukB = b.status_pembayaran_kode === 'lunas' ? hargaFinalB : dpB;
      const sisaA = Math.max(0, hargaFinalA - dpA);
      const sisaB = Math.max(0, hargaFinalB - dpB);

      switch (sortKey) {
        case 'date_asc': // Terlama ke terbaru (FIFO)
          return dateA.localeCompare(dateB);
        case 'date_desc': // Terbaru ke terlama (LIFO)
          return dateB.localeCompare(dateA);
        case 'name_asc': // Nama A - Z
          return (a.nama || '').localeCompare(b.nama || '');
        case 'name_desc': // Nama Z - A
          return (b.nama || '').localeCompare(a.nama || '');
        case 'nominal_desc': // Uang Masuk tertinggi
          return masukB - masukA;
        case 'nominal_asc': // Uang Masuk terendah
          return masukA - masukB;
        case 'sisa_desc': // Sisa piutang terbesar
          return sisaB - sisaA;
        case 'sisa_asc': // Sisa piutang terkecil
          return sisaA - sisaB;
        default:
          return dateA.localeCompare(dateB);
      }
    });
  }, [siswaList, statusFilter, paketFilter, periodBounds, dateFieldBasis, searchQuery, sortKey]);

  // Aggregate Metrics on Filtered Data
  const filteredMetrics = React.useMemo(() => {
    let totalPaket = 0;
    let totalMasuk = 0;
    let totalSisa = 0;
    for (const s of studentsNeedingReceipt) {
      const hargaFinal = Number(s.harga_final) || 0;
      const dp = Number(s.dp_nominal) || 0;
      const masuk = s.status_pembayaran_kode === 'lunas' ? hargaFinal : dp;
      const sisa = s.status_pembayaran_kode === 'lunas' ? 0 : Math.max(0, hargaFinal - dp);
      totalPaket += hargaFinal;
      totalMasuk += masuk;
      totalSisa += sisa;
    }
    return {
      count: studentsNeedingReceipt.length,
      totalPaket,
      totalMasuk,
      totalSisa,
    };
  }, [studentsNeedingReceipt]);

  // Check if any filter differs from default
  const isFilterActive =
    periodFilter !== 'all' ||
    statusFilter !== 'all' ||
    paketFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    sortKey !== 'date_asc' ||
    customStartDate !== '' ||
    customEndDate !== '' ||
    dateFieldBasis !== 'dp_tanggal';

  const handleResetFilters = () => {
    setPeriodFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setDateFieldBasis('dp_tanggal');
    setStatusFilter('all');
    setPaketFilter('all');
    setSearchQuery('');
    setSortKey('date_asc');
  };

  // Handler: Click "Cetak Nota" from Queue Row
  const handleOpenCetakNotaModal = (siswa: Siswa) => {
    setSelectedStudentForModal(siswa);
    const targetJenis: NotaJenis = siswa.status_pembayaran_kode === 'lunas' ? 'nota_pelunasan' : 'nota_dp';
    setJenis(targetJenis);
    setNomorDokumen(generateNomorDokumen(targetJenis));
    setTanggal(siswa.dp_tanggal || getTodayDateString());

    setNamaSiswa(siswa.nama || '');
    setKodeSiswa(siswa.kode_siswa || '');
    setNoWhatsapp(siswa.no_whatsapp || '');
    setAlamatSiswa(siswa.alamat || '');

    const p = siswa.paket || paketList.find((pkt) => pkt.id === siswa.paket_id);
    if (p) {
      setNamaPaket(p.nama_paket);
      setJumlahSesi(p.jumlah_sesi || 10);
      setTipeMobil(p.jenis_mobil?.[0] || 'Manual');
      setCatatanPaket(`${p.jumlah_sesi || 10} Sesi Pertemuan • ${p.jenis_mobil?.join(', ') || 'Manual'}`);
    } else {
      setNamaPaket('Paket Kursus Mengemudi');
      setJumlahSesi(10);
      setTipeMobil('Manual');
    }

    const harga = Number(siswa.harga_final) || Number(p?.harga_normal) || 0;
    setHargaPaket(harga);
    setDiskonNominal(0);
    const dp = Number(siswa.dp_nominal) || 0;
    setDpTerbayar(dp);

    if (targetJenis === 'nota_dp') {
      const suggestedDp = dp > 0 ? dp : Math.round(harga * 0.5);
      setNominalBayarIni(suggestedDp);
      setCatatanPembayaran(`Pembayaran Uang Muka (DP) Kursus Mengemudi - ${siswa.nama}`);
    } else if (targetJenis === 'nota_pelunasan') {
      const sisa = Math.max(0, harga - dp);
      setNominalBayarIni(sisa > 0 ? sisa : harga);
      setCatatanPembayaran(`Pelunasan Biaya Kursus Mengemudi - ${siswa.nama}`);
    }

    setIsModalOpen(true);
  };

  // Handler: Change Document Type (inside modal or studio)
  const handleJenisChange = (newJenis: NotaJenis) => {
    setJenis(newJenis);
    setNomorDokumen(generateNomorDokumen(newJenis));

    if (newJenis === 'nota_dp') {
      const suggestedDp = dpTerbayar > 0 ? dpTerbayar : Math.round(totalTagihanBersih * 0.5);
      setNominalBayarIni(suggestedDp);
      setCatatanPembayaran(`Pembayaran Uang Muka (DP) Pelatihan Mengemudi - ${namaSiswa}`);
    } else if (newJenis === 'nota_pelunasan') {
      const sisa = Math.max(0, totalTagihanBersih - dpTerbayar);
      setNominalBayarIni(sisa > 0 ? sisa : totalTagihanBersih);
      setCatatanPembayaran(`Pelunasan Biaya Kursus Mengemudi - ${namaSiswa}`);
    } else if (newJenis === 'nota_tagihan' || newJenis === 'invoice_tagihan') {
      setNominalBayarIni(0);
      setCatatanPembayaran(`Tagihan Resmi Kursus Mengemudi - ${namaSiswa}`);
    } else {
      setNominalBayarIni(1000000);
      setCatatanPembayaran(`Pembayaran Kursus Mengemudi - ${namaSiswa}`);
    }
  };

  // Current Nota Data Snapshot
  const currentNotaData: NotaData = {
    jenis,
    nomorDokumen,
    tanggalDokumen: tanggal,
    namaSiswa,
    kodeSiswa,
    noWhatsapp,
    alamatSiswa,
    namaPaket,
    jumlahSesi,
    tipeMobil,
    catatanPaket,
    hargaPaket,
    diskonNominal,
    totalTagihanBersih,
    dpTerbayar,
    nominalBayarIni,
    sisaPiutang,
    metodePembayaran,
    namaBank: metodePembayaran === 'transfer' ? namaBank : undefined,
    catatanPembayaran,
    kota,
    picNama,
    picJabatan,
    showStempel,
    customItems: customItems.length > 0 ? customItems : undefined,
  };

  const docInfo = getJenisInfo(jenis);
  const isA4 = docInfo.isA4;

  // Handler ekspor dokumen
  const getActiveRef = () => (isModalOpen ? modalPaperRef.current : documentPaperRef.current);

  // Helper: Retrieve all rendered page sheet elements from active paper container
  const getActivePages = (): HTMLElement[] => {
    const container = getActiveRef();
    if (!container) return [];
    const pageElements = Array.from(container.querySelectorAll<HTMLElement>('.print-sheet'));
    return pageElements.length > 0 ? pageElements : [container];
  };

  const handleDownloadJpg = async () => {
    const pages = getActivePages();
    if (pages.length === 0) return;
    setActionLoading('jpg');
    try {
      const filename = `${jenis}_${kodeSiswa || 'siswa'}_${tanggal}`;
      await downloadMultiPageJpg(pages, filename);
      showToast(`Berhasil mendownload ${pages.length > 1 ? `${pages.length} file gambar ` : 'gambar '}Nota (JPG)!`, 'success');
    } catch (err: any) {
      console.error('Download JPG Error:', err);
      showToast(`Gagal download JPG: ${err?.message || 'Error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPdf = async () => {
    const pages = getActivePages();
    if (pages.length === 0) return;
    setActionLoading('pdf');
    try {
      const filename = `${jenis}_${kodeSiswa || 'siswa'}_${tanggal}`;
      await downloadMultiPagePdf(pages, filename, isA4);
      showToast(`Berhasil mendownload dokumen ${pages.length > 1 ? `(${pages.length} Halaman) ` : ''}PDF!`, 'success');
    } catch (err: any) {
      console.error('Download PDF Error:', err);
      showToast(`Gagal download PDF: ${err?.message || 'Error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyClipboard = async () => {
    const pages = getActivePages();
    if (pages.length === 0) return;
    setActionLoading('copy');
    try {
      const activeIdx = isModalOpen ? modalActivePage : studioActivePage;
      const targetPage = activeIdx > 0 && activeIdx <= pages.length ? pages[activeIdx - 1] : pages[0];
      const res = await copyPageToClipboard(targetPage);
      if (res.success) {
        showToast(
          `Foto Nota ${pages.length > 1 ? `(Halaman ${activeIdx || 1}) ` : ''}berhasil disalin ke Clipboard! Siap langsung di-paste (Ctrl+V) ke WhatsApp.`,
          'success'
        );
      } else {
        showToast(`${res.message || 'Browser membatasi clipboard'}. Mengunduh file JPG sebagai gantinya...`, 'warning');
        const filename = `${jenis}_${kodeSiswa || 'siswa'}_${tanggal}`;
        await downloadMultiPageJpg([targetPage], filename);
      }
    } catch (err: any) {
      console.error('Copy Image Error:', err);
      showToast(`Gagal menyalin gambar: ${err?.message || 'Error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrint = () => {
    try {
      executePrint();
    } catch (err: any) {
      console.error('Print Error:', err);
      showToast('Gagal membuka print dialog', 'error');
    }
  };

  return (
    <PinGateDialog>
      <div className="space-y-6 max-w-full pb-16">
        <PageHeader
          title="Cetak Nota & Invoice"
          description="Daftar antrean penerbitan nota siswa, kwitansi pembayaran, dan invoice resmi Amanah Drive"
          breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Cetak Nota' }]}
        />

        {/* Floating Toast Notification */}
        {toast && (
          <div
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 border text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-slate-900 text-emerald-300 border-emerald-500/30'
                : toast.type === 'warning'
                ? 'bg-slate-900 text-amber-300 border-amber-500/30'
                : 'bg-slate-900 text-rose-300 border-rose-500/30'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Tab Navigation Switcher */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('queue')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                viewMode === 'queue'
                  ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                  : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Daftar Siswa Perlu Nota ({studentsNeedingReceipt.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('studio')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                viewMode === 'studio'
                  ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                  : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Studio Cetak Manual / Kustom</span>
            </button>
          </div>

          <div className="text-[11px] text-[var(--text-secondary)] hidden sm:block">
            Ukuran resmi: <strong>Nota = A5 Landscape</strong> • <strong>Invoice = A4 Portrait</strong>
          </div>
        </div>

        {/* Tab Antrean Siswa */}
        {viewMode === 'queue' && (
          <div className="space-y-4">
            {/* Filter, Period & Search Card */}
            <div className="card-container p-4 sm:p-5 space-y-4">
              {/* Row 1: Period Presets & Date Basis */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--border)] pb-3.5">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none flex-wrap">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center gap-1.5 shrink-0 mr-1">
                    <CalendarDays className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    <span>Periode:</span>
                  </span>
                  {PERIOD_OPTIONS.map((opt) => {
                    const isActive = periodFilter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setPeriodFilter(opt.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                          isActive
                            ? 'bg-[var(--brand-primary)] text-white shadow-xs scale-102'
                            : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Basis Tanggal */}
                <div className="flex items-center gap-2 text-xs shrink-0 self-start lg:self-auto">
                  <span className="text-[11px] text-[var(--text-secondary)] font-medium">Acuan Tgl:</span>
                  <select
                    value={dateFieldBasis}
                    onChange={(e: any) => setDateFieldBasis(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--text-primary)]"
                  >
                    <option value="dp_tanggal">Tgl Pembayaran (DP/Lunas)</option>
                    <option value="tanggal_booking">Tgl Pendaftaran (Booking)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Custom Date Range Pickers (If 'custom' selected) */}
              {periodFilter === 'custom' && (
                <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <span className="text-xs font-bold text-[var(--brand-primary)] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Rentang Tanggal Kustom:</span>
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--text-primary)]"
                    />
                    <span className="text-xs text-[var(--text-secondary)] font-bold">s/d</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--text-primary)]"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="text-xs text-rose-600 hover:underline font-bold"
                    >
                      Bersihkan Tanggal
                    </button>
                  )}
                </div>
              )}

              {/* Row 3: Search, Filters & Sorting Controls */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                {/* Search Bar */}
                <div className="md:col-span-4 relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Cari siswa, kode SSxxx, WhatsApp..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 p-0.5"
                      title="Hapus pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="md:col-span-2">
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  >
                    <option value="all">Semua Status (DP & Lunas)</option>
                    <option value="dp">Khusus DP (Uang Muka)</option>
                    <option value="lunas">Khusus Pelunasan (Lunas)</option>
                  </select>
                </div>

                {/* Paket Kursus Filter */}
                <div className="md:col-span-3">
                  <select
                    value={paketFilter}
                    onChange={(e: any) => setPaketFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] truncate"
                  >
                    <option value="all">Semua Paket Kursus</option>
                    {paketList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama_paket}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Dropdown & Reset */}
                <div className="md:col-span-3 flex gap-2">
                  <select
                    value={sortKey}
                    onChange={(e: any) => setSortKey(e.target.value as SortKeyType)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] truncate"
                  >
                    {SORT_OPTIONS.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>

                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="p-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/70 flex items-center justify-center shrink-0 transition-all shadow-xs"
                      title="Reset semua filter ke kondisi awal"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Row 4: Filter Status & Financial Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    Menampilkan <strong>{studentsNeedingReceipt.length}</strong> dari{' '}
                    <strong>{siswaList.filter((s) => s.status_pembayaran_kode === 'dp' || s.status_pembayaran_kode === 'lunas').length}</strong> siswa
                    {periodBounds.label ? (
                      <span className="ml-1 text-[var(--brand-primary)] font-semibold">
                        ({periodBounds.label})
                      </span>
                    ) : null}
                  </span>

                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-xs font-bold text-rose-600 hover:underline inline-flex items-center gap-1 ml-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filter</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
                  <span className="text-[var(--text-secondary)]">
                    Total Uang Masuk:{' '}
                    <strong className="text-emerald-600 font-bold tabular-nums">
                      {formatRupiah(filteredMetrics.totalMasuk)}
                    </strong>
                  </span>
                  <span className="text-gray-300 dark:text-gray-700 hidden sm:inline">•</span>
                  <span className="text-[var(--text-secondary)]">
                    Total Sisa Piutang:{' '}
                    <strong className="text-rose-600 font-bold tabular-nums">
                      {formatRupiah(filteredMetrics.totalSisa)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="card-container p-0 overflow-hidden">
              {loading ? (
                <div className="py-16 flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" />
                  <span>Memuat daftar siswa yang memerlukan nota...</span>
                </div>
              ) : studentsNeedingReceipt.length === 0 ? (
                <div className="py-16 text-center text-xs text-[var(--text-secondary)] space-y-2">
                  <Receipt className="w-10 h-10 text-gray-400 mx-auto" />
                  <p className="font-bold text-sm text-[var(--text-primary)]">Tidak ada antrean nota siswa</p>
                  <p className="text-[11px] max-w-sm mx-auto">
                    {searchQuery
                      ? 'Tidak ada siswa yang cocok dengan kata kunci pencarian.'
                      : 'Seluruh siswa yang telah membayar DP atau Pelunasan akan otomatis tampil pada daftar ini untuk dicetakkan nota.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider font-bold">
                        <th className="py-3 px-4 w-12 text-center">No</th>
                        <th className="py-3 px-4">Kode & Siswa</th>
                        <th className="py-3 px-4">Paket Kursus</th>
                        <th className="py-3 px-4 text-right">Biaya Final</th>
                        <th className="py-3 px-4 text-right">Uang Masuk</th>
                        <th className="py-3 px-4 text-right">Sisa Piutang</th>
                        <th className="py-3 px-4">Status Pembayaran</th>
                        <th className="py-3 px-4 text-center">Aksi Cetak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {studentsNeedingReceipt.map((s, idx) => {
                        const hargaFinal = Number(s.harga_final) || 0;
                        const dpNominal = Number(s.dp_nominal) || 0;
                        const sisa = Math.max(0, hargaFinal - dpNominal);
                        const isLunas = s.status_pembayaran_kode === 'lunas';
                        const pct = hargaFinal > 0 ? Math.round((dpNominal / hargaFinal) * 100) : 0;

                        return (
                          <tr key={s.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                            <td className="py-3 px-4 text-center text-slate-500 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-[var(--text-primary)]">{s.nama}</div>
                              <div className="text-[10.5px] text-[var(--text-secondary)] font-mono">
                                <span className="font-semibold text-[var(--brand-primary)]">{s.kode_siswa}</span> • {s.no_whatsapp || '-'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-[var(--text-primary)]">
                                {s.paket?.nama_paket || 'Paket Kursus'}
                              </div>
                              <div className="text-[10px] text-[var(--text-secondary)]">
                                {s.paket?.jumlah_sesi || 10} Sesi Pertemuan
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-bold tabular-nums text-[var(--text-primary)]">
                              {formatRupiah(hargaFinal)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold tabular-nums text-emerald-600">
                              {formatRupiah(isLunas ? hargaFinal : dpNominal)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold tabular-nums">
                              <span className={sisa <= 0 || isLunas ? 'text-emerald-600' : 'text-rose-600'}>
                                {isLunas || sisa <= 0 ? 'Rp 0 (Lunas)' : formatRupiah(sisa)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {isLunas ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 inline-block">
                                  Lunas (100%)
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-block">
                                    DP {pct}% ({formatRupiah(dpNominal)})
                                  </span>
                                  {s.dp_tanggal && (
                                    <div className="text-[10px] text-[var(--text-secondary)]">
                                      Tgl: {formatDateIndo(s.dp_tanggal)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenCetakNotaModal(s)}
                                className="px-3.5 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs transition-transform active:scale-95"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Cetak Nota</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Studio Cetak */}
        {viewMode === 'studio' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Column: Form Controls */}
            <div className="xl:col-span-5 space-y-5">
              {/* Document Type Selector */}
              <div className="card-container p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  <span>1. Pilih Format & Jenis Dokumen</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {JENIS_DOC_ITEMS.map((item) => {
                    const isSelected = jenis === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleJenisChange(item.value)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] ring-2 ring-[var(--brand-primary)] shadow-xs'
                            : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--brand-primary)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}>
                            {item.label}
                          </span>
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
                            {item.size}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-[var(--text-secondary)] mt-1">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[var(--border)]">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                      No. Dokumen
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={nomorDokumen}
                        onChange={(e) => setNomorDokumen(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-mono font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setNomorDokumen(generateNomorDokumen(jenis))}
                        className="p-1.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] shrink-0 flex items-center justify-center"
                        title="Acak nomor baru"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                      Tanggal Dokumen
                    </label>
                    <input
                      type="date"
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Data Siswa Form */}
              <div className="card-container p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>2. Identitas Siswa & Kursus</span>
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                      Nama Siswa *
                    </label>
                    <input
                      type="text"
                      value={namaSiswa}
                      onChange={(e) => setNamaSiswa(e.target.value)}
                      placeholder="Nama lengkap siswa"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                        Kode Siswa
                      </label>
                      <input
                        type="text"
                        value={kodeSiswa}
                        onChange={(e) => setKodeSiswa(e.target.value)}
                        placeholder="SS001"
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-mono font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                        No. WhatsApp
                      </label>
                      <input
                        type="text"
                        value={noWhatsapp}
                        onChange={(e) => setNoWhatsapp(e.target.value)}
                        placeholder="0812-xxxx"
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                      Nama Paket Kursus
                    </label>
                    <input
                      type="text"
                      value={namaPaket}
                      onChange={(e) => setNamaPaket(e.target.value)}
                      placeholder="Paket Kursus Mengemudi"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Rincian Biaya Form */}
              <div className="card-container p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>3. Rincian Nominal Pembayaran</span>
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <CurrencyInput
                      label="Harga Paket (Rp) *"
                      value={hargaPaket}
                      onChange={(val) => setHargaPaket(val)}
                    />
                  </div>
                  <div>
                    <CurrencyInput
                      label="DP Terdahulu (Rp)"
                      value={dpTerbayar}
                      onChange={(val) => setDpTerbayar(val)}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border-2 border-[var(--brand-primary)]">
                  <CurrencyInput
                    label="Nominal Bayar Saat Ini (Rp) *"
                    value={nominalBayarIni}
                    onChange={(val) => setNominalBayarIni(val)}
                  />
                </div>

                {/* Method & Bank */}
                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                  <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)]">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setMetodePembayaran('tunai')}
                      className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                        metodePembayaran === 'tunai'
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] shadow-xs'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Tunai</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodePembayaran('transfer')}
                      className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                        metodePembayaran === 'transfer'
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] shadow-xs'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Transfer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodePembayaran('qris')}
                      className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                        metodePembayaran === 'qris'
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] shadow-xs'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QRIS</span>
                    </button>
                  </div>

                  {metodePembayaran === 'transfer' && (
                    <select
                      value={namaBank}
                      onChange={(e) => setNamaBank(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--text-primary)] mt-1"
                    >
                      <option value="">{LABEL_REKENING_DEFAULT}</option>
                      {rekeningList
                        .filter((r) => r.aktif)
                        .map((r) => (
                          <option
                            key={r.id}
                            value={`${r.nama_bank} (${r.nomor_rekening} a.n ${r.atas_nama})`}
                          >
                            {r.nama_bank} - {r.nomor_rekening} (a.n {r.atas_nama})
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Custom Items Builder for Multi-Item / Extra Fees */}
              <div className="card-container p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>4. Tambahan Item / Rincian Kustom ({customItems.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomItems([
                        ...customItems,
                        {
                          no: customItems.length + 1,
                          uraian: `Layanan Tambahan #${customItems.length + 1}`,
                          qty: '1',
                          nominal: 250000,
                        },
                      ]);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-xs font-bold hover:bg-[var(--brand-primary)] hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                {customItems.length === 0 ? (
                  <p className="text-[11px] text-[var(--text-secondary)] italic">
                    Secara default, rincian nota memuat paket pelatihan utama. Tambahkan baris di sini jika ingin membuat nota multi-item (misal: Sesi Tambahan, Biaya SIM, dll) atau menguji pemisahan multi-halaman.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {customItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[10px] text-slate-500">#{idx + 1}</span>
                          <input
                            type="text"
                            value={item.uraian}
                            onChange={(e) => {
                              const updated = [...customItems];
                              updated[idx].uraian = e.target.value;
                              setCustomItems(updated);
                            }}
                            placeholder="Deskripsi layanan / biaya"
                            className="flex-1 px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => setCustomItems(customItems.filter((_, i) => i !== idx))}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={item.qty}
                            onChange={(e) => {
                              const updated = [...customItems];
                              updated[idx].qty = e.target.value;
                              setCustomItems(updated);
                            }}
                            placeholder="Qty (cth: 1 Sesi)"
                            className="px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs"
                          />
                          <CurrencyInput
                            value={item.nominal}
                            onChange={(val) => {
                              const updated = [...customItems];
                              updated[idx].nominal = val;
                              setCustomItems(updated);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCustomItems([])}
                      className="text-[10px] text-rose-600 hover:underline font-bold"
                    >
                      Reset ke Paket Default
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Studio Preview */}
            <div className="xl:col-span-7 space-y-4">
              <div className="card-container p-4 flex flex-wrap items-center justify-between gap-3 sticky top-4 z-30 bg-[var(--bg-elevated)] shadow-md">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[var(--text-primary)]">{docInfo.title}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary)]">
                    {docInfo.paperSize}
                  </span>

                  {/* Multi-Page Indicator & Switcher */}
                  {studioTotalPages > 1 && (
                    <div className="flex items-center gap-1 bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)] text-xs">
                      <Layers className="w-3.5 h-3.5 text-[var(--brand-primary)] ml-1" />
                      <button
                        type="button"
                        onClick={() => setStudioActivePage(0)}
                        className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all ${
                          studioActivePage === 0
                            ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Semua ({studioTotalPages})
                      </button>
                      {Array.from({ length: studioTotalPages }).map((_, i) => (
                        <button
                          key={i + 1}
                          type="button"
                          onClick={() => setStudioActivePage(i + 1)}
                          className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all ${
                            studioActivePage === i + 1
                              ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          Hal {i + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)] text-xs">
                    <button
                      type="button"
                      onClick={() => setStudioZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}
                      className="p-1 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      title="Perkecil"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10.5px] font-mono font-bold w-10 text-center text-[var(--text-primary)]">
                      {Math.round(studioZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setStudioZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(1))))}
                      className="p-1 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      title="Perbesar"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    {studioZoom !== 1 && (
                      <button
                        type="button"
                        onClick={() => setStudioZoom(1)}
                        className="text-[9px] text-[var(--brand-primary)] font-bold px-1 hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadJpg}
                    disabled={actionLoading !== null}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'jpg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    <span>JPG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={actionLoading !== null}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyClipboard}
                    disabled={actionLoading !== null}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'copy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Foto WA</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-1.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak / Print</span>
                  </button>
                </div>
              </div>

              {/* Document Paper Preview */}
              <div className="p-4 sm:p-6 rounded-3xl bg-slate-200/80 dark:bg-slate-900/60 border border-[var(--border)] overflow-x-auto flex justify-center items-start shadow-inner min-h-[500px]">
                <NotaDocumentPaper
                  documentPaperRef={documentPaperRef}
                  notaData={currentNotaData}
                  logoBase64={logoBase64}
                  stampBase64={stampBase64}
                  zoomScale={studioZoom}
                  activePageIndex={studioActivePage > 0 ? studioActivePage : undefined}
                  onTotalPagesChange={setStudioTotalPages}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Cetak Nota */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-fadeIn overflow-y-auto">
            <div className="w-full max-w-4xl bg-[var(--bg)] border border-[var(--border)] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto">
              {/* Modal Top Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      Cetak Nota / Invoice — {namaSiswa}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                      {kodeSiswa} • {docInfo.title} ({docInfo.paperSize})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl border border-[var(--border)] text-gray-400 hover:text-gray-600 hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Toolbar: Format Selector & Settings */}
              <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)]">Format:</span>
                    {JENIS_DOC_ITEMS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleJenisChange(item.value)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                          jenis === item.value
                            ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                            : 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {item.label} ({item.size.split(' ')[0]})
                      </button>
                    ))}
                  </div>

                  {/* Modal Multi-Page Indicator & Switcher */}
                  {modalTotalPages > 1 && (
                    <div className="flex items-center gap-1 bg-[var(--bg)] p-1 rounded-xl border border-[var(--border)] text-xs">
                      <Layers className="w-3.5 h-3.5 text-[var(--brand-primary)] ml-1" />
                      <button
                        type="button"
                        onClick={() => setModalActivePage(0)}
                        className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all ${
                          modalActivePage === 0
                            ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Semua ({modalTotalPages})
                      </button>
                      {Array.from({ length: modalTotalPages }).map((_, i) => (
                        <button
                          key={i + 1}
                          type="button"
                          onClick={() => setModalActivePage(i + 1)}
                          className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition-all ${
                            modalActivePage === i + 1
                              ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          Hal {i + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold">
                    <input
                      type="checkbox"
                      checked={showStempel}
                      onChange={(e) => setShowStempel(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[var(--brand-primary)]"
                    />
                    <span>Cap Stempel</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setViewMode('studio');
                    }}
                    className="text-[11px] text-[var(--brand-primary)] hover:underline font-semibold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Edit di Studio</span>
                  </button>
                </div>
              </div>

              {/* Modal Body: Live Scrollable Preview */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-200/80 dark:bg-slate-900/60 flex justify-center items-start">
                <div className="shadow-2xl">
                  <NotaDocumentPaper
                    documentPaperRef={modalPaperRef}
                    notaData={currentNotaData}
                    logoBase64={logoBase64}
                    stampBase64={stampBase64}
                    activePageIndex={modalActivePage > 0 ? modalActivePage : undefined}
                    onTotalPagesChange={setModalTotalPages}
                  />
                </div>
              </div>

              {/* Modal Bottom Action Bar */}
              <div className="px-5 py-3.5 border-t border-[var(--border)] bg-[var(--bg-elevated)] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Pilih salah satu opsi ekspor di samping:
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* 1. Download JPG */}
                  <button
                    type="button"
                    onClick={handleDownloadJpg}
                    disabled={actionLoading !== null}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'jpg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    <span>Download JPG</span>
                  </button>

                  {/* 2. Download PDF */}
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={actionLoading !== null}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                    <span>Download PDF</span>
                  </button>

                  {/* 3. Copy Photo to Clipboard (WA ready) */}
                  <button
                    type="button"
                    onClick={handleCopyClipboard}
                    disabled={actionLoading !== null}
                    className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'copy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Foto (WA)</span>
                  </button>

                  {/* 4. Direct Print */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Nota</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PinGateDialog>
  );
}
