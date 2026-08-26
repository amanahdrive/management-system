'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { revalidatePath } from 'next/cache';
import { RekeningBank } from '@/types/database';

export const DEFAULT_REKENING_LIST: RekeningBank[] = [
  {
    id: 'rek-bca-1',
    nama_bank: 'BCA',
    nomor_rekening: '8535441234',
    atas_nama: 'PT Amanah Drive Palembang',
    aktif: true,
    is_utama: true,
    keterangan: 'Rekening Utama Operasional & Pemasukan Kursus',
  },
  {
    id: 'rek-mandiri-1',
    nama_bank: 'Mandiri',
    nomor_rekening: '1130018899123',
    atas_nama: 'Amanah Drive',
    aktif: true,
    is_utama: false,
    keterangan: 'Rekening Penerimaan Mandiri',
  },
  {
    id: 'rek-bri-1',
    nama_bank: 'BRI',
    nomor_rekening: '005901002345531',
    atas_nama: 'Amanah Drive',
    aktif: true,
    is_utama: false,
    keterangan: 'Rekening Operasional BRI',
  },
  {
    id: 'rek-bsi-1',
    nama_bank: 'BSI',
    nomor_rekening: '7188991234',
    atas_nama: 'Amanah Drive',
    aktif: true,
    is_utama: false,
    keterangan: 'Rekening Syariah BSI',
  },
];

const REKENING_CACHE_KEY = 'rekening_bank_list';

/**
 * Fetch all company bank accounts from settings with in-memory caching
 */
export async function getRekeningList(): Promise<RekeningBank[]> {
  const cached = cacheGet<RekeningBank[]>(REKENING_CACHE_KEY);
  if (cached && cached.length > 0) return cached;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'rekening_bank_list')
      .maybeSingle();

    if (error || !data || !data.value) {
      cacheSet(REKENING_CACHE_KEY, DEFAULT_REKENING_LIST, 120);
      return DEFAULT_REKENING_LIST;
    }

    const parsed = JSON.parse(data.value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      cacheSet(REKENING_CACHE_KEY, parsed, 120);
      return parsed;
    }

    cacheSet(REKENING_CACHE_KEY, DEFAULT_REKENING_LIST, 120);
    return DEFAULT_REKENING_LIST;
  } catch (err) {
    console.error('Error in getRekeningList:', err);
    return DEFAULT_REKENING_LIST;
  }
}

/**
 * Fetch only active company bank accounts (for transaction forms and dropdowns)
 */
export async function getActiveRekeningList(): Promise<RekeningBank[]> {
  const all = await getRekeningList();
  return all.filter((r) => r.aktif);
}

/**
 * Save / replace entire list of bank accounts
 */
export async function saveRekeningList(
  list: RekeningBank[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const jsonStr = JSON.stringify(list);

    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'rekening_bank_list')
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('settings')
        .update({
          value: jsonStr,
          deskripsi: 'Daftar Rekening Bank Perusahaan',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);
    } else {
      await supabase.from('settings').insert({
        key: 'rekening_bank_list',
        value: jsonStr,
        deskripsi: 'Daftar Rekening Bank Perusahaan',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Instantly update cache and invalidate related paths
    cacheSet(REKENING_CACHE_KEY, list, 120);
    cacheInvalidate('settings*');

    revalidatePath('/settings');
    revalidatePath('/kas');
    revalidatePath('/finance');
    revalidatePath('/nota');
    return { success: true };
  } catch (err: any) {
    console.error('Error in saveRekeningList:', err);
    return { success: false, error: err.message || 'Gagal menyimpan rekening' };
  }
}

/**
 * Add a new bank account
 */
export async function addRekening(
  item: Omit<RekeningBank, 'id'>
): Promise<{ success: boolean; data?: RekeningBank; error?: string }> {
  try {
    const current = await getRekeningList();
    const newRekening: RekeningBank = {
      ...item,
      id: `rek-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };

    // If marked as utama, remove utama from other accounts
    const updatedList: RekeningBank[] = item.is_utama
      ? [...current.map((r) => ({ ...r, is_utama: false })), newRekening]
      : [...current, newRekening];

    const res = await saveRekeningList(updatedList);
    if (!res.success) return { success: false, error: res.error };
    return { success: true, data: newRekening };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menambah rekening' };
  }
}

/**
 * Update an existing bank account
 */
export async function updateRekening(
  id: string,
  updates: Partial<RekeningBank>
): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getRekeningList();
    let updatedList: RekeningBank[] = current.map((r) => (r.id === id ? { ...r, ...updates } : r));

    if (updates.is_utama) {
      updatedList = updatedList.map((r) => (r.id === id ? { ...r, is_utama: true } : { ...r, is_utama: false }));
    }

    return await saveRekeningList(updatedList);
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengubah rekening' };
  }
}

/**
 * Delete a bank account
 */
export async function deleteRekening(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getRekeningList();
    const updatedList = current.filter((r) => r.id !== id);
    return await saveRekeningList(updatedList);
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal menghapus rekening' };
  }
}
