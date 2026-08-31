-- Migration: Add flexible date range, bbm consumption, and notes to kendaraan_log_harian
ALTER TABLE kendaraan_log_harian 
ADD COLUMN IF NOT EXISTS tanggal_akhir DATE NULL,
ADD COLUMN IF NOT EXISTS bbm_liter NUMERIC NULL,
ADD COLUMN IF NOT EXISTS bbm_nominal INTEGER NULL,
ADD COLUMN IF NOT EXISTS bbm_jenis TEXT NULL,
ADD COLUMN IF NOT EXISTS catatan TEXT NULL;

-- Index for date range querying
CREATE INDEX IF NOT EXISTS idx_kendaraan_log_tanggal_range ON kendaraan_log_harian(kendaraan_id, tanggal DESC);