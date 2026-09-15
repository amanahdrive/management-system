'use client';

import React from 'react';
import { Kendaraan, KendaraanInspeksi } from '@/types/database';
import { getTodayDateString, formatDateIndo } from '@/lib/utils/date';
import { saveKendaraanInspeksi, deleteKendaraanInspeksi } from '@/lib/actions/kendaraan';
import { sound } from '@/lib/sound/SoundFX';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Car,
  Clock,
  Sparkles,
  ShieldCheck,
  Trash2,
  Send,
  Loader2,
  Plus,
  Zap,
} from 'lucide-react';

interface FleetInspectionChecklistProps {
  kendaraanList: Kendaraan[];
  inspeksiList: KendaraanInspeksi[];
  onRefresh: () => void;
  initialKendaraanId?: string;
}

export function FleetInspectionChecklist({
  kendaraanList,
  inspeksiList,
  onRefresh,
  initialKendaraanId,
}: FleetInspectionChecklistProps) {
  const [selectedKendaraanId, setSelectedKendaraanId] = React.useState<string>(
    initialKendaraanId || kendaraanList[0]?.id || ''
  );
  const [tanggal, setTanggal] = React.useState<string>(getTodayDateString());
  const [shift, setShift] = React.useState<'pagi' | 'sore' | 'malam'>('pagi');
  const [picNama, setPicNama] = React.useState<string>('PIC Armada');
  const [odometer, setOdometer] = React.useState<string>('');

  // 7 Kategori Kondisi
  const [kondisiMesin, setKondisiMesin] = React.useState<'baik' | 'waspada' | 'perlu_tindakan'>('baik');
  const [kondisiRem, setKondisiRem] = React.useState<'baik' | 'waspada' | 'perlu_tindakan'>('baik');
  const [kondisiPedalGanda, setKondisiPedalGanda] = React.useState<'baik' | 'waspada' | 'perlu_tindakan'>('baik');
  const [kondisiBan, setKondisiBan] = React.useState<'baik' | 'waspada' | 'perlu_tindakan'>('baik');
  const [kondisiKelistrikan, setKondisiKelistrikan] = React.useState<'baik' | 'waspada' | 'perlu_tindakan'>('baik');
  const [kondisiAc, setKondisiAc] = React.useState<'baik' | 'waspada' | 'perlu_tindakan'>('baik');
  const [kebersihan, setKebersihan] = React.useState<'bersih' | 'cukup' | 'kotor'>('bersih');
  const [stnkLengkap, setStnkLengkap] = React.useState<boolean>(true);
  const [p3kDanAlat, setP3kDanAlat] = React.useState<boolean>(true);
  const [statusKelayakan, setStatusKelayakan] = React.useState<'siap_jalan' | 'waspada' | 'tidak_layak'>('siap_jalan');
  const [catatan, setCatatan] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Set odo default saat pilih mobil
  React.useEffect(() => {
    const v = kendaraanList.find((k) => k.id === selectedKendaraanId);
    if (v?.status?.odometer_terkini) {
      setOdometer(String(v.status.odometer_terkini));
    }
  }, [selectedKendaraanId, kendaraanList]);

  // Tombol 1-Tap "Semua Normal & Siap Jalan"
  const handleMarkAllGood = () => {
    try {
      sound.chime();
    } catch {}
    setKondisiMesin('baik');
    setKondisiRem('baik');
    setKondisiPedalGanda('baik');
    setKondisiBan('baik');
    setKondisiKelistrikan('baik');
    setKondisiAc('baik');
    setKebersihan('bersih');
    setStnkLengkap(true);
    setP3kDanAlat(true);
    setStatusKelayakan('siap_jalan');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKendaraanId) return;

    try {
      setIsSubmitting(true);
      sound.click();

      const res = await saveKendaraanInspeksi({
        kendaraan_id: selectedKendaraanId,
        tanggal,
        waktu_shift: shift,
        pic_nama: picNama,
        odometer_inspeksi: odometer ? Number(odometer) : null,
        kondisi_mesin: kondisiMesin,
        kondisi_rem: kondisiRem,
        kondisi_pedal_ganda: kondisiPedalGanda,
        kondisi_ban: kondisiBan,
        kondisi_kelistrikan: kondisiKelistrikan,
        kondisi_ac: kondisiAc,
        kebersihan,
        stnk_lengkap: stnkLengkap,
        p3k_dan_alat: p3kDanAlat,
        status_kelayakan: statusKelayakan,
        catatan: catatan.trim() || null,
      });

      if (res.success) {
        sound.pop();
        setCatatan('');
        onRefresh();
      } else {
        alert(res.error || 'Gagal menyimpan checklist');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus riwayat inspeksi ini?')) return;
    sound.trash();
    await deleteKendaraanInspeksi(id);
    onRefresh();
  };

  const RATING_BUTTONS: { id: 'baik' | 'waspada' | 'perlu_tindakan'; label: string }[] = [
    { id: 'baik', label: 'Baik' },
    { id: 'waspada', label: 'Waspada' },
    { id: 'perlu_tindakan', label: 'Tindakan!' },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Form Checklist Inspeksi Harian */}
      <div className="card-container bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                Checklist Inspeksi Fisik
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">Pemeriksaan pre-trip / post-trip harian</p>
            </div>
          </div>

          {/* Quick All Good Button */}
          <button
            type="button"
            onClick={handleMarkAllGood}
            className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-black flex items-center gap-1 active:scale-95 transition-all shadow-xs"
          >
            <Zap className="w-3 h-3 text-emerald-500" />
            <span>Semua Normal</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row: Armada, Tanggal & Shift */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Pilih Armada
              </label>
              <select
                value={selectedKendaraanId}
                onChange={(e) => setSelectedKendaraanId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)]"
                required
              >
                {kendaraanList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.plat_nomor} — {k.nama_kendaraan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Waktu Shift
              </label>
              <div className="grid grid-cols-3 gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-[var(--border)]">
                {(['pagi', 'sore', 'malam'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      sound.click();
                      setShift(s);
                    }}
                    className={`py-1 text-[11px] font-bold rounded-lg capitalize transition-all active:scale-95 ${
                      shift === s
                        ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-xs border border-[var(--border)]'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row: Odometer & Nama PIC */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Odometer Saat Cek
              </label>
              <input
                type="number"
                placeholder="167900"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Nama PIC Pemeriksa
              </label>
              <input
                type="text"
                value={picNama}
                onChange={(e) => setPicNama(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)]"
                required
              />
            </div>
          </div>

          {/* Checklist Items: 6 Komponen Utama Mobil */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] block">
              Pemeriksaan Komponen Teknis
            </span>

            {/* 1. Mesin & Fluida */}
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--text-primary)] block truncate">
                  1. Mesin & Cairan (Oli, Radiator, Minyak Rem)
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {RATING_BUTTONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      sound.click();
                      setKondisiMesin(r.id);
                    }}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                      kondisiMesin === r.id
                        ? r.id === 'baik'
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : r.id === 'waspada'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-rose-500 text-white border-rose-600'
                        : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)]'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Pedal Ganda Instruktur */}
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--text-primary)] block truncate">
                  2. Rem & Pedal Ganda Pendamping Instruktur
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {RATING_BUTTONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      sound.click();
                      setKondisiPedalGanda(r.id);
                    }}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                      kondisiPedalGanda === r.id
                        ? r.id === 'baik'
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : r.id === 'waspada'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-rose-500 text-white border-rose-600'
                        : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)]'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Lampu, Sein & Klakson */}
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--text-primary)] block truncate">
                  3. Lampu Utama, Sein, Rem & Klakson
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {RATING_BUTTONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      sound.click();
                      setKondisiKelistrikan(r.id);
                    }}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                      kondisiKelistrikan === r.id
                        ? r.id === 'baik'
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : r.id === 'waspada'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-rose-500 text-white border-rose-600'
                        : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)]'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Tekanan Ban & Baut Roda */}
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--text-primary)] block truncate">
                  4. Tekanan Ban & Kaki-kaki
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {RATING_BUTTONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      sound.click();
                      setKondisiBan(r.id);
                    }}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                      kondisiBan === r.id
                        ? r.id === 'baik'
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : r.id === 'waspada'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-rose-500 text-white border-rose-600'
                        : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)]'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. AC & Kebersihan */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)]">
                <span className="text-[11px] font-bold text-[var(--text-primary)] block mb-1">
                  AC & Blower
                </span>
                <div className="flex items-center gap-1">
                  {(['baik', 'waspada'] as const).map((ac) => (
                    <button
                      key={ac}
                      type="button"
                      onClick={() => {
                        sound.click();
                        setKondisiAc(ac);
                      }}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-md capitalize border transition-all ${
                        kondisiAc === ac
                          ? ac === 'baik'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-amber-500 text-white'
                          : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)]'
                      }`}
                    >
                      {ac === 'baik' ? 'Dingin' : 'Kurang'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)]">
                <span className="text-[11px] font-bold text-[var(--text-primary)] block mb-1">
                  Kebersihan Kabin
                </span>
                <div className="flex items-center gap-1">
                  {(['bersih', 'cukup', 'kotor'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        sound.click();
                        setKebersihan(k);
                      }}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-md capitalize border transition-all ${
                        kebersihan === k
                          ? k === 'bersih'
                            ? 'bg-cyan-600 text-white'
                            : 'bg-amber-500 text-white'
                          : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)]'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dokumen & Alat */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)] text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={stnkLengkap}
                  onChange={(e) => setStnkLengkap(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <span className="text-[11px] font-bold text-[var(--text-primary)]">
                  STNK Asli / Pajak Aktif
                </span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--border)] text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={p3kDanAlat}
                  onChange={(e) => setP3kDanAlat(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <span className="text-[11px] font-bold text-[var(--text-primary)]">
                  P3K & Dongkrak Siap
                </span>
              </label>
            </div>
          </div>

          {/* Status Kelayakan Akhir */}
          <div>
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
              Kesimpulan Kelayakan Jalan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'siap_jalan', label: '✓ Siap Jalan', color: 'bg-emerald-500 text-white' },
                { id: 'waspada', label: '⚠️ Waspada', color: 'bg-amber-500 text-white' },
                { id: 'tidak_layak', label: '✕ Tidak Layak', color: 'bg-rose-500 text-white' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    sound.click();
                    setStatusKelayakan(s.id as any);
                  }}
                  className={`py-2 text-xs font-black rounded-xl border transition-all active:scale-95 ${
                    statusKelayakan === s.id
                      ? `${s.color} shadow-sm border-transparent`
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border)]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan Tambahan */}
          <div>
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
              Catatan Temuan / Kerusakan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Bumper depan kiri ada baret tipis, klakson suara agak serak"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)]"
            />
          </div>

          {/* Tombol Simpan */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Simpan Hasil Inspeksi Armada</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 2. Daftar Riwayat Inspeksi Terakhir */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] px-1">
          Riwayat Inspeksi Fisik ({inspeksiList.length})
        </h4>

        <div className="space-y-2">
          {inspeksiList.slice(0, 10).map((item) => {
            const car = item.kendaraan || kendaraanList.find((k) => k.id === item.kendaraan_id);
            return (
              <div
                key={item.id}
                className="card-container p-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      item.status_kelayakan === 'siap_jalan'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : item.status_kelayakan === 'waspada'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {item.status_kelayakan === 'siap_jalan' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : item.status_kelayakan === 'waspada' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[var(--text-primary)]">
                        {car?.plat_nomor || 'Armada'}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 bg-black/5 dark:bg-white/5 rounded-md text-[var(--text-secondary)]">
                        Shift {item.waktu_shift}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {formatDateIndo(item.tanggal)} • PIC: {item.pic_nama}
                    </p>
                    {item.catatan && (
                      <p className="text-[10px] text-[var(--text-secondary)] truncate max-w-xs mt-0.5 font-medium">
                        "{item.catatan}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      item.status_kelayakan === 'siap_jalan'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : item.status_kelayakan === 'waspada'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {item.status_kelayakan.replace('_', ' ')}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
