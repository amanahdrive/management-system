'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Siswa, Paket, RekeningBank } from '@/types/database';
import { getSiswaList } from '@/lib/actions/siswa';
import { getPaketList } from '@/lib/actions/master-data';
import { getRekeningList } from '@/lib/actions/rekening';
import { formatRupiah } from '@/lib/utils/currency';
import { getTodayDateString, formatDateIndo } from '@/lib/utils/date';
import { NotaDocumentPaper } from '@/components/shared/NotaDocumentPaper';
import {
  NotaJenis,
  NotaData,
  getJenisInfo,
  generateNomorDokumen,
  printDocument,
  downloadDocumentAsJpg,
  downloadDocumentAsPdf,
  copyDocumentToClipboard,
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
} from 'lucide-react';

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
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc'); // Default ASC: terlama ke terbaru

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

  // Students needing receipt queue (sorted from oldest to newest by default)
  const studentsNeedingReceipt = React.useMemo(() => {
    let list = siswaList.filter(
      (s) => s.status_pembayaran_kode === 'dp' || s.status_pembayaran_kode === 'lunas'
    );

    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status_pembayaran_kode === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.nama.toLowerCase().includes(q) ||
          (s.kode_siswa || '').toLowerCase().includes(q) ||
          (s.no_whatsapp || '').includes(q)
      );
    }

    return list.sort((a, b) => {
      const dateA = a.dp_tanggal || a.created_at || '';
      const dateB = b.dp_tanggal || b.created_at || '';
      return sortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    });
  }, [siswaList, statusFilter, searchQuery, sortOrder]);

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
  };

  const docInfo = getJenisInfo(jenis);
  const isA4 = docInfo.isA4;

  // ─── 4 Output Export Handlers ───
  const getActiveRef = () => (isModalOpen ? modalPaperRef.current : documentPaperRef.current);

  const handleDownloadJpg = async () => {
    const el = getActiveRef();
    if (!el) return;
    setActionLoading('jpg');
    try {
      const filename = `${jenis}_${kodeSiswa || 'siswa'}_${tanggal}`;
      await downloadDocumentAsJpg(el, filename);
      showToast('✅ Berhasil mendownload gambar Nota (JPG)!', 'success');
    } catch (err: any) {
      console.error('Download JPG Error:', err);
      showToast(`❌ Gagal download JPG: ${err?.message || 'Error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPdf = async () => {
    const el = getActiveRef();
    if (!el) return;
    setActionLoading('pdf');
    try {
      const filename = `${jenis}_${kodeSiswa || 'siswa'}_${tanggal}`;
      await downloadDocumentAsPdf(el, filename, isA4);
      showToast('✅ Berhasil mendownload dokumen Nota (PDF)!', 'success');
    } catch (err: any) {
      console.error('Download PDF Error:', err);
      showToast(`❌ Gagal download PDF: ${err?.message || 'Error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyClipboard = async () => {
    const el = getActiveRef();
    if (!el) return;
    setActionLoading('copy');
    try {
      const res = await copyDocumentToClipboard(el);
      if (res.success) {
        showToast('✅ Foto Nota berhasil disalin ke Clipboard! Siap langsung di-paste (Ctrl+V) ke WhatsApp.', 'success');
      } else {
        showToast(`⚠️ ${res.message || 'Browser membatasi clipboard'}. Mengunduh file JPG sebagai gantinya...`, 'warning');
        const filename = `${jenis}_${kodeSiswa || 'siswa'}_${tanggal}`;
        await downloadDocumentAsJpg(el, filename);
      }
    } catch (err: any) {
      console.error('Copy Image Error:', err);
      showToast(`❌ Gagal menyalin gambar: ${err?.message || 'Error'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrint = () => {
    try {
      printDocument(currentNotaData);
    } catch (err: any) {
      console.error('Print Error:', err);
      showToast('❌ Gagal membuka print dialog', 'error');
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
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
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

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── TAB 1: ANTREAN SISWA PERLU NOTA (DEFAULT USER WORKFLOW) ── */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {viewMode === 'queue' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="card-container p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Cari nama, kode siswa, atau no WhatsApp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[var(--text-secondary)] font-medium">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--text-primary)]"
                  >
                    <option value="all">Semua Siswa Terbayar (DP & Lunas)</option>
                    <option value="dp">Khusus DP (Uang Muka)</option>
                    <option value="lunas">Khusus Siswa Pelunasan (Lunas)</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] flex items-center gap-1.5"
                  title="Klik untuk mengubah urutan"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                  <span>{sortOrder === 'asc' ? 'Terlama ke Terbaru' : 'Terbaru ke Terlama'}</span>
                </button>
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

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── TAB 2: STUDIO CETAK MANUAL / KUSTOM ── */}
        {/* ═══════════════════════════════════════════════════════════ */}
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
                        className="p-1.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)] shrink-0"
                        title="Acak nomor baru"
                      >
                        ↻
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
                    label="★ Nominal Bayar Saat Ini (Rp) *"
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
            </div>

            {/* Right Column: Live Studio Preview */}
            <div className="xl:col-span-7 space-y-4">
              <div className="card-container p-4 flex flex-wrap items-center justify-between gap-3 sticky top-4 z-30 bg-[var(--bg-elevated)] shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)]">{docInfo.title}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary)]">
                    {docInfo.paperSize}
                  </span>
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
                />
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ── MODAL POP-UP CETAK NOTA (DIRECT 1-CLICK POPUP) ── */}
        {/* ═══════════════════════════════════════════════════════════ */}
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
