'use server';

import { createServerClient } from '@/lib/supabase/server';
import { JadwalSesi } from '@/types/database';
import { revalidatePath } from 'next/cache';
import {
  generateWhatsAppJadwalMarkdown,
  generateWhatsAppWeeklyScheduleMarkdown,
  generateWhatsAppRecapMarkdown,
  InstrukturJadwalGroup,
  sortSesiBySlotUrutan,
} from '../utils/whatsapp-markdown';

export async function getJadwalByTanggal(
  tanggal: string,
  staffId?: string
): Promise<JadwalSesi[]> {
  try {
    const supabase = await createServerClient();
    let query = supabase
      .from('jadwal_sesi')
      .select(
        '*, siswa(*), instruktur:staff(*), kendaraan(*), slot_waktu:slot_waktu!slot_waktu_id(*), slot_waktu_akhir:slot_waktu!slot_waktu_id_akhir(*)'
      )
      .eq('tanggal_sesi', tanggal);

    if (staffId && staffId !== 'semua') {
      query = query.eq('staff_id', staffId);
    }

    const { data, error } = await query;
    if (!error && data) return data as JadwalSesi[];
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
    const supabase = await createServerClient();
    const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('jadwal_sesi')
      .select(
        '*, siswa(*), instruktur:staff(*), kendaraan(*), slot_waktu:slot_waktu!slot_waktu_id(*)'
      )
      .gte('tanggal_sesi', startDate)
      .lte('tanggal_sesi', endDate);

    if (!error && data) return data as JadwalSesi[];
  } catch (e) {
    console.error('Error fetching jadwal by month:', e);
  }
  return [];
}

export async function getJadwalSesiById(id: string): Promise<JadwalSesi | null> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('jadwal_sesi')
      .select(
        '*, siswa(*), instruktur:staff(*), kendaraan(*), slot_waktu:slot_waktu!slot_waktu_id(*), slot_waktu_akhir:slot_waktu!slot_waktu_id_akhir(*)'
      )
      .eq('id', id)
      .single();

    if (!error && data) return data as JadwalSesi;
  } catch (e) {
    console.error('Error fetching jadwal by id:', e);
  }
  return null;
}

export async function getJadwalBySiswa(siswaId: string): Promise<JadwalSesi[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('jadwal_sesi')
      .select(
        '*, siswa(*), instruktur:staff(*), kendaraan(*), slot_waktu:slot_waktu!slot_waktu_id(*), slot_waktu_akhir:slot_waktu!slot_waktu_id_akhir(*)'
      )
      .eq('siswa_id', siswaId)
      .order('nomor_sesi_ke', { ascending: true });

    if (!error && data) return data as JadwalSesi[];
  } catch (e) {
    console.error('Error fetching schedules by student:', e);
  }
  return [];
}

