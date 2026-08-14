import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram/client';
import { getTelegramConfig } from '@/lib/actions/telegram';
import { getTodayDateString, formatDateIndo, formatDateLongIndo } from '@/lib/utils/date';
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
    const config = await getTelegramConfig();
    if (!config.otomasiAktif || !config.rekapMalamAktif) {
      return NextResponse.json({
        success: true,
        message: 'Automasi Rekap Malam Telegram dinonaktifkan di Pengaturan Sistem',
      });
    }

    const supabase = await createServerClient();

    // Fetch all today's sessions with full joined data — include urutan for proper sort
    const { data: sessions } = await supabase
      .from('jadwal_sesi')
      .select(
        `id, status_sesi, nomor_sesi_ke, total_sesi_paket, staff_id,
         siswa(nama, kode_siswa),
         instruktur:staff(id, nama),
         slot_waktu:slot_waktu!slot_waktu_id(nama_slot, jam_mulai, jam_selesai, urutan),
         slot_waktu_akhir:slot_waktu!slot_waktu_id_akhir(nama_slot, jam_selesai, urutan)`
      )
      .eq('tanggal_sesi', todayStr);

    // Fetch active instructors ordered alphabetically for consistent listing
    const { data: staffList } = await supabase
      .from('staff')
      .select('id, nama')
      .eq('aktif', true)
      .order('nama', { ascending: true });

    const allSessions = sessions || [];
    const instructors = staffList || [];

    let totalCompleted = 0;
    let totalTerjadwal = 0;
    let totalBatal = 0;
    const breakdownLines: string[] = [];

    instructors.forEach((ins) => {
      const insSessions = allSessions.filter((j) => j.staff_id === ins.id);
      if (insSessions.length === 0) return;

      // Sort sessions by slot urutan
      const sorted = [...insSessions].sort((a, b) => {
        const ua = (a.slot_waktu as any)?.urutan ?? 99;
        const ub = (b.slot_waktu as any)?.urutan ?? 99;
        return ua - ub;
      });

      const completedSessions = sorted.filter((j) => j.status_sesi === 'selesai');
      const scheduledSessions = sorted.filter((j) => j.status_sesi === 'terjadwal');
      const batalSessions = sorted.filter((j) => j.status_sesi === 'batal');

      totalCompleted += completedSessions.length;
      totalTerjadwal += scheduledSessions.length;
      totalBatal += batalSessions.length;

      const activeSorted = sorted.filter((j) => j.status_sesi !== 'batal');

      breakdownLines.push(
        `\n<b>${ins.nama.toUpperCase()}</b> — ${completedSessions.length}/${activeSorted.length} Selesai`
      );

      activeSorted.forEach((j) => {
        const slot = j.slot_waktu as any;
        const slotAkhir = j.slot_waktu_akhir as any;
        const jamMulai = slot?.jam_mulai ? slot.jam_mulai.substring(0, 5) : '-';
        const jamSelesai = slotAkhir?.jam_selesai
          ? slotAkhir.jam_selesai.substring(0, 5)
          : slot?.jam_selesai
          ? slot.jam_selesai.substring(0, 5)
          : '-';

        const namaSlot = slot?.nama_slot || '-';
        const namaSlotAkhir = slotAkhir?.nama_slot;
        const slotLabel = namaSlotAkhir && namaSlotAkhir !== namaSlot
          ? `${namaSlot} s/d ${namaSlotAkhir}`
          : namaSlot;

        const icon = j.status_sesi === 'selesai' ? '✅' : '⏳';
        const statusLabel = j.status_sesi === 'selesai' ? 'Selesai' : 'Belum diupdate';
        const siswa = j.siswa as any;
        const nomorSesi = j.nomor_sesi_ke ?? '-';
        const totalSesi = j.total_sesi_paket ?? '-';

        breakdownLines.push(
          `  ${icon} <b>${siswa?.nama || '-'}</b> (${siswa?.kode_siswa || '-'})\n` +
          `      🕐 ${slotLabel} ${jamMulai}–${jamSelesai} WIB • Sesi ke-${nomorSesi}/${totalSesi}\n` +
          `      📌 ${statusLabel}`
        );
      });

      if (batalSessions.length > 0) {
        breakdownLines.push(`  🚫 ${batalSessions.length} sesi dibatalkan`);
      }
    });

    const statusIcon = totalTerjadwal === 0 ? '🟢' : '🟡';
    const message =
      `<b>📊 REKAP SESI HARIAN — MALAM</b>\n` +
      `Tanggal: <b>${dateFormatted}</b>\n` +
      `${'─'.repeat(30)}\n` +
      `${breakdownLines.length > 0 ? breakdownLines.join('\n') : '  Tidak ada sesi hari ini.'}\n\n` +
      `${'─'.repeat(30)}\n` +
      `${statusIcon} <b>Selesai: ${totalCompleted} Sesi</b>\n` +
      (totalTerjadwal > 0
        ? `⚠️ Belum diupdate: <b>${totalTerjadwal} sesi</b> — mohon segera update progress!`
        : `✅ Semua sesi telah diperbarui hari ini`);

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
