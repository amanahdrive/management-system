// lib/utils/business-export.ts
'use client';

import ExcelJS from 'exceljs';
import { formatRupiah } from './currency';
import { formatDateIndo, getTodayDateString, getJakartaDateParts } from './date';

export interface ExportColumnDef<T = any> {
  header: string;
  key?: string;
  accessor?: keyof T | string | ((row: T) => any);
  format?: 'currency' | ((val: any, row: T) => string | number);
  width?: number;
  pdfWidth?: string;
  isCurrency?: boolean;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any, row: T) => string | number;
}

export interface BusinessExportOptions<T = any> {
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
  signerName?: string;
  signerTitle?: string;
  approverName?: string;
  approverTitle?: string;
}

export function getCellValue(row: any, col: ExportColumnDef<any>): any {
  let val: any;
  if (typeof col.accessor === 'function') {
    val = col.accessor(row);
  } else if (typeof col.accessor === 'string' && row && col.accessor in row) {
    val = row[col.accessor];
  } else if (col.key && row && col.key in row) {
    val = row[col.key];
  } else if (typeof col.accessor === 'string' && row) {
    val = row[col.accessor];
  } else if (col.key && row) {
    val = row[col.key];
  }

  if (col.formatter) {
    val = col.formatter(val, row);
  } else if (typeof col.format === 'function') {
    val = col.format(val, row);
  }
  return val;
}

export function isColumnCurrency(col: ExportColumnDef<any>): boolean {
  return Boolean(col.isCurrency || col.format === 'currency');
}

/**
 * Helper to escape HTML characters
 */
