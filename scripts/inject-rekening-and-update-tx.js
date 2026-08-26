const { Client } = require('pg');

const password = '@Limabelas15';
const encodedPassword = encodeURIComponent(password);
const connStr = 'postgresql://postgres:' + encodedPassword + '@db.yhwwhqqffgtiavapgjvc.supabase.co:5432/postgres';

const briAccount = {
  id: 'rek-bri-utama',
  nama_bank: 'BRI',
  nomor_rekening: '110401019850504',
  atas_nama: 'Nur Awalia Rianti',
  aktif: true,
  is_utama: true,
  keterangan: 'Rekening Utama Operasional & Transfer Amanah Drive'
};

async function execute() {
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');

    // 1. Fetch current settings for rekening_bank_list
    const res = await client.query("SELECT id, value FROM settings WHERE key = 'rekening_bank_list'");
    let currentList = [];
    if (res.rows.length > 0 && res.rows[0].value) {
      try {
        currentList = JSON.parse(res.rows[0].value);
      } catch (e) {
        currentList = [];
      }
    }

    // Set other accounts is_utama: false
    const existingWithoutBri = currentList.filter(r => r.nomor_rekening !== '110401019850504' && r.id !== 'rek-bri-utama').map(r => ({ ...r, is_utama: false }));
    const newList = [briAccount, ...existingWithoutBri];

    const jsonStr = JSON.stringify(newList, null, 2);

    if (res.rows.length > 0) {
      await client.query("UPDATE settings SET value = $1, deskripsi = $2, updated_at = NOW() WHERE key = 'rekening_bank_list'", [
        jsonStr,
        'Daftar Rekening Bank Resmi Perusahaan'
      ]);
    } else {
      await client.query("INSERT INTO settings (key, value, deskripsi) VALUES ('rekening_bank_list', $1, 'Daftar Rekening Bank Resmi Perusahaan')", [
        jsonStr
      ]);
    }
    console.log('SUCCESS: Injected Rekening BRI (110401019850504 a.n Nur Awalia Rianti) into Supabase settings table!');

    // 2. Update all existing kas_transaksi records with non_tunai & rekening_id
    const updateTxRes = await client.query(`
      UPDATE kas_transaksi
      SET jenis_pembayaran = 'non_tunai',
          rekening_id = 'rek-bri-utama'
      WHERE jenis_pembayaran IS NULL OR jenis_pembayaran = 'non_tunai' OR rekening_id IS NULL;
    `);
    console.log('SUCCESS: Updated existing kas_transaksi rows with non_tunai & rekening_id! Rows affected:', updateTxRes.rowCount);

    // 3. Verify kas_transaksi records
    const checkTx = await client.query(`
      SELECT id, tanggal, tipe, kategori, nominal, keterangan, jenis_pembayaran, rekening_id
      FROM kas_transaksi
      ORDER BY created_at DESC;
    `);
    console.log('All Kas Transaksi Rows now in DB:');
    console.table(checkTx.rows);

  } catch (err) {
    console.error('Execution error:', err);
  } finally {
    await client.end();
  }
}

execute();
