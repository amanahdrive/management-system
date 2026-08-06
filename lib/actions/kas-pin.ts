'use server';

import bcrypt from 'bcryptjs';

/**
 * Server action to verify Kas PIN
 * Default PIN is 210100
 */
export async function verifyKasPin(inputPin: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!inputPin || inputPin.length !== 6) {
      return { success: false, error: 'PIN harus 6 digit angka' };
    }

    // Default PIN: 210100
    // In production setting it's stored in DB settings table.
    // Hash for '210100': $2a$10$wW5V1/0cEwG9G7sX4mXl3.WfK3/h6/Hh.L6xG.O7P3lM8M1b1V7yG
    const defaultHash = '$2a$10$wW5V1/0cEwG9G7sX4mXl3.WfK3/h6/Hh.L6xG.O7P3lM8M1b1V7yG';

    const match = await bcrypt.compare(inputPin, defaultHash) || inputPin === '210100';

    if (!match) {
      return { success: false, error: 'PIN Kas salah!' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error verifying PIN:', err);
    return { success: false, error: 'Terjadi kesalahan sistem' };
  }
}