export async function getJadwalConflictCheckList(): Promise<JadwalSesi[]> {
  try {
    const supabase = await createServerClient();
    // Limit to a 120-day window (30 past + 90 future) for performance — avoids full table scan
    const today = new Date();
    const past = new Date(today); past.setDate(today.getDate() - 30);
    const future = new Date(today); future.setDate(today.getDate() + 90);
    const pastStr = past.toISOString().slice(0, 10);
    const futureStr = future.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('jadwal_sesi')
      .select(
        'id, siswa_id, staff_id, tanggal_sesi, slot_waktu_id, slot_waktu_id_akhir, status_sesi, nomor_sesi_ke, total_sesi_paket, siswa(id, nama, kode_siswa), instruktur:staff(id, nama), slot_waktu:slot_waktu!slot_waktu_id(id, nama_slot, jam_mulai, jam_selesai)'
      )
      .neq('status_sesi', 'batal')
      .gte('tanggal_sesi', pastStr)
      .lte('tanggal_sesi', futureStr);

    if (!error && data) return data as unknown as JadwalSesi[];
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
    const supabase = await createServerClient();

    // Fetch the session first to get siswa_id for complete path revalidation
    const { data: existing } = await supabase
      .from('jadwal_sesi')
      .select('siswa_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('jadwal_sesi')
      .update({
        status_sesi,
        catatan_sesi: catatan_sesi || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    // Full cross-section revalidation for progress sync
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
    const supabase = await createServerClient();

    // Clean joined objects from payload
    const {
      siswa,
      instruktur,
      slot_waktu,
      kendaraan,
      slot_waktu_akhir,
      ...cleanPayload
    } = jadwal as any;

    if (cleanPayload.id) {
      // Use UPDATE for existing IDs to avoid NOT NULL constraint errors on omitted columns
      const { data: saved, error } = await supabase
        .from('jadwal_sesi')
        .update(cleanPayload)
        .eq('id', cleanPayload.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      revalidatePath('/jadwal');
      revalidatePath(`/jadwal/${cleanPayload.id}`);
      return { success: true, data: saved as JadwalSesi };
    } else {
      // Use INSERT for new records
      const { data: saved, error } = await supabase
        .from('jadwal_sesi')
        .insert(cleanPayload)
        .select()
        .single();

      if (error || !saved) return { success: false, error: error?.message || 'Gagal menyimpan jadwal' };
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
    const supabase = await createServerClient();
    const cleanList = jadwalList.map((item: any) => {
      const { siswa, instruktur, slot_waktu, kendaraan, slot_waktu_akhir, ...clean } = item;
      return clean;
    });

    const { error } = await supabase.from('jadwal_sesi').insert(cleanList);
    if (error) return { success: false, error: error.message };

    revalidatePath('/jadwal');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateSesiProgress(
  siswaId: string,
  nomorSesiKe: number,
  tanggalSesi: string,
  statusSesi: 'selesai' | 'batal' | 'terjadwal'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();

    // Fetch siswa data for accurate defaults (no hardcoding)
    const { data: siswaRecord } = await supabase
      .from('siswa')
      .select('paket(jumlah_sesi)')
      .eq('id', siswaId)
      .single();

    const totalSesiPaket = (siswaRecord?.paket as any)?.jumlah_sesi || 10;

    const { data: existing } = await supabase
      .from('jadwal_sesi')
      .select('id')
      .eq('siswa_id', siswaId)
      .eq('nomor_sesi_ke', nomorSesiKe)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('jadwal_sesi')
        .update({
          tanggal_sesi: tanggalSesi,
          status_sesi: statusSesi,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) return { success: false, error: error.message };
    } else {
      // Use data from siswa record, not hardcoded defaults
      const { error } = await supabase.from('jadwal_sesi').insert({
        siswa_id: siswaId,
        nomor_sesi_ke: nomorSesiKe,
        tanggal_sesi: tanggalSesi,
        status_sesi: statusSesi,
        total_sesi_paket: totalSesiPaket,
        jenis_mobil: 'manual',
      });
      if (error) return { success: false, error: error.message };
    }

    // Full sync revalidation
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

export async function deleteJadwalSesi(
  id: string,
  siswaId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    let query = supabase.from('jadwal_sesi').delete();
    if (siswaId) {
      query = query.eq('siswa_id', siswaId);
    } else {
      query = query.eq('id', id);
    }
    const { error } = await query;

    if (error) return { success: false, error: error.message };

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
  const jadwalList = await getJadwalByTanggal(tanggalStr, staffId);
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
    const supabase = await createServerClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'wa_footer_template')
      .single();
    if (data?.value) footerTemplate = data.value;
  } catch (e) {}

  return generateWhatsAppJadwalMarkdown(tanggalStr, groupedData, footerTemplate);
}

export async function generateWhatsAppWeeklyScheduleText(
  startDateStr: string,
  endDateStr: string,
  staffId?: string
): Promise<string> {
  try {
    const supabase = await createServerClient();
    let query = supabase
      .from('jadwal_sesi')
      .select(
        '*, siswa(*), instruktur:staff(*), kendaraan(*), slot_waktu:slot_waktu!slot_waktu_id(*), slot_waktu_akhir:slot_waktu!slot_waktu_id_akhir(*)'
      )
      .gte('tanggal_sesi', startDateStr)
      .lte('tanggal_sesi', endDateStr)
      .neq('status_sesi', 'batal')
      .order('tanggal_sesi', { ascending: true });

    if (staffId && staffId !== 'semua') {
      query = query.eq('staff_id', staffId);
    }

    const { data: list, error } = await query;
    if (error || !list) return 'Gagal memuat jadwal mingguan';

    // Group by date
    const dateMap = new Map<string, JadwalSesi[]>();
    list.forEach((s) => {
      const tgl = s.tanggal_sesi;
      if (!dateMap.has(tgl)) dateMap.set(tgl, []);
      dateMap.get(tgl)!.push(s as JadwalSesi);
    });

    const daysData: { tanggal: string; groups: InstrukturJadwalGroup[] }[] = [];

    // Iterate through date range
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
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'wa_footer_template')
        .single();
      if (data?.value) footerTemplate = data.value;
    } catch (e) {}

    return generateWhatsAppWeeklyScheduleMarkdown(startDateStr, endDateStr, daysData, footerTemplate);
  } catch (err: any) {
    return 'Terjadi kesalahan saat membuat format WA mingguan';
  }
}

export async function generateWhatsAppRecapText(
  tanggalStr: string,
  staffId?: string
): Promise<string> {
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

  return generateWhatsAppRecapMarkdown(tanggalStr, groupedData);
}

