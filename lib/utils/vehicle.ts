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
