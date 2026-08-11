'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { KasTransaksi } from '@/types/database';
import { getKasTransaksiList, getKasKategoriList, deleteKasTransaksi, updateKasTransaksi } from '@/lib/actions/kas';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { ExportButton, ExportColumn } from '@/components/shared/ExportButton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Trash2, Edit2, Banknote, CreditCard, X } from 'lucide-react';
import Link from 'next/link';

export default function CashflowPage() {
  const [transaksiList, setTransaksiList] = React.useState<KasTransaksi[]>([]);
  const [kategoriList, setKategoriList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Edit modal state
  const [editingTx, setEditingTx] = React.useState<KasTransaksi | null>(null);
  const [editForm, setEditForm] = React.useState<Partial<KasTransaksi>>({});
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Filters
  const [filterTipe, setFilterTipe] = React.useState('semua');
  const [filterKategori, setFilterKategori] = React.useState('semua');
  const [filterJenis, setFilterJenis] = React.useState('semua');
  const [filterDateFrom, setFilterDateFrom] = React.useState('');
  const [filterDateTo, setFilterDateTo] = React.useState('');

  const loadData = async () => {
    setLoading(true);
    const [tData, kData] = await Promise.all([getKasTransaksiList(), getKasKategoriList()]);
    setTransaksiList(tData);
    setKategoriList(kData);
    setLoading(false);
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    await deleteKasTransaksi(deletingId);
    setDeletingId(null);
    loadData();
  };

  const handleOpenEdit = (tx: KasTransaksi) => {
    setEditingTx(tx);
    setEditForm({
      tanggal: tx.tanggal,
      tipe: tx.tipe,
      kategori: tx.kategori,
      keterangan: tx.keterangan,
      nominal: tx.nominal,
      jenis_pembayaran: tx.jenis_pembayaran || 'tunai',
      pic_nama: tx.pic_nama,
      pic_tipe: tx.pic_tipe,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setSavingEdit(true);
    const res = await updateKasTransaksi(editingTx.id, editForm);
    setSavingEdit(false);
    if (res.success) {
      setEditingTx(null);
      loadData();
    } else {
      alert('Gagal menyimpan: ' + res.error);
    }
  };

  const filteredData = React.useMemo(() => {
    return transaksiList.filter((tx) => {
      if (filterTipe !== 'semua' && tx.tipe !== filterTipe) return false;
      if (filterKategori !== 'semua' && tx.kategori !== filterKategori) return false;
      if (filterJenis !== 'semua' && (tx.jenis_pembayaran || 'tunai') !== filterJenis) return false;
      if (filterDateFrom && tx.tanggal < filterDateFrom) return false;
      if (filterDateTo && tx.tanggal > filterDateTo) return false;
      return true;
    });
  }, [transaksiList, filterTipe, filterKategori, filterJenis, filterDateFrom, filterDateTo]);

  // Summary stats
  const totalMasuk = filteredData.filter((t) => t.tipe === 'pemasukan').reduce((s, t) => s + t.nominal, 0);
  const totalKeluar = filteredData.filter((t) => t.tipe === 'pengeluaran').reduce((s, t) => s + t.nominal, 0);
  const totalTunai = filteredData.reduce((s, t) => s + ((t.jenis_pembayaran || 'tunai') === 'tunai' ? (t.tipe === 'pemasukan' ? t.nominal : -t.nominal) : 0), 0);
  const totalNonTunai = filteredData.reduce((s, t) => s + ((t.jenis_pembayaran || 'tunai') === 'non_tunai' ? (t.tipe === 'pemasukan' ? t.nominal : -t.nominal) : 0), 0);

  const exportColumns: ExportColumn[] = [
    { header: 'Tanggal', key: 'tanggal', width: 15 },
    { header: 'Tipe', key: 'tipe', width: 15 },
    { header: 'Jenis', key: 'jenis_pembayaran', width: 12 },
    { header: 'Kategori', key: 'kategori', width: 20 },
    { header: 'Keterangan', key: 'keterangan', width: 35 },
    { header: 'Nominal', key: 'nominal', width: 20, isCurrency: true },
    { header: 'PIC Transaksi', key: 'pic_nama', width: 20 },
  ];

  const columns: ColumnDef<KasTransaksi>[] = [
    {
      accessorKey: 'tanggal',
      header: 'Tanggal',
      cell: ({ row }) => (
        <div className="text-xs">
          <div className="font-medium">{formatDateIndo(row.original.tanggal)}</div>
        </div>
      ),
    },
    {
      accessorKey: 'tipe',
      header: 'Tipe',
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <span
            className={`px-2 py-0.5 text-xs rounded font-bold uppercase inline-flex items-center gap-1 w-fit ${
              row.original.tipe === 'pemasukan'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
            }`}
          >
            {row.original.tipe === 'pemasukan' ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {row.original.tipe}
          </span>
          <span className={`px-1.5 py-0.5 text-[10px] rounded font-semibold inline-flex items-center gap-0.5 w-fit ${
            (row.original.jenis_pembayaran || 'tunai') === 'tunai'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
          }`}>
            {(row.original.jenis_pembayaran || 'tunai') === 'tunai'
              ? <><Banknote className="w-2.5 h-2.5" /> Tunai</>
              : <><CreditCard className="w-2.5 h-2.5" /> Non-Tunai</>
            }
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'kategori',
      header: 'Kategori',
      cell: ({ row }) => (
        <span className="text-xs capitalize">{row.original.kategori.replace(/_/g, ' ')}</span>
      ),
    },
    {
      accessorKey: 'keterangan',
      header: 'Keterangan',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-[var(--text-primary)] text-xs">{row.original.keterangan}</div>
          <div className="flex items-center gap-1 mt-0.5">
            {row.original.sumber_otomatis && (
              <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 px-1.5 rounded font-semibold">
                Otomatis
              </span>
            )}
            <span className="text-[10px] text-[var(--text-secondary)]">PIC: {row.original.pic_nama}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'nominal',
      header: 'Nominal',
      cell: ({ row }) => (
        <span
          className={`font-bold text-xs tabular-nums ${
            row.original.tipe === 'pemasukan' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
          }`}
        >
          {row.original.tipe === 'pemasukan' ? '+' : '−'} {formatRupiah(row.original.nominal)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenEdit(row.original)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded flex items-center gap-1 text-xs font-semibold"
            title="Edit Transaksi Kas"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeletingId(row.original.id)}
            className="p-1.5 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded flex items-center gap-1 text-xs font-semibold"
            title="Hapus Transaksi Kas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PinGateDialog>
      <div className="space-y-6">
        <PageHeader
          title="Buku Besar Cashflow Keuangan"
          description="Rincian lengkap transaksi pemasukan dan pengeluaran kas Amanah Drive"
          breadcrumbs={[{ label: 'Kas', href: '/kas' }, { label: 'Cashflow' }]}
          actions={
            <div className="flex items-center gap-3">
              <ExportButton
                data={filteredData}
                columns={exportColumns}
                filename="amanahdrive_cashflow"
                title="Laporan Cashflow Kas Amanah Drive"
              />
              <Link
                href="/kas"
                className="px-3 py-1.5 border border-[var(--border)] rounded-md text-xs font-medium flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </Link>
            </div>
          }
        />

        {/* Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Total Masuk', value: totalMasuk, color: 'text-emerald-600', prefix: '+' },
            { label: 'Total Keluar', value: totalKeluar, color: 'text-rose-600', prefix: '−' },
            { label: 'Saldo Tunai', value: totalTunai, color: totalTunai >= 0 ? 'text-amber-600' : 'text-rose-600', prefix: '' },
            { label: 'Saldo Non-Tunai', value: totalNonTunai, color: totalNonTunai >= 0 ? 'text-blue-600' : 'text-rose-600', prefix: '' },
          ].map((item) => (
            <div key={item.label} className="card-container py-3 px-4">
              <p className="text-[var(--text-secondary)] mb-1">{item.label}</p>
              <p className={`font-bold tabular-nums ${item.color}`}>
                {item.prefix}{formatRupiah(Math.abs(item.value))}
              </p>
            </div>
          ))}
        </div>

        {/* Toolbar Filter */}
        <div className="card-container space-y-3">
          {/* Row 1 */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-medium">Filter Tipe</label>
              <select
                value={filterTipe}
                onChange={(e) => setFilterTipe(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
              >
                <option value="semua">Semua Tipe</option>
                <option value="pemasukan">Pemasukan (+)</option>
                <option value="pengeluaran">Pengeluaran (−)</option>
              </select>
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-medium">Filter Jenis</label>
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
              >
                <option value="semua">Semua Jenis</option>
                <option value="tunai">💵 Tunai</option>
                <option value="non_tunai">🏦 Non-Tunai</option>
              </select>
            </div>

            <div>
              <label className="block text-[var(--text-secondary)] mb-1 font-medium">Filter Kategori</label>
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
              >
                <option value="semua">Semua Kategori</option>
                {kategoriList.map((k) => (
                  <option key={k.id} value={k.nama_kategori}>
                    {k.nama_kategori.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto text-[var(--text-secondary)]">
              <span className="font-bold text-[var(--text-primary)]">{filteredData.length}</span> transaksi
            </div>
          </div>

          {/* Row 2: Date Range */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border)] text-xs">
            <span className="font-semibold text-[var(--text-secondary)]">Rentang Tanggal:</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
              />
              <span className="text-[var(--text-muted)]">s/d</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
              />
              {(filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-rose-600 border border-rose-200 rounded-md hover:bg-rose-50"
                >
                  <X className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Cashflow */}
        <div className="card-container">
          {loading ? (
            <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
          ) : (
            <DataTable columns={columns} data={filteredData} searchKey="transaksi" />
          )}
        </div>

        {/* EDIT MODAL */}
        {editingTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                  Edit Transaksi Kas
                </h3>
                <button onClick={() => setEditingTx(null)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
                {/* Tipe Toggle */}
                <div className="flex rounded-md p-1 bg-[var(--bg-subtle)] border border-[var(--border)] text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, tipe: 'pengeluaran' })}
                    className={`flex-1 py-1.5 rounded-md transition-colors ${editForm.tipe === 'pengeluaran' ? 'bg-[var(--danger)] text-white' : 'text-[var(--text-secondary)]'}`}
                  >
                    Pengeluaran (−)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, tipe: 'pemasukan' })}
                    className={`flex-1 py-1.5 rounded-md transition-colors ${editForm.tipe === 'pemasukan' ? 'bg-[var(--success)] text-white' : 'text-[var(--text-secondary)]'}`}
                  >
                    Pemasukan (+)
                  </button>
                </div>

                <DatePickerWIB
                  label="Tanggal Transaksi *"
                  value={editForm.tanggal || getTodayDateString()}
                  onChange={(val) => setEditForm({ ...editForm, tanggal: val })}
                />

                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">Kategori *</label>
                  <select
                    value={editForm.kategori || ''}
                    onChange={(e) => setEditForm({ ...editForm, kategori: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-sm"
                  >
                    {kategoriList.map((k) => (
                      <option key={k.id} value={k.nama_kategori}>
                        {k.nama_kategori.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">Keterangan *</label>
                  <input
                    type="text"
                    required
                    value={editForm.keterangan || ''}
                    onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>

                <CurrencyInput
                  label="Nominal Rupiah *"
                  value={editForm.nominal || 0}
                  onChange={(val) => setEditForm({ ...editForm, nominal: val })}
                />

                {/* Jenis Pembayaran */}
                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">Jenis Pembayaran *</label>
                  <div className="flex rounded-md p-1 bg-[var(--bg-subtle)] border border-[var(--border)] text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, jenis_pembayaran: 'tunai' })}
                      className={`flex-1 py-1.5 rounded-md transition-colors ${editForm.jenis_pembayaran === 'tunai' ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-secondary)]'}`}
                    >
                      💵 Tunai (Cash)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, jenis_pembayaran: 'non_tunai' })}
                      className={`flex-1 py-1.5 rounded-md transition-colors ${editForm.jenis_pembayaran === 'non_tunai' ? 'bg-blue-600 text-white' : 'text-[var(--text-secondary)]'}`}
                    >
                      🏦 Non-Tunai
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[var(--text-secondary)] mb-1">PIC Nama</label>
                  <input
                    type="text"
                    value={editForm.pic_nama || ''}
                    onChange={(e) => setEditForm({ ...editForm, pic_nama: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditingTx(null)}
                    className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-md"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-60"
                  >
                    {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Dialog Hapus Transaksi */}
        <ConfirmDialog
          isOpen={!!deletingId}
          onClose={() => setDeletingId(null)}
          onConfirm={handleDeleteConfirm}
          title="Hapus Transaksi Kas"
          description="Apakah Anda yakin ingin menghapus catatan transaksi kas ini? Aksi ini tidak dapat dibatalkan."
          confirmText="Hapus Transaksi"
          isDanger
        />
      </div>
    </PinGateDialog>
  );
}
