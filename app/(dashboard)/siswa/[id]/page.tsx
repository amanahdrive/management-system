'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Siswa, KasTransaksi, JadwalSesi } from '@/types/database';
import { getSiswaById, getSiswaPaymentHistory } from '@/lib/actions/siswa';
import { getJadwalBySiswa } from '@/lib/actions/jadwal';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, formatHariTanggalIndo } from '@/lib/utils/date';
import { formatSlotLabel } from '@/lib/utils/slot';
import {
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  ArrowLeft,
  Receipt,
  CheckCircle2,
  CalendarDays,
  Clock,
  Car,
  ExternalLink,
  PlusCircle,
  XCircle,
  AlertCircle,
  IdCard
} from 'lucide-react';
import Link from 'next/link';

export default function SiswaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [siswa, setSiswa] = React.useState<Siswa | null>(null);
  const [payments, setPayments] = React.useState<KasTransaksi[]>([]);
  const [jadwalList, setJadwalList] = React.useState<JadwalSesi[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (id) {
      Promise.all([
        getSiswaById(id),
        getSiswaPaymentHistory(id),
        getJadwalBySiswa(id),
      ]).then(([sRes, pRes, jRes]) => {
        setSiswa(sRes);
        setPayments(pRes as KasTransaksi[]);
        setJadwalList(jRes || []);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return <div className="h-64 card-container animate-pulse bg-black/5 dark:bg-white/5" />;
  }

  if (!siswa) {
    return (
      <div className="card-container text-center py-12">
        <p className="text-sm text-[var(--text-secondary)]">Data siswa tidak ditemukan.</p>
        <Link href="/siswa" className="mt-4 inline-block text-xs text-[var(--brand-primary)] underline">
          Kembali ke Data Siswa
        </Link>
      </div>
    );
  }

  const totalPaid = payments.reduce((sum, p) => sum + (p.nominal || 0), 0);
  const sisaPiutang = Math.max(0, siswa.harga_final - totalPaid);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Detail Siswa — ${siswa.nama}`}
        description={`Kode Siswa: ${siswa.kode_siswa}`}
        breadcrumbs={[{ label: 'Data Siswa', href: '/siswa' }, { label: siswa.kode_siswa }]}
        actions={
          <button
            onClick={() => router.push('/siswa')}
            className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] rounded-md text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Siswa Card */}
        <div className="card-container space-y-4 md:col-span-2">
          <div className="flex items-center gap-3 border-b border-[var(--border)] pb-3">
            <div className="w-10 h-10 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-sm">
              {siswa.nama.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-lg text-[var(--text-primary)]">{siswa.nama}</h3>
              <p className="text-xs text-[var(--text-secondary)] font-semibold">{siswa.kode_siswa}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-[var(--brand-primary)] mt-0.5" />
              <div>
                <span className="text-[var(--text-secondary)] block">No. WhatsApp</span>
                <span className="font-semibold text-[var(--text-primary)]">{siswa.no_whatsapp}</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[var(--brand-primary)] mt-0.5" />
              <div>
                <span className="text-[var(--text-secondary)] block">Alamat</span>
                <span className="font-semibold text-[var(--text-primary)]">{siswa.alamat || '-'}</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-[var(--brand-primary)] mt-0.5" />
              <div>
                <span className="text-[var(--text-secondary)] block">Tanggal Booking</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {formatDateIndo(siswa.tanggal_booking)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-[var(--brand-primary)] mt-0.5" />
              <div>
                <span className="text-[var(--text-secondary)] block">Rencana Mulai</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {formatDateIndo(siswa.tanggal_rencana_mulai)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Pembayaran Card */}
        <div className="card-container space-y-4">
          <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border)] pb-2">
            <CreditCard className="w-4 h-4 text-[var(--brand-primary)]" />
            Ringkasan Keuangan Siswa
          </h4>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[var(--text-secondary)] block">Paket Kursus</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[var(--text-primary)]">
                  {siswa.paket?.nama_paket || 'Khusus'} ({siswa.paket?.jumlah_sesi || 0} Sesi)
                </span>
                {siswa.paket?.termasuk_sim && (
                  <Link
                    href="/sim"
                    className="px-2 py-0.5 rounded-md bg-[var(--brand-primary-light)] text-[var(--brand-primary)] hover:underline font-bold text-[10px] inline-flex items-center gap-1"
                    title="Buka Manajemen SIM"
                  >
                    <IdCard className="w-3 h-3" />
                    <span>Paket + SIM</span>
                  </Link>
                )}
              </div>
            </div>

            {siswa.paket?.termasuk_sim && (
              <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
                    <IdCard className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    <span>Status Penerbitan SIM:</span>
                  </span>
                  <Link
                    href="/sim"
                    className="text-[10px] font-bold text-[var(--brand-primary)] hover:underline flex items-center gap-0.5"
                  >
                    <span>Kelola di Menu SIM</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    {siswa.status_sim === 'selesai' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Selesai (Terbit: {siswa.tanggal_selesai_sim ? formatDateIndo(siswa.tanggal_selesai_sim) : '-'})</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[11px] inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Proses (Belum Selesai)</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <span className="text-[var(--text-secondary)] block">Harga Final Tagihan</span>
              <span className="font-bold text-base text-[var(--brand-primary)] tabular-num">
                {formatRupiah(siswa.harga_final)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] block">Total Terbayar:</span>
                <span className="font-bold text-emerald-600 text-xs tabular-num">
                  {formatRupiah(totalPaid > 0 ? totalPaid : (siswa.status_pembayaran_kode === 'lunas' ? siswa.harga_final : (siswa.dp_nominal || 0)))}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] block">Sisa Tagihan:</span>
                <span className="font-bold text-rose-600 text-xs tabular-num">
                  {siswa.status_pembayaran_kode === 'lunas' ? 'Rp 0 (Lunas)' : formatRupiah(sisaPiutang)}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <span className="text-[var(--text-secondary)] block">Status Pembayaran:</span>
              <div className="mt-1">
                <span
                  className="inline-block px-3 py-1 text-xs font-bold text-white rounded-md shadow-xs"
                  style={{ backgroundColor: siswa.status_pembayaran?.warna_badge || (siswa.status_pembayaran_kode === 'lunas' ? '#1B8A5A' : siswa.status_pembayaran_kode === 'dp' ? '#B9821B' : '#C13D3D') }}
                >
                  {siswa.status_pembayaran_kode === 'dp'
                    ? `DP ${siswa.harga_final > 0 ? Math.round(((siswa.dp_nominal || 0) / siswa.harga_final) * 100) : 0}% (${formatRupiah(siswa.dp_nominal || 0)})`
                    : (siswa.status_pembayaran?.label || siswa.status_pembayaran_kode)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border)]">
              <Link
                href="/kas"
                className="w-full py-2 px-3 rounded-md bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Input Pembayaran di Kas</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Daftar Jadwal Pembelajaran / Kursus Siswa */}
      <div className="card-container space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-[var(--text-primary)]">
                Daftar Jadwal Pembelajaran / Kursus
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                {jadwalList.length > 0
                  ? `Siswa memiliki ${jadwalList.length} sesi yang telah dijadwalkan`
                  : 'Belum ada jadwal yang diatur untuk siswa ini'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/jadwal"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-primary)] transition-colors shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              <span>Buka Menu Jadwal</span>
            </Link>
          </div>
        </div>

        {/* Status ringkasan jumlah sesi */}
        {jadwalList.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)]">
              <span className="text-[11px] font-medium text-[var(--text-secondary)] block">Total Sesi Terdaftar</span>
              <span className="text-lg font-bold text-[var(--text-primary)]">
                {jadwalList.length} <span className="text-xs font-normal text-[var(--text-muted)]">/ {siswa.paket?.jumlah_sesi || jadwalList[0]?.total_sesi_paket || '-'} sesi paket</span>
              </span>
            </div>

            <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/20 dark:bg-emerald-950/10">
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 block">Sesi Selesai</span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {jadwalList.filter((j) => j.status_sesi === 'selesai').length}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-950/60 bg-amber-50/20 dark:bg-amber-950/10">
              <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 block">Akan Datang (Terjadwal)</span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {jadwalList.filter((j) => j.status_sesi === 'terjadwal').length}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-950/60 bg-rose-50/20 dark:bg-rose-950/10">
              <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 block">Sesi Dibatalkan</span>
              <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                {jadwalList.filter((j) => j.status_sesi === 'batal').length}
              </span>
            </div>
          </div>
        )}

        {jadwalList.length === 0 ? (
          <div className="text-center py-8 px-4 border border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-subtle)] space-y-3">
            <div className="w-12 h-12 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Belum Ada Jadwal untuk Siswa Ini
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Siswa belum memiliki jadwal sesi latihan yang dimasukkan ke sistem.
              </p>
            </div>
            <Link
              href="/jadwal"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-bold transition-colors shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Atur Jadwal di Menu Jadwal</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                  <th className="py-2.5 px-3 text-center w-16">Sesi</th>
                  <th className="py-2.5 px-3">Hari & Tanggal</th>
                  <th className="py-2.5 px-3">Waktu / Slot</th>
                  <th className="py-2.5 px-3">Instruktur</th>
                  <th className="py-2.5 px-3">Mobil & Transmisi</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3">Catatan</th>
                  <th className="py-2.5 px-3 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {jadwalList.map((sesi) => {
                  const isSelesai = sesi.status_sesi === 'selesai';
                  const isBatal = sesi.status_sesi === 'batal';
                  const isTerjadwal = sesi.status_sesi === 'terjadwal';

                  return (
                    <tr
                      key={sesi.id}
                      className={`hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                        isSelesai
                          ? 'bg-emerald-50/10'
                          : isBatal
                          ? 'bg-rose-50/10'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span className="inline-block px-2 py-0.5 rounded bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-extrabold text-[11px]">
                          #{sesi.nomor_sesi_ke}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {formatHariTanggalIndo(sesi.tanggal_sesi)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                          <Clock className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                          <span>{formatSlotLabel(sesi.slot_waktu, sesi.slot_waktu_akhir)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                        {sesi.instruktur?.nama || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                        <div className="flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                          <span>
                            {sesi.kendaraan?.nama_kendaraan
                              ? `${sesi.kendaraan.nama_kendaraan} (${sesi.kendaraan.plat_nomor || sesi.jenis_mobil})`
                              : sesi.jenis_mobil?.toUpperCase() || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-2xs ${
                            isSelesai
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isBatal
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {isSelesai && <CheckCircle2 className="w-3 h-3" />}
                          {isBatal && <XCircle className="w-3 h-3" />}
                          {isTerjadwal && <Clock className="w-3 h-3" />}
                          <span>{isSelesai ? 'Selesai' : isBatal ? 'Batal' : 'Terjadwal'}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)] italic max-w-[200px] truncate">
                        {sesi.catatan_sesi || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Link
                          href={`/jadwal/${sesi.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-subtle)] hover:bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--border)] font-semibold text-[10px] transition-colors"
                          title="Lihat Detail & Kelola Sesi Ini"
                        >
                          <span>Kelola</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Riwayat Mutasi / Pembayaran Kas Siswa */}
      <div className="card-container space-y-3">
        <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border)] pb-2">
          <Receipt className="w-4 h-4 text-emerald-600" />
          Riwayat Pembayaran & Catatan Buku Kas
        </h4>

        {payments.length === 0 ? (
          <p className="text-xs text-[var(--text-secondary)] italic py-3">
            Belum ada catatan mutasi kas pembayaran untuk siswa ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                  <th className="py-2 px-3">Tanggal</th>
                  <th className="py-2 px-3">Keterangan / Transaksi</th>
                  <th className="py-2 px-3">Metode</th>
                  <th className="py-2 px-3 text-right">Nominal Masuk</th>
                  <th className="py-2 px-3 text-center">PIC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                    <td className="py-2 px-3 whitespace-nowrap font-medium text-[var(--text-primary)]">
                      {formatDateIndo(p.tanggal)}
                    </td>
                    <td className="py-2 px-3 text-[var(--text-primary)] font-semibold">
                      {p.keterangan}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.jenis_pembayaran === 'tunai' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {p.jenis_pembayaran === 'tunai' ? 'Tunai' : 'Transfer Bank'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-num font-bold text-emerald-600">
                      {formatRupiah(p.nominal)}
                    </td>
                    <td className="py-2 px-3 text-center text-[var(--text-secondary)]">
                      {p.pic_nama || 'Admin'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
