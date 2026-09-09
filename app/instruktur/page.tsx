'use client';

import React from 'react';
import Image from 'next/image';
import { Staff, JadwalSesi } from '@/types/database';
import { getInstrukturList } from '@/lib/actions/master-data';
import {
  getJadwalByTanggal,
  getJadwalConflictCheckList,
  updateJadwalStatus,
  rescheduleSesiShiftCascade,
  getRekapMingguanInstruktur,
  RekapMingguanInstrukturResult,
} from '@/lib/actions/jadwal';
import {
  getTodayDateString,
  formatDateIndo,
  formatHariTanggalIndo,
  formatTime24,
  addDaysToDateStr,
} from '@/lib/utils/date';
import { formatRupiah } from '@/lib/utils/currency';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { sound } from '@/lib/sound/SoundFX';
import { HeroInstructorCockpit } from '@/components/instruktur/HeroInstructorCockpit';
import { EstimasiGajiModal } from '@/components/instruktur/EstimasiGajiModal';
import { FloatingInstructorNav } from '@/components/instruktur/FloatingInstructorNav';
import { useAppRefresh, triggerAppRefresh } from '@/lib/utils/refresh-event';
import { purgeServerCache } from '@/lib/actions/cache';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LogOut,
  Clock,
  Check,
  X,
  MessageCircle,
  MapPin,
  Car,
  UserCheck,
  ShieldCheck,
  Wallet,
  Phone,
  ArrowRight,
  AlertTriangle,
  Utensils,
  Sparkles,
} from 'lucide-react';

const STAFF_KODE_MAP: Record<string, string> = {
  Lia: 'AM-001',
  Syawal: 'AM-003',
  Alfi: 'AM-004',
  Alpi: 'AM-005',
  Risky: 'AM-006',
};

