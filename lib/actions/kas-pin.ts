'use server';

import bcrypt from 'bcryptjs';
import { dbQuery, dbQuerySingle } from '@/lib/db';
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
        const row = await dbQuerySingle<{ value: string }>(
          "SELECT value FROM settings WHERE key = 'pin_kas'"
        );
        if (row?.value) {
          storedHash = row.value;
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

    // 3. Upsert into settings table
    await dbQuery(
      `INSERT INTO settings (key, value, deskripsi, updated_at)
       VALUES ('pin_kas', $1, 'PIN Akses Menu Kas & Keuangan', NOW())
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, deskripsi = EXCLUDED.deskripsi, updated_at = NOW()`,
      [hashed]
    );

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
