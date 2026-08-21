import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram/client';
import { getTelegramConfig } from '@/lib/actions/telegram';
import { getTodayDateString, formatDateIndo } from '@/lib/utils/date';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const todayStr = getTodayDateString();
  const dateFormatted = formatDateIndo(todayStr);

  try {
    const config = await getTelegramConfig();
    if (!config.otomasiAktif || !config.pengingatProgressAktif) {
      return NextResponse.json({
        success: true,
        message: 'Automasi Pengingat Progress Telegram dinonaktifkan di Pengaturan Sistem',
      });
    }
    const message =
      `<b>PENGINGAT ADMIN & FINANCE AMANAH DRIVE</b>\n` +
      `Tanggal: <b>${dateFormatted}</b>\n` +
      `----------------------------------------\n` +
      `Mohon pastikan seluruh status progress sesi siswa pada jadwal harian hari ini sudah di-update (Selesai / Batal / Reschedule) sebelum jam 12 malam.\n\n` +
      `<i>Buka menu Jadwal Sesi di sistem manajemen untuk melakukan update progress.</i>`;

    const result = await sendTelegramMessage(
      message,
      'pengingat_progress_21pm',
      'Pengingat Progress Sesi (21:00 WIB)'
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (err: any) {
    console.error('Error executing Cron Pengingat Progress 21 PM:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
