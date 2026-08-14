-- ===========================================================================
-- AMANAH DRIVE PALEMBANG — TABEL PENCATATAN DATA INSIDEN (v4)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS insiden (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_insiden text UNIQUE NOT NULL,
  tanggal_insiden date NOT NULL DEFAULT CURRENT_DATE,
  jam_insiden text DEFAULT '08:00',
  kendaraan_id uuid REFERENCES kendaraan(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  siswa_id uuid REFERENCES siswa(id) ON DELETE SET NULL,
  jadwal_sesi_id uuid REFERENCES jadwal_sesi(id) ON DELETE SET NULL,
  kategori text NOT NULL DEFAULT 'lainnya',
  tingkat_keparahan text NOT NULL DEFAULT 'ringan',
  lokasi_kejadian text NOT NULL,
  deskripsi_kejadian text NOT NULL,
  kronologi_singkat text,
  kondisi_kendaraan text,
  kondisi_pengemudi text,
  estimasi_biaya numeric DEFAULT 0,
  biaya_aktual numeric DEFAULT 0,
  penanggung_biaya text DEFAULT 'perusahaan',
  status_penanganan text NOT NULL DEFAULT 'dilaporkan',
  tindakan_penanganan text,
  foto_bukti_urls text[],
  catatan text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indeks performa untuk query cepat & filter
CREATE INDEX IF NOT EXISTS idx_insiden_tanggal ON insiden(tanggal_insiden DESC);
CREATE INDEX IF NOT EXISTS idx_insiden_kendaraan ON insiden(kendaraan_id);
CREATE INDEX IF NOT EXISTS idx_insiden_staff ON insiden(staff_id);
CREATE INDEX IF NOT EXISTS idx_insiden_siswa ON insiden(siswa_id);
CREATE INDEX IF NOT EXISTS idx_insiden_status ON insiden(status_penanganan);
CREATE INDEX IF NOT EXISTS idx_insiden_tingkat_keparahan ON insiden(tingkat_keparahan);
CREATE INDEX IF NOT EXISTS idx_insiden_kategori ON insiden(kategori);
