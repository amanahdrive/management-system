-- ===========================================================================
-- AMANAH DRIVE PALEMBANG — DATABASE RELATIONS AUDIT & PERFORMANCE OPTIMIZATION
-- Migration: 20260902000000_database_audit_and_relations_optimization.sql
-- Description: 
--   1. Clean up duplicate & redundant indexes / constraints
--   2. Add missing foreign key indexes to eliminate sequential scans & table locks
--   3. Add high-performance composite indexes for dashboard & analytics queries
--   4. Implement generic automated updated_at timestamp trigger for all tables
-- ===========================================================================

-- 1. CLEANUP DUPLICATE & REDUNDANT INDEXES AND CONSTRAINTS
DROP INDEX IF EXISTS idx_siswa_status_pembayaran;
DROP INDEX IF EXISTS idx_siswa_kode;
DROP INDEX IF EXISTS idx_settings_key;
DROP INDEX IF EXISTS idx_kas_transaksi_tipe;
ALTER TABLE IF EXISTS siswa DROP CONSTRAINT IF EXISTS siswa_kode_siswa_unique;

-- 2. CREATE MISSING FOREIGN KEY INDEXES
CREATE INDEX IF NOT EXISTS idx_fk_siswa_paket_id ON siswa(paket_id);
CREATE INDEX IF NOT EXISTS idx_fk_siswa_promosi_id ON siswa(promosi_id) WHERE promosi_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fk_jadwal_sesi_staff_id ON jadwal_sesi(staff_id);
CREATE INDEX IF NOT EXISTS idx_fk_jadwal_sesi_slot_waktu ON jadwal_sesi(slot_waktu_id);
CREATE INDEX IF NOT EXISTS idx_fk_jadwal_sesi_slot_waktu_akhir ON jadwal_sesi(slot_waktu_id_akhir) WHERE slot_waktu_id_akhir IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fk_promosi_paket_id ON promosi(paket_id) WHERE paket_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fk_staff_jabatan_jabatan_id ON staff_jabatan(jabatan_id);
CREATE INDEX IF NOT EXISTS idx_fk_kendaraan_ban_kendaraan_id ON kendaraan_ban(kendaraan_id);
CREATE INDEX IF NOT EXISTS idx_fk_hutang_pembayaran_kas_tx ON hutang_pembayaran(kas_transaksi_id) WHERE kas_transaksi_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fk_insiden_jadwal_sesi_id ON insiden(jadwal_sesi_id) WHERE jadwal_sesi_id IS NOT NULL;

-- 3. COMPOSITE INDEXES FOR FAST REPORTING & DASHBOARD QUERIES
CREATE INDEX IF NOT EXISTS idx_jadwal_sesi_tanggal_status ON jadwal_sesi(tanggal_sesi, status_sesi);
CREATE INDEX IF NOT EXISTS idx_siswa_tanggal_status ON siswa(tanggal_booking DESC, status_pembayaran_kode);

-- 4. AUTOMATED UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to all tables that contain updated_at column
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN 
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;', tbl);
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();', tbl);
  END LOOP;
END $$;
