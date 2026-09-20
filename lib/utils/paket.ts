import { Paket } from '@/types/database';
import { formatRupiah } from '@/lib/utils/currency';
import { formatCarOptionsLabel } from '@/lib/utils/vehicle';

export interface PaketGroup {
  groupName: string;
  items: Paket[];
}

/**
 * Format label paket yang rapi, profesional, dan bebas dari redundansi kurung.
 * Digunakan untuk dropdown pendaftaran siswa, konversi lead, dan transaksi kas.
 */
export function formatPaketOptionLabel(paket: Paket): string {
  const harga = formatRupiah(paket.harga_promo || paket.harga_normal);
  
  // Kasus paket khusus/kustom
  if (paket.is_custom || paket.jumlah_sesi === 0) {
    return `${paket.nama_paket} — ${harga}`;
  }

  // Ringkas label armada
  let carLabel = formatCarOptionsLabel(paket.jenis_mobil);
  if (carLabel === 'Manual (Amanah)') carLabel = 'Manual';
  else if (carLabel === 'Matic (Amanah)') carLabel = 'Matic';
  else if (carLabel === 'Mobil Sendiri (Manual & Matic)') carLabel = 'Mobil Sendiri';

  // Bersihkan nama jika ada awalan "Mobil Sendiri - " agar tidak terulang
  let cleanName = paket.nama_paket;
  if (cleanName.startsWith('Mobil Sendiri - ')) {
    cleanName = cleanName.replace('Mobil Sendiri - ', '');
  }

  return `${cleanName} • ${carLabel} — ${harga}`;
}

/**
 * Mengelompokkan daftar paket ke dalam kategori logis dan terstruktur (Enterprise optgroup)
 * 1. Paket Kursus Reguler (Armada Amanah)
 * 2. Paket Kursus Mobil Sendiri
 * 3. Paket Kustom & Fleksibel
 */
export function groupPaketForSelect(paketList: Paket[]): PaketGroup[] {
  const reguler: Paket[] = [];
  const mobilSendiri: Paket[] = [];
  const kustom: Paket[] = [];

  paketList.forEach((p) => {
    if (p.is_custom || p.jumlah_sesi === 0) {
      kustom.push(p);
      return;
    }

    const jm = p.jenis_mobil || [];
    const isAllSendiri =
      jm.length > 0 &&
      jm.every((k) => k.startsWith('mobil_sendiri')) &&
      !jm.includes('manual') &&
      !jm.includes('matic');

    const nameHasSendiri = p.nama_paket.toLowerCase().includes('mobil sendiri');

    if (isAllSendiri || nameHasSendiri) {
      mobilSendiri.push(p);
    } else {
      reguler.push(p);
    }
  });

  const groups: PaketGroup[] = [];

  if (reguler.length > 0) {
    groups.push({
      groupName: 'Paket Kursus Reguler (Armada Amanah)',
      items: reguler,
    });
  }

  if (mobilSendiri.length > 0) {
    groups.push({
      groupName: 'Paket Kursus Mobil Sendiri',
      items: mobilSendiri,
    });
  }

  if (kustom.length > 0) {
    groups.push({
      groupName: 'Paket Kustom & Fleksibel',
      items: kustom,
    });
  }

  return groups;
}

/**
 * Mendapatkan paket default yang paling direkomendasikan untuk formulir pendaftaran baru.
 * Menghindari pemilihan otomatis paket Khusus Rp 0 yang membingungkan staf.
 */
export function getDefaultPaketForRegistration(paketList: Paket[]): Paket | null {
  if (!paketList || paketList.length === 0) return null;
  // Prioritaskan paket reguler aktif pertama (biasanya Basic 5 Sesi)
  const regularActive = paketList.find((p) => p.aktif && !p.is_custom && p.jumlah_sesi > 0);
  if (regularActive) return regularActive;

  // Fallback ke paket aktif pertama apa pun
  const anyActive = paketList.find((p) => p.aktif);
  return anyActive || paketList[0];
}
