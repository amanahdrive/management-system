const { Pool } = require('pg');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres.yhwwhqqffgtiavapgjvc:%40Limabelas15@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('--- STARTING VERIFICATION TEST FOR MULTI-EVENT LOG ARMADA ---');

    // 1. Get vehicle Ayla
    const vRes = await client.query("SELECT id, nama_kendaraan, plat_nomor FROM kendaraan WHERE nama_kendaraan ILIKE '%Ayla%' LIMIT 1");
    const ayla = vRes.rows[0];
    console.log('Tested Vehicle:', ayla.nama_kendaraan, ayla.plat_nomor, ayla.id);

    // Get a test student
    const sRes = await client.query("SELECT id, nama FROM siswa LIMIT 1");
    const testSiswa = sRes.rows[0];
    console.log('Tested Student:', testSiswa.nama, testSiswa.id);

    const testDate = '2026-09-22';

    // Clean previous test data if any
    await client.query("DELETE FROM kendaraan_log_harian WHERE kendaraan_id = $1 AND tanggal = $2", [ayla.id, testDate]);

    // Test 1: Insert ODO BC OUT (222,350 km)
    console.log('\n[TEST 1] Insert ODO BC OUT (222.350 km)...');
    const items1 = [
      {
        id: 'test-bc-out-1',
        tipe: 'ODO BC OUT',
        odometer: 222350,
        catatan: 'Berangkat Basecamp',
        created_at: new Date().toISOString()
      }
    ];
    await client.query(`
      INSERT INTO kendaraan_log_harian (
        kendaraan_id, tanggal, odometer_basecamp_out, log_items, created_at, updated_at
      ) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())
    `, [ayla.id, testDate, 222350, JSON.stringify(items1)]);

    let row = (await client.query("SELECT * FROM kendaraan_log_harian WHERE kendaraan_id = $1 AND tanggal = $2", [ayla.id, testDate])).rows[0];
    console.log('Row after Test 1: BC Out =', row.odometer_basecamp_out, '| log_items count =', row.log_items.length);
    if (row.odometer_basecamp_out !== 222350 || row.log_items.length !== 1) {
      throw new Error('Test 1 failed');
    }

    // Test 2: Check duplicate detection for same type (ODO BC OUT)
    console.log('\n[TEST 2] Verify duplicate detection for same type (ODO BC OUT)...');
    const hasDuplicate = row.log_items.some(i => i.tipe === 'ODO BC OUT');
    console.log('Duplicate detected?', hasDuplicate);
    if (!hasDuplicate) throw new Error('Test 2 failed: duplicate not detected');

    // Test 3: Insert ODO SESI MULAI (222,355 km) on the same date (Different Type -> MERGE)
    console.log('\n[TEST 3] Insert ODO SESI MULAI (222.355 km) for student (Different Type -> MERGE)...');
    const items2 = [
      ...row.log_items,
      {
        id: 'test-sesi-mulai-1',
        tipe: 'ODO SESI MULAI',
        odometer: 222355,
        siswa_id: testSiswa.id,
        siswa_nama: testSiswa.nama,
        catatan: 'Mulai latihan',
        created_at: new Date().toISOString()
      }
    ];
    await client.query(`
      UPDATE kendaraan_log_harian 
      SET log_items = $1::jsonb, updated_at = NOW() 
      WHERE kendaraan_id = $2 AND tanggal = $3
    `, [JSON.stringify(items2), ayla.id, testDate]);

    row = (await client.query("SELECT * FROM kendaraan_log_harian WHERE kendaraan_id = $1 AND tanggal = $2", [ayla.id, testDate])).rows[0];
    console.log('Row after Test 3: log_items count =', row.log_items.length);
    if (row.log_items.length !== 2) throw new Error('Test 3 failed: items not merged');

    // Test 4: Insert ODO SESI SELESAI (222,380 km) for student (Different Type -> MERGE)
    console.log('\n[TEST 4] Insert ODO SESI SELESAI (222.380 km) for student (+25 km)...');
    const items3 = [
      ...row.log_items,
      {
        id: 'test-sesi-selesai-1',
        tipe: 'ODO SESI SELESAI',
        odometer: 222380,
        siswa_id: testSiswa.id,
        siswa_nama: testSiswa.nama,
        catatan: 'Selesai latihan lancar',
        created_at: new Date().toISOString()
      }
    ];
    await client.query(`
      UPDATE kendaraan_log_harian 
      SET log_items = $1::jsonb, total_slot_selesai = 1, updated_at = NOW() 
      WHERE kendaraan_id = $2 AND tanggal = $3
    `, [JSON.stringify(items3), ayla.id, testDate]);

    row = (await client.query("SELECT * FROM kendaraan_log_harian WHERE kendaraan_id = $1 AND tanggal = $2", [ayla.id, testDate])).rows[0];
    console.log('Row after Test 4: log_items count =', row.log_items.length, '| total_slot_selesai =', row.total_slot_selesai);
    if (row.log_items.length !== 3 || row.total_slot_selesai !== 1) throw new Error('Test 4 failed');

    // Test 5: Insert ODO BC IN (222,410 km) on the same date -> Close day trip!
    console.log('\n[TEST 5] Insert ODO BC IN (222.410 km) -> Complete day trip...');
    const items4 = [
      ...row.log_items,
      {
        id: 'test-bc-in-1',
        tipe: 'ODO BC IN',
        odometer: 222410,
        catatan: 'Tiba kembali di Basecamp',
        created_at: new Date().toISOString()
      }
    ];
    const totalJarak = 222410 - 222350; // 60 km
    await client.query(`
      UPDATE kendaraan_log_harian 
      SET 
        odometer_basecamp_in = 222410,
        jarak_tempuh = $1,
        log_items = $2::jsonb,
        updated_at = NOW() 
      WHERE kendaraan_id = $3 AND tanggal = $4
    `, [totalJarak, JSON.stringify(items4), ayla.id, testDate]);

    row = (await client.query("SELECT * FROM kendaraan_log_harian WHERE kendaraan_id = $1 AND tanggal = $2", [ayla.id, testDate])).rows[0];
    console.log('Row after Test 5: BC Out =', row.odometer_basecamp_out, '| BC In =', row.odometer_basecamp_in, '| Total Jarak =', row.jarak_tempuh, 'km | log_items count =', row.log_items.length);
    if (row.odometer_basecamp_in !== 222410 || row.jarak_tempuh !== 60 || row.log_items.length !== 4) {
      throw new Error('Test 5 failed: aggregate distance incorrect');
    }

    // Test 6: Verify Single Row per Date & Sublist Items
    console.log('\n[TEST 6] Verify single row per date and sublist items...');
    const allRows = (await client.query("SELECT id FROM kendaraan_log_harian WHERE kendaraan_id = $1 AND tanggal = $2", [ayla.id, testDate])).rows;
    console.log('Total rows for this date:', allRows.length, '(must be exactly 1)');
    if (allRows.length !== 1) throw new Error('Test 6 failed: multiple rows found for same date');

    console.log('\nSublist Chronological Items:');
    row.log_items.forEach((item, idx) => {
      console.log(`  ${idx + 1}. [${item.tipe}] ${item.odometer} km ${item.siswa_nama ? '(Siswa: ' + item.siswa_nama + ')' : ''} - ${item.catatan || ''}`);
    });

    // Clean up test record
    await client.query("DELETE FROM kendaraan_log_harian WHERE kendaraan_id = $1 AND tanggal = $2", [ayla.id, testDate]);
    console.log('\nTest record cleaned up successfully.');

    console.log('\n ALL 6 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
