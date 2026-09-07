'use client';

import React from 'react';
import {
  NotaData,
  getJenisInfo,
  toInvoiceData,
  toReceiptData,
  paginateInvoice,
  paginateReceipt,
  PaginatedPage,
  InvoiceDocumentData,
  ReceiptDocumentData,
} from '@/lib/utils/nota-generator';
import { DocumentSheet } from '@/components/nota/DocumentSheet';
import { InvoiceA4Template } from '@/components/nota/InvoiceA4Template';
import { ReceiptA5Template } from '@/components/nota/ReceiptA5Template';

export interface NotaDocumentPaperProps {
  notaData: NotaData;
  logoBase64: string;
  stampBase64: string;
  zoomScale?: number;
  documentPaperRef?: React.Ref<HTMLDivElement>;
  activePageIndex?: number; // Optional 1-indexed page. If undefined, renders all pages stacked
  onTotalPagesChange?: (total: number) => void;
  className?: string;
}

/**
 * Canonical Document Paper Component
 * Single source of truth for rendering invoices (A4 Portrait) and receipts (A5 Landscape)
 * Supports height-aware automatic pagination and exact physical dimensions.
 */
export function NotaDocumentPaper({
  notaData,
  logoBase64,
  stampBase64,
  zoomScale = 1,
  documentPaperRef,
  activePageIndex,
  onTotalPagesChange,
  className = '',
}: NotaDocumentPaperProps) {
  const docInfo = getJenisInfo(notaData.jenis);
  const isA4 = docInfo.isA4;

  // Calculate pages based on document type
  const { invoicePages, receiptPages, totalPages } = React.useMemo(() => {
    if (isA4) {
      const invData = toInvoiceData(notaData);
      const pages = paginateInvoice(invData);
      return { invoicePages: pages, receiptPages: [], totalPages: pages.length };
    } else {
      const recData = toReceiptData(notaData);
      const pages = paginateReceipt(recData);
      return { invoicePages: [], receiptPages: pages, totalPages: pages.length };
    }
  }, [notaData, isA4]);

  // Notify parent component of total pages count
  React.useEffect(() => {
    if (onTotalPagesChange) {
      onTotalPagesChange(totalPages);
    }
  }, [totalPages, onTotalPagesChange]);

  // Filter pages to display if activePageIndex is specified (1-indexed)
  const displayedInvoicePages = React.useMemo(() => {
    if (activePageIndex && activePageIndex > 0 && activePageIndex <= invoicePages.length) {
      return [invoicePages[activePageIndex - 1]];
    }
    return invoicePages;
  }, [invoicePages, activePageIndex]);

  const displayedReceiptPages = React.useMemo(() => {
    if (activePageIndex && activePageIndex > 0 && activePageIndex <= receiptPages.length) {
      return [receiptPages[activePageIndex - 1]];
    }
    return receiptPages;
  }, [receiptPages, activePageIndex]);

  return (
    <div
      ref={documentPaperRef}
      className={`print-root flex flex-col items-center gap-6 select-text ${className}`}
    >
      {isA4
        ? displayedInvoicePages.map((page) => (
            <div key={page.pageIndex} className="relative flex flex-col items-center">
              {totalPages > 1 && (
                <div className="mb-2 text-[10px] font-bold text-slate-500 bg-slate-200/90 dark:bg-slate-800 dark:text-slate-300 px-3 py-0.5 rounded-full shadow-xs print:hidden">
                  Halaman {page.pageIndex} dari {page.totalPages}
                </div>
              )}
              <DocumentSheet
                isA4={true}
                pageIndex={page.pageIndex}
                totalPages={page.totalPages}
                zoomScale={zoomScale}
              >
                <InvoiceA4Template
                  page={page}
                  logoBase64={logoBase64}
                  stampBase64={stampBase64}
                />
              </DocumentSheet>
            </div>
          ))
        : displayedReceiptPages.map((page) => (
            <div key={page.pageIndex} className="relative flex flex-col items-center">
              {totalPages > 1 && (
                <div className="mb-2 text-[10px] font-bold text-slate-500 bg-slate-200/90 dark:bg-slate-800 dark:text-slate-300 px-3 py-0.5 rounded-full shadow-xs print:hidden">
                  Halaman {page.pageIndex} dari {page.totalPages}
                </div>
              )}
              <DocumentSheet
                isA4={false}
                pageIndex={page.pageIndex}
                totalPages={page.totalPages}
                zoomScale={zoomScale}
              >
                <ReceiptA5Template
                  page={page}
                  logoBase64={logoBase64}
                  stampBase64={stampBase64}
                />
              </DocumentSheet>
            </div>
          ))}
    </div>
  );
}
