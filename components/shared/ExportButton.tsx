'use client';

import React from 'react';
import { FileSpreadsheet, Printer, Loader2 } from 'lucide-react';
import {
  exportToExcel,
  exportToBusinessPdf,
  ExportColumnDef,
  BusinessExportOptions,
} from '@/lib/utils/business-export';

export type ExportColumn<T = any> = ExportColumnDef<T>;

export interface ExportButtonProps<T = any> {
  data: T[];
  columns: ExportColumnDef<T>[];
  filename: string;
  title?: string;
  documentTitle?: string;
  subtitle?: string;
  documentSubtitle?: string;
  documentNumber?: string;
  periodLabel?: string;
  metadata?: { label: string; value: string }[];
  summaryMetrics?: { label: string; value: string | number }[];
  orientation?: 'portrait' | 'landscape';
  sheetName?: string;
  disabled?: boolean;
  className?: string;
}

export function ExportButton<T = any>({
  data,
  columns,
  filename,
  title,
  documentTitle,
  subtitle,
  documentSubtitle,
  documentNumber,
  periodLabel,
  metadata,
  summaryMetrics,
  orientation,
  sheetName,
  disabled = false,
  className = '',
}: ExportButtonProps<T>) {
  const [loadingXlsx, setLoadingXlsx] = React.useState(false);
  const [loadingPdf, setLoadingPdf] = React.useState(false);

  const exportOptions: BusinessExportOptions<T> = {
    data: data || [],
    columns,
    filename,
    title: title || documentTitle || 'Laporan Dokumen',
    documentTitle,
    subtitle: subtitle || documentSubtitle,
    documentSubtitle,
    documentNumber,
    periodLabel,
    metadata,
    summaryMetrics,
    orientation,
    sheetName,
  };

  const handleExportXlsx = async () => {
    if (loadingXlsx || !data || data.length === 0) return;
    try {
      setLoadingXlsx(true);
      await exportToExcel(exportOptions);
    } catch (err) {
      console.error('Export XLSX error:', err);
      alert('Gagal mengekspor file Excel. Silakan coba kembali.');
    } finally {
      setLoadingXlsx(false);
    }
  };

  const handleExportPdf = async () => {
    if (loadingPdf || !data || data.length === 0) return;
    try {
      setLoadingPdf(true);
      await exportToBusinessPdf(exportOptions);
    } catch (err) {
      console.error('Export PDF error:', err);
      alert('Gagal menyiapkan dokumen cetak PDF. Silakan coba kembali.');
    } finally {
      setLoadingPdf(false);
    }
  };

  const isDataEmpty = !data || data.length === 0 || disabled;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* 1. Button Excel dengan AutoFilter bawaan */}
      <button
        type="button"
        onClick={handleExportXlsx}
        disabled={isDataEmpty || loadingXlsx}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 transition-all shadow-2xs hover:-translate-y-0.5 disabled:opacity-45 disabled:pointer-events-none"
        title="Export file Excel (.xlsx) dengan fitur filter otomatis pada tiap header"
      >
        {loadingXlsx ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        )}
        <span>{loadingXlsx ? 'Membuat...' : 'Excel'}</span>
      </button>

      {/* 2. Button Cetak PDF Resmi Bisnis */}
      <button
        type="button"
        onClick={handleExportPdf}
        disabled={isDataEmpty || loadingPdf}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border border-[var(--brand-primary)]/30 bg-[var(--brand-primary-light)] hover:bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] transition-all shadow-2xs hover:-translate-y-0.5 disabled:opacity-45 disabled:pointer-events-none"
        title="Cetak atau unduh dokumen PDF resmi berstandar arsip bisnis (bebas elemen UI web)"
      >
        {loadingPdf ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Printer className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
        )}
        <span>{loadingPdf ? 'Menyiapkan...' : 'Cetak PDF'}</span>
      </button>
    </div>
  );
}
