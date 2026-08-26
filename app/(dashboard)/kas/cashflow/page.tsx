'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { KasTransaksi } from '@/types/database';
import { getKasTransaksiList, getKasKategoriList, deleteKasTransaksi, updateKasTransaksi } from '@/lib/actions/kas';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, getTodayDateString, formatTime24 } from '@/lib/utils/date';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { printStatementPdf, StatementData } from '@/lib/utils/pdf-statement';
import ExcelJS from 'exceljs';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Edit2,
  Banknote,
  CreditCard,
  FileSpreadsheet,
  Printer,
  FileText,
  Calendar,
  Search,
  Filter,
  CheckCircle,
  X,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

const BULAN_LIST = [
  { no: 1, code: '01', short: 'Jan', long: 'Januari' },
  { no: 2, code: '02', short: 'Feb', long: 'Februari' },
  { no: 3, code: '03', short: 'Mar', long: 'Maret' },
  { no: 4, code: '04', short: 'Apr', long: 'April' },
  { no: 5, code: '05', short: 'Mei', long: 'Mei' },
  { no: 6, code: '06', short: 'Jun', long: 'Juni' },
  { no: 7, code: '07', short: 'Jul', long: 'Juli' },
  { no: 8, code: '08', short: 'Agu', long: 'Agustus' },
  { no: 9, code: '09', short: 'Sep', long: 'September' },
  { no: 10, code: '10', short: 'Okt', long: 'Oktober' },
  { no: 11, code: '11', short: 'Nov', long: 'November' },
  { no: 12, code: '12', short: 'Des', long: 'Desember' },
];

