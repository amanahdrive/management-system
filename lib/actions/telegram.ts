'use server';

import { createServerClient } from '@/lib/supabase/server';

export interface SendTelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Server action to send HTML formatted message to Telegram Bot
 */
export async function sendTelegramMessageAction(
  text: string,
  tipe: string = 'laporan_harian',
  judul: string = 'Laporan Telegram'
): Promise<SendTelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    const errMsg = 'TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum dikonfigurasi di Environment Variables';
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
      const errMsg = data.description || `HTTP ${res.status}: Gagal mengirim pesan`;
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
    const supabase = await createServerClient();
    await supabase.from('notifikasi_log').insert({
      tipe,
      judul,
      isi_pesan: isiPesan,
      status_kirim: statusKirim,
      error_message: errorMessage,
      dikirim_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[Notifikasi Log Save Error]', e);
  }
}
