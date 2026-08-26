'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { Paket, Promosi, Jabatan, Staff, StatusPembayaranMaster, SlotWaktu, Kendaraan } from '@/types/database';
import { revalidatePath } from 'next/cache';

// --- PAKET ACTIONS ---
export async function getPaketList(): Promise<Paket[]> {
  const cached = cacheGet<Paket[]>('master_paket_list');
  if (cached && cached.length > 0) return cached;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('paket')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) {
      cacheSet('master_paket_list', data as Paket[], 180);
      return data as Paket[];
    }
  } catch (e) {
    console.error('Error fetching paket:', e);
  }
  return [];
}

export async function upsertPaket(paket: Partial<Paket>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('paket').upsert(paket);
    if (error) return { success: false, error: error.message };

    cacheInvalidate('master_paket*');
    cacheInvalidate('dashboard*');

    revalidatePath('/master-data/paket');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- PROMOSI ACTIONS ---
export async function getPromosiList(): Promise<Promosi[]> {
  const cached = cacheGet<Promosi[]>('master_promosi_list');
  if (cached && cached.length > 0) return cached;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('promosi')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      cacheSet('master_promosi_list', data as Promosi[], 180);
      return data as Promosi[];
    }
  } catch (e) {
    console.error('Error fetching promosi:', e);
  }
  return [];
}

