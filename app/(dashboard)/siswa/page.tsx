'use client';

import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ColumnDef } from '@tanstack/react-table';
import { Siswa, Paket, Promosi, StatusPembayaranMaster } from '@/types/database';
import { getSiswaList, createOrUpdateSiswa } from '@/lib/actions/siswa';
import { getPaketList, getPromosiList, getStatusPembayaranMaster } from '@/lib/actions/master-data';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo } from '@/lib/utils/date';
import { ExportButton, ExportColumn } from '@/components/shared/ExportButton';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { Plus, Eye, Edit2 } from 'lucide-react';
import Link from 'next/link';

export default function SiswaPage() {
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [promosiList, setPromosiList] = React.useState<Promosi[]>([]);
  const [statusList, setStatusList] = React.useState<StatusPembayaranMaster[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Filter States
  const [filterStatus, setFilterStatus] = React.useState('semua');
  const [filterPaket, setFilterPaket] = React.useState('semua');

  // Modal State
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
    status_pembayaran_kode: 'belum_bayar',
    dp_nominal: null,
    dp_tanggal: null,
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

  // Handle Paket change to recalculate price
  const handlePaketChange = (paketId: string) => {
    const selectedPaket = paketList.find((p) => p.id === paketId);
    if (selectedPaket) {
      let finalPrice = selectedPaket.harga_promo || selectedPaket.harga_normal;

      // Apply selected promo if exists
      if (formData.promosi_id) {
        const promo = promosiList.find((pr) => pr.id === formData.promosi_id);
        if (promo) {
          if (promo.tipe_potongan === 'persen') {
            finalPrice = Math.round(finalPrice * (1 - promo.nilai_potongan / 100));
          } else {
            finalPrice = Math.max(0, finalPrice - promo.nilai_potongan);
          }
        }
      }

      setFormData((prev) => ({
        ...prev,
        paket_id: paketId,
        harga_final: finalPrice,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.paket_id) return;

    await createOrUpdateSiswa(formData);
    setIsModalOpen(false);
    loadData();
  };

  const filteredData = siswaList.filter((s) => {
    if (filterStatus !== 'semua' && s.status_pembayaran_kode !== filterStatus) return false;
    if (filterPaket !== 'semua' && s.paket_id !== filterPaket) return false;
    return true;
  });

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
      cell: ({ row }) => (
        <span className="font-mono font-bold text-[var(--brand-primary)]">
          {row.original.kode_siswa}
        </span>
      ),
    },
    {
      accessorKey: 'nama',
      header: 'Nama Siswa',
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-[var(--text-primary)]">{row.original.nama}</div>
          <div className="text-xs text-[var(--text-secondary)]">{row.original.no_whatsapp}</div>
        </div>
      ),
    },
    {
      accessorKey: 'paket',
      header: 'Paket Kursus',
      cell: ({ row }) => row.original.paket?.nama_paket || 'Khusus',
    },
    {
      accessorKey: 'harga_final',
      header: 'Harga Final',
      cell: ({ row }) => formatRupiah(row.original.harga_final),
    },
    {
      accessorKey: 'status_pembayaran_kode',
      header: 'Status Bayar',
      cell: ({ row }) => {
        const s = row.original.status_pembayaran;
        return (
          <span
            className="px-2.5 py-1 text-xs text-white font-bold rounded-md inline-block"
            style={{ backgroundColor: s?.warna_badge || '#5C6E6B' }}
          >
            {s?.label || row.original.status_pembayaran_kode}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/siswa/${row.original.id}`}
            className="p-1.5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] rounded-md flex items-center gap-1 text-xs font-semibold"
          >
            <Eye className="w-4 h-4" />
            <span>Detail</span>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Siswa Mengemudi"
        description="Kelola pendaftaran siswa baru, paket, promo, dan histori pembayaran"
        actions={
          <div className="flex items-center gap-3">
            <ExportButton
              data={filteredData}
              columns={exportColumns}
              filename="amanahdrive_siswa"
              title="Laporan Data Siswa Amanah Drive"
            />
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs font-semibold rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Siswa</span>
            </button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <div className="card-container p-4 flex flex-wrap items-center gap-4 text-xs">
        <div>
          <label className="block text-[var(--text-secondary)] mb-1 font-medium">Filter Status Bayar</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
          >
            <option value="semua">Semua Status</option>
            {statusList.map((st) => (
              <option key={st.id} value={st.kode}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[var(--text-secondary)] mb-1 font-medium">Filter Paket</label>
          <select
            value={filterPaket}
            onChange={(e) => setFilterPaket(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)]"
          >
            <option value="semua">Semua Paket</option>
            {paketList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama_paket}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card-container">
        {loading ? (
          <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-md" />
        ) : (
          <DataTable columns={columns} data={filteredData} searchKey="siswa" />
        )}
      </div>

      {/* Modal Form Tambah Siswa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container max-w-xl w-full bg-[var(--bg)] shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Form Pendaftaran Siswa Baru</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Nama Lengkap Siswa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nama || ''}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    No. WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0812..."
                    value={formData.no_whatsapp || ''}
                    onChange={(e) => setFormData({ ...formData, no_whatsapp: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Alamat</label>
                <textarea
                  rows={2}
                  required
                  value={formData.alamat || ''}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <DatePickerWIB
                  label="Tanggal Booking"
                  value={formData.tanggal_booking}
                  onChange={(val) => setFormData({ ...formData, tanggal_booking: val })}
                />
                <DatePickerWIB
                  label="Tgl Rencana Mulai"
                  value={formData.tanggal_rencana_mulai}
                  onChange={(val) => setFormData({ ...formData, tanggal_rencana_mulai: val })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Pilih Paket Kursus *
                  </label>
                  <select
                    value={formData.paket_id}
                    onChange={(e) => handlePaketChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    {paketList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama_paket} ({formatRupiah(p.harga_promo || p.harga_normal)})
                      </option>
                    ))}
                  </select>
                </div>

                <CurrencyInput
                  label="Harga Final (Editable Override)"
                  value={formData.harga_final}
                  onChange={(val) => setFormData({ ...formData, harga_final: val, harga_manual_override: true })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Status Pembayaran Initial *
                  </label>
                  <select
                    value={formData.status_pembayaran_kode}
                    onChange={(e) =>
                      setFormData({ ...formData, status_pembayaran_kode: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    {statusList.map((st) => (
                      <option key={st.id} value={st.kode}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Sumber Leads
                  </label>
                  <select
                    value={formData.sumber}
                    onChange={(e) => setFormData({ ...formData, sumber: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)]"
                  >
                    <option value="meta_ads">Meta Ads (FB/IG)</option>
                    <option value="tiktok">TikTok</option>
                    <option value="referensi">Referensi</option>
                    <option value="kustom">Kustom</option>
                  </select>
                </div>
              </div>

              {/* Conditional DP Fields */}
              {formData.status_pembayaran_kode === 'dp' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-md grid grid-cols-2 gap-3">
                  <CurrencyInput
                    label="Nominal DP (Uang Muka) *"
                    value={formData.dp_nominal}
                    onChange={(val) => setFormData({ ...formData, dp_nominal: val })}
                  />
                  <DatePickerWIB
                    label="Tanggal Penerimaan DP *"
                    value={formData.dp_tanggal || new Date().toISOString().slice(0, 10)}
                    onChange={(val) => setFormData({ ...formData, dp_tanggal: val })}
                  />
                </div>
              )}

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
                  Simpan Siswa & Buat Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
