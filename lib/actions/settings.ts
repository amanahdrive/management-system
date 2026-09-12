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
  solarPrice: number;
  gajiInstrukturOperasional: number;
  gajiInstrukturPribadi: number;
  uangMakanInstrukturHarian: number;
  minSlotUangMakan: number;
  tarifMaintenancePerKm: number;
  targetEfisiensiBbm: number;
}

export interface FleetSettings {
  pertalitePrice: number;
  pertamaxPrice: number;
  solarPrice: number;
  tarifMaintenancePerKm: number;
  targetEfisiensiBbm: number;
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
      solarPrice: map['harga_bbm_solar'] ? Number(map['harga_bbm_solar']) : 6800,
      gajiInstrukturOperasional: map['gaji_instruktur_operasional']
        ? Number(map['gaji_instruktur_operasional'])
        : 50000,
      gajiInstrukturPribadi: map['gaji_instruktur_pribadi']
        ? Number(map['gaji_instruktur_pribadi'])
        : 70000,
      uangMakanInstrukturHarian: map['uang_makan_instruktur_harian']
        ? Number(map['uang_makan_instruktur_harian'])
        : 15000,
      minSlotUangMakan: map['min_slot_uang_makan']
        ? Number(map['min_slot_uang_makan'])
        : 2,
      tarifMaintenancePerKm: map['tarif_maintenance_per_km']
        ? Number(map['tarif_maintenance_per_km'])
        : 1000,
      targetEfisiensiBbm: map['target_efisiensi_bbm']
        ? Number(map['target_efisiensi_bbm'])
        : 10,
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
      solarPrice: 6800,
      gajiInstrukturOperasional: 50000,
      gajiInstrukturPribadi: 70000,
      uangMakanInstrukturHarian: 15000,
      minSlotUangMakan: 2,
      tarifMaintenancePerKm: 1000,
      targetEfisiensiBbm: 10,
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
 * Get Fleet-specific settings (BBM prices, maintenance tariff, efficiency target)
 */
export async function getFleetSettings(): Promise<FleetSettings> {
  try {
    const rows = await dbQuery<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key IN (
        'harga_bbm_pertalite','harga_bbm_pertamax','harga_bbm_solar',
        'tarif_maintenance_per_km','target_efisiensi_bbm'
      )`
    );
    const map: Record<string, string> = {};
    (rows || []).forEach((r) => { map[r.key] = r.value; });

    return {
      pertalitePrice: map['harga_bbm_pertalite'] ? Number(map['harga_bbm_pertalite']) : 10000,
      pertamaxPrice: map['harga_bbm_pertamax'] ? Number(map['harga_bbm_pertamax']) : 16300,
      solarPrice: map['harga_bbm_solar'] ? Number(map['harga_bbm_solar']) : 6800,
      tarifMaintenancePerKm: map['tarif_maintenance_per_km'] ? Number(map['tarif_maintenance_per_km']) : 1000,
      targetEfisiensiBbm: map['target_efisiensi_bbm'] ? Number(map['target_efisiensi_bbm']) : 10,
    };
  } catch (err) {
    console.error('Error fetching fleet settings:', err);
    return {
      pertalitePrice: 10000,
      pertamaxPrice: 16300,
      solarPrice: 6800,
      tarifMaintenancePerKm: 1000,
      targetEfisiensiBbm: 10,
    };
  }
}

/**
 * Save Fleet Settings (BBM prices + maintenance tariff + efficiency target)
 */
export async function saveFleetSettings(
  data: FleetSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    await upsertSetting('harga_bbm_pertalite', data.pertalitePrice.toString(), 'Harga BBM Pertalite per Liter');
    await upsertSetting('harga_bbm_pertamax', data.pertamaxPrice.toString(), 'Harga BBM Pertamax per Liter');
    await upsertSetting('harga_bbm_solar', data.solarPrice.toString(), 'Harga BBM Solar/Dexlite per Liter');
    await upsertSetting('tarif_maintenance_per_km', data.tarifMaintenancePerKm.toString(), 'Tarif cadangan maintenance per km tempuh');
    await upsertSetting('target_efisiensi_bbm', data.targetEfisiensiBbm.toString(), 'Target efisiensi BBM armada (km/L)');

    cacheInvalidate(CACHE_KEY);
    safeRevalidatePath('/settings');
    safeRevalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving fleet settings:', err);
    return { success: false, error: err.message || 'Gagal menyimpan pengaturan armada' };
  }
}

/**
 * Save Instructor Fee & Meal Allowance Settings
 */
export async function saveInstructorSalarySettings(
  gajiOperasional: number,
  gajiPribadi: number,
  uangMakanHarian: number,
  minSlotUangMakan: number = 2
): Promise<{ success: boolean; error?: string }> {
  try {
    await upsertSetting(
      'gaji_instruktur_operasional',
      gajiOperasional.toString(),
      'Fee mengajar per sesi armada operasional'
    );
    await upsertSetting(
      'gaji_instruktur_pribadi',
      gajiPribadi.toString(),
      'Fee mengajar per sesi mobil pribadi/sendiri'
    );
    await upsertSetting(
      'uang_makan_instruktur_harian',
      uangMakanHarian.toString(),
      'Uang makan harian instruktur'
    );
    await upsertSetting(
      'min_slot_uang_makan',
      minSlotUangMakan.toString(),
      'Minimal slot selesai per hari untuk memperoleh uang makan'
    );

    safeRevalidatePath('/settings');
    safeRevalidatePath('/jadwal');
    safeRevalidatePath('/instruktur');
    safeRevalidatePath('/dashboard');
    safeRevalidatePath('/analitik');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving instructor salary settings:', err);
    return { success: false, error: err.message || 'Gagal menyimpan tarif honor instruktur' };
  }
}

export interface OperasionalSettings {
  tokenNominal: number;
  tokenTanggal: number;
  wifiNominal: number;
  wifiTanggal: number;
  airNominal: number;
  airTanggal: number;
  airFluktuatif: boolean;
}

export async function getOperasionalSettings(): Promise<OperasionalSettings> {
  const cached = cacheGet<OperasionalSettings>('operasional_settings');
  if (cached) return cached;

  try {
    const rows = await dbQuery<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key LIKE 'pos_operasional_%'`
    );
    const map: Record<string, string> = {};
    (rows || []).forEach((r) => {
      map[r.key] = r.value;
    });

    const result: OperasionalSettings = {
      tokenNominal: map['pos_operasional_token_nominal'] ? Number(map['pos_operasional_token_nominal']) : 200000,
      tokenTanggal: map['pos_operasional_token_tanggal'] ? Number(map['pos_operasional_token_tanggal']) : 5,
      wifiNominal: map['pos_operasional_wifi_nominal'] ? Number(map['pos_operasional_wifi_nominal']) : 300000,
      wifiTanggal: map['pos_operasional_wifi_tanggal'] ? Number(map['pos_operasional_wifi_tanggal']) : 10,
      airNominal: map['pos_operasional_air_nominal'] ? Number(map['pos_operasional_air_nominal']) : 100000,
      airTanggal: map['pos_operasional_air_tanggal'] ? Number(map['pos_operasional_air_tanggal']) : 20,
      airFluktuatif: map['pos_operasional_air_fluktuatif'] !== 'false',
    };

    cacheSet('operasional_settings', result, 60);
    return result;
  } catch (err) {
    console.error('Error fetching operasional settings:', err);
    return {
      tokenNominal: 200000,
      tokenTanggal: 5,
      wifiNominal: 300000,
      wifiTanggal: 10,
      airNominal: 100000,
      airTanggal: 20,
      airFluktuatif: true,
    };
  }
}

