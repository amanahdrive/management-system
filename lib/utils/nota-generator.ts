// lib/utils/nota-generator.ts
// Generator dokumen resmi Nota & Invoice Amanah Drive Palembang
// Format: Nota DP, Pelunasan, Pembayaran, Tagihan (A5 Landscape) & Invoice Resmi (A4 Portrait)

import { formatRupiah, terbilangRupiah } from './currency';
import { formatDateLongIndo } from './date';

export type NotaJenis =
  | 'nota_dp'
  | 'nota_pelunasan'
  | 'nota_pembayaran'
  | 'nota_tagihan'
  | 'invoice_tagihan';

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
}

export const COMPANY_INFO = {
  name: 'AMANAH DRIVE',
  tagline: 'LEMBAGA KURSUS MENGEMUDI & KELAYAKAN BERKENDARA',
  address: 'Jl. Macan Kumbang XVIII, Siring Agung, Kec. Ilir Barat I, Kota Palembang, Sumatera Selatan 30153',
  phone: '0813-7790-961',
  email: 'amanahdrive.plg@gmail.com',
  bankInfo: 'Bank BCA: 123-456-7890 a.n. Amanah Drive',
  brandColor: '#0F7A73',
  brandDark: '#0B2545',
};

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
        title: 'INVOICE TAGIHAN KURSUS MENGEMUDI',
        badge: 'INVOICE RESMI',
        isA4: true,
        paperSize: 'A4 Portrait (210 × 297 mm)',
        description: 'Invoice resmi tagihan pelatihan kursus',
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

function getLogoUrl(): string {
  return typeof window !== 'undefined'
    ? `${window.location.origin}/assets/logo-amdri-landscape.png`
    : '/assets/logo-amdri-landscape.png';
}

