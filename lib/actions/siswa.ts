'use server';

import { dbQuery, dbQuerySingle } from '@/lib/db';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { getTodayDateString } from '@/lib/utils/date';
import { Siswa } from '@/types/database';
import { revalidatePath } from 'next/cache';

const SISWA_CACHE_KEY = 'siswa_list';

export async function getSiswaList(): Promise<Siswa[]> {
  const cached = cacheGet<Siswa[]>(SISWA_CACHE_KEY);
  if (cached && cached.length > 0) return cached;

  try {
    const rows = await dbQuery<Siswa>(`
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

    cacheSet(SISWA_CACHE_KEY, rows, 60);
    return rows;
  } catch (e) {
    console.error('Error fetching siswa list:', e);
  }
  return [];
}

export async function getSiswaById(id: string): Promise<Siswa | null> {
  try {
    const row = await dbQuerySingle<Siswa>(`
      SELECT 
        s.*,
        CASE WHEN p.id IS NOT NULL THEN to_jsonb(p) ELSE NULL END AS paket,
        CASE WHEN pr.id IS NOT NULL THEN to_jsonb(pr) ELSE NULL END AS promosi,
        CASE WHEN sp.id IS NOT NULL THEN to_jsonb(sp) ELSE NULL END AS status_pembayaran
      FROM siswa s
      LEFT JOIN paket p ON s.paket_id = p.id
      LEFT JOIN promosi pr ON s.promosi_id = pr.id
      LEFT JOIN status_pembayaran_master sp ON s.status_pembayaran_kode = sp.kode
      WHERE s.id = $1
    `, [id]);

    return row;
  } catch (e) {
    console.error('Error fetching siswa by id:', e);
  }
  return null;
}

export async function updateSiswaPayment(
  siswaId: string,
  statusKode: string,
  nominalDibayar: number | null,
  tanggalBayar: string | null,
  jenisPembayaran: 'tunai' | 'non_tunai' = 'non_tunai'
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentSiswa = await dbQuerySingle<{ id: string }>(
      'SELECT id FROM siswa WHERE id = $1',
      [siswaId]
    );

    if (!currentSiswa) {
      return { success: false, error: 'Data siswa tidak ditemukan di database' };
    }

    let dpNominal: number | null = null;
    let dpTanggal: string | null = null;

    if (statusKode === 'dp') {
      dpNominal = nominalDibayar;
      dpTanggal = tanggalBayar || getTodayDateString();
    }

    await dbQuery(
      `UPDATE siswa 
       SET status_pembayaran_kode = $1, dp_nominal = $2, dp_tanggal = $3, updated_at = NOW() 
       WHERE id = $4`,
      [statusKode, dpNominal, dpTanggal, siswaId]
    );

    cacheInvalidate('siswa*');
    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');

    revalidatePath('/siswa');
    revalidatePath(`/siswa/${siswaId}`);
    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/piutang');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function recordPelunasanDirect(
  siswaId: string,
  nominal: number,
  tanggal: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const siswa = await dbQuerySingle<{ id: string; harga_final: number; dp_nominal: number | null }>(
      'SELECT id, harga_final, dp_nominal FROM siswa WHERE id = $1',
      [siswaId]
    );
    if (!siswa) {
      return { success: false, error: 'Data siswa tidak ditemukan di database' };
    }

    const prevPaid = Number(siswa.dp_nominal) || 0;
    const newPaid = prevPaid + nominal;
    const hargaFinal = Number(siswa.harga_final) || 0;

    const newStatus = newPaid >= hargaFinal && hargaFinal > 0 ? 'lunas' : 'dp';

    await dbQuery(
      `UPDATE siswa 
       SET status_pembayaran_kode = $1, dp_nominal = $2, dp_tanggal = $3, updated_at = NOW() 
       WHERE id = $4`,
      [newStatus, newPaid, tanggal, siswaId]
    );

    cacheInvalidate('siswa*');
    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');

    revalidatePath('/siswa');
    revalidatePath(`/siswa/${siswaId}`);
    revalidatePath('/kas');
    revalidatePath('/kas/piutang');
    revalidatePath('/finance');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Error in recordPelunasanDirect:', err);
    return { success: false, error: err.message || 'Gagal memperbarui status piutang siswa' };
  }
}

export async function getSiswaPaymentHistory(siswaId: string) {
  try {
    const rows = await dbQuery(
      'SELECT * FROM kas_transaksi WHERE siswa_id = $1 ORDER BY tanggal DESC',
      [siswaId]
    );
    return rows;
  } catch (e) {
    console.error('Error fetching siswa payment history:', e);
  }
  return [];
}

export async function createOrUpdateSiswa(
  siswaData: Partial<Siswa> & { jenis_pembayaran?: 'tunai' | 'non_tunai' }
): Promise<{ success: boolean; data?: Siswa; error?: string }> {
  try {
    const isNew = !siswaData.id;

    const {
      paket,
      promosi,
      status_pembayaran,
      jenis_pembayaran,
      ...cleanPayload
    } = siswaData as any;

    let savedSiswa: Siswa | null = null;

    if (!isNew) {
      delete cleanPayload.status_pembayaran_kode;
      delete cleanPayload.dp_nominal;
      delete cleanPayload.dp_tanggal;

      const keys = Object.keys(cleanPayload).filter((k) => k !== 'id' && cleanPayload[k] !== undefined);
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = keys.map((k) => cleanPayload[k]);
      values.push(cleanPayload.id);

      savedSiswa = await dbQuerySingle<Siswa>(
        `UPDATE siswa SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values
      );
    } else {
      cleanPayload.status_pembayaran_kode = 'belum_bayar';
      cleanPayload.dp_nominal = null;
      cleanPayload.dp_tanggal = null;

      if (!cleanPayload.kode_siswa) {
        const allCodes = await dbQuery<{ kode_siswa: string }>(
          "SELECT kode_siswa FROM siswa WHERE kode_siswa LIKE 'SS%'"
        );

        let maxNum = 0;
        if (allCodes && allCodes.length > 0) {
          for (const row of allCodes) {
            const match = (row.kode_siswa || '').match(/\d+/);
            if (match) {
              const num = parseInt(match[0], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        }
        cleanPayload.kode_siswa = `SS${String(maxNum + 1).padStart(3, '0')}`;
      }

      const keys = Object.keys(cleanPayload).filter((k) => cleanPayload[k] !== undefined);
      const cols = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => cleanPayload[k]);

      savedSiswa = await dbQuerySingle<Siswa>(
        `INSERT INTO siswa (${cols}) VALUES (${placeholders}) RETURNING *`,
        values
      );
    }

    if (!savedSiswa) {
      return { success: false, error: 'Gagal menyimpan data siswa' };
    }

    cacheInvalidate('siswa*');
    cacheInvalidate('dashboard*');

    revalidatePath('/siswa');
    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/piutang');
    revalidatePath('/dashboard');

    return { success: true, data: savedSiswa };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteSiswa(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery('DELETE FROM siswa WHERE id = $1', [id]);

    cacheInvalidate('siswa*');
    cacheInvalidate('dashboard*');

    revalidatePath('/siswa');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
