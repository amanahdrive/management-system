'use server';

import { dbQuery, dbQuerySingle } from '@/lib/db';
import { cacheInvalidate } from '@/lib/utils/cache';
import { JadwalSesi } from '@/types/database';
import { revalidatePath } from 'next/cache';
import {
  generateWhatsAppJadwalMarkdown,
  generateWhatsAppRangeScheduleMarkdown,
  generateWhatsAppRecapMarkdown,
  InstrukturJadwalGroup,
  sortSesiBySlotUrutan,
} from '../utils/whatsapp-markdown';
import { addDaysToDateStr, getTodayDateString } from '../utils/date';

export async function getJadwalByTanggal(
  tanggal: string,
  staffId?: string
): Promise<JadwalSesi[]> {
  try {
    const params: any[] = [tanggal];
    let staffFilter = '';
    if (staffId && staffId !== 'semua') {
      params.push(staffId);
      staffFilter = `AND js.staff_id = $${params.length}`;
    }

    const rows = await dbQuery<JadwalSesi>(`
      SELECT 
        js.*,
        CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS siswa,
        CASE WHEN st.id IS NOT NULL THEN to_jsonb(st) ELSE NULL END AS instruktur,
        CASE WHEN k.id IS NOT NULL THEN to_jsonb(k) ELSE NULL END AS kendaraan,
        CASE WHEN sw1.id IS NOT NULL THEN to_jsonb(sw1) ELSE NULL END AS slot_waktu,
        CASE WHEN sw2.id IS NOT NULL THEN to_jsonb(sw2) ELSE NULL END AS slot_waktu_akhir
      FROM jadwal_sesi js
      LEFT JOIN siswa s ON js.siswa_id = s.id
      LEFT JOIN staff st ON js.staff_id = st.id
      LEFT JOIN kendaraan k ON js.kendaraan_id = k.id
      LEFT JOIN slot_waktu sw1 ON js.slot_waktu_id = sw1.id
      LEFT JOIN slot_waktu sw2 ON js.slot_waktu_id_akhir = sw2.id
      WHERE js.tanggal_sesi::date = $1::date ${staffFilter}
      ORDER BY js.slot_waktu_id ASC;
    `, params);

    return rows;
  } catch (e) {
    console.error('Error fetching jadwal by tanggal:', e);
  }
  return [];
}

export async function getJadwalByBulan(
  year: number,
  monthIndex: number
): Promise<JadwalSesi[]> {
  try {
    const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const rows = await dbQuery<JadwalSesi>(`
      SELECT 
        js.*,
        CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS siswa,
        CASE WHEN st.id IS NOT NULL THEN to_jsonb(st) ELSE NULL END AS instruktur,
        CASE WHEN k.id IS NOT NULL THEN to_jsonb(k) ELSE NULL END AS kendaraan,
        CASE WHEN sw.id IS NOT NULL THEN to_jsonb(sw) ELSE NULL END AS slot_waktu
      FROM jadwal_sesi js
      LEFT JOIN siswa s ON js.siswa_id = s.id
      LEFT JOIN staff st ON js.staff_id = st.id
      LEFT JOIN kendaraan k ON js.kendaraan_id = k.id
      LEFT JOIN slot_waktu sw ON js.slot_waktu_id = sw.id
      WHERE js.tanggal_sesi >= $1 AND js.tanggal_sesi <= $2;
    `, [startDate, endDate]);

    return rows;
  } catch (e) {
    console.error('Error fetching jadwal by month:', e);
  }
  return [];
}

export async function getJadwalSesiById(id: string): Promise<JadwalSesi | null> {
  try {
    const row = await dbQuerySingle<JadwalSesi>(`
      SELECT 
        js.*,
        CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS siswa,
        CASE WHEN st.id IS NOT NULL THEN to_jsonb(st) ELSE NULL END AS instruktur,
        CASE WHEN k.id IS NOT NULL THEN to_jsonb(k) ELSE NULL END AS kendaraan,
        CASE WHEN sw1.id IS NOT NULL THEN to_jsonb(sw1) ELSE NULL END AS slot_waktu,
        CASE WHEN sw2.id IS NOT NULL THEN to_jsonb(sw2) ELSE NULL END AS slot_waktu_akhir
      FROM jadwal_sesi js
      LEFT JOIN siswa s ON js.siswa_id = s.id
      LEFT JOIN staff st ON js.staff_id = st.id
      LEFT JOIN kendaraan k ON js.kendaraan_id = k.id
      LEFT JOIN slot_waktu sw1 ON js.slot_waktu_id = sw1.id
      LEFT JOIN slot_waktu sw2 ON js.slot_waktu_id_akhir = sw2.id
      WHERE js.id = $1;
    `, [id]);

    return row;
  } catch (e) {
    console.error('Error fetching jadwal by id:', e);
  }
  return null;
}

