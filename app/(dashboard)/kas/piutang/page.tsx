'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Siswa, RekeningBank, StaffKasbonSummary, KasTransaksi } from '@/types/database';
import { getSiswaList, recordPelunasanDirect } from '@/lib/actions/siswa';
import {
  addKasTransaksi,
  getStaffKasbonSummary,
  getStaffKasbonHistory,
  recordPelunasanKasbonDirect,
  updateKasTransaksi,
  deleteKasTransaksi,
} from '@/lib/actions/kas';
import { getRekeningList } from '@/lib/actions/rekening';
import { DEFAULT_REKENING_LIST, LABEL_REKENING_DEFAULT, formatKategoriLabel } from '@/lib/constants/finance';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { ExportButton, ExportColumn } from '@/components/shared/ExportButton';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { StatCard } from '@/components/shared/StatCard';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  ArrowLeft,
  CreditCard,
  MessageSquare,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Banknote,
  UserCheck,
  Eye,
  X,
  History,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  User,
  Edit2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

export default function PiutangPage() {
  const [activeTab, setActiveTab] = React.useState<'siswa' | 'kasbon'>('siswa');
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [staffKasbonList, setStaffKasbonList] = React.useState<StaffKasbonSummary[]>([]);
  const [rekeningList, setRekeningList] = React.useState<RekeningBank[]>(DEFAULT_REKENING_LIST);
  const [selectedRekeningId, setSelectedRekeningId] = React.useState<string>(DEFAULT_REKENING_LIST[0].id);
  const [loading, setLoading] = React.useState(true);

  // Modal Pelunasan Siswa State
  const [selectedSiswa, setSelectedSiswa] = React.useState<Siswa | null>(null);
  const [bayarNominal, setBayarNominal] = React.useState<number>(0);
  const [bayarTanggal, setBayarTanggal] = React.useState<string>(getTodayDateString());
  const [bayarMetode, setBayarMetode] = React.useState<'tunai' | 'non_tunai'>('non_tunai');
  const [catatKeKas, setCatatKeKas] = React.useState<boolean>(true);

  // Modal Detail Kasbon Staff State
  const [selectedStaffForDetail, setSelectedStaffForDetail] = React.useState<StaffKasbonSummary | null>(null);
  const [staffHistoryList, setStaffHistoryList] = React.useState<KasTransaksi[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState<boolean>(false);

  // Edit & Delete Single Transaction State in Detail Modal
  const [deletingTx, setDeletingTx] = React.useState<KasTransaksi | null>(null);
  const [editingTx, setEditingTx] = React.useState<KasTransaksi | null>(null);
  const [editForm, setEditForm] = React.useState<Partial<KasTransaksi>>({});
  const [savingEdit, setSavingEdit] = React.useState<boolean>(false);

  // Modal Pelunasan Kasbon Staff State
  const [selectedStaffForPelunasan, setSelectedStaffForPelunasan] = React.useState<StaffKasbonSummary | null>(null);
  const [kasbonBayarNominal, setKasbonBayarNominal] = React.useState<number>(0);
  const [kasbonBayarTanggal, setKasbonBayarTanggal] = React.useState<string>(getTodayDateString());
  const [kasbonBayarMetode, setKasbonBayarMetode] = React.useState<'tunai' | 'non_tunai'>('tunai');
  const [kasbonCatatKeKas, setKasbonCatatKeKas] = React.useState<boolean>(true);
  const [savingKasbonPelunasan, setSavingKasbonPelunasan] = React.useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    const [data, rList, ksbList] = await Promise.all([
      getSiswaList(),
      getRekeningList(),
      getStaffKasbonSummary(),
    ]);
    // Filter only students with outstanding balance (status dp or belum_bayar)
    const piutangData = data.filter(
      (s) => s.status_pembayaran_kode === 'dp' || s.status_pembayaran_kode === 'belum_bayar'
    );
    setSiswaList(piutangData);
    setRekeningList(rList);
    setStaffKasbonList(ksbList);
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

  // Staff Kasbon Handlers
  const handleOpenStaffDetail = async (staff: StaffKasbonSummary) => {
    setSelectedStaffForDetail(staff);
    setLoadingHistory(true);
    const history = await getStaffKasbonHistory(staff.id);
    setStaffHistoryList(history);
    setLoadingHistory(false);
  };

  const handleOpenStaffPelunasan = (staff: StaffKasbonSummary) => {
    setSelectedStaffForPelunasan(staff);
    setKasbonBayarNominal(Math.max(0, staff.sisa_kasbon));
    setKasbonBayarTanggal(getTodayDateString());
    setKasbonBayarMetode('tunai');
    setKasbonCatatKeKas(true);
  };

  const handleSaveStaffPelunasan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForPelunasan || kasbonBayarNominal <= 0) return;

    setSavingKasbonPelunasan(true);
    if (kasbonCatatKeKas) {
      await addKasTransaksi({
        tanggal: kasbonBayarTanggal,
        tipe: 'pemasukan',
        kategori: 'pengembalian_kasbon',
        keterangan: `Pengembalian Kasbon - ${selectedStaffForPelunasan.nama}`,
        nominal: kasbonBayarNominal,
        jenis_pembayaran: kasbonBayarMetode,
        rekening_id: kasbonBayarMetode === 'non_tunai' ? selectedRekeningId : null,
        pic_tipe: 'finance',
        pic_nama: 'Finance Staff',
        staff_id: selectedStaffForPelunasan.id,
        sumber_otomatis: false,
      });
    } else {
      await recordPelunasanKasbonDirect(
        selectedStaffForPelunasan.id,
        kasbonBayarNominal,
        kasbonBayarTanggal,
        `Pelunasan Kasbon Non-Kas (Internal) - ${selectedStaffForPelunasan.nama}`
      );
    }

    setSavingKasbonPelunasan(false);
    setSelectedStaffForPelunasan(null);
    if (selectedStaffForDetail) {
      const updatedHist = await getStaffKasbonHistory(selectedStaffForDetail.id);
      setStaffHistoryList(updatedHist);
      const updatedKsbList = await getStaffKasbonSummary();
      const updatedStaff = updatedKsbList.find((s) => s.id === selectedStaffForDetail.id);
      if (updatedStaff) setSelectedStaffForDetail(updatedStaff);
    }
    loadData();
  };

  // Edit & Delete Handlers for Single Transaction in Detail Modal
  const handleOpenEditTx = (tx: KasTransaksi) => {
    setEditingTx(tx);
    setEditForm({
      tanggal: tx.tanggal,
      tipe: tx.tipe,
      kategori: tx.kategori,
      keterangan: tx.keterangan,
      nominal: tx.nominal,
      potongan_kasbon: tx.potongan_kasbon || 0,
      jenis_pembayaran: tx.jenis_pembayaran || 'tunai',
      rekening_id: tx.rekening_id || '',
      pic_nama: tx.pic_nama,
      pic_tipe: tx.pic_tipe,
      staff_id: tx.staff_id || '',
    });
  };

  const handleSaveEditTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    setSavingEdit(true);
    const res = await updateKasTransaksi(editingTx.id, editForm);
    setSavingEdit(false);

    if (res.success) {
      setEditingTx(null);
      const updatedKsbList = await getStaffKasbonSummary();
      setStaffKasbonList(updatedKsbList);
      if (selectedStaffForDetail) {
        const updatedStaff = updatedKsbList.find((s) => s.id === selectedStaffForDetail.id);
        if (updatedStaff) {
          setSelectedStaffForDetail(updatedStaff);
        }
        const hist = await getStaffKasbonHistory(selectedStaffForDetail.id);
        setStaffHistoryList(hist);
      }
      loadData();
    } else {
      alert('Gagal menyimpan perubahan: ' + res.error);
    }
  };

  const handleDeleteTx = async () => {
    if (!deletingTx) return;

    await deleteKasTransaksi(deletingTx.id);
    setDeletingTx(null);

    const updatedKsbList = await getStaffKasbonSummary();
    setStaffKasbonList(updatedKsbList);
    if (selectedStaffForDetail) {
      const updatedStaff = updatedKsbList.find((s) => s.id === selectedStaffForDetail.id);
      if (updatedStaff) {
        setSelectedStaffForDetail(updatedStaff);
      }
      const hist = await getStaffKasbonHistory(selectedStaffForDetail.id);
      setStaffHistoryList(hist);
    }
    loadData();
  };

  // Metrics
  let totalPiutangSiswa = 0;
  siswaList.forEach((s) => {
    if (s.status_pembayaran_kode === 'dp') {
      totalPiutangSiswa += s.harga_final - (s.dp_nominal || 0);
    } else {
      totalPiutangSiswa += s.harga_final;
    }
  });

  const totalKasbonStaff = staffKasbonList.reduce((sum, s) => sum + (s.sisa_kasbon || 0), 0);
  const totalSeluruhPiutang = totalPiutangSiswa + totalKasbonStaff;
  const staffBerpiutangCount = staffKasbonList.filter((s) => s.sisa_kasbon > 0).length;

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

  const kasbonColumns: ColumnDef<StaffKasbonSummary>[] = [
    {
      accessorKey: 'nama',
      header: 'Nama Karyawan / Instruktur',
      sortingFn: 'text',
      cell: ({ row }) => (
        <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-xs text-blue-700 dark:text-blue-300 font-bold">
            {row.original.nama.charAt(0).toUpperCase()}
          </div>
          <span>{row.original.nama}</span>
        </div>
      ),
    },
    {
      accessorKey: 'total_kasbon',
      header: 'Total Kasbon Diambil',
      sortingFn: 'basic',
      cell: ({ row }) => (
        <span className="font-semibold text-amber-600">
          {formatRupiah(row.original.total_kasbon)}
        </span>
      ),
    },
    {
      accessorKey: 'total_potongan',
      header: 'Potongan Gaji / Terbayar',
      sortingFn: 'basic',
      cell: ({ row }) => (
        <span className="font-semibold text-emerald-600">
          {formatRupiah(row.original.total_potongan)}
        </span>
      ),
    },
    {
      accessorKey: 'sisa_kasbon',
      header: 'Sisa Piutang Kasbon',
      sortingFn: 'basic',
      cell: ({ row }) => {
        const sisa = row.original.sisa_kasbon;
        return (
          <span className={`font-bold text-sm ${sisa > 0 ? 'text-rose-600' : 'text-[var(--text-secondary)]'}`}>
            {formatRupiah(sisa)}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status Kasbon',
      accessorFn: (row) => (row.sisa_kasbon > 0 ? 'Berjalan' : 'Lunas'),
      cell: ({ row }) => {
        const isLunas = row.original.sisa_kasbon <= 0;
        return (
          <span
            className={`px-2.5 py-1 text-xs font-bold rounded-md text-white inline-block ${
              isLunas ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {isLunas ? 'LUNAS' : 'BERJALAN'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => {
        const staff = row.original;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenStaffDetail(staff)}
              className="px-2.5 py-1 bg-[var(--bg-subtle)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-primary)] rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Lihat Rincian Riwayat Kasbon"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Detail</span>
            </button>
            {staff.sisa_kasbon > 0 && (
              <button
                onClick={() => handleOpenStaffPelunasan(staff)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Catat Pelunasan / Pengembalian Kasbon"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pelunasan</span>
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <PinGateDialog>
      <div className="space-y-6">
        <PageHeader
          title="Manajemen Piutang"
          description="Daftar piutang tagihan siswa kursus dan piutang kasbon karyawan / instruktur"
          breadcrumbs={[{ label: 'Kas', href: '/kas' }, { label: 'Manajemen Piutang' }]}
          actions={
            <div className="flex items-center gap-3">
              {activeTab === 'siswa' && (
                <ExportButton
                  data={siswaList}
                  columns={exportColumns}
                  filename="amanahdrive_piutang_siswa"
                  title="Laporan Piutang Siswa Amanah Drive"
                />
              )}
              <Link
                href="/kas"
                className="px-3 py-1.5 border border-[var(--border)] rounded-md text-xs font-medium flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Kas</span>
              </Link>
            </div>
          }
        />

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Seluruh Piutang Beredar"
            value={formatRupiah(totalSeluruhPiutang)}
            description="Akumulasi tagihan siswa & kasbon staf"
            icon={<Wallet className="w-5 h-5 text-amber-600" />}
          />
          <StatCard
            label="Piutang Tagihan Siswa"
            value={formatRupiah(totalPiutangSiswa)}
            description={`${siswaList.length} siswa status DP / Belum Bayar`}
            icon={<Users className="w-5 h-5 text-blue-600" />}
            onClick={() => setActiveTab('siswa')}
            className={`cursor-pointer transition-all ${activeTab === 'siswa' ? 'ring-2 ring-[var(--brand-primary)]' : ''}`}
          />
          <StatCard
            label="Piutang Kasbon Karyawan"
            value={formatRupiah(totalKasbonStaff)}
            description={`${staffBerpiutangCount} karyawan memiliki sisa kasbon`}
            icon={<Banknote className="w-5 h-5 text-rose-600" />}
            onClick={() => setActiveTab('kasbon')}
            className={`cursor-pointer transition-all ${activeTab === 'kasbon' ? 'ring-2 ring-rose-500' : ''}`}
          />
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('siswa')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'siswa'
                ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Piutang Tagihan Siswa ({siswaList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kasbon')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'kasbon'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Piutang Kasbon Karyawan & Instruktur ({staffKasbonList.length})</span>
          </button>
        </div>

        {/* Table */}
        <div className="card-container">
          {loading ? (
            <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
          ) : activeTab === 'siswa' ? (
            <DataTable columns={columns} data={siswaList} searchKey="nama" />
          ) : (
            <DataTable columns={kasbonColumns} data={staffKasbonList} searchKey="nama" />
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

        {/* Modal Detail Riwayat Kasbon Per Staf */}
        {selectedStaffForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="card-container max-w-2xl w-full bg-[var(--bg)] shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      Riwayat Kasbon & Pelunasan
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Karyawan: <strong className="text-[var(--text-primary)]">{selectedStaffForDetail.nama}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStaffForDetail(null)}
                  className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Ringkasan Status Kasbon */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-lg text-xs">
                <div>
                  <span className="text-[var(--text-secondary)] block text-[10px]">Total Kasbon Diambil</span>
                  <span className="font-bold text-amber-600 text-sm">
                    {formatRupiah(selectedStaffForDetail.total_kasbon)}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)] block text-[10px]">Total Terbayar / Potongan</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {formatRupiah(selectedStaffForDetail.total_potongan)}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)] block text-[10px]">Sisa Piutang Berjalan</span>
                  <span className={`font-bold text-sm ${selectedStaffForDetail.sisa_kasbon > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatRupiah(selectedStaffForDetail.sisa_kasbon)}
                  </span>
                </div>
              </div>

              {/* Daftar Mutasi Kasbon */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                  <span>Daftar Mutasi Transaksi ({staffHistoryList.length})</span>
                  {loadingHistory && <span className="text-[10px] text-[var(--text-secondary)]">Memuat riwayat...</span>}
                </h4>

                {loadingHistory ? (
                  <div className="h-32 bg-black/5 dark:bg-white/5 rounded-md animate-pulse flex items-center justify-center text-xs text-[var(--text-secondary)]">
                    Memuat data mutasi kasbon...
                  </div>
                ) : staffHistoryList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--text-secondary)] border border-dashed border-[var(--border)] rounded-lg">
                    Belum ada riwayat mutasi kasbon tercatat untuk staf ini.
                  </div>
                ) : (
                  <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[11px] font-semibold border-b border-[var(--border)]">
                        <tr>
                          <th className="p-2.5">Tanggal</th>
                          <th className="p-2.5">Jenis Mutasi</th>
                          <th className="p-2.5">Uraian / Keterangan</th>
                          <th className="p-2.5 text-right">Nominal</th>
                          <th className="p-2.5 text-right">Metode</th>
                          <th className="p-2.5 text-center w-16">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] font-medium">
                        {staffHistoryList.map((tx) => {
                          const isKasbon = tx.kategori === 'kasbon';
                          const isGaji = tx.kategori === 'gaji';
                          const isPengembalian = tx.kategori === 'pengembalian_kasbon' || tx.tipe === 'pemasukan';

                          return (
                            <tr key={tx.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                              <td className="p-2.5 whitespace-nowrap text-[var(--text-secondary)] text-[11px]">
                                {formatDateIndo(tx.tanggal)}
                              </td>
                              <td className="p-2.5 whitespace-nowrap">
                                {isKasbon && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                    Penarikan Kasbon
                                  </span>
                                )}
                                {isGaji && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                    Potongan Gaji
                                  </span>
                                )}
                                {isPengembalian && !isKasbon && !isGaji && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    Pengembalian Kasbon
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-[var(--text-primary)]">
                                <div>{tx.keterangan}</div>
                                {isGaji && (tx.potongan_kasbon || 0) > 0 && (
                                  <div className="text-[10px] text-emerald-600 font-semibold">
                                    Potongan kasbon: {formatRupiah(tx.potongan_kasbon || 0)} (Gaji dibayar: {formatRupiah(tx.nominal)})
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 text-right whitespace-nowrap font-bold">
                                {isKasbon && (
                                  <span className="text-rose-600">
                                    +{formatRupiah(tx.nominal)}
                                  </span>
                                )}
                                {isGaji && (
                                  <span className="text-emerald-600">
                                    -{formatRupiah(tx.potongan_kasbon || 0)}
                                  </span>
                                )}
                                {isPengembalian && !isKasbon && !isGaji && (
                                  <span className="text-emerald-600">
                                    -{formatRupiah(tx.nominal > 0 ? tx.nominal : (tx.potongan_kasbon || 0))}
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right whitespace-nowrap text-[11px] text-[var(--text-secondary)]">
                                {tx.jenis_pembayaran === 'non_tunai' ? 'Transfer' : 'Tunai'}
                              </td>
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleOpenEditTx(tx)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                                    title="Edit Transaksi Ini"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingTx(tx)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                                    title="Hapus Transaksi Ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setSelectedStaffForDetail(null)}
                  className="px-4 py-2 text-xs font-semibold border border-[var(--border)] rounded-md hover:bg-[var(--bg-subtle)]"
                >
                  Tutup
                </button>

                {selectedStaffForDetail.sisa_kasbon > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const staff = selectedStaffForDetail;
                      handleOpenStaffPelunasan(staff);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center gap-1.5 shadow-sm"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Catat Pelunasan Kasbon</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Edit Transaksi Kasbon / Mutasi */}
        {editingTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                  <span>Edit Transaksi Kasbon</span>
                </h3>
                <button
                  onClick={() => setEditingTx(null)}
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditTx} className="space-y-3.5 text-xs">
                <DatePickerWIB
                  label="Tanggal Transaksi *"
                  value={editForm.tanggal || getTodayDateString()}
                  onChange={(val) => setEditForm((prev) => ({ ...prev, tanggal: val }))}
                />

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Uraian / Keterangan *
                  </label>
                  <input
                    type="text"
                    value={editForm.keterangan || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, keterangan: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs font-medium"
                  />
                </div>

                {editForm.kategori === 'kasbon' && (
                  <div>
                    <CurrencyInput
                      label="Nominal Kasbon (Rp) *"
                      value={editForm.nominal || 0}
                      onChange={(val) => setEditForm((prev) => ({ ...prev, nominal: val }))}
                    />
                  </div>
                )}

                {editForm.kategori === 'gaji' && (
                  <div className="space-y-2.5 p-2.5 rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                    <div>
                      <CurrencyInput
                        label="Nominal Kas Keluar Gaji Dibayar (Rp) *"
                        value={editForm.nominal || 0}
                        onChange={(val) => setEditForm((prev) => ({ ...prev, nominal: val }))}
                      />
                    </div>
                    <div>
                      <CurrencyInput
                        label="Potongan Kasbon pada Gaji Ini (Rp)"
                        value={editForm.potongan_kasbon || 0}
                        onChange={(val) => setEditForm((prev) => ({ ...prev, potongan_kasbon: val }))}
                      />
                    </div>
                  </div>
                )}

                {editForm.kategori === 'pengembalian_kasbon' && (
                  <div>
                    <CurrencyInput
                      label="Nominal Pengembalian / Pelunasan (Rp) *"
                      value={editForm.nominal || editForm.potongan_kasbon || 0}
                      onChange={(val) => setEditForm((prev) => ({ ...prev, nominal: val, potongan_kasbon: val }))}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Metode Pembayaran *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label
                      className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                        editForm.jenis_pembayaran === 'tunai'
                          ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="editJenisPembayaran"
                        value="tunai"
                        checked={editForm.jenis_pembayaran === 'tunai'}
                        onChange={() => setEditForm((prev) => ({ ...prev, jenis_pembayaran: 'tunai' }))}
                        className="sr-only"
                      />
                      <span>Tunai</span>
                    </label>

                    <label
                      className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                        editForm.jenis_pembayaran === 'non_tunai'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="editJenisPembayaran"
                        value="non_tunai"
                        checked={editForm.jenis_pembayaran === 'non_tunai'}
                        onChange={() => setEditForm((prev) => ({ ...prev, jenis_pembayaran: 'non_tunai' }))}
                        className="sr-only"
                      />
                      <span>Transfer Bank</span>
                    </label>
                  </div>

                  {editForm.jenis_pembayaran === 'non_tunai' && (
                    <div className="mt-2 p-2 rounded-md bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-1">
                      <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-300">
                        Rekening Bank
                      </label>
                      <select
                        value={editForm.rekening_id || ''}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, rekening_id: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-xs rounded border border-blue-300 dark:border-blue-800 bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                      >
                        <option value="">{LABEL_REKENING_DEFAULT}</option>
                        {rekeningList
                          .filter((r) => r.aktif)
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nama_bank} - {r.nomor_rekening} (a.n {r.atas_nama})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Nama PIC Transaksi *
                  </label>
                  <input
                    type="text"
                    value={editForm.pic_nama || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, pic_nama: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditingTx(null)}
                    disabled={savingEdit}
                    className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-md hover:bg-[var(--bg-subtle)]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-xs disabled:opacity-50"
                  >
                    {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Pelunasan Kasbon Staf */}
        {selectedStaffForPelunasan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <span>Pelunasan Kasbon Karyawan</span>
                </h3>
                <button
                  onClick={() => setSelectedStaffForPelunasan(null)}
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-md text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Nama Karyawan:</span>
                  <span className="font-bold text-[var(--text-primary)]">{selectedStaffForPelunasan.nama}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)]">Sisa Piutang Kasbon Saat Ini:</span>
                  <span className="font-bold text-rose-600 text-sm">
                    {formatRupiah(selectedStaffForPelunasan.sisa_kasbon)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveStaffPelunasan} className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                      Nominal Pembayaran / Pelunasan (Rp) *
                    </label>
                    {kasbonBayarNominal !== selectedStaffForPelunasan.sisa_kasbon && (
                      <button
                        type="button"
                        onClick={() => setKasbonBayarNominal(selectedStaffForPelunasan.sisa_kasbon)}
                        className="text-[10px] font-bold text-emerald-600 hover:underline"
                      >
                        Lunasi Seluruhnya ({formatRupiah(selectedStaffForPelunasan.sisa_kasbon)})
                      </button>
                    )}
                  </div>
                  <CurrencyInput
                    value={kasbonBayarNominal}
                    onChange={(val) => setKasbonBayarNominal(val)}
                  />
                </div>

                <DatePickerWIB
                  label="Tanggal Pembayaran *"
                  value={kasbonBayarTanggal}
                  onChange={(val) => setKasbonBayarTanggal(val)}
                />

                {/* Checkbox Catat ke Kas */}
                <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-[var(--text-primary)] select-none">
                    <input
                      type="checkbox"
                      checked={kasbonCatatKeKas}
                      onChange={(e) => setKasbonCatatKeKas(e.target.checked)}
                      className="w-4 h-4 rounded border-[var(--border)] text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Catat ke buku kas dan keuangan</span>
                  </label>
                  <p className="text-[10px] text-[var(--text-secondary)] pl-6">
                    {kasbonCatatKeKas
                      ? 'Pembayaran akan dicatat sebagai uang masuk (Pemasukan Kas) di Buku Kas dan mengurangi piutang kasbon staf.'
                      : 'Hanya mengurangi saldo piutang kasbon staf tanpa mempengaruhi saldo buku kas (penyesuaian internal / non-kas).'}
                  </p>
                </div>

                {kasbonCatatKeKas && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Metode Pembayaran *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                          kasbonBayarMetode === 'tunai'
                            ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                            : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="kasbonBayarMetode"
                          value="tunai"
                          checked={kasbonBayarMetode === 'tunai'}
                          onChange={() => setKasbonBayarMetode('tunai')}
                          className="sr-only"
                        />
                        <span>Tunai (Kas Fisik)</span>
                      </label>

                      <label
                        className={`flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                          kasbonBayarMetode === 'non_tunai'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                            : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="kasbonBayarMetode"
                          value="non_tunai"
                          checked={kasbonBayarMetode === 'non_tunai'}
                          onChange={() => setKasbonBayarMetode('non_tunai')}
                          className="sr-only"
                        />
                        <span>Transfer Bank</span>
                      </label>
                    </div>

                    {kasbonBayarMetode === 'non_tunai' && (
                      <div className="mt-2.5 p-2.5 rounded-md bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-1.5 animate-fadeIn">
                        <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                          <Landmark className="w-3.5 h-3.5 text-blue-600" />
                          <span>Pilih Rekening Tujuan / Penerima *</span>
                        </label>
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
                    onClick={() => setSelectedStaffForPelunasan(null)}
                    disabled={savingKasbonPelunasan}
                    className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-md hover:bg-[var(--bg-subtle)]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingKasbonPelunasan}
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-xs disabled:opacity-50"
                  >
                    {savingKasbonPelunasan ? 'Memproses...' : 'Proses Pelunasan Kasbon'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirm Delete Single Kasbon / Mutation Dialog */}
        <ConfirmDialog
          isOpen={!!deletingTx}
          onClose={() => setDeletingTx(null)}
          onConfirm={handleDeleteTx}
          title="Hapus Transaksi Kasbon"
          description={
            deletingTx
              ? `Apakah Anda yakin ingin menghapus transaksi "${deletingTx.keterangan}" (${formatRupiah(
                  deletingTx.nominal > 0 ? deletingTx.nominal : deletingTx.potongan_kasbon || 0
                )})? Data sisa kasbon staf akan otomatis disesuaikan ulang.`
              : ''
          }
          isDanger={true}
          confirmText="Hapus Transaksi"
          cancelText="Batal"
        />
      </div>
    </PinGateDialog>
  );
}
