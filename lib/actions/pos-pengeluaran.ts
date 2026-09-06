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
 * Generator Otomatis Pos Pengeluaran untuk suatu bulan (Idempotent):
 * 1. Siswa SIM Siap Terbit (Lunas tapi SIM belum selesai) -> Modal SIM
 * 2. Cicilan Hutang Berjalan -> Hutang aktif dengan jatuh tempo bulan berjalan
 * 3. Pos Operasional Rutin: Token Listrik (200k), WiFi (300k), Air PDAM (100k fluktuatif)
 */
export async function generatePosOtomatisBulanIni(
  periodeBulan: string
): Promise<{ success: boolean; createdCount: number; message: string }> {
  try {
    let createdCount = 0;

    const [simSettings, opSettings] = await Promise.all([
      getModalSimSettings(),
      getOperasionalSettings(),
    ]);

    // -------------------------------------------------------------
    // 1. SISWA SIM SIAP TERBIT (LUNAS + SIM BELUM)
    // -------------------------------------------------------------
    const siswaSiapTerbit = await dbQuery<{
      id: string;
      nama: string;
      nama_paket: string;
      tanggal_booking: string;
    }>(
      `SELECT s.id, s.nama, p.nama_paket, s.tanggal_booking 
       FROM siswa s
       JOIN paket p ON s.paket_id = p.id
       WHERE p.termasuk_sim = TRUE 
         AND s.status_pembayaran_kode = 'lunas' 
         AND s.status_sim = 'belum'
         AND (s.is_archived = FALSE OR s.is_archived IS NULL)`
    );

    for (const s of siswaSiapTerbit || []) {
      // Cek apakah pos untuk siswa ini sudah pernah digenerate
      const existing = await dbQuerySingle<{ id: string }>(
        `SELECT id FROM pos_pengeluaran 
         WHERE siswa_id = $1 AND sumber = 'otomatis_sim' AND status != 'dibatalkan'`,
        [s.id]
      );

      if (!existing) {
        const jenis = s.nama_paket?.toLowerCase().includes('sim c') ? 'SIM C' : 'SIM A';
        const modalPrice =
          simSettings.configPerJenis?.[jenis] ||
          simSettings.configPerJenis?.['default'] ||
          simSettings.hargaDefault ||
          850000;

        await dbQuery(
          `INSERT INTO pos_pengeluaran (
            nama_pos, kategori, nominal_estimasi, nominal_realisasi, 
            is_fluktuatif, sumber, periode_bulan, tanggal_jatuh_tempo, 
            status, siswa_id, catatan, created_at, updated_at
          ) VALUES ($1, $2, $3, 0, FALSE, 'otomatis_sim', $4, $5, 'belum_bayar', $6, $7, NOW(), NOW())`,
          [
            `Modal SIM - ${s.nama} (${jenis})`,
            'sim',
            modalPrice,
            periodeBulan,
            s.tanggal_booking || getTodayDateString(),
            s.id,
            `Otomatis dari Siswa Siap Terbit (${s.nama_paket})`,
          ]
        );
        createdCount++;
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
         WHERE hutang_id = $1 AND periode_bulan = $2 AND status != 'dibatalkan'`,
        [h.id, periodeBulan]
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
    // 3. OPERASIONAL RUTIN: TOKEN, WIFI, AIR
    // -------------------------------------------------------------
    // A. Token Listrik
    const existingToken = await dbQuerySingle<{ id: string }>(
      `SELECT id FROM pos_pengeluaran 
       WHERE sumber = 'otomatis_operasional' 
         AND periode_bulan = $1 
         AND nama_pos LIKE 'Tagihan Token Listrik%' 
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
       WHERE sumber = 'otomatis_operasional' 
         AND periode_bulan = $1 
         AND nama_pos LIKE 'Tagihan WiFi Kantor%' 
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
       WHERE sumber = 'otomatis_operasional' 
         AND periode_bulan = $1 
         AND nama_pos LIKE 'Tagihan Air PDAM%' 
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

    return {
      success: true,
      createdCount,
      message: `Berhasil memeriksa dan menambahkan ${createdCount} pos pengeluaran baru untuk periode ${periodeBulan}.`,
    };
  } catch (err: any) {
    console.error('Error generating automatic pos pengeluaran:', err);
    return {
      success: false,
      createdCount: 0,
      message: err.message || 'Gagal membuat pos otomatis',
    };
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
}

/**
 * Eksekusi Pembayaran Pos Pengeluaran:
 * - Catat mutasi pengeluaran ke kas_transaksi
 * - Hubungkan kas_transaksi_id ke pos_pengeluaran dan update status menjadi 'terbayar'
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

    const newTxId = txRows[0].id;

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
    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');

    safeRevalidate('/kas/pos');
    safeRevalidate('/kas');
    safeRevalidate('/kas/cashflow');
    safeRevalidate('/kas/hutang');
    safeRevalidate('/finance');

    return { success: true };
  } catch (err: any) {
    console.error('Error paying pos pengeluaran:', err);
    return { success: false, error: err.message || 'Gagal memproses pembayaran pos' };
  }
}
