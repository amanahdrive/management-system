import { NextRequest, NextResponse } from 'next/server';
import { getTelegramConfig } from '@/lib/actions/telegram';
import { getDbPool } from '@/lib/db';
import { getTodayDateString, formatDateLongIndo } from '@/lib/utils/date';

export const dynamic = 'force-dynamic';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number | string;
      type: string;
      title?: string;
    };
    date: number;
    text?: string;
  };
}

async function sendTelegramReply(botToken: string, chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error('[Telegram Webhook Reply Error]', err);
  }
}

/**
 * GET /api/webhook/telegram
 * Returns webhook status and quick setWebhook instruction
 */
export async function GET(request: NextRequest) {
  const config = await getTelegramConfig();
  const token = config.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const host = request.headers.get('host') || 'management-amanahdrive.vercel.app';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const currentWebhookUrl = `${protocol}://${host}/api/webhook/telegram`;

  let botInfo: any = null;
  let webhookInfo: any = null;

  if (token) {
    try {
      const [resMe, resHook] = await Promise.all([
        fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json()),
        fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`).then((r) => r.json()),
      ]);
      botInfo = resMe.result;
      webhookInfo = resHook.result;
    } catch (e) {
      // ignore
    }
  }

  return NextResponse.json({
    status: 'online',
    service: 'Amanah Drive Telegram Bot Webhook Gateway',
    webhookUrl: currentWebhookUrl,
    isTokenConfigured: Boolean(token),
    bot: botInfo
      ? {
          id: botInfo.id,
          name: botInfo.first_name,
          username: `@${botInfo.username}`,
        }
      : null,
    telegramWebhookInfo: webhookInfo,
    instructions: {
      registerWebhookUrl: token
        ? `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(currentWebhookUrl)}`
        : 'Set TELEGRAM_BOT_TOKEN first to generate registration URL',
      deleteWebhookUrl: token
        ? `https://api.telegram.org/bot${token}/deleteWebhook`
        : null,
    },
  });
}

/**
 * POST /api/webhook/telegram
 * Receives messages and commands from Telegram Bot users
 */
export async function POST(request: NextRequest) {
  try {
    const config = await getTelegramConfig();
    const token = config.botToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return NextResponse.json({ error: 'Telegram Bot Token not configured' }, { status: 500 });
    }

    const update: TelegramUpdate = await request.json();
    const message = update.message;

    if (!message || !message.text) {
      // Acknowledge non-text updates (e.g. photos, joins) immediately
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const senderName = message.from?.first_name || 'Admin';

    // Route interactive commands
    if (text.startsWith('/start') || text.startsWith('/help')) {
      const welcomeText =
        `👋 <b>Halo ${senderName}!</b>\n\n` +
        `Selamat datang di <b>Amanah Drive Management Bot</b>.\n` +
        `Sistem bot otomatis untuk Kursus Mengemudi Amanah Drive Palembang.\n\n` +
        `<b>Perintah yang Tersedia:</b>\n` +
        `• <code>/jadwal</code> - Lihat jadwal sesi mengemudi hari ini\n` +
        `• <code>/status</code> - Periksa status sistem & server\n` +
        `• <code>/id</code> - Lihat Chat ID percakapan ini\n` +
        `• <code>/help</code> - Bantuan dan daftar perintah\n\n` +
        `<i>Bot ini terhubung langsung ke database cloud Amanah Drive.</i>`;

      await sendTelegramReply(token, chatId, welcomeText);
    } else if (text.startsWith('/id')) {
      const idText =
        `🆔 <b>Informasi Chat Telegram</b>\n\n` +
        `• <b>Chat ID:</b> <code>${chatId}</code>\n` +
        `• <b>Tipe:</b> <code>${message.chat.type}</code>\n` +
        `• <b>Pengirim:</b> ${senderName} (${message.from?.username ? `@${message.from.username}` : '-'})\n\n` +
        `<i>Gunakan Chat ID ini pada TELEGRAM_CHAT_ID di Vercel jika ingin menerima notifikasi ke obrolan ini.</i>`;

      await sendTelegramReply(token, chatId, idText);
    } else if (text.startsWith('/status') || text.startsWith('/ping')) {
      const start = Date.now();
      const pool = getDbPool();
      await pool.query('SELECT 1');
      const dbLatency = Date.now() - start;

      const statusText =
        `⚡ <b>STATUS SISTEM AMANAH DRIVE</b>\n\n` +
        `• <b>Server:</b> Next.js 16 (Turbopack on Vercel)\n` +
        `• <b>Database:</b> PostgreSQL Supabase (Online)\n` +
        `• <b>Latency DB:</b> ${dbLatency}ms\n` +
        `• <b>Waktu Server:</b> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n` +
        `• <b>Status Bot:</b> Aktif & Responsif\n\n` +
        `<i>Semua layanan operasional berjalan normal.</i>`;

      await sendTelegramReply(token, chatId, statusText);
    } else if (text.startsWith('/jadwal')) {
      const todayStr = getTodayDateString();
      const pool = getDbPool();
      const res = await pool.query(
        `SELECT js.id, js.nomor_sesi_ke, js.total_sesi_paket, js.status_sesi,
                s.nama AS nama_siswa,
                st.nama AS nama_instruktur,
                sw.nama_slot, sw.jam_mulai, sw.jam_selesai
         FROM jadwal_sesi js
         LEFT JOIN siswa s ON js.siswa_id = s.id
         LEFT JOIN staff st ON js.staff_id = st.id
         LEFT JOIN slot_waktu sw ON js.slot_waktu_id = sw.id
         WHERE js.tanggal_sesi = $1 AND js.status_sesi != 'batal'
         ORDER BY sw.urutan ASC NULLS LAST`,
        [todayStr]
      );

      const rows = res.rows;
      if (rows.length === 0) {
        await sendTelegramReply(
          token,
          chatId,
          `📅 <b>JADWAL HARI INI (${formatDateLongIndo(todayStr)})</b>\n\n<i>Tidak ada jadwal sesi aktif untuk hari ini.</i>`
        );
      } else {
        let listText = `📅 <b>JADWAL SESI HARI INI (${formatDateLongIndo(todayStr)})</b>\n\n`;
        rows.forEach((r, idx) => {
          const jam = r.jam_mulai ? `${r.jam_mulai.slice(0, 5)} - ${r.jam_selesai ? r.jam_selesai.slice(0, 5) : ''}` : '-';
          const statusIcon = r.status_sesi === 'selesai' ? '✅' : '⏳';
          listText += `${idx + 1}. [${jam}] <b>${r.nama_siswa || 'Siswa'}</b>\n`;
          listText += `   Instruktur: ${r.nama_instruktur || '-'}\n`;
          listText += `   Sesi: ${r.nomor_sesi_ke}/${r.total_sesi_paket || '-'} (${statusIcon} ${r.status_sesi})\n\n`;
        });

        await sendTelegramReply(token, chatId, listText.trim());
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Telegram Webhook Exception]', error);
    // Always return 200 to Telegram to prevent retry storms
    return NextResponse.json({ ok: false, error: error?.message || 'Error processing update' });
  }
}
