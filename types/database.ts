// types/database.ts
// TypeScript interfaces matching Supabase Database Schema for Amanah Drive

export type SumberLeadsEnum = 'meta_ads' | 'tiktok' | 'referensi' | 'kustom';

export type TipePotonganEnum = 'persen' | 'nominal';

export type TipeTransmisiEnum = 'manual' | 'matic';

export type JenisMobilEnum = 'manual' | 'matic' | 'mobil_sendiri';

export type StatusPembelianEnum = 'baru' | 'second';

export type PosisiBanEnum = 'depan_kiri' | 'depan_kanan' | 'belakang_kiri' | 'belakang_kanan' | 'serep';

export type StatusSesiEnum = 'terjadwal' | 'selesai' | 'batal';

export type TipeKasEnum = 'pemasukan' | 'pengeluaran';

export type PicTipeEnum = 'admin' | 'finance';

export type JenisHutangEnum = 'cicilan_kendaraan' | 'pinjaman_perusahaan' | 'lainnya';

export type StatusHutangEnum = 'berjalan' | 'lunas';

export interface Paket {
  id: string;
  nama_paket: string;
  jumlah_sesi: number;
  termasuk_sim: boolean;
  harga_normal: number;
  harga_promo: number | null;
  jenis_mobil: JenisMobilEnum[];
  is_custom: boolean;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Promosi {
  id: string;
  nama_promo: string;
  paket_id: string | null;
  tipe_potongan: TipePotonganEnum;
  nilai_potongan: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface StatusPembayaranMaster {
  id: string;
  kode: string; // 'belum_bayar' | 'dp' | 'lunas' | 'batal'
  label: string;
  warna_badge: string;
  urutan: number;
  created_at: string;
  updated_at: string;
}

export interface Siswa {
  id: string;
  kode_siswa: string; // e.g. SS001
  nama: string;
  tanggal_booking: string;
  tanggal_rencana_mulai: string;
  no_whatsapp: string;
  alamat: string;
  paket_id: string;
  harga_final: number;
  harga_manual_override: boolean;
  promosi_id: string | null;
  status_pembayaran_kode: string;
  dp_nominal: number | null;
  dp_tanggal: string | null;
  sumber: SumberLeadsEnum;
  sumber_kustom_text: string | null;
  catatan: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  paket?: Paket;
  promosi?: Promosi;
  status_pembayaran?: StatusPembayaranMaster;
}

export interface Jabatan {
  id: string;
  nama_jabatan: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
  staff_count?: number;
}

export interface Staff {
  id: string;
  nama: string;
  foto_url: string | null;
  tahun_bergabung: number;
  no_whatsapp: string;
  alamat: string;
  tanda_tangan_url: string | null;
  aktif: boolean;
  hari_kerja?: string[];
  slot_kerja?: string[];
  jadwal_ketersediaan?: Record<string, string[]>;
  created_at: string;
  updated_at: string;
  // Joined fields
  jabatan_list?: Jabatan[];
}

export interface StaffJabatan {
  id: string;
  staff_id: string;
  jabatan_id: string;
}

export interface SlotWaktu {
  id: string;
  nama_slot: string;
  jam_mulai: string;
  jam_selesai: string;
  kategori: 'reguler' | 'malam';
  urutan: number;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Kendaraan {
  id: string;
  nama_kendaraan: string;
  tahun_produksi: number;
  status_pembelian: StatusPembelianEnum;
  tahun_pembelian: number;
  plat_nomor: string;
  tipe_transmisi: TipeTransmisiEnum;
  warna: string;
  foto_url: string | null;
  aktif: boolean;
  created_at: string;
  updated_at: string;
  // Joined status
  status?: KendaraanStatus;
}

export interface KendaraanStatus {
  id: string;
  kendaraan_id: string;
  odometer_terkini: number;
  oli_tanggal_terakhir: string | null;
  oli_km_terakhir: number | null;
  cuci_tanggal_terakhir: string | null;
  bensin_tanggal_terakhir: string | null;
  bensin_jenis_terakhir: string | null;
  bensin_nominal_terakhir: number | null;
  bensin_liter_terakhir: number | null;
  created_at: string;
  updated_at: string;
}

export interface HargaBBM {
  id: string;
  jenis: string;
  harga_per_liter: number;
  created_at: string;
  updated_at: string;
}

export interface KendaraanBan {
  id: string;
  kendaraan_id: string;
  posisi_ban: PosisiBanEnum;
  tanggal_ganti: string;
  km_saat_ganti: number;
  status_beli: StatusPembelianEnum;
  created_at: string;
  updated_at: string;
}

export interface KendaraanLogHarian {
  id: string;
  kendaraan_id: string;
  tanggal: string;
  odometer_basecamp_out: number | null;
  odometer_basecamp_in: number | null;
  jarak_tempuh: number | null;
  total_slot_selesai: number | null;
  created_at: string;
  updated_at: string;
}

export interface JadwalSesi {
  id: string;
  siswa_id: string;
  staff_id: string;
  kendaraan_id: string | null;
  jenis_mobil: JenisMobilEnum;
  tanggal_sesi: string;
  slot_waktu_id: string;
  slot_waktu_id_akhir: string | null;
  nomor_sesi_ke: number;
  total_sesi_paket: number;
  status_sesi: StatusSesiEnum;
  catatan_sesi: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  siswa?: Siswa;
  instruktur?: Staff;
  kendaraan?: Kendaraan;
  slot_waktu?: SlotWaktu;
  slot_waktu_akhir?: SlotWaktu;
}

export interface KasKategori {
  id: string;
  nama_kategori: string;
  tipe: 'pemasukan' | 'pengeluaran' | 'keduanya';
  created_at: string;
  updated_at: string;
}

export interface Hutang {
  id: string;
  nama_hutang: string;
  jenis: JenisHutangEnum;
  total_hutang: number;
  sisa_hutang: number;
  tanggal_mulai: string;
  jatuh_tempo_bulanan: number | null;
  cicilan_per_bulan: number | null;
  status: StatusHutangEnum;
  created_at: string;
  updated_at: string;
}

export interface RekeningBank {
  id: string;
  nama_bank: string; // e.g. "BCA", "Mandiri", "BRI", "BNI", "BSI"
  nomor_rekening: string; // e.g. "8535441234"
  atas_nama: string; // e.g. "PT Amanah Drive Palembang"
  aktif: boolean;
  is_utama?: boolean;
  keterangan?: string | null;
}

export interface KasTransaksi {
  id: string;
  tanggal: string;
  tipe: TipeKasEnum;
  kategori: string;
  keterangan: string;
  nominal: number;
  jenis_pembayaran: 'tunai' | 'non_tunai';
  rekening_id?: string | null;
  pic_tipe: PicTipeEnum;
  pic_nama: string;
  foto_nota_url: string | null;
  siswa_id: string | null;
  hutang_id: string | null;
  sumber_otomatis: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  siswa?: Siswa;
  hutang?: Hutang;
}

export interface HutangPembayaran {
  id: string;
  hutang_id: string;
  tanggal_bayar: string;
  nominal: number;
  kas_transaksi_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettingItem {
  id: string;
  key: string;
  value: string;
  deskripsi: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotifikasiLog {
  id: string;
  tipe: string;
  judul: string;
  isi_pesan: string;
  status_kirim: 'terkirim' | 'gagal';
  error_message: string | null;
  dikirim_at: string;
}

export type KategoriInsidenEnum =
  | 'tabrakan'
  | 'senggolan'
  | 'kerusakan_mesin'
  | 'baret_bodi'
  | 'ban_pecah'
  | 'tilang'
  | 'kendala_siswa'
  | 'kehilangan'
  | 'lainnya';

export type TingkatKeparahanEnum = 'ringan' | 'sedang' | 'berat' | 'kritis';

export type StatusPenangananEnum =
  | 'dilaporkan'
  | 'dalam_investigasi'
  | 'dalam_perbaikan'
  | 'selesai'
  | 'klaim_asuransi'
  | 'ditolak';

export type PenanggungBiayaEnum =
  | 'perusahaan'
  | 'instruktur'
  | 'siswa'
  | 'pihak_ketiga'
  | 'asuransi'
  | 'bersama';

export interface Insiden {
  id: string;
  kode_insiden: string;
  tanggal_insiden: string;
  jam_insiden: string;
  kendaraan_id: string | null;
  staff_id: string | null;
  siswa_id: string | null;
  jadwal_sesi_id: string | null;
  kategori: KategoriInsidenEnum;
  tingkat_keparahan: TingkatKeparahanEnum;
  lokasi_kejadian: string;
  deskripsi_kejadian: string;
  kronologi_singkat: string | null;
  kondisi_kendaraan: string | null;
  kondisi_pengemudi: string | null;
  estimasi_biaya: number;
  biaya_aktual: number | null;
  penanggung_biaya: PenanggungBiayaEnum;
  status_penanganan: StatusPenangananEnum;
  tindakan_penanganan: string | null;
  foto_bukti_urls: string[] | null;
  catatan: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  kendaraan?: Kendaraan;
  staff?: Staff;
  siswa?: Siswa;
  jadwal_sesi?: JadwalSesi;
}

