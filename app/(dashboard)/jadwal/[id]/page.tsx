'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { JadwalSesi, Staff, SlotWaktu, Kendaraan } from '@/types/database';
import {
  getJadwalSesiById,
  getJadwalBySiswa,
  upsertJadwalSesi,
  deleteJadwalSesi,
  getJadwalConflictCheckList,
  bulkUpdateJadwalSesi,
  updateJadwalBatchSpecific,
} from '@/lib/actions/jadwal';
import { getInstrukturList, getSlotWaktuList, getKendaraanMasterList } from '@/lib/actions/master-data';
import { formatDateIndo } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import {
  getSessionOccupiedSlotIds,
  isSlotRangeValid,
  formatSlotLabel,
} from '@/lib/utils/slot';
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
  AlertTriangle,
  SlidersHorizontal,
  Loader2,
  X,
  Car,
  UserCheck,
  RotateCcw,
  Edit3,
} from 'lucide-react';
import Link from 'next/link';

const DAY_NAMES = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
const DAY_NAMES_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const getDayIndexFromDateStr = (dateStr: string) => {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length < 3) return 0;
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getDay();
};


export default function JadwalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [mainSesi, setMainSesi] = React.useState<JadwalSesi | null>(null);
  const [allSesi, setAllSesi] = React.useState<JadwalSesi[]>([]);
  const [instrukturList, setInstrukturList] = React.useState<Staff[]>([]);
  const [slotList, setSlotList] = React.useState<SlotWaktu[]>([]);
  const [kendaraanList, setKendaraanList] = React.useState<Kendaraan[]>([]);
  const [conflictList, setConflictList] = React.useState<JadwalSesi[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Multi-Session In-Memory Edit State (Staged Batch Editing)
  const [openEditSesiIds, setOpenEditSesiIds] = React.useState<Record<string, boolean>>({});
  const [pendingSessionEdits, setPendingSessionEdits] = React.useState<Record<string, Partial<JadwalSesi>>>({});
  const [isBatchSaving, setIsBatchSaving] = React.useState(false);

  // Bulk Edit State
  const [selectedSessionIds, setSelectedSessionIds] = React.useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = React.useState(false);
  const [bulkScope, setBulkScope] = React.useState<'selected' | 'all'>('selected');
  const [isBulkSaving, setIsBulkSaving] = React.useState(false);
  const [bulkFieldFlags, setBulkFieldFlags] = React.useState({
    staff_id: false,
    status_sesi: false,
    slot_waktu: false,
    tipe_kendaraan: false,
    tanggal_sesi: false,
    catatan_sesi: false,
  });
  const [bulkFormData, setBulkFormData] = React.useState({
    staff_id: '',
    status_sesi: 'terjadwal' as 'terjadwal' | 'selesai' | 'batal',
    slot_waktu_id: '',
    slot_waktu_id_akhir: null as string | null,
    tipe_kendaraan: 'operasional' as 'operasional' | 'pribadi',
    kendaraan_id: '' as string | null,
    tanggal_sesi: '',
    catatan_sesi: '',
  });

  const loadData = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const data = await getJadwalSesiById(id);
    setMainSesi(data);

    const [insList, swList, cList, kList] = await Promise.all([
      getInstrukturList(),
      getSlotWaktuList(),
      getJadwalConflictCheckList(),
      getKendaraanMasterList(),
    ]);
    setInstrukturList(insList);
    setSlotList(swList);
    setConflictList(cList);
    setKendaraanList(kList);

    if (data?.siswa_id) {
      const studentSessions = await getJadwalBySiswa(data.siswa_id);
      setAllSesi(studentSessions);
    }

    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const getSessionWorkingData = React.useCallback(
    (sesi: JadwalSesi): JadwalSesi => {
      const draft = pendingSessionEdits[sesi.id];
      if (!draft) return sesi;
      return {
        ...sesi,
        ...draft,
      } as JadwalSesi;
    },
    [pendingSessionEdits]
  );

  const isSessionModified = React.useCallback(
    (sesiId: string): boolean => {
      const draft = pendingSessionEdits[sesiId];
      if (!draft) return false;
      const original = allSesi.find((s) => s.id === sesiId);
      if (!original) return false;

      if (draft.tanggal_sesi !== undefined && draft.tanggal_sesi !== original.tanggal_sesi) return true;
      if (draft.slot_waktu_id !== undefined && draft.slot_waktu_id !== original.slot_waktu_id) return true;
      if (draft.slot_waktu_id_akhir !== undefined && draft.slot_waktu_id_akhir !== original.slot_waktu_id_akhir) return true;
      if (draft.staff_id !== undefined && draft.staff_id !== original.staff_id) return true;
      if (draft.tipe_kendaraan !== undefined && draft.tipe_kendaraan !== original.tipe_kendaraan) return true;
      if (draft.kendaraan_id !== undefined && draft.kendaraan_id !== original.kendaraan_id) return true;
      if (draft.jenis_mobil !== undefined && draft.jenis_mobil !== original.jenis_mobil) return true;
      if (draft.status_sesi !== undefined && draft.status_sesi !== original.status_sesi) return true;
      if (draft.catatan_sesi !== undefined && (draft.catatan_sesi || '') !== (original.catatan_sesi || '')) return true;

      return false;
    },
    [allSesi, pendingSessionEdits]
  );

  const changedSessionIds = React.useMemo(() => {
    return allSesi.filter((s) => isSessionModified(s.id)).map((s) => s.id);
  }, [allSesi, isSessionModified]);

  const hasChanges = changedSessionIds.length > 0;

  const handleToggleEditCard = (sesi: JadwalSesi) => {
    setOpenEditSesiIds((prev) => {
      const willOpen = !prev[sesi.id];
      if (willOpen && !pendingSessionEdits[sesi.id]) {
        const validAkhir = isSlotRangeValid(sesi.slot_waktu_id, sesi.slot_waktu_id_akhir, slotList)
          ? sesi.slot_waktu_id_akhir
          : null;
        const isPribadi = sesi.tipe_kendaraan === 'pribadi' || sesi.jenis_mobil === 'mobil_sendiri';
        setPendingSessionEdits((edits) => ({
          ...edits,
          [sesi.id]: {
            id: sesi.id,
            tanggal_sesi: sesi.tanggal_sesi,
            slot_waktu_id: sesi.slot_waktu_id,
            slot_waktu_id_akhir: validAkhir,
            staff_id: sesi.staff_id,
            tipe_kendaraan: isPribadi ? 'pribadi' : 'operasional',
            kendaraan_id: isPribadi ? null : (sesi.kendaraan_id || kendaraanList[0]?.id || null),
            jenis_mobil: isPribadi ? 'mobil_sendiri' : (sesi.jenis_mobil || 'manual'),
            status_sesi: sesi.status_sesi,
            catatan_sesi: sesi.catatan_sesi || '',
          },
        }));
      }
      return { ...prev, [sesi.id]: willOpen };
    });
  };

  const handleFieldChange = (sesiId: string, field: string, value: any) => {
    setPendingSessionEdits((prev) => {
      const currentDraft = prev[sesiId] || {};
      return {
        ...prev,
        [sesiId]: {
          ...currentDraft,
          id: sesiId,
          [field]: value,
        },
      };
    });
  };

  const handleResetSingleSesi = (sesiId: string) => {
    setPendingSessionEdits((prev) => {
      const next = { ...prev };
      delete next[sesiId];
      return next;
    });
    setOpenEditSesiIds((prev) => ({ ...prev, [sesiId]: false }));
  };

  const handleResetAllChanges = () => {
    if (confirm('Batalkan seluruh perubahan yang belum disimpan?')) {
      setPendingSessionEdits({});
      setOpenEditSesiIds({});
    }
  };

  const handleSaveAllChanges = async () => {
    if (!hasChanges || isBatchSaving) return;

    const updatesToSave: Partial<JadwalSesi>[] = changedSessionIds.map((sesiId) => {
      const draft = pendingSessionEdits[sesiId] || {};
      const original = allSesi.find((s) => s.id === sesiId);
      const isMobilPribadi = (draft.tipe_kendaraan ?? original?.tipe_kendaraan) === 'pribadi';

      const validAkhir = isSlotRangeValid(
        draft.slot_waktu_id || original?.slot_waktu_id,
        draft.slot_waktu_id_akhir !== undefined ? draft.slot_waktu_id_akhir : original?.slot_waktu_id_akhir,
        slotList
      )
        ? (draft.slot_waktu_id_akhir !== undefined ? draft.slot_waktu_id_akhir : original?.slot_waktu_id_akhir)
        : null;

      return {
        id: sesiId,
        tanggal_sesi: draft.tanggal_sesi !== undefined ? draft.tanggal_sesi : original?.tanggal_sesi,
        slot_waktu_id: draft.slot_waktu_id !== undefined ? draft.slot_waktu_id : original?.slot_waktu_id,
        slot_waktu_id_akhir: validAkhir,
        staff_id: draft.staff_id !== undefined ? draft.staff_id : original?.staff_id,
        tipe_kendaraan: isMobilPribadi ? ('pribadi' as const) : ('operasional' as const),
        kendaraan_id: isMobilPribadi ? null : (draft.kendaraan_id !== undefined ? draft.kendaraan_id : original?.kendaraan_id),
        jenis_mobil: isMobilPribadi ? 'mobil_sendiri' : (draft.jenis_mobil || original?.jenis_mobil || 'manual'),
        status_sesi: draft.status_sesi !== undefined ? draft.status_sesi : original?.status_sesi,
        catatan_sesi: draft.catatan_sesi !== undefined ? draft.catatan_sesi : original?.catatan_sesi,
      };
    });

    setIsBatchSaving(true);
    try {
      const res = await updateJadwalBatchSpecific(updatesToSave, mainSesi?.siswa_id);
      if (res.success) {
        setPendingSessionEdits({});
        setOpenEditSesiIds({});
        await loadData();
      } else {
        alert('Gagal menyimpan perubahan: ' + res.error);
      }
    } catch (e: any) {
      console.error('Error in handleSaveAllChanges:', e);
      alert('Gagal menyimpan perubahan: ' + e.message);
    } finally {
      setIsBatchSaving(false);
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

  const handleToggleSelectAll = () => {
    if (selectedSessionIds.length === allSesi.length) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(allSesi.map((s) => s.id));
    }
  };

  const handleToggleSelectSesi = (sesiId: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(sesiId) ? prev.filter((sId) => sId !== sesiId) : [...prev, sesiId]
    );
  };

  const handleOpenBulkModal = () => {
    if (selectedSessionIds.length > 0) {
      setBulkScope('selected');
    } else {
      setBulkScope('all');
    }

    const defaultStaff = mainSesi?.staff_id || instrukturList[0]?.id || '';
    const defaultSlot = mainSesi?.slot_waktu_id || slotList[0]?.id || '';
    const defaultDate = mainSesi?.tanggal_sesi || new Date().toISOString().split('T')[0];
    const isPribadi = mainSesi?.tipe_kendaraan === 'pribadi' || mainSesi?.jenis_mobil === 'mobil_sendiri';

    setBulkFormData({
      staff_id: defaultStaff,
      status_sesi: 'terjadwal',
      slot_waktu_id: defaultSlot,
      slot_waktu_id_akhir: null,
      tipe_kendaraan: isPribadi ? 'pribadi' : 'operasional',
      kendaraan_id: isPribadi ? null : (mainSesi?.kendaraan_id || kendaraanList[0]?.id || null),
      tanggal_sesi: defaultDate,
      catatan_sesi: '',
    });

    setBulkFieldFlags({
      staff_id: false,
      status_sesi: false,
      slot_waktu: false,
      tipe_kendaraan: false,
      tanggal_sesi: false,
      catatan_sesi: false,
    });

    setIsBulkModalOpen(true);
  };

  const handleSaveBulk = async () => {
    const targetIds = bulkScope === 'all' ? allSesi.map((s) => s.id) : selectedSessionIds;

    if (targetIds.length === 0) {
      alert('Pilih setidaknya satu sesi untuk diubah.');
      return;
    }

    const hasAnyField = Object.values(bulkFieldFlags).some(Boolean);
    if (!hasAnyField) {
      alert('Pilih setidaknya satu variabel/bidang yang ingin diubah.');
      return;
    }

    const updates: Parameters<typeof bulkUpdateJadwalSesi>[1] = {};
    if (bulkFieldFlags.staff_id) {
      updates.staff_id = bulkFormData.staff_id;
    }
    if (bulkFieldFlags.status_sesi) {
      updates.status_sesi = bulkFormData.status_sesi;
    }
    if (bulkFieldFlags.slot_waktu) {
      updates.slot_waktu_id = bulkFormData.slot_waktu_id;
      const validAkhir = isSlotRangeValid(
        bulkFormData.slot_waktu_id,
        bulkFormData.slot_waktu_id_akhir,
        slotList
      )
        ? bulkFormData.slot_waktu_id_akhir
        : null;
      updates.slot_waktu_id_akhir = validAkhir;
    }
    if (bulkFieldFlags.tipe_kendaraan) {
      const isPribadi = bulkFormData.tipe_kendaraan === 'pribadi';
      updates.tipe_kendaraan = isPribadi ? 'pribadi' : 'operasional';
      updates.kendaraan_id = isPribadi ? null : (bulkFormData.kendaraan_id || null);
    }
    if (bulkFieldFlags.tanggal_sesi) {
      updates.tanggal_sesi = bulkFormData.tanggal_sesi;
    }
    if (bulkFieldFlags.catatan_sesi) {
      updates.catatan_sesi = bulkFormData.catatan_sesi;
    }

    setIsBulkSaving(true);
    const res = await bulkUpdateJadwalSesi(targetIds, updates, mainSesi?.siswa_id);
    setIsBulkSaving(false);

    if (res.success) {
      setIsBulkModalOpen(false);
      setSelectedSessionIds([]);
      loadData();
    } else {
      alert('Gagal memperbarui jadwal secara masal: ' + res.error);
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
          <div className="flex items-center gap-2 flex-wrap">
            {hasChanges && (
              <button
                type="button"
                onClick={handleResetAllChanges}
                disabled={isBatchSaving}
                className="flex items-center gap-1.5 px-3 py-2 border border-zinc-300 dark:border-zinc-700 bg-[var(--bg)] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold rounded-md transition-colors"
                title="Batalkan semua perubahan sesi yang belum disimpan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batal Semua</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveAllChanges}
              disabled={!hasChanges || isBatchSaving}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md shadow-sm transition-all ${
                !hasChanges
                  ? 'bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 border border-zinc-300 dark:border-zinc-700 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white ring-2 ring-emerald-400/50 shadow-emerald-500/20 shadow-md cursor-pointer animate-pulse'
              }`}
              title={
                hasChanges
                  ? `Simpan ${changedSessionIds.length} sesi yang telah diubah ke database`
                  : 'Ubah salah satu sesi untuk mengaktifkan tombol simpan'
              }
            >
              {isBatchSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    Simpan Perubahan {hasChanges ? `(${changedSessionIds.length} Sesi)` : ''}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleAddSessionRow}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Sesi Ekstra</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/jadwal')}
              className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] text-xs font-semibold rounded-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
          </div>
        }
      />

      {/* Staged Changes Alert Banner */}
      {hasChanges && (
        <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/60 shadow-lg text-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Terdapat <strong>{changedSessionIds.length} sesi</strong> yang telah diubah (tersimpan sementara di draft). Klik <strong>Simpan Perubahan</strong> untuk mengupdate sekaligus ke database.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAllChanges}
              disabled={isBatchSaving}
              className="px-3 py-1.5 border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 font-semibold rounded-md text-xs transition-colors"
            >
              Batal Semua
            </button>
            <button
              type="button"
              onClick={handleSaveAllChanges}
              disabled={isBatchSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md shadow-sm text-xs transition-all active:scale-[0.98]"
            >
              {isBatchSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Simpan Sekarang ({changedSessionIds.length})</span>
            </button>
          </div>
        </div>
      )}

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
              <p className="tabular-num font-bold text-[var(--brand-primary)]">
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

          {/* Bulk Action Bar di atas Sesi Paling Awal / Sesi 1 */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSesi.length > 0 && selectedSessionIds.length === allSesi.length}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = selectedSessionIds.length > 0 && selectedSessionIds.length < allSesi.length;
                    }
                  }}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                />
                <span>Pilih Semua Sesi ({allSesi.length})</span>
              </label>

              {selectedSessionIds.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-bold">
                  {selectedSessionIds.length} sesi dicentang
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedSessionIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedSessionIds([])}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium underline px-1"
                >
                  Batal Pilih
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenBulkModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
                title="Bulk Edit Sesi"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>
                  Bulk Edit {selectedSessionIds.length > 0 ? `(${selectedSessionIds.length} Sesi)` : 'Sesi'}
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {allSesi.map((sesi) => {
              const workingData = getSessionWorkingData(sesi);
              const isOpen = Boolean(openEditSesiIds[sesi.id]);
              const isModified = isSessionModified(sesi.id);
              const isSelected = selectedSessionIds.includes(sesi.id);

              // Deteksi bentrok: menggunakan workingData agar realtime merespons perubahan draft
              const checkConflict = (() => {
                if (!workingData.staff_id || !workingData.slot_waktu_id || workingData.status_sesi !== 'terjadwal') return null;
                const dayIdx = getDayIndexFromDateStr(workingData.tanggal_sesi);
                const dayNameEng = DAY_NAMES[dayIdx];
                const ins = instrukturList.find((i) => i.id === workingData.staff_id);

                if (!ins) return null;

                // Check hari kerja
                if (!ins.hari_kerja?.includes(dayNameEng)) {
                  return { type: 'off', msg: `${ins.nama} libur hari ${DAY_NAMES_INDO[dayIdx]}` };
                }

                // Check slot conflict: terhadap sesi lain yang berstatus 'terjadwal'
                const conflict = conflictList.find((j) => {
                  if (j.id === sesi.id) return false; // exclude self
                  if (j.tanggal_sesi !== workingData.tanggal_sesi) return false;
                  if (j.status_sesi !== 'terjadwal') return false;
                  if (j.staff_id !== workingData.staff_id) return false;
                  const jSlots = getSessionOccupiedSlotIds(j.slot_waktu_id, j.slot_waktu_id_akhir, slotList);
                  const mySlots = getSessionOccupiedSlotIds(workingData.slot_waktu_id, workingData.slot_waktu_id_akhir, slotList);
                  return mySlots.some((s) => jSlots.includes(s));
                });

                if (conflict) {
                  return { type: 'conflict', msg: `Bentrok dengan ${conflict.siswa?.nama || 'siswa lain'}` };
                }
                return null;
              })();

              const activeSlot = slotList.find((s) => s.id === workingData.slot_waktu_id) || sesi.slot_waktu;
              const activeSlotAkhir = slotList.find((s) => s.id === workingData.slot_waktu_id_akhir) || sesi.slot_waktu_akhir;
              const activeIns = instrukturList.find((i) => i.id === workingData.staff_id) || sesi.instruktur;
              const activeKendaraan = kendaraanList.find((k) => k.id === workingData.kendaraan_id) || sesi.kendaraan;
              const isPribadi = workingData.tipe_kendaraan === 'pribadi' || workingData.jenis_mobil === 'mobil_sendiri';

              return (
                <div
                  key={sesi.id}
                  className={`p-4 border rounded-lg transition-all space-y-3 ${
                    isSelected ? 'ring-2 ring-[var(--brand-primary)] shadow-sm ' : ''
                  }${
                    isOpen
                      ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-light)]/15 shadow-sm'
                      : isModified
                      ? 'border-2 border-amber-400 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/20 shadow-xs'
                      : checkConflict?.type === 'conflict'
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/10'
                      : checkConflict?.type === 'off'
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10'
                      : workingData.status_sesi === 'selesai'
                      ? 'border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/10'
                      : workingData.status_sesi === 'batal'
                      ? 'border-rose-200 dark:border-rose-950/60 bg-rose-50/10'
                      : isSelected
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)]/10'
                      : 'border-[var(--border)] bg-[var(--bg)]'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="flex items-center cursor-pointer" title={`Pilih Sesi ${sesi.nomor_sesi_ke}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectSesi(sesi.id)}
                          className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                        />
                      </label>
                      <span className="font-extrabold text-sm text-[var(--brand-primary)] bg-[var(--brand-primary-light)] px-2 py-0.5 rounded">
                        Sesi {sesi.nomor_sesi_ke}
                      </span>
                      {isModified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                          Ada Perubahan (Draft)
                        </span>
                      )}
                      <span className="text-[var(--text-secondary)] font-medium">
                        • {formatDateIndo(workingData.tanggal_sesi)} • {formatSlotLabel(activeSlot, activeSlotAkhir)}
                      </span>

                      {/* Conflict warning badge */}
                      {checkConflict && (
                        <button
                          type="button"
                          onClick={() => !isOpen && handleToggleEditCard(sesi)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            checkConflict.type === 'conflict'
                              ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-200'
                              : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-200'
                          }`}
                          title="Klik untuk ubah sesi ini"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {checkConflict.msg} — Perbaiki
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isModified && (
                        <button
                          type="button"
                          onClick={() => handleResetSingleSesi(sesi.id)}
                          className="px-2 py-1 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded font-semibold text-xs flex items-center gap-1 transition-colors"
                          title="Batalkan perubahan sesi ini dan kembalikan ke data database"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleEditCard(sesi)}
                        className={`px-2.5 py-1 rounded font-semibold text-xs flex items-center gap-1 transition-colors ${
                          isOpen
                            ? 'border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                            : isModified
                            ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
                            : 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white'
                        }`}
                      >
                        {isOpen ? (
                          <>
                            <X className="w-3 h-3" />
                            <span>Tutup Form</span>
                          </>
                        ) : (
                          <>
                            <Edit3 className="w-3 h-3" />
                            <span>{isModified ? 'Edit Draft' : 'Ubah Sesi'}</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSesi(sesi.id)}
                        className="p-1 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition-colors"
                        title="Hapus Sesi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Read-Only Mode Info */}
                  {!isOpen && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs text-[var(--text-primary)] pt-1 border-t border-[var(--border)]/40">
                      <div>
                        <span className="text-[var(--text-secondary)] font-medium">Instruktur:</span>{' '}
                        <span className="font-semibold">{activeIns?.nama || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)] font-medium">Kendaraan:</span>{' '}
                        <span className="font-semibold">
                          {isPribadi ? (
                            <span className="text-purple-600 dark:text-purple-400 font-bold">Mobil Pribadi / Siswa</span>
                          ) : activeKendaraan ? (
                            <span>{activeKendaraan.nama_kendaraan} ({activeKendaraan.plat_nomor})</span>
                          ) : (
                            <span>Mobil Operasional</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)] font-medium">Status Sesi:</span>{' '}
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] font-bold rounded text-white ${
                            workingData.status_sesi === 'selesai'
                              ? 'bg-emerald-600'
                              : workingData.status_sesi === 'batal'
                              ? 'bg-rose-600'
                              : 'bg-amber-600'
                          }`}
                        >
                          {workingData.status_sesi.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[var(--text-secondary)] font-medium">Catatan:</span>{' '}
                        <span className="italic text-[var(--text-secondary)] truncate block">
                          {workingData.catatan_sesi || 'tidak ada catatan'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Editing Mode Fields */}
                  {isOpen && (
                    <div className="space-y-3 pt-2 border-t border-[var(--brand-primary)]/20 text-xs animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <DatePickerWIB
                            label="Pilih Tanggal Sesi"
                            value={workingData.tanggal_sesi || ''}
                            onChange={(val) => handleFieldChange(sesi.id, 'tanggal_sesi', val)}
                          />
                        </div>

                        <div>
                          <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                            Slot Mulai
                          </label>
                          <select
                            value={workingData.slot_waktu_id || ''}
                            onChange={(e) => handleFieldChange(sesi.id, 'slot_waktu_id', e.target.value)}
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
                            value={workingData.slot_waktu_id_akhir || ''}
                            onChange={(e) => handleFieldChange(sesi.id, 'slot_waktu_id_akhir', e.target.value || null)}
                            className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                          >
                            <option value="">-- Hanya 1 Slot (Standar) --</option>
                            {slotList
                              .filter((sw) => {
                                const startSlot = slotList.find((s) => s.id === workingData.slot_waktu_id);
                                return startSlot ? (sw.urutan ?? 0) > (startSlot.urutan ?? 0) : false;
                              })
                              .map((sw) => (
                                <option key={sw.id} value={sw.id}>
                                  s/d {sw.nama_slot} ({sw.jam_selesai.substring(0, 5)} WIB)
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                            Instruktur Bertugas
                          </label>
                          <select
                            value={workingData.staff_id || ''}
                            onChange={(e) => handleFieldChange(sesi.id, 'staff_id', e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                          >
                            {instrukturList.map((ins) => (
                              <option key={ins.id} value={ins.id}>
                                {ins.nama}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Kendaraan Selection */}
                      <div className="p-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                            Tipe Kendaraan
                          </label>
                          <div className="flex items-center gap-2">
                            <label
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                                !isPribadi
                                  ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)]'
                                  : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`tipe_kendaraan_${sesi.id}`}
                                value="operasional"
                                checked={!isPribadi}
                                onChange={() => {
                                  handleFieldChange(sesi.id, 'tipe_kendaraan', 'operasional');
                                  if (!workingData.kendaraan_id) {
                                    handleFieldChange(sesi.id, 'kendaraan_id', kendaraanList[0]?.id || null);
                                  }
                                }}
                                className="sr-only"
                              />
                              <Car className="w-3.5 h-3.5" />
                              <span>Operasional</span>
                            </label>

                            <label
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                                isPribadi
                                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                                  : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`tipe_kendaraan_${sesi.id}`}
                                value="pribadi"
                                checked={isPribadi}
                                onChange={() => {
                                  handleFieldChange(sesi.id, 'tipe_kendaraan', 'pribadi');
                                  handleFieldChange(sesi.id, 'kendaraan_id', null);
                                  handleFieldChange(sesi.id, 'jenis_mobil', 'mobil_sendiri');
                                }}
                                className="sr-only"
                              />
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Pribadi / Siswa</span>
                            </label>
                          </div>
                        </div>

                        {!isPribadi && (
                          <div>
                            <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                              Armada Mobil Operasional
                            </label>
                            <select
                              value={workingData.kendaraan_id || ''}
                              onChange={(e) => handleFieldChange(sesi.id, 'kendaraan_id', e.target.value)}
                              className="w-full px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                            >
                              {kendaraanList.map((k) => (
                                <option key={k.id} value={k.id}>
                                  {k.nama_kendaraan} — {k.plat_nomor}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-3">
                          <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                            Catatan Sesi
                          </label>
                          <input
                            type="text"
                            value={workingData.catatan_sesi || ''}
                            onChange={(e) => handleFieldChange(sesi.id, 'catatan_sesi', e.target.value)}
                            placeholder="Materi pelajaran..."
                            className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                          />
                        </div>

                        <div>
                          <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                            Status Sesi
                          </label>
                          <select
                            value={workingData.status_sesi || 'terjadwal'}
                            onChange={(e) => handleFieldChange(sesi.id, 'status_sesi', e.target.value as any)}
                            className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-bold text-[var(--text-primary)]"
                          >
                            <option value="terjadwal">TERJADWAL</option>
                            <option value="selesai">SELESAI</option>
                            <option value="batal">BATAL</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border)]/60">
                        <p className="text-[11px] text-[var(--text-secondary)] italic">
                          * Perubahan sesi ini tersimpan di memori browser. Klik tombol <strong>Simpan Perubahan</strong> di atas untuk menyimpan ke database.
                        </p>
                        <div className="flex items-center gap-2">
                          {isModified && (
                            <button
                              type="button"
                              onClick={() => handleResetSingleSesi(sesi.id)}
                              className="px-2.5 py-1 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded font-semibold text-xs transition-colors"
                            >
                              Batalkan Sesi Ini
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleEditCard(sesi)}
                            className="px-3 py-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded font-semibold text-xs transition-colors"
                          >
                            Selesai Mengedit Sesi Ini
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BULK EDIT MODAL DIALOG */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="card-container max-w-xl w-full bg-[var(--bg)] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-[var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[var(--brand-primary)]" />
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Bulk Edit Sesi Siswa
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Ubah variabel sesi mengemudi untuk siswa {mainSesi.siswa?.nama}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Selection: Sesi Dicentang vs Semua Sesi */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Terapkan Perubahan Ke:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBulkScope('selected')}
                  disabled={selectedSessionIds.length === 0}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all ${
                    bulkScope === 'selected'
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)]/20 text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]'
                      : selectedSessionIds.length === 0
                      ? 'opacity-50 cursor-not-allowed border-[var(--border)] text-[var(--text-secondary)]'
                      : 'border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)]'
                  }`}
                >
                  <div className="font-bold">Sesi yang Dicentang</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    {selectedSessionIds.length > 0
                      ? `${selectedSessionIds.length} Sesi Terpilih`
                      : 'Belum ada sesi dicentang'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkScope('all')}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all ${
                    bulkScope === 'all'
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)]/20 text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]'
                      : 'border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)]'
                  }`}
                >
                  <div className="font-bold">Seluruh Sesi</div>
                  <div className="text-[11px] opacity-80 mt-0.5">
                    Semua {allSesi.length} Sesi Terdaftar
                  </div>
                </button>
              </div>
            </div>

            {/* Variable Overwrites Form */}
            <div className="space-y-3">
              {/* 1. Instruktur Bertugas */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  bulkFieldFlags.staff_id
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)]/10'
                    : 'border-[var(--border)]'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[var(--text-primary)] select-none">
                  <input
                    type="checkbox"
                    checked={bulkFieldFlags.staff_id}
                    onChange={(e) =>
                      setBulkFieldFlags((prev) => ({ ...prev, staff_id: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                  />
                  <span>Instruktur Bertugas</span>
                </label>
                {bulkFieldFlags.staff_id && (
                  <div className="mt-2 pl-6">
                    <select
                      value={bulkFormData.staff_id}
                      onChange={(e) =>
                        setBulkFormData((prev) => ({ ...prev, staff_id: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                    >
                      {instrukturList.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 2. Status Sesi */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  bulkFieldFlags.status_sesi
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)]/10'
                    : 'border-[var(--border)]'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[var(--text-primary)] select-none">
                  <input
                    type="checkbox"
                    checked={bulkFieldFlags.status_sesi}
                    onChange={(e) =>
                      setBulkFieldFlags((prev) => ({ ...prev, status_sesi: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                  />
                  <span>Status Sesi</span>
                </label>
                {bulkFieldFlags.status_sesi && (
                  <div className="mt-2 pl-6">
                    <select
                      value={bulkFormData.status_sesi}
                      onChange={(e) =>
                        setBulkFormData((prev) => ({
                          ...prev,
                          status_sesi: e.target.value as any,
                        }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] font-bold text-[var(--text-primary)]"
                    >
                      <option value="terjadwal">TERJADWAL</option>
                      <option value="selesai">SELESAI</option>
                      <option value="batal">BATAL</option>
                    </select>
                  </div>
                )}
              </div>

              {/* 3. Slot Waktu Pembelajaran */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  bulkFieldFlags.slot_waktu
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)]/10'
                    : 'border-[var(--border)]'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[var(--text-primary)] select-none">
                  <input
                    type="checkbox"
                    checked={bulkFieldFlags.slot_waktu}
                    onChange={(e) =>
                      setBulkFieldFlags((prev) => ({ ...prev, slot_waktu: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                  />
                  <span>Slot Waktu (Jam Pelajaran)</span>
                </label>
                {bulkFieldFlags.slot_waktu && (
                  <div className="mt-2 pl-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] font-semibold mb-1">
                        Slot Mulai
                      </label>
                      <select
                        value={bulkFormData.slot_waktu_id}
                        onChange={(e) =>
                          setBulkFormData((prev) => ({ ...prev, slot_waktu_id: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                      >
                        {slotList.map((sw) => (
                          <option key={sw.id} value={sw.id}>
                            {sw.nama_slot} ({sw.jam_mulai.substring(0, 5)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-[var(--text-secondary)] font-semibold mb-1">
                        Slot Akhir (Opsional)
                      </label>
                      <select
                        value={bulkFormData.slot_waktu_id_akhir || ''}
                        onChange={(e) =>
                          setBulkFormData((prev) => ({
                            ...prev,
                            slot_waktu_id_akhir: e.target.value || null,
                          }))
                        }
                        className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                      >
                        <option value="">-- Hanya 1 Slot (Standar) --</option>
                        {slotList
                          .filter((sw) => {
                            const startSlot = slotList.find((s) => s.id === bulkFormData.slot_waktu_id);
                            return startSlot ? (sw.urutan ?? 0) > (startSlot.urutan ?? 0) : false;
                          })
                          .map((sw) => (
                            <option key={sw.id} value={sw.id}>
                              s/d {sw.nama_slot} ({sw.jam_selesai.substring(0, 5)} WIB)
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Tipe Kendaraan & Armada */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  bulkFieldFlags.tipe_kendaraan
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)]/10'
                    : 'border-[var(--border)]'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[var(--text-primary)] select-none">
                  <input
                    type="checkbox"
                    checked={bulkFieldFlags.tipe_kendaraan}
                    onChange={(e) =>
                      setBulkFieldFlags((prev) => ({ ...prev, tipe_kendaraan: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                  />
                  <span>Tipe Kendaraan & Armada</span>
                </label>
                {bulkFieldFlags.tipe_kendaraan && (
                  <div className="mt-2 pl-6 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          bulkFormData.tipe_kendaraan === 'operasional'
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)]'
                            : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bulk_tipe_kendaraan"
                          value="operasional"
                          checked={bulkFormData.tipe_kendaraan === 'operasional'}
                          onChange={() =>
                            setBulkFormData((prev) => ({
                              ...prev,
                              tipe_kendaraan: 'operasional',
                              kendaraan_id: prev.kendaraan_id || kendaraanList[0]?.id || null,
                            }))
                          }
                          className="sr-only"
                        />
                        <Car className="w-3.5 h-3.5" />
                        <span>Mobil Operasional</span>
                      </label>

                      <label
                        className={`flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          bulkFormData.tipe_kendaraan === 'pribadi'
                            ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                            : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bulk_tipe_kendaraan"
                          value="pribadi"
                          checked={bulkFormData.tipe_kendaraan === 'pribadi'}
                          onChange={() =>
                            setBulkFormData((prev) => ({
                              ...prev,
                              tipe_kendaraan: 'pribadi',
                              kendaraan_id: null,
                            }))
                          }
                          className="sr-only"
                        />
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Mobil Pribadi / Siswa</span>
                      </label>
                    </div>

                    {bulkFormData.tipe_kendaraan === 'operasional' && (
                      <div>
                        <label className="block text-[11px] text-[var(--text-secondary)] font-semibold mb-1">
                          Pilih Armada Mobil Operasional
                        </label>
                        <select
                          value={bulkFormData.kendaraan_id || ''}
                          onChange={(e) =>
                            setBulkFormData((prev) => ({ ...prev, kendaraan_id: e.target.value }))
                          }
                          className="w-full px-3 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                        >
                          {kendaraanList.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.nama_kendaraan} — {k.plat_nomor}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 5. Tanggal Sesi */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  bulkFieldFlags.tanggal_sesi
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)]/10'
                    : 'border-[var(--border)]'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[var(--text-primary)] select-none">
                  <input
                    type="checkbox"
                    checked={bulkFieldFlags.tanggal_sesi}
                    onChange={(e) =>
                      setBulkFieldFlags((prev) => ({ ...prev, tanggal_sesi: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                  />
                  <span>Tanggal Sesi (Set Semua ke Tanggal Sama)</span>
                </label>
                {bulkFieldFlags.tanggal_sesi && (
                  <div className="mt-2 pl-6">
                    <DatePickerWIB
                      label="Pilih Tanggal Baru"
                      value={bulkFormData.tanggal_sesi}
                      onChange={(val) =>
                        setBulkFormData((prev) => ({ ...prev, tanggal_sesi: val }))
                      }
                    />
                  </div>
                )}
              </div>

              {/* 5. Catatan Sesi */}
              <div
                className={`p-3 rounded-lg border transition-all ${
                  bulkFieldFlags.catatan_sesi
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)]/10'
                    : 'border-[var(--border)]'
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-[var(--text-primary)] select-none">
                  <input
                    type="checkbox"
                    checked={bulkFieldFlags.catatan_sesi}
                    onChange={(e) =>
                      setBulkFieldFlags((prev) => ({ ...prev, catatan_sesi: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                  />
                  <span>Catatan Sesi</span>
                </label>
                {bulkFieldFlags.catatan_sesi && (
                  <div className="mt-2 pl-6">
                    <input
                      type="text"
                      value={bulkFormData.catatan_sesi}
                      onChange={(e) =>
                        setBulkFormData((prev) => ({ ...prev, catatan_sesi: e.target.value }))
                      }
                      placeholder="Materi pelajaran atau catatan sesi masal..."
                      className="w-full px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Target Sessions Summary Preview */}
            <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                <span>Sesi yang akan diperbarui:</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {bulkScope === 'all'
                    ? `${allSesi.length} Sesi`
                    : `${selectedSessionIds.length} Sesi`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                {(bulkScope === 'all'
                  ? allSesi
                  : allSesi.filter((s) => selectedSessionIds.includes(s.id))
                ).map((s) => (
                  <span
                    key={s.id}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--brand-primary-light)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/20"
                  >
                    Sesi {s.nomor_sesi_ke}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-3">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                disabled={isBulkSaving}
                className="px-3 py-2 text-xs font-semibold rounded-md border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveBulk}
                disabled={isBulkSaving || !Object.values(bulkFieldFlags).some(Boolean)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBulkSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      Terapkan ke{' '}
                      {bulkScope === 'all' ? allSesi.length : selectedSessionIds.length} Sesi
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
