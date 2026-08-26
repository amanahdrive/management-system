const { types, Pool } = require('pg');

types.setTypeParser(1082, (val) => val); // DATE (1082) -> string 'YYYY-MM-DD'
types.setTypeParser(1114, (val) => val); // TIMESTAMP (1114) -> string
types.setTypeParser(1184, (val) => val); // TIMESTAMPTZ (1184) -> string
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val))); // NUMERIC/DECIMAL (1700) -> number
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10))); // BIGINT (20) -> number

const password = '@Limabelas15';
const encodedPassword = encodeURIComponent(password);
const p6543 = 'postgresql://postgres.yhwwhqqffgtiavapgjvc:' + encodedPassword + '@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString: p6543, ssl: { rejectUnauthorized: false } });

async function testAllMasterQueries() {
  console.log('Testing Paket...');
  const paket = await pool.query('SELECT * FROM paket ORDER BY created_at ASC');
  console.log('Paket count:', paket.rows.length);

  console.log('Testing Promosi...');
  const promosi = await pool.query('SELECT * FROM promosi ORDER BY created_at DESC');
  console.log('Promosi count:', promosi.rows.length);

  console.log('Testing Jabatan...');
  const jabatan = await pool.query('SELECT * FROM jabatan ORDER BY urutan ASC, created_at ASC');
  console.log('Jabatan count:', jabatan.rows.length);

  console.log('Testing Staff...');
  const staff = await pool.query(`
    SELECT 
      s.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', j.id,
            'nama_jabatan', j.nama_jabatan,
            'kode_jabatan', j.kode_jabatan,
            'is_instruktur', j.is_instruktur
          )
        ) FILTER (WHERE j.id IS NOT NULL),
        '[]'
      ) AS jabatan_list
    FROM staff s
    LEFT JOIN staff_jabatan sj ON s.id = sj.staff_id
    LEFT JOIN jabatan j ON sj.jabatan_id = j.id
    GROUP BY s.id
    ORDER BY s.created_at ASC;
  `);
  console.log('Staff count:', staff.rows.length);

  console.log('Testing Slot Waktu...');
  const slot = await pool.query('SELECT * FROM slot_waktu ORDER BY urutan ASC');
  console.log('Slot Waktu count:', slot.rows.length);

  console.log('Testing Kendaraan...');
  const kendaraan = await pool.query('SELECT * FROM kendaraan ORDER BY created_at ASC');
  console.log('Kendaraan count:', kendaraan.rows.length);

  console.log('Testing Kas Transaksi with to_jsonb...');
  const txs = await pool.query(`
    SELECT 
      k.*,
      CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS siswa,
      CASE WHEN h.id IS NOT NULL THEN to_jsonb(h) ELSE NULL END AS hutang
    FROM kas_transaksi k
    LEFT JOIN siswa s ON k.siswa_id = s.id
    LEFT JOIN hutang h ON k.hutang_id = h.id
    ORDER BY k.tanggal DESC, k.created_at DESC;
  `);
  console.log('Kas Transaksi count:', txs.rows.length);

  console.log('\n🎉 ALL MASTER & KAS QUERIES SUCCEEDED WITH ZERO ERRORS!');
  await pool.end();
}

testAllMasterQueries().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
