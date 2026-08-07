import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram/client';
import { getTodayDateString, formatDateIndo } from '@/lib/utils/date';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const todayStr = getTodayDateString();
  const dateFormatted = formatDateIndo(todayStr);

  try {
    const supabase = await createServerClient();

    // Query today's sessions
    const { data: sessions } = await supabase
      .from('jadwal_sesi')
      .select('*, instruktur:staff(*)')
      .eq('tanggal_sesi', todayStr);

    const { data: staffList } = await supabase
      .from('staff')
      .select('*')
      .eq('is_active', true);

    const instructors = staffList || [];
    let totalCompleted = 0;
    const breakdownLines: string[] = [];

    instructors.forEach((ins) => {
      const insSessions = (sessions || []).filter(
        (j) => j.staff_id === ins.id && j.status_sesi === 'selesai'
      );
      const completedCount = insSessions.length;
      totalCompleted += completedCount;
      breakdownLines.push(`• <b>${ins.nama.toUpperCase()}</b>: ${completedCount} Sesi Selesai`);
    });

    const message =
      `<b>📊 REKAP SESI SELESAI HARI INI</b>\n` +
      `Tanggal: <b>${dateFormatted}</b>\n` +
      `----------------------------------------\n` +
      `${breakdownLines.join('\n')}\n\n` +
      `<b>Total Sesi Selesai: ${totalCompleted} Sesi</b>`;

    const result = await sendTelegramMessage(
      message,
      'rekap_sesi_malam_24pm',
      'Rekap Sesi Malam (24:00 WIB)'
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (err: any) {
    console.error('Error executing Cron Rekap Sesi Malam 24 PM:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
