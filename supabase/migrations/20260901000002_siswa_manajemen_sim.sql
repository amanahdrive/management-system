-- Migration: 20260901000002_siswa_manajemen_sim.sql
-- Description: Add SIM management columns and archiving flags to siswa table

ALTER TABLE siswa
  ADD COLUMN IF NOT EXISTS status_sim text NOT NULL DEFAULT 'belum',
  ADD COLUMN IF NOT EXISTS tanggal_selesai_sim date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS catatan_sim text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT FALSE;

-- Ensure default value for existing rows
UPDATE siswa SET status_sim = 'belum' WHERE status_sim IS NULL;
UPDATE siswa SET is_archived = FALSE WHERE is_archived IS NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_siswa_status_sim ON siswa(status_sim);
CREATE INDEX IF NOT EXISTS idx_siswa_is_archived ON siswa(is_archived);
CREATE INDEX IF NOT EXISTS idx_siswa_tanggal_booking ON siswa(tanggal_booking);
