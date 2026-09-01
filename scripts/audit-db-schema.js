const { Client } = require('pg');

const password = '@Limabelas15';
const encodedPassword = encodeURIComponent(password);
const connStr = 'postgresql://postgres.yhwwhqqffgtiavapgjvc:' + encodedPassword + '@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function audit() {
  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('=== 1. TABLES & ROW COUNTS ===');
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  for (const row of tablesRes.rows) {
    const countRes = await client.query(`SELECT count(*) FROM "${row.table_name}";`);
    console.log(`- ${row.table_name}: ${countRes.rows[0].count} rows`);
  }

  console.log('\n=== 2. FOREIGN KEYS ===');
  const fkRes = await client.query(`
    SELECT
        tc.table_name,
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name;
  `);
  console.table(fkRes.rows);

  console.log('\n=== 3. RLS STATUS & POLICIES ===');
  const rlsRes = await client.query(`
    SELECT tablename, policyname, roles, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  console.table(rlsRes.rows);

  console.log('\n=== 4. INDEXES ===');
  const idxRes = await client.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);
  console.table(idxRes.rows.map(r => ({ table: r.tablename, index: r.indexname })));

  await client.end();
}

audit();
