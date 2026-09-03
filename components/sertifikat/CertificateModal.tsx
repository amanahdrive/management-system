'use client';

import React from 'react';
import { CertificateCanvas } from './CertificateCanvas';
import { SiswaSertifikatItem } from '@/lib/actions/sertifikat';
import { formatSesiDateRange } from '@/lib/utils/certificate';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { toJpeg, toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  Download,
  Printer,
  FileDown,
  X,
  SlidersHorizontal,
  Check,
  Award,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface CertificateModalProps {
  item: SiswaSertifikatItem | null;
  onClose: () => void;
  staffList?: { id: string; nama: string }[];
}

export function CertificateModal({ item, onClose, staffList = [] }: CertificateModalProps) {
  const certificateRef = React.useRef<HTMLDivElement>(null);

  // Form State for dynamic overrides
  const [nomorSertifikat, setNomorSertifikat] = React.useState('');
  const [namaSiswa, setNamaSiswa] = React.useState('');
  const [tanggalMulai, setTanggalMulai] = React.useState('');
  const [tanggalSelesai, setTanggalSelesai] = React.useState('');
  const [tanggalCetak, setTanggalCetak] = React.useState(getTodayDateString());
  const [namaInstruktur, setNamaInstruktur] = React.useState('');
  const [namaPimpinan, setNamaPimpinan] = React.useState('Nur Awalia Rianti');
  const [predikat, setPredikat] = React.useState('DENGAN PREDIKAT BAIK');
  const [lokasi, setLokasi] = React.useState('Palembang');

  const [showCustomizer, setShowCustomizer] = React.useState(false);
  const [downloadingPdf, setDownloadingPdf] = React.useState(false);
  const [downloadingJpg, setDownloadingJpg] = React.useState(false);

  // Initialize data when modal opens with an item
  React.useEffect(() => {
    if (item) {
      setNomorSertifikat(item.nomor_sertifikat);
      setNamaSiswa(item.nama);
      setTanggalMulai(item.tanggal_mulai_sesi || getTodayDateString());
      setTanggalSelesai(item.tanggal_selesai_sesi || getTodayDateString());
      setTanggalCetak(getTodayDateString());
      setNamaInstruktur(item.instruktur_nama || 'Syawal Putra');
      setNamaPimpinan('Nur Awalia Rianti');
      setPredikat('DENGAN PREDIKAT BAIK');
      setLokasi('Palembang');
    }
  }, [item]);

  if (!item) return null;

  const tanggalRangeSesi = formatSesiDateRange(tanggalMulai, tanggalSelesai);
  const formattedTanggalCetak = formatDateIndo(tanggalCetak);

  const cleanFilename = (ext: string) => {
    const cleanNama = namaSiswa.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const cleanKode = (item.kode_siswa || 'SS001').toLowerCase();
    return `sertifikat_${cleanNama}_${cleanKode}.${ext}`;
  };

  // --- SAVE JPG HANDLER ---
  const handleSaveJpg = async () => {
    if (!certificateRef.current) return;
    setDownloadingJpg(true);
    try {
      const dataUrl = await toJpeg(certificateRef.current, {
        quality: 0.96,
        pixelRatio: 2.5,
        backgroundColor: '#fafdfd',
      });

      const link = document.createElement('a');
      link.download = cleanFilename('jpg');
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating JPG certificate:', err);
      alert('Gagal membuat file JPG. Silakan coba kembali.');
    } finally {
      setDownloadingJpg(false);
    }
  };

  // --- SAVE PDF HANDLER ---
  const handleSavePdf = async () => {
    if (!certificateRef.current) return;
    setDownloadingPdf(true);
    try {
      const dataUrl = await toPng(certificateRef.current, {
        pixelRatio: 2.5,
        backgroundColor: '#fafdfd',
      });

      // A4 Landscape dimensions: 297mm x 210mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
      pdf.save(cleanFilename('pdf'));
    } catch (err) {
      console.error('Error generating PDF certificate:', err);
      alert('Gagal membuat file PDF. Silakan coba kembali.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // --- DIRECT PRINT HANDLER ---
  const handlePrint = () => {
    window.print();
  };

  // --- RESET DEFAULTS ---
  const handleResetDefaults = () => {
    if (!item) return;
    setNomorSertifikat(item.nomor_sertifikat);
    setNamaSiswa(item.nama);
    setTanggalMulai(item.tanggal_mulai_sesi || getTodayDateString());
    setTanggalSelesai(item.tanggal_selesai_sesi || getTodayDateString());
    setTanggalCetak(getTodayDateString());
    setNamaInstruktur(item.instruktur_nama || 'Syawal Putra');
    setNamaPimpinan('Nur Awalia Rianti');
    setPredikat('DENGAN PREDIKAT BAIK');
    setLokasi('Palembang');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      {/* Hidden print container styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #amanah-certificate-a4,
          #amanah-certificate-a4 * {
            visibility: visible !important;
          }
          #amanah-certificate-a4 {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 24mm !important;
            page-break-inside: avoid !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }
      `}</style>

      <div className="w-full max-w-6xl max-h-[96vh] bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* ================= MODAL HEADER ================= */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Cetak Sertifikat Siswa</span>
                <span className="px-2 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--brand-primary)]">
                  {nomorSertifikat}
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {namaSiswa} • {item.paket_nama}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCustomizer((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                showCustomizer
                  ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-xs'
                  : 'bg-[var(--bg)] text-[var(--text-primary)] border-[var(--border)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showCustomizer ? 'Tutup Panel Edit' : 'Sesuaikan Data'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= CUSTOMIZER DRAWER (OPTIONAL) ================= */}
        {showCustomizer && (
          <div className="p-4 border-b border-[var(--border)] bg-[var(--bg)] space-y-3 animate-fadeIn text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Penyesuaian Parameter Sertifikat:</span>
              </span>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-[11px] text-[var(--brand-primary)] hover:underline flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Kembalikan Default</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Nomor Sertifikat
                </label>
                <input
                  type="text"
                  value={nomorSertifikat}
                  onChange={(e) => setNomorSertifikat(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] font-mono text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Nama Siswa
                </label>
                <input
                  type="text"
                  value={namaSiswa}
                  onChange={(e) => setNamaSiswa(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-xs font-bold"
                />
              </div>

              <div>
                <DatePickerWIB
                  label="Tanggal Sesi Awal"
                  value={tanggalMulai}
                  onChange={setTanggalMulai}
                />
              </div>

              <div>
                <DatePickerWIB
                  label="Tanggal Sesi Selesai"
                  value={tanggalSelesai}
                  onChange={setTanggalSelesai}
                />
              </div>

              <div>
                <DatePickerWIB
                  label="Tanggal Cetak Sertifikat"
                  value={tanggalCetak}
                  onChange={setTanggalCetak}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Nama Instruktur
                </label>
                <div className="space-y-1">
                  <select
                    value={namaInstruktur}
                    onChange={(e) => setNamaInstruktur(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-xs font-semibold"
                  >
                    {staffList.map((s) => (
                      <option key={s.id} value={s.nama}>
                        {s.nama}
                      </option>
                    ))}
                    <option value="Syawal Putra">Syawal Putra</option>
                    <option value="Khusus / Lainnya">Lainnya...</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Nama Pimpinan
                </label>
                <input
                  type="text"
                  value={namaPimpinan}
                  onChange={(e) => setNamaPimpinan(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Predikat Kelulusan
                </label>
                <input
                  type="text"
                  value={predikat}
                  onChange={(e) => setPredikat(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-xs font-semibold"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL PREVIEW BODY ================= */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-900/40 flex justify-center items-center">
          {/* Scalable Container for A4 Landscape Canvas */}
          <div className="relative shadow-2xl rounded-sm overflow-hidden transform scale-[0.52] sm:scale-[0.62] md:scale-[0.74] lg:scale-[0.84] origin-center transition-transform">
            <CertificateCanvas
              ref={certificateRef}
              nomorSertifikat={nomorSertifikat}
              namaSiswa={namaSiswa}
              kodeSiswa={item.kode_siswa}
              paketNama={item.paket_nama}
              tanggalRangeSesi={tanggalRangeSesi}
              tanggalCetak={formattedTanggalCetak}
              namaInstruktur={namaInstruktur}
              namaPimpinan={namaPimpinan}
              predikat={predikat}
              lokasi={lokasi}
            />
          </div>
        </div>

        {/* ================= MODAL ACTIONS BAR ================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-subtle)]">
          <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Format Dokumen: <strong>A4 Landscape (297 × 210 mm)</strong></span>
          </div>

          {/* Action Buttons: Simpan PDF, Simpan JPG, Cetak */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Save PDF Button */}
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={downloadingPdf || downloadingJpg}
              className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow disabled:opacity-50"
              title="Unduh sebagai dokumen PDF Siap Cetak"
            >
              {downloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>{downloadingPdf ? 'Memproses PDF...' : 'Simpan PDF'}</span>
            </button>

            {/* Save JPG Button */}
            <button
              type="button"
              onClick={handleSaveJpg}
              disabled={downloadingPdf || downloadingJpg}
              className="flex-1 sm:flex-initial px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow disabled:opacity-50"
              title="Unduh sebagai gambar JPG Resolusi Tinggi"
            >
              {downloadingJpg ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloadingJpg ? 'Memproses JPG...' : 'Simpan JPG'}</span>
            </button>

            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] rounded-xl transition-colors shrink-0"
              title="Cetak langsung menggunakan dialog printer"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