const MONTH_NAMES_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function InstrukturPortalPage() {
  const [instrukturList, setInstrukturList] = React.useState<Staff[]>([]);
  const [selectedInstrukturId, setSelectedInstrukturId] = React.useState<string>('');
  const [selectedInstruktur, setSelectedInstruktur] = React.useState<Staff | null>(null);
  const [loadingInstruktur, setLoadingInstruktur] = React.useState(true);

  // Active PWA Tab
  const [activeTab, setActiveTab] = React.useState<'jadwal' | 'siswa' | 'gaji' | 'profil'>('jadwal');

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

  // Modals & State
  const [isGajiModalOpen, setIsGajiModalOpen] = React.useState(false);
  const [selectedJadwalDetail, setSelectedJadwalDetail] = React.useState<JadwalSesi | null>(null);
  const [confirmHangusJadwal, setConfirmHangusJadwal] = React.useState<JadwalSesi | null>(null);
  const [isRescheduling, setIsRescheduling] = React.useState(false);
  const [rescheduleShiftDays, setRescheduleShiftDays] = React.useState<number>(1);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  // Weekly Recap State (Sunday to Saturday)
  const [weeklyRecap, setWeeklyRecap] = React.useState<RekapMingguanInstrukturResult | null>(null);
  const [weeklyAnchorDate, setWeeklyAnchorDate] = React.useState<string>(getTodayDateString());
  const [loadingWeeklyRecap, setLoadingWeeklyRecap] = React.useState(false);

  const scheduleRef = React.useRef<HTMLDivElement | null>(null);

  // 1. Initial Load Instruktur List
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

  // 2. Load Schedule Data (Strictly sorted by Slot urutan ASC)
  const loadInstructorSchedule = React.useCallback(async () => {
    if (!selectedInstrukturId) return;
    setLoadingSchedule(true);
    const [dayList, monthList] = await Promise.all([
      getJadwalByTanggal(selectedTanggal, selectedInstrukturId),
      getJadwalConflictCheckList(),
    ]);

    // Ensure session order strictly starts from Slot 1 (09:00 WIB)
    const sortedDayList = [...dayList].sort((a, b) => {
      const urutanA = a.slot_waktu?.urutan ?? 99;
      const urutanB = b.slot_waktu?.urutan ?? 99;
      if (urutanA !== urutanB) return urutanA - urutanB;
      return (a.nomor_sesi_ke || 1) - (b.nomor_sesi_ke || 1);
    });

    setDailyJadwal(sortedDayList);
    const insMonthJadwal = monthList.filter(
      (j) => j.staff_id === selectedInstrukturId && j.status_sesi !== 'batal'
    );
    setMonthlyJadwal(insMonthJadwal);
    setLoadingSchedule(false);
  }, [selectedInstrukturId, selectedTanggal]);

  // 3. Load Weekly Recap (Minggu s/d Sabtu)
  const loadWeeklyRecap = React.useCallback(async (targetDate?: string) => {
    if (!selectedInstrukturId) return;
    const dateToUse = targetDate || weeklyAnchorDate;
    setLoadingWeeklyRecap(true);
    try {
      const data = await getRekapMingguanInstruktur(selectedInstrukturId, dateToUse);
      setWeeklyRecap(data);
    } catch (err) {
      console.error('Error loading weekly recap:', err);
    } finally {
      setLoadingWeeklyRecap(false);
    }
  }, [selectedInstrukturId, weeklyAnchorDate]);

  React.useEffect(() => {
    loadInstructorSchedule();
  }, [loadInstructorSchedule]);

  React.useEffect(() => {
    if (selectedInstrukturId) {
      loadWeeklyRecap();
    }
  }, [selectedInstrukturId, loadWeeklyRecap]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await purgeServerCache();
      await Promise.all([
        loadInstructorSchedule(),
        loadWeeklyRecap(),
      ]);
      triggerAppRefresh();
      sound.playConfirmChime();
      showToast('Data jadwal & rekap mingguan berhasil disinkronkan!');
    } catch (err) {
      console.error('Error refreshing instructor schedule:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useAppRefresh(handleManualRefresh);

  const handleSelectInstruktur = (id: string) => {
    sound.playTactileClick();
    setSelectedInstrukturId(id);
    const ins = instrukturList.find((i) => i.id === id) || null;
    setSelectedInstruktur(ins);
    localStorage.setItem('amanah_instruktur_id', id);
  };

  const handleLogoutInstruktur = () => {
    sound.playTactileClick();
    localStorage.removeItem('amanah_instruktur_id');
    setSelectedInstrukturId('');
    setSelectedInstruktur(null);
  };

  const handleStatusChange = async (jadwalId: string, newStatus: 'terjadwal' | 'selesai' | 'batal', catatan?: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await updateJadwalStatus(jadwalId, newStatus, catatan);
      if (res.success) {
        sound.playConfirmChime();
        showToast(`Status sesi berhasil diubah ke ${newStatus.toUpperCase()}!`);
        await Promise.all([
          loadInstructorSchedule(),
          loadWeeklyRecap(),
        ]);
        setSelectedJadwalDetail(null);
      } else {
        alert('Gagal update status: ' + res.error);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExecuteCascadeShift = async () => {
    if (!selectedJadwalDetail?.siswa_id || !selectedJadwalDetail?.nomor_sesi_ke) return;
    setIsUpdatingStatus(true);
    try {
      const res = await rescheduleSesiShiftCascade(
        selectedJadwalDetail.siswa_id,
        selectedJadwalDetail.nomor_sesi_ke,
        rescheduleShiftDays
      );
      if (res.success) {
        sound.playConfirmChime();
        showToast(`Berhasil memundurkan sesi sebanyak +${rescheduleShiftDays} hari!`);
        await Promise.all([
          loadInstructorSchedule(),
          loadWeeklyRecap(),
        ]);
        setIsRescheduling(false);
        setSelectedJadwalDetail(null);
      } else {
        alert('Gagal reschedule: ' + res.error);
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getWhatsAppLink = (siswaNama: string, siswaPhone: string) => {
    const firstNameSiswa = siswaNama.trim().split(' ')[0];
    const firstNameInstruktur = selectedInstruktur?.nama.trim().split(' ')[0] || 'Instruktur';

    let cleanPhone = siswaPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const defaultMsg = `Halo Kak ${firstNameSiswa}, saya instruktur ${firstNameInstruktur} dari Amanah Drive. Mengingatkan jadwal latihan kita hari ini. Mohon bersiap ya, terima kasih!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMsg)}`;
  };

  // Loading State
  if (loadingInstruktur) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-subtle)]">
        <div className="flex items-center gap-3 font-mono text-xs font-bold text-[var(--brand-primary)]">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>INITIALIZING AMANAH FLEET CONSOLE...</span>
        </div>
      </div>
    );
  }

  // 1. LOGIN / SELECT INSTRUCTOR (Industrial Cockpit Console with staff model cutouts)
  if (!selectedInstruktur) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-[var(--bg-subtle)] text-[var(--text-primary)]">
        <div 
          className="max-w-xl w-full liquid-glass-card border border-[var(--liquid-glass-border)] rounded-3xl p-5 sm:p-8 space-y-6 shadow-2xl relative"
        >
          {/* Header */}
          <div className="border-b border-[var(--liquid-glass-border)] pb-4 text-center sm:text-left flex flex-col sm:flex-row items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--brand-primary)] font-bold">
                  PORTAL OPERASIONAL PWA
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mt-1">
                Amanah Drive Fleet Dispatch
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Pilih profil instruktur bertugas untuk sinkronisasi jadwal
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* Instructor Badges Grid */}
          <div className="space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold block">
              Daftar Instruktur Aktif
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {instrukturList.map((ins) => {
                const photoSrc = ins.foto_url || `/staff_models/${ins.nama}.png`;
                return (
                  <button
                    key={ins.id}
                    onClick={() => handleSelectInstruktur(ins.id)}
                    className="p-3.5 border border-[var(--liquid-glass-border)] bg-white/50 dark:bg-white/5 rounded-2xl hover:border-[var(--brand-primary)] hover:bg-white/80 dark:hover:bg-white/10 transition-all flex items-center gap-3 text-left group shadow-xs active:scale-98"
                  >
                    <div className="relative w-12 h-14 flex items-end justify-center shrink-0">
                      <Image
                        src={photoSrc}
                        alt={ins.nama}
                        fill
                        sizes="48px"
                        className="object-contain object-bottom"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors truncate">
                        {ins.nama}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase font-semibold">
                        ID: {ins.kode_staff || STAFF_KODE_MAP[ins.nama] || ins.id.slice(0, 8)}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="font-mono text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">SIAP BERTUGAS</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--liquid-glass-border)] text-center text-[11px] font-mono text-[var(--text-muted)]">
            Amanah Drive Management • Palembang Fleet Unit
          </div>
        </div>
      </div>
    );
  }

  // Calculations for Cockpit Telemetry
  const totalToday = dailyJadwal.length;
  const completedToday = dailyJadwal.filter((j) => j.status_sesi === 'selesai').length;
  const upcomingToday = dailyJadwal.find((j) => j.status_sesi === 'terjadwal');
  const nextSessionTime = upcomingToday?.slot_waktu?.jam_mulai ? `${upcomingToday.slot_waktu.jam_mulai} WIB` : undefined;
  const nextStudentName = upcomingToday?.siswa?.nama;

  // Monthly completed
  const completedMonthList = monthlyJadwal.filter((j) => j.status_sesi === 'selesai');
  const completedMonthCount = completedMonthList.length;

  // Calendar dates
  const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
  const monthLabel = `${MONTH_NAMES_INDO[calCurrentMonth]} ${calCurrentYear}`;

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 pb-32">
      {/* Toast Alert */}
      {toastMessage && (
        <div 
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 bg-emerald-800 text-white font-mono text-xs border border-emerald-600 shadow-2xl rounded-xl flex items-center gap-2 animate-in fade-in"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Hero Instructor Cockpit with Photo & Rapid Actions */}
      <HeroInstructorCockpit
        staff={selectedInstruktur}
        totalToday={totalToday}
        completedToday={completedToday}
        nextSessionTime={nextSessionTime}
        nextStudentName={nextStudentName}
        nextStudentPhone={upcomingToday?.siswa?.no_whatsapp}
        onOpenGajiModal={() => setIsGajiModalOpen(true)}
        onScrollToSchedule={() => {
          setActiveTab('jadwal');
          scheduleRef.current?.scrollIntoView({ behavior: 'smooth' });
        }}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        onLogout={handleLogoutInstruktur}
      />

      {/* TAB CONTENT 1: JADWAL & KALENDER */}
      {activeTab === 'jadwal' && (
        <div ref={scheduleRef} className="space-y-4">
          {/* Mini Calendar Month Grid */}
          <section 
            className="liquid-glass-card rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />
                <h2 className="text-xs font-mono font-bold uppercase text-[var(--text-primary)]">
                  Jadwal Bulanan ({monthLabel})
                </h2>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    sound.playMechanicalTick();
                    if (calCurrentMonth === 0) {
                      setCalCurrentMonth(11);
                      setCalCurrentYear(calCurrentYear - 1);
                    } else {
                      setCalCurrentMonth(calCurrentMonth - 1);
                    }
                  }}
                  className="p-1.5 border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    sound.playMechanicalTick();
                    if (calCurrentMonth === 11) {
                      setCalCurrentMonth(0);
                      setCalCurrentYear(calCurrentYear + 1);
                    } else {
                      setCalCurrentMonth(calCurrentMonth + 1);
                    }
                  }}
                  className="p-1.5 border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-bold text-[var(--text-secondary)] uppercase">
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
                <div key={`empty-${idx}`} className="h-10 bg-[var(--bg-subtle)] rounded-xl opacity-25" />
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

                return (
                  <button
                    key={cellDateStr}
                    onClick={() => {
                      sound.playMechanicalTick();
                      setSelectedTanggal(cellDateStr);
                    }}
                    className={`h-10 p-1 border rounded-xl flex flex-col justify-between items-center transition-all ${
                      isSelected
                        ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-light)] font-bold shadow-xs'
                        : hasSessions
                        ? 'border-[var(--brand-primary)]/40 bg-[var(--bg)] hover:border-[var(--brand-primary)]'
                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-zinc-400'
                    }`}
                  >
                    <span className={`font-mono text-[10px] ${isSunday ? 'text-rose-600 font-bold' : 'text-[var(--text-primary)]'}`}>
                      {dayNum}
                    </span>

                    {hasSessions ? (
                      <span className="px-1 py-0.2 rounded-md font-mono text-[8px] font-bold bg-emerald-600 text-white truncate max-w-full">
                        {dateSessions.length} Sesi
                      </span>
                    ) : (
                      <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-30">-</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Daily Schedule List Section */}
          <section className="space-y-3">
            <div 
              className="border border-[var(--border)] bg-[var(--bg)] rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            >
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-[var(--brand-primary)] tracking-wider block">
                  Jadwal Sesi Terpilih
                </span>
                <h2 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                  {formatHariTanggalIndo(selectedTanggal)}
                </h2>
              </div>

              <div className="w-full sm:w-44">
                <DatePickerWIB
                  value={selectedTanggal}
                  onChange={(val) => {
                    sound.playMechanicalTick();
                    setSelectedTanggal(val);
                  }}
                />
              </div>
            </div>

            {loadingSchedule ? (
              <div className="h-32 border border-[var(--border)] bg-[var(--bg)] rounded-2xl flex items-center justify-center font-mono text-xs text-[var(--text-secondary)] animate-pulse">
                MEMUAT DAFTAR SESI...
              </div>
            ) : dailyJadwal.length === 0 ? (
              <div className="p-8 text-center border border-[var(--border)] bg-[var(--bg)] rounded-2xl space-y-1 shadow-xs">
                <span className="font-mono text-xs text-[var(--text-muted)] block">
                  TIDAK ADA JADWAL SESI UNTUK TANGGAL INI
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Gunakan kalender di atas untuk memeriksa tanggal lainnya.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                {dailyJadwal.map((jadwal) => {
                  const isDone = jadwal.status_sesi === 'selesai';
                  const isBatal = jadwal.status_sesi === 'batal';

                  return (
                    <div
                      key={jadwal.id}
                      className={`border rounded-2xl p-4 shadow-xs transition-all ${
                        isDone
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : isBatal
                          ? 'border-rose-500/30 bg-rose-500/5 opacity-80'
                          : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--brand-primary)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[var(--brand-primary)]">
                            Slot {jadwal.slot_waktu?.urutan || 1}: {jadwal.slot_waktu?.nama_slot}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-muted)]">
                            ({jadwal.slot_waktu?.jam_mulai} - {jadwal.slot_waktu?.jam_selesai})
                          </span>
                        </div>

                        <span className={`font-mono text-[10px] px-2 py-0.5 rounded-lg border uppercase font-bold ${
                          isDone
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : isBatal
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}>
                          {isBatal ? 'HANGUS' : jadwal.status_sesi}
                        </span>
                      </div>

                      <div className="pt-2.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-[var(--text-muted)] font-mono block">Siswa</span>
                            <span className="text-sm font-bold text-[var(--text-primary)]">
                              {jadwal.siswa?.nama || 'Siswa'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-[var(--text-muted)] font-mono block">Progress</span>
                            <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                              Sesi {jadwal.nomor_sesi_ke} / {jadwal.siswa?.paket?.jumlah_sesi || '-'}
                            </span>
                          </div>
                        </div>

                        {jadwal.kendaraan && (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-secondary)]">
                            <Car className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                            <span>Armada: {jadwal.kendaraan.nama_kendaraan} ({jadwal.kendaraan.plat_nomor})</span>
                          </div>
                        )}

                        {/* 4 Action Buttons Directly Outside on Card */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border)]">
                          {/* 1. Hubungi Siswa */}
                          {jadwal.siswa?.no_whatsapp ? (
                            <a
                              href={getWhatsAppLink(jadwal.siswa.nama, jadwal.siswa.no_whatsapp)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => sound.playTactileClick()}
                              className="py-2 px-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-98"
                              title="Hubungi Siswa via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">Hubungi Siswa</span>
                            </a>
                          ) : (
                            <button
                              disabled
                              className="py-2 px-2.5 rounded-xl border border-dashed border-[var(--border)] text-[var(--text-muted)] opacity-50 font-mono text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                            >
                              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">No WA (-)</span>
                            </button>
                          )}

                          {/* 2. Sesi Selesai */}
                          <button
                            disabled={isUpdatingStatus}
                            onClick={() => {
                              sound.playConfirmChime();
                              handleStatusChange(jadwal.id, isDone ? 'terjadwal' : 'selesai');
                            }}
                            className={`py-2 px-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-98 ${
                              isDone
                                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                            title={isDone ? 'Klik untuk membatalkan status selesai' : 'Tandai sesi ini Selesai'}
                          >
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{isDone ? 'Selesai ✓' : 'Sesi Selesai'}</span>
                          </button>

                          {/* 3. Sesi Hangus */}
                          <button
                            disabled={isUpdatingStatus}
                            onClick={() => {
                              sound.playTactileClick();
                              setConfirmHangusJadwal(jadwal);
                            }}
                            className={`py-2 px-2.5 rounded-xl border font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-98 ${
                              isBatal
                                ? 'border-rose-500/60 bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                : 'border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                            }`}
                            title="Tandai Sesi Hangus / Batal"
                          >
                            <X className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{isBatal ? 'Hangus' : 'Sesi Hangus'}</span>
                          </button>

                          {/* 4. Sesi Reschedule */}
                          <button
                            onClick={() => {
                              sound.playTactileClick();
                              setSelectedJadwalDetail(jadwal);
                              setIsRescheduling(true);
                            }}
                            className="py-2 px-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-98"
                            title="Reschedule / Mundurkan Jadwal Sesi"
                          >
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Reschedule</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB CONTENT 2: SISWA SAYA */}
      {activeTab === 'siswa' && (
        <div className="space-y-3">
          <div className="border border-[var(--border)] bg-[var(--bg)] rounded-2xl p-4 shadow-xs">
            <span className="font-mono text-[10px] uppercase font-bold text-[var(--brand-primary)] tracking-wider block">
              Daftar Siswa Bimbingan
            </span>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Siswa yang terdaftar dalam jadwal latihan Anda bulan ini ({monthLabel})
            </p>
          </div>

          <div className="space-y-2.5">
            {monthlyJadwal.length === 0 ? (
              <div className="p-8 text-center border border-[var(--border)] bg-[var(--bg)] rounded-2xl font-mono text-xs text-[var(--text-muted)] shadow-xs">
                Belum ada siswa bimbingan pada periode ini.
              </div>
            ) : (
              Array.from(new Set(monthlyJadwal.map((j) => j.siswa_id))).map((siswaId) => {
                const siswaSessions = monthlyJadwal.filter((j) => j.siswa_id === siswaId);
                const firstSession = siswaSessions[0];
                const siswaName = firstSession?.siswa?.nama || 'Siswa';
                const siswaPhone = firstSession?.siswa?.no_whatsapp;

                return (
                  <div
                    key={siswaId}
                    className="border border-[var(--border)] bg-[var(--bg)] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <span className="font-bold text-sm text-[var(--text-primary)] block">
                        {siswaName}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        {siswaSessions.length} Sesi Terjadwal • Paket: {firstSession?.siswa?.paket?.nama_paket || 'Standar'}
                      </span>
                    </div>

                    {siswaPhone && (
                      <a
                        href={getWhatsAppLink(siswaName, siswaPhone)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => sound.playTactileClick()}
                        className="py-1.5 px-3 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors hover:bg-emerald-500/20"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WA</span>
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: KOMISI & ESTIMASI GAJI MINGGUAN */}
      {activeTab === 'gaji' && (
        <div className="space-y-4">
          {/* Week Navigator Strip */}
          <div className="border border-[var(--border)] bg-[var(--bg)] rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2 shadow-xs">
            <button
              onClick={() => {
                sound.playMechanicalTick();
                const prev = addDaysToDateStr(weeklyAnchorDate, -7);
                setWeeklyAnchorDate(prev);
                loadWeeklyRecap(prev);
              }}
              className="p-2 border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors font-mono text-xs flex items-center gap-1"
              title="Minggu Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Pekan Lalu</span>
            </button>

            <div className="text-center min-w-0 flex-1 px-1">
              <span className="font-mono text-[10px] uppercase font-bold text-[var(--brand-primary)] tracking-wider block">
                SIKLUS MINGGUAN (MIN - SAB)
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate block mt-0.5">
                {weeklyRecap?.periodeLabel || 'Memuat...'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  sound.playMechanicalTick();
                  const next = addDaysToDateStr(weeklyAnchorDate, 7);
                  setWeeklyAnchorDate(next);
                  loadWeeklyRecap(next);
                }}
                className="p-2 border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors font-mono text-xs flex items-center gap-1"
                title="Minggu Berikutnya"
              >
                <span className="hidden sm:inline">Pekan Depan</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  sound.playTactileClick();
                  const today = getTodayDateString();
                  setWeeklyAnchorDate(today);
                  loadWeeklyRecap(today);
                }}
                className="px-2.5 py-1.5 border border-[var(--brand-primary)]/40 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-light)] rounded-xl transition-colors font-mono text-xs font-semibold"
                title="Kembali ke Pekan Ini"
              >
                Hari Ini
              </button>
            </div>
          </div>

          {/* Main Weekly Salary Card */}
          <div className="liquid-glass border border-[var(--liquid-glass-border)] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider block">
                  ESTIMASI GAJI PEKAN INI
                </span>
                <h2 className="text-2xl sm:text-3xl font-mono font-bold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {formatRupiah(weeklyRecap?.totalGajiMingguan || 0)}
                </h2>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Total komisi sesi latihan dan uang makan harian
                </span>
              </div>
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <Wallet className="w-6 h-6" />
              </div>
            </div>

            {/* 3 Telemetry Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Fee Operasional */}
              <div className="p-3.5 border border-[var(--border)] bg-white/40 dark:bg-white/5 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] font-semibold">
                    Sesi Operasional
                  </span>
                  <Car className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="font-mono text-base font-bold text-[var(--text-primary)] tabular-nums">
                  {formatRupiah(weeklyRecap?.feeOperasionalTotal || 0)}
                </div>
                <div className="text-[10px] font-mono text-[var(--text-secondary)]">
                  {weeklyRecap?.operasionalCount || 0} sesi × {formatRupiah(weeklyRecap?.rates.feeOperasional || 50000)}
                </div>
              </div>

              {/* Fee Mobil Sendiri */}
              <div className="p-3.5 border border-[var(--border)] bg-white/40 dark:bg-white/5 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] font-semibold">
                    Mobil Sendiri
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="font-mono text-base font-bold text-[var(--text-primary)] tabular-nums">
                  {formatRupiah(weeklyRecap?.feePribadiTotal || 0)}
                </div>
                <div className="text-[10px] font-mono text-[var(--text-secondary)]">
                  {weeklyRecap?.pribadiCount || 0} sesi × {formatRupiah(weeklyRecap?.rates.feePribadi || 70000)}
                </div>
              </div>

              {/* Uang Makan */}
              <div className="p-3.5 border border-[var(--border)] bg-white/40 dark:bg-white/5 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] font-semibold">
                    Uang Makan Harian
                  </span>
                  <Utensils className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatRupiah(weeklyRecap?.uangMakanTotal || 0)}
                </div>
                <div className="text-[10px] font-mono text-[var(--text-secondary)]">
                  {weeklyRecap?.activeDaysCount || 0} hari aktif × {formatRupiah(weeklyRecap?.rates.uangMakanHarian || 15000)}
                </div>
              </div>
            </div>

            {/* Button to open complete popup modal */}
            <button
              onClick={() => {
                sound.playTactileClick();
                setIsGajiModalOpen(true);
              }}
              className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-mono text-xs font-bold uppercase rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Wallet className="w-4 h-4" />
              <span>BUKA RINCIAN & REKAP BULANAN LENGKAP</span>
            </button>
          </div>

          {/* Sesi Selesai Pekan Ini */}
          <div className="border border-[var(--border)] bg-[var(--bg)] rounded-3xl p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="border-b border-[var(--border)] pb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase text-[var(--text-primary)]">
                Daftar Sesi Selesai Pekan Ini ({weeklyRecap?.totalSesi || 0} Sesi)
              </span>
            </div>

            {loadingWeeklyRecap ? (
              <div className="p-6 text-center font-mono text-xs text-[var(--text-muted)] animate-pulse">
                MEMUAT REKAP SESI PEKAN INI...
              </div>
            ) : !weeklyRecap?.completedList || weeklyRecap.completedList.length === 0 ? (
              <div className="p-6 text-center font-mono text-xs text-[var(--text-muted)]">
                Belum ada sesi selesai pada siklus mingguan ini.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {weeklyRecap.completedList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border border-[var(--border)] bg-white/40 dark:bg-white/5 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">
                        {item.siswa?.nama || 'Siswa'}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">
                        {formatDateIndo(item.tanggal_sesi)} • Slot {item.slot_waktu?.urutan || 1} ({item.slot_waktu?.jam_mulai} - {item.slot_waktu?.jam_selesai})
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded-lg border font-semibold ${
                        item.tipe_kendaraan === 'pribadi' || item.jenis_mobil === 'mobil_sendiri'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}>
                        {item.tipe_kendaraan === 'pribadi' || item.jenis_mobil === 'mobil_sendiri' ? 'Pribadi' : 'Operasional'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: PROFIL */}
      {activeTab === 'profil' && (
        <div className="space-y-4">
          <div className="border border-[var(--border)] bg-[var(--bg)] rounded-3xl p-5 space-y-3 shadow-xs">
            <span className="font-mono text-[10px] uppercase font-bold text-[var(--brand-primary)] tracking-wider block border-b border-[var(--border)] pb-2">
              Informasi Instruktur Bertugas
            </span>
            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">ID INSTRUKTUR:</span>
                <span className="font-bold text-[var(--brand-primary)]">
                  {selectedInstruktur.kode_staff || STAFF_KODE_MAP[selectedInstruktur.nama] || 'AM-00'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">NAMA:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedInstruktur.nama}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">WHATSAPP:</span>
                <span className="text-[var(--text-primary)]">{selectedInstruktur.no_whatsapp || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">ALAMAT:</span>
                <span className="text-[var(--text-primary)]">{selectedInstruktur.alamat || 'Palembang'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[var(--text-muted)]">STATUS KONSOL:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">TERKONEKSI REALTIME</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)] font-medium">Pengaturan Tema</span>
              <ThemeToggle />
            </div>

            <button
              onClick={handleLogoutInstruktur}
              className="w-full mt-3 py-2.5 border border-rose-400 text-rose-600 hover:bg-rose-500 hover:text-white font-mono text-xs font-bold uppercase rounded-2xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>GANTI PROFIL INSTRUKTUR</span>
            </button>
          </div>
        </div>
      )}

      {/* Estimasi Gaji Modal */}
      <EstimasiGajiModal
        isOpen={isGajiModalOpen}
        onClose={() => setIsGajiModalOpen(false)}
        staff={selectedInstruktur}
        completedSessionsCount={completedMonthCount}
        completedList={completedMonthList}
        monthLabel={monthLabel}
      />

      {/* Confirm Sesi Hangus Modal */}
      {confirmHangusJadwal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-[var(--bg)] border border-[var(--border)] rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm font-brand">Konfirmasi Sesi Hangus</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Apakah Anda yakin ingin menandai sesi untuk <strong className="text-[var(--text-primary)]">{confirmHangusJadwal.siswa?.nama}</strong> (Slot {confirmHangusJadwal.slot_waktu?.urutan}) sebagai <strong className="text-rose-600">HANGUS / BATAL</strong>?
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setConfirmHangusJadwal(null)}
                className="py-2 px-3 border border-[var(--border)] rounded-xl font-mono text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Batal
              </button>
              <button
                disabled={isUpdatingStatus}
                onClick={async () => {
                  await handleStatusChange(confirmHangusJadwal.id, 'batal', 'Sesi Hangus / Batal');
                  setConfirmHangusJadwal(null);
                }}
                className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-mono text-xs font-bold transition-colors shadow-xs"
              >
                Ya, Sesi Hangus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Action & Reschedule Modal */}
      {selectedJadwalDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div 
            className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-3xl shadow-2xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <span className="font-mono text-xs font-bold uppercase text-[var(--text-primary)]">
                Reschedule Sesi Mengemudi
              </span>
              <button
                onClick={() => {
                  sound.playTactileClick();
                  setSelectedJadwalDetail(null);
                  setIsRescheduling(false);
                }}
                className="p-1.5 border border-[var(--border)] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 font-mono text-xs bg-[var(--bg-subtle)] p-3 rounded-2xl border border-[var(--border)]">
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {selectedJadwalDetail.siswa?.nama}
              </div>
              <div className="text-[var(--text-muted)]">
                Slot {selectedJadwalDetail.slot_waktu?.urutan}: {selectedJadwalDetail.slot_waktu?.nama_slot} ({selectedJadwalDetail.slot_waktu?.jam_mulai} - {selectedJadwalDetail.slot_waktu?.jam_selesai})
              </div>
              <div className="text-[var(--text-muted)]">
                Tanggal: {formatHariTanggalIndo(selectedJadwalDetail.tanggal_sesi)}
              </div>
            </div>

            {/* Cascade Reschedule Section */}
            <div className="space-y-3">
              <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] font-semibold block">
                Mundurkan Jadwal Sesi (Shift Cascade)
              </span>

              <div className="space-y-3 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                <span className="text-[11px] text-[var(--text-secondary)] block">
                  Geser sesi ini dan seluruh sesi setelahnya sebanyak:
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRescheduleShiftDays(Math.max(1, rescheduleShiftDays - 1))}
                    className="w-8 h-8 border border-[var(--border)] bg-[var(--bg)] rounded-xl font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-sm text-[var(--text-primary)] px-2">+{rescheduleShiftDays} Hari</span>
                  <button
                    onClick={() => setRescheduleShiftDays(rescheduleShiftDays + 1)}
                    className="w-8 h-8 border border-[var(--border)] bg-[var(--bg)] rounded-xl font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    +
                  </button>
                </div>
                <button
                  disabled={isUpdatingStatus}
                  onClick={handleExecuteCascadeShift}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs font-bold uppercase rounded-xl transition-colors shadow-xs"
                >
                  EKSEKUSI RESCHEDULE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Floating Bottom Navigation Dock */}
      <FloatingInstructorNav
        currentTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        todaySessionsCount={dailyJadwal.filter((j) => j.status_sesi === 'terjadwal').length}
      />
    </div>
  );
}
