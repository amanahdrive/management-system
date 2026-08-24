'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Siswa } from '@/types/database';
import { getSiswaList } from '@/lib/actions/siswa';
import { formatRupiah } from '@/lib/utils/currency';
import { getTodayDateString } from '@/lib/utils/date';
import {
  NotaJenis,
  NotaData,
  generateNotaHtml,
  generateInvoiceHtml,
  generateNomorDokumen,
  printNota,
  downloadNotaAsJpg,
  downloadNotaAsPdf,
  copyNotaToClipboard,
} from '@/lib/utils/nota-generator';
import {
  Receipt,
  FileText,
  Download,
  Printer,
  Copy,
  Image as ImageIcon,
  ChevronDown,
  User,
  CheckCircle2,
  Loader2,
  RefreshCw,
  FileDown,
  Eye,
} from 'lucide-react';

// ─── Jenis Dokumen Options ───────────────────────────────────────
const JENIS_OPTIONS: { value: NotaJenis; label: string; desc: string }[] = [
  { value: 'nota_dp', label: 'Nota DP', desc: 'Bukti pembayaran uang muka (A5)' },
  { value: 'nota_pelunasan', label: 'Nota Pelunasan', desc: 'Bukti pelunasan sisa tagihan (A5)' },
  { value: 'nota_pembayaran', label: 'Nota Pembayaran', desc: 'Bukti pembayaran umum / cicilan (A5)' },
  { value: 'invoice_tagihan', label: 'Invoice Tagihan', desc: 'Invoice formal penagihan (A4)' },
];

