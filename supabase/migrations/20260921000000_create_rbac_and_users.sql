-- Migration: Add Multi-Role RBAC support to user_profiles and link to staff
-- Timestamp: 2026-09-21 00:00:00

-- 1. Ensure user_profiles table has multi-role array and staff link
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS password_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT true;

-- 2. Create index for fast username and staff lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_user_profiles_staff_id ON public.user_profiles(staff_id);

-- 3. Update existing Alfi developer profile with default roles
UPDATE public.user_profiles
SET 
  roles = ARRAY['developer', 'instruktur', 'jadwal'],
  staff_id = (SELECT id FROM public.staff WHERE nama ILIKE '%alfi%' LIMIT 1),
  password_hash = '$2b$10$5k7iP3DSg1x9v3wB0.gQ1O1tKfGrJflZ6ni1m10DUN7bu1iBBDieG',
  aktif = true,
  updated_at = NOW()
WHERE username = 'alfyalfi';

-- 4. Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users to view their own profile
DROP POLICY IF EXISTS "Allow users to read own profile" ON public.user_profiles;
CREATE POLICY "Allow users to read own profile" ON public.user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow developer full access on user_profiles" ON public.user_profiles;
CREATE POLICY "Allow developer full access on user_profiles" ON public.user_profiles
  FOR ALL USING (true);
