'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Hutang } from '@/types/database';
import { getHutangList, addHutang, payHutangCicilan } from '@/lib/actions/kas';
import { formatRupiah } from '@/lib/utils/currency';
import { getTodayDateString } from '@/lib/utils/date';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { Plus, CreditCard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function HutangPage() {
  const [hutangList, setHutangList] = React.useState<Hutang[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [payModalHutang, setPayModalHutang] = React.useState<Hutang | null>(null);

  // Form Inputs
  const [newHutang, setNewHutang] = React.useState<Partial<Hutang>>({
    nama_hutang: '',
    jenis: 'cicilan_kendaraan',
    total_hutang: 0,
    tanggal_mulai: getTodayDateString(),
    jatuh_tempo_bulanan: 10,
    cicilan_per_bulan: 0,
  });

  const [bayarTanggal, setBayarTanggal] = React.useState(getTodayDateString());
  const [bayarNominal, setBayarNominal] = React.useState(0);

  const loadData = () => {
    setLoading(true);
    getHutangList().then((res) => {
      setHutangList(res);
      setLoading(false);
    });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHutang.nama_hutang || !newHutang.total_hutang) return;
    await addHutang(newHutang);
    setIsAddModalOpen(false);
    loadData();
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalHutang || bayarNominal <= 0) return;
    await payHutangCicilan(payModalHutang.id, bayarTanggal, bayarNominal);
    setPayModalHutang(null);
    loadData();
  };

  const columns: ColumnDef<Hutang>[] = [
    { accessorKey: 'nama_hutang', header: 'Nama Hutang / Cicilan' },
    {
      accessorKey: 'jenis',
      header: 'Jenis',
      cell: ({ row }) => (row.original.jenis === 'cicilan_kendaraan' ? 'Cicilan Kendaraan' : 'Pinjaman'),
    },
    {
      accessorKey: 'total_hutang',
      header: 'Total Hutang',
      cell: ({ row }) => formatRupiah(row.original.total_hutang),
    },
    {
      accessorKey: 'sisa_hutang',
      header: 'Sisa Hutang',
      cell: ({ row }) => (
        <span className="font-bold text-rose-700">{formatRupiah(row.original.sisa_hutang)}</span>
      ),
    },
    {
      accessorKey: 'jatuh_tempo_bulanan',
      header: 'Jatuh Tempo',
      cell: ({ row }) => `Tgl ${row.original.jatuh_tempo_bulanan || '-'} tiap bulan`,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`px-2 py-0.5 text-xs rounded font-bold uppercase ${
            row.original.status === 'lunas'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <button
          onClick={() => {
            setPayModalHutang(row.original);
            setBayarNominal(row.original.cicilan_per_bulan || 0);
          }}
          disabled={row.original.status === 'lunas'}
          className="flex items-center gap-1 px-2.5 py-1 bg-[var(--brand-primary)] text-white text-xs font-semibold rounded hover:bg-[var(--brand-primary-dark)] disabled:opacity-40"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Bayar Cicilan</span>
        </button>
      ),
    },
  ];

  return (
    <PinGateDialog>
      <div className="space-y-6">
        <PageHeader
          title="Manajemen Hutang & Cicilan"
          description="Pencatatan pinjaman modal & cicilan armada kendaraan Amanah Drive"
          breadcrumbs={[{ label: 'Kas', href: '/kas' }, { label: 'Hutang' }]}
          actions={
            <div className="flex items-center gap-3">
              <Link
                href="/kas/piutang"
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5"
              >
                <span>Manajemen Piutang Siswa</span>
              </Link>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-[var(--brand-primary)] text-white text-xs font-semibold rounded-md"
              >
                <Plus className="w-4 h-4" />
                <span>+ Catat Hutang Baru</span>
              </button>
              <Link
                href="/kas"
                className="px-3 py-2 border border-[var(--border)] rounded-md text-xs font-medium flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </Link>
            </div>
          }
        />

        <div className="card-container">
          {loading ? (
            <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
          ) : (
            <DataTable columns={columns} data={hutangList} searchKey="hutang" />
          )}
        </div>

        {/* Modal Tambah Hutang */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-lg space-y-4">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Tambah Catatan Hutang Baru</h3>
              <form onSubmit={handleAddSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Nama Hutang / Pinjaman *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Cicilan Mobil Calya"
                    value={newHutang.nama_hutang || ''}
                    onChange={(e) => setNewHutang({ ...newHutang, nama_hutang: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Jenis
                    </label>
                    <select
                      value={newHutang.jenis}
                      onChange={(e) => setNewHutang({ ...newHutang, jenis: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                    >
                      <option value="cicilan_kendaraan">Cicilan Kendaraan</option>
                      <option value="pinjaman_perusahaan">Pinjaman Modal</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Tanggal Jatuh Tempo Bulanan
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={newHutang.jatuh_tempo_bulanan || 10}
                      onChange={(e) =>
                        setNewHutang({
                          ...newHutang,
                          jatuh_tempo_bulanan: parseInt(e.target.value) || 10,
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                    />
                  </div>
                </div>

                <CurrencyInput
                  label="Total Nominal Hutang *"
                  value={newHutang.total_hutang}
                  onChange={(val) => setNewHutang({ ...newHutang, total_hutang: val })}
                />

                <CurrencyInput
                  label="Estimasi Cicilan per Bulan"
                  value={newHutang.cicilan_per_bulan}
                  onChange={(val) => setNewHutang({ ...newHutang, cicilan_per_bulan: val })}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-md"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-[var(--brand-primary)] text-white rounded-md"
                  >
                    Simpan Hutang
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Bayar Cicilan */}
        {payModalHutang && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card-container max-w-sm w-full bg-[var(--bg)] shadow-lg space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Bayar Cicilan — {payModalHutang.nama_hutang}
              </h3>
              <form onSubmit={handlePaySubmit} className="space-y-3">
                <DatePickerWIB label="Tanggal Bayar *" value={bayarTanggal} onChange={setBayarTanggal} />

                <CurrencyInput
                  label="Nominal Pembayaran Cicilan *"
                  value={bayarNominal}
                  onChange={setBayarNominal}
                />

                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-md text-xs">
                  Sisa Hutang Saat Ini: <span className="font-bold">{formatRupiah(payModalHutang.sisa_hutang)}</span>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setPayModalHutang(null)}
                    className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-md"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-[var(--brand-primary)] text-white rounded-md"
                  >
                    Proses Pembayaran & Potong Kas
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
