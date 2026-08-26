const { Pool } = require('pg');

const password = '@Limabelas15';
const encodedPassword = encodeURIComponent(password);
const connStr = 'postgresql://postgres:' + encodedPassword + '@db.yhwwhqqffgtiavapgjvc.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function test() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT count(*) FROM kas_transaksi');
    console.log('Direct PG query SUCCESS! Kas count:', res.rows[0].count);
    const setRes = await client.query("SELECT value FROM settings WHERE key = 'rekening_bank_list'");
    console.log('Settings rekening:', setRes.rows[0].value.slice(0, 100));
  } finally {
    client.release();
    await pool.end();
  }
}
test();
