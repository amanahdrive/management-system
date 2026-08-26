-- ===========================================================================
-- AMANAH DRIVE PALEMBANG — DATABASE SYNC & MIGRATION UPDATE
-- Versi: 2026.08.26 (Rekening Perusahaan, DP Kustom, & Kas Non-Tunai)
-- Jalankan di: Supabase Dashboard → SQL Editor → Run
-- Script ini IDEMPOTEN (Aman dijalankan berulang kali, tidak merusak data)
-- ===========================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. TABEL SETTINGS (Pengaturan Global & Daftar Rekening Perusahaan)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  deskripsi text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Aktifkan RLS untuk tabel settings
ALTER TABLE IF EXISTS settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on settings" ON settings;
CREATE POLICY "Allow public all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Seed Default Rekening Bank Perusahaan (hanya jika belum ada di database)
INSERT INTO settings (key, value, deskripsi)
VALUES (
  'rekening_bank_list',
  '[
    {
      "id": "rek-bca-1",
      "nama_bank": "BCA",
      "nomor_rekening": "8535441234",
      "atas_nama": "PT Amanah Drive Palembang",
      "aktif": true,
      "is_utama": true,
      "keterangan": "Rekening Utama Operasional & Pemasukan Kursus"
    },
    {
      "id": "rek-mandiri-1",
      "nama_bank": "Mandiri",
      "nomor_rekening": "1130018899123",
      "atas_nama": "Amanah Drive",
      "aktif": true,
      "is_utama": false,
      "keterangan": "Rekening Penerimaan Mandiri"
    },
    {
      "id": "rek-bri-1",
      "nama_bank": "BRI",
      "nomor_rekening": "005901002345531",
      "atas_nama": "Amanah Drive",
      "aktif": true,
      "is_utama": false,
      "keterangan": "Rekening Operasional BRI"
    },
    {
      "id": "rek-bsi-1",
      "nama_bank": "BSI",
      "nomor_rekening": "7188991234",
      "atas_nama": "Amanah Drive",
      "aktif": true,
      "is_utama": false,
      "keterangan": "Rekening Syariah BSI"
    }
  ]',
  'Daftar Rekening Bank Resmi Perusahaan'
)
ON CONFLICT (key) DO NOTHING;

-- Seed Default Profil Perusahaan & Parameter Operasional (jika belum ada)
INSERT INTO settings (key, value, deskripsi)
VALUES 
  ('nama_perusahaan', 'Amanah Drive', 'Nama Perusahaan Kursus'),
  ('kota_operasional', 'Palembang', 'Kota Wilayah Operasional'),
  ('harga_bbm_pertalite', '10000', 'Harga BBM Pertalite per Liter'),
  ('harga_bbm_pertamax', '16300', 'Harga BBM Pertamax per Liter')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. TABEL KAS_TRANSAKSI (Struktur Kolom Pembayaran & Referensi)
-- ─────────────────────────────────────────────────────────────────────────

-- Pastikan kolom jenis_pembayaran ada ('tunai' atau 'non_tunai')
ALTER TABLE IF EXISTS kas_transaksi
  ADD COLUMN IF NOT EXISTS jenis_pembayaran text NOT NULL DEFAULT 'tunai';

-- Tambahkan constraint check jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kas_transaksi_jenis_pembayaran_check'
      AND conrelid = 'kas_transaksi'::regclass
  ) THEN
    ALTER TABLE kas_transaksi 
      ADD CONSTRAINT kas_transaksi_jenis_pembayaran_check 
      CHECK (jenis_pembayaran IN ('tunai', 'non_tunai'));
  END IF;
END $$;

-- Pastikan kolom rekening_id tersedia (opsional untuk integrasi langsung)
ALTER TABLE IF EXISTS kas_transaksi
  ADD COLUMN IF NOT EXISTS rekening_id text NULL;

-- Pastikan kolom siswa_id bersifat NULLABLE agar bisa menyimpan DP Kustom (Non-Siswa)
ALTER TABLE IF EXISTS kas_transaksi
  ALTER COLUMN siswa_id DROP NOT NULL;

-- Pastikan kolom sumber_otomatis ada (default false)
ALTER TABLE IF EXISTS kas_transaksi
  ADD COLUMN IF NOT EXISTS sumber_otomatis boolean NOT NULL DEFAULT false;

-- Indeks performa untuk kas_transaksi
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_tanggal ON kas_transaksi(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_tipe ON kas_transaksi(tipe);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_jenis_bayar ON kas_transaksi(jenis_pembayaran);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_kategori ON kas_transaksi(kategori);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_siswa ON kas_transaksi(siswa_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. STATUS SYNC HASIL
-- ─────────────────────────────────────────────────────────────────────────
SELECT 'Sinkronisasi database berhasil! Tabel settings, rekening_bank_list, dan kas_transaksi telah terkonfigurasi dengan sempurna.' AS status;
