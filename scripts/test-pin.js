const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const password = '@Limabelas15';
const encodedPassword = encodeURIComponent(password);
const connStr = 'postgresql://postgres:' + encodedPassword + '@db.yhwwhqqffgtiavapgjvc.supabase.co:5432/postgres';

const hash = '$2b$10$R8rNaSgluTw0jHqja96RpukOfjeGH0wcgws0OmTZV8qmbgp/dNeFq';

async function test() {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();
  
  await client.query('UPDATE settings SET value = $1 WHERE key = $2', [hash, 'pin_kas']);
  console.log('Updated Supabase pin_kas hash successfully!');
  
  const res = await client.query('SELECT value FROM settings WHERE key = $1', ['pin_kas']);
  const dbHash = res.rows[0].value;
  console.log('Fetched from DB:', dbHash);
  
  const isMatch = await bcrypt.compare('210100', dbHash);
  console.log('Does 210100 match DB hash?', isMatch);
  
  await client.end();
}

test();