export default function NotaPage() {
  // Data
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Form State
  const [jenis, setJenis] = React.useState<NotaJenis>('nota_dp');
  const [siswaId, setSiswaId] = React.useState('');
  const [nominal, setNominal] = React.useState(0);
  const [metode, setMetode] = React.useState<'tunai' | 'non_tunai'>('non_tunai');
  const [tanggal, setTanggal] = React.useState(getTodayDateString());
  const [catatan, setCatatan] = React.useState('');
  const [picNama, setPicNama] = React.useState('Admin Amanah Drive');
  const [picJabatan, setPicJabatan] = React.useState('Admin');
  const [nomorDokumen, setNomorDokumen] = React.useState(() => generateNomorDokumen('nota_dp'));

  // Preview
  const [previewHtml, setPreviewHtml] = React.useState('');
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  // Load data
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getSiswaList();
      setSiswaList(data);
      setLoading(false);
    })();
  }, []);

  // Auto-regenerate nomor dokumen when jenis changes
  React.useEffect(() => {
    setNomorDokumen(generateNomorDokumen(jenis));
  }, [jenis]);

  // Selected siswa
  const selectedSiswa = siswaList.find((s) => s.id === siswaId);

  // Filtered siswa based on jenis
  const filteredSiswa = React.useMemo(() => {
    switch (jenis) {
      case 'nota_dp':
        return siswaList.filter((s) => s.status_pembayaran_kode === 'belum_bayar');
      case 'nota_pelunasan':
        return siswaList.filter((s) => s.status_pembayaran_kode === 'dp');
      case 'nota_pembayaran':
        return siswaList.filter((s) => s.status_pembayaran_kode === 'dp' || s.status_pembayaran_kode === 'belum_bayar');
      case 'invoice_tagihan':
        return siswaList.filter((s) => s.status_pembayaran_kode !== 'batal');
      default:
        return siswaList;
    }
  }, [siswaList, jenis]);

  // Handle siswa change -> auto-fill nominal
  const handleSiswaChange = (id: string) => {
    setSiswaId(id);
    const s = siswaList.find((item) => item.id === id);
    if (!s) { setNominal(0); return; }

    switch (jenis) {
      case 'nota_dp':
        setNominal(Math.round(s.harga_final * 0.5));
        break;
      case 'nota_pelunasan':
        setNominal(Math.max(0, s.harga_final - (s.dp_nominal || 0)));
        break;
      case 'nota_pembayaran':
        setNominal(0);
        break;
      case 'invoice_tagihan':
        setNominal(0); // Invoice doesn't need payment nominal
        break;
    }
  };

  // Handle jenis change -> reset siswa
  const handleJenisChange = (newJenis: NotaJenis) => {
    setJenis(newJenis);
    setSiswaId('');
    setNominal(0);
    setCatatan('');
  };

  // Build NotaData
  const buildNotaData = (): NotaData | null => {
    if (!selectedSiswa) return null;
    return {
      jenis,
      nomorDokumen,
      tanggalDokumen: tanggal,
      namaSiswa: selectedSiswa.nama,
      kodeSiswa: selectedSiswa.kode_siswa,
      alamatSiswa: selectedSiswa.alamat || '',
      whatsappSiswa: selectedSiswa.no_whatsapp || '',
      namaPaket: selectedSiswa.paket?.nama_paket || 'Paket Kursus',
      deskripsiPaket: selectedSiswa.paket ? `${selectedSiswa.paket.jumlah_sesi || '-'} Sesi` : '',
      hargaPaket: selectedSiswa.harga_final,
      dpTerbayar: selectedSiswa.dp_nominal || 0,
      nominalBayarIni: nominal,
      metodePembayaran: metode,
      catatan,
      picNama,
      picJabatan,
    };
  };

  // Generate preview
  const handleGeneratePreview = () => {
    const data = buildNotaData();
    if (!data) return;
    const html = data.jenis === 'invoice_tagihan' ? generateInvoiceHtml(data) : generateNotaHtml(data);
    setPreviewHtml(html);
  };

  // Show toast
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Output Actions ────────────────────────────────────────────
  const handleDownloadJpg = async () => {
    if (!previewRef.current) return;
    setActionLoading('jpg');
    try {
      const filename = `${jenis}_${selectedSiswa?.kode_siswa || 'nota'}_${tanggal}`;
      await downloadNotaAsJpg(previewRef.current, filename);
      showToast('JPG berhasil didownload!');
    } catch { showToast('Gagal download JPG'); }
    setActionLoading(null);
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setActionLoading('pdf');
    try {
      const filename = `${jenis}_${selectedSiswa?.kode_siswa || 'nota'}_${tanggal}`;
      const isA4 = jenis === 'invoice_tagihan';
      await downloadNotaAsPdf(previewRef.current, filename, isA4);
      showToast('PDF berhasil didownload!');
    } catch { showToast('Gagal download PDF'); }
    setActionLoading(null);
  };

  const handleCopyImage = async () => {
    if (!previewRef.current) return;
    setActionLoading('copy');
    try {
      const ok = await copyNotaToClipboard(previewRef.current);
      showToast(ok ? 'Gambar berhasil dicopy ke clipboard!' : 'Gagal copy gambar');
    } catch { showToast('Gagal copy gambar'); }
    setActionLoading(null);
  };

  const handlePrint = () => {
    const data = buildNotaData();
    if (!data) return;
    printNota(data);
  };

  // ─── Render ────────────────────────────────────────────────────
  const isA4 = jenis === 'invoice_tagihan';

  return (
    <PinGateDialog>
      <div className="space-y-6 max-w-full">
        <PageHeader
          title="Cetak Nota / Invoice"
          description="Generate nota pembayaran, tagihan, dan invoice profesional"
        />

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toast}</span>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ── LEFT: Form Input ── */}
          <div className="space-y-4">
            <div className="card-container p-5 space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Pengaturan Dokumen</span>
              </h3>

              {/* Jenis Dokumen */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">Jenis Dokumen *</label>
                <div className="grid grid-cols-2 gap-2">
                  {JENIS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleJenisChange(opt.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        jenis === opt.value
                          ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] ring-1 ring-[var(--brand-primary)]'
                          : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--brand-primary)]'
                      }`}
                    >
                      <span className={`text-xs font-bold block ${jenis === opt.value ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}>
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nomor Dokumen */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Nomor Dokumen</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nomorDokumen}
                    onChange={(e) => setNomorDokumen(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setNomorDokumen(generateNomorDokumen(jenis))}
                    className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                    title="Generate nomor baru"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Tanggal Dokumen *</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs"
                />
              </div>
            </div>

            {/* Pilih Siswa */}
            <div className="card-container p-5 space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Data Siswa</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-normal ml-auto">
                  {filteredSiswa.length} siswa tersedia
                </span>
              </h3>

              <div className="relative">
                <select
                  value={siswaId}
                  onChange={(e) => handleSiswaChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs appearance-none pr-8 font-medium"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {filteredSiswa.map((s) => {
                    const info = s.status_pembayaran_kode === 'dp'
                      ? `Sisa: ${formatRupiah(Math.max(0, s.harga_final - (s.dp_nominal || 0)))}`
                      : s.status_pembayaran_kode === 'lunas'
                      ? 'LUNAS'
                      : `Total: ${formatRupiah(s.harga_final)}`;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.kode_siswa} — {s.nama} ({info})
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[var(--text-secondary)]" />
              </div>

              {selectedSiswa && (
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border)]">
                  <div><span className="text-[var(--text-secondary)] block text-[10px]">Nama</span><span className="font-bold">{selectedSiswa.nama}</span></div>
                  <div><span className="text-[var(--text-secondary)] block text-[10px]">Kode Siswa</span><span className="font-bold">{selectedSiswa.kode_siswa}</span></div>
                  <div><span className="text-[var(--text-secondary)] block text-[10px]">Paket</span><span className="font-semibold">{selectedSiswa.paket?.nama_paket || '-'}</span></div>
                  <div><span className="text-[var(--text-secondary)] block text-[10px]">Harga Paket</span><span className="font-bold text-[var(--brand-primary)]">{formatRupiah(selectedSiswa.harga_final)}</span></div>
                  <div><span className="text-[var(--text-secondary)] block text-[10px]">Status</span><span className="font-bold uppercase">{selectedSiswa.status_pembayaran_kode.replace(/_/g, ' ')}</span></div>
                  <div><span className="text-[var(--text-secondary)] block text-[10px]">DP Terbayar</span><span className="font-bold text-emerald-600">{formatRupiah(selectedSiswa.dp_nominal || 0)}</span></div>
                </div>
              )}
            </div>

            {/* Detail Pembayaran (not for Invoice) */}
            {jenis !== 'invoice_tagihan' && (
              <div className="card-container p-5 space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Detail Pembayaran</span>
                </h3>

                <CurrencyInput
                  label="Nominal Pembayaran (Rp) *"
                  value={nominal}
                  onChange={(val) => setNominal(val)}
                />

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Metode Pembayaran</label>
                  <div className="flex rounded-lg p-1 bg-[var(--bg-subtle)] border border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setMetode('non_tunai')}
                      className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
                        metode === 'non_tunai' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      Non-Tunai (Transfer)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetode('tunai')}
                      className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${
                        metode === 'tunai' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      Tunai (Cash)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Catatan / Keterangan</label>
                  <textarea
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Catatan tambahan (opsional)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs resize-none"
                  />
                </div>
              </div>
            )}

            {/* Invoice Catatan */}
            {jenis === 'invoice_tagihan' && (
              <div className="card-container p-5 space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Catatan Invoice</span>
                </h3>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Catatan / Keterangan</label>
                  <textarea
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    placeholder="Catatan invoice tambahan (opsional)"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs resize-none"
                  />
                </div>
              </div>
            )}

            {/* PIC / Penandatangan */}
            <div className="card-container p-5 space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Penandatangan</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Nama PIC</label>
                  <input
                    type="text"
                    value={picNama}
                    onChange={(e) => setPicNama(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Jabatan</label>
                  <select
                    value={picJabatan}
                    onChange={(e) => setPicJabatan(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs appearance-none"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Finance">Finance</option>
                    <option value="Pimpinan">Pimpinan</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Generate Preview Button */}
            <button
              onClick={handleGeneratePreview}
              disabled={!selectedSiswa || (jenis !== 'invoice_tagihan' && nominal <= 0)}
              className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>Generate Preview Dokumen</span>
            </button>
          </div>

          {/* ── RIGHT: Preview & Actions ── */}
          <div className="space-y-4">
            <div className="card-container p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Preview Dokumen</span>
                </h3>
                {previewHtml && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isA4 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'}`}>
                    {isA4 ? 'A4 Portrait' : 'A5 Landscape'}
                  </span>
                )}
              </div>

              {/* Preview Frame */}
              {previewHtml ? (
                <div className={`bg-white rounded-xl shadow-inner border border-[var(--border)] overflow-hidden ${isA4 ? 'aspect-[210/297]' : 'aspect-[210/148]'}`}>
                  <div
                    ref={previewRef}
                    className="w-full h-full origin-top-left"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                    style={{
                      transform: 'scale(1)',
                      transformOrigin: 'top left',
                    }}
                  />
                </div>
              ) : (
                <div className={`bg-[var(--bg-subtle)] rounded-xl border-2 border-dashed border-[var(--border)] flex items-center justify-center ${isA4 ? 'aspect-[210/297]' : 'aspect-[210/148]'}`}>
                  <div className="text-center space-y-2 text-[var(--text-secondary)]">
                    <Receipt className="w-10 h-10 mx-auto opacity-30" />
                    <p className="text-xs font-medium">Isi form di samping, lalu klik</p>
                    <p className="text-xs font-bold text-[var(--brand-primary)]">"Generate Preview Dokumen"</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {previewHtml && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleDownloadJpg}
                  disabled={actionLoading === 'jpg'}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'jpg' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                  <span>Download JPG</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  disabled={actionLoading === 'pdf'}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-red-400 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-950/50 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={handleCopyImage}
                  disabled={actionLoading === 'copy'}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-all disabled:opacity-50"
                >
                  {actionLoading === 'copy' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  <span>Copy Foto</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] text-xs font-bold hover:bg-[var(--brand-primary)] hover:text-white transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Print</span>
                </button>
              </div>
            )}

            {/* Info Banner */}
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] space-y-1">
              <p className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                <Receipt className="w-3 h-3" /> Informasi Penting
              </p>
              <p>• Cetak nota <strong>TIDAK mencatat transaksi</strong> ke Buku Kas & Keuangan.</p>
              <p>• Fitur ini hanya untuk kebutuhan generate dokumen pembayaran / tagihan.</p>
              <p>• Pencatatan transaksi kas resmi dilakukan melalui menu <strong>Kas & Keuangan</strong>.</p>
            </div>
          </div>
        </div>
      </div>
    </PinGateDialog>
  );
}
