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

async function testSingleQueryMetrics() {
  const sql = `
    WITH kas_calc AS (
      SELECT
        COALESCE(SUM(CASE WHEN tipe = 'pemasukan' THEN nominal ELSE 0 END), 0) AS total_masuk,
        COALESCE(SUM(CASE WHEN tipe = 'pengeluaran' THEN nominal ELSE 0 END), 0) AS total_keluar,
        COALESCE(SUM(CASE WHEN tipe = 'pemasukan' AND COALESCE(jenis_pembayaran, 'tunai') = 'tunai' THEN nominal 
                          WHEN tipe = 'pengeluaran' AND COALESCE(jenis_pembayaran, 'tunai') = 'tunai' THEN -nominal ELSE 0 END), 0) AS saldo_tunai,
        COALESCE(SUM(CASE WHEN tipe = 'pemasukan' AND jenis_pembayaran = 'non_tunai' THEN nominal 
                          WHEN tipe = 'pengeluaran' AND jenis_pembayaran = 'non_tunai' THEN -nominal ELSE 0 END), 0) AS saldo_non_tunai
      FROM kas_transaksi
    ),
    piutang_calc AS (
      SELECT
        COALESCE(SUM(
          CASE 
            WHEN status_pembayaran_kode = 'dp' THEN GREATEST(0, COALESCE(harga_final, 0) - COALESCE(dp_nominal, 0))
            WHEN status_pembayaran_kode = 'belum_bayar' THEN COALESCE(harga_final, 0)
            ELSE 0 
          END
        ), 0) AS total_piutang
      FROM siswa
    ),
    hutang_calc AS (
      SELECT
        COALESCE(SUM(COALESCE(sisa_hutang, 0)), 0) AS total_hutang
      FROM hutang
      WHERE status = 'berjalan'
    )
    SELECT 
      (k.total_masuk - k.total_keluar)::numeric AS "saldoAktif",
      k.saldo_tunai::numeric AS "saldoTunai",
      k.saldo_non_tunai::numeric AS "saldoNonTunai",
      p.total_piutang::numeric AS "totalPiutang",
      h.total_hutang::numeric AS "totalHutang"
    FROM kas_calc k, piutang_calc p, hutang_calc h;
  `;

  const res = await pool.query(sql);
  console.log('Metrics Row:', res.rows[0]);
  await pool.end();
}

testSingleQueryMetrics().catch(console.error);
