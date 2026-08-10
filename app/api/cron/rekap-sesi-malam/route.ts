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

    // Query today's sessions with student names — fix: use 'aktif' not 'is_active'
    const { data: sessions } = await supabase
      .from('jadwal_sesi')
      .select('*, instruktur:staff(id, nama), siswa(nama, kode_siswa), slot_waktu:slot_waktu!slot_waktu_id(nama_slot, jam_mulai)')
      .eq('tanggal_sesi', todayStr);

    const { data: staffList } = await supabase
      .from('staff')
      .select('id, nama')
      .eq('aktif', true); // ← FIX: was `is_active`, correct column is `aktif`

    const instructors = staffList || [];
    let totalCompleted = 0;
    let totalTerjadwal = 0;
    const breakdownLines: string[] = [];

    instructors.forEach((ins) => {
      const insSessions = (sessions || []).filter((j) => j.staff_id === ins.id);
      const completedSessions = insSessions.filter((j) => j.status_sesi === 'selesai');
      const scheduledSessions = insSessions.filter((j) => j.status_sesi === 'terjadwal');

      totalCompleted += completedSessions.length;
      totalTerjadwal += scheduledSessions.length;

      if (insSessions.length === 0) return;

      const sessionLines = completedSessions.map((j) => {
        const namaSlot = j.slot_waktu?.nama_slot || '-';
        const jamMulai = j.slot_waktu?.jam_mulai ? j.slot_waktu.jam_mulai.substring(0, 5) : '-';
        return `  ✅ ${j.siswa?.nama || '-'} (${j.siswa?.kode_siswa || '-'}) — ${namaSlot} ${jamMulai} WIB`;
      });

      const pendingLines = scheduledSessions.map((j) => {
        return `  ⏳ ${j.siswa?.nama || '-'} (${j.siswa?.kode_siswa || '-'}) — Belum Update`;
      });

      breakdownLines.push(`\n<b>${ins.nama.toUpperCase()}</b> (${completedSessions.length}/${insSessions.length} Selesai)`);
      if (sessionLines.length > 0) breakdownLines.push(...sessionLines);
      if (pendingLines.length > 0) breakdownLines.push(...pendingLines);
    });

    const statusIcon = totalTerjadwal === 0 ? '🟢' : '🟡';
    const message =
      `<b>📊 REKAP SESI HARIAN — MALAM</b>\n` +
      `Tanggal: <b>${dateFormatted}</b>\n` +
      `${'─'.repeat(30)}\n` +
      `${breakdownLines.length > 0 ? breakdownLines.join('\n') : 'Tidak ada sesi hari ini.'}\n\n` +
      `${'─'.repeat(30)}\n` +
      `${statusIcon} <b>Total Selesai: ${totalCompleted} Sesi</b>\n` +
      (totalTerjadwal > 0 ? `⚠️ Belum diupdate: ${totalTerjadwal} sesi` : `✅ Semua sesi telah diperbarui`);

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
