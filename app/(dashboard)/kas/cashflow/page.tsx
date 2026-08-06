'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { KasTransaksi } from '@/types/database';
import { getKasTransaksiList, getKasKategoriList, deleteKasTransaksi } from '@/lib/actions/kas';
import { formatRupiah } from '@/lib/utils/currency';
import { ExportButton, ExportColumn } from '@/components/shared/ExportButton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function CashflowPage() {
  const [transaksiList, setTransaksiList] = React.useState<KasTransaksi[]>([]);
  const [kategoriList, setKategoriList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Filters
  const [filterTipe, setFilterTipe] = React.useState('semua');
  const [filterKategori, setFilterKategori] = React.useState('semua');

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

  const filteredData = transaksiList.filter((tx) => {
    if (filterTipe !== 'semua' && tx.tipe !== filterTipe) return false;
    if (filterKategori !== 'semua' && tx.kategori !== filterKategori) return false;
    return true;
  });

  const exportColumns: ExportColumn[] = [
    { header: 'Tanggal', key: 'tanggal', width: 15 },
    { header: 'Tipe', key: 'tipe', width: 15 },
    { header: 'Kategori', key: 'kategori', width: 20 },
    { header: 'Keterangan', key: 'keterangan', width: 35 },
    { header: 'Nominal', key: 'nominal', width: 20, isCurrency: true },
    { header: 'PIC Transaksi', key: 'pic_nama', width: 20 },
  ];

  const columns: ColumnDef<KasTransaksi>[] = [
    { accessorKey: 'tanggal', header: 'Tanggal' },
    {
      accessorKey: 'tipe',
      header: 'Tipe',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-xs rounded font-bold uppercase inline-flex items-center gap-1 ${
            row.original.tipe === 'pemasukan'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {row.original.tipe === 'pemasukan' ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          {row.original.tipe}
        </span>
      ),
    },
    {
      accessorKey: 'kategori',
      header: 'Kategori',
      cell: ({ row }) => row.original.kategori.replace('_', ' ').toUpperCase(),
    },
    {
      accessorKey: 'keterangan',
      header: 'Keterangan',
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-[var(--text-primary)]">{row.original.keterangan}</div>
          {row.original.sumber_otomatis && (
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">
              Ter-generate Otomatis
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'nominal',
      header: 'Nominal',
      cell: ({ row }) => (
        <span
          className={`font-bold text-xs ${
            row.original.tipe === 'pemasukan' ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {row.original.tipe === 'pemasukan' ? '+' : '-'} {formatRupiah(row.original.nominal)}
        </span>
      ),
    },
    { accessorKey: 'pic_nama', header: 'PIC' },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <button
          onClick={() => setDeletingId(row.original.id)}
          className="p-1.5 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded flex items-center gap-1 text-xs font-semibold"
          title="Hapus Transaksi Kas"
        >
          <Trash2 className="w-4 h-4" />
        </button>
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

        {/* Toolbar Filter */}
        <div className="card-container p-4 flex flex-wrap items-center gap-4 text-xs">
          <div>
            <label className="block text-[var(--text-secondary)] mb-1 font-medium">Filter Tipe</label>
            <select
              value={filterTipe}
              onChange={(e) => setFilterTipe(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)]"
            >
              <option value="semua">Semua Tipe</option>
              <option value="pemasukan">Pemasukan (+)</option>
              <option value="pengeluaran">Pengeluaran (−)</option>
            </select>
          </div>

          <div>
            <label className="block text-[var(--text-secondary)] mb-1 font-medium">Filter Kategori</label>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)]"
            >
              <option value="semua">Semua Kategori</option>
              {kategoriList.map((k) => (
                <option key={k.id} value={k.nama_kategori}>
                  {k.nama_kategori.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
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
