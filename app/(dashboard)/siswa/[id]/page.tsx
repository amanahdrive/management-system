'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Siswa } from '@/types/database';
import { getSiswaById, createOrUpdateSiswa } from '@/lib/actions/siswa';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo } from '@/lib/utils/date';
import { User, Phone, MapPin, Calendar, CreditCard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SiswaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [siswa, setSiswa] = React.useState<Siswa | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (id) {
      getSiswaById(id).then((res) => {
        setSiswa(res);
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
              <p className="text-xs text-[var(--text-secondary)] font-mono">{siswa.kode_siswa}</p>
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
                <span className="font-semibold text-[var(--text-primary)]">{siswa.alamat}</span>
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
            Status Pembayaran
          </h4>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[var(--text-secondary)] block">Paket Terpilih</span>
              <span className="font-bold text-sm text-[var(--text-primary)]">
                {siswa.paket?.nama_paket || 'Khusus'}
              </span>
            </div>

            <div>
              <span className="text-[var(--text-secondary)] block">Harga Final Paket</span>
              <span className="font-bold text-base text-[var(--brand-primary)]">
                {formatRupiah(siswa.harga_final)}
              </span>
            </div>

            <div>
              <span className="text-[var(--text-secondary)] block">Status Saat Ini</span>
              <span
                className="inline-block mt-1 px-3 py-1 text-xs font-bold text-white rounded-md"
                style={{ backgroundColor: siswa.status_pembayaran?.warna_badge || '#5C6E6B' }}
              >
                {siswa.status_pembayaran?.label || siswa.status_pembayaran_kode}
              </span>
            </div>

            {siswa.dp_nominal && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-md">
                <span className="text-[var(--text-secondary)] block">Nominal DP Terbayar:</span>
                <span className="font-bold text-amber-800 dark:text-amber-400">
                  {formatRupiah(siswa.dp_nominal)} ({formatDateIndo(siswa.dp_tanggal)})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