export async function upsertPromosi(promosi: Partial<Promosi>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('promosi').upsert(promosi);
    if (error) return { success: false, error: error.message };

    cacheInvalidate('master_promosi*');

    revalidatePath('/master-data/promosi');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePromosi(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('promosi').delete().eq('id', id);
    if (error) return { success: false, error: error.message };

    cacheInvalidate('master_promosi*');

    revalidatePath('/master-data/promosi');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- JABATAN ACTIONS ---
export async function getJabatanList(): Promise<Jabatan[]> {
  const cached = cacheGet<Jabatan[]>('master_jabatan_list');
  if (cached && cached.length > 0) return cached;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('jabatan')
      .select('*')
      .order('nama_jabatan', { ascending: true });
    
    if (!error && data && data.length > 0) {
      cacheSet('master_jabatan_list', data as Jabatan[], 300);
      return data as Jabatan[];
    }

    // If table is empty, auto-seed default master Jabatan
    const defaultJabatan = [
      { nama_jabatan: 'Owner', deskripsi: 'Pemilik Usaha Amanah Drive' },
      { nama_jabatan: 'Manager', deskripsi: 'Manajer Operasional' },
      { nama_jabatan: 'Instruktur', deskripsi: 'Pelatih Mengemudi' },
      { nama_jabatan: 'Admin', deskripsi: 'Administrator Sistem' },
      { nama_jabatan: 'SM Specialist', deskripsi: 'Social Media Specialist' },
      { nama_jabatan: 'Content Creator', deskripsi: 'Pembuat Konten' },
      { nama_jabatan: 'Fleet Officer', deskripsi: 'Petugas Perawatan Armada' },
    ];

    const { data: seeded } = await supabase.from('jabatan').insert(defaultJabatan).select();
    if (seeded && seeded.length > 0) {
      cacheSet('master_jabatan_list', seeded as Jabatan[], 300);
      return seeded as Jabatan[];
    }
  } catch (e) {
    console.error('Error fetching jabatan:', e);
  }
  return [];
}

export async function upsertJabatan(jabatan: Partial<Jabatan>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('jabatan').upsert(jabatan);
    if (error) return { success: false, error: error.message };

    cacheInvalidate('master_jabatan*');

    revalidatePath('/master-data/jabatan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- STAFF ACTIONS ---
export async function getStaffList(): Promise<Staff[]> {
  const cached = cacheGet<Staff[]>('master_staff_list');
  if (cached && cached.length > 0) return cached;

  try {
    const supabase = createAdminClient();
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*, staff_jabatan(jabatan(*))')
      .order('nama', { ascending: true });

    if (!staffError && staffData) {
      const mapped = staffData.map((st: any) => ({
        ...st,
        jabatan_list: st.staff_jabatan ? st.staff_jabatan.map((sj: any) => sj.jabatan) : [],
        hari_kerja: st.hari_kerja || ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'],
        slot_kerja: st.slot_kerja || ['sl1', 'sl2', 'sl3', 'sl4', 'sl5', 'sl6'],
        jadwal_ketersediaan: st.jadwal_ketersediaan || {},
      }));
      cacheSet('master_staff_list', mapped, 180);
      return mapped;
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
    const supabase = createAdminClient();

    // Clean relation columns but KEEP the table columns: hari_kerja, slot_kerja, jadwal_ketersediaan
    const {
      jabatan_list,
      staff_jabatan,
      ...cleanStaff
    } = staff as any;

    let savedStaff: any = null;

    if (cleanStaff.id) {
      const { data, error } = await supabase
        .from('staff')
        .update({
          ...cleanStaff,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cleanStaff.id)
        .select()
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      savedStaff = data;
    } else {
      const { data, error } = await supabase
        .from('staff')
        .insert(cleanStaff)
        .select()
        .maybeSingle();

      if (error || !data) return { success: false, error: error?.message || 'Gagal menyimpan data staff' };
      savedStaff = data;
    }

    // Update junction staff_jabatan
    if (savedStaff?.id) {
      await supabase.from('staff_jabatan').delete().eq('staff_id', savedStaff.id);
      if (jabatanIds && jabatanIds.length > 0) {
        const inserts = jabatanIds.map((jId) => ({
          staff_id: savedStaff.id,
          jabatan_id: jId,
        }));
        await supabase.from('staff_jabatan').insert(inserts);
      }
    }

    cacheInvalidate('master_staff*');
    cacheInvalidate('dashboard*');

    revalidatePath('/master-data/staff');
    revalidatePath('/jadwal');
    revalidatePath('/instruktur');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- SLOT WAKTU ACTIONS ---
export async function getSlotWaktuList(): Promise<SlotWaktu[]> {
  const cached = cacheGet<SlotWaktu[]>('master_slot_waktu_list');
  if (cached && cached.length > 0) return cached;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('slot_waktu')
      .select('*')
      .order('urutan', { ascending: true });
    if (!error && data) {
      cacheSet('master_slot_waktu_list', data as SlotWaktu[], 300);
      return data as SlotWaktu[];
    }
  } catch (e) {
    console.error('Error fetching slot_waktu:', e);
  }
  return [];
}

export async function upsertSlotWaktu(slot: Partial<SlotWaktu>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('slot_waktu').upsert(slot);
    if (error) return { success: false, error: error.message };

    cacheInvalidate('master_slot_waktu*');

    revalidatePath('/master-data/slot-waktu');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- STATUS PEMBAYARAN MASTER ACTIONS ---
export async function getStatusPembayaranMaster(): Promise<StatusPembayaranMaster[]> {
  const cached = cacheGet<StatusPembayaranMaster[]>('master_status_pembayaran');
  if (cached && cached.length > 0) return cached;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('status_pembayaran_master')
      .select('*')
      .order('urutan', { ascending: true });
    if (!error && data) {
      cacheSet('master_status_pembayaran', data as StatusPembayaranMaster[], 300);
      return data as StatusPembayaranMaster[];
    }
  } catch (e) {
    console.error('Error fetching status_pembayaran_master:', e);
  }
  return [];
}

// --- KENDARAAN MASTER ACTIONS ---
export async function getKendaraanMasterList(): Promise<Kendaraan[]> {
  const cached = cacheGet<Kendaraan[]>('master_kendaraan_list');
  if (cached && cached.length > 0) return cached;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('kendaraan')
      .select('*, status:kendaraan_status(*)')
      .order('nama_kendaraan', { ascending: true });
    if (!error && data) {
      cacheSet('master_kendaraan_list', data as Kendaraan[], 120);
      return data as Kendaraan[];
    }
  } catch (e) {
    console.error('Error fetching kendaraan master:', e);
  }
  return [];
}

export async function upsertKendaraanMaster(kendaraan: Partial<Kendaraan>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { status, created_at, updated_at, ...cleanData } = kendaraan as any;
    const { data: saved, error } = await supabase.from('kendaraan').upsert(cleanData).select().maybeSingle();
    if (error || !saved) return { success: false, error: error?.message || 'Gagal menyimpan kendaraan' };

    // Ensure status row exists (upsert to avoid duplicate key error on update)
    await supabase
      .from('kendaraan_status')
      .upsert({ kendaraan_id: saved.id }, { onConflict: 'kendaraan_id', ignoreDuplicates: true });

    cacheInvalidate('master_kendaraan*');
    cacheInvalidate('kendaraan*');
    cacheInvalidate('dashboard*');

    revalidatePath('/master-data/kendaraan');
    revalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteKendaraan(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('kendaraan').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    cacheInvalidate('master_kendaraan*');
    cacheInvalidate('kendaraan*');
    cacheInvalidate('dashboard*');

    revalidatePath('/master-data/kendaraan');
    revalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
