'use server';

import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase/server';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { revalidatePath } from 'next/cache';

const DEFAULT_PIN = '210100';
// Verified Bcrypt hash for default PIN '210100'
const DEFAULT_PIN_HASH = '$2b$10$R8rNaSgluTw0jHqja96RpukOfjeGH0wcgws0OmTZV8qmbgp/dNeFq';

const PIN_CACHE_KEY = 'kas_pin_stored_hash';

/**
 * Super-fast PIN verification with in-memory caching and fast-path matching
 */
export async function verifyKasPin(inputPin: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!inputPin || inputPin.length !== 6 || !/^\d{6}$/.test(inputPin)) {
      return { success: false, error: 'PIN harus 6 digit angka' };
    }

    // 1. Check in-memory cache first
    let storedHash = cacheGet<string>(PIN_CACHE_KEY);

    if (!storedHash) {
      try {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'pin_kas')
          .maybeSingle();

        if (data?.value) {
          storedHash = data.value;
        } else {
          storedHash = DEFAULT_PIN_HASH;
        }
        // Cache stored hash for 5 minutes
        cacheSet(PIN_CACHE_KEY, storedHash, 300);
      } catch (e) {
        storedHash = DEFAULT_PIN_HASH;
      }
    }

    // 2. Fast path: if hash is default and input is default PIN
    const finalHash: string = storedHash || DEFAULT_PIN_HASH;
    if (finalHash === DEFAULT_PIN_HASH && inputPin === DEFAULT_PIN) {
      return { success: true };
    }

    // 3. Compare with bcrypt
    const match = await bcrypt.compare(inputPin, finalHash);
    if (match || (finalHash === DEFAULT_PIN_HASH && inputPin === DEFAULT_PIN)) {
      return { success: true };
    }

    return { success: false, error: 'PIN Kas salah!' };
  } catch (err: any) {
    console.error('Error verifying PIN:', err);
    // Graceful fallback for default PIN on system error
    if (inputPin === DEFAULT_PIN) {
      return { success: true };
    }
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
    if (!pinLama || pinLama.length !== 6 || !/^\d{6}$/.test(pinLama)) {
      return { success: false, error: 'PIN lama harus tepat 6 digit angka' };
    }

    if (!pinBaru || pinBaru.length !== 6 || !/^\d{6}$/.test(pinBaru)) {
      return { success: false, error: 'PIN baru harus tepat 6 digit angka' };
    }

    // 1. Verify old PIN first
    const checkOld = await verifyKasPin(pinLama);
    if (!checkOld.success) {
      return { success: false, error: checkOld.error || 'PIN lama yang Anda masukkan salah!' };
    }

    // 2. Hash new PIN with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(pinBaru, salt);

    const supabase = createAdminClient();

    // 3. Check if key 'pin_kas' exists
    const { data: existing, error: selectErr } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'pin_kas')
      .maybeSingle();

    if (selectErr) {
      console.warn('Error checking existing pin_kas setting:', selectErr);
    }

    let saveErr: any = null;

    if (existing?.id) {
      const { error } = await supabase
        .from('settings')
        .update({ value: hashed })
        .eq('id', existing.id);
      saveErr = error;
    } else {
      // Try insert with key & value
      const { error } = await supabase
        .from('settings')
        .insert({
          key: 'pin_kas',
          value: hashed,
        });
      saveErr = error;

      // If insert failed because key already exists (race condition), fallback to update by key
      if (saveErr) {
        const { error: fallbackErr } = await supabase
          .from('settings')
          .update({ value: hashed })
          .eq('key', 'pin_kas');
        if (!fallbackErr) {
          saveErr = null;
        }
      }
    }

    if (saveErr) {
      console.error('Error saving PIN to Supabase:', saveErr);
      return { success: false, error: `Gagal menyimpan ke database: ${saveErr.message}` };
    }

    // 4. Instantly update in-memory cache with new hash
    cacheSet(PIN_CACHE_KEY, hashed, 600);
    cacheInvalidate('settings*');
    cacheInvalidate('kas*');

    try {
      revalidatePath('/settings');
      revalidatePath('/kas');
      revalidatePath('/kas/cashflow');
      revalidatePath('/finance');
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('Error in updateKasPin:', err);
    return { success: false, error: err?.message || 'Terjadi kesalahan sistem saat memperbarui PIN' };
  }
}
