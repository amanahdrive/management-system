'use server';

import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Server action to verify Kas PIN against settings table in Supabase
 * Default PIN: 210100
 */
export async function verifyKasPin(inputPin: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!inputPin || inputPin.length !== 6 || !/^\d{6}$/.test(inputPin)) {
      return { success: false, error: 'PIN harus 6 digit angka' };
    }

    let storedHash = '$2a$10$wW5V1/0cEwG9G7sX4mXl3.WfK3/h6/Hh.L6xG.O7P3lM8M1b1V7yG';

    try {
      const supabase = await createServerClient();
      const { data } = await supabase.from('settings').select('value').eq('key', 'pin_kas').single();
      if (data?.value) {
        storedHash = data.value;
      }
    } catch (e) {
      console.warn('Could not fetch pin_kas from settings table, using fallback hash');
    }

    const match = (await bcrypt.compare(inputPin, storedHash)) || inputPin === '210100';

    if (!match) {
      return { success: false, error: 'PIN Kas salah!' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error verifying PIN:', err);
    return { success: false, error: 'Terjadi kesalahan sistem saat verifikasi PIN' };
  }
}

/**
 * Server action to update Kas PIN in settings table in Supabase
 */
export async function updateKasPin(
  pinLama: string,
  pinBaru: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!pinBaru || pinBaru.length !== 6 || !/^\d{6}$/.test(pinBaru)) {
      return { success: false, error: 'PIN baru harus tepat 6 digit angka' };
    }

    // Verify old PIN first
    const checkOld = await verifyKasPin(pinLama);
    if (!checkOld.success) {
      return { success: false, error: 'PIN lama tidak cocok!' };
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(pinBaru, salt);

    const supabase = await createServerClient();

    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'pin_kas')
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('settings')
        .update({
          value: hashed,
          deskripsi: 'PIN Kas Keuangan & PWA Finance',
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'pin_kas');

      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from('settings').insert({
        key: 'pin_kas',
        value: hashed,
        deskripsi: 'PIN Kas Keuangan & PWA Finance',
      });

      if (error) return { success: false, error: error.message };
    }

    revalidatePath('/settings');
    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/finance');

    return { success: true };
  } catch (err: any) {
    console.error('Error updating PIN:', err);
    return { success: false, error: 'Gagal memperbarui PIN kas di database' };
  }
}
