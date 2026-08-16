'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ResetModuleKey =
  | 'keuangan'
  | 'siswa'
  | 'jadwal'
  | 'kendaraan_log'
  | 'insiden'
  | 'notifikasi'
  | 'master_staff'
  | 'master_paket'
  | 'all';

/**
 * 1. Kosongkan Data Keuangan & Kas (Cashflow, Hutang & Pembayaran)
 */
export async function resetDataKeuangan(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    await supabase.from('hutang_pembayaran').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('kas_transaksi').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('hutang').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/hutang');
    revalidatePath('/kas/piutang');
    revalidatePath('/dashboard');
    revalidatePath('/finance');

    return { success: true };
  } catch (err: any) {
    console.error('Reset keuangan error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 2. Kosongkan Data Siswa & Pendaftaran
 */
export async function resetDataSiswa(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    // Nullify references in foreign tables or remove sessions tied to siswa
    await supabase.from('jadwal_sesi').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('insiden').update({ siswa_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('kas_transaksi').update({ siswa_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('siswa').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    revalidatePath('/siswa');
    revalidatePath('/jadwal');
    revalidatePath('/dashboard');
    revalidatePath('/instruktur');

    return { success: true };
  } catch (err: any) {
    console.error('Reset siswa error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Kosongkan Data Jadwal Sesi Mengemudi
 */
export async function resetDataJadwal(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    await supabase.from('jadwal_sesi').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    revalidatePath('/jadwal');
    revalidatePath('/dashboard');
    revalidatePath('/instruktur');

    return { success: true };
  } catch (err: any) {
    console.error('Reset jadwal error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Kosongkan Data Log Harian Kendaraan & Servis Ban
 */
export async function resetDataKendaraanLog(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    await supabase.from('kendaraan_log_harian').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('kendaraan_ban').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('kendaraan_status').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    revalidatePath('/kendaraan');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Reset log kendaraan error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 5. Kosongkan Data Insiden Operasional
 */
export async function resetDataInsiden(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    await supabase.from('insiden').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    revalidatePath('/insiden');
    revalidatePath('/kendaraan');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Reset insiden error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 6. Kosongkan Log Notifikasi Telegram
 */
export async function resetDataNotifikasiLog(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    await supabase.from('notifikasi_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    revalidatePath('/settings');

    return { success: true };
  } catch (err: any) {
    console.error('Reset notifikasi log error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 7. Kosongkan Master Data Staff & Instruktur
 */
export async function resetDataMasterStaff(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    await supabase.from('jadwal_sesi').update({ staff_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('insiden').update({ staff_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('staff_jabatan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    revalidatePath('/master-data/staff');
    revalidatePath('/master-data/jabatan');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Reset staff error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 8. Kosongkan Master Paket Belajar & Promosi
 */
export async function resetDataMasterPaket(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    await supabase.from('siswa').update({ paket_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('promosi').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('paket').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    revalidatePath('/master-data/paket');
    revalidatePath('/master-data/promosi');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Reset paket error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 9. Kosongkan Seluruh Data Database (Reset Total)
 */
export async function resetSystemAllData(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Delete in safe foreign-key sequence
    await supabase.from('notifikasi_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('insiden').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('hutang_pembayaran').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('kas_transaksi').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('hutang').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('jadwal_sesi').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('siswa').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('kendaraan_ban').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('kendaraan_log_harian').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('kendaraan_status').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('kendaraan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('staff_jabatan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('jabatan').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('promosi').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('settings').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Reset default settings (hashed PIN 210100)
    await supabase.from('settings').insert([
      {
        key: 'pin_kas',
        value: '$2a$10$wW5V1/0cEwG9G7sX4mXl3.WfK3/h6/Hh.L6xG.O7P3lM8M1b1V7yG',
        deskripsi: 'PIN Kas Default 210100',
      },
      {
        key: 'nama_perusahaan',
        value: '',
        deskripsi: 'Nama Perusahaan',
      },
      {
        key: 'kota_operasional',
        value: '',
        deskripsi: 'Kota Operasional',
      },
    ]);

    revalidatePath('/dashboard');
    revalidatePath('/siswa');
    revalidatePath('/jadwal');
    revalidatePath('/kendaraan');
    revalidatePath('/kas');
    revalidatePath('/insiden');
    revalidatePath('/master-data/staff');
    revalidatePath('/master-data/jabatan');
    revalidatePath('/master-data/paket');
    revalidatePath('/master-data/kendaraan');
    revalidatePath('/settings');

    return { success: true };
  } catch (err: any) {
    console.error('Reset system error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatcher modular reset
 */
export async function resetModularData(moduleKey: ResetModuleKey): Promise<{ success: boolean; error?: string }> {
  switch (moduleKey) {
    case 'keuangan':
      return resetDataKeuangan();
    case 'siswa':
      return resetDataSiswa();
    case 'jadwal':
      return resetDataJadwal();
    case 'kendaraan_log':
      return resetDataKendaraanLog();
    case 'insiden':
      return resetDataInsiden();
    case 'notifikasi':
      return resetDataNotifikasiLog();
    case 'master_staff':
      return resetDataMasterStaff();
    case 'master_paket':
      return resetDataMasterPaket();
    case 'all':
      return resetSystemAllData();
    default:
      return { success: false, error: 'Modul tidak dikenal' };
  }
}