export async function getJadwalBySiswa(siswaId: string): Promise<JadwalSesi[]> {
  try {
    const rows = await dbQuery<JadwalSesi>(`
      SELECT 
        js.*,
        CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS siswa,
        CASE WHEN st.id IS NOT NULL THEN to_jsonb(st) ELSE NULL END AS instruktur,
        CASE WHEN k.id IS NOT NULL THEN to_jsonb(k) ELSE NULL END AS kendaraan,
        CASE WHEN sw1.id IS NOT NULL THEN to_jsonb(sw1) ELSE NULL END AS slot_waktu,
        CASE WHEN sw2.id IS NOT NULL THEN to_jsonb(sw2) ELSE NULL END AS slot_waktu_akhir
      FROM jadwal_sesi js
      LEFT JOIN siswa s ON js.siswa_id = s.id
      LEFT JOIN staff st ON js.staff_id = st.id
      LEFT JOIN kendaraan k ON js.kendaraan_id = k.id
      LEFT JOIN slot_waktu sw1 ON js.slot_waktu_id = sw1.id
      LEFT JOIN slot_waktu sw2 ON js.slot_waktu_id_akhir = sw2.id
      WHERE js.siswa_id = $1
      ORDER BY js.nomor_sesi_ke ASC;
    `, [siswaId]);

    return rows;
  } catch (e) {
    console.error('Error fetching schedules by student:', e);
  }
  return [];
}

export async function getJadwalConflictCheckList(): Promise<JadwalSesi[]> {
  try {
    const todayStr = getTodayDateString();
    const pastStr = addDaysToDateStr(todayStr, -30);
    const futureStr = addDaysToDateStr(todayStr, 90);

    const rows = await dbQuery<JadwalSesi>(`
      SELECT 
        js.id, js.siswa_id, js.staff_id, js.tanggal_sesi, js.slot_waktu_id, js.slot_waktu_id_akhir, 
        js.status_sesi, js.nomor_sesi_ke, js.total_sesi_paket,
        CASE WHEN s.id IS NOT NULL THEN json_build_object('id', s.id, 'nama', s.nama, 'kode_siswa', s.kode_siswa) ELSE NULL END AS siswa,
        CASE WHEN st.id IS NOT NULL THEN json_build_object('id', st.id, 'nama', st.nama) ELSE NULL END AS instruktur,
        CASE WHEN sw.id IS NOT NULL THEN json_build_object('id', sw.id, 'nama_slot', sw.nama_slot, 'jam_mulai', sw.jam_mulai, 'jam_selesai', sw.jam_selesai) ELSE NULL END AS slot_waktu
      FROM jadwal_sesi js
      LEFT JOIN siswa s ON js.siswa_id = s.id
      LEFT JOIN staff st ON js.staff_id = st.id
      LEFT JOIN slot_waktu sw ON js.slot_waktu_id = sw.id
      WHERE js.status_sesi != 'batal' 
        AND js.tanggal_sesi >= $1 
        AND js.tanggal_sesi <= $2;
    `, [pastStr, futureStr]);

    return rows;
  } catch (e) {
    console.error('Error fetching conflict check list:', e);
  }
  return [];
}

