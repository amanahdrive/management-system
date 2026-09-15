'use client';

import React from 'react';
import { Kendaraan, KategoriInsidenEnum } from '@/types/database';
import { createInsiden } from '@/lib/actions/insiden';
import { getTodayDateString } from '@/lib/utils/date';
import { sound } from '@/lib/sound/SoundFX';
import {
  ShieldAlert,
  AlertTriangle,
  X,
  Send,
  Loader2,
  Car,
  MapPin,
  FileText,
  DollarSign,
} from 'lucide-react';

interface FleetIncidentQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  kendaraanList: Kendaraan[];
  onSuccess: () => void;
  defaultKendaraanId?: string;
}

export function FleetIncidentQuickModal({
  isOpen,
  onClose,
  kendaraanList,
  onSuccess,
  defaultKendaraanId,
}: FleetIncidentQuickModalProps) {
  const [kendaraanId, setKendaraanId] = React.useState<string>(
    defaultKendaraanId || kendaraanList[0]?.id || ''
  );
  const [tanggal, setTanggal] = React.useState<string>(getTodayDateString());
  const [jam, setJam] = React.useState<string>('09:00');
  const [kategori, setKategori] = React.useState<KategoriInsidenEnum>('baret_bodi');
  const [tingkatKeparahan, setTingkatKeparahan] = React.useState<'ringan' | 'sedang' | 'berat'>('ringan');
  const [lokasi, setLokasi] = React.useState<string>('Jalan Operasional / Rute Sesi');
  const [deskripsi, setDeskripsi] = React.useState<string>('');
  const [tindakan, setTindakan] = React.useState<string>('');
  const [estimasiBiaya, setEstimasiBiaya] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (defaultKendaraanId) {
      setKendaraanId(defaultKendaraanId);
    }
  }, [defaultKendaraanId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kendaraanId || !deskripsi.trim()) return;

    try {
      setIsSubmitting(true);
      sound.click();

      const res = await createInsiden({
        kendaraan_id: kendaraanId,
        tanggal_insiden: tanggal,
        jam_insiden: jam,
        kategori,
        tingkat_keparahan: tingkatKeparahan,
        lokasi_kejadian: lokasi.trim(),
        deskripsi_kejadian: deskripsi.trim(),
        kronologi_singkat: deskripsi.trim(),
        kondisi_kendaraan: `Kerusakan: ${kategori.replace('_', ' ')}`,
        kondisi_pengemudi: 'Baik / Tidak ada cedera',
        status_penanganan: 'dilaporkan',
        tindakan_penanganan: tindakan.trim() || 'Dalam peninjauan PIC Armada',
        estimasi_biaya: estimasiBiaya ? Number(estimasiBiaya) : 0,
        biaya_aktual: 0,
        penanggung_biaya: 'perusahaan',
        foto_bukti_urls: [],
        staff_id: null,
        siswa_id: null,
        jadwal_sesi_id: null,
        catatan: 'Laporan cepat via PWA PIC Armada',
      });

      if (res.success) {
        sound.pop();
        alert('Laporan insiden berhasil dicatat dan masuk ke sistem penanganan!');
        onSuccess();
        onClose();
      } else {
        alert(res.error || 'Gagal menyimpan laporan insiden');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
      <div className="bg-[var(--card-bg)] border border-[var(--border-strong)] rounded-2xl p-4 max-w-md w-full shadow-2xl space-y-3.5 animate-in slide-in-from-bottom-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                Lapor Cepat Insiden Armada
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">Pencatatan kerusakan / lecet / kendala teknis</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row: Armada & Tanggal */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Pilih Armada
              </label>
              <select
                value={kendaraanId}
                onChange={(e) => setKendaraanId(e.target.value)}
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
                Tanggal Kejadian
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)]"
                required
              />
            </div>
          </div>

          {/* Row: Jam & Kategori */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Jam Kejadian
              </label>
              <input
                type="text"
                placeholder="09:30"
                value={jam}
                onChange={(e) => setJam(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)]"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Kategori Insiden
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as KategoriInsidenEnum)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)]"
              >
                <option value="baret_bodi">Baret / Goresan Bodi</option>
                <option value="senggolan">Senggolan Halus</option>
                <option value="tabrakan">Tabrakan / Penyok</option>
                <option value="ban_pecah">Ban Bocor / Pecah</option>
                <option value="kerusakan_mesin">Kerusakan Mesin / Overheat</option>
                <option value="lainnya">Lainnya / Kelistrikan</option>
              </select>
            </div>
          </div>

          {/* Tingkat Keparahan */}
          <div>
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
              Tingkat Keparahan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ringan', label: 'Ringan (Lecet Halus)', color: 'bg-emerald-500 text-white' },
                { id: 'sedang', label: 'Sedang (Penyok/Bengkel)', color: 'bg-amber-500 text-white' },
                { id: 'berat', label: 'Berat (Derek/Stop Opr)', color: 'bg-rose-500 text-white' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => {
                    sound.click();
                    setTingkatKeparahan(lvl.id as any);
                  }}
                  className={`p-2 text-[10px] font-bold rounded-xl border text-center transition-all ${
                    tingkatKeparahan === lvl.id
                      ? `${lvl.color} border-transparent shadow-xs font-black`
                      : 'bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border)]'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lokasi Kejadian */}
          <div>
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
              Lokasi Kejadian
            </label>
            <input
              type="text"
              placeholder="Contoh: Jl. Sudirman dekat Simpang Charitas"
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)]"
              required
            />
          </div>

          {/* Deskripsi Kejadian */}
          <div>
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
              Deskripsi Kejadian / Kerusakan
            </label>
            <textarea
              rows={2}
              placeholder="Jelaskan secara singkat bagian yang lecet atau kendala teknis yang terjadi..."
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)]"
              required
            />
          </div>

          {/* Tindakan Awal & Estimasi Biaya */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Tindakan Awal
              </label>
              <input
                type="text"
                placeholder="Dibawa ke bengkel rekanan"
                value={tindakan}
                onChange={(e) => setTindakan(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                Estimasi Biaya (Rp)
              </label>
              <input
                type="number"
                placeholder="250000"
                value={estimasiBiaya}
                onChange={(e) => setEstimasiBiaya(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-xs font-mono font-bold text-[var(--text-primary)]"
              />
            </div>
          </div>

          {/* Tombol Simpan */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold text-[var(--text-primary)]"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !deskripsi.trim()}
              className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Laporan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
