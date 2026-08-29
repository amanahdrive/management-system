'use server';

import { dbQuery, dbQuerySingle } from '@/lib/db';
import { Insiden, StatusPenangananEnum } from '@/types/database';
import { revalidatePath } from 'next/cache';
import { formatHariTanggalIndo, getTodayDateString } from '../utils/date';
import { formatRupiah } from '../utils/currency';

export interface InsidenFilter {
  status?: string;
  kategori?: string;
  tingkatKeparahan?: string;
  startDate?: string;
  endDate?: string;
  kendaraanId?: string;
  staffId?: string;
  siswaId?: string;
  search?: string;
}

export async function getInsidenList(filter?: InsidenFilter): Promise<Insiden[]> {
  try {
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filter?.status && filter.status !== 'semua') {
      params.push(filter.status);
      whereClauses.push(`i.status_penanganan = $${params.length}`);
    }
    if (filter?.kategori && filter.kategori !== 'semua') {
      params.push(filter.kategori);
      whereClauses.push(`i.kategori = $${params.length}`);
    }
    if (filter?.tingkatKeparahan && filter.tingkatKeparahan !== 'semua') {
      params.push(filter.tingkatKeparahan);
      whereClauses.push(`i.tingkat_keparahan = $${params.length}`);
    }
    if (filter?.kendaraanId && filter.kendaraanId !== 'semua') {
      params.push(filter.kendaraanId);
      whereClauses.push(`i.kendaraan_id = $${params.length}`);
    }
    if (filter?.staffId && filter.staffId !== 'semua') {
      params.push(filter.staffId);
      whereClauses.push(`i.staff_id = $${params.length}`);
    }
    if (filter?.startDate) {
      params.push(filter.startDate);
      whereClauses.push(`i.tanggal_insiden >= $${params.length}`);
    }
    if (filter?.endDate) {
      params.push(filter.endDate);
      whereClauses.push(`i.tanggal_insiden <= $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT 
        i.*,
        CASE WHEN k.id IS NOT NULL THEN to_jsonb(k) ELSE NULL END AS kendaraan,
        CASE WHEN st.id IS NOT NULL THEN to_jsonb(st) ELSE NULL END AS staff,
        CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS siswa,
        CASE WHEN js.id IS NOT NULL THEN to_jsonb(js) ELSE NULL END AS jadwal_sesi
      FROM insiden i
      LEFT JOIN kendaraan k ON i.kendaraan_id = k.id
      LEFT JOIN staff st ON i.staff_id = st.id
      LEFT JOIN siswa s ON i.siswa_id = s.id
      LEFT JOIN jadwal_sesi js ON i.jadwal_sesi_id = js.id
      ${whereSql}
      ORDER BY i.tanggal_insiden DESC, i.created_at DESC;
    `;

    let result = await dbQuery<Insiden>(sql, params);

    if (filter?.search && filter.search.trim() !== '') {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.kode_insiden?.toLowerCase().includes(q) ||
          item.lokasi_kejadian?.toLowerCase().includes(q) ||
          item.deskripsi_kejadian?.toLowerCase().includes(q) ||
          item.kendaraan?.nama_kendaraan?.toLowerCase().includes(q) ||
          item.kendaraan?.plat_nomor?.toLowerCase().includes(q) ||
          item.staff?.nama?.toLowerCase().includes(q) ||
          item.siswa?.nama?.toLowerCase().includes(q)
      );
    }

    return result;
  } catch (err) {
    console.error('Unexpected error fetching insiden list:', err);
    return [];
  }
}

export async function getInsidenById(id: string): Promise<Insiden | null> {
  try {
    const row = await dbQuerySingle<Insiden>(`
      SELECT 
        i.*,
        CASE WHEN k.id IS NOT NULL THEN to_jsonb(k) ELSE NULL END AS kendaraan,
        CASE WHEN st.id IS NOT NULL THEN to_jsonb(st) ELSE NULL END AS staff,
        CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS siswa,
        CASE WHEN js.id IS NOT NULL THEN to_jsonb(js) ELSE NULL END AS jadwal_sesi
      FROM insiden i
      LEFT JOIN kendaraan k ON i.kendaraan_id = k.id
      LEFT JOIN staff st ON i.staff_id = st.id
      LEFT JOIN siswa s ON i.siswa_id = s.id
      LEFT JOIN jadwal_sesi js ON i.jadwal_sesi_id = js.id
      WHERE i.id = $1;
    `, [id]);

    return row;
  } catch (err) {
    console.error('Unexpected error in getInsidenById:', err);
    return null;
  }
}

