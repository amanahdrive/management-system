export interface KasMetrics {
  saldoAktif: number;
  saldoTunai: number;
  saldoBank: number;
  pemasukanBulanIni: number;
  pengeluaranBulanIni: number;
  totalPiutang: number;
  totalHutang: number;
  totalKasbonStaff: number;
  totalPosPengeluaranBelumBayar?: number;
}

export interface KasTransaksi {
  id: string;
  tanggal: string;
  tipe: 'pemasukan' | 'pengeluaran';
  kategori: string;
  keterangan: string;
  nominal: number;
  jenis_pembayaran: 'tunai' | 'non_tunai' | 'transfer';
  rekening_id?: string | null;
  pic_tipe?: string;
  pic_nama?: string;
  siswa_id?: string | null;
  hutang_id?: string | null;
  staff_id?: string | null;
  kendaraan_id?: string | null;
  bukti_url?: string | null;
  sumber_otomatis?: boolean;
  created_at?: string;
  updated_at?: string;
  siswa?: {
    id: string;
    nama: string;
    nomor_wa?: string;
  } | null;
  hutang?: {
    id: string;
    nama_hutang: string;
  } | null;
  staff?: {
    id: string;
    nama: string;
  } | null;
}

export interface SiswaPiutang {
  id: string;
  nama: string;
  nomor_wa?: string;
  paket_nama?: string;
  total_biaya: number;
  sudah_bayar: number;
  sisa_pembayaran: number;
  status_pembayaran?: string;
  created_at?: string;
}

export interface Hutang {
  id: string;
  nama_hutang: string;
  pemberi_pinjaman?: string;
  total_hutang: number;
  sisa_hutang: number;
  jatuh_tempo?: string;
  status: 'berjalan' | 'lunas';
  created_at?: string;
}

export interface Rekening {
  id: string;
  nama_bank: string;
  nomor_rekening: string;
  atas_nama: string;
  saldo_awal?: number;
  is_active?: boolean;
}

export interface PosPengeluaran {
  id: string;
  nama_pos: string;
  nominal: number;
  kategori?: string;
  status: 'belum_bayar' | 'sudah_bayar';
  jatuh_tempo?: string;
}

export interface FinanceDataResponse {
  success: boolean;
  metrics: KasMetrics;
  transaksi: KasTransaksi[];
  kategori: string[];
  siswa: SiswaPiutang[];
  hutang: Hutang[];
  rekening: Rekening[];
  posPengeluaran?: PosPengeluaran[];
  timestamp: number;
  error?: string;
}
