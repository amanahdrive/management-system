'use server';

import { dbQuery, dbQuerySingle } from '@/lib/db';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { PosPengeluaran, PosPengeluaranStatus, PosPengeluaranSumber } from '@/types/database';
import { getTodayDateString } from '@/lib/utils/date';
import { revalidatePath } from 'next/cache';
import { getModalSimSettings, getOperasionalSettings } from './settings';
import { syncHutangPaymentState } from './kas';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Suppressed in non-request contexts
  }
}

export interface PosPengeluaranFilter {
  periodeBulan?: string; // 'YYYY-MM'
  status?: PosPengeluaranStatus | 'all';
  kategori?: string | 'all';
  sumber?: PosPengeluaranSumber | 'all';
}

export interface PosPengeluaranSummary {
  totalPos: number;
  totalEstimasi: number;
  totalRealisasi: number;
  totalSisaBelumBayar: number;
  sudahBayarCount: number;
  belumBayarCount: number;
}

/**
 * Mengambil daftar pos pengeluaran berdasarkan filter
 */
export async function getPosPengeluaranList(
  filter?: PosPengeluaranFilter
): Promise<PosPengeluaran[]> {
  try {
    const currentMonth = getTodayDateString().slice(0, 7);
    const targetMonth = filter?.periodeBulan || currentMonth;

    let query = `
      SELECT 
        p.*,
        CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS siswa,
        CASE WHEN h.id IS NOT NULL THEN to_jsonb(h) ELSE NULL END AS hutang
      FROM pos_pengeluaran p
      LEFT JOIN siswa s ON p.siswa_id = s.id
      LEFT JOIN hutang h ON p.hutang_id = h.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (targetMonth && targetMonth !== 'all') {
      params.push(targetMonth);
      query += ` AND p.periode_bulan = $${params.length}`;
    }

    if (filter?.status && filter.status !== 'all') {
      params.push(filter.status);
      query += ` AND p.status = $${params.length}`;
    }

    if (filter?.kategori && filter.kategori !== 'all') {
      params.push(filter.kategori);
      query += ` AND p.kategori = $${params.length}`;
    }

    if (filter?.sumber && filter.sumber !== 'all') {
      params.push(filter.sumber);
      query += ` AND p.sumber = $${params.length}`;
    }

    query += ` ORDER BY p.status ASC, p.tanggal_jatuh_tempo ASC NULLS LAST, p.created_at DESC`;

    const rows = await dbQuery<PosPengeluaran>(query, params);
    return (rows || []).map((r) => ({
      ...r,
      nominal_estimasi: Number(r.nominal_estimasi) || 0,
      nominal_realisasi: Number(r.nominal_realisasi) || 0,
    }));
  } catch (err) {
    console.error('Error fetching pos pengeluaran list:', err);
    return [];
  }
}

/**
 * Ringkasan metrik anggaran pos pengeluaran untuk suatu bulan
 */
export async function getPosPengeluaranSummary(
  periodeBulan: string
): Promise<PosPengeluaranSummary> {
  try {
    const rows = await dbQuery<{
      status: string;
      nominal_estimasi: string;
      nominal_realisasi: string;
    }>(
      `SELECT status, nominal_estimasi, nominal_realisasi 
       FROM pos_pengeluaran 
       WHERE periode_bulan = $1 AND status != 'dibatalkan'`,
      [periodeBulan]
    );

    let totalPos = 0;
    let totalEstimasi = 0;
    let totalRealisasi = 0;
    let totalSisaBelumBayar = 0;
    let sudahBayarCount = 0;
    let belumBayarCount = 0;

    (rows || []).forEach((row) => {
      totalPos += 1;
      const est = Number(row.nominal_estimasi) || 0;
      const real = Number(row.nominal_realisasi) || 0;

      totalEstimasi += est;
      totalRealisasi += real;

      if (row.status === 'terbayar') {
        sudahBayarCount += 1;
      } else {
        belumBayarCount += 1;
        totalSisaBelumBayar += est;
      }
    });

    return {
      totalPos,
      totalEstimasi,
      totalRealisasi,
      totalSisaBelumBayar,
      sudahBayarCount,
      belumBayarCount,
    };
  } catch (err) {
    console.error('Error fetching pos pengeluaran summary:', err);
    return {
      totalPos: 0,
      totalEstimasi: 0,
      totalRealisasi: 0,
      totalSisaBelumBayar: 0,
      sudahBayarCount: 0,
      belumBayarCount: 0,
    };
  }
}

/**
 * Helper memformat tanggal jatuh tempo
 */
function buildDueDate(yearMonth: string, day: number): string {
  const [yStr, mStr] = yearMonth.split('-');
  const y = Number(yStr) || new Date().getFullYear();
  const m = Number(mStr) || new Date().getMonth() + 1;
  const maxDays = new Date(y, m, 0).getDate();
  const validDay = Math.min(Math.max(1, day), maxDays);
  return `${yearMonth}-${String(validDay).padStart(2, '0')}`;
}

/**
 * Generator Otomatis Pos Pengeluaran untuk suatu bulan (Idempotent & Preservatif):
 * 1. Siswa SIM Baru/Aktif (yang belum selesai SIM) -> Pelatihan SIM dengan jatuh tempo sesi terakhir (atau kosong jika belum ada jadwal)
 * 2. Cicilan Hutang Berjalan -> Hutang aktif dengan jatuh tempo bulan berjalan
 * 3. Pos Operasional Rutin: Token Listrik, WiFi, Air PDAM (hanya tambahkan jika belum ada di daftar)
 */
export async function generatePosOtomatisBulanIni(
  periodeBulan: string
): Promise<{ success: boolean; createdCount: number; updatedCount: number; message: string }> {
  try {
    let createdCount = 0;
    let updatedCount = 0;

    const [simSettings, opSettings] = await Promise.all([
      getModalSimSettings(),
      getOperasionalSettings(),
    ]);

    // -------------------------------------------------------------
    // 1. SISWA PAKET SIM AKTIF (BELUM SELESAI SIM)
    // -------------------------------------------------------------
    const siswaSimList = await dbQuery<{
      id: string;
      nama: string;
      nama_paket: string;
      tanggal_booking: string;
      sesi_terakhir: string | null;
    }>(
      `SELECT s.id, s.nama, p.nama_paket, s.tanggal_booking,
              (
                SELECT MAX(j.tanggal_sesi)::text 
                FROM jadwal_sesi j 
                WHERE j.siswa_id = s.id AND j.status_sesi != 'batal'
              ) as sesi_terakhir
       FROM siswa s
       JOIN paket p ON s.paket_id = p.id
       WHERE p.termasuk_sim = TRUE 
         AND (s.status_sim != 'selesai' OR s.status_sim IS NULL)
         AND (s.is_archived = FALSE OR s.is_archived IS NULL)`
    );

    for (const s of siswaSimList || []) {
      // Cek apakah pos untuk siswa ini sudah pernah ada (baik otomatis maupun manual)
      const existing = await dbQuerySingle<{ id: string; status: string; tanggal_jatuh_tempo: string | null }>(
        `SELECT id, status, tanggal_jatuh_tempo::text 
         FROM pos_pengeluaran 
         WHERE (siswa_id = $1 OR nama_pos ILIKE $2) AND status != 'dibatalkan'`,
        [s.id, `%SIM%${s.nama}%`]
      );

      if (!existing) {
        const jenis = s.nama_paket?.toLowerCase().includes('sim c') ? 'SIM C' : 'SIM A';
        const modalPrice =
          simSettings.configPerJenis?.[jenis] ||
          simSettings.configPerJenis?.['default'] ||
          simSettings.hargaDefault ||
          850000;

        const dueDate = s.sesi_terakhir || null;
        const catatanText = dueDate
          ? `Otomatis dari Siswa SIM (${s.nama_paket}) - Jatuh tempo sesi terakhir`
          : `Otomatis dari Siswa SIM (${s.nama_paket}) - Jadwal sesi belum diatur`;

        await dbQuery(
          `INSERT INTO pos_pengeluaran (
            nama_pos, kategori, nominal_estimasi, nominal_realisasi, 
            is_fluktuatif, sumber, periode_bulan, tanggal_jatuh_tempo, 
            status, siswa_id, catatan, created_at, updated_at
          ) VALUES ($1, $2, $3, 0, FALSE, 'otomatis_sim', $4, $5, 'belum_bayar', $6, $7, NOW(), NOW())`,
          [
            `Pelatihan SIM - ${s.nama} (${jenis})`,
            'sim',
            modalPrice,
            periodeBulan,
            dueDate,
            s.id,
            catatanText,
          ]
        );
        createdCount++;
      } else if (existing.status === 'belum_bayar' && s.sesi_terakhir) {
        // Jika pos sudah ada dan belum dibayar, selaraskan jatuh tempo jika ada jadwal sesi terakhir baru
        const currentDueDate = existing.tanggal_jatuh_tempo ? String(existing.tanggal_jatuh_tempo).slice(0, 10) : null;
        if (currentDueDate !== s.sesi_terakhir) {
          await dbQuery(
            `UPDATE pos_pengeluaran 
             SET tanggal_jatuh_tempo = $1,
                 catatan = 'Jatuh tempo disesuaikan ke tanggal sesi terakhir',
                 updated_at = NOW()
             WHERE id = $2`,
            [s.sesi_terakhir, existing.id]
          );
          updatedCount++;
        }
      }
    }

    // -------------------------------------------------------------
    // 2. CICILAN HUTANG BERJALAN
    // -------------------------------------------------------------
    const hutangBerjalan = await dbQuery<{
      id: string;
      nama_hutang: string;
      total_hutang: number;
      sisa_hutang: number;
      jatuh_tempo_bulanan: number | null;
      cicilan_per_bulan: number | null;
    }>(
      `SELECT id, nama_hutang, total_hutang, sisa_hutang, jatuh_tempo_bulanan, cicilan_per_bulan 
       FROM hutang 
       WHERE status = 'berjalan' AND sisa_hutang > 0`
    );

    for (const h of hutangBerjalan || []) {
      const existing = await dbQuerySingle<{ id: string }>(
        `SELECT id FROM pos_pengeluaran 
         WHERE (hutang_id = $1 OR nama_pos ILIKE $3) AND periode_bulan = $2 AND status != 'dibatalkan'`,
        [h.id, periodeBulan, `%${h.nama_hutang}%`]
      );

      if (!existing) {
        const nominalCicilan = Math.min(
          Number(h.cicilan_per_bulan) || Number(h.sisa_hutang),
          Number(h.sisa_hutang)
        );
        const dueDay = Number(h.jatuh_tempo_bulanan) || 10;
        const dueDate = buildDueDate(periodeBulan, dueDay);

        await dbQuery(
          `INSERT INTO pos_pengeluaran (
            nama_pos, kategori, nominal_estimasi, nominal_realisasi, 
            is_fluktuatif, sumber, periode_bulan, tanggal_jatuh_tempo, 
            status, hutang_id, catatan, created_at, updated_at
          ) VALUES ($1, $2, $3, 0, FALSE, 'otomatis_hutang', $4, $5, 'belum_bayar', $6, $7, NOW(), NOW())`,
          [
            `Cicilan Hutang - ${h.nama_hutang}`,
            'cicilan_hutang',
            nominalCicilan,
            periodeBulan,
            dueDate,
            h.id,
            `Otomatis cicilan bulanan hutang berjalan (Sisa: Rp ${Number(h.sisa_hutang).toLocaleString('id-ID')})`,
          ]
        );
        createdCount++;
      }
    }

    // -------------------------------------------------------------
    // 3. OPERASIONAL RUTIN: TOKEN, WIFI, AIR (Hanya jika belum ada)
    // -------------------------------------------------------------
    // A. Token Listrik
    const existingToken = await dbQuerySingle<{ id: string }>(
      `SELECT id FROM pos_pengeluaran 
       WHERE periode_bulan = $1 
         AND (nama_pos ILIKE '%Token Listrik%' OR nama_pos ILIKE '%Listrik%') 
         AND status != 'dibatalkan'`,
      [periodeBulan]
    );
    if (!existingToken) {
      const dueDate = buildDueDate(periodeBulan, opSettings.tokenTanggal);
      await dbQuery(
        `INSERT INTO pos_pengeluaran (
          nama_pos, kategori, nominal_estimasi, nominal_realisasi, 
          is_fluktuatif, sumber, periode_bulan, tanggal_jatuh_tempo, 
          status, catatan, created_at, updated_at
        ) VALUES ($1, $2, $3, 0, FALSE, 'otomatis_operasional', $4, $5, 'belum_bayar', $6, NOW(), NOW())`,
        [
          'Tagihan Token Listrik Kantor',
          'operasional',
          opSettings.tokenNominal,
          periodeBulan,
          dueDate,
          `Otomatis biaya rutin bulanan token listrik (Jatuh tempo tgl ${opSettings.tokenTanggal})`,
        ]
      );
      createdCount++;
    }

    // B. WiFi Kantor
    const existingWifi = await dbQuerySingle<{ id: string }>(
      `SELECT id FROM pos_pengeluaran 
       WHERE periode_bulan = $1 
         AND (nama_pos ILIKE '%WiFi%' OR nama_pos ILIKE '%Internet%') 
         AND status != 'dibatalkan'`,
      [periodeBulan]
    );
    if (!existingWifi) {
      const dueDate = buildDueDate(periodeBulan, opSettings.wifiTanggal);
      await dbQuery(
        `INSERT INTO pos_pengeluaran (
          nama_pos, kategori, nominal_estimasi, nominal_realisasi, 
          is_fluktuatif, sumber, periode_bulan, tanggal_jatuh_tempo, 
          status, catatan, created_at, updated_at
        ) VALUES ($1, $2, $3, 0, FALSE, 'otomatis_operasional', $4, $5, 'belum_bayar', $6, NOW(), NOW())`,
        [
          'Tagihan WiFi Kantor',
          'operasional',
          opSettings.wifiNominal,
          periodeBulan,
          dueDate,
          `Otomatis biaya rutin bulanan internet WiFi kantor (Jatuh tempo tgl ${opSettings.wifiTanggal})`,
        ]
      );
      createdCount++;
    }

    // C. Air PDAM (Fluktuatif)
    const existingAir = await dbQuerySingle<{ id: string }>(
      `SELECT id FROM pos_pengeluaran 
       WHERE periode_bulan = $1 
         AND (nama_pos ILIKE '%Air PDAM%' OR nama_pos ILIKE '%PDAM%') 
         AND status != 'dibatalkan'`,
      [periodeBulan]
    );
    if (!existingAir) {
      const dueDate = buildDueDate(periodeBulan, opSettings.airTanggal);
      await dbQuery(
        `INSERT INTO pos_pengeluaran (
          nama_pos, kategori, nominal_estimasi, nominal_realisasi, 
          is_fluktuatif, sumber, periode_bulan, tanggal_jatuh_tempo, 
          status, catatan, created_at, updated_at
        ) VALUES ($1, $2, $3, 0, TRUE, 'otomatis_operasional', $4, $5, 'belum_bayar', $6, NOW(), NOW())`,
        [
          'Tagihan Air PDAM Kantor',
          'operasional',
          opSettings.airNominal,
          periodeBulan,
          dueDate,
          `Otomatis estimasi air PDAM (Biaya fluktuatif - sesuaikan nominal saat bayar)`,
        ]
      );
      createdCount++;
    }

    cacheInvalidate('pos_pengeluaran*');
    safeRevalidate('/kas/pos');
    safeRevalidate('/kas');

    let msg = `Sinkronisasi periode ${periodeBulan}: `;
    if (createdCount === 0 && updatedCount === 0) {
      msg += `Semua pos pengeluaran sudah terdata lengkap. Tidak ada data yang diubah atau diduplikasi.`;
    } else {
      msg += `Berhasil menambahkan ${createdCount} pos baru`;
      if (updatedCount > 0) {
        msg += ` dan menyelaraskan tanggal jatuh tempo ${updatedCount} pos SIM`;
      }
      msg += `. Pos yang sudah ada tetap aman.`;
    }

    return {
      success: true,
      createdCount,
      updatedCount,
      message: msg,
    };
  } catch (err: any) {
    console.error('Error generating automatic pos pengeluaran:', err);
    return {
      success: false,
      createdCount: 0,
      updatedCount: 0,
      message: err.message || 'Gagal membuat pos otomatis',
    };
  }
}

/**
 * Sinkronkan Siswa SIM Baru / Update Paket ke Pos Pengeluaran pada Bulan Aktif:
 * - Jika siswa mengambil paket SIM, langsung masukkan ke pos pengeluaran bulan aktif.
 * - Tanggal jatuh tempo menyesuaikan tanggal sesi terakhir siswa (atau NULL jika jadwal belum diatur).
 * - Jika siswa batal/tidak mengambil paket SIM, pos pending dibatalkan.
 */
export async function syncSiswaSimToPosPengeluaran(siswaId: string): Promise<void> {
  try {
    const s = await dbQuerySingle<{
      id: string;
      nama: string;
      tanggal_booking: string;
      status_sim: string;
      nama_paket: string;
      termasuk_sim: boolean;
      sesi_terakhir: string | null;
    }>(
      `SELECT s.id, s.nama, s.tanggal_booking, s.status_sim, p.nama_paket, p.termasuk_sim,
              (
                SELECT MAX(j.tanggal_sesi)::text 
                FROM jadwal_sesi j 
                WHERE j.siswa_id = s.id AND j.status_sesi != 'batal'
              ) as sesi_terakhir
       FROM siswa s
       JOIN paket p ON s.paket_id = p.id
       WHERE s.id = $1`,
      [siswaId]
    );

    if (!s) return;

    const existing = await dbQuerySingle<{ id: string; status: string; tanggal_jatuh_tempo: string | null }>(
      `SELECT id, status, tanggal_jatuh_tempo::text 
       FROM pos_pengeluaran 
       WHERE siswa_id = $1 AND status != 'dibatalkan'`,
      [siswaId]
    );

    // Jika siswa batal ambil SIM, hapus pos pending yang belum dibayar
    if (!s.termasuk_sim) {
      if (existing && existing.status === 'belum_bayar') {
        await dbQuery(`DELETE FROM pos_pengeluaran WHERE id = $1`, [existing.id]);
        cacheInvalidate('pos_pengeluaran*');
        safeRevalidate('/kas/pos');
      }
      return;
    }

    // Siswa mengambil paket SIM
    const simSettings = await getModalSimSettings();
    const jenis = s.nama_paket?.toLowerCase().includes('sim c') ? 'SIM C' : 'SIM A';
    const modalPrice =
      simSettings.configPerJenis?.[jenis] ||
      simSettings.configPerJenis?.['default'] ||
      simSettings.hargaDefault ||
      850000;

    const currentMonth = getTodayDateString().slice(0, 7);
    const dueDate = s.sesi_terakhir || null;

    if (!existing) {
      const catatanText = dueDate
        ? `Otomatis dari Siswa SIM (${s.nama_paket}) - Jatuh tempo sesi terakhir`
        : `Otomatis dari Siswa SIM (${s.nama_paket}) - Jadwal sesi belum diatur`;

      await dbQuery(
        `INSERT INTO pos_pengeluaran (
          nama_pos, kategori, nominal_estimasi, nominal_realisasi, 
          is_fluktuatif, sumber, periode_bulan, tanggal_jatuh_tempo, 
          status, siswa_id, catatan, created_at, updated_at
        ) VALUES ($1, 'sim', $2, 0, FALSE, 'otomatis_sim', $3, $4, 'belum_bayar', $5, $6, NOW(), NOW())`,
        [
          `Pelatihan SIM - ${s.nama} (${jenis})`,
          modalPrice,
          currentMonth,
          dueDate,
          s.id,
          catatanText,
        ]
      );
      cacheInvalidate('pos_pengeluaran*');
      safeRevalidate('/kas/pos');
    } else if (existing.status === 'belum_bayar') {
      const currentDueDate = existing.tanggal_jatuh_tempo ? String(existing.tanggal_jatuh_tempo).slice(0, 10) : null;
      if (currentDueDate !== dueDate) {
        await dbQuery(
          `UPDATE pos_pengeluaran 
           SET tanggal_jatuh_tempo = $1, 
               catatan = CASE WHEN $1::text IS NOT NULL THEN 'Jatuh tempo disesuaikan ke tanggal sesi terakhir' ELSE 'Jadwal sesi belum diatur' END,
               updated_at = NOW() 
           WHERE id = $2`,
          [dueDate, existing.id]
        );
        cacheInvalidate('pos_pengeluaran*');
        safeRevalidate('/kas/pos');
      }
    }
  } catch (err) {
    console.error('Error in syncSiswaSimToPosPengeluaran:', err);
  }
}

/**
 * Sinkronkan Tanggal Jatuh Tempo Pos SIM saat Jadwal Sesi Siswa Diatur atau Berubah
 */
export async function syncSimPosDueDateOnScheduleChange(siswaId: string): Promise<void> {
  try {
    const existing = await dbQuerySingle<{ id: string; status: string; tanggal_jatuh_tempo: string | null }>(
      `SELECT id, status, tanggal_jatuh_tempo::text 
       FROM pos_pengeluaran 
       WHERE siswa_id = $1 AND kategori = 'sim' AND status = 'belum_bayar'`,
      [siswaId]
    );
    if (!existing) return;

    const res = await dbQuerySingle<{ sesi_terakhir: string | null }>(
      `SELECT MAX(tanggal_sesi)::text as sesi_terakhir 
       FROM jadwal_sesi 
       WHERE siswa_id = $1 AND status_sesi != 'batal'`,
      [siswaId]
    );

    const dueDate = res?.sesi_terakhir || null;
    const currentDueDate = existing.tanggal_jatuh_tempo ? String(existing.tanggal_jatuh_tempo).slice(0, 10) : null;

    if (currentDueDate !== dueDate) {
      await dbQuery(
        `UPDATE pos_pengeluaran 
         SET tanggal_jatuh_tempo = $1,
             catatan = CASE WHEN $1::text IS NOT NULL THEN 'Jatuh tempo disesuaikan ke tanggal sesi terakhir' ELSE 'Jadwal sesi belum diatur' END,
             updated_at = NOW()
         WHERE id = $2`,
        [dueDate, existing.id]
      );
      cacheInvalidate('pos_pengeluaran*');
      safeRevalidate('/kas/pos');
    }
  } catch (err) {
    console.error('Error in syncSimPosDueDateOnScheduleChange:', err);
  }
}

/**
 * Buat Pos Pengeluaran Manual
 */
export async function createPosPengeluaran(data: {
  nama_pos: string;
  kategori: string;
  nominal_estimasi: number;
  is_fluktuatif?: boolean;
  periode_bulan: string;
  tanggal_jatuh_tempo?: string | null;
  catatan?: string | null;
}): Promise<{ success: boolean; pos?: PosPengeluaran; error?: string }> {
  try {
    if (!data.nama_pos || data.nominal_estimasi <= 0) {
      return { success: false, error: 'Nama pos dan nominal estimasi harus diisi valid' };
    }

    const rows = await dbQuery<PosPengeluaran>(
      `INSERT INTO pos_pengeluaran (
        nama_pos, kategori, nominal_estimasi, nominal_realisasi,
        is_fluktuatif, sumber, periode_bulan, tanggal_jatuh_tempo,
        status, catatan, created_at, updated_at
      ) VALUES ($1, $2, $3, 0, $4, 'manual', $5, $6, 'belum_bayar', $7, NOW(), NOW())
      RETURNING *`,
      [
        data.nama_pos.trim(),
        data.kategori || 'operasional',
        data.nominal_estimasi,
        Boolean(data.is_fluktuatif),
        data.periode_bulan,
        data.tanggal_jatuh_tempo || null,
        data.catatan?.trim() || null,
      ]
    );

    cacheInvalidate('pos_pengeluaran*');
    safeRevalidate('/kas/pos');

    return { success: true, pos: rows[0] };
  } catch (err: any) {
    console.error('Error creating pos pengeluaran:', err);
    return { success: false, error: err.message || 'Gagal membuat pos pengeluaran' };
  }
}

/**
 * Update Pos Pengeluaran
 */
export async function updatePosPengeluaran(
  id: string,
  data: Partial<PosPengeluaran>
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await dbQuerySingle<PosPengeluaran>(
      'SELECT * FROM pos_pengeluaran WHERE id = $1',
      [id]
    );
    if (!existing) return { success: false, error: 'Pos pengeluaran tidak ditemukan' };

    await dbQuery(
      `UPDATE pos_pengeluaran SET
        nama_pos = COALESCE($1, nama_pos),
        kategori = COALESCE($2, kategori),
        nominal_estimasi = COALESCE($3, nominal_estimasi),
        is_fluktuatif = COALESCE($4, is_fluktuatif),
        tanggal_jatuh_tempo = COALESCE($5, tanggal_jatuh_tempo),
        catatan = COALESCE($6, catatan),
        status = COALESCE($7, status),
        updated_at = NOW()
      WHERE id = $8`,
      [
        data.nama_pos,
        data.kategori,
        data.nominal_estimasi,
        data.is_fluktuatif,
        data.tanggal_jatuh_tempo,
        data.catatan,
        data.status,
        id,
      ]
    );

    cacheInvalidate('pos_pengeluaran*');
    safeRevalidate('/kas/pos');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating pos pengeluaran:', err);
    return { success: false, error: err.message || 'Gagal mengupdate pos pengeluaran' };
  }
}

/**
 * Hapus / Batalkan Pos Pengeluaran
 */
export async function deletePosPengeluaran(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await dbQuerySingle<PosPengeluaran>(
      'SELECT * FROM pos_pengeluaran WHERE id = $1',
      [id]
    );
    if (!existing) return { success: false, error: 'Pos tidak ditemukan' };

    if (existing.status === 'terbayar' && existing.kas_transaksi_id) {
      return {
        success: false,
        error: 'Pos yang sudah terbayar tidak dapat dihapus langsung. Hapus transaksi mutasi di Kas terlebih dahulu.',
      };
    }

    await dbQuery('DELETE FROM pos_pengeluaran WHERE id = $1', [id]);

    cacheInvalidate('pos_pengeluaran*');
    safeRevalidate('/kas/pos');
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting pos pengeluaran:', err);
    return { success: false, error: err.message || 'Gagal menghapus pos pengeluaran' };
  }
}

export interface BayarPosPayload {
  nominal_realisasi: number;
  jenis_pembayaran: 'tunai' | 'non_tunai';
  rekening_id?: string | null;
  tanggal: string;
  pic_nama: string;
  keterangan?: string;
  catat_ke_kas?: boolean;
}

/**
 * Eksekusi Pembayaran Pos Pengeluaran:
 * - Jika catat_ke_kas !== false: catat mutasi pengeluaran ke kas_transaksi & tautkan kas_transaksi_id
 * - Jika catat_ke_kas === false: hanya update status menjadi 'terbayar' tanpa mutasi kas_transaksi
 * - Jika terkait hutang, sinkronkan sisa hutang di tabel hutang
 */
export async function bayarPosPengeluaran(
  posId: string,
  payload: BayarPosPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const pos = await dbQuerySingle<PosPengeluaran>(
      'SELECT * FROM pos_pengeluaran WHERE id = $1',
      [posId]
    );

    if (!pos) return { success: false, error: 'Pos pengeluaran tidak ditemukan' };
    if (pos.status === 'terbayar') {
      return { success: false, error: 'Pos pengeluaran ini sudah berstatus terbayar' };
    }

    if (!payload.nominal_realisasi || payload.nominal_realisasi <= 0) {
      return { success: false, error: 'Nominal pembayaran harus lebih besar dari 0' };
    }

    const catatKeKas = payload.catat_ke_kas !== false;
    let newTxId: string | null = null;

    if (catatKeKas) {
      const txKategori =
        pos.kategori === 'sim' ? 'operasional' : (pos.kategori || 'operasional');
      const txKeterangan =
        payload.keterangan?.trim() || `Pembayaran Pos: ${pos.nama_pos}`;

      // 1. Simpan ke kas_transaksi
      const txRows = await dbQuery<{ id: string }>(
        `INSERT INTO kas_transaksi (
          tanggal, tipe, kategori, keterangan, nominal,
          jenis_pembayaran, rekening_id, pic_tipe, pic_nama,
          siswa_id, hutang_id, sumber_otomatis, created_at, updated_at
        ) VALUES ($1, 'pengeluaran', $2, $3, $4, $5, $6, 'admin', $7, $8, $9, TRUE, NOW(), NOW())
        RETURNING id`,
        [
          payload.tanggal || getTodayDateString(),
          txKategori,
          txKeterangan,
          payload.nominal_realisasi,
          payload.jenis_pembayaran,
          payload.jenis_pembayaran === 'non_tunai' ? (payload.rekening_id || null) : null,
          payload.pic_nama || 'Admin Staff',
          pos.siswa_id || null,
          pos.hutang_id || null,
        ]
      );

      newTxId = txRows[0].id;
    }

    // 2. Update pos_pengeluaran
    await dbQuery(
      `UPDATE pos_pengeluaran SET
        status = 'terbayar',
        nominal_realisasi = $1,
        kas_transaksi_id = $2,
        updated_at = NOW()
      WHERE id = $3`,
      [payload.nominal_realisasi, newTxId, posId]
    );

    // 3. Jika ini pos cicilan hutang, sinkronkan sisa hutang
    if (pos.hutang_id) {
      await syncHutangPaymentState(pos.hutang_id);
    }

    cacheInvalidate('pos_pengeluaran*');
    if (catatKeKas) {
      cacheInvalidate('kas*');
      cacheInvalidate('dashboard*');
      safeRevalidate('/kas');
      safeRevalidate('/kas/cashflow');
      safeRevalidate('/finance');
    }
    if (pos.hutang_id) {
      safeRevalidate('/kas/hutang');
    }

    safeRevalidate('/kas/pos');

    return { success: true };
  } catch (err: any) {
    console.error('Error paying pos pengeluaran:', err);
    return { success: false, error: err.message || 'Gagal memproses pembayaran pos' };
  }
}
