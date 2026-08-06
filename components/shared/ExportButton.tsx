'use client';

import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import ExcelJS from 'exceljs';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  isCurrency?: boolean;
}

interface ExportButtonProps {
  data: any[];
  columns: ExportColumn[];
  filename: string;
  title?: string;
}

export function ExportButton({ data, columns, filename, title }: ExportButtonProps) {
  const [loadingXlsx, setLoadingXlsx] = React.useState(false);

  const exportXlsx = async () => {
    try {
      setLoadingXlsx(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');

      // Title Header Row
      if (title) {
        worksheet.mergeCells(1, 1, 1, columns.length);
        const titleCell = worksheet.getCell(1, 1);
        titleCell.value = title;
        titleCell.font = { bold: true, size: 14, color: { argb: 'FF0F7A73' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
        worksheet.addRow([]);
      }

      // Column Headers
      const headerRow = worksheet.addRow(columns.map((c) => c.header));
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F7A73' },
      };

      // Set column widths
      columns.forEach((col, idx) => {
        worksheet.getColumn(idx + 1).width = col.width || 20;
      });

      // Data Rows
      data.forEach((row) => {
        const rowData = columns.map((col) => {
          const val = row[col.key];
          return val !== undefined && val !== null ? val : '-';
        });
        const addedRow = worksheet.addRow(rowData);

        // Format borders and currency
        columns.forEach((col, cIdx) => {
          const cell = addedRow.getCell(cIdx + 1);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8E7' } },
            left: { style: 'thin', color: { argb: 'FFE2E8E7' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8E7' } },
            right: { style: 'thin', color: { argb: 'FFE2E8E7' } },
          };
          if (col.isCurrency && typeof cell.value === 'number') {
            cell.numFmt = '"Rp "#,##0';
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export XLSX error:', err);
    } finally {
      setLoadingXlsx(false);
    }
  };

  const exportPdf = () => {
    window.print();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportXlsx}
        disabled={loadingXlsx || !data || data.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 transition-colors disabled:opacity-50"
        title="Export ke Excel"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span>{loadingXlsx ? 'Exporting...' : 'Excel'}</span>
      </button>

      <button
        onClick={exportPdf}
        disabled={!data || data.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 transition-colors disabled:opacity-50"
        title="Export PDF / Cetak"
      >
        <FileText className="w-4 h-4" />
        <span>Cetak PDF</span>
      </button>
    </div>
  );
}
