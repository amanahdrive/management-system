// lib/utils/nota-generator.ts
// Generator dokumen resmi Nota & Invoice Amanah Drive Palembang
// Arsitektur: Single Canonical Document Source + Physical mm Invariants + Height-Aware Pagination

import { formatRupiah, terbilangRupiah } from './currency';
import { formatDateLongIndo, formatDateIndo } from './date';

export type NotaJenis =
  | 'nota_dp'
  | 'nota_pelunasan'
  | 'nota_pembayaran'
  | 'nota_tagihan'
  | 'invoice_tagihan';

export interface BusinessConfig {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  city: string;
  bankInfo: string;
  brandColor: string;
  brandDark: string;
}

export const businessConfig: BusinessConfig = {
  name: 'AMANAH DRIVE',
  tagline: 'LEMBAGA KURSUS MENGEMUDI & KELAYAKAN BERKENDARA',
  address: 'Jl. Macan Kumbang XVIII, Siring Agung, Kec. Ilir Barat I, Kota Palembang, Sumatera Selatan 30153',
  phone: '0813-7790-961',
  email: 'amanahdrive.plg@gmail.com',
  website: 'https://management-amanahdrive.vercel.app',
  city: 'Palembang',
  bankInfo: 'Bank BCA: 123-456-7890 a.n. Amanah Drive',
  brandColor: '#0F7A73',
  brandDark: '#0B2545',
};

export const COMPANY_INFO = businessConfig;

export interface InvoiceItem {
  no: number;
  uraian: string;
  keterangan?: string;
  qty: string | number;
  nominal: number;
  isDiscount?: boolean;
}

export interface InvoiceDocumentData {
  nomorInvoice: string;
  tanggalInvoice: string;
  statusPembayaran: 'lunas' | 'dp' | 'belum_bayar';
  
  // Data Siswa
  namaSiswa: string;
  kodeSiswa: string;
  noWhatsapp: string;
  alamatSiswa: string;

  // Detail Booking
  namaPaket: string;
  jumlahSesi: number;
  tipeMobil: string;
  jadwalLatihan?: string;
  namaInstruktur?: string;
  tanggalMulai?: string;

  // Items & Finansial
  items: InvoiceItem[];
  hargaPaket: number;
  diskonNominal: number;
  totalTagihanBersih: number;
  dpTerbayar: number;
  nominalBayarIni: number;
  sisaPiutang: number;

  // Pembayaran & Otorisasi
  metodePembayaran: 'tunai' | 'transfer' | 'qris';
  namaBank?: string;
  catatan?: string;
  syaratKetentuan?: string[];
  kota: string;
  picNama: string;
  picJabatan: string;
  showStempel: boolean;
}

export interface ReceiptDocumentData {
  jenis: 'nota_dp' | 'nota_pelunasan' | 'nota_pembayaran' | 'nota_tagihan';
  nomorNota: string;
  tanggalNota: string;
  statusPembayaran: 'lunas' | 'dp' | 'belum_bayar';

  // Customer
  namaSiswa: string;
  kodeSiswa: string;
  noWhatsapp: string;
  alamatSiswa?: string;

  // Paket & Sesi
  namaPaket: string;
  jumlahSesi: number;
  tipeMobil: string;

  // Table items
  items: InvoiceItem[];
  hargaPaket: number;
  diskonNominal: number;
  totalTagihanBersih: number;
  dpTerbayar: number;
  nominalBayarIni: number;
  sisaPiutang: number;

  // Pembayaran & Otorisasi
  metodePembayaran: 'tunai' | 'transfer' | 'qris';
  namaBank?: string;
  catatanPembayaran?: string;
  kota: string;
  picNama: string;
  picJabatan: string;
  showStempel: boolean;
}

/**
 * Unified data interface for state management across components
 */
export interface NotaData {
  jenis: NotaJenis;
  nomorDokumen: string;
  tanggalDokumen: string; // YYYY-MM-DD

  // Data Siswa
  namaSiswa: string;
  kodeSiswa: string;
  noWhatsapp: string;
  alamatSiswa: string;

  // Data Paket / Kursus
  namaPaket: string;
  jumlahSesi: number;
  tipeMobil: string;
  catatanPaket?: string;
  namaInstruktur?: string;
  tanggalMulai?: string;

