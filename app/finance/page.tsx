'use client';

import React from 'react';
import { KasTransaksi, Siswa, Paket, RekeningBank, Hutang, JenisHutangEnum } from '@/types/database';
import {
  getKasOverviewMetrics,
  getKasTransaksiList,
  addKasTransaksi,
  getKasKategoriList,
  getHutangList,
  addHutang,
  updateHutang,
  deleteHutang,
  payHutangCicilan,
  getDpKustomList,
  DpKustomItem,
} from '@/lib/actions/kas';
import { getSiswaList } from '@/lib/actions/siswa';
import { getPaketList } from '@/lib/actions/master-data';
import { getRekeningList } from '@/lib/actions/rekening';
import { getPinSettings, verifyKasPin } from '@/lib/actions/kas-pin';
import { formatRupiah } from '@/lib/utils/currency';
import { getTodayDateString, formatDateIndo } from '@/lib/utils/date';
import { CurrencyInput } from '@/components/shared/CurrencyInput';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { PwaInstallModal } from '@/components/shared/PwaInstallModal';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Download,
  Check,
  X,
  Banknote,
  CreditCard,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  BarChart3,
  Clock,
  Lock,
  KeyRound,
  ShieldCheck,
  Loader2,
  Calendar,
  User,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Star,
  Landmark,
  Search,
  Filter,
  Users,
} from 'lucide-react';

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}Jt`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}Rb`;
  return String(n);
}

const JENIS_PEMBAYARAN_OPTIONS = [
  { value: 'tunai', label: 'Tunai (Cash)' },
  { value: 'non_tunai', label: 'Non-Tunai (Transfer Bank)' },
];

const TODAY = getTodayDateString();
const GREETING = (() => {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
})();

