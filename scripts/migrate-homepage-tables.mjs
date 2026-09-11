import pg from 'pg';
const { Client } = pg;

const CONNECTION_STRING = process.env.DATABASE_URL;

async function migrate() {
  if (!CONNECTION_STRING) {
    console.error('Error: DATABASE_URL environment variable is required.');
    process.exit(1);
  }
  const client = new Client({ connectionString: CONNECTION_STRING });
  await client.connect();
  console.log('Connected to Supabase Postgres...');

  try {
    await client.query('BEGIN');

    // 1. homepage_leads table
    console.log('Creating homepage_leads table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.homepage_leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nama TEXT NOT NULL,
        whatsapp TEXT NOT NULL,
        paket_id UUID REFERENCES public.paket(id) ON DELETE SET NULL,
        paket_nama TEXT,
        kendaraan_id UUID REFERENCES public.kendaraan(id) ON DELETE SET NULL,
        kendaraan_nama TEXT,
        slot_waktu_id UUID REFERENCES public.slot_waktu(id) ON DELETE SET NULL,
        slot_waktu_nama TEXT,
        antar_jemput BOOLEAN DEFAULT false,
        alamat_jemput TEXT,
        catatan TEXT,
        status TEXT NOT NULL DEFAULT 'baru',
        source TEXT DEFAULT 'homepage_form',
        ip_address TEXT,
        user_agent TEXT,
        meta_event_id TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_homepage_leads_status ON public.homepage_leads(status);
      CREATE INDEX IF NOT EXISTS idx_homepage_leads_created_at ON public.homepage_leads(created_at DESC);
    `);

    // 2. homepage_settings table
    console.log('Creating homepage_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.homepage_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      INSERT INTO public.homepage_settings (key, value)
      VALUES 
      ('contact_info', jsonb_build_object(
        'phone', '+628137790961',
        'display_phone', '0813-7790-961',
        'name', 'Kak Lia',
        'role', 'Konsultan Kursus & Student Care',
        'avatar_url', '/assets/lia-profile.webp'
      )),
      ('maps_info', jsonb_build_object(
        'embed_url', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d45078.95267279368!2d104.69953335300335!3d-2.9714931721378597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e3b758980fc77a1%3A0x3a59dd8b6033f81b!2sAmanah%20Drive%20Palembang%20-%20KURSUS%20MENGEMUDI%20PALEMBANG!5e0!3m2!1sen!2sid!4v1789146853835!5m2!1sen!2sid',
        'address', 'Jl. Demang Lebar Daun No. 45, Palembang, Sumatera Selatan',
        'title', 'Amanah Drive Palembang'
      ))
      ON CONFLICT (key) DO NOTHING;
    `);

    // 3. homepage_events table
    console.log('Creating homepage_events table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.homepage_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type TEXT NOT NULL,
        event_source TEXT,
        event_id TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_homepage_events_type ON public.homepage_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_homepage_events_created_at ON public.homepage_events(created_at DESC);
    `);

    // 4. Row Level Security policies
    console.log('Configuring Row Level Security...');
    await client.query(`
      ALTER TABLE public.homepage_leads ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.homepage_settings ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.homepage_events ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if any to ensure clean state
      DROP POLICY IF EXISTS "Allow anon insert leads" ON public.homepage_leads;
      DROP POLICY IF EXISTS "Allow authenticated full leads" ON public.homepage_leads;
      DROP POLICY IF EXISTS "Allow anon read settings" ON public.homepage_settings;
      DROP POLICY IF EXISTS "Allow authenticated full settings" ON public.homepage_settings;
      DROP POLICY IF EXISTS "Allow anon insert events" ON public.homepage_events;
      DROP POLICY IF EXISTS "Allow authenticated full events" ON public.homepage_events;

      -- Policies for homepage_leads
      CREATE POLICY "Allow anon insert leads" ON public.homepage_leads
        FOR INSERT TO anon WITH CHECK (true);
      CREATE POLICY "Allow authenticated full leads" ON public.homepage_leads
        FOR ALL TO authenticated USING (true) WITH CHECK (true);

      -- Policies for homepage_settings
      CREATE POLICY "Allow anon read settings" ON public.homepage_settings
        FOR SELECT TO anon USING (true);
      CREATE POLICY "Allow authenticated full settings" ON public.homepage_settings
        FOR ALL TO authenticated USING (true) WITH CHECK (true);

      -- Policies for homepage_events
      CREATE POLICY "Allow anon insert events" ON public.homepage_events
        FOR INSERT TO anon WITH CHECK (true);
      CREATE POLICY "Allow authenticated full events" ON public.homepage_events
        FOR ALL TO authenticated USING (true) WITH CHECK (true);
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
