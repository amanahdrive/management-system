-- Migration: Performance and Security Audit Fixes
-- Version: 20260907000000
-- Generated from Performance Audit for Amanah Drive on Supabase Free Tier

-- 1. Drop redundant duplicate indexes to save storage & write I/O
DROP INDEX IF EXISTS public.idx_issued_certs_number;
DROP INDEX IF EXISTS public.idx_kas_transaksi_tanggal;
DROP INDEX IF EXISTS public.idx_jadwal_sesi_tanggal;

-- 2. Add missing foreign key index on issued_certificates(template_id)
CREATE INDEX IF NOT EXISTS idx_fk_issued_certs_template_id ON public.issued_certificates(template_id);

-- 3. Enable RLS on unprotected certificate tables
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issued_certificates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'certificate_templates' AND policyname = 'Allow public all on certificate_templates'
  ) THEN
    CREATE POLICY "Allow public all on certificate_templates"
      ON public.certificate_templates FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'issued_certificates' AND policyname = 'Allow public all on issued_certificates'
  ) THEN
    CREATE POLICY "Allow public all on issued_certificates"
      ON public.issued_certificates FOR ALL TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. Clean up duplicate permissive RLS policies on tables that have 2 identical policies
DROP POLICY IF EXISTS "Public access hutang" ON public.hutang;
DROP POLICY IF EXISTS "Public access hutang_pembayaran" ON public.hutang_pembayaran;
DROP POLICY IF EXISTS "Public access kas_kategori" ON public.kas_kategori;
DROP POLICY IF EXISTS "Public access kas_transaksi" ON public.kas_transaksi;
DROP POLICY IF EXISTS "Public access settings" ON public.settings;
DROP POLICY IF EXISTS "Public access status_pembayaran_master" ON public.status_pembayaran_master;

-- 5. View for student session summary (eliminating N+1 query loop on Siswa Page)
CREATE OR REPLACE VIEW public.v_siswa_session_summary WITH (security_invoker = true) AS
SELECT 
  s.id AS siswa_id,
  COALESCE(p.jumlah_sesi, 10)::integer AS total_sesi,
  COUNT(js.id) FILTER (WHERE js.status_sesi = 'selesai')::integer AS selesai_count,
  COUNT(js.id) FILTER (WHERE js.status_sesi = 'terjadwal')::integer AS terjadwal_count,
  COALESCE(BOOL_OR(js.status_sesi = 'terjadwal'), false) AS has_pending
FROM public.siswa s
LEFT JOIN public.paket p ON s.paket_id = p.id
LEFT JOIN public.jadwal_sesi js ON s.id = js.siswa_id AND js.status_sesi != 'batal'
GROUP BY s.id, p.jumlah_sesi;
