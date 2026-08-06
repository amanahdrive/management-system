'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatRupiah } from '@/lib/utils/currency';
import { getKasOverviewMetrics, getKasTransaksiList, addKasTransaksi, getKasKategoriList, deleteKasTransaksi } from '@/lib/actions/kas';
import { getTodayDateString, formatDateIndo } from '@/lib/utils/date';
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, Camera, FileText, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function KasOverviewPage() {
  const [metrics, setMetrics] = React.useState({ saldoAktif: 0, totalPiutang: 0, totalHutang: 0 });
  const [transaksiList, setTransaksiList] = React.useState<any[]>([]);
  const [kategoriList, setKategoriList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Form State
  const [formData, setFormData] = React.useState({
    tanggal: getTodayDateString(),
    tipe: 'pengeluaran' as 'pemasukan' | 'pengeluaran',
    kategori: 'operasional',
    keterangan: '',
    nominal: 0,
    pic_tipe: 'admin' as 'admin' | 'finance',
    pic_nama: '',
  });

  const loadData = async () => {
    setLoading(true);
    const [mRes, tRes, kRes] = await Promise.all([
      getKasOverviewMetrics(),
      getKasTransaksiList(),
      getKasKategoriList(),
    ]);
    setMetrics(mRes);
    setTransaksiList(tRes);
    setKategoriList(kRes);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keterangan || formData.nominal <= 0) return;

    await addKasTransaksi({
      ...formData,
      pic_nama: formData.pic_tipe === 'finance' ? 'Lia (Finance)' : formData.pic_nama || 'Admin Staff',
    });

    setFormData({
      tanggal: getTodayDateString(),
      tipe: 'pengeluaran',
      kategori: 'operasional',
      keterangan: '',
      nominal: 0,
      pic_tipe: 'admin',
      pic_nama: '',
    });

    loadData();
  };

  return (
    <PinGateDialog>
      <div className="space-y-6">
        <PageHeader
          title="Manajemen Kas & Arus Keuangan"
          description="Pencatatan kas masuk/keluar, piutang siswa, dan hutang perusahaan"
          actions={
            <div className="flex items-center gap-3">
              <Link
                href="/kas/cashflow"
                className="px-3.5 py-2 border border-[var(--border)] rounded-md text-xs font-semibold hover:bg-[var(--bg-subtle)] flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Detail Cashflow</span>
              </Link>
              <Link
                href="/kas/piutang"
                className="px-3.5 py-2 bg-amber-600 text-white rounded-md text-xs font-semibold hover:bg-amber-700 flex items-center gap-1.5"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Manajemen Piutang</span>
              </Link>
              <Link
                href="/kas/hutang"
                className="px-3.5 py-2 bg-[var(--brand-primary)] text-white rounded-md text-xs font-semibold hover:bg-[var(--brand-primary-dark)] flex items-center gap-1.5"
              >
                <Wallet className="w-4 h-4" />
                <span>Manajemen Hutang</span>
              </Link>
            </div>
          }
        />

        {/* 3 Main Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Saldo Kas Aktif"
            value={formatRupiah(metrics.saldoAktif)}
            description="Akumulasi pemasukan dikurangi pengeluaran"
            icon={<Wallet className="w-5 h-5 text-teal-600" />}
          />
          <StatCard
            label="Total Piutang Siswa"
            value={formatRupiah(metrics.totalPiutang)}
            description="Sisa tagihan siswa belum lunas"
            icon={<ArrowUpRight className="w-5 h-5 text-amber-600" />}
          />
          <StatCard
            label="Total Sisa Hutang"
            value={formatRupiah(metrics.totalHutang)}
            description="Cicilan mobil & pinjaman aktif"
            icon={<ArrowDownRight className="w-5 h-5 text-rose-600" />}
          />
        </div>

        {/* Grid Input Fast Transaction + Recent List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Transaction Input Form */}
          <div className="card-container space-y-4 lg:col-span-1">
            <h3 className="font-bold text-base text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[var(--brand-primary)]" />
              Catat Transaksi Kas
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex rounded-md p-1 bg-[var(--bg-subtle)] border border-[var(--border)] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipe: 'pengeluaran' })}
                  className={`flex-1 py-1.5 rounded-md transition-colors ${
                    formData.tipe === 'pengeluaran'
                      ? 'bg-[var(--danger)] text-white'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Pengeluaran (−)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipe: 'pemasukan' })}
                  className={`flex-1 py-1.5 rounded-md transition-colors ${
                    formData.tipe === 'pemasukan'
                      ? 'bg-[var(--success)] text-white'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  Pemasukan (+)
                </button>
              </div>

              <DatePickerWIB
                label="Tanggal Transaksi *"
                value={formData.tanggal}
                onChange={(val) => setFormData({ ...formData, tanggal: val })}
              />

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Kategori *
                </label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                >
                  {kategoriList.map((k) => (
                    <option key={k.id} value={k.nama_kategori}>
                      {k.nama_kategori.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Keterangan Transaksi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Pembelian ATK Kantor"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              <CurrencyInput
                label="Nominal Rupiah *"
                value={formData.nominal}
                onChange={(val) => setFormData({ ...formData, nominal: val })}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    PIC Transaksi *
                  </label>
                  <select
                    value={formData.pic_tipe}
                    onChange={(e) => setFormData({ ...formData, pic_tipe: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    <option value="admin">Admin</option>
                    <option value="finance">Finance (Lia)</option>
                  </select>
                </div>

                {formData.pic_tipe === 'admin' && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Nama Admin *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama admin"
                      value={formData.pic_nama}
                      onChange={(e) => setFormData({ ...formData, pic_nama: e.target.value })}
                      className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Upload Foto Nota (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="w-full text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded-md p-1.5 bg-[var(--bg)]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
              >
                Simpan Transaksi Kas
              </button>
            </form>
          </div>

          {/* Recent 10 Transactions List */}
          <div className="card-container space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="font-bold text-base text-[var(--text-primary)]">Transaksi Kas Terbaru</h3>
              <Link href="/kas/cashflow" className="text-xs text-[var(--brand-primary)] hover:underline font-semibold">
                Lihat Semua Cashflow &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {transaksiList.slice(0, 8).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border)]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.tipe === 'pemasukan'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {tx.tipe === 'pemasukan' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-[var(--text-primary)]">{tx.keterangan}</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        {formatDateIndo(tx.tanggal)} | PIC: {tx.pic_nama}
                        {tx.sumber_otomatis && (
                          <span className="ml-2 px-1.5 py-0.2 text-[9px] bg-blue-100 text-blue-800 rounded font-semibold">
                            Otomatis
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`font-bold text-xs ${
                        tx.tipe === 'pemasukan' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {tx.tipe === 'pemasukan' ? '+' : '-'} {formatRupiah(tx.nominal)}
                    </div>
                    <button
                      onClick={() => setDeletingId(tx.id)}
                      className="p-1 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
                      title="Hapus Transaksi Kas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confirm Dialog Hapus Transaksi Kas */}
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
