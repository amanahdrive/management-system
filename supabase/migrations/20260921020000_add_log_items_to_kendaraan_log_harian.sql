-- Migration: Add log_items JSONB column to kendaraan_log_harian
ALTER TABLE public.kendaraan_log_harian 
ADD COLUMN IF NOT EXISTS log_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.kendaraan_log_harian.log_items IS 'Daftar sub-event odometer harian (ODO BC OUT, ODO BC IN, ODO SESI MULAI, ODO SESI SELESAI)';
