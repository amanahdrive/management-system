const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres.yhwwhqqffgtiavapgjvc:%40Limabelas15@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Connecting to database...');
    
    // 1. Alter user_profiles table
    await client.query(`
      ALTER TABLE public.user_profiles 
        ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS password_hash TEXT NULL,
        ADD COLUMN IF NOT EXISTS aktif BOOLEAN NOT NULL DEFAULT true;
    `);
    console.log('Altered user_profiles columns.');

    // 2. Fetch staff IDs
    const staffRes = await client.query('SELECT id, nama FROM public.staff');
    const staffMap = {};
    staffRes.rows.forEach(s => {
      staffMap[s.nama.toLowerCase()] = s.id;
    });
    console.log('Found staff:', staffMap);

    // 3. User definitions
    const users = [
      {
        username: 'alfyalfi',
        nama: 'Alfi',
        email: 'alfyalfi@amanahdrive.com',
        password: '@Limabelas15',
        staffKey: 'alfi',
        roles: ['developer', 'instruktur', 'jadwal'],
      },
      {
        username: 'nurawaliarianti',
        nama: 'Lia',
        email: 'nurawaliarianti@amanahdrive.com',
        password: 'Nurawalia21',
        staffKey: 'lia',
        roles: ['keuangan', 'siswa'],
      },
      {
        username: 'syawalputra',
        nama: 'Syawal',
        email: 'syawalputra@amanahdrive.com',
        password: 'Putrasyawal02',
        staffKey: 'syawal',
        roles: ['instruktur', 'armada'],
      },
      {
        username: 'riskyfaisal',
        nama: 'Risky',
        email: 'riskyfaisal@amanahdrive.com',
        password: 'Faisalrisky04',
        staffKey: 'risky',
        roles: ['instruktur'],
      },
    ];

    for (const u of users) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      const staffId = staffMap[u.staffKey] || null;

      // Check if user already exists in auth.users
      const existingAuth = await client.query('SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1)', [u.email]);
      let authUserId;

      if (existingAuth.rows.length > 0) {
        authUserId = existingAuth.rows[0].id;
        console.log(`User ${u.username} exists in auth.users (${authUserId}), updating password...`);
        await client.query(
          `UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2`,
          [passwordHash, authUserId]
        );
      } else {
        console.log(`Creating user ${u.username} in auth.users...`);
        const insertAuth = await client.query(`
          INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
          ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            $1,
            $2,
            NOW(),
            '{"provider":"email","providers":["email"]}',
            $3,
            NOW(),
            NOW()
          ) RETURNING id;
        `, [u.email, passwordHash, JSON.stringify({ nama: u.nama, username: u.username })]);
        authUserId = insertAuth.rows[0].id;
      }

      // Upsert into public.user_profiles
      await client.query(`
        INSERT INTO public.user_profiles (
          id, username, nama, role, email, roles, staff_id, password_hash, aktif, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, true, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          nama = EXCLUDED.nama,
          role = EXCLUDED.role,
          email = EXCLUDED.email,
          roles = EXCLUDED.roles,
          staff_id = EXCLUDED.staff_id,
          password_hash = EXCLUDED.password_hash,
          aktif = true,
          updated_at = NOW();
      `, [
        authUserId,
        u.username,
        u.nama,
        u.roles.includes('developer') ? 'developer' : u.roles[0] || 'staff',
        u.email,
        u.roles,
        staffId,
        passwordHash,
      ]);

      console.log(`✓ User profile configured: ${u.username} (${u.nama}) - Roles: ${u.roles.join(', ')} - Staff ID: ${staffId}`);
    }

    console.log('\nAll 4 users seeded successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error('Error seeding users:', e);
  process.exit(1);
});
