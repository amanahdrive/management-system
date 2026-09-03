const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.yhwwhqqffgtiavapgjvc:%40Limabelas15@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Creating certificate tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS certificate_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        pdf_template_url TEXT NOT NULL,
        page_width NUMERIC NOT NULL DEFAULT 842.25,
        page_height NUMERIC NOT NULL DEFAULT 595.5,
        is_active BOOLEAN NOT NULL DEFAULT true,
        fields JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS issued_certificates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES siswa(id) ON DELETE CASCADE,
        certificate_number VARCHAR(100) UNIQUE NOT NULL,
        template_id UUID REFERENCES certificate_templates(id) ON DELETE SET NULL,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        generated_pdf_path TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'valid',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_issued_certs_student_id ON issued_certificates(student_id);
      CREATE INDEX IF NOT EXISTS idx_issued_certs_number ON issued_certificates(certificate_number);
    `);
    console.log('Tables created successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
