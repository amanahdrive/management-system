'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Paket } from '@/types/database';
import { getPaketList, upsertPaket } from '@/lib/actions/master-data';
import { formatRupiah } from '@/lib/utils/currency';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { Plus, Edit2 } from 'lucide-react';

import { MasterDataSubNav } from '@/components/master-data/MasterDataSubNav';
import { useAppRefresh } from '@/lib/utils/refresh-event';
import {
  CAR_OPTIONS_CONFIG,
  normalizePaketJenisMobil,
  preparePaketJenisMobilPayload,
} from '@/lib/utils/vehicle';

export default function MasterPaketPage() {
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Form State
  const [editingPaket, setEditingPaket] = React.useState<Partial<Paket> | null>(null);

  const loadData = () => {
    setLoading(true);
    getPaketList().then((res) => {
      setPaketList(res);
      setLoading(false);
    });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  useAppRefresh(loadData);

  const handleOpenAdd = () => {
    setEditingPaket({
      nama_paket: '',
      jumlah_sesi: 5,
      termasuk_sim: false,
      harga_normal: 0,
      harga_promo: null,
      jenis_mobil: ['manual', 'matic'],
      is_custom: false,
      aktif: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (paket: Paket) => {
    setEditingPaket({
      ...paket,
      jenis_mobil: normalizePaketJenisMobil(paket.jenis_mobil as any) as any,
    });
    setIsModalOpen(true);
  };

  const handleToggleCarOption = (id: string) => {
    if (!editingPaket) return;
    const current = (editingPaket.jenis_mobil as string[]) || [];
    const exists = current.includes(id);
    const updated = exists ? current.filter((k) => k !== id) : [...current, id];
    setEditingPaket({
      ...editingPaket,
      jenis_mobil: updated as any,
    });
  };

  const isAllCarOptionsSelected =
    CAR_OPTIONS_CONFIG.every((opt) =>
      ((editingPaket?.jenis_mobil as string[]) || []).includes(opt.id)
    );

  const handleToggleAllCarOptions = () => {
    if (!editingPaket) return;
    if (isAllCarOptionsSelected) {
      setEditingPaket({
        ...editingPaket,
        jenis_mobil: [],
      });
    } else {
      setEditingPaket({
        ...editingPaket,
        jenis_mobil: CAR_OPTIONS_CONFIG.map((opt) => opt.id) as any,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaket?.nama_paket) return;

    const selectedOptions = (editingPaket.jenis_mobil as string[]) || [];
    if (selectedOptions.length === 0) {
      alert('Pilih minimal 1 opsi mobil yang berlaku untuk paket ini!');
      return;
    }

    const payloadJenisMobil = preparePaketJenisMobilPayload(selectedOptions);

    await upsertPaket({
      ...editingPaket,
      jenis_mobil: payloadJenisMobil as any,
    });
    setIsModalOpen(false);
    loadData();
  };

  const columns: ColumnDef<Paket>[] = [
    {
      accessorKey: 'nama_paket',
      header: 'Nama Paket',
      sortingFn: 'text',
      cell: ({ row }) => (
        <span className="font-semibold text-[var(--text-primary)]">
          {row.original.nama_paket}
          {row.original.is_custom && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded">
              Kustom
            </span>
          )}
        </span>
      ),
    },
    {
      accessorKey: 'jumlah_sesi',
      header: 'Jumlah Sesi',
      sortingFn: 'basic',
      cell: ({ row }) => `${row.original.jumlah_sesi} Sesi`,
    },
    {
      id: 'termasuk_sim',
      header: 'Fasilitas SIM',
      accessorFn: (row) => (row.termasuk_sim ? 1 : 0),
      sortingFn: 'basic',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-xs rounded font-medium ${
            row.original.termasuk_sim
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.original.termasuk_sim ? 'Termasuk SIM' : 'Tanpa SIM'}
        </span>
      ),
    },
    {
      accessorKey: 'harga_normal',
      header: 'Harga Normal',
      sortingFn: 'basic',
      cell: ({ row }) => formatRupiah(row.original.harga_normal),
    },
    {
      id: 'harga_promo',
      header: 'Harga Promo',
      accessorFn: (row) => row.harga_promo || 0,
      sortingFn: 'basic',
      cell: ({ row }) => (row.original.harga_promo ? formatRupiah(row.original.harga_promo) : '-'),
    },
    {
      id: 'jenis_mobil',
      header: 'Opsi Mobil',
      accessorFn: (row) => (row.jenis_mobil || []).join(', '),
      sortingFn: 'text',
      cell: ({ row }) => {
        const jm = row.original.jenis_mobil || [];
        const hasManual = jm.includes('manual');
        const hasMatic = jm.includes('matic');
        const hasSendiriManual = jm.includes('mobil_sendiri_manual' as any);
        const hasSendiriMatic = jm.includes('mobil_sendiri_matic' as any);
        const hasLegacySendiri = jm.includes('mobil_sendiri');

        const isAllSelected =
          hasManual &&
          hasMatic &&
          (hasSendiriManual || hasLegacySendiri) &&
          (hasSendiriMatic || hasLegacySendiri);

        if (isAllSelected) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Semua Opsi Mobil
            </span>
          );
        }

        return (
          <div className="flex flex-wrap gap-1 max-w-[260px]">
            {hasManual && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                Manual (Amanah)
              </span>
            )}
            {hasMatic && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                Matic (Amanah)
              </span>
            )}
            {(hasSendiriManual || (hasLegacySendiri && !hasSendiriMatic)) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                Mobil Sendiri (Manual)
              </span>
            )}
            {(hasSendiriMatic || (hasLegacySendiri && !hasSendiriManual)) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                Mobil Sendiri (Matic)
              </span>
            )}
            {jm.length === 0 && (
              <span className="text-xs text-[var(--text-muted)]">-</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => (
        <button
          onClick={() => handleOpenEdit(row.original)}
          className="p-1 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] rounded"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Data Paket Kursus"
        description="Kelola paket belajar mengemudi, jumlah sesi, fasilitas SIM, dan harga"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Paket' }]}
        actions={
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Paket</span>
          </button>
        }
      />

      <MasterDataSubNav />

      <div className="card-container">
        {loading ? (
          <div className="h-48 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={paketList} searchKey="paket" />
        )}
      </div>

      {/* Modal Form Tambah/Edit */}
      {isModalOpen && editingPaket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-lg w-full bg-[var(--bg)] shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {editingPaket.id ? 'Edit Paket' : 'Tambah Paket Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Nama Paket *
                </label>
                <input
                  type="text"
                  required
                  value={editingPaket.nama_paket || ''}
                  onChange={(e) =>
                    setEditingPaket({ ...editingPaket, nama_paket: e.target.value })
                  }
                  placeholder="Contoh: Basic (5x) Manual"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Jumlah Sesi *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingPaket.jumlah_sesi || 0}
                    onChange={(e) =>
                      setEditingPaket({ ...editingPaket, jumlah_sesi: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingPaket.termasuk_sim || false}
                      onChange={(e) =>
                        setEditingPaket({ ...editingPaket, termasuk_sim: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-[var(--brand-primary)]"
                    />
                    <span>Termasuk SIM</span>
                  </label>
                </div>
              </div>

              {/* Opsi Mobil yang Berlaku */}
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)] block">
                      Opsi Mobil yang Berlaku *
                    </label>
                    <span className="text-[10px] text-[var(--text-secondary)] block">
                      Pilih tipe mobil yang berlaku untuk harga paket ini
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAllCarOptions}
                    className="px-2 py-1 text-[11px] font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-lg transition-colors"
                  >
                    {isAllCarOptionsSelected ? 'Batal Semua' : 'Centang Semua'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {CAR_OPTIONS_CONFIG.map((opt) => {
                    const isChecked = ((editingPaket.jenis_mobil as string[]) || []).includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 shadow-2xs font-semibold'
                            : 'border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg-subtle)] opacity-75'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCarOption(opt.id)}
                          className="w-4 h-4 mt-0.5 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                        />
                        <div className="space-y-0.5 leading-tight">
                          <span className="font-bold text-[var(--text-primary)] block">
                            {opt.label}
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)] block">
                            {opt.sublabel}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CurrencyInput
                  label="Harga Normal"
                  value={editingPaket.harga_normal}
                  onChange={(val) => setEditingPaket({ ...editingPaket, harga_normal: val })}
                />

                <CurrencyInput
                  label="Harga Promo (Opsional)"
                  value={editingPaket.harga_promo}
                  onChange={(val) => setEditingPaket({ ...editingPaket, harga_promo: val || null })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold border border-[var(--border)] rounded-xl hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl shadow-xs transition-colors"
                >
                  Simpan Paket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
