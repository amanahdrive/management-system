const { Client } = require('pg');

const password = '@Limabelas15';
const encodedPassword = encodeURIComponent(password);
const connStr = 'postgresql://postgres:' + encodedPassword + '@db.yhwwhqqffgtiavapgjvc.supabase.co:5432/postgres';

async function update() {
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const realHash = '$2b$10$NtADby60x97hQONHFysp5uVobL5fIxFkLhWRe5uRLp1qqFPFqcT1m';
    const res = await client.query('UPDATE settings SET value = $1, deskripsi = $2, updated_at = NOW() WHERE key = $3', [
      realHash,
      'PIN Kas Keuangan & PWA Finance (Default: 210100)',
      'pin_kas'
    ]);
    console.log('SUCCESS: Updated pin_kas in Supabase! Rows affected:', res.rowCount);
  } catch (err) {
    console.error('Error updating pin_kas:', err);
  } finally {
    await client.end();
  }
}

update();
