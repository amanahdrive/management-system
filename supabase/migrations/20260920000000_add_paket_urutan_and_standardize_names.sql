-- Migration: 20260920000000_add_paket_urutan_and_standardize_names.sql
-- Purpose: Menambahkan kolom urutan pada tabel paket untuk enterprise sorting,
--          membuat index urutan, dan melakukan standarisasi nama paket agar rapi dan bebas redundansi.

-- 1. Tambah kolom urutan pada tabel paket jika belum ada
ALTER TABLE public.paket 
ADD COLUMN IF NOT EXISTS urutan INTEGER NOT NULL DEFAULT 100;

-- 2. Buat index pada kolom urutan untuk kecepatan sorting
CREATE INDEX IF NOT EXISTS idx_paket_urutan ON public.paket (urutan ASC, jumlah_sesi ASC);

-- 3. Update data paket yang sudah ada dengan urutan logis dan penulisan standar enterprise
-- Urutan 1: Refresh / Pelancaran (3 Sesi)
UPDATE public.paket 
SET urutan = 1,
    nama_paket = 'Refresh / Pelancaran (3 Sesi)'
WHERE id = '852803cb-d7d5-43ff-b478-cd5f55e93593';

-- Urutan 2: Refresh / Pelancaran + SIM (3 Sesi)
UPDATE public.paket 
SET urutan = 2,
    nama_paket = 'Refresh / Pelancaran + SIM (3 Sesi)'
WHERE id = '3ae95c93-6f49-48e1-9c15-302e51d2c27f';

-- Urutan 3: Basic (5 Sesi)
UPDATE public.paket 
SET urutan = 3,
    nama_paket = 'Basic (5 Sesi)'
WHERE id = '8858ace5-1f98-4b94-83fc-f4cbe89f9bde';

-- Urutan 4: Basic + SIM (5 Sesi)
UPDATE public.paket 
SET urutan = 4,
    nama_paket = 'Basic + SIM (5 Sesi)'
WHERE id = '0bc8a159-0a9e-4345-b03e-fc1b7c19cdd8';

-- Urutan 5: Pro (10 Sesi)
UPDATE public.paket 
SET urutan = 5,
    nama_paket = 'Pro (10 Sesi)'
WHERE id = '2c3bb780-22c9-4b29-a6c0-3c19ac535c2d';

-- Urutan 6: Pro + SIM (10 Sesi)
UPDATE public.paket 
SET urutan = 6,
    nama_paket = 'Pro + SIM (10 Sesi)'
WHERE id = '64c0b844-f4c7-498b-9449-4067215579a4';

-- Urutan 7: Mobil Sendiri - Basic (5 Sesi)
UPDATE public.paket 
SET urutan = 7,
    nama_paket = 'Mobil Sendiri - Basic (5 Sesi)'
WHERE id = 'e314c30f-16ee-4bf2-970f-e4991f801b88';

-- Urutan 8: Mobil Sendiri - Basic + SIM (5 Sesi)
UPDATE public.paket 
SET urutan = 8,
    nama_paket = 'Mobil Sendiri - Basic + SIM (5 Sesi)'
WHERE id = '09c7a67a-6093-4ebe-b12a-55e8457fbb88';

-- Urutan 99: Khusus (Fleksibel / Kustom)
UPDATE public.paket 
SET urutan = 99,
    nama_paket = 'Khusus (Fleksibel / Kustom)'
WHERE id = 'e7095628-fc1b-4407-99e7-c0e4ce53e1c9';