export default function FinancePortalPage() {
  // PIN Auth Gate
  const [pinVerified, setPinVerified] = React.useState(false);
  const [pinInput, setPinInput] = React.useState('');
  const [pinError, setPinError] = React.useState<string | null>(null);
  const [pinLoading, setPinLoading] = React.useState(false);
  const [checkingPinConfig, setCheckingPinConfig] = React.useState(true);

  // Tab State: 'kas' | 'cashflow' | 'piutang' | 'hutang'
  const [activeTab, setActiveTab] = React.useState<'kas' | 'cashflow' | 'piutang' | 'hutang'>('kas');

  // Data State
  const [metrics, setMetrics] = React.useState({
    saldoAktif: 0,
    saldoTunai: 0,
    saldoNonTunai: 0,
    totalPiutang: 0,
    totalHutang: 0,
  });
  const [recentTx, setRecentTx] = React.useState<KasTransaksi[]>([]);
  const [kategoriList, setKategoriList] = React.useState<any[]>([]);
  const [siswaList, setSiswaList] = React.useState<Siswa[]>([]);
  const [paketList, setPaketList] = React.useState<Paket[]>([]);
  const [hutangList, setHutangList] = React.useState<Hutang[]>([]);
  const [dpKustomList, setDpKustomList] = React.useState<DpKustomItem[]>([]);
  const [rekeningList, setRekeningList] = React.useState<RekeningBank[]>([]);
  const [selectedRekeningId, setSelectedRekeningId] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  // Filter & Search State in Tab Kas
  const [txFilterType, setTxFilterType] = React.useState<'all' | 'pemasukan' | 'pengeluaran'>('all');
  const [txSearchQuery, setTxSearchQuery] = React.useState('');

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showInstallModal, setShowInstallModal] = React.useState(false);
  const [showPwaBanner, setShowPwaBanner] = React.useState(false);

  // Add Transaction Modal / Bottom Sheet
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [formData, setFormData] = React.useState({
    tanggal: TODAY,
    tipe: 'pengeluaran' as 'pemasukan' | 'pengeluaran',
    kategori: 'operasional',
    keterangan: '',
    nominal: 0,
    jenis_pembayaran: 'tunai' as 'tunai' | 'non_tunai',
    pic_tipe: 'finance' as 'admin' | 'finance',
    pic_nama: 'Lia (Finance)',
    siswa_id: '',
    sumber_otomatis: false,
  });
  const [submitting, setSubmitting] = React.useState(false);

  // Custom DP States
  const [customNama, setCustomNama] = React.useState('');
  const [customPaketId, setCustomPaketId] = React.useState('');
  const [customHargaPaket, setCustomHargaPaket] = React.useState(0);
  const [customDpNominal, setCustomDpNominal] = React.useState(0);

  // Modal Pelunasan Piutang State
  const [showPelunasanModal, setShowPelunasanModal] = React.useState(false);
  const [selectedPiutangSiswa, setSelectedPiutangSiswa] = React.useState<Siswa | null>(null);
  const [pelunasanNominal, setPelunasanNominal] = React.useState(0);
  const [pelunasanTanggal, setPelunasanTanggal] = React.useState(TODAY);
  const [pelunasanMetode, setPelunasanMetode] = React.useState<'tunai' | 'non_tunai'>('non_tunai');
  const [pelunasanLoading, setPelunasanLoading] = React.useState(false);

  // Modal Bayar Cicilan Hutang State
  const [showCicilanModal, setShowCicilanModal] = React.useState(false);
  const [selectedHutang, setSelectedHutang] = React.useState<Hutang | null>(null);
  const [cicilanNominal, setCicilanNominal] = React.useState(0);
  const [cicilanTanggal, setCicilanTanggal] = React.useState(TODAY);
  const [cicilanMetode, setCicilanMetode] = React.useState<'tunai' | 'non_tunai'>('non_tunai');
  const [cicilanLoading, setCicilanLoading] = React.useState(false);

  // Modal Tambah Hutang Baru
  const [showAddHutangModal, setShowAddHutangModal] = React.useState(false);
  const [newHutangForm, setNewHutangForm] = React.useState<{
    nama_hutang: string;
    jenis: JenisHutangEnum;
    total_hutang: number;
    cicilan_per_bulan: number;
    jatuh_tempo_bulanan: number;
    tanggal_mulai: string;
  }>({
    nama_hutang: '',
    jenis: 'lainnya',
    total_hutang: 0,
    cicilan_per_bulan: 0,
    jatuh_tempo_bulanan: 1,
    tanggal_mulai: TODAY,
  });
  const [savingHutang, setSavingHutang] = React.useState(false);

  // Edit & Delete Hutang State
  const [editHutang, setEditHutang] = React.useState<Hutang | null>(null);
  const [editHutangForm, setEditHutangForm] = React.useState<Partial<Hutang>>({});
  const [savingEditHutang, setSavingEditHutang] = React.useState(false);
  const [deletingHutang, setDeletingHutang] = React.useState<Hutang | null>(null);

  // Check PIN Configuration on mount (Respect settings: default off)
  React.useEffect(() => {
    (async () => {
      try {
        const pinCfg = await getPinSettings();
        if (!pinCfg.isEnabled) {
          // PIN protection is turned OFF in settings -> bypass gate immediately
          setPinVerified(true);
          setCheckingPinConfig(false);
          return;
        }

        // Check local session
        const saved = localStorage.getItem('amanah_finance_pin_ok');
        const savedTime = localStorage.getItem('amanah_finance_pin_time');
        if (saved === 'true' && savedTime) {
          const elapsed = Date.now() - parseInt(savedTime, 10);
          const EIGHT_HOURS = 8 * 60 * 60 * 1000;
          if (elapsed < EIGHT_HOURS) {
            setPinVerified(true);
          } else {
            localStorage.removeItem('amanah_finance_pin_ok');
            localStorage.removeItem('amanah_finance_pin_time');
          }
        }
      } catch (err) {
        console.error('Error checking PIN settings:', err);
      } finally {
        setCheckingPinConfig(false);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (!pinVerified) return;
    loadData();
  }, [pinVerified]);

  // PWA beforeinstallprompt Listener
  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem('fin_pwa_dismissed')) {
        setShowPwaBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

    if (!isStandalone && !sessionStorage.getItem('fin_pwa_dismissed')) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        setShowPwaBanner(true);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Load Data with background refresh and local cache
  const loadData = async () => {
    setLoading(true);
    try {
      const [m, txList, kList, sList, pList, hList, dpKList, rList] = await Promise.all([
        getKasOverviewMetrics(),
        getKasTransaksiList(),
        getKasKategoriList(),
        getSiswaList(),
        getPaketList(),
        getHutangList(),
        getDpKustomList(),
        getRekeningList(),
      ]);
      let calculatedMetrics = { ...m };
      if (txList) {
        let tunai = 0;
        let nonTunai = 0;
        txList.forEach((tx) => {
          const nom = Number(tx.nominal) || 0;
          const isTunai = (tx.jenis_pembayaran || 'tunai') === 'tunai';
          if (tx.tipe === 'pemasukan') {
            if (isTunai) tunai += nom;
            else nonTunai += nom;
          } else {
            if (isTunai) tunai -= nom;
            else nonTunai -= nom;
          }
        });
        calculatedMetrics.saldoTunai = tunai;
        calculatedMetrics.saldoNonTunai = nonTunai;
        calculatedMetrics.saldoAktif = tunai + nonTunai;
      }
      if (sList) {
        let pTotal = 0;
        sList.forEach((s) => {
          if (s.status_pembayaran_kode === 'dp') {
            pTotal += Math.max(0, (Number(s.harga_final) || 0) - (Number(s.dp_nominal) || 0));
          } else if (s.status_pembayaran_kode === 'belum_bayar') {
            pTotal += Number(s.harga_final) || 0;
          }
        });
        calculatedMetrics.totalPiutang = pTotal;
      }
      if (hList) {
        let hTotal = 0;
        hList.forEach((h) => {
          if (h.status === 'berjalan') {
            hTotal += Number(h.sisa_hutang) || 0;
          }
        });
        calculatedMetrics.totalHutang = hTotal;
      }
      setMetrics(calculatedMetrics as any);
      setRecentTx(txList);
      setKategoriList(kList);
      setSiswaList(sList);
      setPaketList(pList);
      setHutangList(hList);
      setDpKustomList(dpKList);
      setRekeningList(rList);
      const defRek = rList.find((r) => r.aktif && r.is_utama) || rList.find((r) => r.aktif);
      if (defRek) setSelectedRekeningId(defRek.id);
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    showToast('Data keuangan berhasil diperbarui');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // PIN Verification Handler
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 6) return;
    setPinLoading(true);
    setPinError(null);
    try {
      const res = await verifyKasPin(pinInput);
      if (res.success) {
        setPinVerified(true);
        localStorage.setItem('amanah_finance_pin_ok', 'true');
        localStorage.setItem('amanah_finance_pin_time', String(Date.now()));
      } else {
        setPinError(res.error || 'PIN salah!');
        setPinInput('');
      }
    } catch {
      setPinError('Terjadi kesalahan jaringan.');
    } finally {
      setPinLoading(false);
    }
  };

  // Type & Category Handlers
  const handleTipeChange = (newTipe: 'pemasukan' | 'pengeluaran') => {
    const defaultKategori = newTipe === 'pemasukan' ? 'dp_siswa' : 'operasional';
    setFormData((prev) => ({
      ...prev,
      tipe: newTipe,
      kategori: defaultKategori,
      siswa_id: '',
      keterangan: '',
      nominal: 0,
    }));
    setCustomNama('');
    setCustomPaketId('');
    setCustomHargaPaket(0);
    setCustomDpNominal(0);
  };

  const handleKategoriChange = (newKategori: string) => {
    setFormData((prev) => ({
      ...prev,
      kategori: newKategori,
      siswa_id: '',
      keterangan: '',
      nominal: 0,
    }));
    setCustomNama('');
    setCustomPaketId('');
    setCustomHargaPaket(0);
    setCustomDpNominal(0);
  };

  const handleSiswaChange = (siswaId: string) => {
    if (siswaId === 'custom_dp') {
      const defaultPaket = paketList[0];
      const defaultPrice = defaultPaket ? (defaultPaket.harga_promo || defaultPaket.harga_normal) : 2000000;
      const defaultDp = Math.round(defaultPrice * 0.5);
      setCustomPaketId(defaultPaket?.id || '');
      setCustomHargaPaket(defaultPrice);
      setCustomDpNominal(defaultDp);
      setFormData((prev) => ({
        ...prev,
        siswa_id: 'custom_dp',
        keterangan: `DP Kustom - ${customNama || 'Customer'} | Paket: ${defaultPaket?.nama_paket || 'Kursus'}`,
        nominal: defaultDp,
      }));
      return;
    }

    const s = siswaList.find((item) => item.id === siswaId);
    if (!s) {
      setFormData((prev) => ({ ...prev, siswa_id: '', keterangan: '', nominal: 0 }));
      return;
    }

    if (formData.kategori === 'dp_siswa') {
      const suggestedDp = Math.round(s.harga_final * 0.5);
      setFormData((prev) => ({
        ...prev,
        siswa_id: siswaId,
        keterangan: `Pembayaran DP Kursus - ${s.nama} (${s.kode_siswa})`,
        nominal: suggestedDp,
      }));
    } else if (formData.kategori === 'pelunasan_siswa') {
      const sisaTagihan = Math.max(0, s.harga_final - (s.dp_nominal || 0));
      setFormData((prev) => ({
        ...prev,
        siswa_id: siswaId,
        keterangan: `Pelunasan Kursus - ${s.nama} (${s.kode_siswa})`,
        nominal: sisaTagihan,
      }));
    } else {
      setFormData((prev) => ({ ...prev, siswa_id: siswaId }));
    }
  };

  const handleAddTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.keterangan || formData.nominal <= 0) return;
    setSubmitting(true);

    const isCustom = formData.siswa_id === 'custom_dp';
    const finalSiswaId = isCustom ? null : (formData.siswa_id || null);

    let finalKeterangan = formData.keterangan;
    const selectedRek = rekeningList.find((r) => r.id === selectedRekeningId);
    if (formData.jenis_pembayaran === 'non_tunai' && selectedRek && !finalKeterangan.includes(selectedRek.nama_bank)) {
      finalKeterangan = `[${selectedRek.nama_bank} ${selectedRek.nomor_rekening}] ${finalKeterangan}`;
    }

    const res = await addKasTransaksi({
      tanggal: formData.tanggal,
      tipe: formData.tipe,
      kategori: formData.kategori,
      keterangan: finalKeterangan,
      nominal: formData.nominal,
      jenis_pembayaran: formData.jenis_pembayaran,
      rekening_id: formData.jenis_pembayaran === 'non_tunai' ? selectedRekeningId || null : null,
      pic_tipe: 'finance',
      pic_nama: 'Lia (Finance)',
      siswa_id: finalSiswaId,
      sumber_otomatis: false,
    });

    setSubmitting(false);
    if (res.success) {
      setShowAddForm(false);
      setFormData({
        tanggal: TODAY,
        tipe: 'pengeluaran',
        kategori: 'operasional',
        keterangan: '',
        nominal: 0,
        jenis_pembayaran: 'tunai',
        pic_tipe: 'finance',
        pic_nama: 'Lia (Finance)',
        siswa_id: '',
        sumber_otomatis: false,
      });
      showToast('Transaksi kas berhasil ditambahkan');
      loadData();
    } else {
      alert('Gagal menambah transaksi: ' + res.error);
    }
  };

  // Open Pelunasan Modal for Student
  const handleOpenPelunasan = (s: Siswa) => {
    setSelectedPiutangSiswa(s);
    const sisa = Math.max(0, s.harga_final - (s.dp_nominal || 0));
    setPelunasanNominal(sisa);
    setPelunasanTanggal(TODAY);
    setPelunasanMetode('non_tunai');
    setShowPelunasanModal(true);
  };

  const handleSavePelunasan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPiutangSiswa || pelunasanNominal <= 0) return;
    setPelunasanLoading(true);

    let ket = selectedPiutangSiswa.status_pembayaran_kode === 'dp'
      ? `Pelunasan Kursus - ${selectedPiutangSiswa.nama} (${selectedPiutangSiswa.kode_siswa})`
      : `Pembayaran Kursus - ${selectedPiutangSiswa.nama} (${selectedPiutangSiswa.kode_siswa})`;

    const selectedRek = rekeningList.find((r) => r.id === selectedRekeningId);
    if (pelunasanMetode === 'non_tunai' && selectedRek) {
      ket = `[${selectedRek.nama_bank} ${selectedRek.nomor_rekening}] ${ket}`;
    }

    const res = await addKasTransaksi({
      tanggal: pelunasanTanggal,
      tipe: 'pemasukan',
      kategori: selectedPiutangSiswa.status_pembayaran_kode === 'dp' ? 'pelunasan_siswa' : 'dp_siswa',
      keterangan: ket,
      nominal: pelunasanNominal,
      jenis_pembayaran: pelunasanMetode,
      rekening_id: pelunasanMetode === 'non_tunai' ? selectedRekeningId || null : null,
      pic_tipe: 'finance',
      pic_nama: 'Lia (Finance)',
      siswa_id: selectedPiutangSiswa.id,
      sumber_otomatis: false,
    });

    setPelunasanLoading(false);
    if (res.success) {
      setShowPelunasanModal(false);
      showToast(`Pelunasan atas nama ${selectedPiutangSiswa.nama} berhasil dicatat!`);
      loadData();
    } else {
      alert('Gagal mencatat pelunasan: ' + res.error);
    }
  };

  // Open Cicilan Hutang Modal
  const handleOpenCicilan = (h: Hutang) => {
    setSelectedHutang(h);
    setCicilanNominal(Number(h.cicilan_per_bulan) || Math.min(Number(h.sisa_hutang), 500000));
    setCicilanTanggal(TODAY);
    setCicilanMetode('non_tunai');
    setShowCicilanModal(true);
  };

  const handleSaveCicilan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHutang || cicilanNominal <= 0) return;
    setCicilanLoading(true);

    const res = await payHutangCicilan(selectedHutang.id, cicilanTanggal, cicilanNominal, cicilanMetode);
    setCicilanLoading(false);

    if (res.success) {
      setShowCicilanModal(false);
      showToast(`Cicilan untuk ${selectedHutang.nama_hutang} berhasil dicatat!`);
      loadData();
    } else {
      alert('Gagal membayar cicilan: ' + res.error);
    }
  };

  // Add Hutang Submit
  const handleSaveNewHutang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHutangForm.nama_hutang || newHutangForm.total_hutang <= 0) return;
    setSavingHutang(true);

    const res = await addHutang(newHutangForm);
    setSavingHutang(false);

    if (res.success) {
      setShowAddHutangModal(false);
      setNewHutangForm({
        nama_hutang: '',
        jenis: 'lainnya',
        total_hutang: 0,
        cicilan_per_bulan: 0,
        jatuh_tempo_bulanan: 1,
        tanggal_mulai: TODAY,
      });
      showToast('Data hutang baru berhasil disimpan!');
      loadData();
    } else {
      alert('Gagal menambah hutang: ' + res.error);
    }
  };

  const handleOpenEditHutang = (h: Hutang) => {
    setEditHutang(h);
    setEditHutangForm({
      nama_hutang: h.nama_hutang,
      jenis: h.jenis,
      total_hutang: h.total_hutang,
      sisa_hutang: h.sisa_hutang,
      cicilan_per_bulan: h.cicilan_per_bulan || 0,
      jatuh_tempo_bulanan: h.jatuh_tempo_bulanan || 1,
      status: h.status,
    });
  };

  const handleSaveEditHutang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHutang) return;
    setSavingEditHutang(true);

    const res = await updateHutang(editHutang.id, editHutangForm);
    setSavingEditHutang(false);

    if (res.success) {
      setEditHutang(null);
      showToast('Data hutang berhasil diperbarui!');
      loadData();
    } else {
      alert('Gagal memperbarui hutang: ' + res.error);
    }
  };

  const handleConfirmDeleteHutang = async () => {
    if (!deletingHutang) return;
    const res = await deleteHutang(deletingHutang.id);
    setDeletingHutang(null);

    if (res.success) {
      showToast('Data hutang berhasil dihapus!');
      loadData();
    } else {
      alert('Gagal menghapus hutang: ' + res.error);
    }
  };

  // Filtered Transactions in Tab Kas
  const filteredRecentTx = React.useMemo(() => {
    let list = recentTx;
    if (txFilterType !== 'all') {
      list = list.filter((tx) => tx.tipe === txFilterType);
    }
    if (txSearchQuery.trim()) {
      const q = txSearchQuery.toLowerCase();
      list = list.filter(
        (tx) =>
          tx.keterangan.toLowerCase().includes(q) ||
          tx.kategori.toLowerCase().includes(q) ||
          (tx.pic_nama || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [recentTx, txFilterType, txSearchQuery]);

  // Filtered Piutang List (Siswa with status 'dp' or 'belum_bayar')
  const piutangSiswaList = React.useMemo(() => {
    return siswaList.filter((s) => s.status_pembayaran_kode === 'dp' || s.status_pembayaran_kode === 'belum_bayar');
  }, [siswaList]);

  // Cashflow Calculation
  const cashflowData = React.useMemo(() => {
    let masuk = 0;
    let keluar = 0;
    const catMap: Record<string, { masuk: number; keluar: number }> = {};

    recentTx.forEach((tx) => {
      const nom = Number(tx.nominal) || 0;
      if (!catMap[tx.kategori]) {
        catMap[tx.kategori] = { masuk: 0, keluar: 0 };
      }
      if (tx.tipe === 'pemasukan') {
        masuk += nom;
        catMap[tx.kategori].masuk += nom;
      } else {
        keluar += nom;
        catMap[tx.kategori].keluar += nom;
      }
    });

    const net = masuk - keluar;
    return { masuk, keluar, net, catMap };
  }, [recentTx]);

  // Categories available for current type
  const availableKategoriList = React.useMemo(() => {
    return kategoriList.filter((k) => {
      if (formData.tipe === 'pemasukan') return k.tipe === 'pemasukan' || k.tipe === 'keduanya';
      return k.tipe === 'pengeluaran' || k.tipe === 'keduanya';
    });
  }, [kategoriList, formData.tipe]);

  const filteredSiswaDropdown = React.useMemo(() => {
    if (formData.kategori === 'dp_siswa') return siswaList.filter((s) => s.status_pembayaran_kode === 'belum_bayar');
    if (formData.kategori === 'pelunasan_siswa') return siswaList.filter((s) => s.status_pembayaran_kode === 'dp');
    return [];
  }, [siswaList, formData.kategori]);

  // Loading state while checking PIN config
  if (checkingPinConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  // PIN Gate Screen (Shown only when PIN is enabled in settings and not yet verified)
  if (!pinVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)]">
        <div className="w-full max-w-sm card-container text-center p-6 shadow-2xl border-2 border-[var(--brand-primary)] animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Finance Portal — Amanah Drive</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 mb-6">
            Masukkan 6 digit PIN Keuangan untuk mengakses data kas dan pembukuan mobile
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                autoFocus
                className="w-full px-4 py-3 text-center text-3xl tracking-widest font-bold tabular-nums rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
              {pinError && <p className="text-xs text-[var(--danger)] font-semibold mt-2">{pinError}</p>}
            </div>

            <button
              type="submit"
              disabled={pinLoading || pinInput.length !== 6}
              className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-colors shadow-sm"
            >
              {pinLoading ? 'Memverifikasi...' : 'Buka Portal Finance'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] text-[var(--text-primary)] pb-28">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900 text-emerald-300 text-xs font-bold rounded-full shadow-2xl border border-emerald-500/30 flex items-center gap-2 animate-fadeIn">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Mobile App Header */}
      <header className="sticky top-0 z-30 bg-[var(--bg-elevated)]/90 backdrop-blur-md border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              AD
            </div>
            <div>
              <div className="text-[10px] text-[var(--text-secondary)] font-semibold">{GREETING}, Lia</div>
              <h1 className="text-xs font-black tracking-tight text-[var(--brand-primary)] uppercase">
                Amanah Drive Finance
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
              title="Perbarui Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[var(--brand-primary)]' : ''}`} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area Container */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* ═══════════════════════════════════════════════════ */}
        {/* ── TAB 1: KAS (OVERVIEW & RIWAYAT KAS) ── */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === 'kas' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Saldo Aktif Hero Card */}
            <div className="p-5 rounded-3xl bg-linear-to-br from-[#0F7A73] to-[#0A5651] text-white shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider uppercase opacity-85">
                  Total Saldo Kas Aktif
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-white/20 backdrop-blur-xs">
                  Realtime
                </span>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
                  {formatRupiah(metrics.saldoAktif)}
                </div>
                <div className="text-[11px] opacity-80 mt-0.5 font-medium">
                  Kas Usaha Amanah Drive Palembang
                </div>
              </div>

              {/* Sub-balances: Tunai vs Non-Tunai */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/20 text-xs">
                <div className="bg-black/10 rounded-2xl p-2.5">
                  <span className="text-[10px] opacity-80 block font-medium">Kas Fisik (Tunai)</span>
                  <span className="font-bold tabular-nums">{formatRupiah(metrics.saldoTunai)}</span>
                </div>
                <div className="bg-black/10 rounded-2xl p-2.5">
                  <span className="text-[10px] opacity-80 block font-medium">Bank (Non-Tunai)</span>
                  <span className="font-bold tabular-nums">{formatRupiah(metrics.saldoNonTunai)}</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid: Piutang & Hutang */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setActiveTab('piutang')}
                className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] shadow-xs space-y-1 cursor-pointer active:scale-98 transition-transform"
              >
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span className="text-[10.5px] font-bold">Piutang Beredar</span>
                  <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-sm font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatRupiah(metrics.totalPiutang)}
                </div>
                <div className="text-[9.5px] text-[var(--text-secondary)]">
                  {piutangSiswaList.length} siswa belum lunas →
                </div>
              </div>

              <div
                onClick={() => setActiveTab('hutang')}
                className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--border)] shadow-xs space-y-1 cursor-pointer active:scale-98 transition-transform"
              >
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span className="text-[10.5px] font-bold">Total Hutang</span>
                  <Banknote className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatRupiah(metrics.totalHutang)}
                </div>
                <div className="text-[9.5px] text-[var(--text-secondary)]">
                  {hutangList.filter((h) => h.status === 'berjalan').length} hutang berjalan →
                </div>
              </div>
            </div>

            {/* Riwayat Transaksi Kas */}
            <div className="card-container p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                  <span>Mutasi Transaksi Kas ({filteredRecentTx.length})</span>
                </h3>
              </div>

              {/* Filter & Search Bar */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Cari transaksi, keterangan, PIC..."
                    value={txSearchQuery}
                    onChange={(e) => setTxSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setTxFilterType('all')}
                    className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                      txFilterType === 'all'
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxFilterType('pemasukan')}
                    className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                      txFilterType === 'pemasukan'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxFilterType('pengeluaran')}
                    className={`flex-1 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                      txFilterType === 'pengeluaran'
                        ? 'bg-rose-600 text-white'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Keluar
                  </button>
                </div>
              </div>

              {/* Transaction List */}
              <div className="space-y-2 pt-1">
                {filteredRecentTx.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
                    Tidak ada transaksi yang cocok.
                  </div>
                ) : (
                  filteredRecentTx.map((tx) => {
                    const isIncome = tx.tipe === 'pemasukan';
                    return (
                      <div
                        key={tx.id}
                        className="p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-start justify-between gap-2.5 shadow-2xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isIncome
                                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600'
                                : 'bg-rose-100 dark:bg-rose-950/50 text-rose-600'
                            }`}
                          >
                            {isIncome ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                              {tx.keterangan}
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>{formatDateIndo(tx.tanggal)}</span>
                              <span>•</span>
                              <span className="capitalize">{tx.kategori.replace('_', ' ')}</span>
                              <span>•</span>
                              <span className="font-semibold text-sky-600">{tx.jenis_pembayaran || 'tunai'}</span>
                              {tx.pic_nama && (
                                <>
                                  <span>•</span>
                                  <span>{tx.pic_nama}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs font-black tabular-nums ${
                              isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isIncome ? '+' : '-'} {formatRupiah(tx.nominal)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* ── TAB 2: CASHFLOW (ARUS KAS MASUK VS KELUAR) ── */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === 'cashflow' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="card-container p-4 space-y-3">
              <h3 className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>Ringkasan Arus Kas (Cashflow)</span>
              </h3>

              {/* Net Cashflow Card */}
              <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)] font-semibold">Net Cashflow</span>
                  <span
                    className={`font-black text-sm tabular-nums ${
                      cashflowData.net >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {cashflowData.net >= 0 ? '+' : ''} {formatRupiah(cashflowData.net)}
                  </span>
                </div>

                {/* Income vs Expense Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-semibold">
                    <span className="text-emerald-600">Masuk: {formatRupiah(cashflowData.masuk)}</span>
                    <span className="text-rose-600">Keluar: {formatRupiah(cashflowData.keluar)}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-rose-200 dark:bg-rose-950 overflow-hidden flex">
                    <div
                      style={{
                        width: `${
                          cashflowData.masuk + cashflowData.keluar > 0
                            ? Math.round((cashflowData.masuk / (cashflowData.masuk + cashflowData.keluar)) * 100)
                            : 50
                        }%`,
                      }}
                      className="h-full bg-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown per Kategori */}
            <div className="card-container p-4 space-y-3">
              <h4 className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">
                Rincian Berdasarkan Kategori
              </h4>
              <div className="space-y-2">
                {Object.entries(cashflowData.catMap).map(([kat, data]) => (
                  <div
                    key={kat}
                    className="p-3 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[var(--text-primary)] capitalize">
                        {kat.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-right tabular-nums font-bold">
                      {data.masuk > 0 && <div className="text-emerald-600">+{formatRupiah(data.masuk)}</div>}
                      {data.keluar > 0 && <div className="text-rose-600">-{formatRupiah(data.keluar)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* ── TAB 3: PIUTANG (TAGIHAN SISWA & PELUNASAN) ── */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === 'piutang' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Header Card */}
            <div className="p-4 rounded-3xl bg-linear-to-br from-amber-600 to-amber-700 text-white shadow-md space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                Total Piutang Siswa Beredar
              </span>
              <div className="text-2xl font-black tabular-nums">
                {formatRupiah(metrics.totalPiutang)}
              </div>
              <div className="text-[11px] opacity-90 font-medium">
                {piutangSiswaList.length} siswa memiliki sisa tagihan belum lunas
              </div>
            </div>

            {/* List of Students with Outstanding Balances */}
            <div className="space-y-2.5">
              {piutangSiswaList.length === 0 ? (
                <div className="card-container text-center py-12 text-xs text-[var(--text-secondary)]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-sm text-[var(--text-primary)]">Semua Piutang Siswa Lunas!</p>
                  <p className="text-[11px] mt-1">Tidak ada tagihan yang beredar saat ini.</p>
                </div>
              ) : (
                piutangSiswaList.map((s) => {
                  const hargaFinal = Number(s.harga_final) || 0;
                  const dp = Number(s.dp_nominal) || 0;
                  const sisa = Math.max(0, hargaFinal - dp);
                  const isDp = s.status_pembayaran_kode === 'dp';
                  const pct = hargaFinal > 0 ? Math.round((dp / hargaFinal) * 100) : 0;

                  return (
                    <div
                      key={s.id}
                      className="card-container p-4 space-y-3 border border-[var(--border)] shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-[var(--text-primary)]">{s.nama}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] font-mono">
                            <span className="font-semibold text-[var(--brand-primary)]">{s.kode_siswa}</span> • {s.no_whatsapp || '-'}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            isDp
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300'
                          }`}
                        >
                          {isDp ? `DP ${pct}%` : 'Belum Bayar'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--bg-subtle)] text-xs">
                        <div>
                          <span className="text-[10px] text-[var(--text-secondary)] block">Paket Kursus</span>
                          <span className="font-semibold text-[var(--text-primary)]">
                            {s.paket?.nama_paket || 'Khusus'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-secondary)] block">Sisa Tagihan</span>
                          <span className="font-black text-rose-600 tabular-nums">
                            {formatRupiah(sisa)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[10.5px] text-[var(--text-secondary)]">
                          Total Biaya: <strong>{formatRupiah(hargaFinal)}</strong>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenPelunasan(s)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Input Pelunasan</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════ */}
        {/* ── TAB 4: HUTANG (HUTANG USAHA & CICILAN) ── */}
        {/* ═══════════════════════════════════════════════════ */}
        {activeTab === 'hutang' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Header Card */}
            <div className="p-4 rounded-3xl bg-linear-to-br from-rose-600 to-rose-700 text-white shadow-md flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">
                  Total Sisa Hutang Usaha
                </span>
                <div className="text-2xl font-black tabular-nums">
                  {formatRupiah(metrics.totalHutang)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddHutangModal(true)}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Hutang</span>
              </button>
            </div>

            {/* List of Hutang */}
            <div className="space-y-2.5">
              {hutangList.length === 0 ? (
                <div className="card-container text-center py-12 text-xs text-[var(--text-secondary)]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-sm text-[var(--text-primary)]">Tidak Ada Catatan Hutang!</p>
                  <p className="text-[11px] mt-1">Perusahaan bebas dari tanggungan hutang.</p>
                </div>
              ) : (
                hutangList.map((h) => {
                  const sisa = Number(h.sisa_hutang) || 0;
                  const total = Number(h.total_hutang) || 0;
                  const isLunas = h.status === 'lunas' || sisa <= 0;

                  return (
                    <div
                      key={h.id}
                      className="card-container p-4 space-y-3 border border-[var(--border)] shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-[var(--text-primary)]">{h.nama_hutang}</div>
                          <div className="text-[11px] text-[var(--text-secondary)] capitalize">
                            Jenis: {h.jenis} • Tempo Tgl: {h.jatuh_tempo_bulanan || 1}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            isLunas
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}
                        >
                          {isLunas ? 'LUNAS' : 'BERJALAN'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--bg-subtle)] text-xs">
                        <div>
                          <span className="text-[10px] text-[var(--text-secondary)] block">Total Hutang</span>
                          <span className="font-bold text-[var(--text-primary)] tabular-nums">
                            {formatRupiah(total)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-secondary)] block">Sisa Hutang</span>
                          <span className={`font-black tabular-nums ${isLunas ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatRupiah(sisa)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditHutang(h)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg flex items-center gap-1 transition-colors"
                            title="Edit Hutang"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingHutang(h)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-1 transition-colors"
                            title="Hapus Hutang"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>

                        {!isLunas ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCicilan(h)}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Bayar Cicilan</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-600">Lunas Penuh</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── FLOATING BOTTOM NAVIGATION BAR WITH CENTER (+) BUTTON ── */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
        <div className="bg-[var(--bg-elevated)]/90 backdrop-blur-lg border border-[var(--border)] rounded-3xl shadow-2xl px-3 py-2 flex items-center justify-between">
          {/* Tab 1: Kas */}
          <button
            type="button"
            onClick={() => setActiveTab('kas')}
            className={`flex-1 py-1 flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'kas' ? 'text-[var(--brand-primary)] font-bold' : 'text-[var(--text-secondary)]'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px]">Kas</span>
          </button>

          {/* Tab 2: Cashflow */}
          <button
            type="button"
            onClick={() => setActiveTab('cashflow')}
            className={`flex-1 py-1 flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'cashflow' ? 'text-[var(--brand-primary)] font-bold' : 'text-[var(--text-secondary)]'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px]">Cashflow</span>
          </button>

          {/* Center: Elevated Glowing Floating Action Button (+) */}
          <div className="relative -top-6 px-1">
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-13 h-13 rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white flex items-center justify-center shadow-lg shadow-teal-500/40 border-4 border-[var(--bg)] transition-transform active:scale-90"
              title="Tambah Transaksi Kas"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>
          </div>

          {/* Tab 3: Piutang */}
          <button
            type="button"
            onClick={() => setActiveTab('piutang')}
            className={`flex-1 py-1 flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'piutang' ? 'text-[var(--brand-primary)] font-bold' : 'text-[var(--text-secondary)]'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px]">Piutang</span>
          </button>

          {/* Tab 4: Hutang */}
          <button
            type="button"
            onClick={() => setActiveTab('hutang')}
            className={`flex-1 py-1 flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'hutang' ? 'text-[var(--brand-primary)] font-bold' : 'text-[var(--text-secondary)]'
            }`}
          >
            <Banknote className="w-5 h-5" />
            <span className="text-[10px]">Hutang</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: FORM TAMBAH TRANSAKSI KAS (+) ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[var(--bg)] border-t sm:border border-[var(--border)] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Catat Transaksi Kas Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTxSubmit} className="space-y-3.5 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTipeChange('pemasukan')}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    formData.tipe === 'pemasukan'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => handleTipeChange('pengeluaran')}
                  className={`py-2 rounded-xl font-bold transition-all ${
                    formData.tipe === 'pengeluaran'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  Pengeluaran
                </button>
              </div>

              {/* Kategori Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Kategori
                </label>
                <select
                  value={formData.kategori}
                  onChange={(e) => handleKategoriChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                >
                  {availableKategoriList.map((k) => (
                    <option key={k.id} value={k.nama_kategori}>
                      {k.nama_kategori.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Dropdown if Student Category */}
              {(formData.kategori === 'dp_siswa' || formData.kategori === 'pelunasan_siswa') && (
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Pilih Siswa Terdaftar
                  </label>
                  <select
                    value={formData.siswa_id}
                    onChange={(e) => handleSiswaChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] font-semibold text-[var(--text-primary)]"
                  >
                    <option value="">-- Pilih Siswa Terdaftar --</option>
                    {filteredSiswaDropdown.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kode_siswa}) - {formatRupiah(s.harga_final)}
                      </option>
                    ))}
                    {formData.kategori === 'dp_siswa' && (
                      <option value="custom_dp">★ Input DP Kustom (Tanpa Data Siswa)</option>
                    )}
                  </select>
                </div>
              )}

              {/* Nominal Currency Input */}
              <div>
                <CurrencyInput
                  label="Nominal Transaksi (Rp) *"
                  value={formData.nominal}
                  onChange={(val) => setFormData((prev) => ({ ...prev, nominal: val }))}
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tanggal: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, jenis_pembayaran: 'tunai' }))}
                    className={`py-2 rounded-xl font-bold transition-all ${
                      formData.jenis_pembayaran === 'tunai'
                        ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)]'
                        : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Tunai (Cash)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, jenis_pembayaran: 'non_tunai' }))}
                    className={`py-2 rounded-xl font-bold transition-all ${
                      formData.jenis_pembayaran === 'non_tunai'
                        ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)]'
                        : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Non-Tunai (Bank)
                  </button>
                </div>

                {formData.jenis_pembayaran === 'non_tunai' && (
                  <select
                    value={selectedRekeningId}
                    onChange={(e) => setSelectedRekeningId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold mt-2"
                  >
                    {rekeningList
                      .filter((r) => r.aktif)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nama_bank} - {r.nomor_rekening} ({r.atas_nama})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Keterangan Transaksi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Keterangan transaksi kas..."
                  value={formData.keterangan}
                  onChange={(e) => setFormData((prev) => ({ ...prev, keterangan: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs"
                />
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <button
                  type="submit"
                  disabled={submitting || formData.nominal <= 0 || !formData.keterangan}
                  className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] disabled:opacity-50 text-white font-bold rounded-2xl text-xs transition-colors shadow-sm"
                >
                  {submitting ? 'Menyimpan Transaksi...' : 'Simpan Transaksi Kas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: PELUNASAN PIUTANG SISWA ── */}
      {/* ═══════════════════════════════════════════════════ */}
      {showPelunasanModal && selectedPiutangSiswa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Input Pelunasan Siswa</h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {selectedPiutangSiswa.nama} ({selectedPiutangSiswa.kode_siswa})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPelunasanModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePelunasan} className="space-y-3 text-xs">
              <div>
                <CurrencyInput
                  label="Nominal Pembayaran (Rp) *"
                  value={pelunasanNominal}
                  onChange={(val) => setPelunasanNominal(val)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Tanggal Bayar
                </label>
                <input
                  type="date"
                  value={pelunasanTanggal}
                  onChange={(e) => setPelunasanTanggal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Metode Bayar
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPelunasanMetode('tunai')}
                    className={`py-2 rounded-xl font-bold ${
                      pelunasanMetode === 'tunai'
                        ? 'border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Tunai
                  </button>
                  <button
                    type="button"
                    onClick={() => setPelunasanMetode('non_tunai')}
                    className={`py-2 rounded-xl font-bold ${
                      pelunasanMetode === 'non_tunai'
                        ? 'border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Transfer Bank
                  </button>
                </div>

                {pelunasanMetode === 'non_tunai' && (
                  <select
                    value={selectedRekeningId}
                    onChange={(e) => setSelectedRekeningId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold mt-2"
                  >
                    {rekeningList
                      .filter((r) => r.aktif)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.nama_bank} - {r.nomor_rekening} ({r.atas_nama})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPelunasanModal(false)}
                  className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={pelunasanLoading || pelunasanNominal <= 0}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {pelunasanLoading ? 'Menyimpan...' : 'Catat Pelunasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 3: BAYAR CICILAN HUTANG ── */}
      {/* ═══════════════════════════════════════════════════ */}
      {showCicilanModal && selectedHutang && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Bayar Cicilan Hutang</h3>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {selectedHutang.nama_hutang} (Sisa: {formatRupiah(selectedHutang.sisa_hutang)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCicilanModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCicilan} className="space-y-3 text-xs">
              <div>
                <CurrencyInput
                  label="Nominal Cicilan (Rp) *"
                  value={cicilanNominal}
                  onChange={(val) => setCicilanNominal(val)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Tanggal Bayar
                </label>
                <input
                  type="date"
                  value={cicilanTanggal}
                  onChange={(e) => setCicilanTanggal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Metode Bayar
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCicilanMetode('tunai')}
                    className={`py-2 rounded-xl font-bold ${
                      cicilanMetode === 'tunai'
                        ? 'border-2 border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Tunai
                  </button>
                  <button
                    type="button"
                    onClick={() => setCicilanMetode('non_tunai')}
                    className={`py-2 rounded-xl font-bold ${
                      cicilanMetode === 'non_tunai'
                        ? 'border-2 border-rose-600 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Transfer Bank
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCicilanModal(false)}
                  className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={cicilanLoading || cicilanNominal <= 0}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {cicilanLoading ? 'Menyimpan...' : 'Bayar Cicilan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 4: TAMBAH HUTANG BARU ── */}
      {/* ═══════════════════════════════════════════════════ */}
      {showAddHutangModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Tambah Hutang Baru</h3>
              <button
                type="button"
                onClick={() => setShowAddHutangModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewHutang} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Nama Hutang / Entitas *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cicilan Mobil Avanza"
                  value={newHutangForm.nama_hutang}
                  onChange={(e) => setNewHutangForm({ ...newHutangForm, nama_hutang: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                />
              </div>

              <div>
                <CurrencyInput
                  label="Total Nilai Hutang (Rp) *"
                  value={newHutangForm.total_hutang}
                  onChange={(val) => setNewHutangForm({ ...newHutangForm, total_hutang: val })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <CurrencyInput
                    label="Cicilan/Bulan (Rp)"
                    value={newHutangForm.cicilan_per_bulan}
                    onChange={(val) => setNewHutangForm({ ...newHutangForm, cicilan_per_bulan: val })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Jatuh Tempo Tgl
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={newHutangForm.jatuh_tempo_bulanan}
                    onChange={(e) =>
                      setNewHutangForm({ ...newHutangForm, jatuh_tempo_bulanan: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddHutangModal(false)}
                  className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingHutang || !newHutangForm.nama_hutang || newHutangForm.total_hutang <= 0}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {savingHutang ? 'Menyimpan...' : 'Simpan Hutang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 5: EDIT HUTANG ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {editHutang && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-600" />
                <span>Edit Catatan Hutang</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditHutang(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditHutang} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                  Nama Hutang / Entitas *
                </label>
                <input
                  type="text"
                  required
                  value={editHutangForm.nama_hutang || ''}
                  onChange={(e) => setEditHutangForm({ ...editHutangForm, nama_hutang: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <CurrencyInput
                  label="Total Hutang *"
                  value={editHutangForm.total_hutang}
                  onChange={(val) => setEditHutangForm({ ...editHutangForm, total_hutang: val })}
                />
                <CurrencyInput
                  label="Sisa Hutang *"
                  value={editHutangForm.sisa_hutang}
                  onChange={(val) => setEditHutangForm({ ...editHutangForm, sisa_hutang: val })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <CurrencyInput
                    label="Cicilan/Bulan"
                    value={editHutangForm.cicilan_per_bulan}
                    onChange={(val) => setEditHutangForm({ ...editHutangForm, cicilan_per_bulan: val })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                    Status
                  </label>
                  <select
                    value={editHutangForm.status || 'berjalan'}
                    onChange={(e) => setEditHutangForm({ ...editHutangForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold"
                  >
                    <option value="berjalan">Berjalan</option>
                    <option value="lunas">Lunas</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditHutang(null)}
                  className="flex-1 py-2 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEditHutang}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {savingEditHutang ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog Hapus Hutang */}
      <ConfirmDialog
        isOpen={!!deletingHutang}
        onClose={() => setDeletingHutang(null)}
        onConfirm={handleConfirmDeleteHutang}
        title="Hapus Catatan Hutang"
        description={`Apakah Anda yakin ingin menghapus catatan hutang "${deletingHutang?.nama_hutang}"? Riwayat pembayaran cicilan hutang ini juga akan dihapus.`}
        confirmText="Hapus Hutang"
        isDanger
      />

      {/* PWA Install Modal */}
      {showInstallModal && deferredPrompt && (
        <PwaInstallModal
          appName="Amanah Drive Finance"
          isOpen={showInstallModal}
          onClose={() => setShowInstallModal(false)}
          deferredPrompt={deferredPrompt}
        />
      )}
    </div>
  );
}
