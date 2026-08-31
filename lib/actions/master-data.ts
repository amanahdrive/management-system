'use server';

import { dbQuery, dbQuerySingle } from '@/lib/db';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { Paket, Promosi, Jabatan, Staff, StatusPembayaranMaster, SlotWaktu, Kendaraan } from '@/types/database';
import { revalidatePath } from 'next/cache';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignored in non-request contexts
  }
}

// --- PAKET ACTIONS ---
export async function getPaketList(): Promise<Paket[]> {
  const cached = cacheGet<Paket[]>('master_paket_list');
  if (cached && cached.length > 0) return cached;

  try {
    const rows = await dbQuery<Paket>('SELECT * FROM paket ORDER BY created_at ASC');
    cacheSet('master_paket_list', rows, 180);
    return rows;
  } catch (e) {
    console.error('Error fetching paket:', e);
  }
  return [];
}

export async function upsertPaket(paket: Partial<Paket>): Promise<{ success: boolean; error?: string }> {
  try {
    const isNew = !paket.id;
    if (!isNew) {
      const keys = Object.keys(paket).filter(
        (k) => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && (paket as any)[k] !== undefined
      );
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = keys.map((k) => (paket as any)[k]);
      values.push(paket.id);
      await dbQuery(`UPDATE paket SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}`, values);
    } else {
      const keys = Object.keys(paket).filter(
        (k) => k !== 'created_at' && k !== 'updated_at' && (paket as any)[k] !== undefined
      );
      const cols = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => (paket as any)[k]);
      await dbQuery(`INSERT INTO paket (${cols}) VALUES (${placeholders})`, values);
    }

    cacheInvalidate('master_paket*');
    cacheInvalidate('dashboard*');

    safeRevalidatePath('/master-data/paket');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- PROMOSI ACTIONS ---
export async function getPromosiList(): Promise<Promosi[]> {
  const cached = cacheGet<Promosi[]>('master_promosi_list');
  if (cached && cached.length > 0) return cached;

  try {
    const rows = await dbQuery<Promosi>('SELECT * FROM promosi ORDER BY created_at DESC');
    cacheSet('master_promosi_list', rows, 180);
    return rows;
  } catch (e) {
    console.error('Error fetching promosi:', e);
  }
  return [];
}

export async function upsertPromosi(promosi: Partial<Promosi>): Promise<{ success: boolean; error?: string }> {
  try {
    const isNew = !promosi.id;
    if (!isNew) {
      const keys = Object.keys(promosi).filter(
        (k) => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && (promosi as any)[k] !== undefined
      );
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = keys.map((k) => (promosi as any)[k]);
      values.push(promosi.id);
      await dbQuery(`UPDATE promosi SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}`, values);
    } else {
      const keys = Object.keys(promosi).filter(
        (k) => k !== 'created_at' && k !== 'updated_at' && (promosi as any)[k] !== undefined
      );
      const cols = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => (promosi as any)[k]);
      await dbQuery(`INSERT INTO promosi (${cols}) VALUES (${placeholders})`, values);
    }

    cacheInvalidate('master_promosi*');

    safeRevalidatePath('/master-data/promosi');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePromosi(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery('DELETE FROM promosi WHERE id = $1', [id]);
    cacheInvalidate('master_promosi*');

    safeRevalidatePath('/master-data/promosi');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- JABATAN ACTIONS ---
export async function getJabatanList(): Promise<Jabatan[]> {
  const cached = cacheGet<Jabatan[]>('master_jabatan_list');
  if (cached && cached.length > 0) return cached;

  try {
    const rows = await dbQuery<Jabatan>('SELECT * FROM jabatan ORDER BY nama_jabatan ASC');
    if (rows && rows.length > 0) {
      cacheSet('master_jabatan_list', rows, 300);
      return rows;
    }
  } catch (e) {
    console.error('Error fetching jabatan:', e);
  }
  return [];
}

export async function upsertJabatan(jabatan: Partial<Jabatan>): Promise<{ success: boolean; error?: string }> {
  try {
    const isNew = !jabatan.id;
    if (!isNew) {
      const keys = Object.keys(jabatan).filter(
        (k) => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && (jabatan as any)[k] !== undefined
      );
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = keys.map((k) => (jabatan as any)[k]);
      values.push(jabatan.id);
      await dbQuery(`UPDATE jabatan SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}`, values);
    } else {
      const keys = Object.keys(jabatan).filter(
        (k) => k !== 'created_at' && k !== 'updated_at' && (jabatan as any)[k] !== undefined
      );
      const cols = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => (jabatan as any)[k]);
      await dbQuery(`INSERT INTO jabatan (${cols}) VALUES (${placeholders})`, values);
    }

    cacheInvalidate('master_jabatan*');

    safeRevalidatePath('/master-data/jabatan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- STAFF ACTIONS ---
export async function getStaffList(): Promise<Staff[]> {
  const cached = cacheGet<Staff[]>('master_staff_list');
  if (cached && cached.length > 0) return cached;

  try {
    const staffData = await dbQuery(`
      SELECT 
        s.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', j.id,
              'nama_jabatan', j.nama_jabatan,
              'aktif', j.aktif
            )
          ) FILTER (WHERE j.id IS NOT NULL),
          '[]'
        ) AS jabatan_list
      FROM staff s
      LEFT JOIN staff_jabatan sj ON s.id = sj.staff_id
      LEFT JOIN jabatan j ON sj.jabatan_id = j.id
      GROUP BY s.id
      ORDER BY s.nama ASC;
    `);

    const mapped = staffData.map((st: any) => ({
      ...st,
      jabatan_list: st.jabatan_list || [],
      hari_kerja: st.hari_kerja || ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'],
      slot_kerja: st.slot_kerja || ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'],
      jadwal_ketersediaan: st.jadwal_ketersediaan || {},
    }));

    cacheSet('master_staff_list', mapped, 180);
    return mapped;
  } catch (e) {
    console.error('Error fetching staff:', e);
  }
  return [];
}

export async function getInstrukturList(): Promise<Staff[]> {
  const allStaff = await getStaffList();
  return allStaff.filter(
    (st) => st.aktif && st.jabatan_list?.some((j) => j?.nama_jabatan?.toLowerCase().includes('instruktur'))
  );
}

export async function upsertStaff(
  staff: Partial<Staff>,
  jabatanIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      jabatan_list,
      staff_jabatan,
      created_at,
      updated_at,
      ...cleanStaff
    } = staff as any;

    let savedStaff: any = null;

    if (cleanStaff.id) {
      const keys = Object.keys(cleanStaff).filter(
        (k) => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && cleanStaff[k] !== undefined
      );
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = keys.map((k) => {
        if (k === 'jadwal_ketersediaan' && typeof cleanStaff[k] === 'object' && cleanStaff[k] !== null) {
          return JSON.stringify(cleanStaff[k]);
        }
        return cleanStaff[k];
      });
      values.push(cleanStaff.id);

      savedStaff = await dbQuerySingle(
        `UPDATE staff SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values
      );
    } else {
      const keys = Object.keys(cleanStaff).filter(
        (k) => k !== 'created_at' && k !== 'updated_at' && cleanStaff[k] !== undefined
      );
      const cols = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => {
        if (k === 'jadwal_ketersediaan' && typeof cleanStaff[k] === 'object' && cleanStaff[k] !== null) {
          return JSON.stringify(cleanStaff[k]);
        }
        return cleanStaff[k];
      });

      savedStaff = await dbQuerySingle(
        `INSERT INTO staff (${cols}) VALUES (${placeholders}) RETURNING *`,
        values
      );
    }

    if (savedStaff?.id) {
      await dbQuery('DELETE FROM staff_jabatan WHERE staff_id = $1', [savedStaff.id]);
      if (jabatanIds && jabatanIds.length > 0) {
        for (const jId of jabatanIds) {
          await dbQuery('INSERT INTO staff_jabatan (staff_id, jabatan_id) VALUES ($1, $2)', [savedStaff.id, jId]);
        }
      }
    }

    cacheInvalidate('master_staff*');
    cacheInvalidate('instruktur*');
    cacheInvalidate('jadwal*');
    cacheInvalidate('dashboard*');

    safeRevalidatePath('/master-data/staff');
    safeRevalidatePath('/jadwal');
    safeRevalidatePath('/instruktur');
    safeRevalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- SLOT WAKTU ACTIONS ---
export async function getSlotWaktuList(): Promise<SlotWaktu[]> {
  const cached = cacheGet<SlotWaktu[]>('master_slot_waktu_list');
  if (cached && cached.length > 0) return cached;

  try {
    const rows = await dbQuery<SlotWaktu>('SELECT * FROM slot_waktu ORDER BY urutan ASC');
    cacheSet('master_slot_waktu_list', rows, 300);
    return rows;
  } catch (e) {
    console.error('Error fetching slot_waktu:', e);
  }
  return [];
}

export async function upsertSlotWaktu(slot: Partial<SlotWaktu>): Promise<{ success: boolean; error?: string }> {
  try {
    const isNew = !slot.id;
    if (!isNew) {
      const keys = Object.keys(slot).filter(
        (k) => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && (slot as any)[k] !== undefined
      );
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = keys.map((k) => (slot as any)[k]);
      values.push(slot.id);
      await dbQuery(`UPDATE slot_waktu SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}`, values);
    } else {
      const keys = Object.keys(slot).filter(
        (k) => k !== 'created_at' && k !== 'updated_at' && (slot as any)[k] !== undefined
      );
      const cols = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => (slot as any)[k]);
      await dbQuery(`INSERT INTO slot_waktu (${cols}) VALUES (${placeholders})`, values);
    }

    cacheInvalidate('master_slot_waktu*');

    safeRevalidatePath('/master-data/slot-waktu');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- STATUS PEMBAYARAN MASTER ACTIONS ---
export async function getStatusPembayaranMaster(): Promise<StatusPembayaranMaster[]> {
  const cached = cacheGet<StatusPembayaranMaster[]>('master_status_pembayaran');
  if (cached && cached.length > 0) return cached;

  try {
    const rows = await dbQuery<StatusPembayaranMaster>('SELECT * FROM status_pembayaran_master ORDER BY urutan ASC');
    cacheSet('master_status_pembayaran', rows, 300);
    return rows;
  } catch (e) {
    console.error('Error fetching status_pembayaran_master:', e);
  }
  return [];
}

// --- KENDARAAN MASTER ACTIONS ---
export async function getKendaraanMasterList(): Promise<Kendaraan[]> {
  const cached = cacheGet<Kendaraan[]>('master_kendaraan_list');
  if (cached && cached.length > 0) return cached;

  try {
    const rows = await dbQuery<Kendaraan>(`
      SELECT 
        k.*,
        CASE WHEN ks.id IS NOT NULL THEN to_jsonb(ks) ELSE NULL END AS status
      FROM kendaraan k
      LEFT JOIN kendaraan_status ks ON k.id = ks.kendaraan_id
      ORDER BY k.nama_kendaraan ASC;
    `);

    cacheSet('master_kendaraan_list', rows, 120);
    return rows;
  } catch (e) {
    console.error('Error fetching kendaraan master:', e);
  }
  return [];
}

export async function upsertKendaraanMaster(kendaraan: Partial<Kendaraan>): Promise<{ success: boolean; error?: string }> {
  try {
    const { status, created_at, updated_at, ...cleanData } = kendaraan as any;
    let saved: any = null;

    if (cleanData.id) {
      const keys = Object.keys(cleanData).filter(
        (k) => k !== 'id' && k !== 'created_at' && k !== 'updated_at' && cleanData[k] !== undefined
      );
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = keys.map((k) => cleanData[k]);
      values.push(cleanData.id);

      saved = await dbQuerySingle(
        `UPDATE kendaraan SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values
      );
    } else {
      const keys = Object.keys(cleanData).filter(
        (k) => k !== 'created_at' && k !== 'updated_at' && cleanData[k] !== undefined
      );
      const cols = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => cleanData[k]);

      saved = await dbQuerySingle(
        `INSERT INTO kendaraan (${cols}) VALUES (${placeholders}) RETURNING *`,
        values
      );
    }

    if (!saved) return { success: false, error: 'Gagal menyimpan kendaraan' };

    // Ensure status row exists
    await dbQuery(
      `INSERT INTO kendaraan_status (kendaraan_id) VALUES ($1) ON CONFLICT (kendaraan_id) DO NOTHING`,
      [saved.id]
    );

    cacheInvalidate('master_kendaraan*');
    cacheInvalidate('kendaraan*');
    cacheInvalidate('dashboard*');

    safeRevalidatePath('/master-data/kendaraan');
    safeRevalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteKendaraan(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery('DELETE FROM kendaraan WHERE id = $1', [id]);

    cacheInvalidate('master_kendaraan*');
    cacheInvalidate('kendaraan*');
    cacheInvalidate('dashboard*');

    safeRevalidatePath('/master-data/kendaraan');
    safeRevalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
