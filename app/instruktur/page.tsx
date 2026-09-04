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
} from 'lucide-react';

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

  // Modals
  const [isGajiModalOpen, setIsGajiModalOpen] = React.useState(false);
  const [selectedJadwalDetail, setSelectedJadwalDetail] = React.useState<JadwalSesi | null>(null);
  const [isRescheduling, setIsRescheduling] = React.useState(false);
  const [rescheduleShiftDays, setRescheduleShiftDays] = React.useState<number>(1);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

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

  // 2. Load Schedule Data
  const loadInstructorSchedule = React.useCallback(async () => {
    if (!selectedInstrukturId) return;
    setLoadingSchedule(true);
    const [dayList, monthList] = await Promise.all([
      getJadwalByTanggal(selectedTanggal, selectedInstrukturId),
      getJadwalConflictCheckList(),
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadInstructorSchedule();
    setIsRefreshing(false);
    sound.playConfirmChime();
    showToast('Data jadwal berhasil diperbarui!');
  };

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

  const handleStatusChange = async (jadwalId: string, newStatus: 'terjadwal' | 'selesai' | 'batal') => {
    setIsUpdatingStatus(true);
    try {
      const res = await updateJadwalStatus(jadwalId, newStatus);
      if (res.success) {
        sound.playConfirmChime();
        showToast(`Status sesi berhasil diubah ke ${newStatus.toUpperCase()}!`);
        await loadInstructorSchedule();
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
        await loadInstructorSchedule();
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
          className="max-w-xl w-full border border-[var(--border)] bg-[var(--bg)] p-5 sm:p-8 space-y-6 shadow-2xl relative"
          style={{ borderRadius: 0 }}
        >
          {/* Header */}
          <div className="border-b border-[var(--border)] pb-4 text-center sm:text-left flex flex-col sm:flex-row items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="w-2 h-2 bg-emerald-500 animate-pulse" />
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
                    className="p-3 border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--brand-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center gap-3 text-left group"
                    style={{ borderRadius: 0 }}
                  >
                    <div className="relative w-12 h-14 bg-[var(--bg-subtle)] border border-[var(--border)] flex items-end justify-center overflow-hidden shrink-0">
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
                      <div className="font-mono text-[10px] text-[var(--text-muted)] uppercase">
                        ID: {ins.id.slice(0, 8)}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500" />
                        <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400">SIAP BERTUGAS</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)] text-center text-[11px] font-mono text-[var(--text-muted)]">
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
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 pb-28">
      {/* Toast Alert */}
      {toastMessage && (
        <div 
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 bg-emerald-800 text-white font-mono text-xs border border-emerald-600 shadow-2xl flex items-center gap-2 animate-in fade-in"
          style={{ borderRadius: 0 }}
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
            className="border border-[var(--border)] bg-[var(--bg)] p-3 sm:p-4 space-y-3"
            style={{ borderRadius: 0 }}
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
                  className="p-1 border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  style={{ borderRadius: 0 }}
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
                  className="p-1 border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  style={{ borderRadius: 0 }}
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
                <div key={`empty-${idx}`} className="h-10 bg-[var(--bg-subtle)] opacity-25" />
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
                    className={`h-10 p-1 border flex flex-col justify-between items-center transition-colors ${
                      isSelected
                        ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-light)] font-bold'
                        : hasSessions
                        ? 'border-[var(--brand-primary)]/40 bg-[var(--bg)] hover:border-[var(--brand-primary)]'
                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-zinc-400'
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    <span className={`font-mono text-[10px] ${isSunday ? 'text-rose-600 font-bold' : 'text-[var(--text-primary)]'}`}>
                      {dayNum}
                    </span>

                    {hasSessions ? (
                      <span className="px-1 py-0.2 font-mono text-[8px] font-bold bg-emerald-600 text-white truncate max-w-full">
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
              className="border border-[var(--border)] bg-[var(--bg)] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              style={{ borderRadius: 0 }}
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
              <div className="h-32 border border-[var(--border)] bg-[var(--bg)] flex items-center justify-center font-mono text-xs text-[var(--text-secondary)] animate-pulse">
                MEMUAT DAFTAR SESI...
              </div>
            ) : dailyJadwal.length === 0 ? (
              <div className="p-8 text-center border border-[var(--border)] bg-[var(--bg)] space-y-1">
                <span className="font-mono text-xs text-[var(--text-muted)] block">
                  TIDAK ADA JADWAL SESI UNTUK TANGGAL INI
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Gunakan kalender di atas untuk memeriksa tanggal lainnya.
                </span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dailyJadwal.map((jadwal) => {
                  const isDone = jadwal.status_sesi === 'selesai';
                  const isScheduled = jadwal.status_sesi === 'terjadwal';

                  return (
                    <div
                      key={jadwal.id}
                      className={`border p-3.5 transition-colors ${
                        isDone
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--brand-primary)]'
                      }`}
                      style={{ borderRadius: 0 }}
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

                        <span className={`font-mono text-[10px] px-1.5 py-0.5 border uppercase font-bold ${
                          isDone
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}>
                          {jadwal.status_sesi}
                        </span>
                      </div>

                      <div className="pt-2.5 space-y-2">
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

                        {/* Action Buttons Strip */}
                        <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)]">
                          {jadwal.siswa?.no_whatsapp && (
                            <a
                              href={getWhatsAppLink(jadwal.siswa.nama, jadwal.siswa.no_whatsapp)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => sound.playTactileClick()}
                              className="flex-1 py-1.5 px-2.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors hover:bg-emerald-500/20"
                              style={{ borderRadius: 0 }}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>HUBUNGI WA</span>
                            </a>
                          )}

                          <button
                            onClick={() => {
                              sound.playTactileClick();
                              setSelectedJadwalDetail(jadwal);
                              setIsRescheduling(false);
                            }}
                            className="py-1.5 px-3 border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-black/5 dark:hover:bg-white/5 font-mono text-xs font-semibold transition-colors"
                            style={{ borderRadius: 0 }}
                          >
                            KELOLA SESI
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
          <div className="border border-[var(--border)] bg-[var(--bg)] p-3.5">
            <span className="font-mono text-[10px] uppercase font-bold text-[var(--brand-primary)] tracking-wider block">
              Daftar Siswa Bimbingan
            </span>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Siswa yang terdaftar dalam jadwal latihan Anda bulan ini ({monthLabel})
            </p>
          </div>

          <div className="space-y-2">
            {monthlyJadwal.length === 0 ? (
              <div className="p-8 text-center border border-[var(--border)] bg-[var(--bg)] font-mono text-xs text-[var(--text-muted)]">
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
                    className="border border-[var(--border)] bg-[var(--bg)] p-3 flex items-center justify-between gap-3"
                    style={{ borderRadius: 0 }}
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
                        className="py-1.5 px-3 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-semibold flex items-center gap-1.5"
                        style={{ borderRadius: 0 }}
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

      {/* TAB CONTENT 3: KOMISI & GAJI */}
      {activeTab === 'gaji' && (
        <div className="space-y-4">
          <div className="border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3">
            <div className="border-b border-[var(--border)] pb-2.5 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-[var(--brand-primary)] tracking-wider block">
                  REKAPITULASI KOMISI INSTURKTUR
                </span>
                <h2 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                  Periode: {monthLabel}
                </h2>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                RATE: Rp 50.000/SESI
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 border border-[var(--border)] bg-[var(--bg-subtle)]">
                <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] block">Sesi Selesai</span>
                <span className="font-mono text-xl font-bold text-[var(--text-primary)] tabular-nums">{completedMonthCount}</span>
              </div>
              <div className="p-3 border border-emerald-500/30 bg-emerald-500/10">
                <span className="font-mono text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-semibold block">Total Komisi</span>
                <span className="font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatRupiah(completedMonthCount * 50000)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playTactileClick();
                setIsGajiModalOpen(true);
              }}
              className="w-full py-2.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-mono text-xs font-bold uppercase transition-colors"
              style={{ borderRadius: 0 }}
            >
              BUKA RINCIAN ESTIMASI GAJI LENGKAP
            </button>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: PROFIL */}
      {activeTab === 'profil' && (
        <div className="space-y-4">
          <div className="border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3">
            <span className="font-mono text-[10px] uppercase font-bold text-[var(--brand-primary)] tracking-wider block border-b border-[var(--border)] pb-2">
              Informasi Instruktur Bertugas
            </span>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">NAMA:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedInstruktur.nama}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">WHATSAPP:</span>
                <span className="text-[var(--text-primary)]">{selectedInstruktur.no_whatsapp || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--text-muted)]">ALAMAT:</span>
                <span className="text-[var(--text-primary)]">{selectedInstruktur.alamat || 'Palembang'}</span>
              </div>
              <div className="flex justify-between py-1">
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
              className="w-full mt-3 py-2 border border-rose-400 text-rose-600 hover:bg-rose-500 hover:text-white font-mono text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5"
              style={{ borderRadius: 0 }}
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

      {/* Session Action & Reschedule Modal */}
      {selectedJadwalDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div 
            className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] shadow-2xl p-4 space-y-4"
            style={{ borderRadius: 0 }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <span className="font-mono text-xs font-bold uppercase text-[var(--text-primary)]">
                Kelola Sesi Mengemudi
              </span>
              <button
                onClick={() => {
                  sound.playTactileClick();
                  setSelectedJadwalDetail(null);
                  setIsRescheduling(false);
                }}
                className="p-1 border border-[var(--border)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 font-mono text-xs">
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

            {/* Change Status Buttons */}
            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] block font-semibold">
                Ubah Status Sesi
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange(selectedJadwalDetail.id, 'selesai')}
                  className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold uppercase transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  TANDAI SELESAI
                </button>
                <button
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange(selectedJadwalDetail.id, 'batal')}
                  className="py-2 border border-rose-400 text-rose-600 hover:bg-rose-500 hover:text-white font-mono text-xs font-bold uppercase transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  BATALKAN SESI
                </button>
              </div>
            </div>

            {/* Cascade Reschedule Section */}
            <div className="pt-2 border-t border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase text-[var(--text-muted)] font-semibold">
                  Mundurkan Jadwal (Shift Cascade)
                </span>
                <button
                  onClick={() => setIsRescheduling(!isRescheduling)}
                  className="font-mono text-[10px] text-[var(--brand-primary)] underline"
                >
                  {isRescheduling ? 'Tutup' : 'Buka Opsi'}
                </button>
              </div>

              {isRescheduling && (
                <div className="space-y-2.5 p-2.5 bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <span className="text-[11px] text-[var(--text-secondary)] block">
                    Geser sesi ini dan seluruh sesi setelahnya:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRescheduleShiftDays(Math.max(1, rescheduleShiftDays - 1))}
                      className="w-7 h-7 border border-[var(--border)] font-bold"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-xs">+{rescheduleShiftDays} Hari</span>
                    <button
                      onClick={() => setRescheduleShiftDays(rescheduleShiftDays + 1)}
                      className="w-7 h-7 border border-[var(--border)] font-bold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    disabled={isUpdatingStatus}
                    onClick={handleExecuteCascadeShift}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs font-bold uppercase"
                    style={{ borderRadius: 0 }}
                  >
                    EKSEKUSI RESCHEDULE
                  </button>
                </div>
              )}
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
