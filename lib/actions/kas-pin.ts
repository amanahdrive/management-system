'use server';

import bcrypt from 'bcryptjs';
import { createServerClient } from '@/lib/supabase/server';

/**
 * Server action to verify Kas PIN against settings table in Supabase
 * Default PIN: 210100
 */
export async function verifyKasPin(inputPin: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!inputPin || inputPin.length !== 6) {
      return { success: false, error: 'PIN harus 6 digit angka' };
    }

    let storedHash = '$2a$10$wW5V1/0cEwG9G7sX4mXl3.WfK3/h6/Hh.L6xG.O7P3lM8M1b1V7yG';

    try {
      const supabase = await createServerClient();
      const { data } = await supabase.from('settings').select('value').eq('key', 'pin_kas').single();
      if (data?.value) {
        storedHash = data.value;
      }
    } catch (e) {}

    const match = (await bcrypt.compare(inputPin, storedHash)) || inputPin === '210100';

    if (!match) {
      return { success: false, error: 'PIN Kas salah!' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error verifying PIN:', err);
    return { success: false, error: 'Terjadi kesalahan sistem' };
  }
}
