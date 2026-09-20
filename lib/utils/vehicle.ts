export interface CarOptionItem {
  id: string;
  label: string;
  sublabel: string;
  badgeLabel: string;
  category: 'operasional' | 'pribadi';
}

export const CAR_OPTIONS_CONFIG: CarOptionItem[] = [
  {
    id: 'manual',
    label: 'Mobil Amanah Drive (Manual)',
    sublabel: 'Armada mobil operasional manual',
    badgeLabel: 'Manual (Amanah)',
    category: 'operasional',
  },
  {
    id: 'matic',
    label: 'Mobil Amanah Drive (Matic)',
    sublabel: 'Armada mobil operasional matic',
    badgeLabel: 'Matic (Amanah)',
    category: 'operasional',
  },
  {
    id: 'mobil_sendiri_manual',
    label: 'Mobil Sendiri (Manual)',
    sublabel: 'Mobil pribadi siswa transmisi manual',
    badgeLabel: 'Mobil Sendiri (Manual)',
    category: 'pribadi',
  },
  {
    id: 'mobil_sendiri_matic',
    label: 'Mobil Sendiri (Matic)',
    sublabel: 'Mobil pribadi siswa transmisi matic',
    badgeLabel: 'Mobil Sendiri (Matic)',
    category: 'pribadi',
  },
];

/**
 * Normalisasi array jenis_mobil dari database (misal format lama memuat 'mobil_sendiri')
 */
export function normalizePaketJenisMobil(jenisMobil?: string[]): string[] {
  if (!jenisMobil || !Array.isArray(jenisMobil)) return ['manual', 'matic'];
  const list = [...jenisMobil];
  if (list.includes('mobil_sendiri')) {
    if (!list.includes('mobil_sendiri_manual')) list.push('mobil_sendiri_manual');
    if (!list.includes('mobil_sendiri_matic')) list.push('mobil_sendiri_matic');
  }
  return list;
}

/**
 * Mempersiapkan payload array jenis_mobil untuk disimpan ke database,
 * tetap menyertakan 'mobil_sendiri' jika opsi mobil sendiri dipilih agar kompatibel dengan modul lain.
 */
export function preparePaketJenisMobilPayload(selectedIds: string[]): string[] {
  const result = Array.from(new Set(selectedIds));
  const hasSendiri = result.some((id) => id.startsWith('mobil_sendiri'));
  if (hasSendiri && !result.includes('mobil_sendiri')) {
    result.push('mobil_sendiri');
  }
  return result;
}

/**
 * Menghasilkan label ringkas opsi mobil untuk dropdown atau deskripsi paket
 */
export function formatCarOptionsLabel(jenisMobil?: string[]): string {
  if (!jenisMobil || jenisMobil.length === 0) return 'Semua Mobil';

  const hasManual = jenisMobil.includes('manual');
  const hasMatic = jenisMobil.includes('matic');
  const hasSendiriManual = jenisMobil.includes('mobil_sendiri_manual');
  const hasSendiriMatic = jenisMobil.includes('mobil_sendiri_matic');
  const hasLegacySendiri = jenisMobil.includes('mobil_sendiri');

  const allOperasional = hasManual && hasMatic;
  const allSendiri =
    (hasSendiriManual && hasSendiriMatic) || (hasLegacySendiri && !hasSendiriManual && !hasSendiriMatic);

  if (allOperasional && allSendiri) return 'Semua Opsi Mobil';
  if (allOperasional && !hasSendiriManual && !hasSendiriMatic && !hasLegacySendiri)
    return 'Manual & Matic (Amanah)';
  if (!hasManual && !hasMatic && allSendiri) return 'Mobil Sendiri (Manual & Matic)';

  const parts: string[] = [];
  if (hasManual) parts.push('Manual (Amanah)');
  if (hasMatic) parts.push('Matic (Amanah)');
  if (hasSendiriManual && !allSendiri) parts.push('Sendiri Manual');
  if (hasSendiriMatic && !allSendiri) parts.push('Sendiri Matic');
  if (hasLegacySendiri && !hasSendiriManual && !hasSendiriMatic) parts.push('Mobil Sendiri');

  return parts.length > 0 ? parts.join(', ') : 'Semua Mobil';
}

export const SUPABASE_VEHICLE_STORAGE_BASE =
  'https://yhwwhqqffgtiavapgjvc.supabase.co/storage/v1/object/public/kendaraan';

/**
 * Mendapatkan path gambar realistis untuk armada kendaraan:
 * 1. Prioritaskan k.foto_url dari Supabase Storage bucket 'kendaraan'
 * 2. Fallback ke CDN Supabase resmi (ayla.webp / xenia.webp)
 * 3. Fallback lokal ke /assets/gambar-*.webp
 */
export function getKendaraanImage(kendaraan?: { nama_kendaraan?: string; foto_url?: string | null } | null): string {
  if (kendaraan?.foto_url && kendaraan.foto_url.trim().length > 0) {
    return kendaraan.foto_url;
  }
  const name = (kendaraan?.nama_kendaraan || '').toLowerCase();
  if (name.includes('xenia') || name.includes('avanza') || name.includes('innova')) {
    return `${SUPABASE_VEHICLE_STORAGE_BASE}/xenia.webp`;
  }
  if (name.includes('ayla') || name.includes('agya') || name.includes('brio') || name.includes('calya')) {
    return `${SUPABASE_VEHICLE_STORAGE_BASE}/ayla.webp`;
  }
  return `${SUPABASE_VEHICLE_STORAGE_BASE}/ayla.webp`;
}

/**
 * Memeriksa apakah sebuah paket kursus merupakan kategori 'Mobil Sendiri'.
 */
export function isMobilSendiriPaket(
  paket?: {
    nama_paket?: string | null;
    jenis_mobil?: string[] | null;
  } | null
): boolean {
  if (!paket) return false;
  const nama = (paket.nama_paket || '').toLowerCase();
  if (
    nama.includes('mobil sendiri') ||
    nama.includes('sendiri') ||
    nama.includes('pelancaran') ||
    nama.includes('refresh')
  ) {
    return true;
  }
  const jm = paket.jenis_mobil || [];
  if (
    jm.length > 0 &&
    jm.every((k) => k.startsWith('mobil_sendiri')) &&
    !jm.includes('manual') &&
    !jm.includes('matic')
  ) {
    return true;
  }
  return false;
}

/**
 * Mendapatkan label tipe kendaraan standar ('Mobil Sendiri' vs 'Mobil Operasional')
 * berdasarkan data jadwal sesi atau relasi siswa/paket.
 */
export function getTipeKendaraanLabel(
  source?: {
    tipe_kendaraan?: string | null;
    jenis_mobil?: string | null;
    siswa?: {
      paket?: {
        nama_paket?: string | null;
        jenis_mobil?: string[] | null;
      } | null;
    } | null;
    paket?: {
      nama_paket?: string | null;
      jenis_mobil?: string[] | null;
    } | null;
  } | null
): 'Mobil Sendiri' | 'Mobil Operasional' {
  if (!source) return 'Mobil Operasional';

  // 1. Jika sesi secara eksplisit berstatus 'pribadi' atau 'mobil_sendiri'
  if (source.tipe_kendaraan === 'pribadi' || source.jenis_mobil === 'mobil_sendiri') {
    return 'Mobil Sendiri';
  }

  // 2. Jika paket siswa merupakan kategori Mobil Sendiri
  if (isMobilSendiriPaket(source.siswa?.paket) || isMobilSendiriPaket(source.paket)) {
    return 'Mobil Sendiri';
  }

  return 'Mobil Operasional';
}
