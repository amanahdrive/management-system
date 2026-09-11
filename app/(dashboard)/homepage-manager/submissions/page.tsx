'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  getHomepageLeads,
  updateLeadStatus,
  deleteLead,
  convertLeadToSiswa,
} from '@/lib/actions/homepage-manager';
import { getPaketList } from '@/lib/actions/master-data';
import { HomepageLead, HomepageLeadStatus, Paket } from '@/types/database';
import { formatRupiah } from '@/lib/utils/currency';
import {
  Search,
  RefreshCw,
  MessageCircle,
  UserPlus,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Car,
  MapPin,
  Calendar,
  AlertCircle,
  X,
  Phone,
  FileSpreadsheet,
} from 'lucide-react';

export default function HomepageSubmissionsPage() {
  const [leads, setLeads] = useState<HomepageLead[]>([]);
  const [pakets, setPakets] = useState<Paket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('semua');
  const [search, setSearch] = useState('');

  // Modal Detail
  const [detailLead, setDetailLead] = useState<HomepageLead | null>(null);

  // Modal Konversi Siswa
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<HomepageLead | null>(null);
  const [convertPaketId, setConvertPaketId] = useState('');
  const [convertHarga, setConvertHarga] = useState<number>(0);
  const [convertTanggalMulai, setConvertTanggalMulai] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [convertCatatan, setConvertCatatan] = useState('');
  const [converting, setConverting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, paketsRes] = await Promise.all([
        getHomepageLeads(statusFilter, search),
        getPaketList(),
      ]);
      setLeads(leadsRes);
      setPakets(paketsRes);
    } catch (err) {
      console.error('Error loading submissions:', err);
      showToast('error', 'Gagal memuat data leads');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (leadId: string, newStatus: HomepageLeadStatus) => {
    try {
      const res = await updateLeadStatus(leadId, newStatus);
      if (res.success) {
        showToast('success', `Status berhasil diperbarui menjadi ${newStatus}`);
        loadData();
      } else {
        showToast('error', res.error || 'Gagal mengubah status');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan sistem');
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm('Yakin ingin menghapus data formulir ini secara permanen?')) return;
    try {
      const res = await deleteLead(leadId);
      if (res.success) {
        showToast('success', 'Data formulir berhasil dihapus');
        loadData();
      } else {
        showToast('error', res.error || 'Gagal menghapus');
      }
    } catch (err) {
      showToast('error', 'Terjadi kesalahan');
    }
  };

  const openConvertModal = (lead: HomepageLead) => {
    setSelectedLead(lead);

    // Cari matching paket dari master jika ada
    let matchedPaket = pakets.find(
      (p) =>
        p.id === lead.paket_id ||
        p.nama_paket.toLowerCase().includes((lead.paket_nama || '').toLowerCase())
    );
    if (!matchedPaket && pakets.length > 0) {
      matchedPaket = pakets[0];
    }

    setConvertPaketId(matchedPaket ? matchedPaket.id : '');
    setConvertHarga(
      matchedPaket
        ? (matchedPaket.harga_promo || matchedPaket.harga_normal)
        : 1000000
    );
    setConvertTanggalMulai(new Date().toISOString().slice(0, 10));
    setConvertCatatan('');
    setConvertModalOpen(true);
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !convertPaketId) return;

    setConverting(true);
    try {
      const res = await convertLeadToSiswa(selectedLead.id, {
        paket_id: convertPaketId,
        harga_final: convertHarga,
        tanggal_rencana_mulai: convertTanggalMulai,
        catatan: convertCatatan,
      });

      if (res.success) {
        showToast('success', `Berhasil! Calon siswa "${selectedLead.nama}" resmi ditambahkan ke Data Siswa.`);
        setConvertModalOpen(false);
        loadData();
      } else {
        showToast('error', res.error || 'Gagal mengonversi ke siswa');
      }
    } catch (err) {
      showToast('error', 'Gagal memproses konversi');
    } finally {
      setConverting(false);
    }
  };

  const generateWhatsAppUrl = (lead: HomepageLead) => {
    let cleanPhone = (lead.whatsapp || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('62')) {
      cleanPhone = '62' + cleanPhone;
    }

    const text = `Halo Kak ${lead.nama}, salam dari Amanah Drive Palembang!\n\nKami telah menerima formulir pendaftaran Kakak melalui website:\n• Paket: ${lead.paket_nama || 'Kursus Mengemudi'}\n• Armada: ${lead.kendaraan_nama || 'Unit Standar'}\n• Slot Waktu: ${lead.slot_waktu_nama || 'Fleksibel'}\n${lead.antar_jemput ? `• Layanan Antar-Jemput: Ya (${lead.alamat_jemput || '-'})` : '• Antar Jemput: Datang ke Kantor'}\n\nApakah slot jadwal dan paket tersebut sudah sesuai, Kak? Ada yang ingin dikonsultasikan terlebih dahulu?`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const getStatusBadge = (status: HomepageLeadStatus) => {
    switch (status) {
      case 'baru':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Baru Masuk
          </span>
        );
      case 'dihubungi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Dihubungi
          </span>
        );
      case 'siswa':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Jadi Siswa
          </span>
        );
      case 'batal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-500/10 text-zinc-600 border border-zinc-500/20">
            Batal
          </span>
        );
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <PageHeader
        title="Form Submit Homepage"
        description="Daftar calon siswa yang mengirimkan formulir booking langsung dari website publik Amanah Drive."
        breadcrumbs={[
          { label: 'Homepage Manager', href: '/homepage-manager/submissions' },
          { label: 'Form Submit' },
        ]}
        actions={
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Perbarui Data</span>
          </button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: 'semua', label: 'Semua Lead' },
            { key: 'baru', label: 'Baru Masuk' },
            { key: 'dihubungi', label: 'Dihubungi' },
            { key: 'siswa', label: 'Jadi Siswa' },
            { key: 'batal', label: 'Batal' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-[var(--brand-primary)] text-white shadow-2xs'
                  : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, WhatsApp, paket..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
          />
        </div>
      </div>

      {/* Leads Table Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-black/[0.02] dark:bg-white/[0.02] text-[var(--text-muted)] font-mono text-[11px] uppercase">
                <th className="py-3 px-4">Tanggal Masuk</th>
                <th className="py-3 px-4">Calon Siswa</th>
                <th className="py-3 px-4">Pilihan Paket</th>
                <th className="py-3 px-4">Armada &amp; Slot</th>
                <th className="py-3 px-4">Antar-Jemput</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--brand-primary)]" />
                    Memuat data pendaftaran...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)]">
                    Tidak ada data pendaftaran yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors">
                    {/* Tanggal */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {new Date(lead.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">
                        {new Date(lead.created_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        WIB
                      </div>
                    </td>

                    {/* Calon Siswa */}
                    <td className="py-3 px-4 align-top">
                      <div className="font-bold text-[var(--text-primary)]">{lead.nama}</div>
                      <div className="text-[11px] text-[var(--brand-primary)] font-mono font-medium flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        <span>{lead.whatsapp}</span>
                      </div>
                    </td>

                    {/* Pilihan Paket */}
                    <td className="py-3 px-4 align-top">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {lead.paket_nama || 'Paket Belum Dipilih'}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        ID: {lead.paket_id || '-'}
                      </div>
                    </td>

                    {/* Armada & Slot */}
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-center gap-1 text-[var(--text-primary)] font-medium">
                        <Car className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                        <span>{lead.kendaraan_nama || 'Semua Unit'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{lead.slot_waktu_nama || 'Fleksibel'}</span>
                      </div>
                    </td>

                    {/* Antar-Jemput */}
                    <td className="py-3 px-4 align-top max-w-[200px]">
                      {lead.antar_jemput ? (
                        <div className="space-y-1">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700">
                            Ya, Jemput
                          </span>
                          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-tight">
                            {lead.alamat_jemput || '-'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">Datang Sendiri</span>
                      )}
                    </td>

                    {/* Status Pill & Dropdown */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <div className="space-y-1.5">
                        <div>{getStatusBadge(lead.status)}</div>
                        <select
                          value={lead.status}
                          onChange={(e) =>
                            handleStatusChange(lead.id, e.target.value as HomepageLeadStatus)
                          }
                          className="text-[10px] rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 text-[var(--text-secondary)]"
                        >
                          <option value="baru">Baru</option>
                          <option value="dihubungi">Dihubungi</option>
                          <option value="siswa">Jadi Siswa</option>
                          <option value="batal">Batal</option>
                        </select>
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Direct WhatsApp CTA */}
                        <a
                          href={generateWhatsAppUrl(lead)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-green-500/10 text-green-700 hover:bg-green-500/20 transition-all"
                          title="Hubungi via WhatsApp dengan template pesan resmi"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>

                        {/* Convert to Siswa */}
                        {lead.status !== 'siswa' && (
                          <button
                            onClick={() => openConvertModal(lead)}
                            className="p-1.5 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)] hover:opacity-80 transition-all font-semibold"
                            title="Konversi menjadi Siswa Resmi di Database"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* View Detail Modal */}
                        <button
                          onClick={() => setDetailLead(lead)}
                          className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                          title="Lihat Detail Lengkap"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Lead */}
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all"
                          title="Hapus Data Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Lead */}
      {detailLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Detail Pendaftaran Homepage
              </h3>
              <button
                onClick={() => setDetailLead(null)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[var(--text-muted)]">Nama Lengkap:</span>
                  <div className="font-bold text-[var(--text-primary)] text-sm">{detailLead.nama}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">WhatsApp:</span>
                  <div className="font-bold text-[var(--brand-primary)] font-mono">{detailLead.whatsapp}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[var(--text-muted)]">Pilihan Paket:</span>
                  <div className="font-semibold text-[var(--text-primary)]">{detailLead.paket_nama || '-'}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Pilihan Armada:</span>
                  <div className="font-semibold text-[var(--text-primary)]">{detailLead.kendaraan_nama || '-'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[var(--text-muted)]">Slot Waktu Latihan:</span>
                  <div className="font-semibold text-[var(--text-primary)]">{detailLead.slot_waktu_nama || '-'}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Layanan Antar-Jemput:</span>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {detailLead.antar_jemput ? 'Ya (Gratis)' : 'Tidak'}
                  </div>
                </div>
              </div>

              {detailLead.antar_jemput && (
                <div>
                  <span className="text-[var(--text-muted)]">Alamat Lengkap Penjemputan:</span>
                  <div className="p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)] font-medium text-[var(--text-primary)] mt-1">
                    {detailLead.alamat_jemput || 'Belum diisi'}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[var(--text-muted)]">Catatan Tambahan Calon Siswa:</span>
                <div className="p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--border)] text-[var(--text-secondary)] mt-1">
                  {detailLead.catatan || 'Tidak ada catatan tambahan.'}
                </div>
              </div>

              {/* Technical Audit Metadata */}
              <div className="pt-2 border-t border-[var(--border)] space-y-1 font-mono text-[10px] text-[var(--text-muted)]">
                <div>Source: {detailLead.source}</div>
                <div>IP Address: {detailLead.ip_address || 'Unknown'}</div>
                <div>Meta Event ID: {detailLead.meta_event_id || 'N/A'}</div>
                <div>Waktu Submit: {new Date(detailLead.created_at).toLocaleString('id-ID')}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <a
                href={generateWhatsAppUrl(detailLead)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white font-semibold text-xs shadow-xs hover:bg-green-700"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chat WhatsApp</span>
              </a>
              <button
                onClick={() => setDetailLead(null)}
                className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Jadikan Siswa */}
      {convertModalOpen && selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                <UserPlus className="w-5 h-5" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Konversi ke Siswa Resmi
                </h3>
              </div>
              <button
                onClick={() => setConvertModalOpen(false)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConvertSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                <span className="font-bold">Calon Siswa: </span>
                <span>{selectedLead.nama} ({selectedLead.whatsapp})</span>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Pilih Paket Kursus Resmi:
                </label>
                <select
                  value={convertPaketId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setConvertPaketId(pid);
                    const p = pakets.find((item) => item.id === pid);
                    if (p) {
                      setConvertHarga(p.harga_promo || p.harga_normal);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs font-medium"
                  required
                >
                  <option value="">-- Pilih Paket Kursus --</option>
                  {pakets.map((pkt) => (
                    <option key={pkt.id} value={pkt.id}>
                      {pkt.nama_paket} ({pkt.jumlah_sesi} sesi{pkt.termasuk_sim ? ' + SIM A' : ''}) - {formatRupiah(pkt.harga_promo || pkt.harga_normal)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Harga Final Kesepakatan (Rp):
                </label>
                <input
                  type="number"
                  value={convertHarga}
                  onChange={(e) => setConvertHarga(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Tanggal Rencana Mulai Latihan:
                </label>
                <input
                  type="date"
                  value={convertTanggalMulai}
                  onChange={(e) => setConvertTanggalMulai(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Catatan Tambahan untuk Administrasi (Opsional):
                </label>
                <textarea
                  value={convertCatatan}
                  onChange={(e) => setConvertCatatan(e.target.value)}
                  placeholder="Misal: Sudah DP via transfer BRI, atau preferensi instruktur tertentu"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setConvertModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={converting}
                  className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-semibold shadow-xs hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {converting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>Jadikan Siswa Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
