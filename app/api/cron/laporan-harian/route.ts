import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram/client';
import { getTodayDateString } from '@/lib/utils/date';
import { createServerClient } from '@/lib/supabase/server';
import { formatDateLongIndo } from '@/lib/utils/date';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const todayStr = getTodayDateString();

  try {
    const supabase = await createServerClient();

    // Fetch today's scheduled sessions with full details
    const { data: sessions, error: sessionsError } = await supabase
      .from('jadwal_sesi')
      .select(
        'id, status_sesi, nomor_sesi_ke, total_sesi_paket, staff_id, siswa(nama, kode_siswa), instruktur:staff(id, nama), slot_waktu:slot_waktu!slot_waktu_id(nama_slot, jam_mulai, jam_selesai), slot_waktu_akhir:slot_waktu!slot_waktu_id_akhir(nama_slot, jam_selesai)'
      )
      .eq('tanggal_sesi', todayStr)
      .neq('status_sesi', 'batal')
      .order('staff_id')
      .order('slot_waktu_id');

    if (sessionsError) throw sessionsError;

    const activeSessions = sessions || [];

    if (activeSessions.length === 0) {
      const emptyMsg =
        `<b>📅 JADWAL OPERASIONAL PAGI</b>\n` +
        `Tanggal: <b>${formatDateLongIndo(todayStr)}</b>\n` +
        `${'─'.repeat(30)}\n` +
        `ℹ️ <i>Tidak ada sesi terjadwal hari ini.</i>\n` +
        `${'─'.repeat(30)}\n` +
        `🕕 Laporan otomatis dikirim pukul 06:00 WIB`;

      const result = await sendTelegramMessage(emptyMsg, 'laporan_harian_06am', 'Laporan Operasional Pagi (06:00 WIB)');
      return NextResponse.json({ success: result.success, messageId: result.messageId });
    }

    // Group by instructor
    const instrukturMap = new Map<string, { nama: string; sessions: typeof activeSessions }>();
    activeSessions.forEach((s) => {
      const instId = s.staff_id;
      const instNama = (s.instruktur as any)?.nama || 'Instruktur';
      if (!instrukturMap.has(instId)) {
        instrukturMap.set(instId, { nama: instNama, sessions: [] });
      }
      instrukturMap.get(instId)!.sessions.push(s);
    });

    const lines: string[] = [];
    instrukturMap.forEach((inst) => {
      lines.push(`\n<b>👤 ${inst.nama.toUpperCase()}</b>`);
      inst.sessions.forEach((s, i) => {
        const slot = s.slot_waktu as any;
        const slotAkhir = s.slot_waktu_akhir as any;
        const jamMulai = slot?.jam_mulai ? slot.jam_mulai.substring(0, 5) : '-';
        const jamSelesai = slotAkhir?.jam_selesai
          ? slotAkhir.jam_selesai.substring(0, 5)
          : slot?.jam_selesai
          ? slot.jam_selesai.substring(0, 5)
          : '-';
        const namaSlot = slot?.nama_slot || '-';
        const siswa = s.siswa as any;
        const nomorSesi = s.nomor_sesi_ke || '-';
        const totalSesi = s.total_sesi_paket || '-';

        lines.push(
          `  ${i + 1}. <b>${siswa?.nama || '-'}</b> (${siswa?.kode_siswa || '-'})\n` +
          `     📍 ${namaSlot} — ${jamMulai}–${jamSelesai} WIB\n` +
          `     📊 Sesi ke-${nomorSesi} dari ${totalSesi}`
        );
      });
    });

    const totalSesi = activeSessions.length;
    const message =
      `<b>☀️ JADWAL OPERASIONAL PAGI</b>\n` +
      `Tanggal: <b>${formatDateLongIndo(todayStr)}</b>\n` +
      `${'─'.repeat(30)}\n` +
      `${lines.join('\n')}\n\n` +
      `${'─'.repeat(30)}\n` +
      `<b>📌 Total: ${totalSesi} Sesi</b> dari ${instrukturMap.size} instruktur\n` +
      `🕕 Semangat bertugas! 💪`;

    const result = await sendTelegramMessage(
      message,
      'laporan_harian_06am',
      'Laporan Operasional Pagi (06:00 WIB)'
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: result.messageId });
  } catch (err: any) {
    console.error('Error executing Cron Laporan Harian 06 AM:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