function getStampUrl(): string {
  return typeof window !== 'undefined'
    ? `${window.location.origin}/assets/cap-amanah.png`
    : '/assets/cap-amanah.png';
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate isolated print HTML with authentic typography and exact @page sizing
 */
export function generatePrintableHtml(data: NotaData): string {
  const info = getJenisInfo(data.jenis);
  const isA4 = info.isA4;
  const logoUrl = getLogoUrl();
  const stampUrl = getStampUrl();
  const terbilangText = terbilangRupiah(data.nominalBayarIni > 0 ? data.nominalBayarIni : data.totalTagihanBersih);

  const statusColor =
    data.sisaPiutang <= 0
      ? { text: 'LUNAS', bg: '#dcfce7', color: '#15803d', border: '#86efac' }
      : data.dpTerbayar > 0 || data.nominalBayarIni > 0
      ? { text: 'BELUM LUNAS (DP)', bg: '#fef3c7', color: '#b45309', border: '#fde68a' }
      : { text: 'BELUM BAYAR', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${info.title} - ${escapeHtml(data.namaSiswa)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    @page {
      size: ${isA4 ? 'A4 portrait' : 'A5 landscape'};
      margin: ${isA4 ? '10mm 12mm' : '8mm 10mm'};
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
      font-size: ${isA4 ? '11px' : '10px'};
      line-height: 1.4;
      padding: ${isA4 ? '16px' : '10px'};
    }
    
    .doc-container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    
    /* Kop Surat */
    .kop-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
    }
    .kop-logo {
      height: ${isA4 ? '50px' : '42px'};
      max-width: 220px;
      object-fit: contain;
    }
    .kop-right {
      text-align: right;
    }
    .kop-title {
      font-size: ${isA4 ? '14px' : '12.5px'};
      font-weight: 900;
      color: #0F7A73;
      letter-spacing: -0.2px;
    }
    .kop-tagline {
      font-size: ${isA4 ? '9px' : '8px'};
      font-weight: 700;
      color: #0c4a45;
      margin-bottom: 2px;
    }
    .kop-address {
      font-size: ${isA4 ? '8.5px' : '7.5px'};
      color: #475569;
      line-height: 1.3;
      max-width: 360px;
      margin-left: auto;
    }
    .kop-contact {
      font-size: ${isA4 ? '8.5px' : '8px'};
      font-weight: 700;
      color: #0F7A73;
      margin-top: 2px;
    }
    .kop-divider-thick {
      height: 3px;
      background: #0F7A73;
      border-radius: 1px;
    }
    .kop-divider-thin {
      height: 1px;
      background: #0F7A73;
      opacity: 0.4;
      margin-top: 1.5px;
      margin-bottom: 8px;
    }
    
    /* Title Banner */
    .title-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      padding: ${isA4 ? '8px 12px' : '6px 10px'};
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .doc-main-title {
      font-size: ${isA4 ? '13px' : '11px'};
      font-weight: 900;
      color: #0F7A73;
      letter-spacing: 0.5px;
    }
    .doc-meta {
      text-align: right;
      font-size: ${isA4 ? '9.5px' : '8.5px'};
      color: #334155;
      font-weight: 600;
    }
    
    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 12px;
      margin-bottom: 8px;
      font-size: ${isA4 ? '10px' : '9px'};
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: ${isA4 ? '8px 10px' : '6px 8px'};
    }
    .info-box-title {
      font-size: ${isA4 ? '8.5px' : '7.5px'};
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0F7A73;
      margin-bottom: 4px;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 2px;
    }
    .info-row {
      display: flex;
      line-height: 1.5;
    }
    .info-lbl {
      width: 100px;
      color: #64748b;
      font-weight: 500;
      flex-shrink: 0;
    }
    .info-sep {
      width: 10px;
      text-align: center;
      color: #94a3b8;
    }
    .info-val {
      font-weight: 700;
      color: #0f172a;
      flex: 1;
    }
    
    /* Table */
    table.table-detail {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: ${isA4 ? '10px' : '9px'};
    }
    table.table-detail th {
      background: #0F7A73;
      color: #ffffff;
      padding: ${isA4 ? '6px 8px' : '5px 6px'};
      font-weight: 800;
      text-transform: uppercase;
      font-size: ${isA4 ? '8.5px' : '7.5px'};
      letter-spacing: 0.4px;
      border: 1px solid #0F7A73;
    }
    table.table-detail td {
      padding: ${isA4 ? '5px 8px' : '4px 6px'};
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    table.table-detail tr:nth-child(even) {
      background: #f8fafc;
    }
    .row-highlight {
      background: #ecfdf5 !important;
      font-weight: 800;
      color: #065f46 !important;
    }
    .row-total {
      background: #f1f5f9 !important;
      font-weight: 800;
    }
    
    /* Terbilang Box */
    .terbilang-box {
      background: #f8fafc;
      border: 1px dashed #0F7A73;
      border-radius: 6px;
      padding: ${isA4 ? '6px 10px' : '4px 8px'};
      font-size: ${isA4 ? '9.5px' : '8px'};
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .terbilang-tag {
      font-weight: 800;
      color: #0F7A73;
      text-transform: uppercase;
      font-size: ${isA4 ? '8px' : '7px'};
      background: #ccfbf1;
      padding: 1px 5px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .terbilang-content {
      font-style: italic;
      font-weight: 700;
      color: #1e293b;
    }
    
    /* Status & Meta Footer */
    .status-badge-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: ${isA4 ? '9px' : '8px'};
    }
    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 4px;
      font-weight: 800;
      font-size: ${isA4 ? '9.5px' : '8.5px'};
      letter-spacing: 0.5px;
      border: 1px solid ${statusColor.border};
      background: ${statusColor.bg};
      color: ${statusColor.color};
    }
    
    /* Signature Area */
    .sign-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: ${isA4 ? '12px' : '6px'};
      font-size: ${isA4 ? '9.5px' : '8.5px'};
    }
    .sign-col {
      width: 40%;
      text-align: center;
    }
    .sign-place-date {
      font-size: ${isA4 ? '9px' : '8px'};
      color: #475569;
      margin-bottom: 2px;
    }
    .sign-role {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .sign-space {
      height: ${isA4 ? '52px' : '40px'};
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sign-stamp {
      position: absolute;
      width: ${isA4 ? '68px' : '54px'};
      height: ${isA4 ? '68px' : '54px'};
      object-fit: contain;
      opacity: 0.85;
      pointer-events: none;
      top: -6px;
      right: 15%;
    }
    .sign-line-name {
      font-weight: 800;
      color: #0f172a;
      border-top: 1px solid #334155;
      display: inline-block;
      min-width: 140px;
      padding-top: 2px;
    }
    .sign-company-tag {
      font-size: ${isA4 ? '8px' : '7px'};
      color: #64748b;
      font-weight: 600;
    }
    
    /* Bottom legal note */
    .legal-footer {
      text-align: center;
      font-size: ${isA4 ? '7.5px' : '6.5px'};
      color: #94a3b8;
      border-top: 1px dashed #e2e8f0;
      padding-top: 4px;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="doc-container">
    <div>
      <!-- Kop Surat -->
      <div class="kop-header">
        <div>
          <img src="${logoUrl}" alt="Amanah Drive Logo" class="kop-logo" onerror="this.style.display='none'" />
        </div>
        <div class="kop-right">
          <div class="kop-title">${COMPANY_INFO.name}</div>
          <div class="kop-tagline">${COMPANY_INFO.tagline}</div>
          <div class="kop-address">${COMPANY_INFO.address}</div>
          <div class="kop-contact">Telp/WhatsApp: ${COMPANY_INFO.phone} • Email: ${COMPANY_INFO.email}</div>
        </div>
      </div>
      <div class="kop-divider-thick"></div>
      <div class="kop-divider-thin"></div>

      <!-- Title Banner -->
      <div class="title-banner">
        <div class="doc-main-title">${info.title}</div>
        <div class="doc-meta">
          <div>No. Dokumen: <strong>${escapeHtml(data.nomorDokumen)}</strong></div>
          <div>Tanggal: <strong>${formatDateLongIndo(data.tanggalDokumen)}</strong></div>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="info-grid">
        <div class="info-box">
          <div class="info-box-title">Identitas Siswa / Penerima Tagihan</div>
          <div class="info-row"><span class="info-lbl">Nama Siswa</span><span class="info-sep">:</span><span class="info-val">${escapeHtml(data.namaSiswa)}</span></div>
          <div class="info-row"><span class="info-lbl">Kode Siswa</span><span class="info-sep">:</span><span class="info-val">${escapeHtml(data.kodeSiswa || '-')}</span></div>
          <div class="info-row"><span class="info-lbl">No. WhatsApp</span><span class="info-sep">:</span><span class="info-val">${escapeHtml(data.noWhatsapp || '-')}</span></div>
          ${data.alamatSiswa ? `<div class="info-row"><span class="info-lbl">Alamat Domisili</span><span class="info-sep">:</span><span class="info-val">${escapeHtml(data.alamatSiswa)}</span></div>` : ''}
        </div>

        <div class="info-box">
          <div class="info-box-title">Rincian Paket & Pelatihan</div>
          <div class="info-row"><span class="info-lbl">Paket Kursus</span><span class="info-sep">:</span><span class="info-val">${escapeHtml(data.namaPaket)}</span></div>
          <div class="info-row"><span class="info-lbl">Jumlah Sesi</span><span class="info-sep">:</span><span class="info-val">${data.jumlahSesi} Sesi Pertemuan</span></div>
          <div class="info-row"><span class="info-lbl">Jenis Transmisi</span><span class="info-sep">:</span><span class="info-val">${escapeHtml(data.tipeMobil || 'Manual')}</span></div>
          <div class="info-row"><span class="info-lbl">Metode Bayar</span><span class="info-sep">:</span><span class="info-val">${data.metodePembayaran === 'tunai' ? 'Tunai (Kas Fisik)' : data.metodePembayaran === 'transfer' ? `Transfer Bank ${data.namaBank || ''}` : 'QRIS'}</span></div>
        </div>
      </div>

      <!-- Table Details -->
      <table class="table-detail">
        <thead>
          <tr>
            <th style="width: 6%; text-align: center;">No</th>
            <th style="width: 54%;">Deskripsi Rincian</th>
            <th style="width: 10%; text-align: center;">Qty</th>
            <th style="width: 30%; text-align: right;">Nominal (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; font-weight: 700;">1</td>
            <td>
              <strong>${escapeHtml(data.namaPaket)}</strong> (${data.jumlahSesi} Sesi - ${escapeHtml(data.tipeMobil)})
              ${data.catatanPaket ? `<div style="font-size: 8px; color: #64748b;">${escapeHtml(data.catatanPaket)}</div>` : ''}
            </td>
            <td style="text-align: center;">1 Paket</td>
            <td style="text-align: right; font-weight: 700;">${formatRupiah(data.hargaPaket)}</td>
          </tr>
          ${
            data.diskonNominal > 0
              ? `<tr>
                  <td style="text-align: center;">2</td>
                  <td>Potongan Diskon Promosi</td>
                  <td style="text-align: center;">-</td>
                  <td style="text-align: right; color: #dc2626; font-weight: 700;">- ${formatRupiah(data.diskonNominal)}</td>
                </tr>`
              : ''
          }
          <tr class="row-total">
            <td colspan="3" style="text-align: right; padding-right: 10px;">Total Tagihan Kursus:</td>
            <td style="text-align: right;">${formatRupiah(data.totalTagihanBersih)}</td>
          </tr>
          ${
            data.dpTerbayar > 0
              ? `<tr>
                  <td colspan="3" style="text-align: right; padding-right: 10px; color: #047857;">Pembayaran Terdahulu / DP Masuk:</td>
                  <td style="text-align: right; color: #047857; font-weight: 700;">- ${formatRupiah(data.dpTerbayar)}</td>
                </tr>`
              : ''
          }
          ${
            data.nominalBayarIni > 0
              ? `<tr class="row-highlight">
                  <td colspan="3" style="text-align: right; padding-right: 10px; font-size: 10.5px;">
                    ${data.jenis === 'nota_dp' ? '★ JUMLAH PEMBAYARAN DP SAAT INI:' : data.jenis === 'nota_pelunasan' ? '★ JUMLAH PEMBAYARAN PELUNASAN:' : '★ JUMLAH DIBAYARKAN SAAT INI:'}
                  </td>
                  <td style="text-align: right; font-size: 11px;">${formatRupiah(data.nominalBayarIni)}</td>
                </tr>`
              : ''
          }
          <tr style="background: #f8fafc;">
            <td colspan="3" style="text-align: right; padding-right: 10px; font-weight: 800;">
              Sisa Tagihan / Piutang Berjalan:
            </td>
            <td style="text-align: right; font-weight: 900; color: ${data.sisaPiutang <= 0 ? '#15803d' : '#dc2626'};">
              ${data.sisaPiutang <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(data.sisaPiutang)}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Terbilang Box -->
      <div class="terbilang-box">
        <span class="terbilang-tag">Terbilang</span>
        <span class="terbilang-content"># ${terbilangText} #</span>
      </div>

      <!-- Status & Notes -->
      <div class="status-badge-container">
        <div>
          Status Pembayaran: <span class="status-badge">${statusColor.text}</span>
        </div>
        ${
          data.catatanPembayaran
            ? `<div style="color: #475569; font-style: italic;">
                Catatan: <strong>${escapeHtml(data.catatanPembayaran)}</strong>
              </div>`
            : ''
        }
      </div>
    </div>

    <!-- Signatures -->
    <div>
      <div class="sign-section">
        <div class="sign-col">
          <div class="sign-place-date">&nbsp;</div>
          <div class="sign-role">Penyetor / Siswa,</div>
          <div class="sign-space"></div>
          <div class="sign-line-name">(${escapeHtml(data.namaSiswa)})</div>
          <div class="sign-company-tag">Siswa Kursus</div>
        </div>

        <div class="sign-col">
          <div class="sign-place-date">${escapeHtml(data.kota || 'Palembang')}, ${formatDateLongIndo(data.tanggalDokumen)}</div>
          <div class="sign-role">Petugas Kasir / Administrasi,</div>
          <div class="sign-space">
            ${data.showStempel ? `<img src="${stampUrl}" alt="Stempel Amanah Drive" class="sign-stamp" onerror="this.style.display='none'" />` : ''}
          </div>
          <div class="sign-line-name">(${escapeHtml(data.picNama)})</div>
          <div class="sign-company-tag">${escapeHtml(data.picJabatan)} — Amanah Drive</div>
        </div>
      </div>

      <!-- Legal footer -->
      <div class="legal-footer">
        Dokumen resmi diterbitkan secara sah oleh Sistem Finansial Amanah Drive Palembang • Harap simpan bukti nota ini dengan baik.
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Trigger print window / isolated hidden iframe
 */
export function printDocument(data: NotaData): void {
  const html = generatePrintableHtml(data);
  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(
      html +
        `<script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>`
    );
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
        setTimeout(() => document.body.removeChild(iframe), 1200);
      }, 500);
    }
  }
}

/**
 * Capture DOM node as crisp High-Resolution JPG image using html-to-image
 */
export async function downloadDocumentAsJpg(element: HTMLElement, filename: string): Promise<void> {
  const { toJpeg } = await import('html-to-image');

  const dataUrl = await toJpeg(element, {
    quality: 0.96,
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    cacheBust: true,
  });

  const link = document.createElement('a');
  link.download = `${filename}.jpg`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Capture DOM node and export as exact A5 Landscape / A4 Portrait PDF using html-to-image + jsPDF
 */
export async function downloadDocumentAsPdf(
  element: HTMLElement,
  filename: string,
  isA4: boolean
): Promise<void> {
  const { toJpeg } = await import('html-to-image');
  const { jsPDF } = await import('jspdf');

  const imgData = await toJpeg(element, {
    quality: 0.96,
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    cacheBust: true,
  });

  if (isA4) {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4', // [210, 297]
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    pdf.save(`${filename}.pdf`);
  } else {
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a5', // [210, 148]
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 148);
    pdf.save(`${filename}.pdf`);
  }
}

/**
 * Copy PNG image blob to Clipboard for instant pasting into WhatsApp
 */
export async function copyDocumentToClipboard(
  element: HTMLElement
): Promise<{ success: boolean; message?: string }> {
  try {
    const { toBlob } = await import('html-to-image');

    const blob = await toBlob(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
    });

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
        message: 'Browser tidak mendukung salin gambar ke clipboard',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal memproses gambar nota',
    };
  }
}

