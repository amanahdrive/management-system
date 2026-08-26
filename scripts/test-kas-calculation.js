const { Pool, types } = require('pg');

types.setTypeParser(1082, (val) => val); // DATE (1082) -> string 'YYYY-MM-DD'
types.setTypeParser(1114, (val) => val); // TIMESTAMP (1114) -> string
types.setTypeParser(1184, (val) => val); // TIMESTAMPTZ (1184) -> string
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val))); // NUMERIC/DECIMAL (1700) -> number
types.setTypeParser(20, (val) => (val === null ? null : parseInt(val, 10))); // BIGINT (20) -> number

const password = '@Limabelas15';
const encodedPassword = encodeURIComponent(password);
const p6543 = 'postgresql://postgres.yhwwhqqffgtiavapgjvc:' + encodedPassword + '@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString: p6543, ssl: { rejectUnauthorized: false } });

async function run() {
  const [txRes, siswaRes, hutangRes] = await Promise.all([
    pool.query('SELECT tipe, nominal, jenis_pembayaran, tanggal, keterangan FROM kas_transaksi'),
    pool.query('SELECT harga_final, dp_nominal, status_pembayaran_kode FROM siswa'),
    pool.query("SELECT sisa_hutang, nama_hutang FROM hutang WHERE status = 'berjalan'")
  ]);

  console.log('=== KAS TRANSAKSI (', txRes.rows.length, 'rows) ===');
  txRes.rows.forEach(r => console.log(`- [${r.tanggal}] ${r.tipe.toUpperCase()} Rp ${r.nominal} (${r.jenis_pembayaran}): ${r.keterangan}`));

  console.log('\n=== HUTANG BERJALAN (', hutangRes.rows.length, 'rows) ===');
  hutangRes.rows.forEach(r => console.log(`- ${r.nama_hutang}: Rp ${r.sisa_hutang}`));

  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  let saldoTunai = 0;
  let saldoNonTunai = 0;

  txRes.rows.forEach(t => {
    const nom = Number(t.nominal) || 0;
    const signed = t.tipe === 'pemasukan' ? nom : -nom;
    if (t.tipe === 'pemasukan') totalPemasukan += nom;
    else totalPengeluaran += nom;
    if (t.jenis_pembayaran === 'non_tunai') saldoNonTunai += signed;
    else saldoTunai += signed;
  });

  const totalHutang = hutangRes.rows.reduce((sum, h) => sum + (Number(h.sisa_hutang) || 0), 0);

  console.log('\n=== CALCULATED OVERVIEW METRICS ===');
  console.log('Total Pemasukan :', 'Rp ' + totalPemasukan.toLocaleString('id-ID'));
  console.log('Total Pengeluaran:', 'Rp ' + totalPengeluaran.toLocaleString('id-ID'));
  console.log('Saldo Aktif      :', 'Rp ' + (totalPemasukan - totalPengeluaran).toLocaleString('id-ID'));
  console.log('Saldo Non Tunai  :', 'Rp ' + saldoNonTunai.toLocaleString('id-ID'));
  console.log('Saldo Tunai      :', 'Rp ' + saldoTunai.toLocaleString('id-ID'));
  console.log('Total Sisa Hutang:', 'Rp ' + totalHutang.toLocaleString('id-ID'));

  await pool.end();
}

run();
