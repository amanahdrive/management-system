'use client';

import React from 'react';
import {
  ReceiptDocumentData,
  PaginatedPage,
  businessConfig,
  getJenisInfo,
} from '@/lib/utils/nota-generator';
import { formatRupiah, terbilangRupiah } from '@/lib/utils/currency';
import { formatDateLongIndo } from '@/lib/utils/date';

export interface ReceiptA5TemplateProps {
  page: PaginatedPage<ReceiptDocumentData>;
  logoBase64: string;
  stampBase64: string;
}

export function ReceiptA5Template({
  page,
  logoBase64,
  stampBase64,
}: ReceiptA5TemplateProps) {
  const { data, pageItems, pageIndex, totalPages, showKop, showSummary, showSignature } = page;
  const docInfo = getJenisInfo(data.jenis);

  const statusBadge =
    data.statusPembayaran === 'lunas'
      ? { text: 'LUNAS', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
      : data.statusPembayaran === 'dp'
      ? { text: 'BELUM LUNAS (DP)', bg: 'bg-amber-100 text-amber-800 border-amber-300' }
      : { text: 'BELUM BAYAR', bg: 'bg-rose-100 text-rose-800 border-rose-300' };

  return (
    <div className="h-full flex flex-col justify-between text-[9.5px] leading-snug text-slate-900">
      {/* ======================================================== */}
      {/* HEADER SECTION                                           */}
      {/* ======================================================== */}
      <div>
        {showKop ? (
          <div>
            <div className="flex items-center justify-between pb-1.5">
              <div className="w-40 h-9 flex items-center">
                <img
                  src={logoBase64}
                  alt="Logo Amanah Drive"
                  crossOrigin="anonymous"
                  style={{ width: '150px', height: 'auto', maxHeight: '38px', objectFit: 'contain' }}
                />
              </div>
              <div className="text-right max-w-sm">
                <h1 className="text-sm font-black tracking-tight text-[#0F7A73]">
                  {businessConfig.name}
                </h1>
                <p className="text-[8px] font-bold text-[#0c4a45] uppercase tracking-wider">
                  {businessConfig.tagline}
                </p>
                <p className="text-[7.5px] text-slate-600 leading-tight">
                  {businessConfig.address} • Telp/WA: {businessConfig.phone}
                </p>
              </div>
            </div>

            {/* Double Line Divider */}
            <div className="h-[2px] bg-[#0F7A73] rounded-full" />
            <div className="h-[0.5px] bg-[#0F7A73]/30 mt-[1.5px] mb-2" />
          </div>
        ) : (
          /* Running Header on Page 2+ */
          <div className="pb-1.5 mb-1.5 border-b border-slate-200 flex items-center justify-between text-[8px] text-slate-500">
            <div className="font-bold text-[#0F7A73]">{businessConfig.name} — {docInfo.title}</div>
            <div>No: <strong className="font-mono text-slate-800">{data.nomorNota}</strong> • Siswa: <strong className="text-slate-800">{data.namaSiswa}</strong></div>
          </div>
        )}

        {/* Title Bar & Doc Info */}
        {showKop && (
          <div className="flex items-center justify-between bg-teal-50/90 border border-teal-200 px-3 py-1.5 rounded-lg mb-2">
            <div className="text-[11px] font-black tracking-wide text-[#0F7A73] uppercase">
              {docInfo.title}
            </div>
            <div className="text-right text-[8.5px] text-slate-700">
              <span>No: <strong className="font-mono text-slate-900">{data.nomorNota}</strong></span>
              <span className="mx-2">•</span>
              <span>Tanggal: <strong>{formatDateLongIndo(data.tanggalNota)}</strong></span>
            </div>
          </div>
        )}

        {/* Compact 2-Column Info Grid */}
        {showKop && (
          <div className="grid grid-cols-2 gap-2 mb-2 text-[9px]">
            {/* Left Box: Customer Info */}
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
              <div className="flex"><span className="w-20 text-slate-500">Nama Siswa</span><span className="w-2 text-center">:</span><span className="font-bold text-slate-900 truncate">{data.namaSiswa || '-'}</span></div>
              <div className="flex"><span className="w-20 text-slate-500">Kode Siswa</span><span className="w-2 text-center">:</span><span className="font-mono font-bold text-slate-900">{data.kodeSiswa || '-'}</span></div>
              <div className="flex"><span className="w-20 text-slate-500">No. WhatsApp</span><span className="w-2 text-center">:</span><span className="font-medium text-slate-800">{data.noWhatsapp || '-'}</span></div>
            </div>

            {/* Right Box: Course & Payment Info */}
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
              <div className="flex"><span className="w-22 text-slate-500">Paket Kursus</span><span className="w-2 text-center">:</span><span className="font-bold text-slate-900 truncate">{data.namaPaket || '-'} ({data.jumlahSesi} Sesi)</span></div>
              <div className="flex"><span className="w-22 text-slate-500">Metode Bayar</span><span className="w-2 text-center">:</span><span className="font-semibold text-slate-800">{data.metodePembayaran === 'tunai' ? 'Tunai (Kas Fisik)' : data.metodePembayaran === 'transfer' ? `Transfer Bank ${data.namaBank || ''}` : 'QRIS'}</span></div>
              <div className="flex items-center"><span className="w-22 text-slate-500">Status Bayar</span><span className="w-2 text-center">:</span><span className={`px-1.5 py-0.2 rounded-full font-black border text-[8px] tracking-wider ${statusBadge.bg}`}>{statusBadge.text}</span></div>
            </div>
          </div>
        )}

        {/* Compact Items Table */}
        <table className="w-full border-collapse border border-slate-200 text-[9px] mb-1.5">
          <thead>
            <tr className="bg-[#0F7A73] text-white">
              <th className="py-1 px-1.5 text-center w-7 font-bold border border-[#0F7A73]">No</th>
              <th className="py-1 px-2.5 text-left font-bold border border-[#0F7A73]">Keterangan Transaksi / Rincian</th>
              <th className="py-1 px-2 text-center w-14 font-bold border border-[#0F7A73]">Qty</th>
              <th className="py-1 px-2.5 text-right w-36 font-bold border border-[#0F7A73]">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item, idx) => (
              <tr key={item.no || idx} className={`border-b border-slate-200 ${item.isDiscount ? 'bg-rose-50/40 text-rose-700' : ''}`}>
                <td className="py-1 px-1.5 text-center font-bold text-slate-600">{item.no}</td>
                <td className="py-1 px-2.5">
                  <span className={`font-bold ${item.isDiscount ? 'text-rose-700' : 'text-slate-900'}`}>{item.uraian}</span>
                  {item.keterangan && <span className="text-[8px] text-slate-500 ml-1.5">({item.keterangan})</span>}
                </td>
                <td className="py-1 px-2 text-center font-semibold text-slate-700">{item.qty}</td>
                <td className={`py-1 px-2.5 text-right font-bold ${item.isDiscount ? 'text-rose-600' : 'text-slate-900'}`}>
                  {item.nominal < 0 ? `- ${formatRupiah(Math.abs(item.nominal))}` : formatRupiah(item.nominal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Compact Calculation Box (Last Page) */}
        {showSummary && (
          <div className="w-full border border-slate-200 rounded-lg overflow-hidden mb-1.5 text-[8.5px]">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <td className="py-0.5 px-2.5 text-right text-slate-600 font-medium">Total Tagihan / Biaya Layanan:</td>
                  <td className="py-0.5 px-2.5 text-right font-bold text-slate-900 w-36">{formatRupiah(data.totalTagihanBersih)}</td>
                </tr>

                {data.dpTerbayar > 0 && (
                  <tr className="border-b border-slate-200 bg-emerald-50/30">
                    <td className="py-0.5 px-2.5 text-right text-emerald-800 font-medium">Pembayaran Terdahulu (DP Masuk):</td>
                    <td className="py-0.5 px-2.5 text-right font-bold text-emerald-700 w-36">- {formatRupiah(data.dpTerbayar)}</td>
                  </tr>
                )}

                {data.nominalBayarIni > 0 && (
                  <tr className="border-b-2 border-emerald-600 bg-emerald-100/80 font-extrabold text-emerald-950">
                    <td className="py-1 px-2.5 text-right text-[9.5px] tracking-wide">
                      {data.jenis === 'nota_dp'
                        ? 'JUMLAH PEMBAYARAN DP SAAT INI:'
                        : data.jenis === 'nota_pelunasan'
                        ? 'JUMLAH PEMBAYARAN PELUNASAN:'
                        : 'JUMLAH DIBAYARKAN SAAT INI:'}
                    </td>
                    <td className="py-1 px-2.5 text-right text-[10px] font-black text-emerald-950 w-36">
                      {formatRupiah(data.nominalBayarIni)}
                    </td>
                  </tr>
                )}

                <tr className="bg-slate-50 font-black">
                  <td className="py-0.5 px-2.5 text-right text-slate-800">Sisa Tagihan / Piutang Berjalan:</td>
                  <td className={`py-0.5 px-2.5 text-right text-[9.5px] font-black w-36 ${data.sisaPiutang <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {data.sisaPiutang <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(data.sisaPiutang)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Terbilang & Notes */}
        {showSummary && (
          <div className="p-1.5 rounded-lg bg-slate-50 border border-dashed border-[#0F7A73] mb-1.5 flex items-center justify-between text-[8px]">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span className="px-1.5 py-0.2 rounded bg-teal-100 text-[#0F7A73] font-black uppercase text-[7px] tracking-wider shrink-0">
                Terbilang
              </span>
              <span className="font-bold text-slate-800 italic truncate">
                # {terbilangRupiah(data.nominalBayarIni > 0 ? data.nominalBayarIni : data.totalTagihanBersih)} #
              </span>
            </div>
            {data.catatanPembayaran && (
              <div className="text-slate-500 italic shrink-0 max-w-xs truncate">
                Ket: <strong>{data.catatanPembayaran}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* FOOTER & SIGNATURE SECTION                               */}
      {/* ======================================================== */}
      <div>
        {showSignature && (
          <div className="flex items-end justify-between pt-0.5 text-[8.5px]">
            {/* Student Signature */}
            <div className="w-36 text-center">
              <div className="font-bold text-slate-800 mb-0.5">Penyetor / Siswa,</div>
              <div className="h-9" />
              <div className="font-black text-slate-900 border-t border-slate-700 pt-0.5 truncate">
                ({data.namaSiswa || 'Nama Siswa'})
              </div>
              <div className="text-[7.5px] text-slate-500 font-medium">Siswa Kursus</div>
            </div>

            {/* Official Admin Signature & Stamp */}
            <div className="w-48 text-center">
              <div className="text-slate-600 text-[8px] mb-0.5">
                {data.kota || businessConfig.city}, {formatDateLongIndo(data.tanggalNota)}
              </div>
              <div className="font-bold text-slate-800 mb-0.5">Petugas Kasir / Administrasi,</div>
              <div className="h-9 relative flex items-center justify-center">
                {data.showStempel && (
                  <img
                    src={stampBase64}
                    alt="Cap Amanah Drive"
                    crossOrigin="anonymous"
                    style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                    className="absolute -top-2 right-4 pointer-events-none opacity-85"
                  />
                )}
              </div>
              <div className="font-black text-slate-900 border-t border-slate-700 pt-0.5 truncate">
                ({data.picNama || 'Admin Amanah Drive'})
              </div>
              <div className="text-[7.5px] text-slate-600 font-semibold">
                {data.picJabatan || 'Petugas Administrasi'} — Amanah Drive
              </div>
            </div>
          </div>
        )}

        {/* Footer Legal & Page Number */}
        <div className="border-t border-dashed border-slate-200 pt-1 mt-1 flex items-center justify-between text-[7px] text-slate-400">
          <div>
            Bukti pembayaran sah diterbitkan oleh Sistem Finansial Amanah Drive Palembang
          </div>
          <div className="font-bold text-slate-600">
            Halaman {pageIndex} dari {totalPages}
          </div>
        </div>
      </div>
    </div>
  );
}
