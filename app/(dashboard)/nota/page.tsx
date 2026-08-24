'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Siswa, Paket } from '@/types/database';
import { getSiswaList } from '@/lib/actions/siswa';
import { getPaketList } from '@/lib/actions/master-data';
import { formatRupiah, terbilangRupiah } from '@/lib/utils/currency';
import { getTodayDateString, formatDateLongIndo } from '@/lib/utils/date';
import {
  NotaJenis,
  NotaData,
  COMPANY_INFO,
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
  ChevronDown,
  User,
  CheckCircle2,
  Loader2,
  RefreshCw,
  FileDown,
  Info,
  CreditCard,
  Banknote,
  QrCode,
  Stamp,
  ZoomIn,
  ZoomOut,
  Maximize2,
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
    desc: 'Pelunasan Sisa Biaya',
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
    desc: 'Rincian Tagihan Piutang',
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
  const [loading, setLoading] = React.useState(true);

  // Base64 Images for 100% bulletproof html2canvas capture (no CORS, no tainting)
  const [logoBase64, setLogoBase64] = React.useState<string>('/assets/logo-amdri-landscape.png');
  const [stampBase64, setStampBase64] = React.useState<string>('/assets/cap-amanah.png');

  // Form Mode: 'db' | 'manual'
  const [inputMode, setInputMode] = React.useState<'db' | 'manual'>('db');
  const [selectedSiswaId, setSelectedSiswaId] = React.useState<string>('');

  // Form State
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
  const [namaBank, setNamaBank] = React.useState('BCA');
  const [catatanPembayaran, setCatatanPembayaran] = React.useState('Pembayaran Uang Muka (DP) 50% Pelatihan Mengemudi');

  // Otorisasi
  const [kota, setKota] = React.useState('Palembang');
  const [picNama, setPicNama] = React.useState('Admin Amanah Drive');
  const [picJabatan, setPicJabatan] = React.useState('Petugas Administrasi');
  const [showStempel, setShowStempel] = React.useState(true);

  // Preview & Action States
  const [zoomScale, setZoomScale] = React.useState<number>(1);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Ref to the rendered document paper for html2canvas
  const documentPaperRef = React.useRef<HTMLDivElement>(null);

  // Load Initial Data and preload images to Base64
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const [sList, pList] = await Promise.all([getSiswaList(), getPaketList()]);
      setSiswaList(sList);
      setPaketList(pList);
      setLoading(false);
    })();

    // Convert local asset images to Base64 Data URL to guarantee html2canvas never encounters CORS or tainting
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

  // Show Toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Calculations
  const totalTagihanBersih = Math.max(0, hargaPaket - diskonNominal);
  const totalBayarAkumulasi = dpTerbayar + nominalBayarIni;
  const sisaPiutang = Math.max(0, totalTagihanBersih - totalBayarAkumulasi);

  // Auto-fill when Siswa is selected from Dropdown
  const handleSelectSiswa = (siswaId: string) => {
    setSelectedSiswaId(siswaId);
    const s = siswaList.find((item) => item.id === siswaId);
    if (!s) return;

    setNamaSiswa(s.nama || '');
    setKodeSiswa(s.kode_siswa || '');
    setNoWhatsapp(s.no_whatsapp || '');
    setAlamatSiswa(s.alamat || '');

    const p = s.paket || paketList.find((pkt) => pkt.id === s.paket_id);
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

    setHargaPaket(s.harga_final || p?.harga_normal || 0);
    setDiskonNominal(0);
    const dp = s.dp_nominal || 0;
    setDpTerbayar(dp);

    // Contextual payment nominal recommendation
    if (jenis === 'nota_dp') {
      const suggestedDp = dp > 0 ? dp : Math.round((s.harga_final || 2000000) * 0.5);
      setNominalBayarIni(suggestedDp);
      setCatatanPembayaran(`Pembayaran DP Kursus Mengemudi - ${s.nama}`);
    } else if (jenis === 'nota_pelunasan') {
      const sisa = Math.max(0, (s.harga_final || 0) - dp);
      setNominalBayarIni(sisa);
      setCatatanPembayaran(`Pelunasan Biaya Kursus Mengemudi - ${s.nama}`);
    } else if (jenis === 'nota_tagihan' || jenis === 'invoice_tagihan') {
      setNominalBayarIni(0);
      setCatatanPembayaran(`Tagihan Biaya Pelatihan Kursus Mengemudi - ${s.nama}`);
    } else {
      setNominalBayarIni(dp > 0 ? dp : 500000);
      setCatatanPembayaran(`Pembayaran Kursus Mengemudi - ${s.nama}`);
    }
  };

  // Change Jenis Dokumen
  const handleJenisChange = (newJenis: NotaJenis) => {
    setJenis(newJenis);
    setNomorDokumen(generateNomorDokumen(newJenis));

    if (newJenis === 'nota_dp') {
      const suggestedDp = dpTerbayar > 0 ? dpTerbayar : Math.round(totalTagihanBersih * 0.5);
      setNominalBayarIni(suggestedDp);
      setCatatanPembayaran(`Pembayaran Uang Muka (DP) Pelatihan Mengemudi - ${namaSiswa}`);
    } else if (newJenis === 'nota_pelunasan') {
      const sisa = Math.max(0, totalTagihanBersih - dpTerbayar);
      setNominalBayarIni(sisa);
      setCatatanPembayaran(`Pelunasan Biaya Kursus Mengemudi - ${namaSiswa}`);
    } else if (newJenis === 'nota_tagihan' || newJenis === 'invoice_tagihan') {
      setNominalBayarIni(0);
      setCatatanPembayaran(`Tagihan Resmi Kursus Mengemudi - ${namaSiswa}`);
    } else {
      setNominalBayarIni(1000000);
      setCatatanPembayaran(`Pembayaran Kursus Mengemudi - ${namaSiswa}`);
    }
  };

  // Current NotaData snapshot
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

  // ─── 4 Output Action Handlers with Robust Error Handling ───

  const handleDownloadJpg = async () => {
    if (!documentPaperRef.current) return;
    setActionLoading('jpg');
    try {
      const filename = `${jenis}_${kodeSiswa || 'siswa'}_${tanggal}`;
      await downloadDocumentAsJpg(documentPaperRef.current, filename);
      showToast('✅ Berhasil mendownload gambar Nota (JPG)!', 'success');
    } catch (err: any) {
      console.error('Download JPG Error:', err);
      showToast(`❌ Gagal download JPG: ${err?.message || 'Terjadi kesalahan sistem'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!documentPaperRef.current) return;
    setActionLoading('pdf');
    try {
      const filename = `${jenis}_${kodeSiswa || 'siswa'}_${tanggal}`;
      await downloadDocumentAsPdf(documentPaperRef.current, filename, isA4);
      showToast('✅ Berhasil mendownload dokumen Nota (PDF)!', 'success');
    } catch (err: any) {
      console.error('Download PDF Error:', err);
      showToast(`❌ Gagal download PDF: ${err?.message || 'Terjadi kesalahan sistem'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyClipboard = async () => {
    if (!documentPaperRef.current) return;
    setActionLoading('copy');
    try {
      const res = await copyDocumentToClipboard(documentPaperRef.current);
      if (res.success) {
        showToast('✅ Gambar Nota disalin ke Clipboard! Siap dipaste (Ctrl+V) langsung ke WhatsApp.', 'success');
      } else {
        showToast(`⚠️ ${res.message || 'Browser membatasi clipboard'}. Mengunduh file JPG sebagai gantinya...`, 'warning');
        // Auto fallback to download JPG so user gets the image regardless
        const filename = `${jenis}_${kodeSiswa || 'siswa'}_${tanggal}`;
        await downloadDocumentAsJpg(documentPaperRef.current, filename);
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

  // Status Badge Helper
  const statusBadge =
    sisaPiutang <= 0
      ? { text: 'LUNAS', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300' }
      : dpTerbayar > 0 || nominalBayarIni > 0
      ? { text: 'BELUM LUNAS (DP)', bg: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300' }
      : { text: 'BELUM BAYAR', bg: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300' };

  return (
    <PinGateDialog>
      <div className="space-y-6 max-w-full pb-16">
        <PageHeader
          title="Cetak Nota & Invoice"
          description="Pembuatan dan pencetakan nota pembayaran, tagihan, dan invoice resmi Amanah Drive"
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

        {/* Top Disclaimer Banner */}
        <div className="p-3.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 text-xs flex items-start gap-3">
          <Info className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-0.5" />
          <div className="text-slate-700 dark:text-slate-300 space-y-0.5">
            <p className="font-bold text-[var(--brand-primary)]">Fitur Pembuatan & Cetak Dokumen Mandiri</p>
            <p className="text-[11px]">
              Dokumen yang dicetak pada halaman ini <strong>tidak otomatis masuk ke pencatatan kas</strong> untuk mencegah data ganda. Seluruh pencatatan arus kas resmi dilakukan manual melalui menu <strong>Kas & Keuangan</strong>.
            </p>
          </div>
        </div>

        {/* Main 2-Column Studio Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* ══════════════════════════════════════════════════ */}
          {/* ── LEFT COLUMN: Document Settings & Inputs (5 Cols) ── */}
          {/* ══════════════════════════════════════════════════ */}
          <div className="xl:col-span-5 space-y-5">
            {/* 1. Document Type Selector */}
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
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] ring-2 ring-[var(--brand-primary)] shadow-sm'
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

              {/* Document Meta Row */}
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
                      title="Generate nomor acak baru"
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
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 2. Siswa Information */}
            <div className="card-container p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>2. Identitas Siswa / Penyetor</span>
                </h3>

                {/* Toggle Input Mode */}
                <div className="flex rounded-xl p-0.5 bg-[var(--bg-subtle)] border border-[var(--border)] text-[10px]">
                  <button
                    type="button"
                    onClick={() => setInputMode('db')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      inputMode === 'db'
                        ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Dari Database
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('manual')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      inputMode === 'manual'
                        ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Ketik Manual
                  </button>
                </div>
              </div>

              {/* Database Selector Dropdown */}
              {inputMode === 'db' && (
                <div className="space-y-2">
                  <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)]">
                    Pilih Siswa dari Data Tersimpan *
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSiswaId}
                      onChange={(e) => handleSelectSiswa(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs appearance-none pr-8 font-semibold"
                    >
                      <option value="">-- Cari / Pilih Siswa --</option>
                      {siswaList.map((s) => {
                        const statusLabel =
                          s.status_pembayaran_kode === 'lunas'
                            ? 'LUNAS'
                            : s.status_pembayaran_kode === 'dp'
                            ? `DP (${formatRupiah(s.dp_nominal || 0)})`
                            : 'BELUM BAYAR';
                        return (
                          <option key={s.id} value={s.id}>
                            {s.kode_siswa} — {s.nama} [{statusLabel} • {formatRupiah(s.harga_final)}]
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-secondary)]" />
                  </div>
                </div>
              )}

              {/* Editable Fields */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    value={namaSiswa}
                    onChange={(e) => setNamaSiswa(e.target.value)}
                    placeholder="Nama siswa"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                    Kode / ID Siswa
                  </label>
                  <input
                    type="text"
                    value={kodeSiswa}
                    onChange={(e) => setKodeSiswa(e.target.value)}
                    placeholder="SS001"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                    No. WhatsApp / HP
                  </label>
                  <input
                    type="text"
                    value={noWhatsapp}
                    onChange={(e) => setNoWhatsapp(e.target.value)}
                    placeholder="08xx-xxxx-xxxx"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                    Alamat Domisili
                  </label>
                  <input
                    type="text"
                    value={alamatSiswa}
                    onChange={(e) => setAlamatSiswa(e.target.value)}
                    placeholder="Alamat Palembang"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 3. Paket & Financial Breakdown */}
            <div className="card-container p-5 space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>3. Rincian Paket & Pembayaran</span>
              </h3>

              {/* Paket Selector / Input */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                    Nama Paket Kursus *
                  </label>
                  <input
                    type="text"
                    value={namaPaket}
                    onChange={(e) => setNamaPaket(e.target.value)}
                    placeholder="Paket Silver 10 Sesi"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                    Jumlah Sesi
                  </label>
                  <input
                    type="number"
                    value={jumlahSesi}
                    onChange={(e) => setJumlahSesi(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-bold"
                  />
                </div>
              </div>

              {/* Financial Inputs */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <CurrencyInput
                    label="Harga Normal Paket (Rp) *"
                    value={hargaPaket}
                    onChange={(val) => setHargaPaket(val)}
                  />
                </div>

                <div>
                  <CurrencyInput
                    label="Potongan Diskon Promo (Rp)"
                    value={diskonNominal}
                    onChange={(val) => setDiskonNominal(val)}
                  />
                </div>

                <div>
                  <CurrencyInput
                    label="Pembayaran Terdahulu / DP (Rp)"
                    value={dpTerbayar}
                    onChange={(val) => setDpTerbayar(val)}
                  />
                </div>

                <div className="p-2.5 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border-2 border-[var(--brand-primary)]">
                  <CurrencyInput
                    label="★ Nominal Bayar Saat Ini (Rp) *"
                    value={nominalBayarIni}
                    onChange={(val) => setNominalBayarIni(val)}
                  />
                </div>
              </div>

              {/* Live Financial Balance Preview */}
              <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block">Tagihan Bersih</span>
                  <span className="font-bold text-[var(--text-primary)]">{formatRupiah(totalTagihanBersih)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block">Total Bayar Masuk</span>
                  <span className="font-bold text-emerald-600">{formatRupiah(totalBayarAkumulasi)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block">Sisa Piutang</span>
                  <span className={`font-extrabold ${sisaPiutang <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {sisaPiutang <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(sisaPiutang)}
                  </span>
                </div>
              </div>

              {/* Payment Method & Bank */}
              <div className="space-y-2 pt-1 border-t border-[var(--border)]">
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
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                      Nama Bank Tujuan
                    </label>
                    <input
                      type="text"
                      value={namaBank}
                      onChange={(e) => setNamaBank(e.target.value)}
                      placeholder="Bank BCA / Mandiri / BRI / BSI"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                    Catatan / Keperluan Pembayaran
                  </label>
                  <input
                    type="text"
                    value={catatanPembayaran}
                    onChange={(e) => setCatatanPembayaran(e.target.value)}
                    placeholder="Keterangan pembayaran"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs"
                  />
                </div>
              </div>
            </div>

            {/* 4. Authorization & Signatures */}
            <div className="card-container p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] flex items-center gap-2">
                <Stamp className="w-4 h-4" />
                <span>4. Lokasi & Tanda Tangan Kasir</span>
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                    Kota Tempat Cetak
                  </label>
                  <input
                    type="text"
                    value={kota}
                    onChange={(e) => setKota(e.target.value)}
                    placeholder="Palembang"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                    Nama Petugas / Kasir
                  </label>
                  <input
                    type="text"
                    value={picNama}
                    onChange={(e) => setPicNama(e.target.value)}
                    placeholder="Admin Amanah Drive"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-semibold text-[var(--text-secondary)] mb-1">
                    Jabatan Penandatangan
                  </label>
                  <input
                    type="text"
                    value={picJabatan}
                    onChange={(e) => setPicJabatan(e.target.value)}
                    placeholder="Petugas Administrasi"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={showStempel}
                      onChange={(e) => setShowStempel(e.target.checked)}
                      className="w-4 h-4 rounded text-[var(--brand-primary)]"
                    />
                    <span>Sertakan Cap / Stempel Perusahaan</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════ */}
          {/* ── RIGHT COLUMN: Live Interactive Document Studio (7 Cols) ── */}
          {/* ══════════════════════════════════════════════════ */}
          <div className="xl:col-span-7 space-y-4">
            {/* Top Studio Toolbar */}
            <div className="card-container p-4 flex flex-wrap items-center justify-between gap-3 sticky top-4 z-30 bg-[var(--bg-elevated)] shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)]">{docInfo.title}</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary)]">
                  {docInfo.paperSize}
                </span>
              </div>

              {/* Action Buttons Group */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadJpg}
                  disabled={actionLoading !== null}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  title="Download gambar nota berkualitas tinggi"
                >
                  {actionLoading === 'jpg' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  <span>JPG</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={actionLoading !== null}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  title="Download format PDF presisi cetak"
                >
                  {actionLoading === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                  <span>PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  disabled={actionLoading !== null}
                  className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                  title="Salin foto untuk langsung dipaste ke WhatsApp"
                >
                  {actionLoading === 'copy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy Foto WA</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={actionLoading !== null}
                  className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50"
                  title="Cetak langsung menggunakan printer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Print</span>
                </button>
              </div>
            </div>

            {/* Document Paper Canvas Container */}
            <div className="p-4 sm:p-6 rounded-3xl bg-slate-200/80 dark:bg-slate-900/60 border border-[var(--border)] overflow-x-auto flex justify-center items-start shadow-inner min-h-[500px]">
              {/* Actual Physical Paper Component */}
              <div
                ref={documentPaperRef}
                style={{
                  width: '760px',
                  minHeight: isA4 ? '1075px' : '530px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  fontFamily: "'Inter', sans-serif",
                }}
                className="p-7 rounded-lg shadow-2xl border border-slate-300 flex flex-col justify-between select-text shrink-0 text-slate-900 transition-all"
              >
                {/* ── 1. KOP SURAT BISNIS RESMI ── */}
                <div>
                  <div className="flex items-center justify-between pb-3">
                    <div className="w-48 h-12 flex items-center">
                      <img
                        src={logoBase64}
                        alt="Logo Amanah Drive"
                        crossOrigin="anonymous"
                        style={{ width: '185px', height: 'auto', maxHeight: '48px', objectFit: 'contain' }}
                      />
                    </div>
                    <div className="text-right max-w-sm">
                      <h1 className="text-base font-black tracking-tight text-[#0F7A73]">
                        {COMPANY_INFO.name}
                      </h1>
                      <p className="text-[9px] font-bold text-[#0c4a45] uppercase tracking-wider">
                        {COMPANY_INFO.tagline}
                      </p>
                      <p className="text-[8.5px] text-slate-600 leading-tight mt-0.5">
                        {COMPANY_INFO.address}
                      </p>
                      <p className="text-[9px] font-bold text-[#0F7A73] mt-0.5">
                        Telp/WA: {COMPANY_INFO.phone} • Email: {COMPANY_INFO.email}
                      </p>
                    </div>
                  </div>

                  {/* Double Line Divider */}
                  <div className="h-[3px] bg-[#0F7A73] rounded-full" />
                  <div className="h-[1px] bg-[#0F7A73]/40 mt-[2px] mb-3" />

                  {/* ── 2. TITLE BANNER & NO DOKUMEN ── */}
                  <div className="flex items-center justify-between bg-teal-50/80 border border-teal-200 px-3.5 py-2 rounded-lg mb-3">
                    <div className="text-xs font-black tracking-wide text-[#0F7A73] uppercase">
                      {docInfo.title}
                    </div>
                    <div className="text-right text-[10px] text-slate-700">
                      <div>No: <strong className="font-mono text-slate-900">{nomorDokumen}</strong></div>
                      <div>Tanggal: <strong>{formatDateLongIndo(tanggal)}</strong></div>
                    </div>
                  </div>

                  {/* ── 3. IDENTITAS SISWA & INFO KURSUS GRID ── */}
                  <div className="grid grid-cols-2 gap-3 mb-3 text-[10px]">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <div className="text-[8.5px] font-black uppercase tracking-wider text-[#0F7A73] border-b border-slate-200 pb-1 mb-1">
                        Penerima Tagihan / Siswa
                      </div>
                      <div className="flex"><span className="w-24 text-slate-500">Nama Siswa</span><span className="w-3 text-center">:</span><span className="font-bold text-slate-900">{namaSiswa || '-'}</span></div>
                      <div className="flex"><span className="w-24 text-slate-500">Kode Siswa</span><span className="w-3 text-center">:</span><span className="font-mono font-bold text-slate-900">{kodeSiswa || '-'}</span></div>
                      <div className="flex"><span className="w-24 text-slate-500">No. WhatsApp</span><span className="w-3 text-center">:</span><span className="font-medium text-slate-800">{noWhatsapp || '-'}</span></div>
                      {alamatSiswa && (
                        <div className="flex"><span className="w-24 text-slate-500">Alamat</span><span className="w-3 text-center">:</span><span className="text-slate-800 truncate">{alamatSiswa}</span></div>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <div className="text-[8.5px] font-black uppercase tracking-wider text-[#0F7A73] border-b border-slate-200 pb-1 mb-1">
                        Rincian Paket & Pelatihan
                      </div>
                      <div className="flex"><span className="w-24 text-slate-500">Paket Kursus</span><span className="w-3 text-center">:</span><span className="font-bold text-slate-900">{namaPaket || '-'}</span></div>
                      <div className="flex"><span className="w-24 text-slate-500">Durasi / Sesi</span><span className="w-3 text-center">:</span><span className="font-semibold text-slate-800">{jumlahSesi} Sesi Pertemuan</span></div>
                      <div className="flex"><span className="w-24 text-slate-500">Transmisi Mobil</span><span className="w-3 text-center">:</span><span className="font-semibold text-slate-800">{tipeMobil || 'Manual'}</span></div>
                      <div className="flex"><span className="w-24 text-slate-500">Metode Bayar</span><span className="w-3 text-center">:</span><span className="font-semibold text-slate-900">{metodePembayaran === 'tunai' ? 'Tunai (Kas Fisik)' : metodePembayaran === 'transfer' ? `Transfer Bank ${namaBank}` : 'QRIS'}</span></div>
                    </div>
                  </div>

                  {/* ── 4. TABEL DETAIL TRANSAKSI ── */}
                  <table className="w-full border-collapse border border-slate-200 text-[10px] mb-3">
                    <thead>
                      <tr className="bg-[#0F7A73] text-white">
                        <th className="py-1.5 px-2 text-center w-10 font-bold border border-[#0F7A73]">No</th>
                        <th className="py-1.5 px-3 text-left font-bold border border-[#0F7A73]">Uraian / Deskripsi Rincian</th>
                        <th className="py-1.5 px-2 text-center w-16 font-bold border border-[#0F7A73]">Qty</th>
                        <th className="py-1.5 px-3 text-right w-44 font-bold border border-[#0F7A73]">Nominal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 px-2 text-center font-bold text-slate-600">1</td>
                        <td className="py-1.5 px-3">
                          <strong className="text-slate-900">{namaPaket}</strong> ({jumlahSesi} Sesi - {tipeMobil})
                          {catatanPaket && <div className="text-[8.5px] text-slate-500">{catatanPaket}</div>}
                        </td>
                        <td className="py-1.5 px-2 text-center font-semibold text-slate-700">1 Paket</td>
                        <td className="py-1.5 px-3 text-right font-bold text-slate-900">{formatRupiah(hargaPaket)}</td>
                      </tr>

                      {diskonNominal > 0 && (
                        <tr className="border-b border-slate-200 bg-rose-50/50">
                          <td className="py-1.5 px-2 text-center font-bold text-slate-600">2</td>
                          <td className="py-1.5 px-3 text-rose-700 font-medium">Potongan Diskon Promosi</td>
                          <td className="py-1.5 px-2 text-center text-slate-500">-</td>
                          <td className="py-1.5 px-3 text-right font-bold text-rose-600">- {formatRupiah(diskonNominal)}</td>
                        </tr>
                      )}

                      <tr className="border-b border-slate-200 bg-slate-50 font-bold">
                        <td colSpan={3} className="py-1.5 px-3 text-right pr-4 text-slate-700">Total Biaya Paket Kursus:</td>
                        <td className="py-1.5 px-3 text-right text-slate-900 font-bold">{formatRupiah(totalTagihanBersih)}</td>
                      </tr>

                      {dpTerbayar > 0 && (
                        <tr className="border-b border-slate-200 bg-emerald-50/40">
                          <td colSpan={3} className="py-1.5 px-3 text-right pr-4 text-emerald-800 font-medium">Pembayaran Terdahulu (DP Masuk):</td>
                          <td className="py-1.5 px-3 text-right text-emerald-700 font-bold">- {formatRupiah(dpTerbayar)}</td>
                        </tr>
                      )}

                      {nominalBayarIni > 0 && (
                        <tr className="border-b-2 border-emerald-600 bg-emerald-100/70 font-extrabold text-emerald-900">
                          <td colSpan={3} className="py-2 px-3 text-right pr-4 text-xs tracking-wide">
                            {jenis === 'nota_dp' ? '★ JUMLAH PEMBAYARAN DP SAAT INI:' : jenis === 'nota_pelunasan' ? '★ JUMLAH PEMBAYARAN PELUNASAN:' : '★ JUMLAH DIBAYARKAN SAAT INI:'}
                          </td>
                          <td className="py-2 px-3 text-right text-xs font-black">{formatRupiah(nominalBayarIni)}</td>
                        </tr>
                      )}

                      <tr className="bg-slate-50 font-extrabold">
                        <td colSpan={3} className="py-1.5 px-3 text-right pr-4 text-slate-800">Sisa Tagihan / Piutang Berjalan:</td>
                        <td className={`py-1.5 px-3 text-right text-xs font-black ${sisaPiutang <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {sisaPiutang <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(sisaPiutang)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* ── 5. TERBILANG BOX ── */}
                  <div className="p-2 rounded-lg bg-slate-50 border border-dashed border-[#0F7A73] flex items-center gap-2 mb-3 text-[9.5px]">
                    <span className="px-2 py-0.5 rounded bg-teal-100 text-[#0F7A73] font-black uppercase text-[8px] tracking-wider shrink-0">
                      Terbilang
                    </span>
                    <span className="font-bold text-slate-800 italic">
                      # {terbilangRupiah(nominalBayarIni > 0 ? nominalBayarIni : totalTagihanBersih)} #
                    </span>
                  </div>

                  {/* ── 6. STATUS & CATATAN ROW ── */}
                  <div className="flex items-center justify-between text-[9.5px] mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-semibold">Status:</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-black border text-[9px] tracking-wider ${statusBadge.bg}`}>
                        {statusBadge.text}
                      </span>
                    </div>
                    {catatanPembayaran && (
                      <div className="text-slate-600 italic">
                        Keterangan: <strong className="text-slate-800">{catatanPembayaran}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── 7. SIGNATURES & FOOTER ── */}
                <div className="pt-2">
                  <div className="flex items-end justify-between text-[9.5px]">
                    {/* Student Signature */}
                    <div className="w-48 text-center">
                      <div className="text-slate-500">&nbsp;</div>
                      <div className="font-bold text-slate-800 mb-1">Penyetor / Siswa,</div>
                      <div className="h-12" />
                      <div className="font-black text-slate-900 border-t border-slate-700 pt-1">
                        ({namaSiswa || 'Nama Siswa'})
                      </div>
                      <div className="text-[8px] text-slate-500 font-medium">Siswa Kursus</div>
                    </div>

                    {/* Admin Signature & Stamp */}
                    <div className="w-56 text-center">
                      <div className="text-slate-600 text-[9px] mb-1">
                        {kota || 'Palembang'}, {formatDateLongIndo(tanggal)}
                      </div>
                      <div className="font-bold text-slate-800 mb-1">Petugas Kasir / Administrasi,</div>
                      <div className="h-12 relative flex items-center justify-center">
                        {showStempel && (
                          <img
                            src={stampBase64}
                            alt="Cap Amanah Drive"
                            crossOrigin="anonymous"
                            style={{ width: '75px', height: '75px', objectFit: 'contain' }}
                            className="absolute -top-3 right-6 pointer-events-none opacity-85"
                          />
                        )}
                      </div>
                      <div className="font-black text-slate-900 border-t border-slate-700 pt-1">
                        ({picNama || 'Admin Amanah Drive'})
                      </div>
                      <div className="text-[8px] text-slate-600 font-semibold">
                        {picJabatan} — Amanah Drive
                      </div>
                    </div>
                  </div>

                  {/* Document Legal Footer */}
                  <div className="text-center text-[7.5px] text-slate-400 border-t border-dashed border-slate-200 pt-2 mt-3">
                    Dokumen resmi diterbitkan secara sah oleh Sistem Finansial Amanah Drive Palembang • Harap simpan bukti pembayaran ini untuk arsip Anda.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PinGateDialog>
  );
}
