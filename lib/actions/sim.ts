'use server';

import { dbQuery, dbQuerySingle } from '@/lib/db';
import { cacheInvalidate } from '@/lib/utils/cache';
import { getTodayDateString } from '@/lib/utils/date';
import { Siswa } from '@/types/database';
import { revalidatePath } from 'next/cache';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignored in non-request contexts
  }
}

export interface SimFilterOptions {
  statusSim?: 'all' | 'belum' | 'selesai';
  statusPembayaran?: 'all' | 'lunas' | 'belum_lunas' | 'dp' | 'belum_bayar';
  isArchived?: 'all' | 'active' | 'archived';
  paketId?: string;
  startDate?: string;
  endDate?: string;
}

export interface SimMetricsSummary {
  totalSim: number;
  totalBelumSelesai: number;
  totalSelesai: number;
  totalSiapTerbit: number; // Lunas tapi SIM belum selesai
  totalMenungguPelunasan: number; // Belum lunas & SIM belum selesai
}

/**
 * Mengambil daftar siswa yang mengambil paket termasuk SIM dengan filter dan sorting
 * Default urutan: tanggal pendaftaran paling awal hingga terbaru (ASC)
 */
export async function getSimSiswaList(filter?: SimFilterOptions): Promise<Siswa[]> {
  try {
    let query = `
      SELECT 
        s.*,
        CASE WHEN p.id IS NOT NULL THEN to_jsonb(p) ELSE NULL END AS paket,
        CASE WHEN pr.id IS NOT NULL THEN to_jsonb(pr) ELSE NULL END AS promosi,
        CASE WHEN sp.id IS NOT NULL THEN to_jsonb(sp) ELSE NULL END AS status_pembayaran
      FROM siswa s
      JOIN paket p ON s.paket_id = p.id
      LEFT JOIN promosi pr ON s.promosi_id = pr.id
      LEFT JOIN status_pembayaran_master sp ON s.status_pembayaran_kode = sp.kode
      WHERE p.termasuk_sim = TRUE
    `;

    const params: any[] = [];

    if (filter?.statusSim && filter.statusSim !== 'all') {
      params.push(filter.statusSim);
      query += ` AND s.status_sim = $${params.length}`;
    }

    if (filter?.statusPembayaran && filter.statusPembayaran !== 'all') {
      if (filter.statusPembayaran === 'lunas') {
        query += ` AND s.status_pembayaran_kode = 'lunas'`;
      } else if (filter.statusPembayaran === 'belum_lunas') {
        query += ` AND s.status_pembayaran_kode != 'lunas'`;
      } else {
        params.push(filter.statusPembayaran);
        query += ` AND s.status_pembayaran_kode = $${params.length}`;
      }
    }

    if (filter?.isArchived && filter.isArchived !== 'all') {
      if (filter.isArchived === 'active') {
        query += ` AND (s.is_archived = FALSE OR s.is_archived IS NULL)`;
      } else if (filter.isArchived === 'archived') {
        query += ` AND s.is_archived = TRUE`;
      }
    }

    if (filter?.paketId && filter.paketId !== 'all') {
      params.push(filter.paketId);
      query += ` AND s.paket_id = $${params.length}`;
    }

    if (filter?.startDate) {
      params.push(filter.startDate);
      query += ` AND s.tanggal_booking >= $${params.length}`;
    }

    if (filter?.endDate) {
      params.push(filter.endDate);
      query += ` AND s.tanggal_booking <= $${params.length}`;
    }

    query += ` ORDER BY s.tanggal_booking ASC, s.created_at ASC`;

    const rows = await dbQuery<Siswa>(query, params);
    return rows;
  } catch (e) {
    console.error('Error fetching SIM siswa list:', e);
    return [];
  }
}

/**
 * Mengambil ringkasan metrik statistik operasional SIM
 */
export async function getSimMetricsSummary(): Promise<SimMetricsSummary> {
  try {
    const rows = await dbQuery<{
      status_sim: string;
      status_pembayaran_kode: string;
      is_archived: boolean;
    }>(`
      SELECT s.status_sim, s.status_pembayaran_kode, s.is_archived
      FROM siswa s
      JOIN paket p ON s.paket_id = p.id
      WHERE p.termasuk_sim = TRUE
    `);

    let totalSim = rows.length;
    let totalBelumSelesai = 0;
    let totalSelesai = 0;
    let totalSiapTerbit = 0;
    let totalMenungguPelunasan = 0;

    for (const r of rows) {
      const isSelesai = r.status_sim === 'selesai';
      const isLunas = r.status_pembayaran_kode === 'lunas';

      if (isSelesai) {
        totalSelesai += 1;
      } else {
        totalBelumSelesai += 1;
        if (isLunas) {
          totalSiapTerbit += 1;
        } else {
          totalMenungguPelunasan += 1;
        }
      }
    }

    return {
      totalSim,
      totalBelumSelesai,
      totalSelesai,
      totalSiapTerbit,
      totalMenungguPelunasan,
    };
  } catch (e) {
    console.error('Error fetching SIM metrics:', e);
    return {
      totalSim: 0,
      totalBelumSelesai: 0,
      totalSelesai: 0,
      totalSiapTerbit: 0,
      totalMenungguPelunasan: 0,
    };
  }
}

/**
 * Mengubah status SIM siswa (belum / selesai) dengan validasi pelunasan pembayaran
 */
export async function updateStatusSim(
  siswaId: string,
  statusSim: 'belum' | 'selesai',
  tanggalSelesai?: string | null,
  catatanSim?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const siswa = await dbQuerySingle<{
      id: string;
      nama: string;
      status_pembayaran_kode: string;
      status_sim: string;
    }>(
      'SELECT id, nama, status_pembayaran_kode, status_sim FROM siswa WHERE id = $1',
      [siswaId]
    );

    if (!siswa) {
      return { success: false, error: 'Data siswa tidak ditemukan di database.' };
    }

    if (statusSim === 'selesai') {
      // Validasi status pembayaran: Harus LUNAS
      if (siswa.status_pembayaran_kode !== 'lunas') {
        return {
          success: false,
          error: `Gagal menyelesaikan SIM: Siswa "${siswa.nama}" belum melunasi biaya kursus (Status: ${siswa.status_pembayaran_kode.toUpperCase()}). Status SIM hanya dapat diselesaikan jika status pembayaran sudah LUNAS.`,
        };
      }

      const tgl = tanggalSelesai || getTodayDateString();
      await dbQuery(
        `UPDATE siswa 
         SET 
           status_sim = 'selesai',
           tanggal_selesai_sim = $1,
           catatan_sim = $2,
           is_archived = TRUE,
           updated_at = NOW()
         WHERE id = $3`,
        [tgl, catatanSim || null, siswaId]
      );
    } else {
      // Set kembali ke belum & unarchive
      await dbQuery(
        `UPDATE siswa 
         SET 
           status_sim = 'belum',
           tanggal_selesai_sim = NULL,
           catatan_sim = $1,
           is_archived = FALSE,
           updated_at = NOW()
         WHERE id = $2`,
        [catatanSim || null, siswaId]
      );
    }

    cacheInvalidate('siswa*');
    cacheInvalidate('sim*');
    cacheInvalidate('dashboard*');

    safeRevalidatePath('/sim');
    safeRevalidatePath('/siswa');
    safeRevalidatePath(`/siswa/${siswaId}`);
    safeRevalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Error updating status SIM:', err);
    return { success: false, error: err.message || 'Terjadi kesalahan sistem' };
  }
}
