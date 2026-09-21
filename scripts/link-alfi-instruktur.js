const { Pool } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres.yhwwhqqffgtiavapgjvc:%40Limabelas15@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Linking Alfi to Instruktur jabatan...');
    const alfiStaffId = '377f6c24-8ed9-4a19-8727-8de2b68e7d9a';
    const instrukturJabatanId = '9c15ce5c-4143-425a-8217-a5b19d29ce93';

    await client.query(`
      INSERT INTO public.staff_jabatan (staff_id, jabatan_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `, [alfiStaffId, instrukturJabatanId]);

    const res = await client.query(`
      SELECT s.id, s.nama, j.nama_jabatan 
      FROM public.staff s 
      JOIN public.staff_jabatan sj ON s.id = sj.staff_id 
      JOIN public.jabatan j ON sj.jabatan_id = j.id
      WHERE s.id = $1;
    `, [alfiStaffId]);

    console.log('Alfi jabatans:', res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Error linking Alfi to Instruktur:', err);
  process.exit(1);
});