export default function CashflowPage() {
  const [transaksiList, setTransaksiList] = React.useState<KasTransaksi[]>([]);
  const [kategoriList, setKategoriList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Active Year & Month State
  const now = new Date();
  const [selectedYear, setSelectedYear] = React.useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState<number>(now.getMonth() + 1); // 1-12

  // Edit modal state
  const [editingTx, setEditingTx] = React.useState<KasTransaksi | null>(null);
  const [editForm, setEditForm] = React.useState<Partial<KasTransaksi>>({});
  const [savingEdit, setSavingEdit] = React.useState(false);

  // Filters
  const [filterTipe, setFilterTipe] = React.useState('semua');
  const [filterKategori, setFilterKategori] = React.useState('semua');
  const [filterJenis, setFilterJenis] = React.useState('semua');
  const [searchQuery, setSearchQuery] = React.useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, kRes] = await Promise.allSettled([getKasTransaksiList(), getKasKategoriList()]);
      if (tRes.status === 'fulfilled' && tRes.value) setTransaksiList(tRes.value);
      if (kRes.status === 'fulfilled' && kRes.value) setKategoriList(kRes.value);
    } catch (err) {
      console.error('Error loading cashflow data:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // 1. Compute Available Years (Only years containing cashflow transactions)
  const availableYears = React.useMemo(() => {
    const yearsSet = new Set<number>();
    transaksiList.forEach((tx) => {
      if (tx.tanggal) {
        const y = parseInt(tx.tanggal.substring(0, 4), 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });

    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear());
    }

    return Array.from(yearsSet).sort((a, b) => b - a); // Descending e.g. [2026, 2025]
  }, [transaksiList]);

  // Ensure selectedYear is valid
  React.useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  // 2. Compute Months with Cashflow for the Selected Year
  const monthStatsForYear = React.useMemo(() => {
    const map = new Map<number, { count: number; totalMasuk: number; totalKeluar: number }>();
    for (let m = 1; m <= 12; m++) {
      map.set(m, { count: 0, totalMasuk: 0, totalKeluar: 0 });
    }

    transaksiList.forEach((tx) => {
      if (!tx.tanggal) return;
      const y = parseInt(tx.tanggal.substring(0, 4), 10);
      const m = parseInt(tx.tanggal.substring(5, 7), 10);
      if (y === selectedYear && map.has(m)) {
        const item = map.get(m)!;
        item.count++;
        if (tx.tipe === 'pemasukan') item.totalMasuk += tx.nominal;
        else item.totalKeluar += tx.nominal;
      }
    });

    return map;
  }, [transaksiList, selectedYear]);

  // Auto-switch to available month if current month has no data in selectedYear
  React.useEffect(() => {
    const currentMonthCount = monthStatsForYear.get(selectedMonth)?.count || 0;
    if (currentMonthCount === 0) {
      // Find latest month with data
      const monthsWithData = Array.from(monthStatsForYear.entries())
        .filter(([_, stat]) => stat.count > 0)
        .map(([m]) => m);

      if (monthsWithData.length > 0) {
        // Pick the largest (latest) month with data or closest
        setSelectedMonth(monthsWithData[monthsWithData.length - 1]);
      }
    }
  }, [monthStatsForYear, selectedYear, selectedMonth]);

  // 3. Compute Saldo Awal (Starting Balance before the 1st of the selected month)
  const monthStartStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const lastDayOfMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const monthEndStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

  const { saldoAwalBulan, saldoAwalTunai, saldoAwalNonTunai } = React.useMemo(() => {
    let awal = 0;
    let awalTunai = 0;
    let awalNonTunai = 0;

    transaksiList.forEach((tx) => {
      if (!tx.tanggal) return;
      if (tx.tanggal < monthStartStr) {
        const signed = tx.tipe === 'pemasukan' ? tx.nominal : -tx.nominal;
        awal += signed;
        if ((tx.jenis_pembayaran || 'tunai') === 'tunai') {
          awalTunai += signed;
        } else {
          awalNonTunai += signed;
        }
      }
    });

    return {
      saldoAwalBulan: awal,
      saldoAwalTunai: awalTunai,
      saldoAwalNonTunai: awalNonTunai,
    };
  }, [transaksiList, monthStartStr]);

  // 4. Filter & Chronological Sorting (Ascending from Tanggal 1)
  const monthRawTransactions = React.useMemo(() => {
    return transaksiList.filter((tx) => {
      if (!tx.tanggal) return false;
      return tx.tanggal >= monthStartStr && tx.tanggal <= monthEndStr;
    });
  }, [transaksiList, monthStartStr, monthEndStr]);

  // Sort strictly ascending: Tanggal 1 -> End of Month, then created_at
  const sortedMonthData = React.useMemo(() => {
    const list = [...monthRawTransactions].sort((a, b) => {
      const cmp = a.tanggal.localeCompare(b.tanggal);
      if (cmp !== 0) return cmp;
      return (a.created_at || '').localeCompare(b.created_at || '');
    });

    // Compute Running Balance for each chronological row
    let running = saldoAwalBulan;
    let runningTunai = saldoAwalTunai;
    let runningNonTunai = saldoAwalNonTunai;

    return list.map((tx, idx) => {
      const signed = tx.tipe === 'pemasukan' ? tx.nominal : -tx.nominal;
      running += signed;
      const isTunai = (tx.jenis_pembayaran || 'tunai') === 'tunai';
      if (isTunai) runningTunai += signed;
      else runningNonTunai += signed;

      return {
        ...tx,
        rowNumber: idx + 1,
        runningBalance: running,
        runningTunai,
        runningNonTunai,
      };
    });
  }, [monthRawTransactions, saldoAwalBulan, saldoAwalTunai, saldoAwalNonTunai]);

  // Table Sorting State
  type CashflowSortField = 'rowNumber' | 'tanggal' | 'keterangan' | 'masuk' | 'keluar' | 'saldo';
  const [sortField, setSortField] = React.useState<CashflowSortField>('rowNumber');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const handleToggleSort = (field: CashflowSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply User UI Filters (Tipe, Kategori, Jenis, Search)
  const filteredData = React.useMemo(() => {
    return sortedMonthData.filter((tx) => {
      if (filterTipe !== 'semua' && tx.tipe !== filterTipe) return false;
      if (filterKategori !== 'semua' && tx.kategori !== filterKategori) return false;
      if (filterJenis !== 'semua' && (tx.jenis_pembayaran || 'tunai') !== filterJenis) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchKeterangan = tx.keterangan.toLowerCase().includes(q);
        const matchPic = tx.pic_nama.toLowerCase().includes(q);
        const matchKategori = tx.kategori.toLowerCase().includes(q);
        const matchNominal = tx.nominal.toString().includes(q);
        if (!matchKeterangan && !matchPic && !matchKategori && !matchNominal) return false;
      }
      return true;
    });
  }, [sortedMonthData, filterTipe, filterKategori, filterJenis, searchQuery]);

  // Apply Table Sorting to produce displayedData
  const displayedData = React.useMemo(() => {
    const list = [...filteredData];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'rowNumber') {
        cmp = a.rowNumber - b.rowNumber;
      } else if (sortField === 'tanggal') {
        const dateA = new Date(a.tanggal).getTime();
        const dateB = new Date(b.tanggal).getTime();
        cmp = dateA !== dateB ? dateA - dateB : a.rowNumber - b.rowNumber;
      } else if (sortField === 'keterangan') {
        cmp = a.keterangan.localeCompare(b.keterangan, 'id');
      } else if (sortField === 'masuk') {
        const nomA = a.tipe === 'pemasukan' ? a.nominal : 0;
        const nomB = b.tipe === 'pemasukan' ? b.nominal : 0;
        cmp = nomA - nomB;
      } else if (sortField === 'keluar') {
        const nomA = a.tipe === 'pengeluaran' ? a.nominal : 0;
        const nomB = b.tipe === 'pengeluaran' ? b.nominal : 0;
        cmp = nomA - nomB;
      } else if (sortField === 'saldo') {
        cmp = a.runningBalance - b.runningBalance;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredData, sortField, sortDirection]);

  // Month Financial Summary
  const totalMasuk = sortedMonthData.filter((t) => t.tipe === 'pemasukan').reduce((s, t) => s + t.nominal, 0);
  const totalKeluar = sortedMonthData.filter((t) => t.tipe === 'pengeluaran').reduce((s, t) => s + t.nominal, 0);
  const saldoAkhirBulan = saldoAwalBulan + totalMasuk - totalKeluar;
  const saldoAkhirTunai = saldoAwalTunai + sortedMonthData.reduce((s, t) => s + ((t.jenis_pembayaran || 'tunai') === 'tunai' ? (t.tipe === 'pemasukan' ? t.nominal : -t.nominal) : 0), 0);
  const saldoAkhirNonTunai = saldoAwalNonTunai + sortedMonthData.reduce((s, t) => s + ((t.jenis_pembayaran || 'tunai') === 'non_tunai' ? (t.tipe === 'pemasukan' ? t.nominal : -t.nominal) : 0), 0);

  // Month info
  const activeMonthName = BULAN_LIST[selectedMonth - 1]?.long || '';

  // Delete Action
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    await deleteKasTransaksi(deletingId);
    setDeletingId(null);
    loadData();
  };

  // Edit Action
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

  // 5. Generate & Print / Download PDF E-Statement
  const handleExportStatementPdf = () => {
    const statementItems = sortedMonthData.map((tx) => ({
      no: tx.rowNumber,
      tanggal: tx.tanggal,
      tipe: tx.tipe,
      jenis_pembayaran: (tx.jenis_pembayaran || 'tunai') as 'tunai' | 'non_tunai',
      kategori: tx.kategori,
      keterangan: tx.keterangan,
      pic_nama: tx.pic_nama,
      pemasukanNominal: tx.tipe === 'pemasukan' ? tx.nominal : 0,
      pengeluaranNominal: tx.tipe === 'pengeluaran' ? tx.nominal : 0,
      saldoBerjalan: tx.runningBalance,
    }));

    const statementData: StatementData = {
      periodeBulan: `${activeMonthName} ${selectedYear}`,
      tanggalAwal: formatDateIndo(monthStartStr),
      tanggalAkhir: formatDateIndo(monthEndStr),
      saldoAwal: saldoAwalBulan,
      saldoAwalTunai,
      saldoAwalNonTunai,
      totalPemasukan: totalMasuk,
      totalPengeluaran: totalKeluar,
      saldoAkhir: saldoAkhirBulan,
      saldoAkhirTunai,
      saldoAkhirNonTunai,
      transaksiList: statementItems,
      generatedAt: `${formatDateIndo(getTodayDateString())} pukul ${formatTime24(new Date())} WIB`,
      picName: 'Finance Admin',
    };

    printStatementPdf(statementData);
  };

  // Export Excel
  const [loadingExcel, setLoadingExcel] = React.useState(false);
  const handleExportExcel = async () => {
    try {
      setLoadingExcel(true);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Mutasi_${activeMonthName}_${selectedYear}`);

      // Title & Header
      worksheet.mergeCells('A1:H1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `MUTASI REKENING KAS UMUM (E-STATEMENT) - AMANAH DRIVE PALEMBANG`;
      titleCell.font = { name: 'Inter', bold: true, size: 14, color: { argb: 'FF0F7A73' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('A2:H2');
      const subCell = worksheet.getCell('A2');
      subCell.value = `Periode: ${formatDateIndo(monthStartStr)} s/d ${formatDateIndo(monthEndStr)} | Saldo Awal: ${formatRupiah(saldoAwalBulan)}`;
      subCell.font = { name: 'Inter', italic: true, size: 10, color: { argb: 'FF475569' } };

      worksheet.addRow([]);

      // Headers
      const headers = ['No', 'Tanggal', 'Uraian Transaksi', 'Kategori', 'Jenis', 'PIC', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo Berjalan (Rp)'];
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { name: 'Inter', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F7A73' },
      };

      worksheet.getColumn(1).width = 6;
      worksheet.getColumn(2).width = 14;
      worksheet.getColumn(3).width = 38;
      worksheet.getColumn(4).width = 18;
      worksheet.getColumn(5).width = 14;
      worksheet.getColumn(6).width = 16;
      worksheet.getColumn(7).width = 18;
      worksheet.getColumn(8).width = 18;
      worksheet.getColumn(9).width = 20;

      // Saldo Awal Row
      const awalRow = worksheet.addRow(['-', formatDateIndo(monthStartStr), `[SALDO AWAL KAS BULAN ${activeMonthName.toUpperCase()}]`, 'SALDO AWAL', '-', 'SYSTEM', 0, 0, saldoAwalBulan]);
      awalRow.font = { name: 'Inter', italic: true, bold: true, size: 10 };

      // Data Rows
      sortedMonthData.forEach((tx) => {
        const isMasuk = tx.tipe === 'pemasukan';
        const row = worksheet.addRow([
          tx.rowNumber,
          formatDateIndo(tx.tanggal),
          tx.keterangan,
          tx.kategori.replace(/_/g, ' ').toUpperCase(),
          tx.jenis_pembayaran === 'tunai' ? 'Tunai' : 'Non-Tunai',
          tx.pic_nama,
          isMasuk ? tx.nominal : 0,
          !isMasuk ? tx.nominal : 0,
          tx.runningBalance,
        ]);
        row.font = { name: 'Inter', size: 10 };

        row.getCell(7).numFmt = '"Rp "#,##0';
        row.getCell(8).numFmt = '"Rp "#,##0';
        row.getCell(9).numFmt = '"Rp "#,##0';
      });

      // Total Row
      const totalRow = worksheet.addRow(['', '', 'TOTAL MUTASI & SALDO AKHIR', '', '', '', totalMasuk, totalKeluar, saldoAkhirBulan]);
      totalRow.font = { name: 'Inter', bold: true, size: 10 };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F6F4' },
      };
      totalRow.getCell(7).numFmt = '"Rp "#,##0';
      totalRow.getCell(8).numFmt = '"Rp "#,##0';
      totalRow.getCell(9).numFmt = '"Rp "#,##0';

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amanahdrive_cashflow_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export XLSX error:', err);
    } finally {
      setLoadingExcel(false);
    }
  };

  // Tanstack Table Columns
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'rowNumber',
      header: 'No',
      sortingFn: 'basic',
      cell: ({ row }) => <span className="tabular-num text-xs text-[var(--text-secondary)]">{row.original.rowNumber}</span>,
    },
    {
      accessorKey: 'tanggal',
      header: 'Tanggal',
      sortingFn: 'datetime',
      cell: ({ row }) => (
        <div className="text-xs font-semibold text-[var(--text-primary)] whitespace-nowrap">
          {formatDateIndo(row.original.tanggal)}
        </div>
      ),
    },
    {
      accessorKey: 'keterangan',
      header: 'Uraian Transaksi',
      sortingFn: 'text',
      cell: ({ row }) => {
        const isTunai = (row.original.jenis_pembayaran || 'tunai') === 'tunai';
        return (
          <div className="space-y-0.5">
            <div className="font-semibold text-xs text-[var(--text-primary)]">{row.original.keterangan}</div>
            <div className="flex flex-wrap items-center gap-1 text-[10px]">
              <span
                className={`px-1.5 py-0.2 rounded font-semibold inline-flex items-center gap-1 ${
                  isTunai
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}
              >
                {isTunai ? <Banknote className="w-2.5 h-2.5" /> : <CreditCard className="w-2.5 h-2.5" />}
                {isTunai ? 'Tunai' : 'Non-Tunai'}
              </span>
              <span className="text-[var(--text-secondary)]">•</span>
              <span className="text-[var(--text-secondary)] capitalize font-medium">
                {row.original.kategori.replace(/_/g, ' ')}
              </span>
              <span className="text-[var(--text-secondary)]">•</span>
              <span className="text-[var(--text-secondary)]">PIC: {row.original.pic_nama}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'pemasukan',
      accessorFn: (row) => (row.tipe === 'pemasukan' ? row.nominal : 0),
      header: () => <div className="text-right">Pemasukan (+)</div>,
      sortingFn: 'basic',
      cell: ({ row }) => {
        const isMasuk = row.original.tipe === 'pemasukan';
        return (
          <div className="text-right tabular-num text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {isMasuk ? `+ ${formatRupiah(row.original.nominal)}` : '-'}
          </div>
        );
      },
    },
    {
      id: 'pengeluaran',
      accessorFn: (row) => (row.tipe === 'pengeluaran' ? row.nominal : 0),
      header: () => <div className="text-right">Pengeluaran (−)</div>,
      sortingFn: 'basic',
      cell: ({ row }) => {
        const isKeluar = row.original.tipe === 'pengeluaran';
        return (
          <div className="text-right tabular-num text-xs font-bold text-rose-600 dark:text-rose-400">
            {isKeluar ? `− ${formatRupiah(row.original.nominal)}` : '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'runningBalance',
      header: () => <div className="text-right">Saldo Kas (Rp)</div>,
      sortingFn: 'basic',
      cell: ({ row }) => (
        <div className="text-right tabular-num text-xs font-bold text-[var(--brand-primary)] bg-[var(--brand-primary-light)]/50 py-1 px-2 rounded">
          {formatRupiah(row.original.runningBalance)}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenEdit(row.original)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded"
            title="Edit Transaksi Kas"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDeletingId(row.original.id)}
            className="p-1.5 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
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
          title="Buku Besar Mutasi Kas (Cashflow)"
          description="Rekapitulasi mutasi kas masuk, keluar, dan saldo berjalan kronologis per bulan"
          breadcrumbs={[{ label: 'Kas', href: '/kas' }, { label: 'Cashflow' }]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {/* Tarik E-Statement PDF */}
              <button
                onClick={handleExportStatementPdf}
                disabled={sortedMonthData.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 active:scale-95"
                title="Tarik E-Statement Rekening Koran (PDF Portrait Resmi)"
              >
                <Printer className="w-4 h-4" />
                <span>Tarik E-Statement PDF</span>
              </button>

              {/* Export Excel */}
              <button
                onClick={handleExportExcel}
                disabled={loadingExcel || sortedMonthData.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
                title="Export Excel Rekening Kas"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{loadingExcel ? 'Exporting...' : 'Excel'}</span>
              </button>

              <Link
                href="/kas"
                className="px-3 py-2 border border-[var(--border)] rounded-xl text-xs font-medium flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </Link>
            </div>
          }
        />

        {/* ── BAR NAVIGASI TAHUN & BULAN (JANUARI - DESEMBER) ── */}
        <div className="card-container p-3 border border-[var(--border)] shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Left: Dropdown Tahun (Hanya tahun yang berisi cashflow) */}
            <div className="flex items-center gap-2 shrink-0">
              <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Tahun:</span>
              </label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                  className="pl-3 pr-8 py-1.5 rounded-lg border border-[var(--brand-primary)] bg-[var(--bg)] text-xs font-bold text-[var(--brand-primary)] cursor-pointer appearance-none shadow-sm focus:outline-none"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Tahun {yr}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--brand-primary)] pointer-events-none" />
              </div>
            </div>

            {/* Right / Center: Horizontal Month Selector (Jan - Des) */}
            <div className="flex-1 overflow-x-auto pb-1 md:pb-0">
              <div className="flex items-center gap-1 min-w-max p-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl">
                {BULAN_LIST.map((b) => {
                  const stat = monthStatsForYear.get(b.no);
                  const hasData = (stat?.count || 0) > 0;
                  const isSelected = selectedMonth === b.no;

                  return (
                    <button
                      key={b.no}
                      type="button"
                      disabled={!hasData}
                      onClick={() => setSelectedMonth(b.no)}
                      className={`relative py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[var(--brand-primary)] text-white shadow-md font-bold'
                          : hasData
                          ? 'text-[var(--text-primary)] hover:bg-[var(--brand-primary-light)] hover:text-[var(--brand-primary)] cursor-pointer'
                          : 'opacity-30 text-[var(--text-secondary)] cursor-not-allowed border-transparent bg-transparent'
                      }`}
                      title={
                        hasData
                          ? `${b.long} ${selectedYear}: ${stat?.count} Transaksi`
                          : `${b.long} ${selectedYear}: Tidak ada data kas`
                      }
                    >
                      <span>{b.short}</span>
                      {hasData && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-white' : 'bg-emerald-500'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── FINANCIAL SUMMARY CARDS (PERIODE BULAN AKTIF) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Saldo Awal */}
          <div className="card-container p-3.5 border border-[var(--border)]">
            <span className="text-[11px] text-[var(--text-secondary)] font-semibold block mb-0.5">
              Saldo Awal (1 {activeMonthName})
            </span>
            <span className="text-base font-bold tabular-num text-[var(--text-primary)]">
              {formatRupiah(saldoAwalBulan)}
            </span>
            <div className="text-[10px] text-[var(--text-secondary)] mt-1 tabular-num">
              Tunai: {formatRupiah(saldoAwalTunai)} | Bank: {formatRupiah(saldoAwalNonTunai)}
            </div>
          </div>

          {/* Total Pemasukan */}
          <div className="card-container p-3.5 border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold block mb-0.5">
              Total Pemasukan (+)
            </span>
            <span className="text-base font-bold tabular-num text-emerald-600 dark:text-emerald-400">
              + {formatRupiah(totalMasuk)}
            </span>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1">
              {sortedMonthData.filter((t) => t.tipe === 'pemasukan').length} Transaksi Masuk
            </div>
          </div>

          {/* Total Pengeluaran */}
          <div className="card-container p-3.5 border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20">
            <span className="text-[11px] text-rose-800 dark:text-rose-300 font-semibold block mb-0.5">
              Total Pengeluaran (−)
            </span>
            <span className="text-base font-bold tabular-num text-rose-600 dark:text-rose-400">
              − {formatRupiah(totalKeluar)}
            </span>
            <div className="text-[10px] text-rose-700 dark:text-rose-400 mt-1">
              {sortedMonthData.filter((t) => t.tipe === 'pengeluaran').length} Transaksi Keluar
            </div>
          </div>

          {/* Saldo Akhir */}
          <div className="card-container p-3.5 border border-[var(--brand-primary)]/50 bg-[var(--brand-primary-light)]/30">
            <span className="text-[11px] text-[var(--brand-primary)] font-bold block mb-0.5">
              Saldo Akhir Bulan
            </span>
            <span className="text-base font-bold tabular-num text-[var(--brand-primary)]">
              {formatRupiah(saldoAkhirBulan)}
            </span>
            <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-medium tabular-num">
              Tunai: {formatRupiah(saldoAkhirTunai)} | Bank: {formatRupiah(saldoAkhirNonTunai)}
            </div>
          </div>
        </div>

        {/* ── TOOLBAR FILTER & SEARCH ── */}
        <div className="card-container p-3 border border-[var(--border)] space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Search Box */}
            <div className="relative md:col-span-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                placeholder="Cari uraian, PIC, nominal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
              />
            </div>

            {/* Filter Tipe */}
            <div>
              <select
                value={filterTipe}
                onChange={(e) => setFilterTipe(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium"
              >
                <option value="semua">Semua Tipe Transaksi</option>
                <option value="pemasukan">Pemasukan (+)</option>
                <option value="pengeluaran">Pengeluaran (−)</option>
              </select>
            </div>

            {/* Filter Jenis */}
            <div>
              <select
                value={filterJenis}
                onChange={(e) => setFilterJenis(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium"
              >
                <option value="semua">Semua Jenis Pembayaran</option>
                <option value="tunai">Tunai</option>
                <option value="non_tunai">Non-Tunai / Transfer</option>
              </select>
            </div>

            {/* Filter Kategori */}
            <div>
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium"
              >
                <option value="semua">Semua Kategori</option>
                {kategoriList.map((k) => (
                  <option key={k.id} value={k.nama_kategori}>
                    {k.nama_kategori.replace(/_/g, ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[11px] text-[var(--text-secondary)]">
            <span className="font-semibold">
              Menampilkan mutasi urut dari tanggal 1 s/d {lastDayOfMonth} {activeMonthName} {selectedYear}
            </span>
            <span className="font-bold text-[var(--text-primary)]">
              {displayedData.length} transaksi ditampilkan
            </span>
          </div>
        </div>

        {/* ── TABLE MUTASI CASHFLOW (KRONOLOGIS TANGGAL 1..N) ── */}
        <div className="card-container p-0 overflow-hidden border border-[var(--border)] shadow-sm">
          {loading ? (
            <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md p-6" />
          ) : displayedData.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-sm text-[var(--text-primary)]">
                Tidak Ada Transaksi di Bulan {activeMonthName} {selectedYear}
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Pilih bulan lain pada bar navigasi di atas atau sesuaikan filter pencarian.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border)] text-[var(--text-secondary)] uppercase text-[10px] tracking-wider font-bold">
                    <th
                      className="py-2.5 px-3 text-center w-12 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      onClick={() => handleToggleSort('rowNumber')}
                      title="Urutkan berdasarkan nomor baris"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className={sortField === 'rowNumber' ? 'text-[var(--brand-primary)]' : ''}>No</span>
                        {sortField === 'rowNumber' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[var(--brand-primary)]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[var(--brand-primary)]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-2.5 px-3 w-32 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      onClick={() => handleToggleSort('tanggal')}
                      title="Urutkan berdasarkan tanggal transaksi"
                    >
                      <div className="flex items-center gap-1">
                        <span className={sortField === 'tanggal' ? 'text-[var(--brand-primary)]' : ''}>Tanggal</span>
                        {sortField === 'tanggal' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[var(--brand-primary)]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[var(--brand-primary)]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-2.5 px-3 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      onClick={() => handleToggleSort('keterangan')}
                      title="Urutkan berdasarkan uraian transaksi"
                    >
                      <div className="flex items-center gap-1">
                        <span className={sortField === 'keterangan' ? 'text-[var(--brand-primary)]' : ''}>Uraian Transaksi</span>
                        {sortField === 'keterangan' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[var(--brand-primary)]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[var(--brand-primary)]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-2.5 px-3 text-right w-36 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      onClick={() => handleToggleSort('masuk')}
                      title="Urutkan nominal pemasukan"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span className={sortField === 'masuk' ? 'text-[var(--brand-primary)]' : ''}>Masuk (+)</span>
                        {sortField === 'masuk' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[var(--brand-primary)]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[var(--brand-primary)]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-2.5 px-3 text-right w-36 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      onClick={() => handleToggleSort('keluar')}
                      title="Urutkan nominal pengeluaran"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span className={sortField === 'keluar' ? 'text-[var(--brand-primary)]' : ''}>Keluar (−)</span>
                        {sortField === 'keluar' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[var(--brand-primary)]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[var(--brand-primary)]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-2.5 px-3 text-right w-40 cursor-pointer select-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      onClick={() => handleToggleSort('saldo')}
                      title="Urutkan saldo kas berjalan"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span className={sortField === 'saldo' ? 'text-[var(--brand-primary)]' : ''}>Saldo Kas</span>
                        {sortField === 'saldo' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[var(--brand-primary)]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[var(--brand-primary)]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />
                        )}
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {/* Saldo Awal Header Row */}
                  <tr className="bg-teal-50/50 dark:bg-teal-950/20 font-semibold text-xs">
                    <td className="py-2 px-3 text-center text-gray-400">-</td>
                    <td className="py-2 px-3 text-[var(--brand-primary)]">01/{String(selectedMonth).padStart(2, '0')}/{selectedYear}</td>
                    <td className="py-2 px-3 text-[var(--brand-primary)] font-bold">
                      [SALDO AWAL KAS SEBELUM 01 {activeMonthName.toUpperCase()} {selectedYear}]
                    </td>
                    <td className="py-2 px-3 text-right text-gray-400 tabular-num">-</td>
                    <td className="py-2 px-3 text-right text-gray-400 tabular-num">-</td>
                    <td className="py-2 px-3 text-right tabular-num font-bold text-[var(--brand-primary)]">
                      {formatRupiah(saldoAwalBulan)}
                    </td>
                    <td className="py-2 px-3 text-center text-gray-400">-</td>
                  </tr>

                  {/* Chronological Transaction Rows */}
                  {displayedData.map((tx) => {
                    const isMasuk = tx.tipe === 'pemasukan';
                    const isTunai = (tx.jenis_pembayaran || 'tunai') === 'tunai';

                    return (
                      <tr key={tx.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                        <td className="py-2.5 px-3 text-center tabular-num text-[var(--text-secondary)]">
                          {tx.rowNumber}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">
                          {formatDateIndo(tx.tanggal)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[var(--text-primary)]">{tx.keterangan}</div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-secondary)] mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded font-semibold inline-flex items-center gap-1 ${
                                isTunai
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {isTunai ? <Banknote className="w-2.5 h-2.5" /> : <CreditCard className="w-2.5 h-2.5" />}
                              {isTunai ? 'Tunai' : 'Non-Tunai'}
                            </span>
                            <span>•</span>
                            <span className="capitalize">{tx.kategori.replace(/_/g, ' ')}</span>
                            <span>•</span>
                            <span>PIC: {tx.pic_nama}</span>
                            {tx.sumber_otomatis && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">[Otomatis]</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-num font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {isMasuk ? `+ ${formatRupiah(tx.nominal)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-num font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {!isMasuk ? `− ${formatRupiah(tx.nominal)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-num font-bold text-[var(--brand-primary)] bg-[var(--brand-primary-light)]/20 whitespace-nowrap">
                          {formatRupiah(tx.runningBalance)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(tx)}
                              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded"
                              title="Edit Transaksi"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(tx.id)}
                              className="p-1 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded"
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Footer Row */}
                  <tr className="bg-[var(--bg-subtle)] font-bold text-xs border-t-2 border-[var(--border)]">
                    <td colSpan={3} className="py-3 px-3 text-right font-bold text-[var(--text-primary)]">
                      TOTAL MUTASI & SALDO AKHIR BULAN:
                    </td>
                    <td className="py-3 px-3 text-right tabular-num text-emerald-600 dark:text-emerald-400">
                      + {formatRupiah(totalMasuk)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-num text-rose-600 dark:text-rose-400">
                      − {formatRupiah(totalKeluar)}
                    </td>
                    <td className="py-3 px-3 text-right tabular-num text-[var(--brand-primary)] bg-[var(--brand-primary-light)]/50 text-sm">
                      {formatRupiah(saldoAkhirBulan)}
                    </td>
                    <td className="py-3 px-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* EDIT MODAL */}
        {editingTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Edit Transaksi Kas</h3>
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div>
                  <DatePickerWIB
                    label="Tanggal Transaksi"
                    value={editForm.tanggal || ''}
                    onChange={(val) => setEditForm((prev) => ({ ...prev, tanggal: val }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Tipe Transaksi</label>
                    <select
                      value={editForm.tipe}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, tipe: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-bold text-xs"
                    >
                      <option value="pemasukan">Pemasukan (+)</option>
                      <option value="pengeluaran">Pengeluaran (−)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Jenis Pembayaran</label>
                    <select
                      value={editForm.jenis_pembayaran || 'tunai'}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, jenis_pembayaran: e.target.value as any }))
                      }
                      className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-bold text-xs"
                    >
                      <option value="tunai">Tunai</option>
                      <option value="non_tunai">Non-Tunai</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Kategori Kas</label>
                  <select
                    value={editForm.kategori}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, kategori: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs"
                  >
                    {kategoriList.map((k) => (
                      <option key={k.id} value={k.nama_kategori}>
                        {k.nama_kategori.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Uraian / Keterangan</label>
                  <input
                    type="text"
                    value={editForm.keterangan || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, keterangan: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs font-medium"
                  />
                </div>

                <div>
                  <CurrencyInput
                    label="Nominal (Rp)"
                    value={editForm.nominal || 0}
                    onChange={(val) => setEditForm((prev) => ({ ...prev, nominal: val }))}
                  />
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] mb-1 font-semibold">Nama PIC Transaksi</label>
                  <input
                    type="text"
                    value={editForm.pic_nama || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, pic_nama: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditingTx(null)}
                    className="px-4 py-2 border border-[var(--border)] rounded-md font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-bold rounded-md shadow-sm disabled:opacity-50"
                  >
                    {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION DIALOG */}
        <ConfirmDialog
          isOpen={Boolean(deletingId)}
          title="Hapus Transaksi Kas"
          description="Apakah Anda yakin ingin menghapus catatan transaksi ini dari buku kas? Tindakan ini tidak dapat dibatalkan."
          confirmText="Hapus Transaksi"
          isDanger={true}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeletingId(null)}
        />
      </div>
    </PinGateDialog>
  );
}
