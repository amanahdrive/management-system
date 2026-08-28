'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Siswa, RekeningBank } from '@/types/database';
import { getSiswaList, recordPelunasanDirect } from '@/lib/actions/siswa';
import { addKasTransaksi } from '@/lib/actions/kas';
import { getRekeningList } from '@/lib/actions/rekening';
import { DEFAULT_REKENING_LIST, LABEL_REKENING_DEFAULT } from '@/lib/constants/finance';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { ExportButton, ExportColumn } from '@/components/shared/ExportButton';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { StatCard } from '@/components/shared/StatCard';
import { ArrowLeft, CreditCard, MessageSquare, Users, Wallet, ArrowUpRight, Landmark } from 'lucide-react';
import Link from 'next/link';

export default function PiutangPage() {
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [rekeningList, setRekeningList] = React.useState<RekeningBank[]>(DEFAULT_REKENING_LIST);
  const [selectedRekeningId, setSelectedRekeningId] = React.useState<string>(DEFAULT_REKENING_LIST[0].id);
  const [loading, setLoading] = React.useState(true);

  // Modal Pelunasan State
  const [selectedSiswa, setSelectedSiswa] = React.useState<Siswa | null>(null);
  const [bayarNominal, setBayarNominal] = React.useState<number>(0);
  const [bayarTanggal, setBayarTanggal] = React.useState<string>(getTodayDateString());
  const [bayarMetode, setBayarMetode] = React.useState<'tunai' | 'non_tunai'>('non_tunai');
  const [catatKeKas, setCatatKeKas] = React.useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    const [data, rList] = await Promise.all([getSiswaList(), getRekeningList()]);
    // Filter only students with outstanding balance (status dp or belum_bayar)
    const piutangData = data.filter(
      (s) => s.status_pembayaran_kode === 'dp' || s.status_pembayaran_kode === 'belum_bayar'
    );
    setSiswaList(piutangData);
    setRekeningList(rList);
    const defRek = rList.find((r) => r.aktif && r.is_utama) || rList.find((r) => r.aktif);
    if (defRek) setSelectedRekeningId(defRek.id);
    setLoading(false);
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleOpenPelunasan = (siswa: Siswa) => {
    setSelectedSiswa(siswa);
    const sisaTagihan = siswa.status_pembayaran_kode === 'dp'
      ? siswa.harga_final - (siswa.dp_nominal || 0)
      : siswa.harga_final;
    setBayarNominal(Math.max(0, sisaTagihan));
    setBayarTanggal(getTodayDateString());
    setBayarMetode('non_tunai');
    setCatatKeKas(true);
  };

  const handleSavePelunasan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa || bayarNominal <= 0) return;

    if (catatKeKas) {
      let baseKeterangan =
        selectedSiswa.status_pembayaran_kode === 'dp'
          ? `Pelunasan Kursus - ${selectedSiswa.nama} (${selectedSiswa.kode_siswa})`
          : `Pembayaran DP Kursus - ${selectedSiswa.nama} (${selectedSiswa.kode_siswa})`;



      await addKasTransaksi({
        tanggal: bayarTanggal,
        tipe: 'pemasukan',
        kategori: selectedSiswa.status_pembayaran_kode === 'dp' ? 'pelunasan_siswa' : 'dp_siswa',
        keterangan: baseKeterangan,
        nominal: bayarNominal,
        jenis_pembayaran: bayarMetode,
        rekening_id: bayarMetode === 'non_tunai' ? selectedRekeningId : null,
        pic_tipe: 'admin',
        pic_nama: 'Admin Staff',
        siswa_id: selectedSiswa.id,
        sumber_otomatis: false,
      });
    } else {
      await recordPelunasanDirect(selectedSiswa.id, bayarNominal, bayarTanggal);
    }

    setSelectedSiswa(null);
    loadData();
  };

  // Metrics
  let totalPiutang = 0;
  siswaList.forEach((s) => {
    if (s.status_pembayaran_kode === 'dp') {
      totalPiutang += s.harga_final - (s.dp_nominal || 0);
    } else {
      totalPiutang += s.harga_final;
    }
  });

  const exportColumns: ExportColumn[] = [
    { header: 'Kode Siswa', key: 'kode_siswa', width: 15 },
    { header: 'Nama Siswa', key: 'nama', width: 25 },
    { header: 'No. WhatsApp', key: 'no_whatsapp', width: 18 },
    { header: 'Total Harga', key: 'harga_final', width: 18, isCurrency: true },
    { header: 'Status Pembayaran', key: 'status_pembayaran_kode', width: 18 },
  ];

  const columns: ColumnDef<Siswa>[] = [
    {
      accessorKey: 'kode_siswa',
      header: 'Kode',
      sortingFn: 'alphanumeric',
      cell: ({ row }) => (
        <span className="tabular-num font-bold text-[var(--brand-primary)]">
          {row.original.kode_siswa}
        </span>
      ),
    },
    {
      accessorKey: 'nama',
      header: 'Nama Siswa',
      sortingFn: 'text',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-[var(--text-primary)]">{row.original.nama}</div>
          <div className="text-xs text-[var(--text-secondary)]">{row.original.no_whatsapp}</div>
        </div>
      ),
    },
    {
      id: 'paket',
      header: 'Paket Kursus',
      accessorFn: (row) => row.paket?.nama_paket || 'Khusus',
      sortingFn: 'text',
      cell: ({ row }) => row.original.paket?.nama_paket || 'Khusus',
    },
    {
      accessorKey: 'status_pembayaran_kode',
      header: 'Status Bayar',
      sortingFn: 'text',
      cell: ({ row }) => {
        const isDp = row.original.status_pembayaran_kode === 'dp';
        return (
          <span
            className={`px-2.5 py-1 text-xs font-bold rounded-md text-white inline-block ${
              isDp ? 'bg-amber-600' : 'bg-rose-600'
            }`}
          >
            {isDp ? 'DP (Uang Muka)' : 'Belum Bayar'}
          </span>
        );
      },
    },
    {
      accessorKey: 'harga_final',
      header: 'Total Biaya',
      sortingFn: 'basic',
      cell: ({ row }) => formatRupiah(row.original.harga_final),
    },
    {
      id: 'dp_nominal',
      header: 'Sudah Dibayar',
      accessorFn: (row) => row.dp_nominal || 0,
      sortingFn: 'basic',
      cell: ({ row }) =>
        row.original.dp_nominal ? formatRupiah(row.original.dp_nominal) : formatRupiah(0),
    },
    {
      id: 'sisa_piutang',
      header: 'Sisa Piutang',
      accessorFn: (row) => {
        return row.status_pembayaran_kode === 'dp'
          ? row.harga_final - (row.dp_nominal || 0)
          : row.harga_final;
      },
      sortingFn: 'basic',
      cell: ({ row }) => {
        const sisa = row.original.status_pembayaran_kode === 'dp'
          ? row.original.harga_final - (row.original.dp_nominal || 0)
          : row.original.harga_final;
        return <span className="font-bold text-xs text-rose-700">{formatRupiah(sisa)}</span>;
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => {
        const sisa = row.original.status_pembayaran_kode === 'dp'
          ? row.original.harga_final - (row.original.dp_nominal || 0)
          : row.original.harga_final;

        const waMessage = encodeURIComponent(
          `Halo Kak ${row.original.nama}, kami dari Amanah Drive mengkonfirmasi sisa tagihan kursus sebesar ${formatRupiah(sisa)}. Mohon info tanggal pelunasannya ya Kak. Terima kasih!`
        );

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenPelunasan(row.original)}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1"
              title="Catat Pelunasan"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pelunasan</span>
            </button>
            <a
              href={`https://wa.me/${row.original.no_whatsapp?.replace(/^0/, '62')}?text=${waMessage}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded"
              title="Kirim Pesan WA Penagihan"
            >
              <MessageSquare className="w-4 h-4" />
            </a>
          </div>
        );
      },
    },
  ];

  return (
    <PinGateDialog>
      <div className="space-y-6">
        <PageHeader
          title="Manajemen Piutang Siswa"
          description="Daftar rincian tagihan kursus siswa yang belum lunas dan penagihan via WA"
          breadcrumbs={[{ label: 'Kas', href: '/kas' }, { label: 'Piutang Siswa' }]}
          actions={
            <div className="flex items-center gap-3">
              <ExportButton
                data={siswaList}
                columns={exportColumns}
                filename="amanahdrive_piutang_siswa"
                title="Laporan Piutang Siswa Amanah Drive"
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

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            label="Total Piutang Siswa Aktif"
            value={formatRupiah(totalPiutang)}
            description="Total sisa tagihan kursus belum lunas"
            icon={<ArrowUpRight className="w-5 h-5 text-amber-600" />}
          />
          <StatCard
            label="Jumlah Siswa Berpiutang"
            value={`${siswaList.length} Siswa`}
            description="Siswa status DP atau Belum Bayar"
            icon={<Users className="w-5 h-5 text-blue-600" />}
          />
        </div>

        {/* Table */}
        <div className="card-container">
          {loading ? (
            <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
          ) : (
            <DataTable columns={columns} data={siswaList} searchKey="nama" />
          )}
        </div>

        {/* Modal Pelunasan */}
        {selectedSiswa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-lg space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Catat Pelunasan Siswa
              </h3>

              <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-md text-xs space-y-1">
                <p className="font-bold text-[var(--brand-primary)]">
                  {selectedSiswa.nama} ({selectedSiswa.kode_siswa})
                </p>
                <p className="text-[var(--text-secondary)]">
                  Total Tagihan Final: <span className="font-bold text-[var(--text-primary)]">{formatRupiah(selectedSiswa.harga_final)}</span>
                </p>
              </div>

              <form onSubmit={handleSavePelunasan} className="space-y-4 text-xs">
                <CurrencyInput
                  label="Nominal Pelunasan (Rupiah) *"
                  value={bayarNominal}
                  onChange={(val) => setBayarNominal(val)}
                />

                <DatePickerWIB
                  label="Tanggal Pelunasan *"
                  value={bayarTanggal}
                  onChange={(val) => setBayarTanggal(val)}
                />

                {/* Opsi Catat ke Buku Kas */}
                <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-[var(--text-primary)] select-none">
                    <input
                      type="checkbox"
                      checked={catatKeKas}
                      onChange={(e) => setCatatKeKas(e.target.checked)}
                      className="w-4 h-4 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] cursor-pointer"
                    />
                    <span>Catat ke buku kas dan keuangan</span>
                  </label>
                  <p className="text-[10px] text-[var(--text-secondary)] pl-6">
                    {catatKeKas
                      ? 'Pembayaran akan dicatat sebagai mutasi kas masuk dan memperbarui status piutang siswa.'
                      : 'Hanya memperbarui status piutang siswa tanpa menambah catatan transaksi pada buku kas.'}
                  </p>
                </div>

                {catatKeKas && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Metode Pembayaran *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                          bayarMetode === 'non_tunai'
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)]'
                            : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bayarMetode"
                          value="non_tunai"
                          checked={bayarMetode === 'non_tunai'}
                          onChange={() => setBayarMetode('non_tunai')}
                          className="sr-only"
                        />
                        <span>Transfer Bank</span>
                      </label>

                      <label
                        className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                          bayarMetode === 'tunai'
                            ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                            : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bayarMetode"
                          value="tunai"
                          checked={bayarMetode === 'tunai'}
                          onChange={() => setBayarMetode('tunai')}
                          className="sr-only"
                        />
                        <span>Tunai (Kas Fisik)</span>
                      </label>
                    </div>

                    {/* Dropdown Rekening Bank Perusahaan (Jika Non-Tunai) */}
                    {bayarMetode === 'non_tunai' && (
                      <div className="mt-2.5 p-2.5 rounded-md bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-1.5 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                            <Landmark className="w-3.5 h-3.5 text-blue-600" />
                            <span>Pilih Rekening Tujuan / Penerima *</span>
                          </label>
                          <Link
                            href="/settings"
                            target="_blank"
                            className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold underline"
                          >
                            Kelola Rekening
                          </Link>
                        </div>

                        <select
                          value={selectedRekeningId}
                          onChange={(e) => setSelectedRekeningId(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded border border-blue-300 dark:border-blue-800 bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                        >
                          <option value="">{LABEL_REKENING_DEFAULT}</option>
                          {rekeningList
                            .filter((r) => r.aktif)
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.nama_bank} - {r.nomor_rekening} (a.n {r.atas_nama}) {r.is_utama ? '(Utama)' : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setSelectedSiswa(null)}
                    className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-md"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md"
                  >
                    Proses Pelunasan
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