  // Rincian Biaya
  hargaPaket: number;
  diskonNominal: number;
  totalTagihanBersih: number;
  dpTerbayar: number;
  nominalBayarIni: number;
  sisaPiutang: number;

  // Pembayaran
  metodePembayaran: 'tunai' | 'transfer' | 'qris';
  namaBank?: string;
  catatanPembayaran?: string;

  // Otorisasi / Tanda Tangan
  kota: string;
  picNama: string;
  picJabatan: string;
  showStempel: boolean;

  // Multi-items support (if custom)
  customItems?: InvoiceItem[];
}

export function getJenisInfo(jenis: NotaJenis): {
  title: string;
  badge: string;
  isA4: boolean;
  paperSize: string;
  description: string;
} {
  switch (jenis) {
    case 'nota_dp':
      return {
        title: 'NOTA PEMBAYARAN DP (UANG MUKA)',
        badge: 'DP TERBAYAR',
        isA4: false,
        paperSize: 'A5 Landscape (210 × 148 mm)',
        description: 'Bukti pembayaran uang muka kursus mengemudi',
      };
    case 'nota_pelunasan':
      return {
        title: 'NOTA PELUNASAN KURSUS',
        badge: 'LUNAS',
        isA4: false,
        paperSize: 'A5 Landscape (210 × 148 mm)',
        description: 'Bukti pelunasan pembayaran biaya kursus',
      };
    case 'nota_pembayaran':
      return {
        title: 'KWITANSI / BUKTI PEMBAYARAN',
        badge: 'PEMBAYARAN',
        isA4: false,
        paperSize: 'A5 Landscape (210 × 148 mm)',
        description: 'Kwitansi bukti pembayaran umum / angsuran',
      };
    case 'nota_tagihan':
      return {
        title: 'NOTA RINCIAN TAGIHAN & PIUTANG',
        badge: 'TAGIHAN',
        isA4: false,
        paperSize: 'A5 Landscape (210 × 148 mm)',
        description: 'Rincian sisa tagihan piutang kursus siswa',
      };
    case 'invoice_tagihan':
      return {
        title: 'INVOICE / TAGIHAN BOOKING KURSUS',
        badge: 'INVOICE RESMI',
        isA4: true,
        paperSize: 'A4 Portrait (210 × 297 mm)',
        description: 'Invoice resmi tagihan pelatihan kursus mengemudi',
      };
  }
}

export function generateNomorDokumen(jenis: NotaJenis): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 900) + 100);

  switch (jenis) {
    case 'nota_dp':
      return `NDP/AD/${y}${m}${d}/${rand}`;
    case 'nota_pelunasan':
      return `NPL/AD/${y}${m}${d}/${rand}`;
    case 'nota_pembayaran':
      return `KWT/AD/${y}${m}${d}/${rand}`;
    case 'nota_tagihan':
      return `TGH/AD/${y}${m}${d}/${rand}`;
    case 'invoice_tagihan':
      return `INV/AD/${y}${m}${d}/${rand}`;
  }
}

/**
 * Standard invoice items builder based on data
 */
export function buildStandardItems(data: NotaData): InvoiceItem[] {
  if (data.customItems && data.customItems.length > 0) {
    return data.customItems;
  }

  const items: InvoiceItem[] = [
    {
      no: 1,
      uraian: data.namaPaket || 'Paket Pelatihan Mengemudi',
      keterangan: `${data.jumlahSesi || 0} Sesi Pertemuan • Transmisi ${data.tipeMobil || 'Manual'}`,
      qty: '1 Paket',
      nominal: data.hargaPaket || 0,
    },
  ];

  if (data.diskonNominal > 0) {
    items.push({
      no: 2,
      uraian: 'Potongan Diskon Promosi',
      keterangan: 'Diskon program pendaftaran kursus',
      qty: '-',
      nominal: -data.diskonNominal,
      isDiscount: true,
    });
  }

  return items;
}

export const DEFAULT_TERMS_AND_CONDITIONS = [
  'Jadwal sesi latihan dikoordinasikan bersama Instruktur/Admin minimal 1 hari (H-1) sebelum jadwal dimulai.',
  'Pembatalan atau reschedule sesi wajib diinformasikan minimal 12 jam sebelum waktu sesi.',
  'Siswa wajib mematuhi protokol keselamatan berkendara dan instruksi resmi dari Instruktur Amanah Drive.',
  'Pelunasan sisa tagihan wajib diselesaikan paling lambat pada pertemuan sesi ke-3 latihan mengemudi.',
];

