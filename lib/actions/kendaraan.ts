'use server';

import { createServerClient } from '@/lib/supabase/server';
import { Kendaraan, KendaraanBan, KendaraanLogHarian, HargaBBM } from '@/types/database';
import { revalidatePath } from 'next/cache';

const SEED_HARGA_BBM: HargaBBM[] = [
  { id: 'hb1', jenis: 'pertalite', harga_per_liter: 10000, created_at: '', updated_at: '' },
  { id: 'hb2', jenis: 'pertamax', harga_per_liter: 16300, created_at: '', updated_at: '' },
];

export async function getHargaBBMList(): Promise<HargaBBM[]> {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase.from('harga_bbm').select('*');
    if (data && data.length > 0) return data as HargaBBM[];
  } catch (e) {}
  return SEED_HARGA_BBM;
}

export async function updateOdometerBasecampLog(
  kendaraanId: string,
  tanggal: string,
  outKm?: number,
  inKm?: number,
  totalSlotSelesai?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();

    let jarakTempuh: number | null = null;
    if (outKm !== undefined && inKm !== undefined && inKm >= outKm) {
      jarakTempuh = inKm - outKm;
    }

    const logPayload: any = {
      kendaraan_id: kendaraanId,
      tanggal,
    };
    if (outKm !== undefined) logPayload.odometer_basecamp_out = outKm;
    if (inKm !== undefined) logPayload.odometer_basecamp_in = inKm;
    if (jarakTempuh !== null) logPayload.jarak_tempuh = jarakTempuh;
    if (totalSlotSelesai !== undefined) logPayload.total_slot_selesai = totalSlotSelesai;

    const { error } = await supabase.from('kendaraan_log_harian').upsert(logPayload, {
      onConflict: 'kendaraan_id,tanggal',
    });

    if (error) return { success: false, error: error.message };

    // Also update kendaraan_status odometer_terkini if inKm provided
    if (inKm || outKm) {
      const latestKm = inKm || outKm;
      await supabase
        .from('kendaraan_status')
        .update({ odometer_terkini: latestKm })
        .eq('kendaraan_id', kendaraanId);
    }

    revalidatePath(`/kendaraan/${kendaraanId}`);
    revalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateOliKendaraan(
  kendaraanId: string,
  tanggal: string,
  km: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('kendaraan_status')
      .update({
        oli_tanggal_terakhir: tanggal,
        oli_km_terakhir: km,
        odometer_terkini: km,
      })
      .eq('kendaraan_id', kendaraanId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/kendaraan/${kendaraanId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addBanHistory(
  banData: Partial<KendaraanBan>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('kendaraan_ban').insert(banData);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/kendaraan/${banData.kendaraan_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateCuciMobil(
  kendaraanId: string,
  tanggal: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('kendaraan_status')
      .update({ cuci_tanggal_terakhir: tanggal })
      .eq('kendaraan_id', kendaraanId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/kendaraan/${kendaraanId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function recordPengisianBBM(
  kendaraanId: string,
  tanggal: string,
  jenisBbm: string,
  nominal: number,
  hargaPerLiter: number
): Promise<{ success: boolean; liter?: number; error?: string }> {
  try {
    const supabase = await createServerClient();
    const liter = parseFloat((nominal / hargaPerLiter).toFixed(2));

    // Update status BBM kendaraan
    const { error: statusErr } = await supabase
      .from('kendaraan_status')
      .update({
        bensin_tanggal_terakhir: tanggal,
        bensin_jenis_terakhir: jenisBbm,
        bensin_nominal_terakhir: nominal,
        bensin_liter_terakhir: liter,
      })
      .eq('kendaraan_id', kendaraanId);

    if (statusErr) return { success: false, error: statusErr.message };

    // Get vehicle name for receipt text
    const { data: v } = await supabase.from('kendaraan').select('nama_kendaraan, plat_nomor').eq('id', kendaraanId).single();
    const vName = v ? `${v.nama_kendaraan} (${v.plat_nomor})` : 'Kendaraan Operasional';

    // Insert automatic Kas Transaksi Pengeluaran BBM
    await supabase.from('kas_transaksi').insert({
      tanggal,
      tipe: 'pengeluaran',
      kategori: 'bbm',
      keterangan: `Isi BBM ${jenisBbm.toUpperCase()} ${liter}L - ${vName}`,
      nominal,
      pic_tipe: 'admin',
      pic_nama: 'Fleet Admin',
      sumber_otomatis: true,
    });

    revalidatePath(`/kendaraan/${kendaraanId}`);
    revalidatePath('/kas');
    return { success: true, liter };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
