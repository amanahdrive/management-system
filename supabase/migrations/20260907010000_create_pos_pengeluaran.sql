-- ==============================================================================
-- Migration: Create POS Pengeluaran, Indexes, RLS, and Seed Default Settings
-- Date: 2026-09-07
-- ==============================================================================

-- 1. Create pos_pengeluaran table
CREATE TABLE IF NOT EXISTS public.pos_pengeluaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_pos TEXT NOT NULL,
    kategori TEXT NOT NULL DEFAULT 'operasional',
    nominal_estimasi NUMERIC(15, 2) NOT NULL DEFAULT 0,
    nominal_realisasi NUMERIC(15, 2) DEFAULT 0,
    is_fluktuatif BOOLEAN DEFAULT FALSE,
    sumber TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'otomatis_sim', 'otomatis_hutang', 'otomatis_operasional'
    periode_bulan TEXT NOT NULL, -- 'YYYY-MM'
    tanggal_jatuh_tempo DATE,
    status TEXT NOT NULL DEFAULT 'belum_bayar', -- 'belum_bayar', 'terbayar', 'dibatalkan'
    kas_transaksi_id UUID REFERENCES public.kas_transaksi(id) ON DELETE SET NULL,
    siswa_id UUID REFERENCES public.siswa(id) ON DELETE SET NULL,
    hutang_id UUID REFERENCES public.hutang(id) ON DELETE SET NULL,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create optimized indexes for pos_pengeluaran
CREATE INDEX IF NOT EXISTS idx_pos_pengeluaran_periode_status 
    ON public.pos_pengeluaran(periode_bulan, status);

CREATE INDEX IF NOT EXISTS idx_pos_pengeluaran_sumber 
    ON public.pos_pengeluaran(sumber);

CREATE INDEX IF NOT EXISTS idx_pos_pengeluaran_siswa 
    ON public.pos_pengeluaran(siswa_id) 
    WHERE siswa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pos_pengeluaran_hutang 
    ON public.pos_pengeluaran(hutang_id) 
    WHERE hutang_id IS NOT NULL;

-- 3. Enable RLS and add policies
ALTER TABLE public.pos_pengeluaran ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pos_pengeluaran' AND policyname = 'pos_pengeluaran_all_access'
    ) THEN
        CREATE POLICY pos_pengeluaran_all_access ON public.pos_pengeluaran
            FOR ALL
            TO public
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- 4. Ensure 'biaya_sim' category exists in kas_kategori
INSERT INTO public.kas_kategori (nama_kategori, tipe, created_at, updated_at)
VALUES ('biaya_sim', 'pengeluaran', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 5. Seed default settings for SIM modal price and recurring operational expenses
INSERT INTO public.settings (key, value, deskripsi, created_at, updated_at)
VALUES 
    ('modal_sim_harga', '850000', 'Harga modal penerbitan SIM per siswa', NOW(), NOW()),
    ('modal_sim_config', '{"SIM A": 850000, "SIM C": 650000, "default": 850000}', 'Konfigurasi harga modal SIM per jenis', NOW(), NOW()),
    ('pos_operasional_token_nominal', '200000', 'Nominal pengeluaran rutin Token Listrik per bulan', NOW(), NOW()),
    ('pos_operasional_token_tanggal', '5', 'Tanggal jatuh tempo bayar Token Listrik bulanan', NOW(), NOW()),
    ('pos_operasional_wifi_nominal', '300000', 'Nominal pengeluaran rutin WiFi Kantor per bulan', NOW(), NOW()),
    ('pos_operasional_wifi_tanggal', '10', 'Tanggal jatuh tempo bayar WiFi Kantor bulanan', NOW(), NOW()),
    ('pos_operasional_air_nominal', '100000', 'Estimasi pengeluaran rutin Air PDAM (fluktuatif) per bulan', NOW(), NOW()),
    ('pos_operasional_air_tanggal', '20', 'Tanggal jatuh tempo bayar Air PDAM bulanan', NOW(), NOW()),
    ('pos_operasional_air_fluktuatif', 'true', 'Flag pengeluaran air bersifat fluktuatif', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
