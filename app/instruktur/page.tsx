'use client';

import React from 'react';
import { Staff, JadwalSesi } from '@/types/database';
import { getInstrukturList } from '@/lib/actions/master-data';
import { getJadwalByTanggal, getJadwalByBulan, getJadwalConflictCheckList, getJadwalBySiswa, updateJadwalStatus, upsertJadwalSesi } from '@/lib/actions/jadwal';
import { getTodayDateString, formatDateIndo, formatHariTanggalIndo } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { PwaInstallModal } from '@/components/shared/PwaInstallModal';
import {
  Calendar,
  UserCheck,
  MessageSquare,
  MapPin,
  Car,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LogOut,
  Clock,
  Sparkles,
  Download,
  Check,
  X,
} from 'lucide-react';

const MONTH_NAMES_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function InstrukturPortalPage() {
  const [instrukturList, setInstrukturList] = React.useState<Staff[]>([]);
  const [selectedInstrukturId, setSelectedInstrukturId] = React.useState<string>('');
  const [selectedInstruktur, setSelectedInstruktur] = React.useState<Staff | null>(null);
  const [loadingInstruktur, setLoadingInstruktur] = React.useState(true);

  // Live Date Time & Greeting State
  const [now, setNow] = React.useState(new Date());

  // Calendar & Date State
  const [selectedTanggal, setSelectedTanggal] = React.useState<string>(getTodayDateString());
  const [calCurrentYear, setCalCurrentYear] = React.useState(new Date().getFullYear());
  const [calCurrentMonth, setCalCurrentMonth] = React.useState(new Date().getMonth());

  // Schedule Data State
  const [dailyJadwal, setDailyJadwal] = React.useState<JadwalSesi[]>([]);
  const [monthlyJadwal, setMonthlyJadwal] = React.useState<JadwalSesi[]>([]);
  const [loadingSchedule, setLoadingSchedule] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Student Detail Modal State
  const [selectedJadwalDetail, setSelectedJadwalDetail] = React.useState<JadwalSesi | null>(null);
  const [rescheduleDate, setRescheduleDate] = React.useState<string>('');
  const [isRescheduling, setIsRescheduling] = React.useState(false);

  const getRescheduledDefaultDate = async (siswaId: string) => {
    const list = await getJadwalBySiswa(siswaId);
    const active = list.filter((j) => j.status_sesi !== 'batal');
    if (active.length === 0) {
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      return tom.toISOString().split('T')[0];
    }
    const dates = active.map((j) => j.tanggal_sesi);
    dates.sort();
    const latestDateStr = dates[dates.length - 1];
    
    const [y, m, d] = latestDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + 1);
    
    const nextY = dateObj.getFullYear();
    const nextM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const nextD = String(dateObj.getDate()).padStart(2, '0');
    return `${nextY}-${nextM}-${nextD}`;
  };

  const handleOpenReschedule = async (siswaId: string) => {
    const defaultDate = await getRescheduledDefaultDate(siswaId);
    setRescheduleDate(defaultDate);
    setIsRescheduling(true);
  };

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showPwaPopup, setShowPwaPopup] = React.useState(false);
  const [showInstallModal, setShowInstallModal] = React.useState(false);

  // 1. Timer for Live Greeting Clock
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // 2. PWA Install Prompt Listener
  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if not already dismissed in this session
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setShowPwaPopup(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Fallback: show custom banner on mobile browsers if standalone mode is not active
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isStandalone && !sessionStorage.getItem('pwa_prompt_dismissed')) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        setShowPwaPopup(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 3. Initial Load Instruktur List & Saved Selection
  React.useEffect(() => {
    async function init() {
      setLoadingInstruktur(true);
      const list = await getInstrukturList();
      setInstrukturList(list);

      const savedId = localStorage.getItem('amanah_instruktur_id');
      if (savedId && list.some((i) => i.id === savedId)) {
        setSelectedInstrukturId(savedId);
        const ins = list.find((i) => i.id === savedId) || null;
        setSelectedInstruktur(ins);
      }
      setLoadingInstruktur(false);
    }
    init();
  }, []);

  // 4. Load Schedule Data
  const loadInstructorSchedule = React.useCallback(async () => {
    if (!selectedInstrukturId) return;
    setLoadingSchedule(true);
    const [dayList, monthList] = await Promise.all([
      getJadwalByTanggal(selectedTanggal, selectedInstrukturId),
      getJadwalConflictCheckList(), // 100% full sync check list
    ]);

    setDailyJadwal(dayList);
    const insMonthJadwal = monthList.filter(
      (j) => j.staff_id === selectedInstrukturId && j.status_sesi !== 'batal'
    );
    setMonthlyJadwal(insMonthJadwal);
    setLoadingSchedule(false);
  }, [selectedInstrukturId, selectedTanggal]);

  React.useEffect(() => {
    loadInstructorSchedule();
  }, [loadInstructorSchedule]);

  // Handle Refresh Action
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadInstructorSchedule();
    setIsRefreshing(false);
    showToast('Data jadwal berhasil diperbarui!');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle Instructor Login / Logout
  const handleSelectInstruktur = (id: string) => {
    setSelectedInstrukturId(id);
    const ins = instrukturList.find((i) => i.id === id) || null;
    setSelectedInstruktur(ins);
    localStorage.setItem('amanah_instruktur_id', id);
  };

  const handleLogoutInstruktur = () => {
    localStorage.removeItem('amanah_instruktur_id');
    setSelectedInstrukturId('');
    setSelectedInstruktur(null);
  };

  // Handle PWA Install Action
  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        showToast('Terima kasih! Aplikasi telah dipasang.');
      }
      setDeferredPrompt(null);
    } else {
      alert('Untuk memasang di HP: buka menu opsi browser (titik tiga atau tombol Share) lalu pilih "Tambahkan ke Layar Utama" / "Add to Home Screen".');
    }
    setShowPwaPopup(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  // Greeting Text Helper
  const getGreetingText = () => {
    const hours = now.getHours();
    if (hours >= 0 && hours < 11) return 'Selamat pagi';
    if (hours >= 11 && hours < 15) return 'Selamat siang';
    if (hours >= 15 && hours < 18) return 'Selamat sore';
    return 'Selamat malam';
  };

  // Format Date Time Subtitle: "Jumat, 07/08/2026 11:37 WIB"
  const getFormattedDateTime = () => {
    const dayName = DAY_NAMES_INDO[now.getDay()];
    const dateFormatted = formatDateIndo(now.toISOString().slice(0, 10));
    const hoursStr = String(now.getHours()).padStart(2, '0');
    const minsStr = String(now.getMinutes()).padStart(2, '0');
    return `${dayName}, ${dateFormatted} ${hoursStr}:${minsStr} WIB`;
  };

  // WhatsApp Link Builder
  const getWhatsAppLink = (siswaNama: string, siswaPhone: string) => {
    const firstNameSiswa = siswaNama.trim().split(' ')[0];
    const firstNameInstruktur = selectedInstruktur?.nama.trim().split(' ')[0] || 'Instruktur';

    let cleanPhone = siswaPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const defaultMsg = `halo kak ${firstNameSiswa}, saya instruktur ${firstNameInstruktur}, otw ya. mohon ditunggu`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMsg)}`;
  };

  // --- GATE 1: SELECT INSTRUCTOR LOGIN PROMPT ---
  if (loadingInstruktur) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-subtle)]">
        <div className="flex items-center gap-3 text-xs font-bold text-[var(--brand-primary)]">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Memuat Portal Instruktur Amanah Drive...</span>
        </div>
      </div>
    );
  }

  if (!selectedInstruktur) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-950 via-gray-900 to-black text-white">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Car className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Portal Jadwal Instruktur</h1>
            <p className="text-xs text-gray-300">
              Amanah Drive Palembang — Sistem Informasi Sesi Mengemudi
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Pilih Nama Instruktur Bertugas *
              </label>
              <select
                value={selectedInstrukturId}
                onChange={(e) => handleSelectInstruktur(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
              >
                <option value="" disabled className="bg-gray-900">
                  -- Pilih Instruktur --
                </option>
                {instrukturList.map((ins) => (
                  <option key={ins.id} value={ins.id} className="bg-gray-900 text-white">
                    {ins.nama} (Instruktur)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- PORTAL MAIN DASHBOARD VIEW ---
  const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-2 animate-in fade-in zoom-in-95">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <header className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          {/* Top Left Greeting & Timestamp */}
          <div>
            <h1 className="text-xs font-extrabold text-[var(--brand-primary)]">
              {getGreetingText()}, {selectedInstruktur.nama}
            </h1>
            <p className="text-[10px] text-[var(--text-secondary)] font-medium mt-0.5">
              {getFormattedDateTime()}
            </p>
          </div>

          {/* Right Header Toolbar: Theme Toggle, Refresh Data, Logout */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[var(--text-primary)]"
              title="Refresh Data Terkini"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[var(--brand-primary)]' : ''}`} />
            </button>

            <ThemeToggle />

            <button
              onClick={handleLogoutInstruktur}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 hover:border-rose-300 transition-colors"
              title="Ganti Profile Instruktur"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ganti</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mini Calendar 1-Bulan Grid Feature */}
      <section className="card-container space-y-3">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />
            <h2 className="text-xs font-bold text-[var(--text-primary)]">
              Jadwal Sesi Bulanan ({MONTH_NAMES_INDO[calCurrentMonth]} {calCurrentYear})
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                if (calCurrentMonth === 0) {
                  setCalCurrentMonth(11);
                  setCalCurrentYear(calCurrentYear - 1);
                } else {
                  setCalCurrentMonth(calCurrentMonth - 1);
                }
              }}
              className="p-1 rounded border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (calCurrentMonth === 11) {
                  setCalCurrentMonth(0);
                  setCalCurrentYear(calCurrentYear + 1);
                } else {
                  setCalCurrentMonth(calCurrentMonth + 1);
                }
              }}
              className="p-1 rounded border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[var(--text-secondary)]">
          <div className="text-rose-600">Min</div>
          <div>Sen</div>
          <div>Sel</div>
          <div>Rab</div>
          <div>Kam</div>
          <div>Jum</div>
          <div>Sab</div>
        </div>

        {/* Month Grid Cells */}
        <div className="grid grid-cols-7 gap-1 text-xs">
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-10 rounded bg-[var(--bg-subtle)] opacity-30" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
            const dayNum = dayIdx + 1;
            const mStr = String(calCurrentMonth + 1).padStart(2, '0');
            const dStr = String(dayNum).padStart(2, '0');
            const cellDateStr = `${calCurrentYear}-${mStr}-${dStr}`;

            const isSelected = selectedTanggal === cellDateStr;
            const dateObj = new Date(calCurrentYear, calCurrentMonth, dayNum);
            const isSunday = dateObj.getDay() === 0;
            const dateSessions = monthlyJadwal.filter((j) => j.tanggal_sesi === cellDateStr);
            const hasSessions = dateSessions.length > 0;

            const dayNameEng = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'][dateObj.getDay()];
            const daySlots = selectedInstruktur?.jadwal_ketersediaan?.[dayNameEng] || 
              (selectedInstruktur?.hari_kerja?.includes(dayNameEng) 
                ? selectedInstruktur?.slot_kerja || ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'] 
                : []);
            const isOff = !selectedInstruktur?.hari_kerja?.includes(dayNameEng) || daySlots.length === 0;

            return (
              <button
                key={cellDateStr}
                onClick={() => setSelectedTanggal(cellDateStr)}
                className={`h-11 p-1 rounded-lg border flex flex-col justify-between items-center transition-all ${
                  isSelected
                    ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-light)] font-bold shadow-sm'
                    : isOff
                    ? 'border-gray-200 dark:border-gray-800 bg-gray-100/50 dark:bg-gray-900/30 opacity-70'
                    : 'border-[var(--border)] bg-[var(--bg)] hover:border-emerald-500'
                }`}
              >
                <span className={`text-[11px] ${isSunday ? 'text-rose-600 font-bold' : 'text-[var(--text-primary)]'}`}>
                  {dayNum}
                </span>

                {hasSessions ? (
                  <span className="px-1 py-0.2 text-[9px] font-extrabold rounded-full bg-emerald-600 text-white truncate max-w-full">
                    {dateSessions.length} Sesi
                  </span>
                ) : isOff ? (
                  <span className="text-[8.5px] font-semibold text-gray-500 dark:text-gray-400">Libur</span>
                ) : (
                  <span className="text-[8px] text-[var(--text-secondary)] opacity-40">-</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Daily Schedule List Section */}
      <section className="space-y-3">
        <div className="card-container p-4 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--brand-primary)] tracking-wider block">
              Jadwal Mengemudi Terpilih
            </span>
            <h2 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
              {formatHariTanggalIndo(selectedTanggal)}
            </h2>
          </div>

          <div className="w-40">
            <DatePickerWIB
              value={selectedTanggal}
              onChange={(val) => setSelectedTanggal(val)}
            />
          </div>
        </div>

        {loadingSchedule ? (
          <div className="h-40 card-container animate-pulse flex items-center justify-center text-xs text-[var(--text-secondary)]">
            Memuat jadwal sesi...
          </div>
        ) : dailyJadwal.length === 0 ? (
          <div className="card-container p-8 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-[var(--brand-primary)] mx-auto opacity-40" />
            <p className="text-xs font-bold text-[var(--text-primary)]">
              Tidak Ada Sesi Mengemudi Terjadwal
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Tidak terdapat sesi latihan siswa untuk instruktur {selectedInstruktur.nama} pada tanggal {formatDateIndo(selectedTanggal)}.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyJadwal.map((sesi) => {
              const siswaObj = sesi.siswa;
              const slotObj = sesi.slot_waktu;
              const isBatal = sesi.status_sesi === 'batal';
              const isSelesai = sesi.status_sesi === 'selesai';

              return (
                <div
                  key={sesi.id}
                  onClick={() => setSelectedJadwalDetail(sesi)}
                  className={`card-container p-4 cursor-pointer hover:border-[var(--brand-primary)] transition-all space-y-3 border ${
                    isSelesai
                      ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-50/20'
                      : isBatal
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20 opacity-75'
                      : 'border-[var(--border)]'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[var(--brand-primary)]" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {slotObj ? `${slotObj.nama_slot} (${slotObj.jam_mulai.substring(0, 5)} - ${slotObj.jam_selesai.substring(0, 5)} WIB)` : 'Slot Waktu Sesi'}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full text-white ${
                        isSelesai
                          ? 'bg-emerald-600'
                          : isBatal
                          ? 'bg-rose-600'
                          : 'bg-blue-600'
                      }`}
                    >
                      {isSelesai ? 'Selesai' : isBatal ? 'Batal' : 'Terjadwal'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-[var(--brand-primary)]">
                        {siswaObj?.nama || 'Siswa Mengemudi'}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                        Kode: {siswaObj?.kode_siswa || '-'} • Mobil: {sesi.jenis_mobil?.toUpperCase()}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-[var(--text-primary)] block">
                        Sesi {sesi.nomor_sesi_ke} dari {sesi.total_sesi_paket}
                      </span>
                      <span className="text-[10px] text-[var(--brand-primary)] font-semibold underline mt-1 block">
                        Lihat Detail Siswa &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* STUDENT DETAIL MODAL WITH DIRECT WHATSAPP "OTW" BUTTON */}
      {selectedJadwalDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card-container max-w-md w-full bg-[var(--bg)] shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[var(--brand-primary)]" />
                Detail Data Siswa Mengemudi
              </h3>
              <button
                onClick={() => setSelectedJadwalDetail(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-base px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-1">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold">Nama Lengkap Siswa</p>
                <p className="text-base font-extrabold text-[var(--brand-primary)]">
                  {selectedJadwalDetail.siswa?.nama} ({selectedJadwalDetail.siswa?.kode_siswa})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-secondary)] font-medium">No. WhatsApp</p>
                  <p className="font-bold text-xs text-[var(--text-primary)] font-mono mt-0.5">
                    {selectedJadwalDetail.siswa?.no_whatsapp || '-'}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-secondary)] font-medium">Progress Sesi</p>
                  <p className="font-bold text-xs text-[var(--text-primary)] mt-0.5">
                    Sesi {selectedJadwalDetail.nomor_sesi_ke} dari {selectedJadwalDetail.total_sesi_paket}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-[var(--border)] space-y-1">
                <p className="text-[10px] text-[var(--text-secondary)] font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Alamat Penjemputan Siswa</span>
                </p>
                <p className="font-semibold text-xs text-[var(--text-primary)]">
                  {selectedJadwalDetail.siswa?.alamat || 'Alamat tidak diisi'}
                </p>
              </div>

              {/* DIRECT WHATSAPP OTW BUTTON */}
              {selectedJadwalDetail.siswa?.no_whatsapp && (
                <div className="pt-2">
                  <a
                    href={getWhatsAppLink(
                      selectedJadwalDetail.siswa.nama,
                      selectedJadwalDetail.siswa.no_whatsapp
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all text-xs"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Kirim WA &ldquo;OTW Ya Siswa&rdquo;</span>
                  </a>
                </div>
              )}

              {/* STATUS & PROGRESS ACTIONS */}
              <div className="pt-3 border-t border-[var(--border)] space-y-2">
                <p className="font-bold text-xs text-[var(--text-primary)]">Update Status Sesi Latihan:</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => {
                      if (confirm('Tandai sesi ini telah selesai?')) {
                        const res = await updateJadwalStatus(selectedJadwalDetail.id, 'selesai');
                        if (res.success) {
                          showToast('Sesi ditandai SELESAI!');
                          setSelectedJadwalDetail(null);
                          loadInstructorSchedule();
                        } else {
                          alert('Gagal memperbarui status: ' + res.error);
                        }
                      }
                    }}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors text-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Selesai</span>
                  </button>

                  <button
                    onClick={() => handleOpenReschedule(selectedJadwalDetail.siswa_id || '')}
                    className="py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors text-xs"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Ditunda / Reschedule</span>
                  </button>
                </div>

                {isRescheduling && (
                  <div className="p-3 bg-[var(--bg-subtle)] border border-amber-300 dark:border-amber-900 rounded-xl space-y-3 mt-2 animate-in fade-in zoom-in-95">
                    <div>
                      <p className="text-[10px] text-[var(--text-secondary)] font-medium">Tanggal Sesi Saat Ini (Tetap):</p>
                      <p className="font-bold text-xs text-[var(--text-primary)] mt-0.5">
                        {formatDateIndo(selectedJadwalDetail.tanggal_sesi)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] text-[var(--text-secondary)] font-semibold mb-1">
                        Pilih Tanggal Dilanjutkan Kembali:
                      </label>
                      <DatePickerWIB
                        value={rescheduleDate}
                        onChange={(val) => setRescheduleDate(val)}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-[var(--border)]">
                      <button
                        onClick={() => setIsRescheduling(false)}
                        className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-xs"
                      >
                        Batal
                      </button>
                      <button
                        onClick={async () => {
                          const res = await upsertJadwalSesi({
                            id: selectedJadwalDetail.id,
                            tanggal_sesi: rescheduleDate,
                            status_sesi: 'terjadwal'
                          });
                          if (res.success) {
                            showToast('Jadwal sesi berhasil ditunda/reschedule!');
                            setIsRescheduling(false);
                            setSelectedJadwalDetail(null);
                            loadInstructorSchedule();
                          } else {
                            alert('Gagal reschedule: ' + res.error);
                          }
                        }}
                        className="px-4.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-sm"
                      >
                        Simpan Penundaan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setSelectedJadwalDetail(null);
                  setIsRescheduling(false);
                }}
                className="px-4 py-2 border border-[var(--border)] rounded-md font-semibold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA INSTALL MODAL (IOS & ANDROID UNIVERSAL) */}
      <PwaInstallModal
        appName="Portal Instruktur — Amanah Drive"
        appDescription="Jadwal mengemudi dan kontak siswa"
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onInstalled={() => showToast('Aplikasi instruktur berhasil dipasang!')}
      />

      {/* MINIMALIST POPUP INSTALL PWA */}
      {showPwaPopup && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--brand-primary)] shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                Pasang Aplikasi Instruktur
              </h4>
              <p className="text-[10px] text-[var(--text-secondary)]">Akses cepat di layar utama HP</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setShowPwaPopup(false);
                sessionStorage.setItem('pwa_prompt_dismissed', 'true');
              }}
              className="p-1.5 text-xs text-[var(--text-secondary)]"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowInstallModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl shadow-md transition-all flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Pasang</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
