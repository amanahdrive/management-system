'use server';

import { createServerClient } from '@/lib/supabase/server';
import { JadwalSesi } from '@/types/database';
import { revalidatePath } from 'next/cache';
import { generateWhatsAppJadwalMarkdown, InstrukturJadwalGroup } from '../utils/whatsapp-markdown';

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

export async function upsertJadwalSesi(
  jadwal: Partial<JadwalSesi>
): Promise<{ success: boolean; data?: JadwalSesi; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: saved, error } = await supabase
      .from('jadwal_sesi')
      .upsert(jadwal)
      .select()
      .single();

    if (error || !saved) return { success: false, error: error?.message || 'Gagal menyimpan jadwal' };

    revalidatePath('/jadwal');
    revalidatePath(`/jadwal/${saved.id}`);
    revalidatePath('/dashboard');

    return { success: true, data: saved as JadwalSesi };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteJadwalSesi(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('jadwal_sesi').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/jadwal');
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
    sesiList: g.list,
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