/**
 * Convert unified NotaData to InvoiceDocumentData (A4 Portrait)
 */
export function toInvoiceData(data: NotaData): InvoiceDocumentData {
  const items = buildStandardItems(data);
  const positiveSubtotal = items
    .filter((it) => !it.isDiscount && (Number(it.nominal) || 0) >= 0)
    .reduce((acc, it) => acc + (Number(it.nominal) || 0), 0);
  const discountSubtotal = items
    .filter((it) => it.isDiscount || (Number(it.nominal) || 0) < 0)
    .reduce((acc, it) => acc + Math.abs(Number(it.nominal) || 0), 0) + (Number(data.diskonNominal) || 0);

  const totalTagihanBersih =
    data.totalTagihanBersih !== undefined && !isNaN(data.totalTagihanBersih)
      ? data.totalTagihanBersih
      : Math.max(0, positiveSubtotal - discountSubtotal);

  const dpTerbayar = Number(data.dpTerbayar) || 0;
  const nominalBayarIni = Number(data.nominalBayarIni) || 0;
  const sisaPiutang =
    data.sisaPiutang !== undefined && !isNaN(data.sisaPiutang)
      ? data.sisaPiutang
      : Math.max(0, totalTagihanBersih - (dpTerbayar + nominalBayarIni));

  const statusPembayaran: 'lunas' | 'dp' | 'belum_bayar' =
    sisaPiutang <= 0
      ? 'lunas'
      : dpTerbayar > 0 || nominalBayarIni > 0
      ? 'dp'
      : 'belum_bayar';

  return {
    nomorInvoice: data.nomorDokumen,
    tanggalInvoice: data.tanggalDokumen,
    statusPembayaran,
    namaSiswa: data.namaSiswa,
    kodeSiswa: data.kodeSiswa,
    noWhatsapp: data.noWhatsapp,
    alamatSiswa: data.alamatSiswa,
    namaPaket: data.namaPaket,
    jumlahSesi: data.jumlahSesi,
    tipeMobil: data.tipeMobil,
    jadwalLatihan: data.catatanPaket,
    namaInstruktur: data.namaInstruktur,
    tanggalMulai: data.tanggalMulai,
    items,
    hargaPaket: positiveSubtotal > 0 ? positiveSubtotal : (data.hargaPaket || 0),
    diskonNominal: discountSubtotal,
    totalTagihanBersih,
    dpTerbayar,
    nominalBayarIni,
    sisaPiutang,
    metodePembayaran: data.metodePembayaran,
    namaBank: data.namaBank,
    catatan: data.catatanPembayaran,
    syaratKetentuan: DEFAULT_TERMS_AND_CONDITIONS,
    kota: data.kota || businessConfig.city,
    picNama: data.picNama,
    picJabatan: data.picJabatan,
    showStempel: data.showStempel,
  };
}

/**
 * Convert unified NotaData to ReceiptDocumentData (A5 Landscape)
 */