export async function updateJadwalStatus(
  id: string,
  status_sesi: string,
  catatan_sesi?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await dbQuerySingle<{ siswa_id: string }>(
      'SELECT siswa_id FROM jadwal_sesi WHERE id = $1',
      [id]
    );

    await dbQuery(
      'UPDATE jadwal_sesi SET status_sesi = $1, catatan_sesi = $2, updated_at = NOW() WHERE id = $3',
      [status_sesi, catatan_sesi || null, id]
    );

    revalidatePath('/jadwal');
    revalidatePath('/instruktur');
    revalidatePath('/dashboard');
    revalidatePath('/siswa');
    if (existing?.siswa_id) {
      revalidatePath(`/jadwal/${existing.siswa_id}`);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function upsertJadwalSesi(
  jadwal: Partial<JadwalSesi>
): Promise<{ success: boolean; data?: JadwalSesi; error?: string }> {
  try {
    const {
      siswa,
      instruktur,
      slot_waktu,
      kendaraan,
      slot_waktu_akhir,
      ...cleanPayload
    } = jadwal as any;

    let saved: any = null;

    if (cleanPayload.id) {
      const keys = Object.keys(cleanPayload).filter((k) => k !== 'id' && cleanPayload[k] !== undefined);
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = keys.map((k) => cleanPayload[k]);
      values.push(cleanPayload.id);

      saved = await dbQuerySingle(
        `UPDATE jadwal_sesi SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values
      );
      revalidatePath('/jadwal');
      revalidatePath(`/jadwal/${cleanPayload.id}`);
      return { success: true, data: saved as JadwalSesi };
    } else {
      const keys = Object.keys(cleanPayload).filter((k) => cleanPayload[k] !== undefined);
      const cols = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => cleanPayload[k]);

      saved = await dbQuerySingle(
        `INSERT INTO jadwal_sesi (${cols}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      revalidatePath('/jadwal');
      return { success: true, data: saved as JadwalSesi };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function upsertJadwalBatch(
  jadwalList: Partial<JadwalSesi>[]
): Promise<{ success: boolean; error?: string }> {
  try {
    for (const item of jadwalList) {
      const { siswa, instruktur, slot_waktu, kendaraan, slot_waktu_akhir, ...clean } = item as any;
      const keys = Object.keys(clean).filter((k) => clean[k] !== undefined);
      const cols = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => clean[k]);

      await dbQuery(`INSERT INTO jadwal_sesi (${cols}) VALUES (${placeholders})`, values);
    }

    revalidatePath('/jadwal');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function bulkUpdateJadwalSesi(
  sessionIds: string[],
  updates: {
    staff_id?: string;
    status_sesi?: 'terjadwal' | 'selesai' | 'batal';
    slot_waktu_id?: string;
    slot_waktu_id_akhir?: string | null;
    tanggal_sesi?: string;
    catatan_sesi?: string;
  },
  siswaId?: string
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    if (!sessionIds || sessionIds.length === 0) {
      return { success: false, error: 'Tidak ada sesi yang dipilih untuk diperbarui' };
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    if (updates.staff_id !== undefined) {
      values.push(updates.staff_id);
      setClauses.push(`staff_id = $${values.length}`);
    }
    if (updates.status_sesi !== undefined) {
      values.push(updates.status_sesi);
      setClauses.push(`status_sesi = $${values.length}`);
    }
    if (updates.slot_waktu_id !== undefined) {
      values.push(updates.slot_waktu_id);
      setClauses.push(`slot_waktu_id = $${values.length}`);
    }
    if (updates.slot_waktu_id_akhir !== undefined) {
      values.push(updates.slot_waktu_id_akhir);
      setClauses.push(`slot_waktu_id_akhir = $${values.length}`);
    }
    if (updates.tanggal_sesi !== undefined) {
      values.push(updates.tanggal_sesi);
      setClauses.push(`tanggal_sesi = $${values.length}`);
    }
    if (updates.catatan_sesi !== undefined) {
      values.push(updates.catatan_sesi);
      setClauses.push(`catatan_sesi = $${values.length}`);
    }

    if (setClauses.length === 0) {
      return { success: false, error: 'Pilih setidaknya satu variabel untuk diperbarui' };
    }

    setClauses.push('updated_at = NOW()');

    values.push(sessionIds);
    const inClauseIndex = values.length;

    await dbQuery(
      `UPDATE jadwal_sesi 
       SET ${setClauses.join(', ')} 
       WHERE id = ANY($${inClauseIndex}::uuid[])`,
      values
    );

    revalidatePath('/jadwal');
    if (siswaId) {
      revalidatePath(`/jadwal/${siswaId}`);
    }
    revalidatePath('/instruktur');
    revalidatePath('/dashboard');
    revalidatePath('/siswa');

    return { success: true, count: sessionIds.length };
  } catch (err: any) {
    console.error('Error bulk updating jadwal sesi:', err);
    return { success: false, error: err.message || 'Gagal memperbarui jadwal sesi secara masal' };
  }
}

export async function updateSesiProgress(
  siswaId: string,
  nomorSesiKe: number,
  tanggalSesi: string,
  statusSesi: 'selesai' | 'batal' | 'terjadwal'
): Promise<{ success: boolean; error?: string }> {
  try {
    const siswaRecord = await dbQuerySingle<{ jumlah_sesi: number }>(`
      SELECT p.jumlah_sesi 
      FROM siswa s 
      LEFT JOIN paket p ON s.paket_id = p.id 
      WHERE s.id = $1
    `, [siswaId]);

    const totalSesiPaket = siswaRecord?.jumlah_sesi || 10;

    const existing = await dbQuerySingle<{ id: string }>(
      'SELECT id FROM jadwal_sesi WHERE siswa_id = $1 AND nomor_sesi_ke = $2',
      [siswaId, nomorSesiKe]
    );

    if (existing) {
      await dbQuery(
        'UPDATE jadwal_sesi SET tanggal_sesi = $1, status_sesi = $2, updated_at = NOW() WHERE id = $3',
        [tanggalSesi, statusSesi, existing.id]
      );
    } else {
      await dbQuery(
        `INSERT INTO jadwal_sesi (siswa_id, nomor_sesi_ke, tanggal_sesi, status_sesi, total_sesi_paket, jenis_mobil)
         VALUES ($1, $2, $3, $4, $5, 'manual')`,
        [siswaId, nomorSesiKe, tanggalSesi, statusSesi, totalSesiPaket]
      );
    }

    revalidatePath('/jadwal');
    revalidatePath(`/jadwal/${siswaId}`);
    revalidatePath('/instruktur');
    revalidatePath('/dashboard');
    revalidatePath('/siswa');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rescheduleSesiShiftCascade(
  siswaId: string,
  fromNomorSesiKe: number,
  shiftDays: number
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    if (!shiftDays || shiftDays <= 0) {
      return { success: false, error: 'Jumlah pergeseran hari harus minimal 1 hari' };
    }

    const sessions = await dbQuery<{ id: string; nomor_sesi_ke: number; tanggal_sesi: string }>(
      `SELECT id, nomor_sesi_ke, tanggal_sesi 
       FROM jadwal_sesi 
       WHERE siswa_id = $1 AND nomor_sesi_ke >= $2 AND status_sesi != 'selesai' 
       ORDER BY nomor_sesi_ke ASC`,
      [siswaId, fromNomorSesiKe]
    );

    if (!sessions || sessions.length === 0) {
      return { success: false, error: 'Tidak ada sesi yang ditemukan untuk di-reschedule' };
    }

    for (const sesi of sessions) {
      const newDate = addDaysToDateStr(sesi.tanggal_sesi, shiftDays);
      await dbQuery(
        "UPDATE jadwal_sesi SET tanggal_sesi = $1, status_sesi = 'terjadwal', updated_at = NOW() WHERE id = $2",
        [newDate, sesi.id]
      );
    }

    revalidatePath('/jadwal');
    revalidatePath(`/jadwal/${siswaId}`);
    revalidatePath('/instruktur');
    revalidatePath('/dashboard');
    revalidatePath('/siswa');

    return { success: true, count: sessions.length };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Terjadi kesalahan saat reschedule jadwal' };
  }
}

export async function deleteJadwalSesi(
  id: string,
  siswaId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (siswaId) {
      await dbQuery('DELETE FROM jadwal_sesi WHERE siswa_id = $1', [siswaId]);
    } else {
      await dbQuery('DELETE FROM jadwal_sesi WHERE id = $1', [id]);
    }

    revalidatePath('/jadwal');
    revalidatePath('/instruktur');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function generateWhatsAppScheduleText(
  tanggalStr: string,
  staffId?: string
): Promise<string> {
  let staffFilterNama: string | undefined;
  if (staffId && staffId !== 'semua') {
    const staffData = await dbQuerySingle<{ nama: string }>('SELECT nama FROM staff WHERE id = $1', [staffId]);
    if (staffData?.nama) staffFilterNama = staffData.nama;
  }

  const jadwalList = await getJadwalByTanggal(tanggalStr, staffId);
  // Hanya ambil siswa yang berstatus 'terjadwal' (abaikan sesi selesai dan batal)
  const activeSesi = jadwalList.filter((j) => j.status_sesi === 'terjadwal');

  const groupMap = new Map<string, { nama: string; list: JadwalSesi[] }>();

  activeSesi.forEach((sesi) => {
    const instNama = sesi.instruktur?.nama || 'Instruktur';
    const instId = sesi.staff_id;

    if (!groupMap.has(instId)) {
      groupMap.set(instId, { nama: instNama, list: [] });
    }
    groupMap.get(instId)!.list.push(sesi);
  });

  const groupedData: InstrukturJadwalGroup[] = Array.from(groupMap.values()).map((g) => ({
    instrukturNama: g.nama,
    sesiList: sortSesiBySlotUrutan(g.list),
  }));

  let footerTemplate: string | undefined;
  try {
    const setRow = await dbQuerySingle<{ value: string }>("SELECT value FROM settings WHERE key = 'wa_footer_template'");
    if (setRow?.value) footerTemplate = setRow.value;
  } catch (e) {}

  return generateWhatsAppJadwalMarkdown(tanggalStr, groupedData, footerTemplate, staffFilterNama);
}

export async function generateWhatsAppWeeklyScheduleText(
  startDateStr: string,
  endDateStr: string,
  staffId?: string
): Promise<string> {
  try {
    let staffFilterNama: string | undefined;
    const params: any[] = [startDateStr, endDateStr];
    let staffFilter = '';

    if (staffId && staffId !== 'semua') {
      const staffData = await dbQuerySingle<{ nama: string }>('SELECT nama FROM staff WHERE id = $1', [staffId]);
      if (staffData?.nama) staffFilterNama = staffData.nama;
      params.push(staffId);
      staffFilter = `AND js.staff_id = $${params.length}`;
    }

    const list = await dbQuery<JadwalSesi>(`
      SELECT 
        js.*,
        CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS siswa,
        CASE WHEN st.id IS NOT NULL THEN to_jsonb(st) ELSE NULL END AS instruktur,
        CASE WHEN k.id IS NOT NULL THEN to_jsonb(k) ELSE NULL END AS kendaraan,
        CASE WHEN sw1.id IS NOT NULL THEN to_jsonb(sw1) ELSE NULL END AS slot_waktu,
        CASE WHEN sw2.id IS NOT NULL THEN to_jsonb(sw2) ELSE NULL END AS slot_waktu_akhir
      FROM jadwal_sesi js
      LEFT JOIN siswa s ON js.siswa_id = s.id
      LEFT JOIN staff st ON js.staff_id = st.id
      LEFT JOIN kendaraan k ON js.kendaraan_id = k.id
      LEFT JOIN slot_waktu sw1 ON js.slot_waktu_id = sw1.id
      LEFT JOIN slot_waktu sw2 ON js.slot_waktu_id_akhir = sw2.id
      WHERE js.tanggal_sesi >= $1 AND js.tanggal_sesi <= $2 ${staffFilter}
      ORDER BY js.tanggal_sesi ASC;
    `, params);

    const dateMap = new Map<string, JadwalSesi[]>();
    list.forEach((s) => {
      const tgl = s.tanggal_sesi;
      if (!dateMap.has(tgl)) dateMap.set(tgl, []);
      dateMap.get(tgl)!.push(s);
    });

    const daysData: { tanggal: string; groups: InstrukturJadwalGroup[] }[] = [];

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const tglStr = d.toISOString().split('T')[0];
      const daySessions = dateMap.get(tglStr) || [];

      const instMap = new Map<string, { nama: string; list: JadwalSesi[] }>();
      daySessions.forEach((sesi) => {
        const instNama = sesi.instruktur?.nama || 'Instruktur';
        const instId = sesi.staff_id;
        if (!instMap.has(instId)) instMap.set(instId, { nama: instNama, list: [] });
        instMap.get(instId)!.list.push(sesi);
      });

      daysData.push({
        tanggal: tglStr,
        groups: Array.from(instMap.values()).map((g) => ({
          instrukturNama: g.nama,
          sesiList: sortSesiBySlotUrutan(g.list),
        })),
      });
    }

    let footerTemplate: string | undefined;
    try {
      const setRow = await dbQuerySingle<{ value: string }>("SELECT value FROM settings WHERE key = 'wa_footer_template'");
      if (setRow?.value) footerTemplate = setRow.value;
    } catch (e) {}

    return generateWhatsAppRangeScheduleMarkdown(
      startDateStr,
      endDateStr,
      daysData,
      true,
      staffFilterNama,
      footerTemplate
    );
  } catch (err: any) {
    return 'Terjadi kesalahan saat membuat format WA mingguan';
  }
}

export async function generateWhatsAppCustomRangeText(
  startDateStr: string,
  endDateStr: string,
  staffId?: string
): Promise<string> {
  try {
    let staffFilterNama: string | undefined;
    const params: any[] = [startDateStr, endDateStr];
    let staffFilter = '';

    if (staffId && staffId !== 'semua') {
      const staffData = await dbQuerySingle<{ nama: string }>('SELECT nama FROM staff WHERE id = $1', [staffId]);
      if (staffData?.nama) staffFilterNama = staffData.nama;
      params.push(staffId);
      staffFilter = `AND js.staff_id = $${params.length}`;
    }

    const list = await dbQuery<JadwalSesi>(`
      SELECT 
        js.*,
        CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS siswa,
        CASE WHEN st.id IS NOT NULL THEN to_jsonb(st) ELSE NULL END AS instruktur,
        CASE WHEN k.id IS NOT NULL THEN to_jsonb(k) ELSE NULL END AS kendaraan,
        CASE WHEN sw1.id IS NOT NULL THEN to_jsonb(sw1) ELSE NULL END AS slot_waktu,
        CASE WHEN sw2.id IS NOT NULL THEN to_jsonb(sw2) ELSE NULL END AS slot_waktu_akhir
      FROM jadwal_sesi js
      LEFT JOIN siswa s ON js.siswa_id = s.id
      LEFT JOIN staff st ON js.staff_id = st.id
      LEFT JOIN kendaraan k ON js.kendaraan_id = k.id
      LEFT JOIN slot_waktu sw1 ON js.slot_waktu_id = sw1.id
      LEFT JOIN slot_waktu sw2 ON js.slot_waktu_id_akhir = sw2.id
      WHERE js.tanggal_sesi >= $1 AND js.tanggal_sesi <= $2 ${staffFilter}
      ORDER BY js.tanggal_sesi ASC;
    `, params);

    const dateMap = new Map<string, JadwalSesi[]>();
    list.forEach((s) => {
      const tgl = s.tanggal_sesi;
      if (!dateMap.has(tgl)) dateMap.set(tgl, []);
      dateMap.get(tgl)!.push(s);
    });

    const daysData: { tanggal: string; groups: InstrukturJadwalGroup[] }[] = [];

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const tglStr = d.toISOString().split('T')[0];
      const daySessions = dateMap.get(tglStr) || [];

      const instMap = new Map<string, { nama: string; list: JadwalSesi[] }>();
      daySessions.forEach((sesi) => {
        const instNama = sesi.instruktur?.nama || 'Instruktur';
        const instId = sesi.staff_id;
        if (!instMap.has(instId)) instMap.set(instId, { nama: instNama, list: [] });
        instMap.get(instId)!.list.push(sesi);
      });

      daysData.push({
        tanggal: tglStr,
        groups: Array.from(instMap.values()).map((g) => ({
          instrukturNama: g.nama,
          sesiList: sortSesiBySlotUrutan(g.list),
        })),
      });
    }

    let footerTemplate: string | undefined;
    try {
      const setRow = await dbQuerySingle<{ value: string }>("SELECT value FROM settings WHERE key = 'wa_footer_template'");
      if (setRow?.value) footerTemplate = setRow.value;
    } catch (e) {}

    return generateWhatsAppRangeScheduleMarkdown(
      startDateStr,
      endDateStr,
      daysData,
      false,
      staffFilterNama,
      footerTemplate
    );
  } catch (err: any) {
    return 'Terjadi kesalahan saat membuat format WA rentang tanggal';
  }
}

export async function generateWhatsAppRecapText(
  tanggalStr: string,
  staffId?: string
): Promise<string> {
  let staffFilterNama: string | undefined;
  if (staffId && staffId !== 'semua') {
    const staffData = await dbQuerySingle<{ nama: string }>('SELECT nama FROM staff WHERE id = $1', [staffId]);
    if (staffData?.nama) staffFilterNama = staffData.nama;
  }

  const jadwalList = await getJadwalByTanggal(tanggalStr, staffId);

  const groupMap = new Map<string, { nama: string; list: JadwalSesi[] }>();
  jadwalList.forEach((sesi) => {
    const instNama = sesi.instruktur?.nama || 'Instruktur';
    const instId = sesi.staff_id;

    if (!groupMap.has(instId)) {
      groupMap.set(instId, { nama: instNama, list: [] });
    }
    groupMap.get(instId)!.list.push(sesi);
  });

  const groupedData: InstrukturJadwalGroup[] = Array.from(groupMap.values()).map((g) => ({
    instrukturNama: g.nama,
    sesiList: sortSesiBySlotUrutan(g.list),
  }));

  return generateWhatsAppRecapMarkdown(tanggalStr, groupedData, staffFilterNama);
}
