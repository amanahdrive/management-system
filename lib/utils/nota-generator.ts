// lib/utils/nota-generator.ts
// Generate professional HTML templates for Nota & Invoice documents
// Output: Nota DP, Nota Pelunasan, Nota Pembayaran (A5 Landscape), Invoice Tagihan (A4 Portrait)

import { formatRupiah } from './currency';

// ─── Types ───────────────────────────────────────────────────────
export type NotaJenis = 'nota_dp' | 'nota_pelunasan' | 'nota_pembayaran' | 'invoice_tagihan';

export interface NotaData {
  jenis: NotaJenis;
  nomorDokumen: string;
  tanggalDokumen: string; // YYYY-MM-DD

  // Siswa info
  namaSiswa: string;
  kodeSiswa: string;
  alamatSiswa: string;
  whatsappSiswa: string;

  // Paket info
  namaPaket: string;
  deskripsiPaket: string;

  // Payment info
  hargaPaket: number;
  dpTerbayar: number;
  nominalBayarIni: number;
  metodePembayaran: 'tunai' | 'non_tunai';
  catatan: string;

  // PIC
  picNama: string;
  picJabatan: string;
}

// ─── Constants ───────────────────────────────────────────────────
const COMPANY = {
  name: 'AMANAH DRIVE',
  subtitle: 'KURSUS MENGEMUDI PALEMBANG',
  address: 'Jl. Macan Kumbang XVIII, Siring Agung, Ilir Barat I, Kota Palembang, Sumatera Selatan, 30153',
  phone: '0813-7790-961',
  brand: '#0F7A73',
  brandDark: '#0a5c57',
};

function getLogoUrl(): string {
  return typeof window !== 'undefined' ? `${window.location.origin}/assets/logo-amdri-landscape.png` : '/assets/logo-amdri-landscape.png';
}

