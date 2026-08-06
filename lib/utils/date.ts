// lib/utils/date.ts

const HARI_INDONESIA = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];

const BULAN_INDONESIA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Format Date or ISO string into WIB Date String
 * Example: 2026-08-07 -> "07/08/2026"
 */
export function formatDateIndo(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format date to full day and date in Indonesian
 * Example: "Jum'at, 07/08/2026"
 */
export function formatHariTanggalIndo(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const namaHari = HARI_INDONESIA[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${namaHari}, ${day}/${month}/${year}`;
}

/**
 * Format date to long Indonesian string
 * Example: "7 Agustus 2026"
 */
export function formatDateLongIndo(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const day = d.getDate();
  const namaBulan = BULAN_INDONESIA[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${namaBulan} ${year}`;
}

/**
 * Get current YYYY-MM-DD string in Asia/Jakarta timezone
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