function escapeHtml(text: any): string {
  if (text === null || text === undefined) return '-';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate formatted current WIB timestamp
 */
function getCurrentWibTimestamp(): string {
  const parts = getJakartaDateParts(new Date());
  if (!parts) return `${getTodayDateString()} WIB`;
  const timeStr = `${String(parts.hours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}`;
  return `${formatDateIndo(getTodayDateString())} pukul ${timeStr} WIB`;
}

/**
 * Export data to a professional, structured Excel file (.xlsx) with built-in AutoFilter on every header.
 */
export async function exportToExcel(options: BusinessExportOptions): Promise<void> {
  const {
    data,
    columns,
    filename,
    title,
    documentTitle,
    subtitle,
    documentSubtitle,
    periodLabel,
    metadata = [],
    summaryMetrics = [],
    sheetName = 'Laporan',
  } = options;

  const effectiveTitle = title || documentTitle || 'LAPORAN DOKUMEN';
  const effectiveSubtitle = subtitle || documentSubtitle;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Amanah Drive Management System';
  workbook.lastModifiedBy = 'Amanah Drive Admin';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: columns.length > 6 ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const totalCols = columns.length;

  // 1. Company Name Kop
  worksheet.mergeCells(1, 1, 1, totalCols);
  const kopCell = worksheet.getCell(1, 1);
  kopCell.value = 'AMANAH DRIVE PALEMBANG';
  kopCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF0F7A73' } };
  kopCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(1).height = 24;

  // 2. Document Title
  worksheet.mergeCells(2, 1, 2, totalCols);
  const titleCell = worksheet.getCell(2, 1);
  titleCell.value = effectiveTitle.toUpperCase();
  titleCell.font = { name: 'Calibri', bold: true, size: 12, color: { argb: 'FF1E293B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(2).height = 20;

  // 3. Subtitle / Period / Generated Date
  let currentRow = 3;
  const metaLines: string[] = [];
  if (effectiveSubtitle) metaLines.push(effectiveSubtitle);
  if (periodLabel) metaLines.push(`Periode: ${periodLabel}`);
  metaLines.push(`Tanggal Export: ${getCurrentWibTimestamp()}`);
  metaLines.push(`Total Data: ${data.length} Rekod`);

  metadata.forEach((m) => {
    metaLines.push(`${m.label}: ${m.value}`);
  });

  worksheet.mergeCells(currentRow, 1, currentRow, totalCols);
  const metaCell = worksheet.getCell(currentRow, 1);
  metaCell.value = metaLines.join('  |  ');
  metaCell.font = { name: 'Calibri', italic: true, size: 9, color: { argb: 'FF64748B' } };
  metaCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(currentRow).height = 18;

  // 4. Summary Metrics Cards (if any)
  if (summaryMetrics.length > 0) {
    currentRow += 2;
    const metricLabelRow = worksheet.getRow(currentRow);
    const metricValRow = worksheet.getRow(currentRow + 1);
    metricLabelRow.height = 16;
    metricValRow.height = 20;

    summaryMetrics.forEach((metric, idx) => {
      if (idx + 1 <= totalCols) {
        const lblCell = metricLabelRow.getCell(idx + 1);
        lblCell.value = metric.label.toUpperCase();
        lblCell.font = { name: 'Calibri', bold: true, size: 8.5, color: { argb: 'FF475569' } };
        lblCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' },
        };
        lblCell.alignment = { vertical: 'middle', horizontal: 'center' };

        const valCell = metricValRow.getCell(idx + 1);
        valCell.value = typeof metric.value === 'number' ? metric.value : String(metric.value);
        valCell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FF0F7A73' } };
        valCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F4F1' },
        };
        valCell.alignment = { vertical: 'middle', horizontal: 'center' };
        if (typeof metric.value === 'number') {
          valCell.numFmt = '"Rp "#,##0';
        }
      }
    });
    currentRow++;
  }

  // Spacing row before table
  currentRow++;
  worksheet.addRow([]);
  currentRow++;

  // 5. Column Headers Row
  const tableHeaderRowIndex = currentRow;
  const headerValues = columns.map((c) => c.header);
  const headerRow = worksheet.addRow(headerValues);
  headerRow.height = 26;
  headerRow.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F7A73' }, // Brand Primary Dark Teal
  };

  // Border for header cells
  for (let c = 1; c <= totalCols; c++) {
    headerRow.getCell(c).border = {
      top: { style: 'medium', color: { argb: 'FF0A5450' } },
      left: { style: 'thin', color: { argb: 'FF0A5450' } },
      bottom: { style: 'medium', color: { argb: 'FF0A5450' } },
      right: { style: 'thin', color: { argb: 'FF0A5450' } },
    };
  }

  // Set initial column widths & track max content length for dynamic sizing
  const colWidths: number[] = columns.map((c) => c.width || Math.max(c.header.length + 4, 12));

  // 6. Data Rows
  const currencyTotals: Record<number, number> = {};

  data.forEach((row, rowIdx) => {
    currentRow++;
    const rowValues = columns.map((col, colIdx) => {
      const val = getCellValue(row, col);
      const isCurr = isColumnCurrency(col);

      if (val === null || val === undefined) {
        return '-';
      }

      // Track currency sums
      if (isCurr) {
        const numVal = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.-]+/g, '')) || 0;
        currencyTotals[colIdx + 1] = (currencyTotals[colIdx + 1] || 0) + numVal;
        return numVal;
      }

      // Track max length for width adjustment
      const strLen = String(val).length;
      if (strLen + 3 > colWidths[colIdx]) {
        colWidths[colIdx] = Math.min(strLen + 3, 50); // cap max width at 50
      }

      return val;
    });

    const addedRow = worksheet.addRow(rowValues);
    addedRow.height = 20;

    const isEven = rowIdx % 2 === 0;

    columns.forEach((col, cIdx) => {
      const cell = addedRow.getCell(cIdx + 1);
      const isCurr = isColumnCurrency(col);
      cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF1E293B' } };

      // Subtle zebra striping
      if (!isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }

      // Borders
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Alignment
      const defaultAlign = isCurr
        ? 'right'
        : typeof cell.value === 'number'
        ? 'center'
        : col.align || 'left';

      cell.alignment = {
        vertical: 'middle',
        horizontal: defaultAlign,
      };

      // Currency number format
      if (isCurr && typeof cell.value === 'number') {
        cell.numFmt = '"Rp "#,##0';
      }
    });
  });

  // 7. AutoFilter on Header Row (MANDATORY per user request)
  worksheet.autoFilter = {
    from: { row: tableHeaderRowIndex, column: 1 },
    to: { row: tableHeaderRowIndex, column: totalCols },
  };

  // 8. Freeze Pane (Headers stay fixed when scrolling down)
  worksheet.views = [
    {
      state: 'frozen',
      ySplit: tableHeaderRowIndex,
      activeCell: `A${tableHeaderRowIndex + 1}`,
    },
  ];

  // 9. Summary / Total Row at the bottom
  const hasCurrencyCols = columns.some((c) => isColumnCurrency(c));
  if (hasCurrencyCols || data.length > 0) {
    currentRow++;
    const totalRowValues: any[] = [];
    columns.forEach((col, colIdx) => {
      const isCurr = isColumnCurrency(col);
      if (colIdx === 0) {
        totalRowValues.push('TOTAL KESELURUHAN');
      } else if (isCurr) {
        totalRowValues.push(currencyTotals[colIdx + 1] || 0);
      } else {
        totalRowValues.push('');
      }
    });

    const totalRow = worksheet.addRow(totalRowValues);
    totalRow.height = 24;

    columns.forEach((col, cIdx) => {
      const cell = totalRow.getCell(cIdx + 1);
      const isCurr = isColumnCurrency(col);
      cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF0F7A73' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F4F1' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF0F7A73' } },
        bottom: { style: 'double', color: { argb: 'FF0F7A73' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (isCurr && typeof cell.value === 'number') {
        cell.numFmt = '"Rp "#,##0';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (cIdx === 0) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  }

  // Apply column widths
  colWidths.forEach((w, idx) => {
    worksheet.getColumn(idx + 1).width = w;
  });

  // Write and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  a.download = `${cleanFilename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Generate official printable HTML for PDF archiving
 * - Pure vector data table
 * - Official letterhead (Kop Surat) with Logo
 * - Business metadata and timestamp
 * - Repeating thead on every page
 * - Formal signature and stamp block
 * - Official running footer
 */
export function generateBusinessPdfHtml(options: BusinessExportOptions): string {
  const {
    data,
    columns,
    title,
    documentTitle,
    subtitle,
    documentSubtitle,
    documentNumber,
    periodLabel,
    metadata = [],
    summaryMetrics = [],
    orientation = columns.length > 6 ? 'landscape' : 'portrait',
    signerName = 'Lia (Finance Admin)',
    signerTitle = 'Petugas Administrasi & Kas',
    approverName = 'Pimpinan Operasional',
    approverTitle = 'Kepala Cabang Palembang',
  } = options;

  const effectiveTitle = title || documentTitle || 'LAPORAN DOKUMEN';
  const effectiveSubtitle = subtitle || documentSubtitle;

  const logoUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/assets/logo-amdri-landscape.png`
      : '/assets/logo-amdri-landscape.png';

  const stampUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/assets/cap-amanah.png`
      : '/assets/cap-amanah.png';

  const dateNowWib = getCurrentWibTimestamp();
  const docNumber =
    documentNumber ||
    `AD-RPT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(
      new Date().getDate()
    ).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Table Headers
  const theadHtml = columns
    .map((c) => {
      const isCurr = isColumnCurrency(c);
      const alignClass = isCurr ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left';
      const widthAttr = c.pdfWidth ? `style="width: ${c.pdfWidth};"` : '';
      return `<th ${widthAttr} class="py-2 px-2.5 text-xs font-bold text-white uppercase tracking-wider ${alignClass}">${escapeHtml(
        c.header
      )}</th>`;
    })
    .join('');

  // Table Rows
  const currencySums: Record<number, number> = {};

  const rowsHtml = data
    .map((row, idx) => {
      const isEven = idx % 2 === 0;
      const rowBg = isEven ? 'bg-white' : 'bg-slate-50';

      const cellsHtml = columns
        .map((col, cIdx) => {
          const val = getCellValue(row, col);
          const isCurr = isColumnCurrency(col);

          let formattedText = '-';
          if (val !== null && val !== undefined) {
            if (isCurr) {
              const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.-]+/g, '')) || 0;
              currencySums[cIdx] = (currencySums[cIdx] || 0) + num;
              formattedText = formatRupiah(num);
            } else {
              formattedText = escapeHtml(val);
            }
          }

          const alignClass = isCurr ? 'text-right font-semibold tabular-nums' : col.align === 'center' ? 'text-center' : 'text-left';

          // Status badge detection for clean styling
          let content = formattedText;
          const lowerVal = String(val || '').toLowerCase();
          if (
            ['lunas', 'selesai', 'terjadwal', 'aktif', 'berjalan', 'belum bayar', 'dp', 'batal'].some((s) =>
              lowerVal.includes(s)
            )
          ) {
            let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
            if (lowerVal.includes('lunas') || lowerVal.includes('selesai') || lowerVal.includes('aktif')) {
              badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
            } else if (lowerVal.includes('dp') || lowerVal.includes('terjadwal') || lowerVal.includes('berjalan')) {
              badgeStyle = 'bg-blue-50 text-blue-800 border-blue-300 font-bold';
            } else if (lowerVal.includes('belum bayar') || lowerVal.includes('batal')) {
              badgeStyle = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
            }
            content = `<span class="inline-block px-2 py-0.5 text-[10px] rounded border ${badgeStyle}">${formattedText}</span>`;
          }

          return `<td class="py-1.5 px-2.5 text-xs text-slate-800 border-b border-slate-200 ${alignClass}">${content}</td>`;
        })
        .join('');

      return `<tr class="${rowBg} hover:bg-slate-100 transition-colors">${cellsHtml}</tr>`;
    })
    .join('');

  // Summary row if currency columns exist
  const hasCurrency = columns.some((c) => isColumnCurrency(c));
  let summaryRowHtml = '';
  if (hasCurrency) {
    const summaryCells = columns
      .map((col, cIdx) => {
        const isCurr = isColumnCurrency(col);
        if (cIdx === 0) {
          return `<td class="py-2 px-2.5 text-xs font-bold text-slate-900 border-t-2 border-b-2 border-slate-900 text-left">TOTAL (${data.length} DATA)</td>`;
        }
        if (isCurr) {
          return `<td class="py-2 px-2.5 text-xs font-extrabold text-teal-800 border-t-2 border-b-2 border-slate-900 text-right tabular-nums">${formatRupiah(
            currencySums[cIdx] || 0
          )}</td>`;
        }
        return `<td class="py-2 px-2.5 text-xs border-t-2 border-b-2 border-slate-900"></td>`;
      })
      .join('');
    summaryRowHtml = `<tr class="bg-teal-50/60 font-bold">${summaryCells}</tr>`;
  }

  // Summary Metrics Banner HTML
  const metricsHtml =
    summaryMetrics.length > 0
      ? `
      <div style="display: grid; grid-template-columns: repeat(${Math.min(
        summaryMetrics.length,
        4
      )}, 1fr); gap: 10px; margin: 10px 0; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
        ${summaryMetrics
          .map((sm) => {
            const valStr = typeof sm.value === 'number' ? formatRupiah(sm.value) : sm.value;
            return `
            <div>
              <div style="font-size: 9px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(
                sm.label
              )}</div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeHtml(valStr)}</div>
            </div>
          `;
          })
          .join('')}
      </div>
    `
      : '';

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)} - Amanah Drive</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    @page {
      size: A4 ${orientation};
      margin: 12mm 10mm 15mm 10mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      background: #ffffff;
      color: #0f172a;
      font-size: 11px;
      line-height: 1.4;
      padding: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }

    thead {
      display: table-header-group;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    tfoot {
      display: table-footer-group;
    }

    .letterhead-border {
      border-bottom: 2.5px solid #0F7A73;
      margin-bottom: 2px;
    }
    .letterhead-border-sub {
      border-bottom: 0.8px solid #94A3B8;
      margin-bottom: 12px;
    }
  </style>
</head>
<body style="padding: 16px;">

  <!-- 1. KOP SURAT RESMI BISNIS -->
  <header style="margin-bottom: 12px;">
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 10px;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <img 
          src="${logoUrl}" 
          alt="Logo Amanah Drive" 
          style="height: 48px; object-fit: contain;" 
          onerror="this.style.display='none'"
        />
        <div>
          <h1 style="font-size: 18px; font-weight: 800; color: #0F7A73; letter-spacing: -0.02em; margin-bottom: 2px;">
            AMANAH DRIVE PALEMBANG
          </h1>
          <p style="font-size: 10px; font-weight: 600; color: #334155; margin-bottom: 1px;">
            Lembaga Pelatihan Mengemudi Terakreditasi &amp; Komprehensif
          </p>
          <p style="font-size: 9px; color: #64748B;">
            Jl. MP. Mangkunegara No. 12, 8 Ilir, Palembang | Telp/WA: 0812-7800-8888 | Email: amanahdrive.plg@gmail.com
          </p>
        </div>
      </div>
      <div style="text-align: right; min-width: 180px;">
        <div style="font-size: 8.5px; font-weight: 700; color: #0F7A73; text-transform: uppercase; letter-spacing: 1px;">
          DOKUMEN RESMI INTERNAL
        </div>
        <div style="font-size: 10px; font-family: monospace; font-weight: bold; color: #1E293B; margin-top: 2px;">
          ${docNumber}
        </div>
        <div style="font-size: 9px; color: #64748B; margin-top: 1px;">
          Klasifikasi: Confidential / Finansial
        </div>
      </div>
    </div>
    <div class="letterhead-border"></div>
    <div class="letterhead-border-sub"></div>
  </header>

  <!-- 2. JUDUL DOKUMEN & METADATA ADMINISTRASI -->
  <section style="margin-bottom: 14px;">
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">
      <div>
        <h2 style="font-size: 14px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: -0.01em;">
          ${escapeHtml(title)}
        </h2>
        ${
          subtitle
            ? `<p style="font-size: 10px; color: #475569; margin-top: 2px;">${escapeHtml(subtitle)}</p>`
            : ''
        }
      </div>
      <div style="text-align: right; font-size: 10px; color: #475569; line-height: 1.5;">
        ${periodLabel ? `<div><strong>Periode:</strong> ${escapeHtml(periodLabel)}</div>` : ''}
        <div><strong>Waktu Cetak:</strong> ${dateNowWib}</div>
        <div><strong>Total Rekod:</strong> ${data.length} Data</div>
      </div>
    </div>

    ${metricsHtml}
  </section>

  <!-- 3. TABEL DATA RESMI -->
  <main style="margin-bottom: 20px;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #0F7A73;">
          ${theadHtml}
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        ${summaryRowHtml}
      </tbody>
    </table>
  </section>

  <!-- 4. PENGESAHAN & TANDA TANGAN RESMI BISNIS -->
  <section style="page-break-inside: avoid; margin-top: 24px; padding-top: 12px; border-top: 1px dashed #CBD5E1;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0 20px;">
      <!-- Kolom Tanda Tangan Pembuat -->
      <div style="text-align: center; width: 220px;">
        <div style="font-size: 10px; color: #64748B; margin-bottom: 4px;">Dibuat Oleh,</div>
        <div style="font-size: 10.5px; font-weight: 700; color: #0F172A;">${escapeHtml(signerTitle)}</div>
        <div style="height: 60px;"></div>
        <div style="font-size: 11px; font-weight: 800; color: #0F172A; border-bottom: 1px solid #334155; padding-bottom: 2px;">
          ${escapeHtml(signerName)}
        </div>
        <div style="font-size: 9px; color: #64748B; margin-top: 2px;">Petugas Operasional &amp; Kas</div>
      </div>

      <!-- Kolom Tanda Tangan Mengetahui & Cap Stempel -->
      <div style="text-align: center; width: 240px; position: relative;">
        <div style="font-size: 10px; color: #64748B; margin-bottom: 4px;">Palembang, ${formatDateIndo(
          getTodayDateString()
        )}</div>
        <div style="font-size: 10.5px; font-weight: 700; color: #0F172A;">Mengetahui,</div>
        <div style="height: 60px; position: relative;">
          <!-- Official Company Stamp -->
          <img 
            src="${stampUrl}" 
            alt="Cap Amanah" 
            style="position: absolute; width: 85px; height: 85px; object-fit: contain; opacity: 0.85; left: 10px; top: -10px; pointer-events: none;"
            onerror="this.style.display='none'"
          />
        </div>
        <div style="font-size: 11px; font-weight: 800; color: #0F172A; border-bottom: 1px solid #334155; padding-bottom: 2px;">
          ${escapeHtml(approverName)}
        </div>
        <div style="font-size: 9px; color: #64748B; margin-top: 2px;">${escapeHtml(approverTitle)}</div>
      </div>
    </div>
  </section>

  <!-- 5. FOOTER RESMI SETIAP HALAMAN -->
  <footer style="margin-top: 24px; padding-top: 8px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #94A3B8;">
    <div>
      Amanah Drive Management System • Dokumen Resmi Internal Perusahaan • Salinan Asli
    </div>
    <div>
      Dicetak secara otomatis pada ${dateNowWib}
    </div>
  </footer>

</body>
</html>
  `;
}

/**
 * Executes high-fidelity isolated PDF printing/saving
 * Injects HTML into an invisible iframe, isolates it from all web UI containers,
 * and triggers window.print() inside the iframe context.
 */
export function exportToBusinessPdf(options: BusinessExportOptions): Promise<void> {
  return new Promise((resolve) => {
    const html = generateBusinessPdfHtml(options);

    // Create isolated hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    iframe.setAttribute('aria-hidden', 'true');

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      // Fallback: popup window
      const printWindow = window.open('', '_blank', 'width=900,height=1000');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          resolve();
        }, 500);
      }
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Error invoking iframe print:', err);
      } finally {
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
          resolve();
        }, 1500);
      }
    };

    // Ensure resources (like logo and fonts) are loaded before calling print
    if (iframe.contentWindow) {
      iframe.contentWindow.onload = () => {
        setTimeout(triggerPrint, 350);
      };
      // Timeout safety fallback in case onload already fired
      setTimeout(triggerPrint, 800);
    } else {
      setTimeout(triggerPrint, 500);
    }
  });
}
