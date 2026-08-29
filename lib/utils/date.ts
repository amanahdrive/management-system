// lib/utils/date.ts
// Zona waktu resmi: Asia/Jakarta (WIB = UTC+7)

const TIMEZONE_WIB = 'Asia/Jakarta';

const HARI_INDONESIA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export interface JakartaDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  weekdayIndex: number; // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Ekstraksi komponen tanggal dan jam yang secara ketat dievaluasi dalam zona waktu Asia/Jakarta (WIB).
 * Aman dari perbedaan zona waktu server (seperti Vercel Serverless / UTC) dan browser lokal.
 */
export function getJakartaDateParts(dateInput: Date | string | null | undefined): JakartaDateParts | null {
  if (!dateInput) return null;

  // Jika input berupa format string YYYY-MM-DD murni, parsing langsung tanggal kalendernya
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      // Gunakan siang UTC agar aman dari DST dan pergeseran hari
      const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return {
        year: y,
        month: m,
        day: d,
        weekdayIndex: dt.getUTCDay(),
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }
  }

  const dt = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!dt || isNaN(dt.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_WIB,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(dt);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const hourVal = parseInt(map.hour, 10);
  const hours = hourVal === 24 ? 0 : hourVal;

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    weekdayIndex: weekdayMap[map.weekday] ?? 0,
    hours,
    minutes: parseInt(map.minute, 10),
    seconds: parseInt(map.second, 10),
  };
}

/**
 * Format Date atau ISO string ke format tanggal Indonesia (WIB)
 * Contoh: "2026-08-07" -> "07/08/2026"
 */
export function formatDateIndo(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return '-';

  const day = String(parts.day).padStart(2, '0');
  const month = String(parts.month).padStart(2, '0');
  return `${day}/${month}/${parts.year}`;
}

/**
 * Format tanggal ke nama hari dan tanggal lengkap Indonesia (WIB)
 * Contoh: "Jum'at, 07/08/2026"
 */
export function formatHariTanggalIndo(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return '-';

  const namaHari = HARI_INDONESIA[parts.weekdayIndex];
  const day = String(parts.day).padStart(2, '0');
  const month = String(parts.month).padStart(2, '0');
  return `${namaHari}, ${day}/${month}/${parts.year}`;
}

/**
 * Format tanggal ke nama bulan teks panjang Indonesia (WIB)
 * Contoh: "7 Agustus 2026"
 */
export function formatDateLongIndo(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return '-';

  const day = parts.day;
  const namaBulan = BULAN_INDONESIA[parts.month - 1];
  return `${day} ${namaBulan} ${parts.year}`;
}

/**
 * Dapatkan string tanggal hari ini (YYYY-MM-DD) dalam zona waktu Asia/Jakarta (WIB).
 * Mencegah bug tanggal kemarin saat server Next.js berjalan di UTC (misal Vercel pada pukul 00:00–06:59 WIB).
 */
export function getTodayDateString(): string {
  const parts = getJakartaDateParts(new Date());
  if (!parts) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}-${month}-${day}`;
}

/**
 * Tambah atau kurangi hari dari string YYYY-MM-DD secara deterministik tanpa pergeseran zona waktu.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  if (!dateStr) return getTodayDateString();
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);

  const date = new Date(Date.UTC(y, m, d + days, 12, 0, 0));
  const nextY = date.getUTCFullYear();
  const nextM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const nextD = String(date.getUTCDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

/**
 * Hitung rentang kalender mingguan dari Minggu sampai Sabtu untuk tanggal tertentu (WIB).
 */
export function getWeekSundayToSaturday(dateStr: string): { startSunday: string; endSaturday: string } {
  if (!dateStr) dateStr = getTodayDateString();
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const current = new Date(Date.UTC(y, m, d, 12, 0, 0));
  const dayOfWeek = current.getUTCDay(); // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu

  const sun = new Date(current);
  sun.setUTCDate(current.getUTCDate() - dayOfWeek);

  const sat = new Date(sun);
  sat.setUTCDate(sun.getUTCDate() + 6);

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (dt: Date) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;

  return {
    startSunday: fmt(sun),
    endSaturday: fmt(sat),
  };
}

/**
 * Format waktu ke format 24 jam ketat dalam zona waktu Asia/Jakarta (WIB) (misal: "14:30" atau "14:30:00")
 */
export function formatTime24(dateInput: Date | string | null | undefined, includeSeconds = false): string {
  if (!dateInput) return '-';
  const parts = getJakartaDateParts(dateInput);
  if (!parts) return '-';

  const hours = String(parts.hours).padStart(2, '0');
  const minutes = String(parts.minutes).padStart(2, '0');
  if (includeSeconds) {
    const seconds = String(parts.seconds).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  return `${hours}:${minutes}`;
}

/**
 * Format tanggal dan waktu dalam format 24 jam WIB lengkap: "07/08/2026 14:30 WIB"
 */
export function formatDateTime24(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  const datePart = formatDateIndo(dateInput);
  const timePart = formatTime24(dateInput);
  if (datePart === '-' || timePart === '-') return '-';
  return `${datePart} ${timePart} WIB`;
}


