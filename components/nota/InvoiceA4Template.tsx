'use client';

import React from 'react';
import {
  InvoiceDocumentData,
  PaginatedPage,
  businessConfig,
} from '@/lib/utils/nota-generator';
import { formatRupiah, terbilangRupiah } from '@/lib/utils/currency';
import { formatDateLongIndo } from '@/lib/utils/date';

export interface InvoiceA4TemplateProps {
  page: PaginatedPage<InvoiceDocumentData>;
  logoBase64: string;
  stampBase64: string;
}

export function InvoiceA4Template({
  page,
  logoBase64,
  stampBase64,
}: InvoiceA4TemplateProps) {
  const { data, pageItems, pageIndex, totalPages, showKop, showSummary, showSignature, showTerms } = page;

  const statusBadge =
    data.statusPembayaran === 'lunas'
      ? { text: 'LUNAS', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
      : data.statusPembayaran === 'dp'
      ? { text: 'BELUM LUNAS (DP)', bg: 'bg-amber-100 text-amber-800 border-amber-300' }
      : { text: 'BELUM BAYAR', bg: 'bg-rose-100 text-rose-800 border-rose-300' };

  return (
    <div className="h-full flex flex-col justify-between text-[10.5px] leading-relaxed text-slate-900">
      {/* ======================================================== */}
      {/* HEADER SECTION                                           */}
      {/* ======================================================== */}
      <div>
        {showKop ? (
          <div className="pb-3">
            <div className="flex items-center justify-between gap-4 pb-2.5">
              <div className="w-48 h-12 flex items-center">
                <img
                  src={logoBase64}
                  alt="Logo Amanah Drive"
                  crossOrigin="anonymous"
                  style={{ width: '180px', height: 'auto', maxHeight: '46px', objectFit: 'contain' }}
                />
              </div>
              <div className="text-right max-w-md">
                <h1 className="text-base font-black tracking-tight text-[#0F7A73]">
                  {businessConfig.name}
                </h1>
                <p className="text-[9px] font-bold text-[#0c4a45] uppercase tracking-wider">
                  {businessConfig.tagline}
                </p>
                <p className="text-[8.5px] text-slate-600 leading-tight mt-0.5">
                  {businessConfig.address}
                </p>
                <p className="text-[8.5px] font-bold text-[#0F7A73] mt-0.5">
                  Telp/WA: {businessConfig.phone} • Email: {businessConfig.email}
                </p>
              </div>
            </div>

            {/* Double Line Divider */}
            <div className="h-[2.5px] bg-[#0F7A73] rounded-full" />
            <div className="h-[1px] bg-[#0F7A73]/30 mt-[2px] mb-2.5" />
          </div>
        ) : (
          /* Running Header on Page 2+ */
          <div className="pb-2.5 mb-2 border-b border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
            <div className="font-bold text-[#0F7A73]">{businessConfig.name} — Invoice Tagihan Booking</div>
            <div>No: <strong className="font-mono text-slate-800">{data.nomorInvoice}</strong> • Siswa: <strong className="text-slate-800">{data.namaSiswa}</strong></div>
          </div>
        )}

        {/* Title & Document Meta Bar */}
        {showKop && (
          <div className="flex items-center justify-between bg-teal-50/90 border border-teal-200 px-3.5 py-2 rounded-lg mb-2.5">
            <div>
              <div className="text-xs font-black tracking-wide text-[#0F7A73] uppercase">
                INVOICE / TAGIHAN BOOKING KURSUS
              </div>
              <div className="text-[9px] text-slate-600">
                Bukti pemesanan & perincian tagihan resmi pelatihan mengemudi
              </div>
            </div>
            <div className="text-right text-[9.5px] text-slate-700 space-y-0.5">
              <div>No: <strong className="font-mono text-slate-900">{data.nomorInvoice}</strong></div>
              <div>Tanggal: <strong>{formatDateLongIndo(data.tanggalInvoice)}</strong></div>
            </div>
          </div>
        )}

        {/* Customer & Booking Details (Page 1) */}
        {showKop && (
          <div className="grid grid-cols-2 gap-3 mb-3 text-[10px]">
            {/* Box 1: Data Customer */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[8.5px] font-black uppercase tracking-wider text-[#0F7A73] border-b border-slate-200 pb-1 mb-1">
                Data Siswa / Pemesan
              </div>
              <div className="flex"><span className="w-24 text-slate-500">Nama Siswa</span><span className="w-3 text-center">:</span><span className="font-bold text-slate-900 truncate">{data.namaSiswa || '-'}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">Kode Siswa</span><span className="w-3 text-center">:</span><span className="font-mono font-bold text-slate-900">{data.kodeSiswa || '-'}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">No. WhatsApp</span><span className="w-3 text-center">:</span><span className="font-medium text-slate-800">{data.noWhatsapp || '-'}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">Alamat</span><span className="w-3 text-center">:</span><span className="text-slate-800 truncate">{data.alamatSiswa || '-'}</span></div>
            </div>

            {/* Box 2: Detail Pelatihan */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[8.5px] font-black uppercase tracking-wider text-[#0F7A73] border-b border-slate-200 pb-1 mb-1">
                Detail Paket Kursus
              </div>
              <div className="flex"><span className="w-24 text-slate-500">Paket Kursus</span><span className="w-3 text-center">:</span><span className="font-bold text-slate-900 truncate">{data.namaPaket || '-'}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">Durasi Pertemuan</span><span className="w-3 text-center">:</span><span className="font-semibold text-slate-800">{data.jumlahSesi} Sesi Latihan</span></div>
              <div className="flex"><span className="w-24 text-slate-500">Tipe Transmisi</span><span className="w-3 text-center">:</span><span className="font-semibold text-slate-800">{data.tipeMobil || 'Manual'}</span></div>
              <div className="flex"><span className="w-24 text-slate-500">Metode Bayar</span><span className="w-3 text-center">:</span><span className="font-semibold text-slate-900">{data.metodePembayaran === 'tunai' ? 'Tunai (Kas Fisik)' : data.metodePembayaran === 'transfer' ? `Transfer Bank ${data.namaBank || ''}` : 'QRIS'}</span></div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TABLE ITEMS                                             */}
        {/* ======================================================== */}
        <table className="w-full border-collapse border border-slate-200 text-[10px] mb-2.5">
          <thead>
            <tr className="bg-[#0F7A73] text-white">
              <th className="py-1.5 px-2 text-center w-8 font-bold border border-[#0F7A73]">No</th>
              <th className="py-1.5 px-3 text-left font-bold border border-[#0F7A73]">Rincian Layanan / Paket Pelatihan</th>
              <th className="py-1.5 px-2 text-center w-16 font-bold border border-[#0F7A73]">Qty</th>
              <th className="py-1.5 px-3 text-right w-40 font-bold border border-[#0F7A73]">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((item, idx) => (
              <tr key={item.no || idx} className={`border-b border-slate-200 ${item.isDiscount ? 'bg-rose-50/50 text-rose-700' : ''}`}>
                <td className="py-1.5 px-2 text-center font-bold text-slate-600">{item.no}</td>
                <td className="py-1.5 px-3">
                  <div className={`font-bold ${item.isDiscount ? 'text-rose-700' : 'text-slate-900'}`}>{item.uraian}</div>
                  {item.keterangan && <div className="text-[8.5px] text-slate-500">{item.keterangan}</div>}
                </td>
                <td className="py-1.5 px-2 text-center font-semibold text-slate-700">{item.qty}</td>
                <td className={`py-1.5 px-3 text-right font-bold ${item.isDiscount ? 'text-rose-600' : 'text-slate-900'}`}>
                  {item.nominal < 0 ? `- ${formatRupiah(Math.abs(item.nominal))}` : formatRupiah(item.nominal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Financial Summary Calculation (On Last Page) */}
        {showSummary && (
          <div className="w-full border border-slate-200 rounded-lg overflow-hidden mb-2.5">
            <table className="w-full text-[9.5px]">
              <tbody>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <td className="py-1 px-3 text-right text-slate-600 font-medium">Subtotal Biaya Paket Kursus:</td>
                  <td className="py-1 px-3 text-right font-bold text-slate-900 w-40">{formatRupiah(data.hargaPaket)}</td>
                </tr>

                {data.diskonNominal > 0 && (
                  <tr className="border-b border-slate-200 bg-rose-50/40">
                    <td className="py-1 px-3 text-right text-rose-700 font-medium">Potongan Diskon Promosi:</td>
                    <td className="py-1 px-3 text-right font-bold text-rose-600 w-40">- {formatRupiah(data.diskonNominal)}</td>
                  </tr>
                )}

                <tr className="border-b border-slate-200 bg-slate-100 font-bold">
                  <td className="py-1.5 px-3 text-right text-slate-800">Total Tagihan Bersih:</td>
                  <td className="py-1.5 px-3 text-right font-black text-slate-900 w-40">{formatRupiah(data.totalTagihanBersih)}</td>
                </tr>

                {data.dpTerbayar > 0 && (
                  <tr className="border-b border-slate-200 bg-emerald-50/40">
                    <td className="py-1 px-3 text-right text-emerald-800 font-medium">Pembayaran Terdahulu (DP Masuk):</td>
                    <td className="py-1 px-3 text-right font-bold text-emerald-700 w-40">- {formatRupiah(data.dpTerbayar)}</td>
                  </tr>
                )}

                {data.nominalBayarIni > 0 && (
                  <tr className="border-b-2 border-emerald-600 bg-emerald-100/80 font-extrabold text-emerald-950">
                    <td className="py-2 px-3 text-right text-xs tracking-wide">
                      JUMLAH PEMBAYARAN SAAT INI:
                    </td>
                    <td className="py-2 px-3 text-right text-xs font-black text-emerald-950 w-40">
                      {formatRupiah(data.nominalBayarIni)}
                    </td>
                  </tr>
                )}

                <tr className="bg-slate-50 font-black">
                  <td className="py-1.5 px-3 text-right text-slate-800">Sisa Tagihan / Piutang Berjalan:</td>
                  <td className={`py-1.5 px-3 text-right text-xs font-black w-40 ${data.sisaPiutang <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {data.sisaPiutang <= 0 ? 'Rp 0 (LUNAS)' : formatRupiah(data.sisaPiutang)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Terbilang & Status Row */}
        {showSummary && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-dashed border-[#0F7A73] mb-2.5 text-[9px]">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="px-1.5 py-0.5 rounded bg-teal-100 text-[#0F7A73] font-black uppercase text-[8px] tracking-wider shrink-0">
                Terbilang
              </span>
              <span className="font-bold text-slate-800 italic truncate">
                # {terbilangRupiah(data.nominalBayarIni > 0 ? data.nominalBayarIni : data.totalTagihanBersih)} #
              </span>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <span className="text-slate-600 font-semibold text-[8.5px]">Status:</span>
              <span className={`px-2 py-0.5 rounded-full font-black border text-[8.5px] tracking-wider ${statusBadge.bg}`}>
                {statusBadge.text}
              </span>
            </div>
          </div>
        )}

        {/* Syarat & Ketentuan Pelatihan (On Last Page) */}
        {showTerms && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 mb-2 text-[8.5px] leading-snug">
            <div className="font-black text-[#0F7A73] uppercase tracking-wider mb-1">
              Ketentuan Pelatihan Mengemudi:
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
              {(data.syaratKetentuan || []).map((term, i) => (
                <li key={i}>{term}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* FOOTER & SIGNATURE SECTION                               */}
      {/* ======================================================== */}
      <div>
        {showSignature && (
          <div className="flex items-end justify-between pt-1 text-[9.5px]">
            {/* Student Signature */}
            <div className="w-44 text-center">
              <div className="font-bold text-slate-800 mb-0.5">Penyetor / Siswa,</div>
              <div className="h-11" />
              <div className="font-black text-slate-900 border-t border-slate-700 pt-1">
                ({data.namaSiswa || 'Nama Siswa'})
              </div>
              <div className="text-[8px] text-slate-500 font-medium">Siswa Kursus</div>
            </div>

            {/* Official Admin Signature & Stamp */}
            <div className="w-56 text-center">
              <div className="text-slate-600 text-[8.5px] mb-0.5">
                {data.kota || businessConfig.city}, {formatDateLongIndo(data.tanggalInvoice)}
              </div>
              <div className="font-bold text-slate-800 mb-0.5">Petugas Administrasi & Kasir,</div>
              <div className="h-11 relative flex items-center justify-center">
                {data.showStempel && (
                  <img
                    src={stampBase64}
                    alt="Cap Amanah Drive"
                    crossOrigin="anonymous"
                    style={{ width: '70px', height: '70px', objectFit: 'contain' }}
                    className="absolute -top-2 right-6 pointer-events-none opacity-85"
                  />
                )}
              </div>
              <div className="font-black text-slate-900 border-t border-slate-700 pt-1">
                ({data.picNama || 'Admin Amanah Drive'})
              </div>
              <div className="text-[8px] text-slate-600 font-semibold">
                {data.picJabatan || 'Petugas Administrasi'} — Amanah Drive
              </div>
            </div>
          </div>
        )}

        {/* Legal Disclaimer & Bank Account & Page Number */}
        <div className="border-t border-dashed border-slate-200 pt-1.5 mt-2 flex items-center justify-between text-[7.5px] text-slate-500">
          <div>
            Pembayaran transfer hanya sah ke: <strong>{businessConfig.bankInfo}</strong>
          </div>
          <div>
            Dokumen resmi Amanah Drive Palembang
          </div>
          <div className="font-bold text-slate-700">
            Halaman {pageIndex} dari {totalPages}
          </div>
        </div>
      </div>
    </div>
  );
}
