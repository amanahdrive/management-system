'use client';

import React from 'react';
import { NotaData, COMPANY_INFO, getJenisInfo } from '@/lib/utils/nota-generator';
import { formatRupiah, terbilangRupiah } from '@/lib/utils/currency';
import { formatDateLongIndo } from '@/lib/utils/date';

export interface NotaDocumentPaperProps {
  documentPaperRef?: React.Ref<HTMLDivElement>;
  notaData: NotaData;
  logoBase64: string;
  stampBase64: string;
  zoomScale?: number;
}

export function NotaDocumentPaper({
  documentPaperRef,
  notaData,
  logoBase64,
  stampBase64,
  zoomScale = 1,
}: NotaDocumentPaperProps) {
  const docInfo = getJenisInfo(notaData.jenis);
  const isA4 = docInfo.isA4;

  const statusBadge =
    notaData.sisaPiutang <= 0
      ? { text: 'LUNAS', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
      : notaData.dpTerbayar > 0 || notaData.nominalBayarIni > 0
      ? { text: 'BELUM LUNAS (DP)', bg: 'bg-amber-100 text-amber-800 border-amber-300' }
      : { text: 'BELUM BAYAR', bg: 'bg-rose-100 text-rose-800 border-rose-300' };

  return (
    <div
      ref={documentPaperRef}
      style={{
        width: '760px',
        minHeight: isA4 ? '1075px' : '530px',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Inter', sans-serif",
        transform: zoomScale !== 1 ? `scale(${zoomScale})` : undefined,
        transformOrigin: 'top center',
      }}
      className="p-7 rounded-lg shadow-2xl border border-slate-300 flex flex-col justify-between select-text shrink-0 text-slate-900 transition-transform"
    >
      {/* ── 1. KOP SURAT BISNIS RESMI ── */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <div className="w-48 h-12 flex items-center">
            <img
              src={logoBase64}
              alt="Logo Amanah Drive"
              crossOrigin="anonymous"
              style={{ width: '185px', height: 'auto', maxHeight: '48px', objectFit: 'contain' }}
            />
          </div>
          <div className="text-right max-w-sm">
            <h1 className="text-base font-black tracking-tight text-[#0F7A73]">
              {COMPANY_INFO.name}
            </h1>
            <p className="text-[9px] font-bold text-[#0c4a45] uppercase tracking-wider">
              {COMPANY_INFO.tagline}
            </p>
            <p className="text-[8.5px] text-slate-600 leading-tight mt-0.5">
              {COMPANY_INFO.address}
            </p>
            <p className="text-[9px] font-bold text-[#0F7A73] mt-0.5">
              Telp/WA: {COMPANY_INFO.phone} • Email: {COMPANY_INFO.email}
            </p>
          </div>
        </div>

        {/* Double Line Divider */}
        <div className="h-[3px] bg-[#0F7A73] rounded-full" />
        <div className="h-[1px] bg-[#0F7A73]/40 mt-[2px] mb-3" />

        {/* ── 2. TITLE BANNER & NO DOKUMEN ── */}
        <div className="flex items-center justify-between bg-teal-50/80 border border-teal-200 px-3.5 py-2 rounded-lg mb-3">
          <div className="text-xs font-black tracking-wide text-[#0F7A73] uppercase">
            {docInfo.title}
          </div>
          <div className="text-right text-[10px] text-slate-700">
            <div>No: <strong className="font-mono text-slate-900">{notaData.nomorDokumen}</strong></div>
            <div>Tanggal: <strong>{formatDateLongIndo(notaData.tanggalDokumen)}</strong></div>
          </div>
        </div>

        {/* ── 3. IDENTITAS SISWA & INFO KURSUS GRID ── */}
        <div className="grid grid-cols-2 gap-3 mb-3 text-[10px]">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[8.5px] font-black uppercase tracking-wider text-[#0F7A73] border-b border-slate-200 pb-1 mb-1">
              Penerima Tagihan / Siswa
            </div>
            <div className="flex"><span className="w-24 text-slate-500">Nama Siswa</span><span className="w-3 text-center">:</span><span className="font-bold text-slate-900">{notaData.namaSiswa || '-'}</span></div>
            <div className="flex"><span className="w-24 text-slate-500">Kode Siswa</span><span className="w-3 text-center">:</span><span className="font-mono font-bold text-slate-900">{notaData.kodeSiswa || '-'}</span></div>
            <div className="flex"><span className="w-24 text-slate-500">No. WhatsApp</span><span className="w-3 text-center">:</span><span className="font-medium text-slate-800">{notaData.noWhatsapp || '-'}</span></div>
            {notaData.alamatSiswa && (
              <div className="flex"><span className="w-24 text-slate-500">Alamat</span><span className="w-3 text-center">:</span><span className="text-slate-800 truncate">{notaData.alamatSiswa}</span></div>
            )}
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[8.5px] font-black uppercase tracking-wider text-[#0F7A73] border-b border-slate-200 pb-1 mb-1">
              Rincian Paket & Pelatihan
            </div>
            <div className="flex"><span className="w-24 text-slate-500">Paket Kursus</span><span className="w-3 text-center">:</span><span className="font-bold text-slate-900">{notaData.namaPaket || '-'}</span></div>
            <div className="flex"><span className="w-24 text-slate-500">Durasi / Sesi</span><span className="w-3 text-center">:</span><span className="font-semibold text-slate-800">{notaData.jumlahSesi} Sesi Pertemuan</span></div>
            <div className="flex"><span className="w-24 text-slate-500">Transmisi Mobil</span><span className="w-3 text-center">:</span><span className="font-semibold text-slate-800">{notaData.tipeMobil || 'Manual'}</span></div>
            <div className="flex"><span className="w-24 text-slate-500">Metode Bayar</span><span className="w-3 text-center">:</span><span className="font-semibold text-slate-900">{notaData.metodePembayaran === 'tunai' ? 'Tunai (Kas Fisik)' : notaData.metodePembayaran === 'transfer' ? `Transfer Bank ${notaData.namaBank || ''}` : 'QRIS'}</span></div>
          </div>
        </div>

        {/* ── 4. TABEL DETAIL TRANSAKSI ── */}
        <table className="w-full border-collapse border border-slate-200 text-[10px] mb-3">
          <thead>
            <tr className="bg-[#0F7A73] text-white">
              <th className="py-1.5 px-2 text-center w-10 font-bold border border-[#0F7A73]">No</th>
              <th className="py-1.5 px-3 text-left font-bold border border-[#0F7A73]">Uraian / Deskripsi Rincian</th>
              <th className="py-1.5 px-2 text-center w-16 font-bold border border-[#0F7A73]">Qty</th>
              <th className="py-1.5 px-3 text-right w-44 font-bold border border-[#0F7A73]">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="py-1.5 px-2 text-center font-bold text-slate-600">1</td>
              <td className="py-1.5 px-3">
                <strong className="text-slate-900">{notaData.namaPaket}</strong> ({notaData.jumlahSesi} Sesi - {notaData.tipeMobil})
                {notaData.catatanPaket && <div className="text-[8.5px] text-slate-500">{notaData.catatanPaket}</div>}
              </td>
              <td className="py-1.5 px-2 text-center font-semibold text-slate-700">1 Paket</td>
              <td className="py-1.5 px-3 text-right font-bold text-slate-900">{formatRupiah(notaData.hargaPaket)}</td>
            </tr>

            {notaData.diskonNominal > 0 && (
              <tr className="border-b border-slate-200 bg-rose-50/50">
                <td className="py-1.5 px-2 text-center font-bold text-slate-600">2</td>
                <td className="py-1.5 px-3 text-rose-700 font-medium">Potongan Diskon Promosi</td>
                <td className="py-1.5 px-2 text-center text-slate-500">-</td>
                <td className="py-1.5 px-3 text-right font-bold text-rose-600">- {formatRupiah(notaData.diskonNominal)}</td>
              </tr>
            )}

            <tr className="border-b border-slate-200 bg-slate-50 font-bold">
              <td colSpan={3} className="py-1.5 px-3 text-right pr-4 text-slate-700">Total Biaya Paket Kursus:</td>
              <td className="py-1.5 px-3 text-right text-slate-900 font-bold">{formatRupiah(notaData.totalTagihanBersih)}</td>
            </tr>

            {notaData.dpTerbayar > 0 && (
              <tr className="border-b border-slate-200 bg-emerald-50/40">
                <td colSpan={3} className="py-1.5 px-3 text-right pr-4 text-emerald-800 font-medium">Pembayaran Terdahulu (DP Masuk):</td>
                <td className="py-1.5 px-3 text-right text-emerald-700 font-bold">- {formatRupiah(notaData.dpTerbayar)}</td>
              </tr>
            )}

            {notaData.nominalBayarIni > 0 && (
              <tr className="border-b-2 border-emerald-600 bg-emerald-100/70 font-extrabold text-emerald-900">
                <td colSpan={3} className="py-2 px-3 text-right pr-4 text-xs tracking-wide">
                  {notaData.jenis === 'nota_dp' ? '★ JUMLAH PEMBAYARAN DP SAAT INI:' : notaData.jenis === 'nota_pelunasan' ? '★ JUMLAH PEMBAYARAN PELUNASAN:' : '★ JUMLAH DIBAYARKAN SAAT INI:'}
                </td>
                <td className="py-2 px-3 text-right text-xs font-black">{formatRupiah(notaData.nominalBayarIni)}</td>
              </tr>
            )}

            <tr className="bg-slate-50 font-extrabold">
              <td colSpan={3} className="py-1.5 px-3 text-right pr-4 text-slate-800">Sisa Tagihan / Piutang Berjalan:</td>
              <td className={`py-1.5 px-3 text-right text-xs font-black ${notaData.sisaPiutang <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {notaData.sisaPiutang <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(notaData.sisaPiutang)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── 5. TERBILANG BOX ── */}
        <div className="p-2 rounded-lg bg-slate-50 border border-dashed border-[#0F7A73] flex items-center gap-2 mb-3 text-[9.5px]">
          <span className="px-2 py-0.5 rounded bg-teal-100 text-[#0F7A73] font-black uppercase text-[8px] tracking-wider shrink-0">
            Terbilang
          </span>
          <span className="font-bold text-slate-800 italic">
            # {terbilangRupiah(notaData.nominalBayarIni > 0 ? notaData.nominalBayarIni : notaData.totalTagihanBersih)} #
          </span>
        </div>

        {/* ── 6. STATUS & CATATAN ROW ── */}
        <div className="flex items-center justify-between text-[9.5px] mb-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-semibold">Status:</span>
            <span className={`px-2.5 py-0.5 rounded-full font-black border text-[9px] tracking-wider ${statusBadge.bg}`}>
              {statusBadge.text}
            </span>
          </div>
          {notaData.catatanPembayaran && (
            <div className="text-slate-600 italic">
              Keterangan: <strong className="text-slate-800">{notaData.catatanPembayaran}</strong>
            </div>
          )}
        </div>
      </div>

      {/* ── 7. SIGNATURES & FOOTER ── */}
      <div className="pt-2">
        <div className="flex items-end justify-between text-[9.5px]">
          {/* Student Signature */}
          <div className="w-48 text-center">
            <div className="text-slate-500">&nbsp;</div>
            <div className="font-bold text-slate-800 mb-1">Penyetor / Siswa,</div>
            <div className="h-12" />
            <div className="font-black text-slate-900 border-t border-slate-700 pt-1">
              ({notaData.namaSiswa || 'Nama Siswa'})
            </div>
            <div className="text-[8px] text-slate-500 font-medium">Siswa Kursus</div>
          </div>

          {/* Admin Signature & Stamp */}
          <div className="w-56 text-center">
            <div className="text-slate-600 text-[9px] mb-1">
              {notaData.kota || 'Palembang'}, {formatDateLongIndo(notaData.tanggalDokumen)}
            </div>
            <div className="font-bold text-slate-800 mb-1">Petugas Kasir / Administrasi,</div>
            <div className="h-12 relative flex items-center justify-center">
              {notaData.showStempel && (
                <img
                  src={stampBase64}
                  alt="Cap Amanah Drive"
                  crossOrigin="anonymous"
                  style={{ width: '75px', height: '75px', objectFit: 'contain' }}
                  className="absolute -top-3 right-6 pointer-events-none opacity-85"
                />
              )}
            </div>
            <div className="font-black text-slate-900 border-t border-slate-700 pt-1">
              ({notaData.picNama || 'Admin Amanah Drive'})
            </div>
            <div className="text-[8px] text-slate-600 font-semibold">
              {notaData.picJabatan} — Amanah Drive
            </div>
          </div>
        </div>

        {/* Document Legal Footer */}
        <div className="text-center text-[7.5px] text-slate-400 border-t border-dashed border-slate-200 pt-2 mt-3">
          Dokumen resmi diterbitkan secara sah oleh Sistem Finansial Amanah Drive Palembang • Harap simpan bukti pembayaran ini untuk arsip Anda.
        </div>
      </div>
    </div>
  );
}
