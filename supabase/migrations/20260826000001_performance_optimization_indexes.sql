-- ===========================================================================
-- AMANAH DRIVE PALEMBANG — DATABASE PERFORMANCE & QUERY OPTIMIZATION (v6)
-- Jalankan di: Supabase Dashboard → SQL Editor → Run
-- Mengoptimalkan kecepatan query database pada Supabase Free Tier
-- ===========================================================================

-- 1. Optimasi Tabel Settings (Konfigurasi & Rekening Bank)
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  deskripsi text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- 2. Optimasi Tabel Kas Transaksi (Buku Kas & Cashflow)
ALTER TABLE IF EXISTS kas_transaksi
  ADD COLUMN IF NOT EXISTS jenis_pembayaran text NOT NULL DEFAULT 'tunai',
  ADD COLUMN IF NOT EXISTS rekening_id text NULL,
  ADD COLUMN IF NOT EXISTS sumber_otomatis boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS kas_transaksi
  ALTER COLUMN siswa_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kas_transaksi_tanggal ON kas_transaksi(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_tipe ON kas_transaksi(tipe);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_jenis_bayar ON kas_transaksi(jenis_pembayaran);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_kategori ON kas_transaksi(kategori);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_siswa ON kas_transaksi(siswa_id);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_tipe_tanggal ON kas_transaksi(tipe, tanggal DESC);

-- 3. Optimasi Tabel Siswa & Status Pembayaran
CREATE INDEX IF NOT EXISTS idx_siswa_status_bayar ON siswa(status_pembayaran_kode);
CREATE INDEX IF NOT EXISTS idx_siswa_tanggal_booking ON siswa(tanggal_booking DESC);
CREATE INDEX IF NOT EXISTS idx_siswa_kode ON siswa(kode_siswa);

-- 4. Optimasi Tabel Jadwal Sesi
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_tanggal ON jadwal_sesi(tanggal_sesi);
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_tanggal_staff ON jadwal_sesi(tanggal_sesi, staff_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_siswa ON jadwal_sesi(siswa_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_status ON jadwal_sesi(status_sesi);
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_kendaraan ON jadwal_sesi(kendaraan_id);

-- 5. Optimasi Tabel Log Kendaraan & Armada
CREATE INDEX IF NOT EXISTS idx_kendaraan_log_tanggal ON kendaraan_log_harian(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_kendaraan_log_kendaraan ON kendaraan_log_harian(kendaraan_id);

-- 6. Optimasi Tabel Hutang
CREATE INDEX IF NOT EXISTS idx_hutang_status ON hutang(status);

-- 7. Optimasi Tabel Notifikasi Log
CREATE INDEX IF NOT EXISTS idx_notifikasi_log_dikirim ON notifikasi_log(dikirim_at DESC);

SELECT 'Seluruh indeks performa dan optimasi database berhasil diaktifkan!' AS status;
