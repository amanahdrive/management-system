'use server';

import { dbQuery } from '@/lib/db';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { revalidatePath } from 'next/cache';

export interface TelegramConfig {
  otomasiAktif: boolean;
  laporanPagiAktif: boolean;
  laporanPagiJam: string;
  rekapMalamAktif: boolean;
  rekapMalamJam: string;
  pengingatProgressAktif: boolean;
  botToken: string;
  chatId: string;
  includeOdometer: boolean;
}

export interface SendTelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  otomasiAktif: true,
  laporanPagiAktif: true,
  laporanPagiJam: '06:00',
  rekapMalamAktif: true,
  rekapMalamJam: '21:00',
  pengingatProgressAktif: true,
  botToken: '',
  chatId: '',
  includeOdometer: true,
};

const TELEGRAM_CACHE_KEY = 'telegram_config';

/**
 * Get Telegram configuration from database settings table with in-memory caching
 */
export async function getTelegramConfig(): Promise<TelegramConfig> {
  const cached = cacheGet<TelegramConfig>(TELEGRAM_CACHE_KEY);
  if (cached) return cached;

  try {
    const data = await dbQuery<{ key: string; value: string }>(
      `SELECT key, value FROM settings 
       WHERE key IN (
         'telegram_otomasi_aktif',
         'telegram_laporan_pagi_aktif',
         'telegram_laporan_pagi_jam',
         'telegram_rekap_malam_aktif',
         'telegram_rekap_malam_jam',
         'telegram_pengingat_progress_aktif',
         'telegram_bot_token',
         'telegram_chat_id',
         'telegram_include_odometer'
       )`
    );

    if (!data || data.length === 0) return DEFAULT_TELEGRAM_CONFIG;

    const map = new Map<string, string>();
    data.forEach((item) => map.set(item.key, item.value || ''));

    const result: TelegramConfig = {
      otomasiAktif: map.get('telegram_otomasi_aktif') !== 'false',
      laporanPagiAktif: map.get('telegram_laporan_pagi_aktif') !== 'false',
      laporanPagiJam: map.get('telegram_laporan_pagi_jam') || '06:00',
      rekapMalamAktif: map.get('telegram_rekap_malam_aktif') !== 'false',
      rekapMalamJam: map.get('telegram_rekap_malam_jam') || '21:00',
      pengingatProgressAktif: map.get('telegram_pengingat_progress_aktif') !== 'false',
      botToken: map.get('telegram_bot_token') || process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: map.get('telegram_chat_id') || process.env.TELEGRAM_CHAT_ID || '',
      includeOdometer: map.get('telegram_include_odometer') !== 'false',
    };

    cacheSet(TELEGRAM_CACHE_KEY, result, 120);
    return result;
  } catch (e) {
    console.error('Error fetching telegram config:', e);
    return DEFAULT_TELEGRAM_CONFIG;
  }
}

/**
 * Save Telegram configuration to settings table
 */
export async function saveTelegramConfig(
  config: Partial<TelegramConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updates = [
      { key: 'telegram_otomasi_aktif', value: String(config.otomasiAktif ?? true), deskripsi: 'Master Switch Automasi Telegram' },
      { key: 'telegram_laporan_pagi_aktif', value: String(config.laporanPagiAktif ?? true), deskripsi: 'Status Laporan Pagi Harian' },
      { key: 'telegram_laporan_pagi_jam', value: config.laporanPagiJam || '06:00', deskripsi: 'Jam Pengiriman Laporan Pagi' },
      { key: 'telegram_rekap_malam_aktif', value: String(config.rekapMalamAktif ?? true), deskripsi: 'Status Rekap Sesi Malam' },
      { key: 'telegram_rekap_malam_jam', value: config.rekapMalamJam || '21:00', deskripsi: 'Jam Pengiriman Rekap Malam' },
      { key: 'telegram_pengingat_progress_aktif', value: String(config.pengingatProgressAktif ?? true), deskripsi: 'Status Pengingat Progress Instruktur' },
      { key: 'telegram_bot_token', value: config.botToken || '', deskripsi: 'Custom Telegram Bot Token' },
      { key: 'telegram_chat_id', value: config.chatId || '', deskripsi: 'Custom Telegram Chat ID' },
      { key: 'telegram_include_odometer', value: String(config.includeOdometer ?? true), deskripsi: 'Sertakan Status Odometer Armada' },
    ];

    for (const item of updates) {
      await dbQuery(
        `INSERT INTO settings (key, value, deskripsi, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, deskripsi = EXCLUDED.deskripsi, updated_at = NOW()`,
        [item.key, item.value, item.deskripsi]
      );
    }

    cacheInvalidate(TELEGRAM_CACHE_KEY);
    cacheInvalidate('settings*');

    revalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    console.error('Error saving telegram config:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan konfigurasi Telegram' };
  }
}

/**
 * Server action to send HTML formatted message to Telegram Bot
 */
export async function sendTelegramMessageAction(
  text: string,
  tipe: string = 'laporan_harian',
  judul: string = 'Laporan Telegram'
): Promise<SendTelegramResult> {
  const config = await getTelegramConfig();

  const token = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = config.chatId || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    const errMsg = 'Telegram Bot Token atau Chat ID belum dikonfigurasi di Pengaturan / Environment Variables';
    console.warn(`[Telegram API] ${errMsg}`);
    await logNotifikasi(tipe, judul, text, 'gagal', errMsg);
    return { success: false, error: errMsg };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      const errMsg = data.description || `HTTP ${res.status}: Gagal mengirim pesan ke Telegram`;
      console.error('[Telegram API Error]', errMsg);
      await logNotifikasi(tipe, judul, text, 'gagal', errMsg);
      return { success: false, error: errMsg };
    }

    await logNotifikasi(tipe, judul, text, 'terkirim', null);
    return { success: true, messageId: data.result?.message_id };
  } catch (err: any) {
    const errMsg = err?.message || 'Network error saat menghubungi Telegram API';
    console.error('[Telegram Exception]', err);
    await logNotifikasi(tipe, judul, text, 'gagal', errMsg);
    return { success: false, error: errMsg };
  }
}

async function logNotifikasi(
  tipe: string,
  judul: string,
  isiPesan: string,
  statusKirim: 'terkirim' | 'gagal',
  errorMessage: string | null
) {
  try {
    await dbQuery(
      `INSERT INTO notifikasi_log (tipe, judul, isi_pesan, status_kirim, error_message, dikirim_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [tipe, judul, isiPesan, statusKirim, errorMessage]
    );
  } catch (e) {
    console.error('[Notifikasi Log Save Error]', e);
  }
}
