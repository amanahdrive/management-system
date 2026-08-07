'use client';

import React from 'react';
import { Staff, JadwalSesi } from '@/types/database';
import { getInstrukturList } from '@/lib/actions/master-data';
import { getJadwalByTanggal, getJadwalByBulan } from '@/lib/actions/jadwal';
import { getTodayDateString, formatDateIndo, formatHariTanggalIndo } from '@/lib/utils/date';
import { DatePickerWIB } from '@/components/shared/DatePickerWIB';
import {
  Calendar,
  UserCheck,
  MessageSquare,
  MapPin,
  Phone,
  Car,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LogOut,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';

const MONTH_NAMES_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function InstrukturPortalPage() {
  const [instrukturList, setInstrukturList] = React.useState<Staff[]>([]);
  const [selectedInstrukturId, setSelectedInstrukturId] = React.useState<string>('');
  const [selectedInstruktur, setSelectedInstruktur] = React.useState<Staff | null>(null);
  const [loadingInstruktur, setLoadingInstruktur] = React.useState(true);

  // Calendar & Date State
  const [selectedTanggal, setSelectedTanggal] = React.useState<string>(getTodayDateString());
  const [calCurrentYear, setCalCurrentYear] = React.useState(new Date().getFullYear());
  const [calCurrentMonth, setCalCurrentMonth] = React.useState(new Date().getMonth());

  // Schedule Data State
  const [dailyJadwal, setDailyJadwal] = React.useState<JadwalSesi[]>([]);
  const [monthlyJadwal, setMonthlyJadwal] = React.useState<JadwalSesi[]>([]);
  const [loadingSchedule, setLoadingSchedule] = React.useState(false);

  // Student Detail Modal State
  const [selectedJadwalDetail, setSelectedJadwalDetail] = React.useState<JadwalSesi | null>(null);

  // 1. Initial Load Instruktur List & Saved LocalStorage Selection
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

  // 2. Load Daily & Monthly Schedule for Selected Instructor
  const loadInstructorSchedule = React.useCallback(async () => {
    if (!selectedInstrukturId) return;
    setLoadingSchedule(true);
    const [dayList, monthList] = await Promise.all([
      getJadwalByTanggal(selectedTanggal, selectedInstrukturId),
      getJadwalByBulan(calCurrentYear, calCurrentMonth),
    ]);

    setDailyJadwal(dayList);
    // Filter monthly schedule specifically for this instructor
    const insMonthJadwal = monthList.filter(
      (j) => j.staff_id === selectedInstrukturId && j.status_sesi !== 'batal'
    );
    setMonthlyJadwal(insMonthJadwal);
    setLoadingSchedule(false);
  }, [selectedInstrukturId, selectedTanggal, calCurrentYear, calCurrentMonth]);

  React.useEffect(() => {
    loadInstructorSchedule();
  }, [loadInstructorSchedule]);

  // Handle Instructor Selection Gate
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

  // WhatsApp Helper Format
  const getWhatsAppLink = (siswaNama: string, siswaPhone: string) => {
    const firstNameSiswa = siswaNama.trim().split(' ')[0];
    const firstNameInstruktur = selectedInstruktur?.nama.trim().split(' ')[0] || 'Instruktur';

    // Format phone: convert 08... to 628...
    let cleanPhone = siswaPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const defaultMsg = `halo kak ${firstNameSiswa}, saya instruktur ${firstNameInstruktur}, otw ya. mohon ditunggu`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMsg)}`;
  };

  // --- GATE 1: PROMPT SELECT INSTRUCTOR IF NOT LOGGED IN ---
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

            <p className="text-[11px] text-gray-400 italic text-center">
              Pilihan nama instruktur akan tersimpan otomatis untuk akses berikutnya.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- PORTAL MAIN DASHBOARD VIEW ---
  const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header Bar */}
      <header className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] flex items-center justify-center font-bold text-sm">
            {selectedInstruktur.nama.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Instruktur {selectedInstruktur.nama}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                View-Only
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-mono">
              {selectedInstruktur.no_whatsapp || 'Amanah Drive Palembang'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogoutInstruktur}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-rose-600 hover:border-rose-300 transition-colors"
          title="Ganti Instruktur"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ganti</span>
        </button>
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

            // Sessions count for this date
            const dateSessions = monthlyJadwal.filter((j) => j.tanggal_sesi === cellDateStr);
            const hasSessions = dateSessions.length > 0;

            return (
              <button
                key={cellDateStr}
                onClick={() => setSelectedTanggal(cellDateStr)}
                className={`h-11 p-1 rounded-lg border flex flex-col justify-between items-center transition-all ${
                  isSelected
                    ? 'border-2 border-[var(--brand-primary)] bg-[var(--brand-primary-light)] font-bold shadow-sm'
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
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setSelectedJadwalDetail(null)}
                className="px-4 py-2 border border-[var(--border)] rounded-md font-semibold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
