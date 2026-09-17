-- Migration: Make km_saat_ganti optional (nullable) on kendaraan_ban table
ALTER TABLE kendaraan_ban ALTER COLUMN km_saat_ganti DROP NOT NULL;