export async function saveOperasionalSettings(
  data: Partial<OperasionalSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (data.tokenNominal !== undefined) {
      await upsertSetting('pos_operasional_token_nominal', String(data.tokenNominal), 'Nominal Token Listrik Bulanan');
    }
    if (data.tokenTanggal !== undefined) {
      await upsertSetting('pos_operasional_token_tanggal', String(data.tokenTanggal), 'Tanggal Bayar Token Listrik Bulanan');
    }
    if (data.wifiNominal !== undefined) {
      await upsertSetting('pos_operasional_wifi_nominal', String(data.wifiNominal), 'Nominal WiFi Kantor Bulanan');
    }
    if (data.wifiTanggal !== undefined) {
      await upsertSetting('pos_operasional_wifi_tanggal', String(data.wifiTanggal), 'Tanggal Bayar WiFi Kantor Bulanan');
    }
    if (data.airNominal !== undefined) {
      await upsertSetting('pos_operasional_air_nominal', String(data.airNominal), 'Estimasi Biaya Air PDAM Bulanan');
    }
    if (data.airTanggal !== undefined) {
      await upsertSetting('pos_operasional_air_tanggal', String(data.airTanggal), 'Tanggal Bayar Air PDAM Bulanan');
    }
    if (data.airFluktuatif !== undefined) {
      await upsertSetting('pos_operasional_air_fluktuatif', String(data.airFluktuatif), 'Flag Biaya Air Fluktuatif');
    }

    cacheInvalidate('operasional_settings');
    safeRevalidatePath('/settings');
    safeRevalidatePath('/kas/pos');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving operasional settings:', err);
    return { success: false, error: err.message || 'Gagal menyimpan pengaturan operasional' };
  }
}

