const { Pool } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres.yhwwhqqffgtiavapgjvc:%40Limabelas15@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Running migration: Add log_items to kendaraan_log_harian...');
    await client.query(`
      ALTER TABLE public.kendaraan_log_harian 
      ADD COLUMN IF NOT EXISTS log_items JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);
    console.log('Column log_items successfully created!');

    const res = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'kendaraan_log_harian' AND column_name = 'log_items';
    `);
    console.log('Verification:', res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
