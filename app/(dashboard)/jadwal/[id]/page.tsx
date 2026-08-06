'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { JadwalSesi } from '@/types/database';
import { upsertJadwalSesi } from '@/lib/actions/jadwal';
import { formatDateIndo } from '@/lib/utils/date';
import { CheckCircle2, XCircle, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

export default function JadwalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [sesi, setSesi] = React.useState<JadwalSesi | null>({
    id: id,
    siswa_id: 's1',
    staff_id: 'st1',
    kendaraan_id: 'k1',
    jenis_mobil: 'manual',
    tanggal_sesi: new Date().toISOString().slice(0, 10),
    slot_waktu_id: 'sl1',
    slot_waktu_id_akhir: null,
    nomor_sesi_ke: 1,
    total_sesi_paket: 5,
    status_sesi: 'terjadwal',
    catatan_sesi: 'Pengenalan instrumen dasar mengemudi',
    created_at: '',
    updated_at: '',
    siswa: {
      id: 's1',
      kode_siswa: 'SS001',
      nama: 'Budi Santoso',
      tanggal_booking: '',
      tanggal_rencana_mulai: '',
      no_whatsapp: '081299887766',
      alamat: 'Jl. Merdeka No. 12, Palembang',
      paket_id: 'p1',
      harga_final: 800000,
      harga_manual_override: false,
      promosi_id: null,
      status_pembayaran_kode: 'lunas',
      dp_nominal: null,
      dp_tanggal: null,
      sumber: 'meta_ads',
      sumber_kustom_text: null,
      catatan: null,
      created_at: '',
      updated_at: '',
    },
    instruktur: {
      id: 'st1',
      nama: 'Syawal',
      foto_url: null,
      tahun_bergabung: 2023,
      no_whatsapp: '',
      alamat: '',
      tanda_tangan_url: null,
      aktif: true,
      created_at: '',
      updated_at: '',
    },
  });

  const handleUpdateStatus = async (newStatus: 'selesai' | 'batal') => {
    if (!sesi) return;
    await upsertJadwalSesi({ ...sesi, status_sesi: newStatus });
    setSesi({ ...sesi, status_sesi: newStatus });
  };

  if (!sesi) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Detail Sesi Mengemudi — ${sesi.siswa?.nama}`}
        description={`Sesi ke-${sesi.nomor_sesi_ke} dari total ${sesi.total_sesi_paket} sesi`}
        breadcrumbs={[{ label: 'Jadwal', href: '/jadwal' }, { label: `Sesi #${sesi.nomor_sesi_ke}` }]}
        actions={
          <button
            onClick={() => router.push('/jadwal')}
            className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] rounded-md text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-container space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)]">Informasi Sesi</h3>
              <p className="text-xs text-[var(--text-secondary)]">Tanggal: {formatDateIndo(sesi.tanggal_sesi)}</p>
            </div>
            <span
              className={`px-3 py-1 text-xs rounded-md font-bold text-white ${
                sesi.status_sesi === 'selesai'
                  ? 'bg-[var(--success)]'
                  : sesi.status_sesi === 'batal'
                  ? 'bg-[var(--danger)]'
                  : 'bg-[var(--info)]'
              }`}
            >
              {sesi.status_sesi.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[var(--text-secondary)] block">Nama Siswa:</span>
              <span className="font-bold text-[var(--text-primary)] text-sm">{sesi.siswa?.nama}</span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Instruktur:</span>
              <span className="font-bold text-[var(--brand-primary)] text-sm">{sesi.instruktur?.nama}</span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Opsi Mobil:</span>
              <span className="font-semibold uppercase">{sesi.jenis_mobil}</span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)] block">Catatan Sesi:</span>
              <span>{sesi.catatan_sesi || '-'}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[var(--border)] flex flex-wrap items-center gap-3">
            {sesi.status_sesi === 'terjadwal' && (
              <>
                <button
                  onClick={() => handleUpdateStatus('selesai')}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--success)] hover:bg-emerald-700 text-white text-xs font-semibold rounded-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tandai Sesi Selesai</span>
                </button>
                <button
                  onClick={() => handleUpdateStatus('batal')}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--danger)] hover:bg-red-700 text-white text-xs font-semibold rounded-md"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Tandai Batal</span>
                </button>
              </>
            )}

            {sesi.status_sesi === 'selesai' && sesi.nomor_sesi_ke < sesi.total_sesi_paket && (
              <button
                onClick={() => router.push('/jadwal')}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-primary)] text-white text-xs font-semibold rounded-md"
              >
                <Plus className="w-4 h-4" />
                <span>+ Jadwalkan Sesi Berikutnya (Sesi #{sesi.nomor_sesi_ke + 1})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
