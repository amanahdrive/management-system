'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Server action to reset system: clear all data to zero
 * (siswa, jadwal, kas, kendaraan, staff, jabatan, settings, etc.)
 */
export async function resetSystemAllData(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();

    // Delete in order to satisfy foreign key constraints
    await supabase.from('notifikasi_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
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
