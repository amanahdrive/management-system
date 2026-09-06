'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { PinGateDialog } from '@/components/shared/PinGateDialog';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatRupiah } from '@/lib/utils/currency';
import { formatDateIndo, getTodayDateString } from '@/lib/utils/date';
import {
  getPosPengeluaranList,
  getPosPengeluaranSummary,
  generatePosOtomatisBulanIni,
  createPosPengeluaran,
  updatePosPengeluaran,
  deletePosPengeluaran,
  bayarPosPengeluaran,
  PosPengeluaranSummary,
} from '@/lib/actions/pos-pengeluaran';
import { getRekeningList } from '@/lib/actions/rekening';
import { PosPengeluaran, RekeningBank } from '@/types/database';
import { useAppRefresh, triggerAppRefresh } from '@/lib/utils/refresh-event';
import {
  Wallet,
  ArrowLeft,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  CreditCard,
  Landmark,
  Trash2,
  Edit2,
  FileText,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Info,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';

export default function PosPengeluaranPage() {
  const currentMonthStr = getTodayDateString().slice(0, 7); // 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = React.useState(currentMonthStr);
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'belum_bayar' | 'terbayar'>('all');
  const [filterSumber, setFilterSumber] = React.useState<string>('all');
  const [posList, setPosList] = React.useState<PosPengeluaran[]>([]);
  const [summary, setSummary] = React.useState<PosPengeluaranSummary>({
    totalPos: 0,
    totalEstimasi: 0,
    totalRealisasi: 0,
    totalSisaBelumBayar: 0,
    sudahBayarCount: 0,
    belumBayarCount: 0,
  });
  const [rekeningList, setRekeningList] = React.useState<RekeningBank[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [feedbackMsg, setFeedbackMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Buat Pos Baru State
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isSavingAdd, setIsSavingAdd] = React.useState(false);
  const [addForm, setAddForm] = React.useState({
    nama_pos: '',
    kategori: 'operasional',
    nominal_estimasi: 0,
    is_fluktuatif: false,
    tanggal_jatuh_tempo: getTodayDateString(),
    catatan: '',
  });

  // Modal Bayar Pos State
  const [payingPos, setPayingPos] = React.useState<PosPengeluaran | null>(null);
  const [isSubmittingPay, setIsSubmittingPay] = React.useState(false);
  const [payForm, setPayForm] = React.useState({
    nominal_realisasi: 0,
    jenis_pembayaran: 'tunai' as 'tunai' | 'non_tunai',
    rekening_id: '',
    tanggal: getTodayDateString(),
    pic_nama: 'Admin Finance',
    keterangan: '',
  });

  // Modal Edit Pos State
  const [editingPos, setEditingPos] = React.useState<PosPengeluaran | null>(null);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [editForm, setEditForm] = React.useState({
    nama_pos: '',
    kategori: 'operasional',
    nominal_estimasi: 0,
    is_fluktuatif: false,
    tanggal_jatuh_tempo: '',
    catatan: '',
  });

  // Delete Confirm State
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [list, sum, rek] = await Promise.all([
        getPosPengeluaranList({
          periodeBulan: selectedMonth,
          status: filterStatus === 'all' ? undefined : filterStatus,
          sumber: filterSumber === 'all' ? undefined : (filterSumber as any),
        }),
        getPosPengeluaranSummary(selectedMonth),
        getRekeningList(),
      ]);
      setPosList(list);
      setSummary(sum);
      setRekeningList(rek);
    } catch (err) {
      console.error('Error loading pos pengeluaran:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, filterStatus, filterSumber]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  useAppRefresh(loadData);

  const handleGenerateOtomatis = async () => {
    setGenerating(true);
    setFeedbackMsg(null);
    try {
      const res = await generatePosOtomatisBulanIni(selectedMonth);
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: res.message || `Berhasil memeriksa dan menambahkan ${res.createdCount} pos otomatis.`,
        });
        await loadData();
        triggerAppRefresh();
      } else {
        setFeedbackMsg({
          type: 'error',
          text: res.message || 'Gagal generate pos otomatis.',
        });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenAddModal = () => {
    setAddForm({
      nama_pos: '',
      kategori: 'operasional',
      nominal_estimasi: 0,
      is_fluktuatif: false,
      tanggal_jatuh_tempo: `${selectedMonth}-15`,
      catatan: '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.nama_pos.trim() || addForm.nominal_estimasi <= 0) {
      alert('Nama pos dan nominal estimasi harus diisi valid!');
      return;
    }
    setIsSavingAdd(true);
    const res = await createPosPengeluaran({
      ...addForm,
      periode_bulan: selectedMonth,
    });
    setIsSavingAdd(false);

    if (res.success) {
      setIsAddModalOpen(false);
      loadData();
      triggerAppRefresh();
    } else {
      alert('Gagal menambah pos: ' + res.error);
    }
  };

  const handleOpenPayModal = (pos: PosPengeluaran) => {
    setPayingPos(pos);
    const defaultRek =
      rekeningList.find((r) => r.aktif && r.is_utama)?.id ||
      rekeningList.find((r) => r.aktif)?.id ||
      '';
    setPayForm({
      nominal_realisasi: pos.nominal_estimasi,
      jenis_pembayaran: 'tunai',
      rekening_id: defaultRek,
      tanggal: getTodayDateString(),
      pic_nama: 'Admin Finance',
      keterangan: `Pembayaran Pos: ${pos.nama_pos}`,
    });
  };

  const handleSavePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPos) return;
    if (payForm.nominal_realisasi <= 0) {
      alert('Nominal pembayaran harus lebih besar dari Rp 0!');
      return;
    }
    if (payForm.jenis_pembayaran === 'non_tunai' && !payForm.rekening_id) {
      alert('Silakan pilih rekening bank tujuan!');
      return;
    }

    setIsSubmittingPay(true);
    const res = await bayarPosPengeluaran(payingPos.id, payForm);
    setIsSubmittingPay(false);

    if (res.success) {
      setPayingPos(null);
      loadData();
      triggerAppRefresh();
    } else {
      alert('Gagal memproses pembayaran pos: ' + res.error);
    }
  };

  const handleOpenEdit = (pos: PosPengeluaran) => {
    setEditingPos(pos);
    setEditForm({
      nama_pos: pos.nama_pos,
      kategori: pos.kategori,
      nominal_estimasi: pos.nominal_estimasi,
      is_fluktuatif: pos.is_fluktuatif,
      tanggal_jatuh_tempo: pos.tanggal_jatuh_tempo || '',
      catatan: pos.catatan || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPos) return;
    setIsSavingEdit(true);
    const res = await updatePosPengeluaran(editingPos.id, editForm);
    setIsSavingEdit(false);

    if (res.success) {
      setEditingPos(null);
      loadData();
      triggerAppRefresh();
    } else {
      alert('Gagal mengupdate pos: ' + res.error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    const res = await deletePosPengeluaran(deletingId);
    setDeletingId(null);
    if (res.success) {
      loadData();
      triggerAppRefresh();
    } else {
      alert(res.error);
    }
  };

  return (
    <PinGateDialog>
      <div className="space-y-6">
        <PageHeader
          title="POS Pengeluaran & Alokasi Anggaran"
          description="Rencana belanja kas, otomasi penerbitan SIM, cicilan hutang, dan operasional rutin"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleGenerateOtomatis}
                disabled={generating}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm hover:-translate-y-0.5"
                title="Cek dan masukkan otomatis siswa siap terbit, hutang, dan operasional bulan ini"
              >
                <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                <span>{generating ? 'Memeriksa Data...' : 'Sinkronkan Pos Otomatis'}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3.5 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm hover:-translate-y-0.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Pos Manual</span>
              </button>
            </div>
          }
        />

        {feedbackMsg && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-xs underline hover:opacity-80"
            >
              Tutup
            </button>
          </div>
        )}

        {/* 4 Stat Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Pos Bulan Ini"
            value={`${summary.totalPos} Pos`}
            icon={<Layers className="w-5 h-5 text-indigo-600" />}
            description={`${summary.belumBayarCount} belum bayar • ${summary.sudahBayarCount} lunas`}
          />
          <StatCard
            label="Total Estimasi Anggaran"
            value={formatRupiah(summary.totalEstimasi)}
            icon={<Wallet className="w-5 h-5 text-blue-600" />}
            description="Plafon anggaran belanja bulan berjalan"
          />
          <StatCard
            label="Sudah Dibayarkan (Realisasi)"
            value={formatRupiah(summary.totalRealisasi)}
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            description="Total yang telah keluar dari kas/bank"
          />
          <StatCard
            label="Sisa Belum Dibayar"
            value={formatRupiah(summary.totalSisaBelumBayar)}
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            description="Kewajiban belanja yang belum dieksekusi"
          />
        </div>

        {/* Control & Filter Bar */}
        <div className="card-container p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Picker */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span className="font-semibold text-[var(--text-secondary)]">Periode:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-[var(--bg-subtle)] p-0.5 rounded-lg border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  filterStatus === 'all'
                    ? 'bg-[var(--bg)] text-[var(--brand-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Semua Status
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('belum_bayar')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  filterStatus === 'belum_bayar'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Belum Bayar ({summary.belumBayarCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('terbayar')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  filterStatus === 'terbayar'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Terbayar ({summary.sudahBayarCount})
              </button>
            </div>
          </div>

          {/* Sumber Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)] font-medium">Filter Sumber:</span>
            <select
              value={filterSumber}
              onChange={(e) => setFilterSumber(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
            >
              <option value="all">Semua Sumber Pos</option>
              <option value="otomatis_sim">SIM Siap Terbit</option>
              <option value="otomatis_hutang">Cicilan Hutang</option>
              <option value="otomatis_operasional">Operasional Rutin (Token/WiFi/Air)</option>
              <option value="manual">Pos Manual</option>
            </select>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 border border-[var(--border)] rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
              title="Refresh tabel"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* POS List Table / Card View */}
        <div className="card-container p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Daftar Pos Belanja & Pengeluaran ({posList.length})</span>
            </h3>
            <span className="text-xs text-[var(--text-secondary)]">
              Periode {selectedMonth}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
              <span>Memuat data pos pengeluaran...</span>
            </div>
          ) : posList.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--text-secondary)]">
                <Layers className="w-6 h-6 opacity-40" />
              </div>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                Belum ada pos pengeluaran tercatat untuk periode {selectedMonth}.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleGenerateOtomatis}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Pos Otomatis Bulan Ini</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="px-3.5 py-1.5 border border-[var(--border)] rounded-full text-xs font-semibold hover:bg-[var(--bg-subtle)]"
                >
                  + Buat Pos Manual
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-subtle)] border-b border-[var(--border)] text-[var(--text-secondary)] font-bold">
                    <th className="py-3 px-4">Nama Pos Pengeluaran</th>
                    <th className="py-3 px-4">Sumber / Kategori</th>
                    <th className="py-3 px-4">Jatuh Tempo</th>
                    <th className="py-3 px-4 text-right">Nominal Estimasi</th>
                    <th className="py-3 px-4 text-right">Realisasi Kas</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {posList.map((pos) => {
                    const isOverdue =
                      pos.status === 'belum_bayar' &&
                      pos.tanggal_jatuh_tempo &&
                      pos.tanggal_jatuh_tempo < getTodayDateString();

                    return (
                      <tr
                        key={pos.id}
                        className={`hover:bg-[var(--bg-subtle)]/50 transition-colors ${
                          pos.status === 'terbayar' ? 'opacity-80' : ''
                        }`}
                      >
                        {/* Nama Pos */}
                        <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{pos.nama_pos}</span>
                            {pos.catatan && (
                              <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                                {pos.catatan}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Sumber & Kategori */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {pos.sumber === 'otomatis_sim' && (
                              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-md text-[10px] font-bold flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                SIM Siap Terbit
                              </span>
                            )}
                            {pos.sumber === 'otomatis_hutang' && (
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-md text-[10px] font-bold flex items-center gap-1">
                                <CreditCard className="w-2.5 h-2.5" />
                                Cicilan Hutang
                              </span>
                            )}
                            {pos.sumber === 'otomatis_operasional' && (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-md text-[10px] font-bold flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5" />
                                Rutin Bulanan
                              </span>
                            )}
                            {pos.sumber === 'manual' && (
                              <span className="px-2 py-0.5 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20 rounded-md text-[10px] font-bold">
                                Manual
                              </span>
                            )}
                            {pos.is_fluktuatif && (
                              <span className="px-2 py-0.5 bg-teal-500/10 text-teal-600 border border-teal-500/20 rounded-md text-[10px] font-bold" title="Tagihan air/fluktuatif menyesuaikan meteran riil">
                                Fluktuatif
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Jatuh Tempo */}
                        <td className="py-3.5 px-4 tabular-nums">
                          {pos.tanggal_jatuh_tempo ? (
                            <div className="flex items-center gap-1.5">
                              <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-[var(--text-secondary)]'}>
                                {formatDateIndo(pos.tanggal_jatuh_tempo)}
                              </span>
                              {isOverdue && (
                                <span className="px-1.5 py-0.2 text-[9px] bg-rose-600 text-white rounded font-extrabold uppercase">
                                  Lewat
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[var(--text-secondary)]">-</span>
                          )}
                        </td>

                        {/* Nominal Estimasi */}
                        <td className="py-3.5 px-4 text-right font-bold tabular-nums text-[var(--text-primary)]">
                          {formatRupiah(pos.nominal_estimasi)}
                        </td>

                        {/* Realisasi Kas */}
                        <td className="py-3.5 px-4 text-right font-bold tabular-nums">
                          {pos.status === 'terbayar' ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {formatRupiah(pos.nominal_realisasi || pos.nominal_estimasi)}
                            </span>
                          ) : (
                            <span className="text-[var(--text-secondary)] opacity-50">-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {pos.status === 'terbayar' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Lunas Kas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                              <Clock className="w-3 h-3" />
                              Belum Bayar
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {pos.status === 'belum_bayar' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPayModal(pos)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 hover:scale-105 active:scale-95"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Bayar Pos</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-semibold italic">
                                Selesai
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(pos)}
                              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] rounded-md transition-colors"
                              title="Edit pos"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {pos.status !== 'terbayar' && (
                              <button
                                type="button"
                                onClick={() => setDeletingId(pos.id)}
                                className="p-1 text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-500/10 rounded-md transition-colors"
                                title="Hapus pos"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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

        {/* ======================================================== */}
        {/* MODAL BAYAR POS                                         */}
        {/* ======================================================== */}
        {payingPos && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-[var(--bg)] rounded-2xl border border-[var(--border)] p-6 shadow-2xl space-y-4">
              <div className="border-b border-[var(--border)] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Eksekusi Pembayaran Pos ke Kas</span>
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {payingPos.nama_pos}
                  </p>
                </div>
                <button
                  onClick={() => setPayingPos(null)}
                  className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              </div>

              {payingPos.is_fluktuatif && (
                <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-xs text-teal-700 dark:text-teal-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    <span>Biaya Fluktuatif (Air PDAM)</span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    Estimasi awal adalah {formatRupiah(payingPos.nominal_estimasi)}. Anda dapat menyesuaikan nominal di bawah ini sesuai jumlah tagihan riil pada invoice/meteran.
                  </p>
                </div>
              )}

              <form onSubmit={handleSavePay} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Nominal Realisasi Pembayaran (Rp) *
                  </label>
                  <CurrencyInput
                    value={payForm.nominal_realisasi}
                    onChange={(val) => setPayForm({ ...payForm, nominal_realisasi: val })}
                    className="w-full text-base font-bold"
                  />
                  <span className="text-[10px] text-[var(--text-secondary)] mt-1 block">
                    Estimasi pos: {formatRupiah(payingPos.nominal_estimasi)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Metode Pembayaran *
                    </label>
                    <select
                      value={payForm.jenis_pembayaran}
                      onChange={(e) =>
                        setPayForm({
                          ...payForm,
                          jenis_pembayaran: e.target.value as 'tunai' | 'non_tunai',
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                    >
                      <option value="tunai">Kas Tunai (Fisik)</option>
                      <option value="non_tunai">Transfer Bank (Non-Tunai)</option>
                    </select>
                  </div>

                  <div>
                    <DatePickerWIB
                      label="Tanggal Bayar *"
                      value={payForm.tanggal}
                      onChange={(val) => setPayForm({ ...payForm, tanggal: val })}
                    />
                  </div>
                </div>

                {payForm.jenis_pembayaran === 'non_tunai' && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Pilih Rekening Bank Sumber Dana *
                    </label>
                    <select
                      value={payForm.rekening_id}
                      onChange={(e) => setPayForm({ ...payForm, rekening_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                    >
                      {rekeningList.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nama_bank} - {r.nomor_rekening} ({r.atas_nama})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    PIC Penanggung Jawab *
                  </label>
                  <input
                    type="text"
                    value={payForm.pic_nama}
                    onChange={(e) => setPayForm({ ...payForm, pic_nama: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)]"
                    placeholder="Nama PIC (cth: Lia Finance)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Keterangan Kas
                  </label>
                  <input
                    type="text"
                    value={payForm.keterangan}
                    onChange={(e) => setPayForm({ ...payForm, keterangan: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)]"
                  />
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPayingPos(null)}
                    className="px-4 py-2 border border-[var(--border)] rounded-xl font-semibold hover:bg-[var(--bg-subtle)]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPay}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    {isSubmittingPay ? 'Membukukan...' : 'Konfirmasi & Catat ke Kas'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL BUAT POS MANUAL                                   */}
        {/* ======================================================== */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-[var(--bg)] rounded-2xl border border-[var(--border)] p-6 shadow-2xl space-y-4">
              <div className="border-b border-[var(--border)] pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Tambah Pos Pengeluaran Manual</span>
                </h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAdd} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Nama Pos Pengeluaran *
                  </label>
                  <input
                    type="text"
                    value={addForm.nama_pos}
                    onChange={(e) => setAddForm({ ...addForm, nama_pos: e.target.value })}
                    placeholder="Contoh: Pembelian Spanduk Promosi"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Kategori *
                    </label>
                    <select
                      value={addForm.kategori}
                      onChange={(e) => setAddForm({ ...addForm, kategori: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                    >
                      <option value="operasional">Operasional</option>
                      <option value="sim">Penerbitan SIM</option>
                      <option value="cicilan_hutang">Cicilan Hutang</option>
                      <option value="bbm">BBM Kendaraan</option>
                      <option value="gaji">Gaji / Honor</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <DatePickerWIB
                      label="Jatuh Tempo"
                      value={addForm.tanggal_jatuh_tempo}
                      onChange={(val) => setAddForm({ ...addForm, tanggal_jatuh_tempo: val })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Nominal Estimasi / Anggaran (Rp) *
                  </label>
                  <CurrencyInput
                    value={addForm.nominal_estimasi}
                    onChange={(val) => setAddForm({ ...addForm, nominal_estimasi: val })}
                    className="w-full text-base font-bold"
                  />
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <input
                    type="checkbox"
                    id="fluktuatif_add"
                    checked={addForm.is_fluktuatif}
                    onChange={(e) => setAddForm({ ...addForm, is_fluktuatif: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-0"
                  />
                  <label htmlFor="fluktuatif_add" className="text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                    Biaya Fluktuatif (nominal dapat berubah sesuai invoice riil)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Catatan Tambahan
                  </label>
                  <textarea
                    value={addForm.catatan}
                    onChange={(e) => setAddForm({ ...addForm, catatan: e.target.value })}
                    rows={2}
                    placeholder="Catatan tujuan pos anggaran..."
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)]"
                  />
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 border border-[var(--border)] rounded-xl font-semibold hover:bg-[var(--bg-subtle)]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAdd}
                    className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-xl font-bold shadow-sm"
                  >
                    {isSavingAdd ? 'Menyimpan...' : 'Simpan Pos Baru'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL EDIT POS                                          */}
        {/* ======================================================== */}
        {editingPos && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md bg-[var(--bg)] rounded-2xl border border-[var(--border)] p-6 shadow-2xl space-y-4">
              <div className="border-b border-[var(--border)] pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Edit Pos Pengeluaran</span>
                </h3>
                <button
                  onClick={() => setEditingPos(null)}
                  className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Nama Pos Pengeluaran *
                  </label>
                  <input
                    type="text"
                    value={editForm.nama_pos}
                    onChange={(e) => setEditForm({ ...editForm, nama_pos: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Kategori *
                    </label>
                    <select
                      value={editForm.kategori}
                      onChange={(e) => setEditForm({ ...editForm, kategori: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                    >
                      <option value="operasional">Operasional</option>
                      <option value="sim">Penerbitan SIM</option>
                      <option value="cicilan_hutang">Cicilan Hutang</option>
                      <option value="bbm">BBM Kendaraan</option>
                      <option value="gaji">Gaji / Honor</option>
                      <option value="lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <DatePickerWIB
                      label="Jatuh Tempo"
                      value={editForm.tanggal_jatuh_tempo}
                      onChange={(val) => setEditForm({ ...editForm, tanggal_jatuh_tempo: val })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Nominal Estimasi (Rp) *
                  </label>
                  <CurrencyInput
                    value={editForm.nominal_estimasi}
                    onChange={(val) => setEditForm({ ...editForm, nominal_estimasi: val })}
                    className="w-full text-base font-bold"
                  />
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <input
                    type="checkbox"
                    id="fluktuatif_edit"
                    checked={editForm.is_fluktuatif}
                    onChange={(e) => setEditForm({ ...editForm, is_fluktuatif: e.target.checked })}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-0"
                  />
                  <label htmlFor="fluktuatif_edit" className="text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                    Biaya Fluktuatif (Air PDAM / Beban Dinamis)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Catatan
                  </label>
                  <textarea
                    value={editForm.catatan}
                    onChange={(e) => setEditForm({ ...editForm, catatan: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text-primary)]"
                  />
                </div>

                <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPos(null)}
                    className="px-4 py-2 border border-[var(--border)] rounded-xl font-semibold hover:bg-[var(--bg-subtle)]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white rounded-xl font-bold shadow-sm"
                  >
                    {isSavingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirm Dialog */}
        <ConfirmDialog
          isOpen={Boolean(deletingId)}
          onClose={() => setDeletingId(null)}
          onConfirm={handleDeleteConfirm}
          title="Hapus Pos Pengeluaran"
          description="Apakah Anda yakin ingin menghapus pos pengeluaran ini? Data pos yang dihapus tidak dapat dipulihkan."
          confirmText="Hapus Pos"
          isDanger={true}
        />
      </div>
    </PinGateDialog>
  );
}