async function generateNextKodeInsiden(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `INS-${yearMonth}-`;

  const rows = await dbQuery<{ kode_insiden: string }>(
    `SELECT kode_insiden FROM insiden WHERE kode_insiden ILIKE $1 ORDER BY kode_insiden DESC LIMIT 1`,
    [`${prefix}%`]
  );

  if (!rows || rows.length === 0) {
    return `${prefix}001`;
  }

  const lastKode = rows[0].kode_insiden;
  const parts = lastKode.split('-');
  const seqStr = parts[parts.length - 1];
  const nextSeq = (parseInt(seqStr, 10) || 0) + 1;

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

export async function createInsiden(
  payload: Omit<Insiden, 'id' | 'kode_insiden' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: Insiden; error?: string }> {
  try {
    const kode_insiden = await generateNextKodeInsiden();

    const insertData: any = {
      ...payload,
      kode_insiden,
    };

    const keys = Object.keys(insertData).filter((k) => insertData[k] !== undefined);
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((k) => insertData[k]);

    const data = await dbQuerySingle<Insiden>(
      `INSERT INTO insiden (${cols}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    revalidatePath('/insiden');
    revalidatePath('/kendaraan');
    revalidatePath('/dashboard');

    return { success: true, data: data as Insiden };
  } catch (err: any) {
    console.error('Unexpected error in createInsiden:', err);
    return { success: false, error: err.message || 'Gagal menyimpan data insiden' };
  }
}

export async function updateInsiden(
  id: string,
  payload: Partial<Insiden>
): Promise<{ success: boolean; data?: Insiden; error?: string }> {
  try {
    const { kendaraan, staff, siswa, jadwal_sesi, ...cleanPayload } = payload as any;

    const keys = Object.keys(cleanPayload).filter((k) => k !== 'id' && cleanPayload[k] !== undefined);
    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = keys.map((k) => cleanPayload[k]);
    values.push(id);

    const data = await dbQuerySingle<Insiden>(
      `UPDATE insiden SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );

    revalidatePath('/insiden');
    revalidatePath('/kendaraan');
    revalidatePath('/dashboard');

    return { success: true, data: data as Insiden };
  } catch (err: any) {
    console.error('Unexpected error in updateInsiden:', err);
    return { success: false, error: err.message || 'Gagal memperbarui data insiden' };
  }
}

export async function updateInsidenStatus(
  id: string,
  status: StatusPenangananEnum,
  tindakanPenanganan?: string,
  biayaAktual?: number,
  catatKeKas?: boolean,
  jenisPembayaranKas: 'tunai' | 'non_tunai' = 'non_tunai'
): Promise<{ success: boolean; error?: string }> {
  try {
    const updatedInc = await dbQuerySingle<any>(
      `UPDATE insiden 
       SET status_penanganan = $1, 
           tindakan_penanganan = COALESCE($2, tindakan_penanganan), 
           biaya_aktual = COALESCE($3, biaya_aktual), 
           updated_at = NOW() 
       WHERE id = $4 
       RETURNING *`,
      [status, tindakanPenanganan ?? null, biayaAktual ?? null, id]
    );

    if (!updatedInc) {
      return { success: false, error: 'Insiden tidak ditemukan' };
    }

    if (catatKeKas && biayaAktual && biayaAktual > 0) {
      const v = await dbQuerySingle<{ plat_nomor: string }>('SELECT plat_nomor FROM kendaraan WHERE id = $1', [updatedInc.kendaraan_id]);
      const vPlat = v?.plat_nomor ? ` (${v.plat_nomor})` : '';

      await dbQuery(
        `INSERT INTO kas_transaksi (tanggal, tipe, kategori, keterangan, nominal, jenis_pembayaran, pic_tipe, pic_nama, sumber_otomatis)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          getTodayDateString(),
          'pengeluaran',
          'perbaikan_kendaraan',
          `Biaya Perbaikan Insiden ${updatedInc.kode_insiden}${vPlat} - ${updatedInc.lokasi_kejadian}`,
          biayaAktual,
          jenisPembayaranKas || 'non_tunai',
          'finance',
          'Finance Admin',
          true,
        ]
      );
    }

    revalidatePath('/insiden');
    revalidatePath('/kendaraan');
    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteInsiden(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery('DELETE FROM insiden WHERE id = $1', [id]);

    revalidatePath('/insiden');
    revalidatePath('/kendaraan');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getInsidenStats(): Promise<{
  totalInsiden: number;
  dalamPenanganan: number;
  selesai: number;
  totalEstimasiBiaya: number;
  totalBiayaAktual: number;
  kategoriCounts: Record<string, number>;
  keparahanCounts: Record<string, number>;
}> {
  try {
    const data = await dbQuery<{
      status_penanganan: string;
      kategori: string;
      tingkat_keparahan: string;
      estimasi_biaya: number;
      biaya_aktual: number;
    }>('SELECT status_penanganan, kategori, tingkat_keparahan, estimasi_biaya, biaya_aktual FROM insiden');

    let totalInsiden = data.length;
    let dalamPenanganan = 0;
    let selesai = 0;
    let totalEstimasiBiaya = 0;
    let totalBiayaAktual = 0;
    const kategoriCounts: Record<string, number> = {};
    const keparahanCounts: Record<string, number> = {};

    data.forEach((row) => {
      if (['selesai', 'klaim_asuransi'].includes(row.status_penanganan)) {
        selesai++;
      } else {
        dalamPenanganan++;
      }

      totalEstimasiBiaya += Number(row.estimasi_biaya || 0);
      totalBiayaAktual += Number(row.biaya_aktual || 0);

      const kat = row.kategori || 'lainnya';
      kategoriCounts[kat] = (kategoriCounts[kat] || 0) + 1;

      const kep = row.tingkat_keparahan || 'ringan';
      keparahanCounts[kep] = (keparahanCounts[kep] || 0) + 1;
    });

    return {
      totalInsiden,
      dalamPenanganan,
      selesai,
      totalEstimasiBiaya,
      totalBiayaAktual,
      kategoriCounts,
      keparahanCounts,
    };
  } catch (err) {
    return {
      totalInsiden: 0,
      dalamPenanganan: 0,
      selesai: 0,
      totalEstimasiBiaya: 0,
      totalBiayaAktual: 0,
      kategoriCounts: {},
      keparahanCounts: {},
    };
  }
}

export async function generateWhatsAppInsidenText(id: string): Promise<string> {
  const ins = await getInsidenById(id);
  if (!ins) return 'Data insiden tidak ditemukan';

  const tgl = formatHariTanggalIndo(ins.tanggal_insiden);
  const keparahanBadge =
    ins.tingkat_keparahan === 'kritis'
      ? '[KRITIS]'
      : ins.tingkat_keparahan === 'berat'
      ? '[BERAT]'
      : ins.tingkat_keparahan === 'sedang'
      ? '[SEDANG]'
      : '[RINGAN]';

  const statusLabel =
    ins.status_penanganan === 'selesai'
      ? '[SELESAI]'
      : ins.status_penanganan === 'klaim_asuransi'
      ? '[KLAIM ASURANSI]'
      : ins.status_penanganan === 'dalam_perbaikan'
      ? '[DALAM PERBAIKAN]'
      : ins.status_penanganan === 'dalam_investigasi'
      ? '[DALAM INVESTIGASI]'
      : '[DILAPORKAN]';

  let body = `*LAPORAN INSIDEN OPERASIONAL*\n`;
  body += `*Amanah Drive Palembang*\n`;
  body += `Kode: *${ins.kode_insiden}*\n`;
  body += `────────────────────────\n`;
  body += `Waktu: *${tgl}* pukul *${ins.jam_insiden || '08:00'} WIB*\n`;
  body += `Lokasi: *${ins.lokasi_kejadian}*\n`;
  body += `Tingkat Keparahan: *${keparahanBadge}*\n`;
  body += `Kategori: *${ins.kategori.toUpperCase().replace('_', ' ')}*\n`;
  body += `────────────────────────\n`;
  body += `Armada Mobil: *${ins.kendaraan?.nama_kendaraan || '-'}* (${ins.kendaraan?.plat_nomor || '-'})\n`;
  body += `Instruktur/Staff: *${ins.staff?.nama || '-'}*\n`;
  if (ins.siswa) {
    body += `Siswa Terlibat: *${ins.siswa.nama}* (${ins.siswa.kode_siswa})\n`;
  }
  body += `────────────────────────\n`;
  body += `*Deskripsi & Kronologi Kejadian:*\n`;
  body += `${ins.deskripsi_kejadian}\n\n`;

  if (ins.kondisi_kendaraan) {
    body += `*Kondisi Armada:* ${ins.kondisi_kendaraan}\n`;
  }
  if (ins.kondisi_pengemudi) {
    body += `*Kondisi Pengemudi/Siswa:* ${ins.kondisi_pengemudi}\n`;
  }

  body += `────────────────────────\n`;
  body += `Estimasi Biaya: *${formatRupiah(ins.estimasi_biaya || 0)}*\n`;
  if (ins.biaya_aktual && ins.biaya_aktual > 0) {
    body += `Biaya Aktual: *${formatRupiah(ins.biaya_aktual)}*\n`;
  }
  body += `Penanggung Biaya: *${ins.penanggung_biaya.toUpperCase().replace('_', ' ')}*\n`;
  body += `Status Penanganan: *${statusLabel}*\n`;

  if (ins.tindakan_penanganan) {
    body += `*Tindakan Penanganan:* ${ins.tindakan_penanganan}\n`;
  }

  if (ins.catatan) {
    body += `\n*Catatan:* ${ins.catatan}\n`;
  }

  body += `────────────────────────\n`;
  body += `_Laporan Sistem Manajemen Amanah Drive_`;

  return body;
}
