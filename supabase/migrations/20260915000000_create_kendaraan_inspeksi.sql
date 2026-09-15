-- Migration: Create kendaraan_inspeksi table for daily fleet checklist
CREATE TABLE IF NOT EXISTS kendaraan_inspeksi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kendaraan_id uuid NOT NULL REFERENCES kendaraan(id) ON DELETE CASCADE,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  waktu_shift text NOT NULL DEFAULT 'pagi' CHECK (waktu_shift IN ('pagi', 'sore', 'malam')),
  pic_nama text NOT NULL,
  odometer_inspeksi integer NULL,
  kondisi_mesin text NOT NULL DEFAULT 'baik',
  kondisi_rem text NOT NULL DEFAULT 'baik',
  kondisi_ban text NOT NULL DEFAULT 'baik',
  kondisi_kelistrikan text NOT NULL DEFAULT 'baik',
  kondisi_ac text NOT NULL DEFAULT 'baik',
  kondisi_pedal_ganda text NOT NULL DEFAULT 'baik',
  kebersihan text NOT NULL DEFAULT 'bersih',
  stnk_lengkap boolean NOT NULL DEFAULT true,
  p3k_dan_alat boolean NOT NULL DEFAULT true,
  status_kelayakan text NOT NULL DEFAULT 'siap_jalan' CHECK (status_kelayakan IN ('siap_jalan', 'waspada', 'tidak_layak')),
  catatan text NULL,
  items_checklist jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kendaraan_inspeksi_tanggal ON kendaraan_inspeksi(kendaraan_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_kendaraan_inspeksi_status ON kendaraan_inspeksi(status_kelayakan);

-- RLS Policy
ALTER TABLE IF EXISTS kendaraan_inspeksi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on kendaraan_inspeksi" ON kendaraan_inspeksi;
CREATE POLICY "Allow public all on kendaraan_inspeksi" ON kendaraan_inspeksi FOR ALL USING (true) WITH CHECK (true);
