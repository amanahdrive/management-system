// lib/utils/pdf-statement.ts
import { formatRupiah } from './currency';
import { formatDateIndo } from './date';

export interface StatementTransactionItem {
  no: number;
  tanggal: string;
  tipe: 'pemasukan' | 'pengeluaran';
  jenis_pembayaran: 'tunai' | 'non_tunai';
  kategori: string;
  keterangan: string;
  pic_nama: string;
  pemasukanNominal: number;
  pengeluaranNominal: number;
  saldoBerjalan: number;
}

export interface StatementData {
  periodeBulan: string; // e.g. "Agustus 2026"
  tanggalAwal: string; // "01/08/2026"
  tanggalAkhir: string; // "31/08/2026"
  saldoAwal: number;
  saldoAwalTunai: number;
  saldoAwalNonTunai: number;
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoAkhir: number;
  saldoAkhirTunai: number;
  saldoAkhirNonTunai: number;
  transaksiList: StatementTransactionItem[];
  generatedAt: string;
  picName?: string;
}

/**
 * Generates an official E-Statement / Mutasi Rekening Koran HTML template
 * for portrait printing / saving as PDF with exact company letterhead (Kop Surat).
 */
export function generateStatementHtml(data: StatementData): string {
  const logoUrl = typeof window !== 'undefined' ? `${window.location.origin}/assets/logo-amdri-landscape.png` : '/assets/logo-amdri-landscape.png';
  const stampUrl = typeof window !== 'undefined' ? `${window.location.origin}/assets/cap-amanah.png` : '/assets/cap-amanah.png';

  const rowsHtml = data.transaksiList.map((tx) => {
    const isMasuk = tx.tipe === 'pemasukan';
    const rowClass = tx.no % 2 === 0 ? 'bg-gray-50' : 'bg-white';
    const isTunai = tx.jenis_pembayaran === 'tunai';

    return `
      <tr class="${rowClass} border-b border-gray-200">
        <td class="py-1.5 px-2 text-center text-xs text-gray-600 font-medium tabular-num">${tx.no}</td>
        <td class="py-1.5 px-2 text-xs text-gray-800 font-medium whitespace-nowrap">${formatDateIndo(tx.tanggal)}</td>
        <td class="py-1.5 px-2 text-xs text-gray-800">
          <div class="font-semibold text-gray-900">${escapeHtml(tx.keterangan || '-')}</div>
          <div class="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
            <span class="uppercase font-semibold px-1 py-0.2 rounded ${isTunai ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}">
              ${isTunai ? 'Tunai' : 'Non-Tunai'}
            </span>
            <span>•</span>
            <span class="capitalize">${escapeHtml(tx.kategori?.replace(/_/g, ' ') || 'Umum')}</span>
          </div>
        </td>
        <td class="py-1.5 px-2 text-center text-[11px] text-gray-600">${escapeHtml(tx.pic_nama || 'Admin')}</td>
        <td class="py-1.5 px-2 text-right text-xs font-bold tabular-num ${isMasuk ? 'text-emerald-700' : 'text-gray-400'}">
          ${tx.pemasukanNominal > 0 ? formatRupiah(tx.pemasukanNominal) : '-'}
        </td>
        <td class="py-1.5 px-2 text-right text-xs font-bold tabular-num ${!isMasuk ? 'text-rose-700' : 'text-gray-400'}">
          ${tx.pengeluaranNominal > 0 ? formatRupiah(tx.pengeluaranNominal) : '-'}
        </td>
        <td class="py-1.5 px-2 text-right text-xs font-bold tabular-num text-gray-900 bg-teal-50/40">
          ${formatRupiah(tx.saldoBerjalan)}
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>E-Statement Rekening Koran - Amanah Drive (${data.periodeBulan})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    @page {
      size: A4 portrait;
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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      color: #1e293b;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
      padding: 15px;
    }

    /* KOP SURAT BISNIS SESUAI GAMBAR */
    .header-kop {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
    }

    .brand-left {
      display: flex;
      align-items: center;
    }

    .brand-logo {
      height: 52px;
      max-width: 220px;
      object-fit: contain;
    }

    .brand-right {
      text-align: right;
    }

    .company-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #0F7A73;
      letter-spacing: -0.1px;
      margin-bottom: 2px;
    }

    .company-address {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.4;
    }

    .company-contact {
      font-size: 10px;
      font-weight: 700;
      color: #0F7A73;
      margin-top: 2px;
    }

    .header-divider {
      height: 2.5px;
      background: #0F7A73;
      margin-bottom: 12px;
      border-radius: 1px;
    }

    /* DOCUMENT BANNER */
    .doc-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #0F7A73;
      border-radius: 4px;
      padding: 7px 10px;
      margin-bottom: 12px;
    }

    .doc-banner h2 {
      font-size: 12px;
      font-weight: 800;
      color: #0B2545;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .doc-banner .meta-info {
      font-size: 9.5px;
      color: #475569;
      text-align: right;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 0 0 14px 0;
    }

    .summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
    }

    .summary-card.highlight {
      background: #E6F6F4;
      border-color: #0F7A73;
    }

    .summary-card .card-title {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.3px;
    }

    .summary-card.highlight .card-title {
      color: #0F7A73;
    }

    .summary-card .card-value {
      font-family: 'Inter', -apple-system, sans-serif !important;
      font-feature-settings: 'tnum' 1;
      font-variant-numeric: tabular-nums;
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }

    .summary-card .card-sub {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }

    th {
      background: #0F7A73;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding: 6px 8px;
      text-align: left;
      border: 1px solid #0F7A73;
    }

    td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .total-row td {
      background-color: #f1f5f9;
      font-weight: 800;
      border-top: 2px solid #cbd5e1;
    }

    .footer-sign {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 25px;
      padding-top: 15px;
      border-top: 1px dashed #cbd5e1;
      page-break-inside: avoid;
    }

    .sign-box {
      text-align: center;
      width: 170px;
      position: relative;
    }

    .sign-box .sign-title {
      font-size: 9.5px;
      color: #64748b;
      margin-bottom: 45px;
    }

    .sign-box .sign-name {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
    }

    .stamp-img {
      position: absolute;
      width: 80px;
      opacity: 0.85;
      top: 15px;
      left: 45px;
      pointer-events: none;
    }

    .security-notice {
      font-size: 8.5px;
      color: #94a3b8;
      max-width: 260px;
      line-height: 1.3;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>

  <!-- KOP SURAT RESMI AMANAH DRIVE -->
  <div class="header-kop">
    <div class="brand-left">
      <img src="${logoUrl}" alt="Amanah Drive" class="brand-logo" onerror="this.style.display='none'" />
    </div>

    <div class="brand-right">
      <div class="company-title">AMANAH DRIVE — KURSUS MENGEMUDI PALEMBANG</div>
      <div class="company-address">Jl. Macan Kumbang XVIII, Siring Agung, Ilir Barat I,</div>
      <div class="company-address">Kota Palembang, Sumatera Selatan, 30153</div>
      <div class="company-contact">Telp/WA: 0813-7790-961</div>
    </div>
  </div>

  <div class="header-divider"></div>

  <!-- BANNER IDENTITAS DOKUMEN -->
  <div class="doc-banner">
    <div>
      <h2>MUTASI REKENING KAS (E-STATEMENT)</h2>
    </div>
    <div class="meta-info">
      <div>Periode: <strong>${escapeHtml(data.tanggalAwal)} s/d ${escapeHtml(data.tanggalAkhir)}</strong></div>
      <div style="margin-top: 2px;">Dicetak: ${escapeHtml(data.generatedAt)}</div>
    </div>
  </div>

  <!-- RINGKASAN SALDO & MUTASI -->
  <div class="summary-grid">
    <div class="summary-card">
      <div class="card-title">Saldo Awal Periode</div>
      <div class="card-value">${formatRupiah(data.saldoAwal)}</div>
      <div class="card-sub">Tunai: ${formatRupiah(data.saldoAwalTunai)} | Bank: ${formatRupiah(data.saldoAwalNonTunai)}</div>
    </div>

    <div class="summary-card">
      <div class="card-title" style="color: #059669;">Total Pemasukan (+)</div>
      <div class="card-value" style="color: #059669;">+ ${formatRupiah(data.totalPemasukan)}</div>
      <div class="card-sub">${data.transaksiList.filter(t => t.tipe === 'pemasukan').length} Transaksi Kredit</div>
    </div>

    <div class="summary-card">
      <div class="card-title" style="color: #e11d48;">Total Pengeluaran (−)</div>
      <div class="card-value" style="color: #e11d48;">− ${formatRupiah(data.totalPengeluaran)}</div>
      <div class="card-sub">${data.transaksiList.filter(t => t.tipe === 'pengeluaran').length} Transaksi Debit</div>
    </div>

    <div class="summary-card highlight">
      <div class="card-title">Saldo Akhir Periode</div>
      <div class="card-value" style="color: #0F7A73;">${formatRupiah(data.saldoAkhir)}</div>
      <div class="card-sub">Tunai: ${formatRupiah(data.saldoAkhirTunai)} | Bank: ${formatRupiah(data.saldoAkhirNonTunai)}</div>
    </div>
  </div>

  <!-- TABEL MUTASI TRANSAKSI KRONOLOGIS -->
  <table>
    <thead>
      <tr>
        <th style="width: 25px; text-align: center;">No</th>
        <th style="width: 70px;">Tanggal</th>
        <th>Keterangan / Uraian Mutasi</th>
        <th style="width: 80px; text-align: center;">PIC</th>
        <th style="width: 100px; text-align: right;">Masuk (Rp)</th>
        <th style="width: 100px; text-align: right;">Keluar (Rp)</th>
        <th style="width: 110px; text-align: right;">Saldo (Rp)</th>
      </tr>
    </thead>
    <tbody>
      <!-- Saldo Awal Row -->
      <tr style="background-color: #f1f5f9; font-weight: 600;">
        <td style="text-align: center;" class="tabular-num">-</td>
        <td>${escapeHtml(data.tanggalAwal)}</td>
        <td colspan="4" style="color: #475569; font-style: italic;">
          [SALDO AWAL KAS SEBELUM TANGGAL ${escapeHtml(data.tanggalAwal)}]
        </td>
        <td style="text-align: right; font-family: 'Inter', -apple-system, sans-serif; font-feature-settings: 'tnum' 1; font-weight: 700; color: #0f172a;" class="tabular-num">
          ${formatRupiah(data.saldoAwal)}
        </td>
      </tr>

      ${rowsHtml.length > 0 ? rowsHtml : `
        <tr>
          <td colspan="7" style="text-align: center; padding: 25px; color: #94a3b8; font-style: italic;">
            Tidak ada catatan transaksi kas pada periode bulan ini.
          </td>
        </tr>
      `}

      <!-- Total Summary Row -->
      <tr class="total-row">
        <td colspan="4" style="text-align: right; padding-right: 12px; font-weight: 700;">TOTAL MUTASI & SALDO AKHIR</td>
        <td style="text-align: right; font-family: 'Inter', -apple-system, sans-serif; font-feature-settings: 'tnum' 1; font-weight: 800; color: #059669;" class="tabular-num">
          + ${formatRupiah(data.totalPemasukan)}
        </td>
        <td style="text-align: right; font-family: 'Inter', -apple-system, sans-serif; font-feature-settings: 'tnum' 1; font-weight: 800; color: #e11d48;" class="tabular-num">
          − ${formatRupiah(data.totalPengeluaran)}
        </td>
        <td style="text-align: right; font-family: 'Inter', -apple-system, sans-serif; font-feature-settings: 'tnum' 1; font-weight: 800; color: #0F7A73; font-size: 12px; background: #E6F6F4;" class="tabular-num">
          ${formatRupiah(data.saldoAkhir)}
        </td>
      </tr>
    </tbody>
  </table>

  <!-- PENGESAHAN & WATERMARK / SECURITY -->
  <div class="footer-sign">
    <div class="security-notice">
      <p style="font-weight: 700; color: #64748b; margin-bottom: 2px;">CATATAN KEAMANAN & KEASLIAN:</p>
      <p>Dokumen ini merupakan laporan mutasi kas resmi (E-Statement) yang digenerate secara otomatis oleh Sistem Finansial Terpadu Amanah Drive Palembang.</p>
    </div>

    <div style="display: flex; gap: 30px;">
      <div class="sign-box">
        <div class="sign-title">Petugas Kas / Finance,</div>
        <img src="${stampUrl}" alt="Cap Perusahaan" class="stamp-img" onerror="this.style.display='none'" />
        <div class="sign-name">${escapeHtml(data.picName || 'Finance Staff')}</div>
      </div>

      <div class="sign-box">
        <div class="sign-title">Mengetahui, Pimpinan</div>
        <div class="sign-name">Pimpinan Amanah Drive</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      // Auto trigger print after render
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;
}

/**
 * Triggers the browser print / PDF download dialogue for the E-Statement.
 */
export function printStatementPdf(data: StatementData): void {
  const html = generateStatementHtml(data);
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // Fallback if popup blocker is active: write to hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  }
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