export function toReceiptData(data: NotaData): ReceiptDocumentData {
  const items = buildStandardItems(data);
  const positiveSubtotal = items
    .filter((it) => !it.isDiscount && (Number(it.nominal) || 0) >= 0)
    .reduce((acc, it) => acc + (Number(it.nominal) || 0), 0);
  const discountSubtotal = items
    .filter((it) => it.isDiscount || (Number(it.nominal) || 0) < 0)
    .reduce((acc, it) => acc + Math.abs(Number(it.nominal) || 0), 0) + (Number(data.diskonNominal) || 0);

  const totalTagihanBersih =
    data.totalTagihanBersih !== undefined && !isNaN(data.totalTagihanBersih)
      ? data.totalTagihanBersih
      : Math.max(0, positiveSubtotal - discountSubtotal);

  const dpTerbayar = Number(data.dpTerbayar) || 0;
  const nominalBayarIni = Number(data.nominalBayarIni) || 0;
  const sisaPiutang =
    data.sisaPiutang !== undefined && !isNaN(data.sisaPiutang)
      ? data.sisaPiutang
      : Math.max(0, totalTagihanBersih - (dpTerbayar + nominalBayarIni));

  const statusPembayaran: 'lunas' | 'dp' | 'belum_bayar' =
    sisaPiutang <= 0
      ? 'lunas'
      : dpTerbayar > 0 || nominalBayarIni > 0
      ? 'dp'
      : 'belum_bayar';

  const jenisNota =
    data.jenis === 'invoice_tagihan'
      ? nominalBayarIni > 0
        ? 'nota_pembayaran'
        : 'nota_tagihan'
      : (data.jenis as 'nota_dp' | 'nota_pelunasan' | 'nota_pembayaran' | 'nota_tagihan');

  return {
    jenis: jenisNota,
    nomorNota: data.nomorDokumen,
    tanggalNota: data.tanggalDokumen,
    statusPembayaran,
    namaSiswa: data.namaSiswa,
    kodeSiswa: data.kodeSiswa,
    noWhatsapp: data.noWhatsapp,
    alamatSiswa: data.alamatSiswa,
    namaPaket: data.namaPaket,
    jumlahSesi: data.jumlahSesi,
    tipeMobil: data.tipeMobil,
    items,
    hargaPaket: positiveSubtotal > 0 ? positiveSubtotal : (data.hargaPaket || 0),
    diskonNominal: discountSubtotal,
    totalTagihanBersih,
    dpTerbayar,
    nominalBayarIni,
    sisaPiutang,
    metodePembayaran: data.metodePembayaran,
    namaBank: data.namaBank,
    catatanPembayaran: data.catatanPembayaran,
    kota: data.kota || businessConfig.city,
    picNama: data.picNama,
    picJabatan: data.picJabatan,
    showStempel: data.showStempel,
  };
}

// ========================================================
// HEIGHT-AWARE PAGINATION ENGINE
// ========================================================

export interface PaginatedPage<T> {
  pageIndex: number; // 1-indexed
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  data: T;
  pageItems: InvoiceItem[];
  showKop: boolean;
  showSummary: boolean;
  showSignature: boolean;
  showTerms: boolean;
}

/**
 * Paginates Invoice A4 Portrait
 * Threshold: Max 6 rows on Page 1 if single page.
 * If > 6 rows or long terms, Page 1 gets Kop + items (up to 8 rows),
 * and Page 2 gets running header + remaining items + summary + terms + signatures!
 */
export function paginateInvoice(data: InvoiceDocumentData): PaginatedPage<InvoiceDocumentData>[] {
  const items = data.items;
  const maxSinglePageItems = 6;
  const maxPage1ItemsIfMulti = 8;
  const maxPage2Items = 10;

  if (items.length <= maxSinglePageItems) {
    return [
      {
        pageIndex: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        data,
        pageItems: items,
        showKop: true,
        showSummary: true,
        showSignature: true,
        showTerms: true,
      },
    ];
  }

  // Multi-page splitting
  const page1Items = items.slice(0, maxPage1ItemsIfMulti);
  const page2Items = items.slice(maxPage1ItemsIfMulti);

  const pages: PaginatedPage<InvoiceDocumentData>[] = [
    {
      pageIndex: 1,
      totalPages: 2,
      isFirstPage: true,
      isLastPage: false,
      data,
      pageItems: page1Items,
      showKop: true,
      showSummary: false,
      showSignature: false,
      showTerms: false,
    },
    {
      pageIndex: 2,
      totalPages: 2,
      isFirstPage: false,
      isLastPage: true,
      data,
      pageItems: page2Items,
      showKop: false, // compact running header
      showSummary: true,
      showSignature: true,
      showTerms: true,
    },
  ];

  return pages;
}

/**
 * Paginates Receipt A5 Landscape
 * A5 Landscape safe printable height: 132mm.
 * Single page threshold: max 3 rows.
 * If > 3 rows, Page 1 gets Kop + Info + first 3 rows.
 * Page 2 gets running header + remaining rows + summary + signatures.
 */