function getStampUrl(): string {
  return typeof window !== 'undefined' ? `${window.location.origin}/assets/cap-amanah.png` : '/assets/cap-amanah.png';
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatTanggalPanjang(dateStr: string): string {
  const bulanNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${bulanNames[d.getMonth()]} ${d.getFullYear()}`;
}

function getJenisLabel(jenis: NotaJenis): string {
  switch (jenis) {
    case 'nota_dp': return 'NOTA PEMBAYARAN DP';
    case 'nota_pelunasan': return 'NOTA PELUNASAN';
    case 'nota_pembayaran': return 'NOTA PEMBAYARAN';
    case 'invoice_tagihan': return 'INVOICE TAGIHAN';
  }
}

function getStatusLabel(data: NotaData): { text: string; color: string; bg: string } {
  const totalBayar = data.dpTerbayar + data.nominalBayarIni;
  if (data.jenis === 'invoice_tagihan') {
    const sisa = data.hargaPaket - data.dpTerbayar;
    if (sisa <= 0) return { text: 'LUNAS', color: '#047857', bg: '#d1fae5' };
    if (data.dpTerbayar > 0) return { text: 'DP — BELUM LUNAS', color: '#d97706', bg: '#fef3c7' };
    return { text: 'BELUM BAYAR', color: '#dc2626', bg: '#fee2e2' };
  }
  if (totalBayar >= data.hargaPaket) return { text: 'LUNAS ✓', color: '#047857', bg: '#d1fae5' };
  return { text: 'DP — SISA TAGIHAN', color: '#d97706', bg: '#fef3c7' };
}

// ─── CSS Shared ──────────────────────────────────────────────────
function sharedCss(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      color: #1e293b;
      background: #ffffff;
      line-height: 1.5;
    }
    .kop {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
    }
    .kop-logo { height: 44px; max-width: 180px; object-fit: contain; }
    .kop-right { text-align: right; }
    .kop-company { font-size: 12px; font-weight: 800; color: ${COMPANY.brand}; letter-spacing: -0.2px; }
    .kop-subtitle { font-size: 9.5px; font-weight: 700; color: ${COMPANY.brand}; margin-bottom: 2px; }
    .kop-address { font-size: 8.5px; color: #64748b; line-height: 1.4; }
    .kop-phone { font-size: 9px; font-weight: 700; color: ${COMPANY.brand}; margin-top: 2px; }
    .divider { height: 2.5px; background: ${COMPANY.brand}; border-radius: 1px; }
    .divider-thin { height: 1px; background: #e2e8f0; }
    .doc-title-bar {
      text-align: center;
      padding: 8px 0;
    }
    .doc-title {
      font-size: 14px;
      font-weight: 900;
      color: ${COMPANY.brand};
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .doc-number {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
    }
    .info-row {
      display: flex;
      font-size: 10px;
      line-height: 1.6;
    }
    .info-label {
      width: 130px;
      color: #64748b;
      font-weight: 500;
      flex-shrink: 0;
    }
    .info-sep { width: 12px; text-align: center; color: #94a3b8; flex-shrink: 0; }
    .info-val { font-weight: 600; color: #1e293b; flex: 1; }
    table.detail {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    table.detail th {
      background: ${COMPANY.brand};
      color: white;
      padding: 6px 8px;
      text-align: left;
      font-weight: 700;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.detail th:last-child { text-align: right; }
    table.detail td {
      padding: 5px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    table.detail td:last-child { text-align: right; font-weight: 700; }
    table.detail tr.total-row td {
      font-weight: 800;
      font-size: 11px;
      border-top: 2px solid ${COMPANY.brand};
      padding-top: 8px;
    }
    table.detail tr.summary td {
      font-weight: 600;
      color: #475569;
      font-size: 10px;
    }
    table.detail tr.highlight td {
      background: #f0fdfa;
      font-weight: 800;
      color: ${COMPANY.brand};
      font-size: 11px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .sign-area {
      display: flex;
      justify-content: space-between;
      margin-top: auto;
      padding-top: 12px;
    }
    .sign-box {
      text-align: center;
      width: 45%;
    }
    .sign-title { font-size: 9px; color: #64748b; font-weight: 500; margin-bottom: 4px; }
    .sign-space { height: 50px; position: relative; }
    .sign-name { font-size: 10px; font-weight: 700; color: #1e293b; border-top: 1px solid #1e293b; padding-top: 4px; display: inline-block; min-width: 120px; }
    .stamp-img {
      position: absolute;
      right: 50%;
      transform: translateX(50%);
      top: -10px;
      width: 70px;
      height: 70px;
      object-fit: contain;
      opacity: 0.85;
    }
    .catatan-box {
      padding: 6px 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 9px;
      color: #475569;
    }
    .footer-digital {
      text-align: center;
      font-size: 8px;
      color: #94a3b8;
      padding-top: 8px;
      border-top: 1px dashed #e2e8f0;
    }
  `;
}

// ─── KOP SURAT HTML ──────────────────────────────────────────────
function kopHtml(): string {
  return `
    <div class="kop">
      <div><img src="${getLogoUrl()}" alt="Logo Amanah Drive" class="kop-logo" onerror="this.style.display='none'" /></div>
      <div class="kop-right">
        <div class="kop-company">${COMPANY.name}</div>
        <div class="kop-subtitle">${COMPANY.subtitle}</div>
        <div class="kop-address">${COMPANY.address}</div>
        <div class="kop-phone">Telp/WA: ${COMPANY.phone}</div>
      </div>
    </div>
    <div class="divider"></div>
  `;
}

// ─── NOTA HTML (A5 LANDSCAPE) ────────────────────────────────────
export function generateNotaHtml(data: NotaData): string {
  const status = getStatusLabel(data);
  const totalBayar = data.dpTerbayar + data.nominalBayarIni;
  const sisaTagihan = Math.max(0, data.hargaPaket - totalBayar);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${getJenisLabel(data.jenis)} - ${escapeHtml(data.namaSiswa)}</title>
  <style>
    ${sharedCss()}
    @page {
      size: A5 landscape;
      margin: 8mm;
    }
    body {
      width: 210mm;
      min-height: 148mm;
      max-height: 148mm;
      padding: 10px 14px;
      font-size: 10px;
      display: flex;
      flex-direction: column;
    }
    .content { flex: 1; display: flex; flex-direction: column; }
  </style>
</head>
<body>
  <div class="content">
    ${kopHtml()}

    <div class="doc-title-bar">
      <div class="doc-title">${getJenisLabel(data.jenis)}</div>
      <div class="doc-number">No: ${escapeHtml(data.nomorDokumen)} &nbsp;|&nbsp; Tanggal: ${formatTanggalPanjang(data.tanggalDokumen)}</div>
    </div>
    <div class="divider-thin" style="margin-bottom: 8px;"></div>

    <!-- Info Siswa -->
    <div style="display: flex; gap: 20px; margin-bottom: 8px;">
      <div style="flex: 1;">
        <div class="info-row"><span class="info-label">Diterima Dari</span><span class="info-sep">:</span><span class="info-val">${escapeHtml(data.namaSiswa)} (${escapeHtml(data.kodeSiswa)})</span></div>
        <div class="info-row"><span class="info-label">Paket Kursus</span><span class="info-sep">:</span><span class="info-val">${escapeHtml(data.namaPaket)}</span></div>
        ${data.alamatSiswa ? `<div class="info-row"><span class="info-label">Alamat</span><span class="info-sep">:</span><span class="info-val">${escapeHtml(data.alamatSiswa)}</span></div>` : ''}
      </div>
      <div style="flex: 1;">
        <div class="info-row"><span class="info-label">Tanggal Bayar</span><span class="info-sep">:</span><span class="info-val">${formatTanggalPanjang(data.tanggalDokumen)}</span></div>
        <div class="info-row"><span class="info-label">Metode</span><span class="info-sep">:</span><span class="info-val">${data.metodePembayaran === 'tunai' ? 'Tunai (Cash)' : 'Non-Tunai (Transfer)'}</span></div>
      </div>
    </div>

    <!-- Tabel Rincian -->
    <table class="detail" style="margin-bottom: 8px;">
      <thead>
        <tr>
          <th style="width: 50%;">Uraian</th>
          <th style="width: 50%; text-align: right;">Nominal (Rp)</th>
        </tr>
      </thead>
      <tbody>
        <tr class="summary"><td>Total Harga Paket Kursus</td><td>${formatRupiah(data.hargaPaket)}</td></tr>
        ${data.dpTerbayar > 0 ? `<tr class="summary"><td>DP / Pembayaran Sebelumnya</td><td style="color: #059669;">- ${formatRupiah(data.dpTerbayar)}</td></tr>` : ''}
        ${data.jenis !== 'nota_dp' && data.dpTerbayar > 0 ? `<tr class="summary"><td>Sisa Tagihan Sebelum Bayar</td><td>${formatRupiah(Math.max(0, data.hargaPaket - data.dpTerbayar))}</td></tr>` : ''}
        <tr class="total-row highlight"><td><strong>${data.jenis === 'nota_dp' ? 'Nominal DP Dibayar' : data.jenis === 'nota_pelunasan' ? 'Nominal Pelunasan' : 'Nominal Dibayar'}</strong></td><td>${formatRupiah(data.nominalBayarIni)}</td></tr>
        <tr class="summary"><td>Sisa Tagihan Setelah Pembayaran Ini</td><td style="font-weight: 800; color: ${sisaTagihan <= 0 ? '#059669' : '#dc2626'};">${sisaTagihan <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(sisaTagihan)}</td></tr>
      </tbody>
    </table>

    <!-- Status Badge -->
    <div style="text-align: center; margin-bottom: 6px;">
      <span class="status-badge" style="color: ${status.color}; background: ${status.bg};">${status.text}</span>
    </div>

    ${data.catatan ? `<div class="catatan-box" style="margin-bottom: 6px;"><strong>Catatan:</strong> ${escapeHtml(data.catatan)}</div>` : ''}

    <!-- Tanda Tangan -->
    <div class="sign-area">
      <div class="sign-box">
        <div class="sign-title">Penerima,</div>
        <div class="sign-space"></div>
        <div class="sign-name">${escapeHtml(data.namaSiswa)}</div>
      </div>
      <div style="text-align: center; font-size: 9px; color: #94a3b8; align-self: center;">
        Palembang, ${formatTanggalPanjang(data.tanggalDokumen)}
      </div>
      <div class="sign-box">
        <div class="sign-title">Hormat kami,</div>
        <div class="sign-space">
          <img src="${getStampUrl()}" alt="Cap" class="stamp-img" onerror="this.style.display='none'" />
        </div>
        <div class="sign-name">${escapeHtml(data.picNama)}</div>
        <div style="font-size: 8px; color: #64748b;">${escapeHtml(data.picJabatan)} — Amanah Drive</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── INVOICE HTML (A4 PORTRAIT) ──────────────────────────────────
export function generateInvoiceHtml(data: NotaData): string {
  const status = getStatusLabel(data);
  const sisaTagihan = Math.max(0, data.hargaPaket - data.dpTerbayar);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${escapeHtml(data.namaSiswa)}</title>
  <style>
    ${sharedCss()}
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 15mm 12mm;
    }
    body {
      width: 210mm;
      min-height: 297mm;
      padding: 16px 20px;
      font-size: 11px;
      display: flex;
      flex-direction: column;
    }
    .content { flex: 1; display: flex; flex-direction: column; }
    .kop-logo { height: 52px; max-width: 220px; }
    .kop-company { font-size: 14px; }
    .kop-subtitle { font-size: 11px; }
    .kop-address { font-size: 9.5px; }
    .kop-phone { font-size: 10px; }
    .doc-title { font-size: 18px; letter-spacing: 4px; }
    .doc-number { font-size: 11px; }
    .info-label { width: 150px; font-size: 11px; }
    .info-val { font-size: 11px; }
    .info-sep { font-size: 11px; }
    table.detail { font-size: 11px; }
    table.detail th { font-size: 10px; padding: 8px 12px; }
    table.detail td { padding: 7px 12px; }
    table.detail tr.total-row td { font-size: 13px; }
    table.detail tr.highlight td { font-size: 13px; }
    .status-badge { font-size: 13px; padding: 6px 20px; }
    .sign-space { height: 70px; }
    .stamp-img { width: 85px; height: 85px; top: -15px; }
    .sign-name { font-size: 11px; }
    .sign-title { font-size: 10px; }
    .catatan-box { font-size: 10px; padding: 10px 14px; }
  </style>
</head>
<body>
  <div class="content">
    ${kopHtml()}

    <div class="doc-title-bar" style="margin: 16px 0 12px;">
      <div class="doc-title">INVOICE</div>
      <div class="doc-number">No: ${escapeHtml(data.nomorDokumen)}</div>
      <div class="doc-number">Tanggal: ${formatTanggalPanjang(data.tanggalDokumen)}</div>
    </div>
    <div class="divider-thin" style="margin-bottom: 16px;"></div>

    <!-- Kepada Yth -->
    <div style="margin-bottom: 16px; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Kepada Yth:</div>
      <div class="info-row"><span class="info-label">Nama</span><span class="info-sep">:</span><span class="info-val" style="font-weight: 800;">${escapeHtml(data.namaSiswa)} (${escapeHtml(data.kodeSiswa)})</span></div>
      ${data.alamatSiswa ? `<div class="info-row"><span class="info-label">Alamat</span><span class="info-sep">:</span><span class="info-val">${escapeHtml(data.alamatSiswa)}</span></div>` : ''}
      ${data.whatsappSiswa ? `<div class="info-row"><span class="info-label">No. WhatsApp</span><span class="info-sep">:</span><span class="info-val">${escapeHtml(data.whatsappSiswa)}</span></div>` : ''}
    </div>

    <!-- Detail Tagihan Tabel -->
    <table class="detail" style="margin-bottom: 16px;">
      <thead>
        <tr>
          <th style="width: 8%; text-align: center;">No</th>
          <th style="width: 52%;">Uraian</th>
          <th style="width: 10%; text-align: center;">Qty</th>
          <th style="width: 30%; text-align: right;">Jumlah (Rp)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center; font-weight: 600;">1</td>
          <td>
            <div style="font-weight: 700;">${escapeHtml(data.namaPaket)}</div>
            ${data.deskripsiPaket ? `<div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">${escapeHtml(data.deskripsiPaket)}</div>` : ''}
          </td>
          <td style="text-align: center; font-weight: 600;">1</td>
          <td>${formatRupiah(data.hargaPaket)}</td>
        </tr>
        <tr class="divider-thin"></tr>
        <tr class="summary"><td colspan="3" style="text-align: right; padding-right: 12px;">Subtotal</td><td>${formatRupiah(data.hargaPaket)}</td></tr>
        <tr class="total-row"><td colspan="3" style="text-align: right; padding-right: 12px;"><strong>TOTAL</strong></td><td style="color: ${COMPANY.brand};">${formatRupiah(data.hargaPaket)}</td></tr>
        ${data.dpTerbayar > 0 ? `<tr class="summary"><td colspan="3" style="text-align: right; padding-right: 12px;">Terbayar (DP)</td><td style="color: #059669;">- ${formatRupiah(data.dpTerbayar)}</td></tr>` : ''}
        <tr class="highlight"><td colspan="3" style="text-align: right; padding-right: 12px;"><strong>SISA TAGIHAN</strong></td><td style="font-size: 14px;">${sisaTagihan <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(sisaTagihan)}</td></tr>
      </tbody>
    </table>

    <!-- Status -->
    <div style="text-align: center; margin-bottom: 16px;">
      <span class="status-badge" style="color: ${status.color}; background: ${status.bg};">STATUS: ${status.text}</span>
    </div>

    <!-- Metode Pembayaran Info -->
    <div style="margin-bottom: 16px; padding: 10px 14px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px;">
      <div style="font-size: 10px; font-weight: 700; color: ${COMPANY.brand}; margin-bottom: 6px;">Metode Pembayaran yang Diterima:</div>
      <div style="font-size: 10px; color: #475569; line-height: 1.8;">
        • Transfer Bank / E-Wallet ke rekening Amanah Drive<br>
        • Tunai langsung ke Kantor Amanah Drive Palembang
      </div>
    </div>

    ${data.catatan ? `<div class="catatan-box" style="margin-bottom: 16px;"><strong>Catatan:</strong> ${escapeHtml(data.catatan)}</div>` : ''}

    <!-- Tanda Tangan -->
    <div class="sign-area" style="margin-top: auto;">
      <div class="sign-box">
        <div class="sign-title">Penerima,</div>
        <div class="sign-space"></div>
        <div class="sign-name">${escapeHtml(data.namaSiswa)}</div>
      </div>
      <div style="text-align: center; font-size: 10px; color: #94a3b8; align-self: center;">
        Palembang, ${formatTanggalPanjang(data.tanggalDokumen)}
      </div>
      <div class="sign-box">
        <div class="sign-title">Hormat kami,</div>
        <div class="sign-space">
          <img src="${getStampUrl()}" alt="Cap Perusahaan" class="stamp-img" onerror="this.style.display='none'" />
        </div>
        <div class="sign-name">${escapeHtml(data.picNama)}</div>
        <div style="font-size: 9px; color: #64748b;">${escapeHtml(data.picJabatan)} — Amanah Drive</div>
      </div>
    </div>

    <div class="footer-digital" style="margin-top: 16px;">
      Dokumen ini digenerate secara digital oleh Sistem Administrasi Amanah Drive Palembang &nbsp;|&nbsp; ${formatTanggalPanjang(data.tanggalDokumen)}
    </div>
  </div>
</body>
</html>`;
}

// ─── Print Function ──────────────────────────────────────────────
export function printNota(data: NotaData): void {
  const html = data.jenis === 'invoice_tagihan' ? generateInvoiceHtml(data) : generateNotaHtml(data);
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html + `<script>window.onload=function(){setTimeout(function(){window.print();},600);}<\/script>`);
    printWindow.document.close();
  } else {
    // Fallback: hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 600);
    }
  }
}

// ─── Download as JPG ─────────────────────────────────────────────
export async function downloadNotaAsJpg(previewElement: HTMLElement, filename: string): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(previewElement, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
  const link = document.createElement('a');
  link.download = `${filename}.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
}

// ─── Download as PDF ─────────────────────────────────────────────
export async function downloadNotaAsPdf(previewElement: HTMLElement, filename: string, isA4: boolean): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(previewElement, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const orientation = isA4 ? 'portrait' : 'landscape';
  const format = isA4 ? 'a4' : 'a5';
  const pdf = new jsPDF({ orientation, unit: 'mm', format });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  pdf.addImage(imgData, 'JPEG', 0, 0, imgW, Math.min(imgH, pageH));
  pdf.save(`${filename}.pdf`);
}

// ─── Copy to Clipboard as Image ─────────────────────────────────
export async function copyNotaToClipboard(previewElement: HTMLElement): Promise<boolean> {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(previewElement, {
      scale: 3,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    return new Promise<boolean>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(false); return; }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          resolve(true);
        } catch {
          resolve(false);
        }
      }, 'image/png');
    });
  } catch {
    return false;
  }
}

// ─── Generate Document Number ────────────────────────────────────
export function generateNomorDokumen(jenis: NotaJenis): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 900) + 100);

  switch (jenis) {
    case 'nota_dp': return `NDP/${y}/${m}${d}/${rand}`;
    case 'nota_pelunasan': return `NPL/${y}/${m}${d}/${rand}`;
    case 'nota_pembayaran': return `NBY/${y}/${m}${d}/${rand}`;
    case 'invoice_tagihan': return `INV/${y}/${m}${d}/${rand}`;
  }
}
