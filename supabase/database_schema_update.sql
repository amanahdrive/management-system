-- ===========================================================================
-- AMANAH DRIVE PALEMBANG — DATABASE SCHEMA UPDATE (v3)
-- Jalankan di: Supabase SQL Editor → Run
-- Script ini IDEMPOTEN (aman dijalankan berulang, tidak merusak data)
-- ===========================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- BAGIAN 1: STRUKTUR KOLOM (dari sesi sebelumnya — tetap dipertahankan)
-- ─────────────────────────────────────────────────────────────────────────

-- 1a. Staff: Kolom jadwal ketersediaan instruktur
ALTER TABLE IF EXISTS staff
  ADD COLUMN IF NOT EXISTS hari_kerja text[] DEFAULT ARRAY['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'],
  ADD COLUMN IF NOT EXISTS slot_kerja text[] DEFAULT ARRAY['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'],
  ADD COLUMN IF NOT EXISTS jadwal_ketersediaan jsonb DEFAULT '{}'::jsonb;

-- 1b. Tabel settings: Konfigurasi global sistem
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  deskripsi text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1c. Jadwal sesi: Double slot support
ALTER TABLE IF EXISTS jadwal_sesi
  ADD COLUMN IF NOT EXISTS slot_waktu_id_akhir uuid REFERENCES slot_waktu(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- BAGIAN 2: PERBAIKAN BUG KRITIS (BARU di v3)
-- ─────────────────────────────────────────────────────────────────────────

-- 2a. Pastikan kolom `aktif` tersedia di tabel staff (bukan `is_active`)
--     Cron rekap malam sebelumnya gagal karena menggunakan `is_active`
ALTER TABLE IF EXISTS staff
  ADD COLUMN IF NOT EXISTS aktif boolean DEFAULT true;

-- Jika ada data lama di kolom is_active, migrasikan ke `aktif`
-- (jalankan hanya jika kolom is_active ada — uncomment jika perlu)
-- UPDATE staff SET aktif = is_active WHERE aktif IS NULL;

-- 2b. Tambah kolom updated_at ke jadwal_sesi (untuk tracking sinkronisasi)
ALTER TABLE IF EXISTS jadwal_sesi
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2c. Tambah kolom catatan_sesi ke jadwal_sesi jika belum ada
ALTER TABLE IF EXISTS jadwal_sesi
  ADD COLUMN IF NOT EXISTS catatan_sesi text;

-- 2d. Tabel notifikasi_log — pastikan ada untuk logging Telegram
CREATE TABLE IF NOT EXISTS notifikasi_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipe text NOT NULL,
  judul text,
  isi_pesan text,
  status_kirim text DEFAULT 'gagal',
  error_message text,
  dikirim_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- BAGIAN 3: INDEKS OPTIMASI PERFORMA (BARU & EXISTING)
-- ─────────────────────────────────────────────────────────────────────────

-- Index utama jadwal_sesi (query by tanggal + staff — query paling sering)
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_tanggal_staff ON jadwal_sesi(tanggal_sesi, staff_id);

-- Index by siswa (untuk getJadwalBySiswa dan archive check)
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_siswa ON jadwal_sesi(siswa_id);

-- Index by status (untuk filter sesi aktif/selesai/batal)
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_status ON jadwal_sesi(status_sesi);

-- Index composite: siswa + status (untuk dashboard metrics)
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_siswa_status ON jadwal_sesi(siswa_id, status_sesi);

-- Index tanggal saja (untuk range query conflict check)
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_tanggal ON jadwal_sesi(tanggal_sesi);

-- Index settings key
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Index kas_transaksi by tanggal + tipe (dashboard cashflow query)
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_tanggal ON kas_transaksi(tanggal);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_tipe ON kas_transaksi(tipe);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_tanggal_tipe ON kas_transaksi(tanggal, tipe);

-- Index siswa by status pembayaran (dashboard & archive filter)
CREATE INDEX IF NOT EXISTS idx_siswa_status_pembayaran ON siswa(status_pembayaran_kode);

-- Index siswa by tanggal booking (tren pendaftaran query)
CREATE INDEX IF NOT EXISTS idx_siswa_tanggal_booking ON siswa(tanggal_booking);

-- Index notifikasi_log by dikirim_at (history sort)
CREATE INDEX IF NOT EXISTS idx_notifikasi_log_dikirim ON notifikasi_log(dikirim_at DESC);

-- ─────────────────────────────────────────────────────────────────────────
-- BAGIAN 4: CONSTRAINTS TAMBAHAN
-- ─────────────────────────────────────────────────────────────────────────

-- 4a. Pastikan kode_siswa unik di tabel siswa
--     (PostgreSQL tidak mendukung ADD CONSTRAINT IF NOT EXISTS, gunakan DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'siswa_kode_siswa_unique'
      AND conrelid = 'siswa'::regclass
  ) THEN
    ALTER TABLE siswa ADD CONSTRAINT siswa_kode_siswa_unique UNIQUE (kode_siswa);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- BAGIAN 5: TABEL PENCATATAN DATA INSIDEN (v4)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS insiden (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_insiden text UNIQUE NOT NULL,
  tanggal_insiden date NOT NULL DEFAULT CURRENT_DATE,
  jam_insiden text DEFAULT '08:00',
  kendaraan_id uuid REFERENCES kendaraan(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  siswa_id uuid REFERENCES siswa(id) ON DELETE SET NULL,
  jadwal_sesi_id uuid REFERENCES jadwal_sesi(id) ON DELETE SET NULL,
  kategori text NOT NULL DEFAULT 'lainnya',
  tingkat_keparahan text NOT NULL DEFAULT 'ringan',
  lokasi_kejadian text NOT NULL,
  deskripsi_kejadian text NOT NULL,
  kronologi_singkat text,
  kondisi_kendaraan text,
  kondisi_pengemudi text,
  estimasi_biaya numeric DEFAULT 0,
  biaya_aktual numeric DEFAULT 0,
  penanggung_biaya text DEFAULT 'perusahaan',
  status_penanganan text NOT NULL DEFAULT 'dilaporkan',
  tindakan_penanganan text,
  foto_bukti_urls text[],
  catatan text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insiden_tanggal ON insiden(tanggal_insiden DESC);
CREATE INDEX IF NOT EXISTS idx_insiden_kendaraan ON insiden(kendaraan_id);
CREATE INDEX IF NOT EXISTS idx_insiden_staff ON insiden(staff_id);
CREATE INDEX IF NOT EXISTS idx_insiden_siswa ON insiden(siswa_id);
CREATE INDEX IF NOT EXISTS idx_insiden_status ON insiden(status_penanganan);
CREATE INDEX IF NOT EXISTS idx_insiden_tingkat_keparahan ON insiden(tingkat_keparahan);
CREATE INDEX IF NOT EXISTS idx_insiden_kategori ON insiden(kategori);

-- Row Level Security (RLS) Policy
ALTER TABLE IF EXISTS insiden ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on insiden" ON insiden;

CREATE POLICY "Allow public all on insiden" ON insiden FOR ALL USING (true) WITH CHECK (true);


