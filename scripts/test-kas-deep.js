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

async function testAllKasActions() {
  console.log('--- 1. getKasOverviewMetrics ---');
  const [txList, siswaList, hutangList] = await Promise.all([
    pool.query('SELECT tipe, nominal, jenis_pembayaran FROM kas_transaksi'),
    pool.query('SELECT harga_final, dp_nominal, status_pembayaran_kode FROM siswa'),
    pool.query("SELECT sisa_hutang FROM hutang WHERE status = 'berjalan'"),
  ]);
  console.log('txList count:', txList.rows.length);
  console.log('siswaList count:', siswaList.rows.length);
  console.log('hutangList count:', hutangList.rows.length);

  console.log('\n--- 2. getKasTransaksiList with to_jsonb ---');
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

  console.log('\n--- 3. getKasKategoriList ---');
  const kat = await pool.query('SELECT * FROM kas_kategori ORDER BY nama_kategori ASC');
  console.log('Kas Kategori count in DB table:', kat.rows.length);

  console.log('\n--- 4. getSiswaList with to_jsonb ---');
  const siswa = await pool.query(`
    SELECT 
      s.*,
      CASE WHEN p.id IS NOT NULL THEN to_jsonb(p) ELSE NULL END AS paket,
      CASE WHEN pr.id IS NOT NULL THEN to_jsonb(pr) ELSE NULL END AS promosi,
      CASE WHEN sp.id IS NOT NULL THEN to_jsonb(sp) ELSE NULL END AS status_pembayaran
    FROM siswa s
    LEFT JOIN paket p ON s.paket_id = p.id
    LEFT JOIN promosi pr ON s.promosi_id = pr.id
    LEFT JOIN status_pembayaran_master sp ON s.status_pembayaran_kode = sp.kode
    ORDER BY s.created_at DESC;
  `);
  console.log('Siswa count:', siswa.rows.length);

  console.log('\n--- 5. getPaketList ---');
  const paket = await pool.query('SELECT * FROM paket ORDER BY urutan ASC, created_at ASC');
  console.log('Paket count:', paket.rows.length);

  console.log('\n--- 6. getRekeningList ---');
  const rek = await pool.query("SELECT value FROM settings WHERE key = 'rekening_bank_list'");
  console.log('Rekening count:', JSON.parse(rek.rows[0]?.value || '[]').length);

  console.log('\n--- 7. getDpKustomList ---');
  const dpTxs = await pool.query("SELECT * FROM kas_transaksi WHERE tipe = 'pemasukan' AND siswa_id IS NULL ORDER BY tanggal ASC");
  console.log('DP Kustom count:', dpTxs.rows.length);

  console.log('\n🎉 ALL 7 KAS ACTIONS EXECUTED WITH 100% SUCCESS!');

  await pool.end();
}

testAllKasActions().catch(err => {
  console.error('ERROR IN TEST:', err);
  process.exit(1);
});
