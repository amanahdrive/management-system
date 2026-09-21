const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.yhwwhqqffgtiavapgjvc:%40Limabelas15@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log('--- AUDIT: USER PROFILES & STAFF RELATIONS ---');
  const users = await pool.query(`
    SELECT u.id, u.username, u.nama, u.email, u.roles, u.staff_id, s.nama as staff_name, s.aktif as staff_active
    FROM public.user_profiles u
    LEFT JOIN public.staff s ON u.staff_id = s.id
    ORDER BY u.nama
  `);
  console.log(JSON.stringify(users.rows, null, 2));

  console.log('\n--- AUDIT: STAFF JABATAN RELATIONS ---');
  const jabatans = await pool.query(`
    SELECT s.nama as staff_name, j.nama_jabatan
    FROM public.staff s
    JOIN public.staff_jabatan sj ON s.id = sj.staff_id
    JOIN public.jabatan j ON sj.jabatan_id = j.id
    ORDER BY s.nama, j.nama_jabatan
  `);
  console.log(JSON.stringify(jabatans.rows, null, 2));

  console.log('\n--- AUDIT: ORPHANED SESSIONS / KAS / JADWAL ---');
  const orphanedJadwalSiswa = await pool.query(`
    SELECT count(*) as count FROM public.jadwal_sesi js
    LEFT JOIN public.siswa s ON js.siswa_id = s.id
    WHERE s.id IS NULL
  `);
  console.log('Orphaned jadwal_sesi (missing siswa):', orphanedJadwalSiswa.rows[0].count);

  const orphanedJadwalStaff = await pool.query(`
    SELECT count(*) as count FROM public.jadwal_sesi js
    LEFT JOIN public.staff s ON js.staff_id = s.id
    WHERE s.id IS NULL
  `);
  console.log('Orphaned jadwal_sesi (missing staff):', orphanedJadwalStaff.rows[0].count);

  const orphanedKasKendaraan = await pool.query(`
    SELECT count(*) as count FROM public.kas_transaksi kt
    LEFT JOIN public.kendaraan k ON kt.kendaraan_id = k.id
    WHERE kt.kendaraan_id IS NOT NULL AND k.id IS NULL
  `);
  console.log('Orphaned kas_transaksi (missing kendaraan):', orphanedKasKendaraan.rows[0].count);

  const orphanedLogKendaraan = await pool.query(`
    SELECT count(*) as count FROM public.kendaraan_log_harian kl
    LEFT JOIN public.kendaraan k ON kl.kendaraan_id = k.id
    WHERE k.id IS NULL
  `);
  console.log('Orphaned kendaraan_log_harian (missing kendaraan):', orphanedLogKendaraan.rows[0].count);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});
