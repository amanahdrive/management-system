'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Siswa, Paket, Promosi, StatusPembayaranMaster } from '@/types/database';
import { deleteSiswa, getSiswaList, createOrUpdateSiswa } from '@/lib/actions/siswa';
import { getPaketList, getPromosiList, getStatusPembayaranMaster } from '@/lib/actions/master-data';
import { getJadwalBySiswa } from '@/lib/actions/jadwal';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import { ExportButton, ExportColumn } from '@/components/shared/ExportButton';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { Plus, Eye, Edit2, Trash2, Archive, Search, X, Calendar, Info } from 'lucide-react';
import Link from 'next/link';

export default function SiswaPage() {
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [promosiList, setPromosiList] = React.useState<Promosi[]>([]);
  const [statusList, setStatusList] = React.useState<StatusPembayaranMaster[]>([]);
  // Track session completion per siswa: key=siswa_id, value={ selesai, total, hasPending }
  const [siswaSessionMap, setSiswaSessionMap] = React.useState<Record<string, { selesai: number; total: number; hasPending: boolean }>>({});
  const [loading, setLoading] = React.useState(true);

  // Archive & Delete States
  const [showArchived, setShowArchived] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Filter States
  const [filterStatus, setFilterStatus] = React.useState('semua');
  const [filterPaket, setFilterPaket] = React.useState('semua');
  const [filterSumber, setFilterSumber] = React.useState('semua');
  const [filterNama, setFilterNama] = React.useState('');
  const [filterDateFrom, setFilterDateFrom] = React.useState('');
  const [filterDateTo, setFilterDateTo] = React.useState('');
  const [filterDateField, setFilterDateField] = React.useState<'tanggal_booking' | 'tanggal_rencana_mulai'>('tanggal_booking');

  // Modal State Tambah / Edit Data Diri
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<Partial<Siswa>>({
    nama: '',
    no_whatsapp: '',
    alamat: '',
    tanggal_booking: new Date().toISOString().slice(0, 10),
    tanggal_rencana_mulai: new Date().toISOString().slice(0, 10),
    paket_id: '',
    promosi_id: null,
    harga_final: 0,
    sumber: 'meta_ads',
    catatan: '',
  });

  const loadData = async () => {
    setLoading(true);
    const [sData, pData, prData, stData] = await Promise.all([
      getSiswaList(),
      getPaketList(),
      getPromosiList(),
      getStatusPembayaranMaster(),
    ]);
    setSiswaList(sData);
    setPaketList(pData);
    setPromosiList(prData);
    setStatusList(stData);

    // Load session summary for all lunas students (for correct archive logic)
    const lunasStudents = sData.filter((s) => s.status_pembayaran_kode === 'lunas');
    if (lunasStudents.length > 0) {
      const sessionResults = await Promise.all(
        lunasStudents.map(async (s) => {
          const sessions = await getJadwalBySiswa(s.id);
          const activeSessions = sessions.filter((j) => j.status_sesi !== 'batal');
          const selesai = activeSessions.filter((j) => j.status_sesi === 'selesai').length;
          const total = activeSessions.length > 0 ? activeSessions[0].total_sesi_paket : s.paket?.jumlah_sesi || 0;
          const hasPending = activeSessions.some((j) => j.status_sesi === 'terjadwal');
          return { id: s.id, selesai, total, hasPending };
        })
      );
      const map: Record<string, { selesai: number; total: number; hasPending: boolean }> = {};
      sessionResults.forEach((r) => { map[r.id] = r; });
      setSiswaSessionMap(map);
    }

    if (pData.length > 0 && !formData.paket_id) {
      const defaultPaket = pData[0];
      setFormData((prev) => ({
        ...prev,
        paket_id: defaultPaket.id,
        harga_final: defaultPaket.harga_promo || defaultPaket.harga_normal,
      }));
    }

    setLoading(false);
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    const defaultPaket = paketList[0];
    setFormData({
      nama: '',
      no_whatsapp: '',
      alamat: '',
      tanggal_booking: getTodayDateString(),
      tanggal_rencana_mulai: getTodayDateString(),
      paket_id: defaultPaket?.id || '',
      promosi_id: null,
      harga_final: defaultPaket ? defaultPaket.harga_promo || defaultPaket.harga_normal : 0,
      sumber: 'meta_ads',
      catatan: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditDataDiri = (siswa: Siswa) => {
    setFormData({
      id: siswa.id,
      kode_siswa: siswa.kode_siswa,
      nama: siswa.nama,
      no_whatsapp: siswa.no_whatsapp,
      alamat: siswa.alamat,
      tanggal_booking: siswa.tanggal_booking,
      tanggal_rencana_mulai: siswa.tanggal_rencana_mulai,
      paket_id: siswa.paket_id,
      promosi_id: siswa.promosi_id,
      harga_final: siswa.harga_final,
      sumber: siswa.sumber,
      sumber_kustom_text: siswa.sumber_kustom_text,
      catatan: siswa.catatan,
    });
    setIsModalOpen(true);
  };

  const calculatePrice = (paketId: string, promoId: string | null): number => {
    const selectedPaket = paketList.find((p) => p.id === paketId);
    if (!selectedPaket) return 0;

    let basePrice = selectedPaket.harga_promo || selectedPaket.harga_normal;
    if (promoId) {
      const promo = promosiList.find((pr) => pr.id === promoId);
      if (promo) {
        if (promo.tipe_potongan === 'persen') {
          basePrice = Math.round(basePrice * (1 - promo.nilai_potongan / 100));
        } else {
          basePrice = Math.max(0, basePrice - promo.nilai_potongan);
        }
      }
    }
    return basePrice;
  };

  const handlePaketChange = (paketId: string) => {
    const newPrice = calculatePrice(paketId, formData.promosi_id || null);
    setFormData((prev) => ({
      ...prev,
      paket_id: paketId,
      harga_final: newPrice,
    }));
  };

  const handlePromoChange = (promoId: string | null) => {
    const newPrice = calculatePrice(formData.paket_id || '', promoId);
    setFormData((prev) => ({
      ...prev,
      promosi_id: promoId,
      harga_final: newPrice,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.paket_id) {
      alert('Nama Siswa dan Paket Kursus wajib diisi!');
      return;
    }

    const payload = {
      ...formData,
      harga_manual_override: formData.harga_manual_override ?? false,
    };

    const res = await createOrUpdateSiswa(payload);
    if (res.success) {
      setIsModalOpen(false);
      loadData();
    } else {
      alert('Gagal mendaftarkan siswa: ' + res.error);
    }
  };

  const filteredData = React.useMemo(() => {
    return siswaList.filter((s) => {
      const isLunas = s.status_pembayaran_kode === 'lunas';
      const sessionInfo = siswaSessionMap[s.id];
      const isFullyDone = isLunas && sessionInfo
        ? (sessionInfo.selesai >= sessionInfo.total && !sessionInfo.hasPending && sessionInfo.total > 0)
        : false;
      const isArchivedStudent = isLunas && isFullyDone;

      if (!showArchived && isArchivedStudent) return false;
      if (showArchived && !isArchivedStudent) return false;
      if (filterStatus !== 'semua' && s.status_pembayaran_kode !== filterStatus) return false;
      if (filterPaket !== 'semua' && s.paket_id !== filterPaket) return false;
      if (filterSumber !== 'semua' && s.sumber !== filterSumber) return false;

      // Name/code search
      if (filterNama.trim()) {
        const q = filterNama.trim().toLowerCase();
        const matchNama = s.nama.toLowerCase().includes(q);
        const matchKode = (s.kode_siswa || '').toLowerCase().includes(q);
        const matchWA = (s.no_whatsapp || '').includes(q);
        if (!matchNama && !matchKode && !matchWA) return false;
      }

      // Date range filter
      if (filterDateFrom || filterDateTo) {
        const dateVal = filterDateField === 'tanggal_booking'
          ? s.tanggal_booking
          : s.tanggal_rencana_mulai;
        if (filterDateFrom && dateVal < filterDateFrom) return false;
        if (filterDateTo && dateVal > filterDateTo) return false;
      }

      return true;
    });
  }, [siswaList, siswaSessionMap, showArchived, filterStatus, filterPaket, filterSumber, filterNama, filterDateFrom, filterDateTo, filterDateField]);

  const exportColumns: ExportColumn[] = [
    { header: 'Kode Siswa', key: 'kode_siswa', width: 15 },
    { header: 'Nama Siswa', key: 'nama', width: 25 },
    { header: 'No. WhatsApp', key: 'no_whatsapp', width: 18 },
    { header: 'Tgl Booking', key: 'tanggal_booking', width: 15 },
    { header: 'Harga Final', key: 'harga_final', width: 18, isCurrency: true },
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
      accessorKey: 'tanggal_booking',
      header: 'Tgl Booking',
      sortingFn: 'datetime',
      cell: ({ row }) => (
        <div className="text-xs">
          <div className="font-medium text-[var(--text-primary)]">{formatDateIndo(row.original.tanggal_booking)}</div>
          <div className="text-[var(--text-muted)] mt-0.5">Booking</div>
        </div>
      ),
    },
    {
      accessorKey: 'tanggal_rencana_mulai',
      header: 'Rencana Mulai',
      sortingFn: (rowA, rowB, columnId) => {
        const valA = rowA.getValue(columnId) ? new Date(rowA.getValue(columnId) as string).getTime() : 0;
        const valB = rowB.getValue(columnId) ? new Date(rowB.getValue(columnId) as string).getTime() : 0;
        return valA - valB;
      },
      cell: ({ row }) => (
        <div className="text-xs">
          <div className="font-semibold text-[var(--brand-primary)]">
            {row.original.tanggal_rencana_mulai ? formatDateIndo(row.original.tanggal_rencana_mulai) : <span className="text-[var(--text-muted)] italic">Belum diset</span>}
          </div>
          <div className="text-[var(--text-muted)] mt-0.5">Rencana mulai</div>
        </div>
      ),
    },
    {
      accessorKey: 'harga_final',
      header: 'Harga Final',
      sortingFn: 'basic',
      cell: ({ row }) => formatRupiah(row.original.harga_final),
    },
    {
      id: 'status_pembayaran',
      header: 'Status Bayar',
      accessorFn: (row) => row.status_pembayaran?.label || row.status_pembayaran_kode || '',
      sortingFn: 'text',
      cell: ({ row }) => {
        const s = row.original.status_pembayaran;
        const kode = row.original.status_pembayaran_kode;
        const hargaFinal = Number(row.original.harga_final) || 0;
        const dpNominal = Number(row.original.dp_nominal) || 0;

        if (kode === 'dp') {
          const pct = hargaFinal > 0 ? Math.round((dpNominal / hargaFinal) * 100) : 0;
          const sisa = Math.max(0, hargaFinal - dpNominal);
          return (
            <div className="space-y-0.5">
              <span
                className="px-2.5 py-0.5 text-xs text-white font-bold rounded-md inline-block shadow-xs"
                style={{ backgroundColor: s?.warna_badge || '#B9821B' }}
              >
                DP {pct}% ({formatRupiah(dpNominal)})
              </span>
              <div className="text-[10.5px] text-[var(--danger)] font-semibold">
                Sisa Piutang: {formatRupiah(sisa)}
              </div>
            </div>
          );
        }

        if (kode === 'belum_bayar') {
          return (
            <div className="space-y-0.5">
              <span
                className="px-2.5 py-0.5 text-xs text-white font-bold rounded-md inline-block shadow-xs"
                style={{ backgroundColor: s?.warna_badge || '#C13D3D' }}
              >
                Belum Bayar
              </span>
              <div className="text-[10.5px] text-[var(--danger)] font-semibold">
                Piutang: {formatRupiah(hargaFinal)}
              </div>
            </div>
          );
        }

        if (kode === 'lunas') {
          return (
            <div className="space-y-0.5">
              <span
                className="px-2.5 py-0.5 text-xs text-white font-bold rounded-md inline-block shadow-xs"
                style={{ backgroundColor: s?.warna_badge || '#1B8A5A' }}
              >
                Lunas (100%)
              </span>
              <div className="text-[10.5px] text-emerald-600 font-semibold">
                Terbayar Penuh
              </div>
            </div>
          );
        }

        return (
          <span
            className="px-2.5 py-1 text-xs text-white font-bold rounded-md inline-block"
            style={{ backgroundColor: s?.warna_badge || '#5C6E6B' }}
          >
            {s?.label || kode}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Link
            href={`/siswa/${row.original.id}`}
            className="p-1.5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] rounded-md flex items-center gap-1 text-xs font-semibold"
            title="Lihat Detail Siswa"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleOpenEditDataDiri(row.original)}
            className="p-1.5 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md flex items-center gap-1 text-xs font-semibold"
            title="Update Data Diri Siswa"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingId(row.original.id)}
            className="p-1.5 text-[var(--danger)] hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md flex items-center gap-1 text-xs font-semibold"
            title="Hapus Data Siswa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    await deleteSiswa(deletingId);
    setDeletingId(null);
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Data Siswa"
        description="Kelola pendaftaran siswa baru, paket kursus, promo, dan histori pembayaran"
        breadcrumbs={[{ label: 'Data Siswa' }]}
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors border ${
                showArchived
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-[var(--bg)] text-[var(--text-primary)] border-[var(--border)] hover:border-amber-600'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>{showArchived ? 'Lihat Siswa Aktif' : 'Arsip Siswa Selesai'}</span>
            </button>
            <ExportButton
              data={filteredData}
              columns={exportColumns}
              filename="amanahdrive_siswa"
              title="Laporan Data Siswa Amanah Drive"
            />
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Daftarkan Siswa Baru</span>
            </button>
          </div>
        }
      />

      {/* ── Filter Bar ── */}
      <div className="card-container space-y-3">
        {/* Row 1: Search + Sumber */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Cari nama, kode, atau WhatsApp..."
              value={filterNama}
              onChange={(e) => setFilterNama(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            />
            {filterNama && (
              <button onClick={() => setFilterNama('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--danger)]" />
              </button>
            )}
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            >
              <option value="semua">Semua Status</option>
              {statusList.map((st) => (
                <option key={st.id} value={st.kode}>{st.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterPaket}
              onChange={(e) => setFilterPaket(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            >
              <option value="semua">Semua Paket</option>
              {paketList.map((p) => (
                <option key={p.id} value={p.id}>{p.nama_paket}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterSumber}
              onChange={(e) => setFilterSumber(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            >
              <option value="semua">Semua Sumber</option>
              <option value="meta_ads">Meta Ads (FB/IG)</option>
              <option value="tiktok">TikTok</option>
              <option value="referensi">Referensi</option>
              <option value="kustom">Lainnya</option>
            </select>
          </div>

          <div className="ml-auto text-xs text-[var(--text-secondary)] font-medium">
            <span className="font-bold text-[var(--text-primary)]">{filteredData.length}</span> siswa
          </div>
        </div>

        {/* Row 2: Date Range Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Filter Tanggal:</span>
            <select
              value={filterDateField}
              onChange={(e) => setFilterDateField(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            >
              <option value="tanggal_booking">Tgl Booking</option>
              <option value="tanggal_rencana_mulai">Rencana Mulai</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">Dari</span>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
            />
            <span className="text-xs text-[var(--text-muted)]">s/d</span>
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

      {/* Data Table */}
      <div className="card-container">
        {loading ? (
          <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={filteredData} />
        )}
      </div>

      {/* Modal Form Tambah / Edit Data Diri Siswa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-xl w-full bg-[var(--bg)] shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
              {formData.id ? `Update Data Diri Siswa (${formData.kode_siswa})` : 'Pendaftaran Siswa Baru'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama || ''}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Nama sesuai KTP"
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    No. WhatsApp Active *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.no_whatsapp || ''}
                    onChange={(e) => setFormData({ ...formData, no_whatsapp: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>

                <div>
                  <DatePickerWIB
                    label="Tanggal Booking *"
                    value={formData.tanggal_booking || getTodayDateString()}
                    onChange={(val) => setFormData({ ...formData, tanggal_booking: val })}
                  />
                </div>

                <div>
                  <DatePickerWIB
                    label="Rencana Tanggal Mulai *"
                    value={formData.tanggal_rencana_mulai || getTodayDateString()}
                    onChange={(val) => setFormData({ ...formData, tanggal_rencana_mulai: val })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Alamat Lengkap
                </label>
                <textarea
                  rows={2}
                  value={formData.alamat || ''}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  placeholder="Alamat domisili Palembang"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              {/* Paket & Promo Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border)]">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Pilih Paket Kursus *
                  </label>
                  <select
                    value={formData.paket_id || ''}
                    onChange={(e) => handlePaketChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    {paketList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama_paket} ({p.jumlah_sesi} Sesi) - {formatRupiah(p.harga_promo || p.harga_normal)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Pilih Promo / Campaign
                  </label>
                  <select
                    value={formData.promosi_id || ''}
                    onChange={(e) => {
                      const pId = e.target.value || null;
                      handlePromoChange(pId);
                    }}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] font-semibold"
                  >
                    <option value="">Tanpa Promo</option>
                    {promosiList.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.nama_promo} (Potongan {pr.tipe_potongan === 'persen' ? `${pr.nilai_potongan}%` : formatRupiah(pr.nilai_potongan)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <CurrencyInput
                    label="Harga Final Siswa (Rupiah) *"
                    value={formData.harga_final || 0}
                    disabled={!!formData.promosi_id}
                    className={formData.promosi_id ? 'bg-black/5 dark:bg-white/5 cursor-not-allowed font-bold text-[var(--brand-primary)]' : ''}
                    onChange={(val) => setFormData({ ...formData, harga_final: val, harga_manual_override: true })}
                  />
                  {formData.promosi_id ? (
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold italic">
                      * Harga final terkunci otomatis karena menerapkan diskon promo &ldquo;{promosiList.find(p => p.id === formData.promosi_id)?.nama_promo}&rdquo;.
                    </p>
                  ) : (
                    <p className="text-[10px] text-[var(--text-secondary)] italic">
                      * Tanpa promo: Anda dapat mengubah nominal harga final secara manual jika diperlukan.
                    </p>
                  )}
                </div>
              </div>

              {/* Info Alur Pembayaran Terkoneksi Kas */}
              <div className="p-3 rounded-lg bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 flex items-start gap-2.5 text-xs">
                <Info className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-slate-700 dark:text-slate-300">
                  <p className="font-bold text-[var(--brand-primary)]">Alur Pembayaran Terintegrasi Kas &amp; Keuangan</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Siswa yang baru didaftarkan otomatis berstatus <strong>Belum Bayar</strong>. Status pembayaran pada daftar siswa akan otomatis terupdate saat transaksi <strong>DP</strong> atau <strong>Pelunasan</strong> diinput melalui menu <strong>Kas &amp; Keuangan</strong>.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Sumber Leads / Pemasaran *
                </label>
                <select
                  value={formData.sumber || 'meta_ads'}
                  onChange={(e) => setFormData({ ...formData, sumber: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                >
                  <option value="meta_ads">Meta Ads (FB/IG)</option>
                  <option value="tiktok">TikTok Ads / Organic</option>
                  <option value="referensi">Referensi Teman / Alumni</option>
                  <option value="kustom">Lainnya / Kustom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Catatan Khusus Siswa
                </label>
                <textarea
                  rows={2}
                  value={formData.catatan || ''}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Misal: Minta instruktur sabar, latihan di hari libur"
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium border border-[var(--border)] rounded-md"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[var(--brand-primary)] text-white rounded-md"
                >
                  {formData.id ? 'Simpan Perubahan Data Diri' : 'Daftarkan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog Hapus Siswa */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Data Siswa"
        description="Apakah Anda yakin ingin menghapus data siswa ini? Aksi ini tidak dapat dibatalkan."
        confirmText="Hapus Siswa"
        isDanger
      />
    </div>
  );
}