export interface ModalSimSettings {
  hargaDefault: number;
  configPerJenis: Record<string, number>;
}

export async function getModalSimSettings(): Promise<ModalSimSettings> {
  const cached = cacheGet<ModalSimSettings>('modal_sim_settings');
  if (cached) return cached;

  try {
    const rows = await dbQuery<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key LIKE 'modal_sim_%'`
    );
    const map: Record<string, string> = {};
    (rows || []).forEach((r) => {
      map[r.key] = r.value;
    });

    let configPerJenis: Record<string, number> = { 'SIM A': 850000, 'SIM C': 650000, default: 850000 };
    if (map['modal_sim_config']) {
      try {
        configPerJenis = JSON.parse(map['modal_sim_config']);
      } catch (e) {
        // ignore json parse error
      }
    }

    const result: ModalSimSettings = {
      hargaDefault: map['modal_sim_harga'] ? Number(map['modal_sim_harga']) : 850000,
      configPerJenis,
    };

    cacheSet('modal_sim_settings', result, 60);
    return result;
  } catch (err) {
    console.error('Error fetching modal sim settings:', err);
    return {
      hargaDefault: 850000,
      configPerJenis: { 'SIM A': 850000, 'SIM C': 650000, default: 850000 },
    };
  }
}

export async function saveModalSimSettings(
  hargaDefault: number,
  configPerJenis?: Record<string, number>
): Promise<{ success: boolean; error?: string }> {
  try {
    await upsertSetting('modal_sim_harga', String(hargaDefault), 'Harga modal penerbitan SIM per siswa');
    if (configPerJenis) {
      await upsertSetting('modal_sim_config', JSON.stringify(configPerJenis), 'Konfigurasi harga modal SIM per jenis');
    }

    cacheInvalidate('modal_sim_settings');
    safeRevalidatePath('/sim');
    safeRevalidatePath('/kas/pos');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving pelatihan SIM settings:', err);
    return { success: false, error: err.message || 'Gagal menyimpan pengaturan biaya pelatihan SIM' };
  }
}

export type PelatihanSimSettings = ModalSimSettings;
export const getPelatihanSimSettings = getModalSimSettings;
export const savePelatihanSimSettings = saveModalSimSettings;
