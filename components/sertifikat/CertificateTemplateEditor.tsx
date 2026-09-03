'use client';

import React from 'react';
import { CertificateFieldConfig, CertificateTemplate } from '@/types/certificate';
import {
  saveCertificateTemplate,
  uploadCertificateTemplatePdf,
} from '@/lib/actions/certificate-template';
import {
  Save,
  Upload,
  RefreshCw,
  Sliders,
  Type,
  Move,
  Eye,
  CheckCircle2,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';

interface CertificateTemplateEditorProps {
  initialTemplate: CertificateTemplate;
  onSaved?: () => void;
}

export function CertificateTemplateEditor({
  initialTemplate,
  onSaved,
}: CertificateTemplateEditorProps) {
  const [template, setTemplate] = React.useState<CertificateTemplate>(initialTemplate);
  const [selectedFieldKey, setSelectedFieldKey] = React.useState<string>('student_name');
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState<number>(1);

  // Update container scale relative to PDF width (842.25 pt)
  React.useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const currentWidth = containerRef.current.offsetWidth;
        setScale(currentWidth / (template.page_width || 842.25));
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [template.page_width]);

  const selectedField = template.fields.find((f) => f.field_key === selectedFieldKey);

  // Update specific field properties
  const updateSelectedField = (updates: Partial<CertificateFieldConfig>) => {
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((f) =>
        f.field_key === selectedFieldKey ? { ...f, ...updates } : f
      ),
    }));
  };

  // Convert PDF point coordinates (bottom-left origin) to browser CSS pixels (top-left origin)
  const pdfToCssCoords = (pdfX: number, pdfY: number) => {
    const cssX = pdfX * scale;
    const cssY = ((template.page_height || 595.5) - pdfY) * scale;
    return { left: cssX, top: cssY };
  };

  // Handle Drag & Drop on Template Field
  const handleDragStart = (e: React.MouseEvent, fieldKey: string) => {
    e.preventDefault();
    setSelectedFieldKey(fieldKey);
    const container = containerRef.current;
    if (!container) return;

    const startRect = container.getBoundingClientRect();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const mouseX = moveEvent.clientX - startRect.left;
      const mouseY = moveEvent.clientY - startRect.top;

      // Convert CSS pixel mouse position to PDF points
      const pdfX = Math.round((mouseX / scale) * 10) / 10;
      const pdfY = Math.round(((template.page_height - mouseY / scale)) * 10) / 10;

      const clampedX = Math.max(0, Math.min(template.page_width, pdfX));
      const clampedY = Math.max(0, Math.min(template.page_height, pdfY));

      setTemplate((prev) => ({
        ...prev,
        fields: prev.fields.map((f) =>
          f.field_key === fieldKey ? { ...f, x: clampedX, y: clampedY } : f
        ),
      }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Save Template
  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const res = await saveCertificateTemplate(template);
      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        if (onSaved) onSaved();
      } else {
        alert(res.error || 'Gagal menyimpan template');
      }
    } catch (err) {
      console.error('Error saving template:', err);
    } finally {
      setSaving(false);
    }
  };

  // Upload PDF
  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('template_pdf', file);

    try {
      const res = await uploadCertificateTemplatePdf(formData);
      if (res.success && res.url) {
        setTemplate((prev) => ({ ...prev, pdf_template_url: res.url! }));
        alert('Template PDF berhasil diupload!');
      } else {
        alert(res.error || 'Gagal upload PDF');
      }
    } catch (err) {
      console.error('Error uploading PDF:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--brand-primary)]" />
            <span>Editor Visual Template Sertifikat (A4 Landscape)</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Tentukan koordinat absolut (X, Y dalam PDF points) dan atribut font untuk setiap field dinamis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>{uploading ? 'Mengupload...' : 'Upload PDF Template Baru'}</span>
            <input
              type="file"
              accept=".pdf"
              onChange={handleUploadPdf}
              disabled={uploading}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedSuccess ? 'Tersimpan!' : 'Simpan Konfigurasi'}</span>
          </button>
        </div>
      </div>

      {/* Editor Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Canvas (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="p-2 border border-[var(--border)] rounded-xl bg-slate-900/40 overflow-hidden">
            <div
              ref={containerRef}
              style={{
                aspectRatio: `${template.page_width || 842.25} / ${template.page_height || 595.5}`,
              }}
              className="relative w-full bg-[#fafdfd] rounded-md shadow-xl overflow-hidden select-none border border-black/10"
            >
              {/* Background Reference Indicator */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                <span className="text-4xl font-extrabold text-black">A4 LANDSCAPE CANVA TEMPLATE</span>
              </div>

              {/* Dynamic Field Markers on Canvas */}
              {template.fields.map((field) => {
                const isSelected = field.field_key === selectedFieldKey;
                const coords = pdfToCssCoords(field.x, field.y);

                return (
                  <div
                    key={field.field_key}
                    onMouseDown={(e) => handleDragStart(e, field.field_key)}
                    style={{
                      left: `${coords.left}px`,
                      top: `${coords.top}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute cursor-move px-2 py-0.5 rounded border text-[10px] font-mono transition-all z-20 whitespace-nowrap shadow-xs ${
                      isSelected
                        ? 'bg-[var(--brand-primary)] text-white border-white ring-2 ring-[var(--brand-primary)] ring-offset-1 font-bold'
                        : 'bg-white/90 text-slate-800 border-slate-400 hover:border-[var(--brand-primary)] font-medium'
                    }`}
                    title={`Klik & Geser untuk mengubah posisi ${field.label} (X: ${field.x}, Y: ${field.y})`}
                  >
                    <div className="flex items-center gap-1">
                      <Move className="w-2.5 h-2.5 opacity-60" />
                      <span>{field.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between px-1">
            <span>💡 <em>Klik &amp; geser label pada kanvas untuk memindahkan posisi secara visual.</em></span>
            <span className="font-mono">Ukuran: {template.page_width} × {template.page_height} pt</span>
          </div>
        </div>

        {/* Field Inspector Panel (1 Col) */}
        <div className="space-y-4">
          <div className="p-4 border border-[var(--border)] rounded-xl bg-[var(--bg)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Pilih Field untuk Diedit:</span>
              </span>
            </div>

            {/* Field Selector Dropdown */}
            <select
              value={selectedFieldKey}
              onChange={(e) => setSelectedFieldKey(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
            >
              {template.fields.map((f) => (
                <option key={f.field_key} value={f.field_key}>
                  {f.label} ({f.field_key})
                </option>
              ))}
            </select>

            {selectedField && (
              <div className="space-y-3 pt-1 text-xs">
                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      Koordinat X (Points)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedField.x}
                      onChange={(e) => updateSelectedField({ x: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] font-mono text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      Koordinat Y (Points dari bawah)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedField.y}
                      onChange={(e) => updateSelectedField({ y: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Font Family & Font Size */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      Font Family
                    </label>
                    <select
                      value={selectedField.font_family}
                      onChange={(e) => updateSelectedField({ font_family: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-xs font-semibold"
                    >
                      <option value="Helvetica-Bold">Helvetica Bold</option>
                      <option value="Helvetica">Helvetica Regular</option>
                      <option value="Times-Bold">Times Roman Bold</option>
                      <option value="Times-Roman">Times Roman Regular</option>
                      <option value="Courier-Bold">Courier Bold</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      Font Size (pt)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedField.font_size}
                      onChange={(e) => updateSelectedField({ font_size: parseFloat(e.target.value) || 12 })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Color & Alignment */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      Warna Teks
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={selectedField.color}
                        onChange={(e) => updateSelectedField({ color: e.target.value })}
                        className="w-8 h-8 rounded border border-[var(--border)] cursor-pointer p-0.5 bg-transparent"
                      />
                      <input
                        type="text"
                        value={selectedField.color}
                        onChange={(e) => updateSelectedField({ color: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] font-mono text-[11px] font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      Alignment
                    </label>
                    <select
                      value={selectedField.alignment}
                      onChange={(e) => updateSelectedField({ alignment: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-xs font-semibold"
                    >
                      <option value="center">Center (Tengah)</option>
                      <option value="left">Left (Kiri)</option>
                      <option value="right">Right (Kanan)</option>
                    </select>
                  </div>
                </div>

                {/* Prefix & Suffix */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      Awalan (Prefix)
                    </label>
                    <input
                      type="text"
                      value={selectedField.prefix || ''}
                      onChange={(e) => updateSelectedField({ prefix: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-secondary)] mb-1">
                      Akhiran (Suffix)
                    </label>
                    <input
                      type="text"
                      value={selectedField.suffix || ''}
                      onChange={(e) => updateSelectedField({ suffix: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] text-xs"
                    />
                  </div>
                </div>

                {/* Clear Background Overlay */}
                <div className="pt-2 border-t border-[var(--border)] space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedField.clear_background)}
                      onChange={(e) => updateSelectedField({ clear_background: e.target.checked })}
                      className="rounded border-[var(--border)] text-[var(--brand-primary)]"
                    />
                    <span className="font-semibold text-xs text-[var(--text-primary)]">
                      Bersihkan Area Bawah (Whiteout Placeholder)
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
