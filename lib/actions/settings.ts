'use server';

import { createServerClient } from '@/lib/supabase/server';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { revalidatePath } from 'next/cache';

export interface GeneralSettings {
  namaPerusahaan: string;
  kotaOperasional: string;
  waTemplate: string;
  pertalitePrice: number;
  pertamaxPrice: number;
}

const DEFAULT_WA_TEMPLATE =
  '• Minta share lokasi kepada klien sebelum berangkat.\n' +
  '• Laporan keluar Basecamp beserta foto odometer.\n' +
  '• Laporan saat sesi dimulai.\n' +
  '• Laporan saat sesi selesai.\n' +
  '• Laporan kembali ke Basecamp beserta foto odometer.';

const CACHE_KEY = 'general_settings';

/**
 * Fetch all general settings from database with in-memory caching
 */
export async function getGeneralSettings(): Promise<GeneralSettings> {
  const cached = cacheGet<GeneralSettings>(CACHE_KEY);
  if (cached) return cached;

  try {
    const supabase = await createServerClient();
    const { data } = await supabase.from('settings').select('key, value');

    const map: Record<string, string> = {};
    if (data) {
      data.forEach((row) => {
        map[row.key] = row.value;
      });
    }

    const result: GeneralSettings = {
      namaPerusahaan: map['nama_perusahaan'] || 'Amanah Drive',
      kotaOperasional: map['kota_operasional'] || 'Palembang',
      waTemplate: map['wa_footer_template'] || DEFAULT_WA_TEMPLATE,
      pertalitePrice: map['harga_bbm_pertalite'] ? Number(map['harga_bbm_pertalite']) : 10000,
      pertamaxPrice: map['harga_bbm_pertamax'] ? Number(map['harga_bbm_pertamax']) : 16300,
    };

    cacheSet(CACHE_KEY, result, 120);
    return result;
  } catch (e) {
    console.error('Error fetching general settings:', e);
    return {
      namaPerusahaan: 'Amanah Drive',
      kotaOperasional: 'Palembang',
      waTemplate: DEFAULT_WA_TEMPLATE,
      pertalitePrice: 10000,
      pertamaxPrice: 16300,
    };
  }
}

/**
 * Save single setting helper (upsert by key)
 */
async function upsertSetting(key: string, value: string, deskripsi?: string) {
  const supabase = await createServerClient();
  const { data: existing } = await supabase.from('settings').select('id').eq('key', key).maybeSingle();

  if (existing) {
    await supabase
      .from('settings')
      .update({
        value,
        deskripsi: deskripsi || key,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('settings').insert({
      key,
      value,
      deskripsi: deskripsi || key,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  cacheInvalidate(CACHE_KEY);
  cacheInvalidate('settings*');
}

/**
 * Save Company Profile
 */
export async function saveCompanyProfile(
  namaPerusahaan: string,
  kotaOperasional: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await upsertSetting('nama_perusahaan', namaPerusahaan, 'Nama Perusahaan Kursus');
    await upsertSetting('kota_operasional', kotaOperasional, 'Kota Wilayah Operasional');

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving company profile:', err);
    return { success: false, error: err.message || 'Gagal menyimpan profil usaha' };
  }
}

/**
 * Save SOP WhatsApp Template
 */
export async function saveSopTemplate(
  templateText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await upsertSetting('wa_footer_template', templateText, 'Template Standar Operasional Sesi WA');

    revalidatePath('/settings');
    revalidatePath('/jadwal');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving SOP template:', err);
    return { success: false, error: err.message || 'Gagal menyimpan template SOP' };
  }
}

/**
 * Save BBM Prices
 */
export async function saveBbmPrices(
  pertalite: number,
  pertamax: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await upsertSetting('harga_bbm_pertalite', pertalite.toString(), 'Harga BBM Pertalite per Liter');
    await upsertSetting('harga_bbm_pertamax', pertamax.toString(), 'Harga BBM Pertamax per Liter');

    revalidatePath('/settings');
    revalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving BBM prices:', err);
    return { success: false, error: err.message || 'Gagal menyimpan harga BBM' };
  }
}
