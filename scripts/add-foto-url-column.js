const { Pool } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres.yhwwhqqffgtiavapgjvc:%40Limabelas15@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Connecting to database...');
    await client.query(`
      ALTER TABLE public.user_profiles 
        ADD COLUMN IF NOT EXISTS foto_url TEXT NULL;
    `);
    console.log('Successfully added foto_url column to user_profiles table!');

    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' AND table_schema = 'public';
    `);
    console.log('Columns in user_profiles:', res.rows.map(r => r.column_name));
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Error running migration:', err);
  process.exit(1);
});
