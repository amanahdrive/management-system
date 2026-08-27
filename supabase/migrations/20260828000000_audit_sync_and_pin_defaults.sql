-- ===========================================================================
-- AMANAH DRIVE PALEMBANG — AUDIT SYNC & PIN DEFAULTS MIGRATION
-- Versi: 2026.08.28
-- File: supabase/migrations/20260828000000_audit_sync_and_pin_defaults.sql
-- Jalankan di: Supabase Dashboard → SQL Editor → Run
-- Script ini IDEMPOTEN (Aman dijalankan berulang kali, tidak merusak data)
-- ===========================================================================

-- 1. Pastikan tabel settings memiliki default pin_kas_enabled = 'false' jika belum ada
INSERT INTO settings (key, value, deskripsi)
VALUES ('pin_kas_enabled', 'false', 'Status Proteksi PIN Kas & Keuangan (Default: false)')
ON CONFLICT (key) DO NOTHING;

-- 2. Pastikan kolom-kolom relasi kas dan pembayaran memiliki indeks performa
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_siswa_id ON kas_transaksi(siswa_id);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_tanggal ON kas_transaksi(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_tipe_kategori ON kas_transaksi(tipe, kategori);
CREATE INDEX IF NOT EXISTS idx_kas_transaksi_jenis_bayar ON kas_transaksi(jenis_pembayaran);

-- 3. Pastikan kolom-kolom pencarian siswa terindeks
CREATE INDEX IF NOT EXISTS idx_siswa_status_bayar ON siswa(status_pembayaran_kode);
CREATE INDEX IF NOT EXISTS idx_siswa_tanggal_booking ON siswa(tanggal_booking DESC);
CREATE INDEX IF NOT EXISTS idx_siswa_paket_id ON siswa(paket_id);

-- 4. Pastikan kolom-kolom jadwal sesi terindeks
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_tanggal ON jadwal_sesi(tanggal_sesi);
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_siswa ON jadwal_sesi(siswa_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_staff ON jadwal_sesi(staff_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_slot ON jadwal_sesi(slot_waktu_id);

-- Selesai
