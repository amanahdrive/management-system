-- Migration SQL for Amanah Drive Database Schema
-- Version: 1.0

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums & Lookups
CREATE TYPE sumber_leads_enum AS ENUM ('meta_ads', 'tiktok', 'referensi', 'kustom');

-- 1. Master Paket
CREATE TABLE IF NOT EXISTS paket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_paket TEXT NOT NULL,
    jumlah_sesi INTEGER NOT NULL,
    termasuk_sim BOOLEAN NOT NULL DEFAULT FALSE,
    harga_normal INTEGER NOT NULL DEFAULT 0,
    harga_promo INTEGER NULL,
    jenis_mobil TEXT[] NOT NULL DEFAULT '{manual, matic}',
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Master Promosi
CREATE TABLE IF NOT EXISTS promosi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_promo TEXT NOT NULL,
    paket_id UUID REFERENCES paket(id) ON DELETE SET NULL,
    tipe_potongan TEXT NOT NULL CHECK (tipe_potongan IN ('persen', 'nominal')),
    nilai_potongan INTEGER NOT NULL,
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Master Status Pembayaran
CREATE TABLE IF NOT EXISTS status_pembayaran_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    warna_badge TEXT NOT NULL,
    urutan INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence for Siswa Kode
CREATE SEQUENCE IF NOT EXISTS siswa_kode_seq START WITH 1 INCREMENT BY 1;

-- 4. Siswa
CREATE TABLE IF NOT EXISTS siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_siswa TEXT UNIQUE NOT NULL DEFAULT ('SS' || lpad(nextval('siswa_kode_seq')::text, 3, '0')),
    nama TEXT NOT NULL,
    tanggal_booking DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_rencana_mulai DATE NOT NULL DEFAULT CURRENT_DATE,
    no_whatsapp TEXT NOT NULL,
    alamat TEXT NOT NULL,
    paket_id UUID NOT NULL REFERENCES paket(id),
    harga_final INTEGER NOT NULL,
    harga_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
    promosi_id UUID REFERENCES promosi(id) ON DELETE SET NULL,
    status_pembayaran_kode TEXT NOT NULL REFERENCES status_pembayaran_master(kode),
    dp_nominal INTEGER NULL,
    dp_tanggal DATE NULL,
    sumber sumber_leads_enum NOT NULL DEFAULT 'meta_ads',
    sumber_kustom_text TEXT NULL,
    catatan TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Master Jabatan
CREATE TABLE IF NOT EXISTS jabatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_jabatan TEXT UNIQUE NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Master Staff
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    foto_url TEXT NULL,
    tahun_bergabung INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    no_whatsapp TEXT NOT NULL,
    alamat TEXT NOT NULL,
    tanda_tangan_url TEXT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Junction Staff & Jabatan
CREATE TABLE IF NOT EXISTS staff_jabatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    jabatan_id UUID NOT NULL REFERENCES jabatan(id) ON DELETE CASCADE,
    UNIQUE (staff_id, jabatan_id)
);

-- 7. Slot Waktu
CREATE TABLE IF NOT EXISTS slot_waktu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_slot TEXT NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    kategori TEXT NOT NULL CHECK (kategori IN ('reguler', 'malam')),
    urutan INTEGER NOT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Master Kendaraan
CREATE TABLE IF NOT EXISTS kendaraan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kendaraan TEXT NOT NULL,
    tahun_produksi INTEGER NOT NULL,
    status_pembelian TEXT NOT NULL CHECK (status_pembelian IN ('baru', 'second')),
    tahun_pembelian INTEGER NOT NULL,
    plat_nomor TEXT NOT NULL,
    tipe_transmisi TEXT NOT NULL CHECK (tipe_transmisi IN ('manual', 'matic')),
    warna TEXT NOT NULL,
    foto_url TEXT NULL,
    aktif BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kendaraan Status
CREATE TABLE IF NOT EXISTS kendaraan_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kendaraan_id UUID UNIQUE NOT NULL REFERENCES kendaraan(id) ON DELETE CASCADE,
    odometer_terkini INTEGER NOT NULL DEFAULT 0,
    oli_tanggal_terakhir DATE NULL,
    oli_km_terakhir INTEGER NULL,
    cuci_tanggal_terakhir DATE NULL,
    bensin_tanggal_terakhir DATE NULL,
    bensin_jenis_terakhir TEXT NULL,
    bensin_nominal_terakhir INTEGER NULL,
    bensin_liter_terakhir NUMERIC NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Master Harga BBM
