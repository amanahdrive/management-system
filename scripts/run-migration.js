const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const password = '@Limabelas15';
const encodedPassword = encodeURIComponent(password);
const connStr = 'postgresql://postgres:' + encodedPassword + '@db.yhwwhqqffgtiavapgjvc.supabase.co:5432/postgres';

async function run() {
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260826000001_performance_optimization_indexes.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL migration from:', sqlPath);
    const result = await client.query(sql);
    console.log('SUCCESS: All SQL migrations and indexes executed successfully on Supabase!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

run();
