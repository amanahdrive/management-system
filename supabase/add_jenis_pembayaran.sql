-- =============================================================
-- MIGRATION: Tambah kolom jenis_pembayaran di kas_transaksi
-- Jalankan di Supabase SQL Editor
-- Tanggal: 2026-08-12
-- =============================================================

-- 1. Tambah kolom jenis_pembayaran ke kas_transaksi
ALTER TABLE kas_transaksi
  ADD COLUMN IF NOT EXISTS jenis_pembayaran TEXT NOT NULL DEFAULT 'tunai'
  CHECK (jenis_pembayaran IN ('tunai', 'non_tunai'));

-- 2. Tambah komentar untuk dokumentasi
COMMENT ON COLUMN kas_transaksi.jenis_pembayaran IS 'Jenis pembayaran: tunai (cash) atau non_tunai (transfer, QRIS, dll)';

-- 3. Update getKasOverviewMetrics: buat view saldo per jenis (optional helper view)
CREATE OR REPLACE VIEW kas_saldo_per_jenis AS
SELECT
  jenis_pembayaran,
  SUM(CASE WHEN tipe = 'pemasukan' THEN nominal ELSE 0 END) AS total_masuk,
  SUM(CASE WHEN tipe = 'pengeluaran' THEN nominal ELSE 0 END) AS total_keluar,
  SUM(CASE WHEN tipe = 'pemasukan' THEN nominal ELSE -nominal END) AS saldo
FROM kas_transaksi
GROUP BY jenis_pembayaran;

-- 4. Pastikan RLS policy memperbolehkan operasi di baris baru
-- (tidak perlu jika sudah ada policy luas)

SELECT 'Migration selesai: kolom jenis_pembayaran berhasil ditambahkan.' AS status;