CREATE TABLE IF NOT EXISTS harga_bbm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jenis TEXT UNIQUE NOT NULL,
    harga_per_liter INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kendaraan Ban
CREATE TABLE IF NOT EXISTS kendaraan_ban (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kendaraan_id UUID NOT NULL REFERENCES kendaraan(id) ON DELETE CASCADE,
    posisi_ban TEXT NOT NULL CHECK (posisi_ban IN ('depan_kiri', 'depan_kanan', 'belakang_kiri', 'belakang_kanan', 'serep')),
    tanggal_ganti DATE NOT NULL,
    km_saat_ganti INTEGER NOT NULL,
    status_beli TEXT NOT NULL CHECK (status_beli IN ('baru', 'second')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kendaraan Log Harian
CREATE TABLE IF NOT EXISTS kendaraan_log_harian (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kendaraan_id UUID NOT NULL REFERENCES kendaraan(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    odometer_basecamp_out INTEGER NULL,
    odometer_basecamp_in INTEGER NULL,
    jarak_tempuh INTEGER NULL,
    total_slot_selesai INTEGER NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(kendaraan_id, tanggal)
);

-- 9. Jadwal Sesi
CREATE TABLE IF NOT EXISTS jadwal_sesi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES staff(id),
    kendaraan_id UUID REFERENCES kendaraan(id) ON DELETE SET NULL,
    jenis_mobil TEXT NOT NULL CHECK (jenis_mobil IN ('manual', 'matic', 'mobil_sendiri')),
    tanggal_sesi DATE NOT NULL,
    slot_waktu_id UUID NOT NULL REFERENCES slot_waktu(id),
    slot_waktu_id_akhir UUID REFERENCES slot_waktu(id),
    nomor_sesi_ke INTEGER NOT NULL,
    total_sesi_paket INTEGER NOT NULL,
    status_sesi TEXT NOT NULL DEFAULT 'terjadwal' CHECK (status_sesi IN ('terjadwal', 'selesai', 'batal')),
    catatan_sesi TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Kas Kategori
CREATE TABLE IF NOT EXISTS kas_kategori (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kategori TEXT UNIQUE NOT NULL,
    tipe TEXT NOT NULL CHECK (tipe IN ('pemasukan', 'pengeluaran', 'keduanya')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Hutang
CREATE TABLE IF NOT EXISTS hutang (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_hutang TEXT NOT NULL,
    jenis TEXT NOT NULL CHECK (jenis IN ('cicilan_kendaraan', 'pinjaman_perusahaan', 'lainnya')),
    total_hutang INTEGER NOT NULL,
    sisa_hutang INTEGER NOT NULL,
    tanggal_mulai DATE NOT NULL,
    jatuh_tempo_bulanan INTEGER NULL,
    cicilan_per_bulan INTEGER NULL,
    status TEXT NOT NULL DEFAULT 'berjalan' CHECK (status IN ('berjalan', 'lunas')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Kas Transaksi
CREATE TABLE IF NOT EXISTS kas_transaksi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    tipe TEXT NOT NULL CHECK (tipe IN ('pemasukan', 'pengeluaran')),
    kategori TEXT NOT NULL,
    keterangan TEXT NOT NULL,
    nominal INTEGER NOT NULL,
    pic_tipe TEXT NOT NULL CHECK (pic_tipe IN ('admin', 'finance')),
    pic_nama TEXT NOT NULL,
    foto_nota_url TEXT NULL,
    siswa_id UUID REFERENCES siswa(id) ON DELETE SET NULL,
    hutang_id UUID REFERENCES hutang(id) ON DELETE SET NULL,
    sumber_otomatis BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Hutang Pembayaran
CREATE TABLE IF NOT EXISTS hutang_pembayaran (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hutang_id UUID NOT NULL REFERENCES hutang(id) ON DELETE CASCADE,
    tanggal_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
    nominal INTEGER NOT NULL,
    kas_transaksi_id UUID REFERENCES kas_transaksi(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. System Settings
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    deskripsi TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Notifikasi Log
CREATE TABLE IF NOT EXISTS notifikasi_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipe TEXT NOT NULL,
    judul TEXT NOT NULL,
    isi_pesan TEXT NOT NULL,
    status_kirim TEXT NOT NULL CHECK (status_kirim IN ('terkirim', 'gagal')),
    error_message TEXT NULL,
    dikirim_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SEED DATA

-- Seed Status Pembayaran Master
INSERT INTO status_pembayaran_master (kode, label, warna_badge, urutan) VALUES
('belum_bayar', 'Belum Bayar', '#C13D3D', 1),
('dp', 'DP (Uang Muka)', '#B9821B', 2),
('lunas', 'Lunas', '#1B8A5A', 3),
('batal', 'Batal', '#5C6E6B', 4)
ON CONFLICT (kode) DO NOTHING;

-- Seed Paket Kursus
INSERT INTO paket (nama_paket, jumlah_sesi, termasuk_sim, harga_normal, harga_promo, jenis_mobil, is_custom) VALUES
('Basic (5x)', 5, false, 950000, 800000, '{manual, matic}', false),
('Basic + SIM (5x)', 5, true, 1700000, NULL, '{manual, matic}', false),
('Pro (10x)', 10, false, 1600000, NULL, '{manual, matic}', false),
('Pro + SIM (10x)', 10, true, 2300000, NULL, '{manual, matic}', false),
('Refresh / Pelancaran (3x)', 3, false, 500000, NULL, '{manual, matic, mobil_sendiri}', false),
('Khusus', 0, false, 0, NULL, '{manual, matic, mobil_sendiri}', true)
ON CONFLICT DO NOTHING;

-- Seed Jabatan
INSERT INTO jabatan (nama_jabatan) VALUES
('Owner'),
('Manager Utama'),
('Manager Keuangan'),
('Manager Bisnis'),
('Instruktur'),
('Admin'),
('Social Media Specialist'),
('Content Creator'),
('Fleet Officer (Pengawas Kendaraan Operasional)')
ON CONFLICT (nama_jabatan) DO NOTHING;

-- Seed Initial Staff (Instruktur)
INSERT INTO staff (nama, no_whatsapp, alamat, tahun_bergabung) VALUES
('Syawal', '081234567890', 'Palembang', 2023),
('Riski', '081234567891', 'Palembang', 2023),
('Alfi', '081234567892', 'Palembang', 2024)
ON CONFLICT DO NOTHING;

-- Link Initial Staff to Jabatan Instruktur
DO $$
DECLARE
    instruktur_jabatan_id UUID;
    staff_record RECORD;
BEGIN
    SELECT id INTO instruktur_jabatan_id FROM jabatan WHERE nama_jabatan = 'Instruktur' LIMIT 1;
    IF instruktur_jabatan_id IS NOT NULL THEN
        FOR staff_record IN SELECT id FROM staff LOOP
            INSERT INTO staff_jabatan (staff_id, jabatan_id)
            VALUES (staff_record.id, instruktur_jabatan_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- Seed Slot Waktu
INSERT INTO slot_waktu (nama_slot, jam_mulai, jam_selesai, kategori, urutan) VALUES
('Slot 1', '09:00:00', '10:30:00', 'reguler', 1),
('Slot 2', '11:00:00', '12:30:00', 'reguler', 2),
('Slot 3', '13:30:00', '15:00:00', 'reguler', 3),
('Slot 4', '15:30:00', '17:00:00', 'reguler', 4),
('Slot 5', '18:30:00', '20:00:00', 'malam', 5),
('Slot 6', '20:30:00', '22:00:00', 'malam', 6)
ON CONFLICT DO NOTHING;

-- Seed Harga BBM
INSERT INTO harga_bbm (jenis, harga_per_liter) VALUES
('pertalite', 10000),
('pertamax', 16300)
ON CONFLICT (jenis) DO NOTHING;

-- Seed Kas Kategori
INSERT INTO kas_kategori (nama_kategori, tipe) VALUES
('dp_siswa', 'pemasukan'),
('pelunasan_siswa', 'pemasukan'),
('bbm', 'pengeluaran'),
('operasional', 'pengeluaran'),
('gaji', 'pengeluaran'),
('cicilan_hutang', 'pengeluaran'),
('lainnya', 'keduanya')
ON CONFLICT (nama_kategori) DO NOTHING;

-- Seed Settings (including hashed PIN kas default '210100')
-- Hashed using bcrypt for '210100' -> $2a$10$wW5V1/0cEwG9G7sX4mXl3.WfK3/h6/Hh.L6xG.O7P3lM8M1b1V7yG
INSERT INTO settings (key, value, deskripsi) VALUES
('pin_kas', '$2a$10$wW5V1/0cEwG9G7sX4mXl3.WfK3/h6/Hh.L6xG.O7P3lM8M1b1V7yG', 'PIN 6-digit ter-hash untuk proteksi Kas'),
('nama_perusahaan', 'Amanah Drive', 'Nama usaha / brand'),
('kota_operasional', 'Palembang', 'Kota operasional utama'),
('wa_footer_template', '• Minta share lokasi kepada klien sebelum berangkat.\n• Laporan keluar Basecamp beserta foto odometer.\n• Laporan saat sesi dimulai.\n• Laporan saat sesi selesai.\n• Laporan kembali ke Basecamp beserta foto odometer.', 'Template catatan instruktur untuk generator WhatsApp'),
('notif_laporan_harian_aktif', 'true', 'Status notifikasi laporan harian'),
('notif_reminder_sesi_besok_aktif', 'true', 'Status reminder sesi besok'),
('notif_reminder_servis_aktif', 'true', 'Status reminder servis kendaraan'),
('notif_reminder_hutang_aktif', 'true', 'Status reminder hutang jatuh tempo')
ON CONFLICT (key) DO NOTHING;

-- Row Level Security (RLS) policies for v1 (public anon key full access)
ALTER TABLE paket ENABLE ROW LEVEL SECURITY;
ALTER TABLE promosi ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_pembayaran_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE jabatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_jabatan ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_waktu ENABLE ROW LEVEL SECURITY;
ALTER TABLE kendaraan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kendaraan_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE harga_bbm ENABLE ROW LEVEL SECURITY;
ALTER TABLE kendaraan_ban ENABLE ROW LEVEL SECURITY;
ALTER TABLE kendaraan_log_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_sesi ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutang ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_transaksi ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutang_pembayaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifikasi_log ENABLE ROW LEVEL SECURITY;

-- Allow anon access for v1 (internal tool)
CREATE POLICY "Allow public all on paket" ON paket FOR ALL USING (true);
CREATE POLICY "Allow public all on promosi" ON promosi FOR ALL USING (true);
CREATE POLICY "Allow public all on status_pembayaran_master" ON status_pembayaran_master FOR ALL USING (true);
CREATE POLICY "Allow public all on siswa" ON siswa FOR ALL USING (true);
CREATE POLICY "Allow public all on jabatan" ON jabatan FOR ALL USING (true);
CREATE POLICY "Allow public all on staff" ON staff FOR ALL USING (true);
CREATE POLICY "Allow public all on staff_jabatan" ON staff_jabatan FOR ALL USING (true);
CREATE POLICY "Allow public all on slot_waktu" ON slot_waktu FOR ALL USING (true);
CREATE POLICY "Allow public all on kendaraan" ON kendaraan FOR ALL USING (true);
CREATE POLICY "Allow public all on kendaraan_status" ON kendaraan_status FOR ALL USING (true);
CREATE POLICY "Allow public all on harga_bbm" ON harga_bbm FOR ALL USING (true);
CREATE POLICY "Allow public all on kendaraan_ban" ON kendaraan_ban FOR ALL USING (true);
CREATE POLICY "Allow public all on kendaraan_log_harian" ON kendaraan_log_harian FOR ALL USING (true);
CREATE POLICY "Allow public all on jadwal_sesi" ON jadwal_sesi FOR ALL USING (true);
CREATE POLICY "Allow public all on kas_kategori" ON kas_kategori FOR ALL USING (true);
CREATE POLICY "Allow public all on hutang" ON hutang FOR ALL USING (true);
CREATE POLICY "Allow public all on kas_transaksi" ON kas_transaksi FOR ALL USING (true);
CREATE POLICY "Allow public all on hutang_pembayaran" ON hutang_pembayaran FOR ALL USING (true);
CREATE POLICY "Allow public all on settings" ON settings FOR ALL USING (true);
CREATE POLICY "Allow public all on notifikasi_log" ON notifikasi_log FOR ALL USING (true);
