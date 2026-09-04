const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.yhwwhqqffgtiavapgjvc:%40Limabelas15@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const updates = [
      { id: '377f6c24-8ed9-4a19-8727-8de2b68e7d9a', photo: '/staff_models/Alfi.png' },
      { id: 'ee08c877-d3b5-4621-a01a-962978d4c01a', photo: '/staff_models/Alpi.png' },
      { id: 'aac2f4c5-93a2-4b76-9399-bbc9eb2c115b', photo: '/staff_models/Lia.png' },
      { id: '2cbeb8bd-25cc-48a0-a50b-24427b12c9e0', photo: '/staff_models/Risky.png' },
      { id: '2433a582-d25f-4356-a213-f89c3b1a95a4', photo: '/staff_models/Syawal.png' }
    ];

    for (const u of updates) {
      await client.query('UPDATE staff SET foto_url = $1 WHERE id = $2', [u.photo, u.id]);
    }
    const verify = await client.query('SELECT id, nama, foto_url, aktif FROM staff ORDER BY nama ASC');
    console.log('Staff list after update:');
    console.table(verify.rows);
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(console.error);