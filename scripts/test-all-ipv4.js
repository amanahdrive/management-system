const { getKasOverviewMetrics, getKasTransaksiList } = require('../lib/actions/kas');
const { getSiswaList } = require('../lib/actions/siswa');
const { getDashboardMetrics } = require('../lib/actions/dashboard');
const { getRekeningList } = require('../lib/actions/rekening');

async function testAll() {
  console.log('Testing actions with IPv4 Pooler...');
  const metrics = await getKasOverviewMetrics();
  console.log('Kas Metrics:', metrics);

  const txs = await getKasTransaksiList();
  console.log('Kas Transaksi count:', txs.length);

  const siswa = await getSiswaList();
  console.log('Siswa count:', siswa.length);

  const rek = await getRekeningList();
  console.log('Rekening count:', rek.length);

  const dash = await getDashboardMetrics();
  console.log('Dashboard metrics:', dash.siswaBaruBulanIni, 'siswa baru,', dash.saldoKasAktif, 'saldo');

  console.log('ALL ACTIONS PASSED WITH IPV4 POOLER!');
}

testAll().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
