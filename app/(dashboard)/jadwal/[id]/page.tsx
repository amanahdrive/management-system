'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { JadwalSesi } from '@/types/database';
import { getJadwalSesiById, upsertJadwalSesi } from '@/lib/actions/jadwal';
import { formatDateIndo } from '@/lib/utils/date';
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function JadwalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [sesi, setSesi] = React.useState<JadwalSesi | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [catatan, setCatatan] = React.useState('');

  const loadSesi = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await getJadwalSesiById(id);
    setSesi(data);
    if (data?.catatan_sesi) setCatatan(data.catatan_sesi);
    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    loadSesi();
  }, [loadSesi]);

  const handleUpdateStatus = async (status: 'selesai' | 'batal' | 'terjadwal') => {
    if (!sesi) return;
    const res = await upsertJadwalSesi({
      id: sesi.id,
      status_sesi: status,
      catatan_sesi: catatan,
    });
    if (res.success) {
      alert(`Status sesi berhasil diubah menjadi ${status.toUpperCase()}`);
      loadSesi();
    } else {
      alert('Gagal memperbarui status: ' + res.error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
      </div>
    );
  }

  if (!sesi) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detail Sesi Pembelajaran"
          description="Sesi tidak ditemukan"
          breadcrumbs={[{ label: 'Jadwal Sesi', href: '/jadwal' }, { label: 'Detail' }]}
        />
        <div className="card-container p-8 text-center text-[var(--text-secondary)]">
          <p className="font-semibold text-sm">Data jadwal sesi tidak ditemukan di database Supabase.</p>
          <Link href="/jadwal" className="mt-4 inline-flex items-center gap-2 text-xs text-[var(--brand-primary)] font-bold">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Jadwal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Detail Sesi Pembelajaran #${sesi.nomor_sesi_ke}`}
        description={`Sesi ${sesi.nomor_sesi_ke} dari ${sesi.total_sesi_paket} — Siswa ${sesi.siswa?.nama || '-'}`}
        breadcrumbs={[{ label: 'Jadwal Sesi', href: '/jadwal' }, { label: `Sesi #${sesi.nomor_sesi_ke}` }]}
        actions={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] rounded-md text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-container space-y-4 md:col-span-2">
          <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
            Informasi Sesi Mengemudi
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[var(--text-secondary)] font-medium">Siswa Kursus</p>
              <p className="font-bold text-sm text-[var(--brand-primary)] mt-0.5">
                {sesi.siswa?.nama} ({sesi.siswa?.kode_siswa})
              </p>
              <p className="text-[var(--text-secondary)] mt-0.5">{sesi.siswa?.no_whatsapp}</p>
            </div>

            <div>
              <p className="text-[var(--text-secondary)] font-medium">Instruktur Bertugas</p>
              <p className="font-bold text-sm text-[var(--text-primary)] mt-0.5">
                {sesi.instruktur?.nama || '-'}
              </p>
              <p className="text-[var(--text-secondary)] mt-0.5">{sesi.instruktur?.no_whatsapp || '-'}</p>
            </div>

            <div>
              <p className="text-[var(--text-secondary)] font-medium">Tanggal & Waktu</p>
              <p className="font-bold text-[var(--text-primary)] mt-0.5">
                {formatDateIndo(sesi.tanggal_sesi)}
              </p>
              <p className="text-[var(--text-secondary)]">
                {sesi.slot_waktu?.jam_mulai?.substring(0, 5)} - {sesi.slot_waktu?.jam_selesai?.substring(0, 5)} WIB
              </p>
            </div>

            <div>
              <p className="text-[var(--text-secondary)] font-medium">Mobil Operasional</p>
              <p className="font-bold text-[var(--text-primary)] mt-0.5">
                {sesi.kendaraan?.nama_kendaraan || '-'} ({sesi.jenis_mobil?.toUpperCase()})
              </p>
              <p className="text-[var(--text-secondary)]">{sesi.kendaraan?.plat_nomor || '-'}</p>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Catatan Progres Sesi / Materi Pelatihan
            </label>
            <textarea
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan progres latihan siswa..."
              className="w-full text-xs p-2.5 rounded-md border border-[var(--border)] bg-[var(--bg)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>
        </div>

        <div className="card-container space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-[var(--text-primary)] border-b border-[var(--border)] pb-2 mb-3">
              Status Sesi
            </h3>

            <div className="p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border)] text-center">
              <span
                className={`inline-block px-3 py-1 text-xs font-bold rounded text-white ${
                  sesi.status_sesi === 'selesai'
                    ? 'bg-emerald-600'
                    : sesi.status_sesi === 'batal'
                    ? 'bg-rose-600'
                    : 'bg-amber-600'
                }`}
              >
                {sesi.status_sesi.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleUpdateStatus('selesai')}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Tandai Selesai</span>
            </button>

            <button
              onClick={() => handleUpdateStatus('batal')}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Batalkan Sesi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
