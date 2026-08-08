-- ==========================================================
-- OPTIONAL DATABASE SCHEMA UPDATE SCRIPT (SUPABASE SQL EDITOR)
-- AMANAH DRIVE PALEMBANG MANAGEMENT SYSTEM
-- ==========================================================

-- 1. Tambahkan kolom pendukung ketersediaan instruktur pada tabel staff (Opsional, Idempoten & Aman)
ALTER TABLE IF EXISTS staff 
  ADD COLUMN IF NOT EXISTS hari_kerja text[] DEFAULT ARRAY['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'],
  ADD COLUMN IF NOT EXISTS slot_kerja text[] DEFAULT ARRAY['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'],
  ADD COLUMN IF NOT EXISTS jadwal_ketersediaan jsonb DEFAULT '{}'::jsonb;

-- 2. Pastikan tabel settings memiliki constraint unique key untuk penyimpanan konfigurasi global
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  deskripsi text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Optimasi Indexing Query Cepat & Anti Bentrok Real-Time
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_tanggal_staff ON jadwal_sesi(tanggal_sesi, staff_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_siswa ON jadwal_sesi(siswa_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_tanggal ON kas_transaksi(tanggal);

-- 4. Tambah kolom slot_waktu_id_akhir ke tabel jadwal_sesi untuk mendukung sesi double slot
ALTER TABLE IF EXISTS jadwal_sesi
  ADD COLUMN IF NOT EXISTS slot_waktu_id_akhir uuid REFERENCES slot_waktu(id) ON DELETE SET NULL;
