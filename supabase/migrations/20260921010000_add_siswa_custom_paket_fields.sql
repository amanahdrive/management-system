-- Migration: Add custom package configuration fields to siswa table and update v_siswa_session_summary view
-- Date: 2026-09-21

ALTER TABLE siswa
ADD COLUMN IF NOT EXISTS custom_jumlah_sesi INTEGER,
ADD COLUMN IF NOT EXISTS custom_nama_paket TEXT,
ADD COLUMN IF NOT EXISTS custom_jenis_mobil TEXT,
ADD COLUMN IF NOT EXISTS custom_termasuk_sim BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS custom_tarif_per_sesi INTEGER;

-- Update session summary view to prioritize custom_jumlah_sesi over default paket.jumlah_sesi
CREATE OR REPLACE VIEW v_siswa_session_summary AS
SELECT 
  s.id AS siswa_id,
  COALESCE(s.custom_jumlah_sesi, NULLIF(p.jumlah_sesi, 0), 10)::integer AS total_sesi,
  count(js.id) FILTER (WHERE js.status_sesi = 'selesai'::text)::integer AS selesai_count,
  count(js.id) FILTER (WHERE js.status_sesi = 'terjadwal'::text)::integer AS terjadwal_count,
  COALESCE(bool_or(js.status_sesi = 'terjadwal'::text), false) AS has_pending
FROM siswa s
LEFT JOIN paket p ON s.paket_id = p.id
LEFT JOIN jadwal_sesi js ON s.id = js.siswa_id AND js.status_sesi <> 'batal'::text
GROUP BY s.id, s.custom_jumlah_sesi, p.jumlah_sesi;
