'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { JadwalSesi, Staff, SlotWaktu } from '@/types/database';
import {
  getJadwalSesiById,
  getJadwalBySiswa,
  upsertJadwalSesi,
  deleteJadwalSesi,
} from '@/lib/actions/jadwal';
import { getInstrukturList, getSlotWaktuList } from '@/lib/actions/master-data';
import { formatDateIndo } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Calendar,
  User,
  Info,
} from 'lucide-react';
import Link from 'next/link';

export default function JadwalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [mainSesi, setMainSesi] = React.useState<JadwalSesi | null>(null);
  const [allSesi, setAllSesi] = React.useState<JadwalSesi[]>([]);
  const [instrukturList, setInstrukturList] = React.useState<Staff[]>([]);
  const [slotList, setSlotList] = React.useState<SlotWaktu[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Edit State per Sesi ID
  const [editingSesiId, setEditingSesiId] = React.useState<string | null>(null);
  const [editFormData, setEditFormData] = React.useState<Partial<JadwalSesi>>({});

  const loadData = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await getJadwalSesiById(id);
    setMainSesi(data);

    if (data?.siswa_id) {
      const studentSessions = await getJadwalBySiswa(data.siswa_id);
      setAllSesi(studentSessions);
    }

    const [insList, swList] = await Promise.all([
      getInstrukturList(),
      getSlotWaktuList(),
    ]);
    setInstrukturList(insList);
    setSlotList(swList);

    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartEdit = (sesi: JadwalSesi) => {
    setEditingSesiId(sesi.id);
    setEditFormData({
      id: sesi.id,
      tanggal_sesi: sesi.tanggal_sesi,
      slot_waktu_id: sesi.slot_waktu_id,
      staff_id: sesi.staff_id,
      status_sesi: sesi.status_sesi,
      catatan_sesi: sesi.catatan_sesi || '',
    });
  };

  const handleSaveSesi = async (sesiId: string) => {
    const payload = {
      ...editFormData,
      id: sesiId,
    };
    const res = await upsertJadwalSesi(payload);
    if (res.success) {
      setEditingSesiId(null);
      loadData();
    } else {
      alert('Gagal menyimpan perubahan: ' + res.error);
    }
  };

  const handleDeleteSesi = async (sesiId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus sesi latihan ini?')) {
      const res = await deleteJadwalSesi(sesiId);
      if (res.success) {
        if (sesiId === id) {
          router.push('/jadwal');
        } else {
          loadData();
        }
      } else {
        alert('Gagal menghapus: ' + res.error);
      }
    }
  };

  const handleAddSessionRow = async () => {
    if (!mainSesi || !mainSesi.siswa_id) return;
    const nextNomor = allSesi.length + 1;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const payload: Partial<JadwalSesi> = {
      siswa_id: mainSesi.siswa_id,
      staff_id: mainSesi.staff_id || instrukturList[0]?.id,
      slot_waktu_id: mainSesi.slot_waktu_id || slotList[0]?.id,
      tanggal_sesi: tomorrowStr,
      nomor_sesi_ke: nextNomor,
      total_sesi_paket: mainSesi.total_sesi_paket,
      status_sesi: 'terjadwal',
      jenis_mobil: mainSesi.jenis_mobil || 'manual',
    };

    const res = await upsertJadwalSesi(payload);
    if (res.success) {
      loadData();
    } else {
      alert('Gagal menambah sesi: ' + res.error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
      </div>
    );
  }

  if (!mainSesi) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detail Sesi & Siswa"
          description="Siswa tidak ditemukan"
          breadcrumbs={[{ label: 'Jadwal Sesi', href: '/jadwal' }, { label: 'Detail' }]}
        />
        <div className="card-container p-8 text-center text-[var(--text-secondary)]">
          <p className="font-semibold text-sm">Data jadwal sesi tidak ditemukan di database.</p>
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
        title={`Jadwal Sesi Siswa: ${mainSesi.siswa?.nama || 'Siswa'}`}
        description={`Mengelola seluruh riwayat sesi mengemudi untuk siswa ${mainSesi.siswa?.nama} (${mainSesi.siswa?.kode_siswa})`}
        breadcrumbs={[{ label: 'Jadwal Sesi', href: '/jadwal' }, { label: 'Detail Siswa' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddSessionRow}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Sesi Ekstra</span>
            </button>
            <button
              onClick={() => router.push('/jadwal')}
              className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] text-xs font-semibold rounded-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Card: Student Info */}
        <div className="card-container space-y-4 lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
            <User className="w-5 h-5 text-[var(--brand-primary)]" />
            <h3 className="font-bold text-sm text-[var(--text-primary)]">
              Informasi Siswa
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <p className="text-[var(--text-secondary)] font-medium">Nama Lengkap</p>
              <p className="font-bold text-sm text-[var(--text-primary)] mt-0.5">
                {mainSesi.siswa?.nama}
              </p>
            </div>

            <div>
              <p className="text-[var(--text-secondary)] font-medium">Kode Siswa</p>
              <p className="font-mono font-bold text-[var(--brand-primary)]">
                {mainSesi.siswa?.kode_siswa || '-'}
              </p>
            </div>

            <div>
              <p className="text-[var(--text-secondary)] font-medium">No. WhatsApp</p>
              <p className="font-semibold text-[var(--text-primary)]">
                {mainSesi.siswa?.no_whatsapp || '-'}
              </p>
            </div>

            <div>
              <p className="text-[var(--text-secondary)] font-medium">Paket Kursus</p>
              <p className="font-bold text-indigo-600 dark:text-indigo-400">
                {mainSesi.siswa?.paket?.nama_paket || 'Paket Sesi'} ({mainSesi.total_sesi_paket} Sesi)
              </p>
            </div>

            <div>
              <p className="text-[var(--text-secondary)] font-medium">Jenis Transmisi Mobil</p>
              <p className="font-bold text-[var(--text-primary)] uppercase">
                {mainSesi.jenis_mobil || 'manual'}
              </p>
            </div>

            <div>
              <p className="text-[var(--text-secondary)] font-medium">Alamat</p>
              <p className="text-[var(--text-primary)] leading-relaxed">
                {mainSesi.siswa?.alamat || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: All Sessions Timeline/List */}
        <div className="card-container lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--brand-primary)]" />
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Daftar Jadwal Seluruh Sesi Pembelajaran
              </h3>
            </div>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Total: <span className="font-bold text-[var(--text-primary)]">{allSesi.length} Sesi Terdaftar</span>
            </span>
          </div>

          <div className="space-y-4">
            {allSesi.map((sesi, index) => {
              const isEditing = editingSesiId === sesi.id;

              return (
                <div
                  key={sesi.id}
                  className={`p-4 border rounded-lg transition-all space-y-3 ${
                    isEditing
                      ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-light)]/20'
                      : sesi.status_sesi === 'selesai'
                      ? 'border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/10'
                      : sesi.status_sesi === 'batal'
                      ? 'border-rose-200 dark:border-rose-950/60 bg-rose-50/10'
                      : 'border-[var(--border)] bg-[var(--bg)]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[var(--brand-primary)] bg-[var(--brand-primary-light)] px-2 py-0.5 rounded">
                        Sesi {sesi.nomor_sesi_ke}
                      </span>
                      {!isEditing && (
                        <span className="text-[var(--text-secondary)] font-medium">
                          • {formatDateIndo(sesi.tanggal_sesi)} •{' '}
                          {sesi.slot_waktu?.nama_slot}{' '}
                          {sesi.slot_waktu_akhir && sesi.slot_waktu_akhir.id !== sesi.slot_waktu?.id
                            ? `s/d ${sesi.slot_waktu_akhir.nama_slot} (${sesi.slot_waktu?.jam_mulai?.substring(0, 5) || ''} - ${sesi.slot_waktu_akhir.jam_selesai?.substring(0, 5) || ''} WIB)`
                            : `(${sesi.slot_waktu?.jam_mulai?.substring(0, 5) || ''} - ${sesi.slot_waktu?.jam_selesai?.substring(0, 5) || ''} WIB)`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveSesi(sesi.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold flex items-center gap-1 transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Simpan</span>
                          </button>
                          <button
                            onClick={() => setEditingSesiId(null)}
                            className="px-2.5 py-1 border border-[var(--border)] hover:bg-black/5 rounded font-semibold text-[var(--text-primary)]"
                          >
                            Batal
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(sesi)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold transition-colors"
                          >
                            Ubah Sesi
                          </button>
                          <button
                            onClick={() => handleDeleteSesi(sesi.id)}
                            className="p-1 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded"
                            title="Hapus Sesi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Read-Only Mode Info */}
                  {!isEditing && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs text-[var(--text-primary)] pt-1 border-t border-[var(--border)]/40">
                      <div>
                        <span className="text-[var(--text-secondary)] font-medium">Instruktur:</span>{' '}
                        <span className="font-semibold">{sesi.instruktur?.nama || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)] font-medium">Status Sesi:</span>{' '}
                        <span
                          className={`inline-block px-1.5 py-0.2 text-[10px] font-bold rounded text-white ${
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
                      <div>
                        <span className="text-[var(--text-secondary)] font-medium">Catatan:</span>{' '}
                        <span className="italic text-[var(--text-secondary)]">
                          {sesi.catatan_sesi || 'tidak ada catatan'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Editing Mode Fields */}
                  {isEditing && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2 border-t border-[var(--brand-primary)]/20">
                      <div>
                        <DatePickerWIB
                          label="Pilih Tanggal Sesi"
                          value={editFormData.tanggal_sesi || ''}
                          onChange={(val) => setEditFormData((prev) => ({ ...prev, tanggal_sesi: val }))}
                        />
                      </div>

                      <div>
                        <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                          Slot Mulai
                        </label>
                        <select
                          value={editFormData.slot_waktu_id || ''}
                          onChange={(e) => setEditFormData((prev) => ({ ...prev, slot_waktu_id: e.target.value }))}
                          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                        >
                          {slotList.map((sw) => (
                            <option key={sw.id} value={sw.id}>
                              {sw.nama_slot} ({sw.jam_mulai.substring(0, 5)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                          Slot Akhir (Opsional)
                        </label>
                        <select
                          value={editFormData.slot_waktu_id_akhir || ''}
                          onChange={(e) => setEditFormData((prev) => ({ ...prev, slot_waktu_id_akhir: e.target.value || null }))}
                          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                        >
                          <option value="">-- Hanya 1 Slot --</option>
                          {slotList.map((sw) => (
                            <option key={sw.id} value={sw.id}>
                              {sw.nama_slot} ({sw.jam_selesai.substring(0, 5)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                          Instruktur Bertugas
                        </label>
                        <select
                          value={editFormData.staff_id || ''}
                          onChange={(e) => setEditFormData((prev) => ({ ...prev, staff_id: e.target.value }))}
                          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                        >
                          {instrukturList.map((ins) => (
                            <option key={ins.id} value={ins.id}>
                              {ins.nama}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                          Catatan Sesi
                        </label>
                        <input
                          type="text"
                          value={editFormData.catatan_sesi || ''}
                          onChange={(e) => setEditFormData((prev) => ({ ...prev, catatan_sesi: e.target.value }))}
                          placeholder="Materi pelajaran..."
                          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                        />
                      </div>

                      <div>
                        <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                          Status Sesi
                        </label>
                        <select
                          value={editFormData.status_sesi || 'terjadwal'}
                          onChange={(e) => setEditFormData((prev) => ({ ...prev, status_sesi: e.target.value as any }))}
                          className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-bold text-[var(--text-primary)]"
                        >
                          <option value="terjadwal">TERJADWAL</option>
                          <option value="selesai">SELESAI</option>
                          <option value="batal">BATAL</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
