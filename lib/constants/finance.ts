import { KasKategori, RekeningBank } from '@/types/database';

export const DEFAULT_KAS_KATEGORI: KasKategori[] = [
  {
    id: 'a0e16a66-9073-431f-8f1d-6d1e318a1678',
    nama_kategori: 'dp_siswa',
    tipe: 'pemasukan',
    created_at: '2026-08-06T19:25:46.591Z',
    updated_at: '2026-08-26T19:28:16.971Z',
  },
  {
    id: 'e36eb459-4337-4cd6-a9f6-3f19ca40d94c',
    nama_kategori: 'pelunasan_siswa',
    tipe: 'pemasukan',
    created_at: '2026-08-06T19:25:46.591Z',
    updated_at: '2026-08-26T19:28:16.971Z',
  },
  {
    id: '0fd40358-d7ed-43e8-98dd-a644f6380f7a',
    nama_kategori: 'operasional',
    tipe: 'pengeluaran',
    created_at: '2026-08-06T19:25:46.591Z',
    updated_at: '2026-08-26T19:28:16.971Z',
  },
  {
    id: 'a04fac76-baee-4d47-8a65-14a7d2ed3c0e',
    nama_kategori: 'bbm',
    tipe: 'pengeluaran',
    created_at: '2026-08-06T19:25:46.591Z',
    updated_at: '2026-08-26T19:28:16.971Z',
  },
  {
    id: '87793a80-8d61-409f-965b-558302654c31',
    nama_kategori: 'gaji',
    tipe: 'pengeluaran',
    created_at: '2026-08-06T19:25:46.591Z',
    updated_at: '2026-08-26T19:28:16.971Z',
  },
  {
    id: 'c3db2487-a344-4e7a-9474-d28796c86a4b',
    nama_kategori: 'cicilan_hutang',
    tipe: 'pengeluaran',
    created_at: '2026-08-06T19:25:46.591Z',
    updated_at: '2026-08-26T19:28:16.971Z',
  },
  {
    id: '0ceb52af-1da1-4546-8a16-518a59861066',
    nama_kategori: 'refund_siswa',
    tipe: 'pengeluaran',
    created_at: '2026-08-26T19:24:27.878Z',
    updated_at: '2026-08-26T19:28:16.971Z',
  },
  {
    id: 'de1e7e48-51f2-49ac-b608-4ae5afa7107f',
    nama_kategori: 'lainnya',
    tipe: 'keduanya',
    created_at: '2026-08-06T19:25:46.591Z',
    updated_at: '2026-08-26T19:28:16.971Z',
  },
];

export const DEFAULT_REKENING_LIST: RekeningBank[] = [
  {
    id: 'rek-bri-utama',
    nama_bank: 'BRI',
    nomor_rekening: '110401019850504',
    atas_nama: 'Nur Awalia Rianti',
    aktif: true,
    is_utama: true,
    keterangan: 'Rekening Utama Operasional & Transfer Amanah Drive',
  },
  {
    id: 'rek-bca-1',
    nama_bank: 'BCA',
    nomor_rekening: '8535441234',
    atas_nama: 'Amanah Drive Palembang',
    aktif: true,
    is_utama: false,
    keterangan: 'Rekening BCA Cadangan',
  },
  {
    id: 'rek-mandiri-1',
    nama_bank: 'Mandiri',
    nomor_rekening: '1130018899123',
    atas_nama: 'Amanah Drive',
    aktif: true,
    is_utama: false,
    keterangan: 'Rekening Penerimaan Mandiri',
  },
  {
    id: 'rek-bsi-1',
    nama_bank: 'BSI',
    nomor_rekening: '7188991234',
    atas_nama: 'Amanah Drive',
    aktif: true,
    is_utama: false,
    keterangan: 'Rekening Syariah BSI',
  },
];

export const LABEL_REKENING_DEFAULT = '-- Rekening Umum / Data Lama (Tanpa Rekening Khusus) --';

export interface KasOverviewMetrics {
  saldoAktif: number;
  saldoTunai: number;
  saldoNonTunai: number;
  totalPiutang: number;
  totalHutang: number;
}

