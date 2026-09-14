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
    const row = await dbQuerySingle<{
      totalSim: number;
      totalBelumSelesai: number;
      totalSelesai: number;
      totalSiapTerbit: number;
      totalMenungguPelunasan: number;
    }>(`
      SELECT 
        COUNT(*)::int AS "totalSim",
        COUNT(*) FILTER (WHERE s.status_sim != 'selesai')::int AS "totalBelumSelesai",
        COUNT(*) FILTER (WHERE s.status_sim = 'selesai')::int AS "totalSelesai",
        COUNT(*) FILTER (WHERE s.status_sim != 'selesai' AND s.status_pembayaran_kode = 'lunas')::int AS "totalSiapTerbit",
        COUNT(*) FILTER (WHERE s.status_sim != 'selesai' AND s.status_pembayaran_kode != 'lunas')::int AS "totalMenungguPelunasan"
      FROM siswa s
      JOIN paket p ON s.paket_id = p.id
      WHERE p.termasuk_sim = TRUE;
    `);

    return {
      totalSim: Number(row?.totalSim || 0),
      totalBelumSelesai: Number(row?.totalBelumSelesai || 0),
      totalSelesai: Number(row?.totalSelesai || 0),
      totalSiapTerbit: Number(row?.totalSiapTerbit || 0),
      totalMenungguPelunasan: Number(row?.totalMenungguPelunasan || 0),
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

/**
 * Eksekusi masal status SIM siswa menjadi selesai
 */
export async function executeBatchSim(
  siswaIds: string[],
  tanggalPelatihan: string,
  catatanSim?: string
): Promise<{ success: boolean; executedCount: number; error?: string }> {
  try {
    if (!siswaIds || siswaIds.length === 0) {
      return { success: false, executedCount: 0, error: 'Tidak ada siswa yang dipilih' };
    }

    const tgl = tanggalPelatihan || getTodayDateString();

    await dbQuery(
      `UPDATE siswa 
       SET 
         status_sim = 'selesai',
         tanggal_selesai_sim = $1,
         catatan_sim = COALESCE($2, catatan_sim),
         is_archived = TRUE,
         updated_at = NOW()
       WHERE id = ANY($3::uuid[])`,
      [tgl, catatanSim || null, siswaIds]
    );

    // Update pos_pengeluaran terkait jika ada
    await dbQuery(
      `UPDATE pos_pengeluaran
       SET tanggal_jatuh_tempo = $1,
           updated_at = NOW()
       WHERE siswa_id = ANY($2::uuid[]) AND status = 'belum_bayar'`,
      [tgl, siswaIds]
    );

    cacheInvalidate('siswa*');
    cacheInvalidate('sim*');
    cacheInvalidate('pos_pengeluaran*');
    cacheInvalidate('dashboard*');

    safeRevalidatePath('/sim');
    safeRevalidatePath('/siswa');
    safeRevalidatePath('/dashboard');
    safeRevalidatePath('/kas/pos');

    return { success: true, executedCount: siswaIds.length };
  } catch (err: any) {
    console.error('Error executing batch SIM:', err);
    return { success: false, executedCount: 0, error: err.message || 'Terjadi kesalahan sistem' };
  }
}

export interface KasSimCandidate {
  id: string;
  namaExtracted: string;
  nominal: number;
  tanggal: string;
  keterangan: string;
  jenisPembayaran: string;
}

/**
 * Pindai transaksi kas masuk yang mengandung kata kunci SIM namun belum terdaftar di siswa / SIM
 */
export async function analyzeUnregisteredKasSimTransactions(): Promise<KasSimCandidate[]> {
  try {
    const rawKas = await dbQuery<{
      id: string;
      keterangan: string;
      pic_nama: string | null;
      nominal: number;
      tanggal: string;
      jenis_pembayaran: string;
    }>(
      `SELECT id, keterangan, pic_nama, nominal, tanggal::text, jenis_pembayaran 
       FROM kas_transaksi 
       WHERE tipe = 'pemasukan' 
         AND siswa_id IS NULL 
         AND (
           keterangan ILIKE '%sim%' 
           OR kategori ILIKE '%sim%'
         )
       ORDER BY tanggal DESC, created_at DESC 
       LIMIT 50`
    );

    if (!rawKas || rawKas.length === 0) return [];

    const existingStudents = await dbQuery<{ nama: string }>(
      `SELECT LOWER(nama) as nama FROM siswa`
    );
    const existingNamesSet = new Set((existingStudents || []).map((s) => s.nama.trim()));

    const candidates: KasSimCandidate[] = [];

    for (const row of rawKas) {
      let extractedName = (row.pic_nama || '').trim();

      if (!extractedName && row.keterangan) {
        const cleanKet = row.keterangan.replace(/pemasukan|pembayaran|pelatihan|pengurusan|penerbitan|biaya|dp|lunas|sim\s*a|sim\s*c|sim/gi, '').trim();
        const matchName = cleanKet.replace(/^[-:\s]+/, '').replace(/[-:\s]+$/, '');
        if (matchName.length >= 2) {
          extractedName = matchName;
        }
      }

      if (!extractedName) {
        extractedName = row.keterangan || 'Peserta SIM';
      }

      const cleanLowerName = extractedName.toLowerCase();
      const isAlreadyInSiswa = Array.from(existingNamesSet).some(
        (existingName) => existingName.includes(cleanLowerName) || cleanLowerName.includes(existingName)
      );

      if (!isAlreadyInSiswa) {
        candidates.push({
          id: row.id,
          namaExtracted: extractedName,
          nominal: Number(row.nominal) || 0,
          tanggal: row.tanggal ? String(row.tanggal).slice(0, 10) : getTodayDateString(),
          keterangan: row.keterangan || `SIM ${extractedName}`,
          jenisPembayaran: row.jenis_pembayaran || 'tunai',
        });
      }
    }

    return candidates;
  } catch (err) {
    console.error('Error analyzing unregistered kas SIM transactions:', err);
    return [];
  }
}

export interface AddNonSiswaSimPayload {
  nama: string;
  noWhatsapp?: string;
  jenisSim: 'SIM A' | 'SIM C';
  hargaFinal: number;
  statusPembayaran?: 'lunas' | 'dp' | 'belum_bayar';
  dpNominal?: number;
  tanggalBooking?: string;
  catatan?: string;
  catatKeKas?: boolean;
  linkedKasId?: string;
}

/**
 * Memasukkan data peserta SIM Non-Siswa (Pendaftaran langsung / non reguler kursus)
 */
export async function addNonSiswaSimParticipant(
  payload: AddNonSiswaSimPayload
): Promise<{ success: boolean; siswaId?: string; error?: string }> {
  try {
    if (!payload.nama || !payload.nama.trim()) {
      return { success: false, error: 'Nama peserta wajib diisi' };
    }

    if (!payload.hargaFinal || payload.hargaFinal <= 0) {
      return { success: false, error: 'Nominal harga final SIM harus lebih besar dari 0' };
    }

    const targetJenis = payload.jenisSim || 'SIM A';
    const paket = (await dbQuerySingle<{ id: string; nama_paket: string }>(
      `SELECT id, nama_paket FROM paket WHERE termasuk_sim = TRUE AND nama_paket ILIKE $1 LIMIT 1`,
      [`%${targetJenis}%`]
    )) || (await dbQuerySingle<{ id: string; nama_paket: string }>(
      `SELECT id, nama_paket FROM paket WHERE termasuk_sim = TRUE LIMIT 1`
    ));

    if (!paket) {
      return { success: false, error: 'Tidak ditemukan master paket kursus/SIM di sistem' };
    }

    const countRes = await dbQuerySingle<{ count: number }>('SELECT count(*)::int as count FROM siswa');
    const seq = (countRes?.count || 0) + 1;
    const kodeSiswa = `NS-SIM${String(seq).padStart(3, '0')}`;

    const tgl = payload.tanggalBooking || getTodayDateString();
    const statusBayar = payload.statusPembayaran || 'lunas';
    const dpNominal = statusBayar === 'dp' ? (payload.dpNominal || Math.floor(payload.hargaFinal / 2)) : (statusBayar === 'lunas' ? payload.hargaFinal : 0);

    const insertedRows = await dbQuery<{ id: string }>(
      `INSERT INTO siswa (
        kode_siswa, nama, tanggal_booking, tanggal_rencana_mulai,
        no_whatsapp, alamat, paket_id, harga_final, harga_manual_override,
        status_pembayaran_kode, dp_nominal, dp_tanggal, sumber, catatan,
        status_sim, catatan_sim, is_archived, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $3,
        $4, $5, $6, $7, TRUE,
        $8, $9, $10, 'lain_lain', $11,
        'belum', $12, FALSE, NOW(), NOW()
      ) RETURNING id`,
      [
        kodeSiswa,
        payload.nama.trim(),
        tgl,
        payload.noWhatsapp?.trim() || '',
        'Peserta SIM Non-Siswa',
        paket.id,
        payload.hargaFinal,
        statusBayar,
        dpNominal,
        statusBayar !== 'belum_bayar' ? tgl : null,
        payload.catatan || 'Peserta SIM Non-Siswa (Pendaftaran Langsung)',
        `Non-Siswa (${targetJenis})`,
      ]
    );

    const newSiswaId = insertedRows[0].id;

    if (payload.linkedKasId) {
      await dbQuery(
        `UPDATE kas_transaksi 
         SET siswa_id = $1, 
             updated_at = NOW() 
         WHERE id = $2`,
        [newSiswaId, payload.linkedKasId]
      );
    } else if (payload.catatKeKas !== false && statusBayar !== 'belum_bayar') {
      const nominalKas = statusBayar === 'lunas' ? payload.hargaFinal : dpNominal;
      const ketText = `Pemasukan Pelatihan SIM Non-Siswa (${targetJenis}): ${payload.nama.trim()}`;

      await dbQuery(
        `INSERT INTO kas_transaksi (
          tanggal, tipe, kategori, keterangan, nominal,
          jenis_pembayaran, pic_tipe, pic_nama, siswa_id, sumber_otomatis,
          created_at, updated_at
        ) VALUES ($1, 'pemasukan', 'pembayaran_siswa', $2, $3, 'tunai', 'admin', 'Admin SIM', $4, TRUE, NOW(), NOW())`,
        [tgl, ketText, nominalKas, newSiswaId]
      );
    }

    cacheInvalidate('siswa*');
    cacheInvalidate('sim*');
    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');
    cacheInvalidate('pos_pengeluaran*');

    safeRevalidatePath('/sim');
    safeRevalidatePath('/siswa');
    safeRevalidatePath('/kas');
    safeRevalidatePath('/dashboard');

    return { success: true, siswaId: newSiswaId };
  } catch (err: any) {
    console.error('Error adding non-siswa SIM participant:', err);
    return { success: false, error: err.message || 'Gagal menambahkan data peserta SIM non-siswa' };
  }
}


