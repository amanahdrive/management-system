'use server';

import { createServerClient } from '@/lib/supabase/server';
import { Paket, Promosi, Jabatan, Staff, StatusPembayaranMaster, SlotWaktu, Kendaraan } from '@/types/database';
import { revalidatePath } from 'next/cache';

// --- PAKET ACTIONS ---
export async function getPaketList(): Promise<Paket[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('paket')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) return data as Paket[];
  } catch (e) {
    console.error('Error fetching paket:', e);
  }
  return [];
}

export async function upsertPaket(paket: Partial<Paket>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('paket').upsert(paket);
    if (error) return { success: false, error: error.message };
    revalidatePath('/master-data/paket');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- PROMOSI ACTIONS ---
export async function getPromosiList(): Promise<Promosi[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('promosi')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data as Promosi[];
  } catch (e) {
    console.error('Error fetching promosi:', e);
  }
  return [];
}

export async function upsertPromosi(promosi: Partial<Promosi>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('promosi').upsert(promosi);
    if (error) return { success: false, error: error.message };
    revalidatePath('/master-data/promosi');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- JABATAN ACTIONS ---
export async function getJabatanList(): Promise<Jabatan[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('jabatan')
      .select('*')
      .order('nama_jabatan', { ascending: true });
    if (!error && data) return data as Jabatan[];
  } catch (e) {
    console.error('Error fetching jabatan:', e);
  }
  return [];
}

export async function upsertJabatan(jabatan: Partial<Jabatan>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('jabatan').upsert(jabatan);
    if (error) return { success: false, error: error.message };
    revalidatePath('/master-data/jabatan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- STAFF ACTIONS ---
export async function getStaffList(): Promise<Staff[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('staff')
      .select('*, staff_jabatan(jabatan(*))')
      .order('nama', { ascending: true });

    if (!error && data) {
      return data.map((st: any) => ({
        ...st,
        jabatan_list: st.staff_jabatan ? st.staff_jabatan.map((sj: any) => sj.jabatan) : [],
      }));
    }
  } catch (e) {
    console.error('Error fetching staff:', e);
  }
  return [];
}

export async function getInstrukturList(): Promise<Staff[]> {
  const allStaff = await getStaffList();
  return allStaff.filter(
    (st) => st.aktif && st.jabatan_list?.some((j) => j.nama_jabatan === 'Instruktur')
  );
}

export async function upsertStaff(
  staff: Partial<Staff>,
  jabatanIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: savedStaff, error } = await supabase.from('staff').upsert(staff).select().single();
    if (error || !savedStaff) return { success: false, error: error?.message || 'Gagal menyimpan staff' };

    // Update junction staff_jabatan
    await supabase.from('staff_jabatan').delete().eq('staff_id', savedStaff.id);
    if (jabatanIds && jabatanIds.length > 0) {
      const inserts = jabatanIds.map((jId) => ({
        staff_id: savedStaff.id,
        jabatan_id: jId,
      }));
      await supabase.from('staff_jabatan').insert(inserts);
    }

    revalidatePath('/master-data/staff');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- SLOT WAKTU ACTIONS ---
export async function getSlotWaktuList(): Promise<SlotWaktu[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('slot_waktu')
      .select('*')
      .order('urutan', { ascending: true });
    if (!error && data) return data as SlotWaktu[];
  } catch (e) {
    console.error('Error fetching slot_waktu:', e);
  }
  return [];
}

export async function upsertSlotWaktu(slot: Partial<SlotWaktu>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('slot_waktu').upsert(slot);
    if (error) return { success: false, error: error.message };
    revalidatePath('/master-data/slot-waktu');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- STATUS PEMBAYARAN MASTER ACTIONS ---
export async function getStatusPembayaranMaster(): Promise<StatusPembayaranMaster[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('status_pembayaran_master')
      .select('*')
      .order('urutan', { ascending: true });
    if (!error && data) return data as StatusPembayaranMaster[];
  } catch (e) {
    console.error('Error fetching status_pembayaran_master:', e);
  }
  return [];
}

// --- KENDARAAN MASTER ACTIONS ---
export async function getKendaraanMasterList(): Promise<Kendaraan[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('kendaraan')
      .select('*, status:kendaraan_status(*)')
      .order('nama_kendaraan', { ascending: true });
    if (!error && data) return data as Kendaraan[];
  } catch (e) {
    console.error('Error fetching kendaraan master:', e);
  }
  return [];
}

export async function upsertKendaraanMaster(kendaraan: Partial<Kendaraan>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: saved, error } = await supabase.from('kendaraan').upsert(kendaraan).select().single();
    if (error || !saved) return { success: false, error: error?.message || 'Gagal menyimpan kendaraan' };

    // Ensure status row exists
    await supabase.from('kendaraan_status').insert({ kendaraan_id: saved.id }).single();

    revalidatePath('/master-data/kendaraan');
    revalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteKendaraan(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('kendaraan').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/master-data/kendaraan');
    revalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
