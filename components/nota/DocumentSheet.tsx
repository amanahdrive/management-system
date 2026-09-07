'use client';

import React from 'react';

export interface DocumentSheetProps {
  isA4: boolean;
  children: React.ReactNode;
  pageIndex?: number;
  totalPages?: number;
  sheetRef?: React.Ref<HTMLDivElement>;
  zoomScale?: number;
  className?: string;
}

/**
 * DocumentSheet Component
 * Strictly enforces physical page dimensions:
 * - A4 Portrait: 210mm × 297mm (Safe area margins: 10mm)
 * - A5 Landscape: 210mm × 148mm (Safe area margins: 8mm)
 *
 * Provides physical accuracy in print, PDF rasterization, and responsive on-screen preview.
 */
export function DocumentSheet({
  isA4,
  children,
  pageIndex,
  totalPages,
  sheetRef,
  zoomScale = 1,
  className = '',
}: DocumentSheetProps) {
  // Physical measurements in millimeters
  const widthMm = '210mm';
  const heightMm = isA4 ? '297mm' : '148mm';
  const paddingMm = isA4 ? '10mm 12mm' : '8mm 10mm';

  return (
    <div
      ref={sheetRef}
      data-page-index={pageIndex}
      data-total-pages={totalPages}
      style={{
        width: widthMm,
        height: heightMm,
        minWidth: widthMm,
        minHeight: heightMm,
        maxWidth: widthMm,
        maxHeight: heightMm,
        padding: paddingMm,
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        transform: zoomScale !== 1 ? `scale(${zoomScale})` : undefined,
        transformOrigin: 'top center',
      }}
      className={`print-sheet relative flex flex-col justify-between select-text shrink-0 text-slate-900 shadow-2xl border border-slate-300 rounded-xs overflow-hidden print:shadow-none print:border-none print:m-0 print:rounded-none ${className}`}
    >
      {children}

      {/* Global CSS for Physical Print Accuracy */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${isA4 ? '210mm 297mm' : '210mm 148mm'};
            margin: 0;
          }

          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide all non-printable UI */
          header, nav, aside, .no-print, [role="navigation"] {
            display: none !important;
          }

          .print-sheet {
            width: ${widthMm} !important;
            height: ${heightMm} !important;
            min-height: ${heightMm} !important;
            max-height: ${heightMm} !important;
            margin: 0 !important;
            padding: ${paddingMm} !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
