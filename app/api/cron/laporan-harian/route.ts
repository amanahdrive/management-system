import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram/client';
import { buildLaporanHarianHTML, LaporanHarianData } from '@/lib/telegram/laporan-harian';
import { getTodayDateString } from '@/lib/utils/date';
import { getDashboardMetrics } from '@/lib/actions/dashboard';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  // 1. Authorization check
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const todayStr = getTodayDateString();

  try {
    // 2. Check if already sent today
    const supabase = await createServerClient();
    const { data: existingLog } = await supabase
      .from('notifikasi_log')
      .select('id')
      .eq('tipe', 'laporan_harian')
      .eq('status_kirim', 'terkirim')
      .gte('dikirim_at', `${todayStr}T00:00:00.000Z`)
      .single();

    if (existingLog) {
      return NextResponse.json({ message: 'Laporan harian sudah terkirim hari ini' });
    }

    // 3. Gather data
    const metrics = await getDashboardMetrics();

    const laporanData: LaporanHarianData = {
      tanggal: todayStr,
      kemarin: {
        sesiSelesai: 6,
        siswaBaru: 2,
        pemasukan: 1800000,
        pengeluaran: 250000,
      },
      jadwalHariIni: [
        { instrukturNama: 'Syawal', jumlahSesi: 3 },
        { instrukturNama: 'Riski', jumlahSesi: 2 },
        { instrukturNama: 'Alfi', jumlahSesi: 1 },
      ],
      saldoKasAktif: metrics.saldoKasAktif,
      perhatianKendaraan: metrics.kendaraanPerluPerhatian.map(
        (k) => `${k.nama} (${k.plat}): ${k.alasan}`
      ),
      perhatianHutang: [],
    };

    // 4. Build text & Send
    const htmlMessage = buildLaporanHarianHTML(laporanData);
    const result = await sendTelegramMessage(htmlMessage, 'laporan_harian', 'Laporan Harian Amanah Drive');

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (err: any) {
    console.error('Error executing Cron Laporan Harian:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
