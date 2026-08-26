const { Client } = require('pg');

const password = '@Limabelas15';
const encodedPassword = encodeURIComponent(password);
const projectRef = 'yhwwhqqffgtiavapgjvc';

const regions = [
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'sa-east-1'
];

async function testPoolers() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const user = `postgres.${projectRef}`;
    const connStr = `postgresql://${user}:${encodedPassword}@${host}:6543/postgres`;
    
    console.log(`Testing ${region}... (${host}:6543)`);
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 4000,
    });

    try {
      await client.connect();
      const res = await client.query('SELECT count(*) FROM siswa');
      console.log(`🎉 SUCCESS! Region is [${region}]! Siswa count: ${res.rows[0].count}`);
      await client.end();
      return region;
    } catch (err) {
      console.log(`❌ ${region} failed: ${err.message}`);
    }
  }
}

testPoolers();
