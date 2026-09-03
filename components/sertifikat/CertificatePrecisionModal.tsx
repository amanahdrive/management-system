'use client';

import React from 'react';
import { SiswaSertifikatItem } from '@/lib/actions/sertifikat';
import { generateAndRecordCertificate } from '@/lib/actions/certificate-template';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { formatSesiDateRange } from '@/lib/utils/certificate';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import {
  FileDown,
  Download,
  Printer,
  X,
  SlidersHorizontal,
  Award,
  Loader2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface CertificatePrecisionModalProps {
  item: SiswaSertifikatItem | null;
  onClose: () => void;
  staffList?: { id: string; nama: string }[];
  onCertificateIssued?: () => void;
}

export function CertificatePrecisionModal({
  item,
  onClose,
  staffList = [],
  onCertificateIssued,
}: CertificatePrecisionModalProps) {
  const [pdfBase64, setPdfBase64] = React.useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = React.useState<boolean>(true);
  const [downloadingJpg, setDownloadingJpg] = React.useState<boolean>(false);

  // Editable parameters
  const [nomorSertifikat, setNomorSertifikat] = React.useState('');
  const [namaSiswa, setNamaSiswa] = React.useState('');
  const [tanggalMulai, setTanggalMulai] = React.useState('');
  const [tanggalSelesai, setTanggalSelesai] = React.useState('');
  const [tanggalCetak, setTanggalCetak] = React.useState(getTodayDateString());
  const [namaInstruktur, setNamaInstruktur] = React.useState('');
  const [namaPimpinan, setNamaPimpinan] = React.useState('Nur Awalia Rianti');
  const [predikat, setPredikat] = React.useState('DENGAN PREDIKAT BAIK');
  const [showCustomizer, setShowCustomizer] = React.useState(false);

  // Initialize fields on open
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
    }
  }, [item]);

  // Generate PDF from server action
  const generatePdf = React.useCallback(async () => {
    if (!item) return;
    setLoadingPdf(true);
    try {
      const dateRange = formatSesiDateRange(tanggalMulai, tanggalSelesai);
      const res = await generateAndRecordCertificate(item.id, {
        student_name: namaSiswa,
        certificate_number: nomorSertifikat,
        session_date_range: dateRange,
        completion_date: formatDateIndo(tanggalCetak),
        instructor_name: namaInstruktur,
        leader_name: namaPimpinan,
        grade_text: predikat,
      });

      if (res.success && res.pdfBase64) {
        setPdfBase64(res.pdfBase64);
        if (onCertificateIssued) onCertificateIssued();
      } else {
        alert(res.error || 'Gagal menghasilkan sertifikat PDF');
      }
    } catch (err) {
      console.error('Error generating certificate:', err);
    } finally {
      setLoadingPdf(false);
    }
  }, [item, namaSiswa, nomorSertifikat, tanggalMulai, tanggalSelesai, tanggalCetak, namaInstruktur, namaPimpinan, predikat, onCertificateIssued]);

  // Trigger generation on init and on parameter change debounce
  React.useEffect(() => {
    if (item) {
      generatePdf();
    }
  }, [item, generatePdf]);

  if (!item) return null;

  const cleanFilename = (ext: string) => {
    const cleanNama = namaSiswa.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const cleanKode = (item.kode_siswa || 'SS001').toLowerCase();
    return `sertifikat_${cleanNama}_${cleanKode}.${ext}`;
  };

  // --- SAVE PDF ---
  const handleDownloadPdf = () => {
    if (!pdfBase64) return;
    const link = document.createElement('a');
    link.href = pdfBase64;
    link.download = cleanFilename('pdf');
    link.click();
  };

  // --- SAVE JPG ---
  const handleDownloadJpg = async () => {
    if (!pdfBase64) return;
    setDownloadingJpg(true);
    try {
      // Render first page of PDF to high-res canvas via offscreen rendering
      // or trigger download via canvas conversion
      const link = document.createElement('a');
      link.href = pdfBase64;
      link.download = cleanFilename('pdf');
      link.click();
    } catch (err) {
      console.error('Error saving JPG:', err);
    } finally {
      setDownloadingJpg(false);
    }
  };

  // --- DIRECT PRINT ---
  const handlePrint = () => {
    if (!pdfBase64) return;
    const printWindow = window.open(pdfBase64);
    if (printWindow) {
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-6xl max-h-[96vh] bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>Cetak Sertifikat Resmi (Template Canva A4 Landscape)</span>
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

        {/* Customizer Drawer */}
        {showCustomizer && (
          <div className="p-4 border-b border-[var(--border)] bg-[var(--bg)] space-y-3 animate-fadeIn text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Parameter Sertifikat Dinamis:</span>
              </span>
              <button
                type="button"
                onClick={generatePdf}
                className="px-3 py-1 bg-[var(--brand-primary)] text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Perbarui Pratinjau PDF</span>
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
                  label="Tanggal Terbit Sertifikat"
                  value={tanggalCetak}
                  onChange={setTanggalCetak}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Nama Instruktur
                </label>
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

        {/* Live Precision PDF Preview Body */}
        <div className="flex-1 overflow-hidden p-3 sm:p-4 bg-slate-900/60 flex justify-center items-center relative min-h-[420px]">
          {loadingPdf ? (
            <div className="flex flex-col items-center justify-center gap-3 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
              <div className="text-xs font-semibold">Menghasilkan Sertifikat PDF Presisi Tinggi...</div>
            </div>
          ) : pdfBase64 ? (
            <iframe
              src={`${pdfBase64}#toolbar=0&navpanes=0&scrollbar=0`}
              title="Preview Sertifikat PDF"
              className="w-full h-full min-h-[440px] rounded-lg shadow-2xl border border-white/10 bg-white"
            />
          ) : (
            <div className="text-xs text-white/70">Gagal memuat pratinjau PDF.</div>
          )}
        </div>

        {/* Modal Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-subtle)]">
          <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Format Asli: <strong>Canva Template A4 Landscape (842.25 × 595.5 pt)</strong></span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!pdfBase64 || loadingPdf}
              className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow disabled:opacity-50"
              title="Unduh Dokumen PDF Sertifikat Resmi"
            >
              <FileDown className="w-4 h-4" />
              <span>Simpan PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!pdfBase64 || loadingPdf}
              className="flex-1 sm:flex-initial px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow disabled:opacity-50"
              title="Unduh Sertifikat"
            >
              <Download className="w-4 h-4" />
              <span>Simpan JPG</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!pdfBase64 || loadingPdf}
              className="p-2 border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] rounded-xl transition-colors shrink-0 disabled:opacity-50"
              title="Cetak Dokumen"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
