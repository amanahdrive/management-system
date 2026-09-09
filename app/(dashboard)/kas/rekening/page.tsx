'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import {
  getRekeningList,
  addRekening,
  updateRekening,
  deleteRekening,
} from '@/lib/actions/rekening';
import { getGeneralSettings } from '@/lib/actions/settings';
import { RekeningBank } from '@/types/database';
import { useAppRefresh, triggerAppRefresh } from '@/lib/utils/refresh-event';
import {
  Landmark,
  Plus,
  Copy,
  Edit3,
  Trash2,
  Star,
  Loader2,
  Save,
  CheckCircle2,
  Building2,
} from 'lucide-react';

export default function RekeningBankPage() {
  const [rekeningList, setRekeningList] = React.useState<RekeningBank[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [companyName, setCompanyName] = React.useState('Amanah Drive');

  // Modal State
  const [showModal, setShowModal] = React.useState(false);
  const [editingRekening, setEditingRekening] = React.useState<RekeningBank | null>(null);
  const [formRekening, setFormRekening] = React.useState({
    nama_bank: 'BCA',
    nomor_rekening: '',
    atas_nama: 'Amanah Drive',
    aktif: true,
    is_utama: false,
    keterangan: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [rekList, genCfg] = await Promise.all([
        getRekeningList(),
        getGeneralSettings(),
      ]);
      setRekeningList(rekList);
      if (genCfg?.namaPerusahaan) {
        setCompanyName(genCfg.namaPerusahaan);
      }
    } catch (err) {
      console.error('Error loading rekening list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  useAppRefresh(loadData);

  const handleOpenAdd = () => {
    setEditingRekening(null);
    setFormRekening({
      nama_bank: 'BCA',
      nomor_rekening: '',
      atas_nama: companyName || 'Amanah Drive',
      aktif: true,
      is_utama: rekeningList.length === 0,
      keterangan: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (rek: RekeningBank) => {
    setEditingRekening(rek);
    setFormRekening({
      nama_bank: rek.nama_bank,
      nomor_rekening: rek.nomor_rekening,
      atas_nama: rek.atas_nama,
      aktif: rek.aktif,
      is_utama: rek.is_utama || false,
      keterangan: rek.keterangan || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRekening.nama_bank || !formRekening.nomor_rekening || !formRekening.atas_nama) {
      alert('Nama Bank, Nomor Rekening, dan Atas Nama wajib diisi!');
      return;
    }
    setSaving(true);

    try {
      if (editingRekening) {
        const res = await updateRekening(editingRekening.id, {
          nama_bank: formRekening.nama_bank,
          nomor_rekening: formRekening.nomor_rekening,
          atas_nama: formRekening.atas_nama,
          aktif: formRekening.aktif,
          is_utama: formRekening.is_utama,
          keterangan: formRekening.keterangan,
        });
        if (res.success) {
          setShowModal(false);
          await loadData();
          triggerAppRefresh();
        } else {
          alert('Gagal mengubah rekening: ' + (res.error || 'Terjadi kesalahan'));
        }
      } else {
        const res = await addRekening({
          nama_bank: formRekening.nama_bank,
          nomor_rekening: formRekening.nomor_rekening,
          atas_nama: formRekening.atas_nama,
          aktif: formRekening.aktif,
          is_utama: formRekening.is_utama,
          keterangan: formRekening.keterangan,
        });
        if (res.success) {
          setShowModal(false);
          await loadData();
          triggerAppRefresh();
        } else {
          alert('Gagal menambah rekening: ' + (res.error || 'Terjadi kesalahan'));
        }
      }
    } catch (err: any) {
      console.error('Error saving rekening:', err);
      alert('Terjadi kesalahan sistem saat menyimpan rekening: ' + (err?.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Hapus rekening ${nama}?`)) return;
    try {
      const res = await deleteRekening(id);
      if (res.success) {
        await loadData();
        triggerAppRefresh();
      } else {
        alert('Gagal menghapus rekening: ' + res.error);
      }
    } catch (err: any) {
      console.error('Error deleting rekening:', err);
      alert('Terjadi kesalahan saat menghapus rekening');
    }
  };

  const handleToggleAktif = async (rek: RekeningBank) => {
    const res = await updateRekening(rek.id, { aktif: !rek.aktif });
    if (res.success) {
      await loadData();
      triggerAppRefresh();
    }
  };

  const handleCopy = (id: string, noRek: string) => {
    navigator.clipboard.writeText(noRek);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <PinGateDialog>
      <div className="space-y-6">
        <PageHeader
          title="Rekening Bank Perusahaan"
          description="Daftar rekening bank resmi untuk pilihan transaksi pembayaran transfer bank pada Kas, PWA Finance, dan Cetak Nota"
          breadcrumbs={[{ label: 'Kas & Keuangan', href: '/kas' }, { label: 'Rekening Bank' }]}
          actions={
            <button
              type="button"
              onClick={handleOpenAdd}
              className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rekening</span>
            </button>
          }
        />


        {/* Card Grid */}
        <div className="card-container space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Daftar Rekening Bank ({rekeningList.length})
              </h3>
            </div>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              {rekeningList.filter((r) => r.aktif).length} Aktif
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Memuat data rekening bank...</span>
            </div>
          ) : rekeningList.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Building2 className="w-10 h-10 text-gray-400 mx-auto" />
              <p className="text-xs text-[var(--text-secondary)]">
                Belum ada rekening bank yang tersimpan.
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Rekening Pertama</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rekeningList.map((rek) => (
                <div
                  key={rek.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-all relative ${
                    rek.aktif
                      ? 'bg-[var(--bg)] border-[var(--border)] shadow-xs hover:border-emerald-500'
                      : 'bg-gray-100 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-60'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header: Bank & Badges */}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-xs uppercase tracking-wider border border-emerald-300 dark:border-emerald-800">
                        {rek.nama_bank}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {rek.is_utama && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-300 dark:border-amber-800">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            Utama
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            rek.aktif
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {rek.aktif ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </div>
                    </div>

                    {/* Account Number */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--text-secondary)] font-medium">Nomor Rekening</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(rek.id, rek.nomor_rekening)}
                          className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5 transition-colors"
                          title="Salin Nomor Rekening"
                        >
                          {copiedId === rek.id ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              Disalin!
                            </span>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="text-base font-bold font-mono tracking-wider text-[var(--text-primary)] mt-0.5">
                        {rek.nomor_rekening}
                      </div>
                    </div>

                    {/* Holder */}
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] font-medium">Atas Nama</span>
                      <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {rek.atas_nama}
                      </div>
                    </div>

                    {rek.keterangan && (
                      <p className="text-[10px] text-[var(--text-secondary)] italic border-t border-[var(--border)] pt-1.5 line-clamp-2">
                        {rek.keterangan}
                      </p>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2.5 border-t border-[var(--border)] flex items-center justify-between gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleAktif(rek)}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        rek.aktif
                          ? 'text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      }`}
                    >
                      {rek.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(rek)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                        title="Edit Rekening"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rek.id, `${rek.nama_bank} - ${rek.nomor_rekening}`)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Hapus Rekening"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Tambah / Edit Rekening */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-4 animate-scaleIn">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      {editingRekening ? 'Edit Rekening Bank' : 'Tambah Rekening Bank Baru'}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Lengkapi detail rekening untuk penerimaan non-tunai
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                    Nama Bank *
                  </label>
                  <select
                    value={formRekening.nama_bank}
                    onChange={(e) => setFormRekening({ ...formRekening, nama_bank: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                  >
                    <option value="BCA">BCA (Bank Central Asia)</option>
                    <option value="Mandiri">Bank Mandiri</option>
                    <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                    <option value="BNI">BNI (Bank Negara Indonesia)</option>
                    <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                    <option value="CIMB Niaga">CIMB Niaga</option>
                    <option value="Permata">Bank Permata</option>
                    <option value="Danamon">Bank Danamon</option>
                    <option value="BTN">BTN</option>
                    <option value="BJB">Bank BJB</option>
                    <option value="Lainnya">Lainnya / Bank Daerah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                    Nomor Rekening *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 8535441234"
                    value={formRekening.nomor_rekening}
                    onChange={(e) => setFormRekening({ ...formRekening, nomor_rekening: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-mono font-bold tracking-wider text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                    Atas Nama (A.n) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT Amanah Drive Palembang"
                    value={formRekening.atas_nama}
                    onChange={(e) => setFormRekening({ ...formRekening, atas_nama: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">
                    Keterangan / Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Rekening Utama Penerimaan Kursus"
                    value={formRekening.keterangan}
                    onChange={(e) => setFormRekening({ ...formRekening, keterangan: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRekening.is_utama}
                      onChange={(e) => setFormRekening({ ...formRekening, is_utama: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Jadikan Rekening Utama (Default Pilihan Pertama)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRekening.aktif}
                      onChange={(e) => setFormRekening({ ...formRekening, aktif: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Status Rekening Aktif
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saving ? 'Menyimpan...' : 'Simpan Rekening'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PinGateDialog>
  );
}
