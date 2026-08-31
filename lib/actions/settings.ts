'use server';

import { dbQuery } from '@/lib/db';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { revalidatePath } from 'next/cache';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Suppressed in non-request contexts
  }
}

export interface GeneralSettings {
  namaPerusahaan: string;
  kotaOperasional: string;
  waTemplate: string;
  pertalitePrice: number;
  pertamaxPrice: number;
  gajiInstrukturOperasional: number;
  gajiInstrukturPribadi: number;
  uangMakanInstrukturHarian: number;
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
    const rows = await dbQuery<{ key: string; value: string }>('SELECT key, value FROM settings');

    const map: Record<string, string> = {};
    if (rows) {
      rows.forEach((row) => {
        map[row.key] = row.value;
      });
    }

    const result: GeneralSettings = {
      namaPerusahaan: map['nama_perusahaan'] || 'Amanah Drive',
      kotaOperasional: map['kota_operasional'] || 'Palembang',
      waTemplate: map['wa_footer_template'] || DEFAULT_WA_TEMPLATE,
      pertalitePrice: map['harga_bbm_pertalite'] ? Number(map['harga_bbm_pertalite']) : 10000,
      pertamaxPrice: map['harga_bbm_pertamax'] ? Number(map['harga_bbm_pertamax']) : 16300,
      gajiInstrukturOperasional: map['gaji_instruktur_operasional']
        ? Number(map['gaji_instruktur_operasional'])
        : 50000,
      gajiInstrukturPribadi: map['gaji_instruktur_pribadi']
        ? Number(map['gaji_instruktur_pribadi'])
        : 70000,
      uangMakanInstrukturHarian: map['uang_makan_instruktur_harian']
        ? Number(map['uang_makan_instruktur_harian'])
        : 15000,
    };

    cacheSet(CACHE_KEY, result, 60);
    return result;
  } catch (e) {
    console.error('Error fetching general settings:', e);
    return {
      namaPerusahaan: 'Amanah Drive',
      kotaOperasional: 'Palembang',
      waTemplate: DEFAULT_WA_TEMPLATE,
      pertalitePrice: 10000,
      pertamaxPrice: 16300,
      gajiInstrukturOperasional: 50000,
      gajiInstrukturPribadi: 70000,
      uangMakanInstrukturHarian: 15000,
    };
  }
}

/**
 * Save single setting helper (upsert by key)
 */
async function upsertSetting(key: string, value: string, deskripsi?: string) {
  await dbQuery(
    `INSERT INTO settings (key, value, deskripsi, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, deskripsi = EXCLUDED.deskripsi, updated_at = NOW()`,
    [key, value, deskripsi || key]
  );

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

    safeRevalidatePath('/settings');
    safeRevalidatePath('/dashboard');
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

    safeRevalidatePath('/settings');
    safeRevalidatePath('/jadwal');
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

    safeRevalidatePath('/settings');
    safeRevalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving BBM prices:', err);
    return { success: false, error: err.message || 'Gagal menyimpan harga BBM' };
  }
}

/**
 * Save Instructor Fee & Meal Allowance Settings
 */
export async function saveInstructorSalarySettings(
  gajiOperasional: number,
  gajiPribadi: number,
  uangMakanHarian: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await upsertSetting(
      'gaji_instruktur_operasional',
      gajiOperasional.toString(),
      'Fee mengajar instruktur per sesi (Mobil Operasional)'
    );
    await upsertSetting(
      'gaji_instruktur_pribadi',
      gajiPribadi.toString(),
      'Fee mengajar instruktur per sesi (Mobil Pribadi)'
    );
    await upsertSetting(
      'uang_makan_instruktur_harian',
      uangMakanHarian.toString(),
      'Uang makan harian instruktur per hari aktif mengajar'
    );

    safeRevalidatePath('/settings');
    safeRevalidatePath('/jadwal');
    safeRevalidatePath('/instruktur');
    safeRevalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving instructor salary settings:', err);
    return { success: false, error: err.message || 'Gagal menyimpan tarif honor instruktur' };
  }
}
