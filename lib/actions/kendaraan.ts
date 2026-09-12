'use server';

import { dbQuery, dbQuerySingle } from '@/lib/db';
import { cacheInvalidate } from '@/lib/utils/cache';
import { getTodayDateString, addDaysToDateStr } from '@/lib/utils/date';
import { KendaraanBan, HargaBBM, KendaraanLogHarian } from '@/types/database';
import { revalidatePath } from 'next/cache';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignored in non-request contexts
  }
}

export async function getHargaBBMList(): Promise<HargaBBM[]> {
  try {
    const rows = await dbQuery<HargaBBM>('SELECT * FROM harga_bbm ORDER BY jenis ASC');
    return rows;
  } catch (e) {
    console.error('Error fetching harga bbm:', e);
  }
  return [];
}

/**
 * Mengambil daftar log armada kendaraan dengan filter opsional (kendaraanId, rentang tanggal)
 */
export async function getKendaraanLogList(filter?: {
  kendaraanId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<KendaraanLogHarian[]> {
  try {
    let query = `
      SELECT 
        l.id,
        l.kendaraan_id,
        l.tanggal,
        l.tanggal_akhir,
        l.odometer_basecamp_out,
        l.odometer_basecamp_in,
        l.jarak_tempuh,
        l.total_slot_selesai,
        l.created_at,
        l.updated_at,
        COALESCE(l.bbm_nominal, kas_bbm.total_nominal) AS bbm_nominal,
        COALESCE(l.bbm_liter, kas_bbm.total_liter) AS bbm_liter,
        COALESCE(l.bbm_jenis, kas_bbm.bbm_jenis, 'pertalite') AS bbm_jenis,
        COALESCE(l.catatan, kas_bbm.catatan) AS catatan,
        json_build_object(
          'id', k.id,
          'nama_kendaraan', k.nama_kendaraan,
          'plat_nomor', k.plat_nomor,
          'tipe_transmisi', k.tipe_transmisi,
          'warna', k.warna
        ) AS kendaraan
      FROM kendaraan_log_harian l
      JOIN kendaraan k ON l.kendaraan_id = k.id
      LEFT JOIN LATERAL (
        SELECT 
          SUM(kt.nominal)::integer AS total_nominal,
          ROUND(SUM(kt.nominal) / 10000.0, 2) AS total_liter,
          'pertalite' AS bbm_jenis,
          STRING_AGG(kt.keterangan, '; ') AS catatan
        FROM kas_transaksi kt
        WHERE kt.kendaraan_id = l.kendaraan_id 
          AND kt.tanggal = l.tanggal 
          AND (kt.kategori = 'bbm' OR kt.kategori ILIKE '%bbm%')
      ) kas_bbm ON true
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.kendaraanId && filter.kendaraanId !== 'all') {
      params.push(filter.kendaraanId);
      query += ` AND l.kendaraan_id = $${params.length}`;
    }

    if (filter?.startDate) {
      params.push(filter.startDate);
      query += ` AND l.tanggal >= $${params.length}`;
    }

    if (filter?.endDate) {
      params.push(filter.endDate);
      query += ` AND l.tanggal <= $${params.length}`;
    }

    query += ` ORDER BY l.tanggal DESC, l.created_at DESC`;

    const rows = await dbQuery<KendaraanLogHarian>(query, params);
    return rows;
  } catch (e) {
    console.error('Error fetching kendaraan log list:', e);
    return [];
  }
}

/**
 * Sinkronisasi BBM dari kas_transaksi ke kendaraan_log_harian secara total dan akurat.
 */
export async function syncBbmToKendaraanLog(
  kendaraanId: string,
  tanggal: string
): Promise<void> {
  await syncBbmToKendaraanLogInternal(kendaraanId, tanggal);
  await syncKendaraanStatus(kendaraanId);
}

async function syncBbmToKendaraanLogInternal(
  kendaraanId: string,
  tanggal: string
): Promise<void> {
  try {
    if (!kendaraanId || !tanggal) return;

    const summary = await dbQuerySingle<{ total_nominal: number; keterangan: string }>(
      `SELECT 
         COALESCE(SUM(nominal), 0)::integer AS total_nominal,
         STRING_AGG(keterangan, '; ') AS keterangan
       FROM kas_transaksi
       WHERE kendaraan_id = $1 
         AND tanggal = $2 
         AND (kategori = 'bbm' OR kategori ILIKE '%bbm%')`,
      [kendaraanId, tanggal]
    );

    const totalNominal = summary?.total_nominal ? Number(summary.total_nominal) : 0;
    const ketLower = (summary?.keterangan || '').toLowerCase();

    if (totalNominal > 0) {
      let jenisBbm = 'pertalite';
      if (ketLower.includes('pertamax')) jenisBbm = 'pertamax';
      else if (ketLower.includes('solar') || ketLower.includes('dexlite')) jenisBbm = 'solar';

      let liter: number | null = null;
      const literMatch = ketLower.match(/(\d+(\.\d+)?)\s*l(iter)?/i);
      if (literMatch && literMatch[1]) {
        liter = parseFloat(literMatch[1]);
      } else {
        const hargaRow = await dbQuerySingle<HargaBBM>(
          'SELECT harga_per_liter FROM harga_bbm WHERE jenis = $1',
          [jenisBbm]
        );
        const price = hargaRow?.harga_per_liter || (jenisBbm === 'pertamax' ? 12950 : 10000);
        liter = parseFloat((totalNominal / price).toFixed(2));
      }

      await dbQuery(
        `INSERT INTO kendaraan_log_harian (kendaraan_id, tanggal, bbm_nominal, bbm_liter, bbm_jenis, catatan)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (kendaraan_id, tanggal) DO UPDATE
         SET 
           bbm_nominal = EXCLUDED.bbm_nominal,
           bbm_liter = EXCLUDED.bbm_liter,
           bbm_jenis = EXCLUDED.bbm_jenis,
           catatan = COALESCE(kendaraan_log_harian.catatan, EXCLUDED.catatan),
           updated_at = NOW()`,
        [kendaraanId, tanggal, totalNominal, liter, jenisBbm, summary?.keterangan || 'Pengisian BBM dari Transaksi Kas']
      );
    } else {
      const existingLog = await dbQuerySingle<{ id: string; odometer_basecamp_out: number | null; odometer_basecamp_in: number | null }>(
        'SELECT id, odometer_basecamp_out, odometer_basecamp_in FROM kendaraan_log_harian WHERE kendaraan_id = $1 AND tanggal = $2',
        [kendaraanId, tanggal]
      );
      if (existingLog) {
        if (existingLog.odometer_basecamp_out === null && existingLog.odometer_basecamp_in === null) {
          await dbQuery('DELETE FROM kendaraan_log_harian WHERE id = $1', [existingLog.id]);
        } else {
          await dbQuery(
            `UPDATE kendaraan_log_harian 
             SET bbm_nominal = NULL, bbm_liter = NULL, bbm_jenis = NULL, updated_at = NOW() 
             WHERE id = $1`,
            [existingLog.id]
          );
        }
      }
    }
  } catch (err) {
    console.error(`Error syncing bbm to log for vehicle ${kendaraanId} on ${tanggal}:`, err);
  }
}

/**
 * Sinkronisasi status riil armada (odometer terkini, bbm terakhir, oli, cuci)
 * dari seluruh log harian aktual, memastikan card armada selalu akurat dan tidak tertinggal.
 */
export async function syncKendaraanStatus(kendaraanId: string): Promise<void> {
  try {
    // 1. Pastikan baris status ada untuk armada ini
    await dbQuery(
      `INSERT INTO kendaraan_status (kendaraan_id) VALUES ($1) ON CONFLICT (kendaraan_id) DO NOTHING`,
      [kendaraanId]
    );

    // 2. Sinkronkan BBM dari kas transaksi jika ada
    const latestKasBbm = await dbQuerySingle<{ tanggal: string }>(
      `SELECT tanggal FROM kas_transaksi
       WHERE kendaraan_id = $1 AND (kategori = 'bbm' OR kategori ILIKE '%bbm%')
       ORDER BY tanggal DESC, created_at DESC
       LIMIT 1`,
      [kendaraanId]
    );
    if (latestKasBbm?.tanggal) {
      await syncBbmToKendaraanLogInternal(kendaraanId, latestKasBbm.tanggal);
    }

    // 3. Cari odometer tertinggi dari log harian
    const latestOdoRes = await dbQuerySingle<{ max_odo: number }>(
      `SELECT GREATEST(
         MAX(COALESCE(odometer_basecamp_in, 0)),
         MAX(COALESCE(odometer_basecamp_out, 0))
       ) AS max_odo
       FROM kendaraan_log_harian
       WHERE kendaraan_id = $1`,
      [kendaraanId]
    );
    const latestOdo = latestOdoRes?.max_odo ? Number(latestOdoRes.max_odo) : null;

    // 4. Cari log BBM terakhir berdasarkan tanggal dan waktu pembuatan
    const latestBbmLog = await dbQuerySingle<KendaraanLogHarian>(
      `SELECT * FROM kendaraan_log_harian
       WHERE kendaraan_id = $1 
         AND ((bbm_nominal IS NOT NULL AND bbm_nominal > 0) OR (bbm_liter IS NOT NULL AND bbm_liter > 0))
       ORDER BY tanggal DESC, created_at DESC
       LIMIT 1`,
      [kendaraanId]
    );

    let bbmTanggal: string | null = null;
    let bbmNominal: number | null = null;
    let bbmJenis: string | null = null;
    let bbmLiter: number | null = null;

    if (latestBbmLog) {
      bbmTanggal = latestBbmLog.tanggal;
      bbmNominal = latestBbmLog.bbm_nominal ? Number(latestBbmLog.bbm_nominal) : null;
      bbmJenis = latestBbmLog.bbm_jenis || 'pertalite';
      bbmLiter = latestBbmLog.bbm_liter ? Number(latestBbmLog.bbm_liter) : null;

      // Jika liter belum terisi tetapi nominal ada, hitung otomatis dan simpan ke log
      if ((!bbmLiter || bbmLiter <= 0) && bbmNominal && bbmNominal > 0) {
        const hargaRow = await dbQuerySingle<HargaBBM>(
          'SELECT harga_per_liter FROM harga_bbm WHERE jenis = $1',
          [bbmJenis]
        );
        const price = hargaRow?.harga_per_liter || (bbmJenis === 'pertamax' ? 12950 : 10000);
        bbmLiter = parseFloat((bbmNominal / price).toFixed(2));

        await dbQuery(
          `UPDATE kendaraan_log_harian 
           SET bbm_liter = $1, bbm_jenis = COALESCE(bbm_jenis, $2)
           WHERE id = $3`,
          [bbmLiter, bbmJenis, latestBbmLog.id]
        );
      }
    }

    // 5. Update kendaraan_status dengan data riil terkini
    await dbQuery(
      `UPDATE kendaraan_status 
       SET 
         odometer_terkini = CASE 
           WHEN $1::bigint IS NOT NULL THEN GREATEST(COALESCE(odometer_terkini, 0), $1::bigint)
           ELSE odometer_terkini
         END,
         bensin_tanggal_terakhir = $2,
         bensin_jenis_terakhir = $3,
         bensin_nominal_terakhir = $4,
         bensin_liter_terakhir = $5,
         updated_at = NOW()
       WHERE kendaraan_id = $6`,
      [latestOdo, bbmTanggal, bbmJenis, bbmNominal, bbmLiter, kendaraanId]
    );

    cacheInvalidate('master_kendaraan*');
    cacheInvalidate('kendaraan*');
    cacheInvalidate('dashboard*');
  } catch (err) {
    console.error(`Error syncing status for kendaraan ${kendaraanId}:`, err);
  }
}

/**
 * Sinkronisasi status semua armada aktif
 */
export async function syncAllKendaraanStatus(): Promise<void> {
  try {
    const list = await dbQuery<{ id: string }>('SELECT id FROM kendaraan');
    for (const v of list) {
      await syncKendaraanStatus(v.id);
    }
  } catch (err) {
    console.error('Error syncing all kendaraan status:', err);
  }
}

/**
 * Menambah atau memperbarui log harian / trip armada kendaraan
 */
export async function upsertKendaraanLog(
  log: Partial<KendaraanLogHarian> & { kendaraan_id: string; tanggal: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const outKm = log.odometer_basecamp_out !== undefined && log.odometer_basecamp_out !== null && !isNaN(Number(log.odometer_basecamp_out))
      ? Number(log.odometer_basecamp_out)
      : null;
    const inKm = log.odometer_basecamp_in !== undefined && log.odometer_basecamp_in !== null && !isNaN(Number(log.odometer_basecamp_in))
      ? Number(log.odometer_basecamp_in)
      : null;

    let jarakTempuh: number | null = null;
    if (outKm !== null && inKm !== null && inKm > outKm) {
      jarakTempuh = inKm - outKm;
    } else {
      const currKm = inKm !== null ? inKm : outKm;
      if (currKm !== null) {
        // Look up previous latest log for this vehicle before or on this date
        const prevLog = await dbQuerySingle<{ odo: number }>(`
          SELECT COALESCE(odometer_basecamp_in, odometer_basecamp_out) AS odo
          FROM kendaraan_log_harian
          WHERE kendaraan_id = $1 
            AND (tanggal < $2 OR (tanggal = $2 AND id != $3))
            AND COALESCE(odometer_basecamp_in, odometer_basecamp_out) IS NOT NULL
            AND COALESCE(odometer_basecamp_in, odometer_basecamp_out) <= $4
          ORDER BY tanggal DESC, created_at DESC
          LIMIT 1
        `, [log.kendaraan_id, log.tanggal, log.id || '00000000-0000-0000-0000-000000000000', currKm]);

        if (prevLog && prevLog.odo !== null && currKm > prevLog.odo) {
          jarakTempuh = currKm - prevLog.odo;
        } else {
          jarakTempuh = 0;
        }
      }
    }

    let bbmLiter = log.bbm_liter !== undefined && log.bbm_liter !== null && !isNaN(Number(log.bbm_liter))
      ? Number(log.bbm_liter)
      : null;
    let bbmNominal = log.bbm_nominal !== undefined && log.bbm_nominal !== null && !isNaN(Number(log.bbm_nominal))
      ? Number(log.bbm_nominal)
      : null;
    let bbmJenis = log.bbm_jenis || null;

    // Cegah BBM terhapus saat user hanya menginput/mengedit odometer log
    if (bbmNominal === null && bbmLiter === null) {
      if (log.id) {
        const existing = await dbQuerySingle<KendaraanLogHarian>(
          'SELECT bbm_nominal, bbm_liter, bbm_jenis, catatan FROM kendaraan_log_harian WHERE id = $1',
          [log.id]
        );
        if (existing?.bbm_nominal) {
          bbmNominal = Number(existing.bbm_nominal);
          bbmLiter = existing.bbm_liter ? Number(existing.bbm_liter) : null;
          bbmJenis = existing.bbm_jenis || 'pertalite';
        }
      }

      if (bbmNominal === null) {
        const kasBbm = await dbQuerySingle<{ total_nominal: number; keterangan: string }>(
          `SELECT COALESCE(SUM(nominal), 0)::integer AS total_nominal, STRING_AGG(keterangan, '; ') AS keterangan
           FROM kas_transaksi
           WHERE kendaraan_id = $1 AND tanggal = $2 AND (kategori = 'bbm' OR kategori ILIKE '%bbm%')`,
          [log.kendaraan_id, log.tanggal]
        );
        if (kasBbm && kasBbm.total_nominal > 0) {
          bbmNominal = kasBbm.total_nominal;
          const ketLower = (kasBbm.keterangan || '').toLowerCase();
          if (ketLower.includes('pertamax')) bbmJenis = 'pertamax';
          else if (ketLower.includes('solar') || ketLower.includes('dexlite')) bbmJenis = 'solar';
          else bbmJenis = 'pertalite';

          const hargaRow = await dbQuerySingle<HargaBBM>(
            'SELECT harga_per_liter FROM harga_bbm WHERE jenis = $1',
            [bbmJenis]
          );
          const price = hargaRow?.harga_per_liter || (bbmJenis === 'pertamax' ? 12950 : 10000);
          bbmLiter = parseFloat((bbmNominal / price).toFixed(2));
        }
      }
    }

    // Otomatisasi kalkulasi liter BBM dan jenis default jika nominal diinput
    if (bbmNominal && bbmNominal > 0) {
      if (!bbmJenis) {
        bbmJenis = 'pertalite';
      }
      if (!bbmLiter || bbmLiter <= 0) {
        const hargaRow = await dbQuerySingle<HargaBBM>(
          'SELECT harga_per_liter FROM harga_bbm WHERE jenis = $1',
          [bbmJenis]
        );
        const price = hargaRow?.harga_per_liter || (bbmJenis === 'pertamax' ? 12950 : 10000);
        bbmLiter = parseFloat((bbmNominal / price).toFixed(2));
      }
    }

    const tanggalAkhir = log.tanggal_akhir || null;
    const catatan = log.catatan || null;

    let savedId: string | undefined = log.id;

    if (log.id) {
      // Update by ID dengan COALESCE agar bbm tidak terhapus jika null
      await dbQuery(
        `UPDATE kendaraan_log_harian 
         SET 
           kendaraan_id = $1,
           tanggal = $2,
           tanggal_akhir = $3,
           odometer_basecamp_out = $4,
           odometer_basecamp_in = $5,
           jarak_tempuh = $6,
           bbm_liter = COALESCE($7, bbm_liter),
           bbm_nominal = COALESCE($8, bbm_nominal),
           bbm_jenis = COALESCE($9, bbm_jenis),
           catatan = COALESCE($10, catatan),
           updated_at = NOW()
         WHERE id = $11`,
        [
          log.kendaraan_id,
          log.tanggal,
          tanggalAkhir,
          outKm,
          inKm,
          jarakTempuh,
          bbmLiter,
          bbmNominal,
          bbmJenis,
          catatan,
          log.id,
        ]
      );
    } else {
      // Insert new log with ON CONFLICT resolution
      const res = await dbQuerySingle<{ id: string }>(
        `INSERT INTO kendaraan_log_harian (
          kendaraan_id, tanggal, tanggal_akhir, odometer_basecamp_out, odometer_basecamp_in, jarak_tempuh, bbm_liter, bbm_nominal, bbm_jenis, catatan
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (kendaraan_id, tanggal) DO UPDATE
        SET 
          tanggal_akhir = COALESCE(EXCLUDED.tanggal_akhir, kendaraan_log_harian.tanggal_akhir),
          odometer_basecamp_out = COALESCE(EXCLUDED.odometer_basecamp_out, kendaraan_log_harian.odometer_basecamp_out),
          odometer_basecamp_in = COALESCE(EXCLUDED.odometer_basecamp_in, kendaraan_log_harian.odometer_basecamp_in),
          jarak_tempuh = COALESCE(EXCLUDED.jarak_tempuh, kendaraan_log_harian.jarak_tempuh),
          bbm_liter = COALESCE(EXCLUDED.bbm_liter, kendaraan_log_harian.bbm_liter),
          bbm_nominal = COALESCE(EXCLUDED.bbm_nominal, kendaraan_log_harian.bbm_nominal),
          bbm_jenis = COALESCE(EXCLUDED.bbm_jenis, kendaraan_log_harian.bbm_jenis),
          catatan = COALESCE(EXCLUDED.catatan, kendaraan_log_harian.catatan),
          updated_at = NOW()
        RETURNING id`,
        [
          log.kendaraan_id,
          log.tanggal,
          tanggalAkhir,
          outKm,
          inKm,
          jarakTempuh,
          bbmLiter,
          bbmNominal,
          bbmJenis,
          catatan,
        ]
      );
      savedId = res?.id;
    }

    // Sinkronisasi status riil armada (odometer & BBM terkini)
    await syncKendaraanStatus(log.kendaraan_id);

    safeRevalidatePath(`/kendaraan/${log.kendaraan_id}`);
    safeRevalidatePath('/kendaraan');
    safeRevalidatePath('/dashboard');

    return { success: true, id: savedId };
  } catch (err: any) {
    console.error('Error upserting kendaraan log:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Aksi cepat untuk menginput Odometer Basecamp In pada trip yang sedang berjalan
 */
export async function quickInputBasecampIn(
  logId: string,
  inKm: number,
  tanggalAkhir?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await dbQuerySingle<KendaraanLogHarian>(
      'SELECT * FROM kendaraan_log_harian WHERE id = $1',
      [logId]
    );

    if (!existing) {
      return { success: false, error: 'Data log tidak ditemukan' };
    }

    const outKm = existing.odometer_basecamp_out;
    let jarakTempuh: number | null = null;
    if (outKm !== null && inKm >= outKm) {
      jarakTempuh = inKm - outKm;
    }

    await dbQuery(
      `UPDATE kendaraan_log_harian 
       SET 
         odometer_basecamp_in = $1,
         tanggal_akhir = COALESCE($2, tanggal_akhir, tanggal),
         jarak_tempuh = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [inKm, tanggalAkhir || null, jarakTempuh, logId]
    );

    await syncKendaraanStatus(existing.kendaraan_id);

    safeRevalidatePath(`/kendaraan/${existing.kendaraan_id}`);
    safeRevalidatePath('/kendaraan');
    safeRevalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Error quick input basecamp in:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Menghapus log harian kendaraan
 */
export async function deleteKendaraanLog(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const log = await dbQuerySingle<{ kendaraan_id: string }>(
      'SELECT kendaraan_id FROM kendaraan_log_harian WHERE id = $1',
      [id]
    );

    await dbQuery('DELETE FROM kendaraan_log_harian WHERE id = $1', [id]);

    if (log?.kendaraan_id) {
      await syncKendaraanStatus(log.kendaraan_id);
      safeRevalidatePath(`/kendaraan/${log.kendaraan_id}`);
    }
    safeRevalidatePath('/kendaraan');
    safeRevalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting kendaraan log:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Rekap Performa & Efisiensi BBM 100% Real-Time
 * Dihitung langsung dari log harian dan pengisian BBM riil tanpa data tiruan / mock fallback.
 */
export async function getKendaraanPerformanceStats(
  kendaraanId: string,
  periode: 'weekly' | 'monthly' | 'all' = 'weekly',
  customRange?: { startDate: string; endDate: string }
): Promise<{
  totalJarakKm: number;
  totalTripSelesai: number;
  totalTripBerjalan: number;
  totalBiayaBBM: number;
  totalLiterBBM: number;
  rasioEfisiensi: number; // km / L
  konsumsiPerKm: number;  // L / km
  konsumsiPer100Km: number; // L / 100km
  biayaPerKm: number;     // Rp / km
}> {
  try {
    let fromDate: string | null = null;
    let toDate: string | null = null;

    if (customRange?.startDate && customRange?.endDate) {
      fromDate = customRange.startDate;
      toDate = customRange.endDate;
    } else if (periode === 'weekly') {
      fromDate = addDaysToDateStr(getTodayDateString(), -7);
    } else if (periode === 'monthly') {
      fromDate = addDaysToDateStr(getTodayDateString(), -30);
    }

    let logQuery = 'SELECT * FROM kendaraan_log_harian WHERE kendaraan_id = $1';
    const logParams: any[] = [kendaraanId];

    if (fromDate) {
      logParams.push(fromDate);
      logQuery += ` AND tanggal >= $${logParams.length}`;
    }
    if (toDate) {
      logParams.push(toDate);
      logQuery += ` AND tanggal <= $${logParams.length}`;
    }

    const logs = await dbQuery<KendaraanLogHarian>(logQuery, logParams);

    // Sort chronologically ascending to accurately measure distance across periodic checkpoints & trips
    logs.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    let totalJarakKm = 0;
    let totalTripSelesai = 0;
    let totalTripBerjalan = 0;
    let totalLiterFromLogs = 0;
    let totalBiayaFromLogs = 0;
    let lastKnownOdo: number | null = null;

    for (const l of logs) {
      const outKm = l.odometer_basecamp_out;
      const inKm = l.odometer_basecamp_in;
      const currOdo = inKm !== null ? inKm : outKm;
      let effectiveJarak = 0;

      if (outKm !== null && inKm !== null && inKm > outKm) {
        effectiveJarak = inKm - outKm;
        totalTripSelesai += 1;
        lastKnownOdo = inKm;
      } else if (currOdo !== null) {
        if (lastKnownOdo !== null && currOdo > lastKnownOdo) {
          effectiveJarak = currOdo - lastKnownOdo;
          totalTripSelesai += 1;
          lastKnownOdo = currOdo;
        } else if (lastKnownOdo === null) {
          lastKnownOdo = currOdo;
          totalTripSelesai += 1; // Baseline reading
        } else {
          totalTripSelesai += 1;
        }
      } else if (outKm !== null && inKm === null) {
        totalTripBerjalan += 1;
      }

      totalJarakKm += effectiveJarak;

      if (l.bbm_liter && Number(l.bbm_liter) > 0) {
        totalLiterFromLogs += Number(l.bbm_liter);
      }
      if (l.bbm_nominal && Number(l.bbm_nominal) > 0) {
        totalBiayaFromLogs += Number(l.bbm_nominal);
      }
    }

    // Also query kas_transaksi BBM records matching this vehicle name/plate if not recorded in logs
    const v = await dbQuerySingle<{ nama_kendaraan: string; plat_nomor: string }>(
      'SELECT nama_kendaraan, plat_nomor FROM kendaraan WHERE id = $1',
      [kendaraanId]
    );

    let totalBiayaFromKas = 0;
    let totalLiterFromKas = 0;

    if (v) {
      let kasQuery = `
        SELECT nominal, keterangan FROM kas_transaksi 
        WHERE kategori = 'bbm' AND tipe = 'pengeluaran'
      `;
      const kasParams: any[] = [];

      if (fromDate) {
        kasParams.push(fromDate);
        kasQuery += ` AND tanggal >= $${kasParams.length}`;
      }
      if (toDate) {
        kasParams.push(toDate);
        kasQuery += ` AND tanggal <= $${kasParams.length}`;
      }

      const kasRows = await dbQuery<{ nominal: number; keterangan: string }>(kasQuery, kasParams);
      const searchTerms = [v.nama_kendaraan.toLowerCase(), v.plat_nomor.toLowerCase().replace(/\s+/g, '')];

      for (const row of kasRows) {
        const ket = (row.keterangan || '').toLowerCase().replace(/\s+/g, '');
        const matches = searchTerms.some((t) => ket.includes(t.replace(/\s+/g, '')));
        if (matches) {
          totalBiayaFromKas += Number(row.nominal) || 0;
          // Extract liter if written in description e.g. "15L" or estimate at Rp 10,000 / L
          const literMatch = row.keterangan?.match(/(\d+(\.\d+)?)\s*l(iter)?/i);
          if (literMatch && literMatch[1]) {
            totalLiterFromKas += parseFloat(literMatch[1]);
          } else {
            totalLiterFromKas += (Number(row.nominal) || 0) / 10000;
          }
        }
      }
    }

    // Combine BBM from logs and kas (prioritizing logs, or sum if mutually exclusive)
    const totalBiayaBBM = Math.max(totalBiayaFromLogs, totalBiayaFromKas);
    const totalLiterBBM = parseFloat(Math.max(totalLiterFromLogs, totalLiterFromKas).toFixed(2));

    const rasioEfisiensi = totalLiterBBM > 0 ? parseFloat((totalJarakKm / totalLiterBBM).toFixed(2)) : 0;
    const konsumsiPerKm = totalJarakKm > 0 ? parseFloat((totalLiterBBM / totalJarakKm).toFixed(4)) : 0;
    const konsumsiPer100Km = totalJarakKm > 0 ? parseFloat(((totalLiterBBM / totalJarakKm) * 100).toFixed(2)) : 0;
    const biayaPerKm = totalJarakKm > 0 ? Math.round(totalBiayaBBM / totalJarakKm) : 0;

    return {
      totalJarakKm,
      totalTripSelesai,
      totalTripBerjalan,
      totalBiayaBBM,
      totalLiterBBM,
      rasioEfisiensi,
      konsumsiPerKm,
      konsumsiPer100Km,
      biayaPerKm,
    };
  } catch (e) {
    console.error('Error calculating real kendaraan performance stats:', e);
    return {
      totalJarakKm: 0,
      totalTripSelesai: 0,
      totalTripBerjalan: 0,
      totalBiayaBBM: 0,
      totalLiterBBM: 0,
      rasioEfisiensi: 0,
      konsumsiPerKm: 0,
      konsumsiPer100Km: 0,
      biayaPerKm: 0,
    };
  }
}

/**
 * Memperbarui Odometer Basecamp Log
 */
export async function updateOdometerBasecampLog(
  kendaraanId: string,
  tanggal: string,
  outKm?: number,
  inKm?: number,
  totalSlotSelesai?: number
): Promise<{ success: boolean; error?: string }> {
  return upsertKendaraanLog({
    kendaraan_id: kendaraanId,
    tanggal,
    odometer_basecamp_out: outKm,
    odometer_basecamp_in: inKm,
    total_slot_selesai: totalSlotSelesai,
  });
}

/**
 * Update Servis Oli
 */
export async function updateOliKendaraan(
  kendaraanId: string,
  tanggal: string,
  km: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery(
      `UPDATE kendaraan_status 
       SET oli_tanggal_terakhir = $1, oli_km_terakhir = $2, odometer_terkini = GREATEST(COALESCE(odometer_terkini, 0), $2), updated_at = NOW() 
       WHERE kendaraan_id = $3`,
      [tanggal, km, kendaraanId]
    );

    cacheInvalidate('master_kendaraan*');
    cacheInvalidate('kendaraan*');
    cacheInvalidate('dashboard*');

    safeRevalidatePath(`/kendaraan/${kendaraanId}`);
    safeRevalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Tambah Riwayat Pergantian Ban
 */
export async function addBanHistory(
  banData: Partial<KendaraanBan>
): Promise<{ success: boolean; error?: string }> {
  try {
    const keys = Object.keys(banData).filter((k) => (banData as any)[k] !== undefined);
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((k) => (banData as any)[k]);

    await dbQuery(`INSERT INTO kendaraan_ban (${cols}) VALUES (${placeholders})`, values);

    cacheInvalidate('master_kendaraan*');
    cacheInvalidate('kendaraan*');

    safeRevalidatePath(`/kendaraan/${banData.kendaraan_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update Tanggal Cuci Mobil
 */
export async function updateCuciMobil(
  kendaraanId: string,
  tanggal: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery(
      'UPDATE kendaraan_status SET cuci_tanggal_terakhir = $1, updated_at = NOW() WHERE kendaraan_id = $2',
      [tanggal, kendaraanId]
    );

    cacheInvalidate('master_kendaraan*');
    cacheInvalidate('kendaraan*');

    safeRevalidatePath(`/kendaraan/${kendaraanId}`);
    safeRevalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Catat Pengisian BBM Mobil & Sinkronisasi Otomatis ke Kas Pengeluaran
 */
export async function recordPengisianBBM(
  kendaraanId: string,
  tanggal: string,
  jenisBbm: string,
  nominal: number,
  hargaPerLiter: number,
  jenisPembayaran: 'tunai' | 'non_tunai' = 'tunai',
  catatKeKas: boolean = true
): Promise<{ success: boolean; liter?: number; error?: string }> {
  try {
    const liter = parseFloat((nominal / (hargaPerLiter || 10000)).toFixed(2));

    const v = await dbQuerySingle<{ nama_kendaraan: string; plat_nomor: string }>(
      'SELECT nama_kendaraan, plat_nomor FROM kendaraan WHERE id = $1',
      [kendaraanId]
    );
    const vName = v ? `${v.nama_kendaraan} (${v.plat_nomor})` : 'Kendaraan Operasional';

    if (catatKeKas) {
      await dbQuery(
        `INSERT INTO kas_transaksi (tanggal, tipe, kategori, keterangan, nominal, jenis_pembayaran, pic_tipe, pic_nama, sumber_otomatis, kendaraan_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          tanggal,
          'pengeluaran',
          'bbm',
          `Isi BBM ${jenisBbm.toUpperCase()} ${liter}L - ${vName}`,
          nominal,
          jenisPembayaran,
          'admin',
          'Fleet Admin',
          true,
          kendaraanId,
        ]
      );
    }

    // Record in log harian as bbm record
    await dbQuery(
      `INSERT INTO kendaraan_log_harian (kendaraan_id, tanggal, bbm_liter, bbm_nominal, bbm_jenis, catatan)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (kendaraan_id, tanggal) DO UPDATE
       SET 
         bbm_liter = COALESCE(EXCLUDED.bbm_liter, kendaraan_log_harian.bbm_liter),
         bbm_nominal = COALESCE(EXCLUDED.bbm_nominal, kendaraan_log_harian.bbm_nominal),
         bbm_jenis = COALESCE(EXCLUDED.bbm_jenis, kendaraan_log_harian.bbm_jenis),
         catatan = COALESCE(EXCLUDED.catatan, kendaraan_log_harian.catatan),
         updated_at = NOW()`,
      [kendaraanId, tanggal, liter, nominal, jenisBbm, `Pengisian BBM ${jenisBbm.toUpperCase()} ${liter}L`]
    );

    // Sync status armada secara komprehensif
    await syncKendaraanStatus(kendaraanId);

    cacheInvalidate('kas*');
    safeRevalidatePath(`/kendaraan/${kendaraanId}`);
    safeRevalidatePath('/kendaraan');
    safeRevalidatePath('/kas');
    safeRevalidatePath('/kas/cashflow');
    return { success: true, liter };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