export function paginateReceipt(data: ReceiptDocumentData): PaginatedPage<ReceiptDocumentData>[] {
  const items = data.items;
  const maxSinglePageItems = 3;
  const maxPage1ItemsIfMulti = 4;

  if (items.length <= maxSinglePageItems) {
    return [
      {
        pageIndex: 1,
        totalPages: 1,
        isFirstPage: true,
        isLastPage: true,
        data,
        pageItems: items,
        showKop: true,
        showSummary: true,
        showSignature: true,
        showTerms: false,
      },
    ];
  }

  // Multi-page splitting
  const page1Items = items.slice(0, maxPage1ItemsIfMulti);
  const page2Items = items.slice(maxPage1ItemsIfMulti);

  return [
    {
      pageIndex: 1,
      totalPages: 2,
      isFirstPage: true,
      isLastPage: false,
      data,
      pageItems: page1Items,
      showKop: true,
      showSummary: false,
      showSignature: false,
      showTerms: false,
    },
    {
      pageIndex: 2,
      totalPages: 2,
      isFirstPage: false,
      isLastPage: true,
      data,
      pageItems: page2Items,
      showKop: false,
      showSummary: true,
      showSignature: true,
      showTerms: false,
    },
  ];
}

// ========================================================
// RENDERING & EXPORT SERVICES (CANONICAL)
// ========================================================

/**
 * Download true Multi-Page PDF with exact A4 Portrait or A5 Landscape mm dimensions
 */
export async function downloadMultiPagePdf(
  pageElements: HTMLElement[],
  filename: string,
  isA4: boolean
): Promise<void> {
  if (!pageElements || pageElements.length === 0) {
    throw new Error('Tidak ada elemen halaman dokumen untuk di-generate');
  }

  const { toJpeg } = await import('html-to-image');
  const { jsPDF } = await import('jspdf');

  const widthMm = 210;
  const heightMm = isA4 ? 297 : 148;
  const orientation = isA4 ? 'portrait' : 'landscape';

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm],
    compress: true,
  });

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];
    const prevTransform = el.style.transform;
    let imgData = '';
    try {
      el.style.transform = 'none';
      // High quality 2.5x rasterization ensures crisp text rendering at 250-300 DPI
      imgData = await toJpeg(el, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2.5,
        cacheBust: true,
      });
    } finally {
      el.style.transform = prevTransform;
    }

    if (i > 0) {
      pdf.addPage([widthMm, heightMm], orientation);
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'FAST');
  }

  pdf.save(`${filename}.pdf`);
}

/**
 * Download High-Resolution JPG per page
 */
export async function downloadMultiPageJpg(
  pageElements: HTMLElement[],
  filename: string
): Promise<void> {
  if (!pageElements || pageElements.length === 0) {
    throw new Error('Tidak ada elemen halaman dokumen');
  }

  const { toJpeg } = await import('html-to-image');

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];
    const prevTransform = el.style.transform;
    let dataUrl = '';
    try {
      el.style.transform = 'none';
      dataUrl = await toJpeg(el, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2.5,
        cacheBust: true,
      });
    } finally {
      el.style.transform = prevTransform;
    }

    const link = document.createElement('a');
    link.download = pageElements.length > 1 ? `${filename}_hal${i + 1}.jpg` : `${filename}.jpg`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Copy active document page to Clipboard as PNG blob (WhatsApp ready)
 */
export async function copyPageToClipboard(
  element: HTMLElement
): Promise<{ success: boolean; message?: string }> {
  try {
    const { toBlob } = await import('html-to-image');

    const prevTransform = element.style.transform;
    let blob: Blob | null = null;
    try {
      element.style.transform = 'none';
      blob = await toBlob(element, {
        backgroundColor: '#ffffff',
        pixelRatio: 2.5,
        cacheBust: true,
      });
    } finally {
      element.style.transform = prevTransform;
    }

    if (!blob) {
      return { success: false, message: 'Gagal membuat file gambar dari kanvas' };
    }

    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        return { success: true };
      } catch (clipErr: any) {
        return {
          success: false,
          message: clipErr?.message || 'Izin clipboard ditolak browser',
        };
      }
    } else {
      return {
        success: false,
        message: 'Browser tidak mendukung salin gambar langsung ke clipboard',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal memproses gambar dokumen',
    };
  }
}

/**
 * Native Browser Print Trigger using isolated print CSS
 */
export function executePrint(): void {
  window.print();
}

// Backward Compatibility Aliases
export const printDocument = (_notaData?: any): void => executePrint();
export const downloadDocumentAsPdf = (el: HTMLElement, filename: string, isA4: boolean) =>
  downloadMultiPagePdf([el], filename, isA4);
export const downloadDocumentAsJpg = (el: HTMLElement, filename: string) =>
  downloadMultiPageJpg([el], filename);
export const copyDocumentToClipboard = copyPageToClipboard;

