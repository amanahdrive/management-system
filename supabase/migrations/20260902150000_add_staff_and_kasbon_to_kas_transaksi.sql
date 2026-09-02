-- ===========================================================================
-- AMANAH DRIVE PALEMBANG — ADD STAFF_ID & POTONGAN_KASBON TO KAS_TRANSAKSI
-- Migration: 20260902150000_add_staff_and_kasbon_to_kas_transaksi.sql
-- ===========================================================================

-- 1. Ensure kasbon category exists
INSERT INTO kas_kategori (nama_kategori, tipe) 
VALUES ('kasbon', 'pengeluaran') 
ON CONFLICT (nama_kategori) DO NOTHING;

-- 2. Add staff_id and potongan_kasbon columns to kas_transaksi
ALTER TABLE kas_transaksi ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE kas_transaksi ADD COLUMN IF NOT EXISTS potongan_kasbon INTEGER DEFAULT 0;

-- 3. Create index for high-performance staff kasbon queries
CREATE INDEX IF NOT EXISTS idx_fk_kas_transaksi_staff_id ON kas_transaksi(staff_id);

-- 4. Automatically link historical transactions to staff
UPDATE kas_transaksi SET staff_id = '2433a582-d25f-4356-a213-f89c3b1a95a4' WHERE keterangan ILIKE '%syawal%' AND staff_id IS NULL;
UPDATE kas_transaksi SET staff_id = 'aac2f4c5-93a2-4b76-9399-bbc9eb2c115b' WHERE (keterangan ILIKE '%lia%' OR keterangan ILIKE '%kasbon%lia%') AND staff_id IS NULL;
UPDATE kas_transaksi SET staff_id = 'ee08c877-d3b5-4621-a01a-962978d4c01a' WHERE keterangan ILIKE '%alpi%' AND staff_id IS NULL;
UPDATE kas_transaksi SET staff_id = '2cbeb8bd-25cc-48a0-a50b-24427b12c9e0' WHERE (keterangan ILIKE '%risky%' OR keterangan ILIKE '%riski%') AND staff_id IS NULL;
UPDATE kas_transaksi SET staff_id = '377f6c24-8ed9-4a19-8727-8de2b68e7d9a' WHERE keterangan ILIKE '%alfi%' AND staff_id IS NULL;

-- 5. Standardize historical kasbon category
UPDATE kas_transaksi SET kategori = 'kasbon' WHERE (keterangan ILIKE '%kasbon%' OR keterangan ILIKE 'kasbon%') AND tipe = 'pengeluaran';
