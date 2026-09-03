import { formatDateIndo, getTodayDateString, getJakartaDateParts } from '@/lib/utils/date';

const ROMAN_MONTHS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function getRomanMonth(monthNumber: number): string {
  return ROMAN_MONTHS[monthNumber] || 'VIII';
}

export function generateNomorSertifikat(kodeSiswa: string, dateStr?: string): string {
  const targetDate = dateStr || getTodayDateString();
  const parts = getJakartaDateParts(targetDate);
  const month = parts?.month ?? new Date().getMonth() + 1;
  const year = parts?.year ?? new Date().getFullYear();
  const roman = ROMAN_MONTHS[month] || 'VIII';
  const cleanKode = (kodeSiswa || 'SS001').toUpperCase().trim();
  return `${cleanKode}/AMD/${roman}/${year}`;
}

const MONTH_NAMES_INDO = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatSesiDateRange(startStr?: string | null, endStr?: string | null): string {
  if (!startStr && !endStr) return formatDateIndo(getTodayDateString());
  if (startStr && !endStr) return formatDateIndo(startStr);
  if (!startStr && endStr) return formatDateIndo(endStr);

  const s = startStr!;
  const e = endStr!;

  if (s === e) return formatDateIndo(s);

  const pStart = getJakartaDateParts(s);
  const pEnd = getJakartaDateParts(e);

  if (!pStart || !pEnd) {
    return `${formatDateIndo(s)} - ${formatDateIndo(e)}`;
  }

  // Same month & same year: e.g. "24 - 31 Agustus 2026"
  if (pStart.month === pEnd.month && pStart.year === pEnd.year) {
    const monthName = MONTH_NAMES_INDO[pStart.month] || '';
    return `${pStart.day} - ${pEnd.day} ${monthName} ${pStart.year}`;
  }

  // Same year, different month: e.g. "28 Agustus - 04 September 2026"
  if (pStart.year === pEnd.year) {
    const mStart = MONTH_NAMES_INDO[pStart.month] || '';
    const mEnd = MONTH_NAMES_INDO[pEnd.month] || '';
    return `${pStart.day} ${mStart} - ${pEnd.day} ${mEnd} ${pStart.year}`;
  }

  // Different year
  return `${formatDateIndo(s)} - ${formatDateIndo(e)}`;
}
