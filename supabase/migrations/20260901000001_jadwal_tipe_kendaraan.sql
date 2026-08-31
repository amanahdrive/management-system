-- Migration: Add tipe_kendaraan to jadwal_sesi and default instructor fee settings
ALTER TABLE jadwal_sesi 
ADD COLUMN IF NOT EXISTS tipe_kendaraan TEXT NOT NULL DEFAULT 'operasional';

-- Add check constraint for tipe_kendaraan if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'jadwal_sesi_tipe_kendaraan_check'
    ) THEN
        ALTER TABLE jadwal_sesi 
        ADD CONSTRAINT jadwal_sesi_tipe_kendaraan_check 
        CHECK (tipe_kendaraan IN ('operasional', 'pribadi'));
    END IF;
END $$;

-- Insert default instructor fee & meal allowance settings
INSERT INTO settings (key, value, deskripsi) VALUES 
('gaji_instruktur_operasional', '50000', 'Fee mengajar instruktur per sesi (Mobil Operasional)'),
('gaji_instruktur_pribadi', '70000', 'Fee mengajar instruktur per sesi (Mobil Pribadi)'),
('uang_makan_instruktur_harian', '15000', 'Uang makan harian instruktur per hari aktif mengajar')
ON CONFLICT (key) DO NOTHING;