export const DEFAULT_METRICS: KasOverviewMetrics = {
  saldoAktif: 0,
  saldoTunai: 0,
  saldoNonTunai: 0,
  totalPiutang: 0,
  totalHutang: 0,
};

export function formatKategoriLabel(kategori: string): string {
  switch (kategori) {
    case 'dp_siswa':
      return 'DP Siswa Kursus';
    case 'pelunasan_siswa':
      return 'Pelunasan Siswa';
    case 'operasional':
      return 'Operasional';
    case 'bbm':
      return 'Bahan Bakar Minyak (BBM)';
    case 'gaji':
      return 'Gaji & Honor Instruktur';
    case 'cicilan_hutang':
      return 'Cicilan Hutang';
    case 'refund_siswa':
      return 'Refund Pembatalan';
    case 'setor_tunai':
      return 'Setor Tunai (Bank)';
    case 'lainnya':
      return 'Lain-lain';
    default:
      return kategori ? kategori.replace(/_/g, ' ') : 'Umum';
  }
}

export function calculateLocalKasMetrics(
  transactions: any[] = [],
  students: any[] = [],
  loans: any[] = []
): KasOverviewMetrics {
  let tunai = 0;
  let nonTunai = 0;

  if (Array.isArray(transactions)) {
    for (const tx of transactions) {
      const nom = Number(tx.nominal) || 0;
      const isTunai = (tx.jenis_pembayaran || 'tunai') === 'tunai';
      if (tx.tipe === 'pemasukan') {
        if (isTunai) tunai += nom;
        else nonTunai += nom;
      } else {
        if (isTunai) tunai -= nom;
        else nonTunai -= nom;
      }
    }
  }

  let piutang = 0;
  if (Array.isArray(students)) {
    for (const s of students) {
      if (s.status_pembayaran_kode === 'dp') {
        piutang += Math.max(0, (Number(s.harga_final) || 0) - (Number(s.dp_nominal) || 0));
      } else if (s.status_pembayaran_kode === 'belum_bayar') {
        piutang += Number(s.harga_final) || 0;
      }
    }
  }

  let hutang = 0;
  if (Array.isArray(loans)) {
    for (const h of loans) {
      if (h.status === 'berjalan') {
        hutang += Number(h.sisa_hutang) || 0;
      }
    }
  }

  return {
    saldoAktif: tunai + nonTunai,
    saldoTunai: tunai,
    saldoNonTunai: nonTunai,
    totalPiutang: piutang,
    totalHutang: hutang,
  };
}

/**
 * Memisahkan teks keterangan murni dan informasi rekening bank
 * (Menghapus prefix [Bank ...] dari keterangan jika ada, dan mencari detail bank dari rekening_id)
 */
export function parseKeteranganDanRekening(
  keterangan: string,
  rekeningId?: string | null,
  rekeningList?: RekeningBank[]
): {
  cleanKeterangan: string;
  bankInfo: string | null;
} {
  if (!keterangan) {
    return { cleanKeterangan: '', bankInfo: null };
  }

  let cleanKeterangan = keterangan.trim();
  let extractedBank: string | null = null;

  // Cek apakah ada prefix bracket seperti "[BRI 110401019850504] Servis Mobil Xenia"
  const prefixMatch = cleanKeterangan.match(/^\[([A-Za-z0-9\s/.-]+)\]\s*(.*)$/);
  if (prefixMatch) {
    extractedBank = prefixMatch[1].trim();
    cleanKeterangan = prefixMatch[2].trim();
  }

  // Jika rekeningId tersedia dan ada di rekeningList, gunakan data rekening bank resmi
  let bankInfo = extractedBank;
  if (rekeningId && rekeningList && rekeningList.length > 0) {
    const rek = rekeningList.find((r) => r.id === rekeningId);
    if (rek) {
      bankInfo = `${rek.nama_bank} ${rek.nomor_rekening}`;
    }
  } else if (!bankInfo && rekeningId) {
    // Default fallback jika rekening_id ada tapi list belum termuat
    const defRek = DEFAULT_REKENING_LIST.find((r) => r.id === rekeningId);
    if (defRek) {
      bankInfo = `${defRek.nama_bank} ${defRek.nomor_rekening}`;
    }
  }

  return {
    cleanKeterangan: cleanKeterangan || keterangan,
    bankInfo,
  };
}
