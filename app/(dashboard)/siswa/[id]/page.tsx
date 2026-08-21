'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Siswa, KasTransaksi } from '@/types/database';
import { getSiswaById, getSiswaPaymentHistory } from '@/lib/actions/siswa';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo } from '@/lib/utils/date';
import { User, Phone, MapPin, Calendar, CreditCard, ArrowLeft, Receipt, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SiswaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [siswa, setSiswa] = React.useState<Siswa | null>(null);
  const [payments, setPayments] = React.useState<KasTransaksi[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (id) {
      Promise.all([getSiswaById(id), getSiswaPaymentHistory(id)]).then(([sRes, pRes]) => {
        setSiswa(sRes);
        setPayments(pRes as KasTransaksi[]);
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
              <span className="font-bold text-sm text-[var(--text-primary)]">
                {siswa.paket?.nama_paket || 'Khusus'} ({siswa.paket?.jumlah_sesi || 0} Sesi)
              </span>
            </div>

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
              <span
                className="inline-block mt-1 px-3 py-1 text-xs font-bold text-white rounded-md"
                style={{ backgroundColor: siswa.status_pembayaran?.warna_badge || '#5C6E6B' }}
              >
                {siswa.status_pembayaran?.label || siswa.status_pembayaran_kode}
              </span>
            </div>
          </div>
        </div>
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
