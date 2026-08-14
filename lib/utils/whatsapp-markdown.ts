// lib/utils/whatsapp-markdown.ts
import { JadwalSesi } from '@/types/database';
import { formatHariTanggalIndo, formatDateIndo } from './date';

export interface InstrukturJadwalGroup {
  instrukturNama: string;
  instrukturId?: string;
  sesiList: JadwalSesi[];
}

/**
 * Sorts sessions by slot_waktu.urutan ascending (Slot 1, Slot 2, ...)
 */
export function sortSesiBySlotUrutan(list: JadwalSesi[]): JadwalSesi[] {
  return [...list].sort((a, b) => {
    const urutanA = a.slot_waktu?.urutan ?? 999;
    const urutanB = b.slot_waktu?.urutan ?? 999;
    if (urutanA !== urutanB) return urutanA - urutanB;

    // Fallback: compare jam_mulai string
    const jamA = a.slot_waktu?.jam_mulai || '';
    const jamB = b.slot_waktu?.jam_mulai || '';
    return jamA.localeCompare(jamB);
  });
}

/**
 * Generates Daily WhatsApp Schedule Markdown
 */
export function generateWhatsAppJadwalMarkdown(
  tanggalStr: string,
  groupedData: InstrukturJadwalGroup[],
  footerTemplate?: string
): string {
  const tglFormatted = formatHariTanggalIndo(tanggalStr);

  const defaultFooter =
    '• Minta share lokasi kepada klien sebelum berangkat.\n' +
    '• Laporan keluar Basecamp beserta foto odometer.\n' +
    '• Laporan saat sesi dimulai.\n' +
    '• Laporan saat sesi selesai.\n' +
    '• Laporan kembali ke Basecamp beserta foto odometer.';

  const catatanFooter = footerTemplate?.trim() || defaultFooter;

  let body = `*JADWAL OPERASIONAL AMANAH DRIVE*\n`;
  body += `Tanggal: *${tglFormatted}*\n`;
  body += `────────────────────────\n\n`;

  if (groupedData.length === 0) {
    body += `_Tidak ada sesi mengemudi terjadwal pada tanggal ini._\n\n`;
  } else {
    // Sort groups alphabetically by instructor name
    const sortedGroups = [...groupedData].sort((a, b) =>
      a.instrukturNama.localeCompare(b.instrukturNama)
    );

    sortedGroups.forEach((group) => {
      // Sort sessions strictly by slot 1..N
      const sortedSesi = sortSesiBySlotUrutan(group.sesiList);

      body += `🚗 Instruktur: *${group.instrukturNama.toUpperCase()}*\n`;

      if (sortedSesi.length === 0) {
        body += `  _Libur / Tidak ada jadwal sesi_\n\n`;
        return;
      }

      sortedSesi.forEach((sesi) => {
        const namaSiswa = sesi.siswa?.nama || 'Siswa';
        const kodeSiswa = sesi.siswa?.kode_siswa || '-';
        const noWa = sesi.siswa?.no_whatsapp || '-';
        const alamat = sesi.siswa?.alamat || '-';

        const totalSesi = sesi.total_sesi_paket || 10;
        const sesiKe = sesi.nomor_sesi_ke || 1;

        let slotDisplay = '';
        let jamMulai = '';
        let jamSelesai = '';

        if (sesi.slot_waktu) {
          const namaSlotAwal = sesi.slot_waktu.nama_slot;
          jamMulai = sesi.slot_waktu.jam_mulai.substring(0, 5);

          if (sesi.slot_waktu_akhir && sesi.slot_waktu_akhir.id !== sesi.slot_waktu.id) {
            const namaSlotAkhir = sesi.slot_waktu_akhir.nama_slot;
            slotDisplay = `${namaSlotAwal} s/d ${namaSlotAkhir}`;
            jamSelesai = sesi.slot_waktu_akhir.jam_selesai.substring(0, 5);
          } else {
            slotDisplay = namaSlotAwal;
            jamSelesai = sesi.slot_waktu.jam_selesai.substring(0, 5);
          }
        } else {
          slotDisplay = 'Slot Sesi';
          jamMulai = '-';
          jamSelesai = '-';
        }

        let jenisMobilLabel = 'Manual';
        if (sesi.jenis_mobil === 'matic') jenisMobilLabel = 'Matic';
        if (sesi.jenis_mobil === 'mobil_sendiri') jenisMobilLabel = 'Mobil Sendiri';

        body += `• *${slotDisplay}* (${jamMulai} - ${jamSelesai} WIB)\n`;
        body += `  👤 Siswa: *${namaSiswa}* (${kodeSiswa})\n`;
        body += `  📊 Sesi: ${sesiKe}/${totalSesi} | Mobil: ${jenisMobilLabel}\n`;
        body += `  📍 Alamat: ${alamat}\n`;
        body += `  📱 No. WA: ${noWa}\n\n`;
      });
    });
  }

  body += `────────────────────────\n`;
  body += `*SOP & Catatan Instruktur:*\n`;
  body += `${catatanFooter}`;

  return body;
}

/**
 * Generates Weekly WhatsApp Schedule Markdown
 */
export function generateWhatsAppWeeklyScheduleMarkdown(
  startDateStr: string,
  endDateStr: string,
  daysData: { tanggal: string; groups: InstrukturJadwalGroup[] }[],
  footerTemplate?: string
): string {
  const startFmt = formatDateIndo(startDateStr);
  const endFmt = formatDateIndo(endDateStr);

  let body = `*REKAP JADWAL MINGGUAN AMANAH DRIVE*\n`;
  body += `Periode: *${startFmt}* s/d *${endFmt}*\n`;
  body += `════════════════════════\n\n`;

  daysData.forEach((day) => {
    const tglHeader = formatHariTanggalIndo(day.tanggal);
    body += `📅 *${tglHeader.toUpperCase()}*\n`;
    body += `────────────────────────\n`;

    if (day.groups.length === 0) {
      body += `_Tidak ada jadwal sesi mengemudi._\n\n`;
      return;
    }

    const sortedGroups = [...day.groups].sort((a, b) =>
      a.instrukturNama.localeCompare(b.instrukturNama)
    );

    sortedGroups.forEach((group) => {
      const sortedSesi = sortSesiBySlotUrutan(group.sesiList);

      body += `*${group.instrukturNama.toUpperCase()}*:\n`;

      if (sortedSesi.length === 0) {
        body += `  _Libur / Kosong_\n`;
      } else {
        sortedSesi.forEach((sesi) => {
          const namaSiswa = sesi.siswa?.nama || 'Siswa';
          const slotNama = sesi.slot_waktu?.nama_slot || 'Slot';
          const jamMulai = sesi.slot_waktu?.jam_mulai.substring(0, 5) || '';
          const jamSelesai = (sesi.slot_waktu_akhir || sesi.slot_waktu)?.jam_selesai.substring(0, 5) || '';
          const sesiKe = sesi.nomor_sesi_ke || 1;
          const totalSesi = sesi.total_sesi_paket || 10;
          const statusIcon = sesi.status_sesi === 'selesai' ? '✅' : sesi.status_sesi === 'batal' ? '❌' : '⏳';

          body += `  ${statusIcon} ${slotNama} (${jamMulai}-${jamSelesai}): *${namaSiswa}* [Sesi ${sesiKe}/${totalSesi}]\n`;
        });
      }
      body += `\n`;
    });
  });

  if (footerTemplate) {
    body += `════════════════════════\n`;
    body += `*Catatan:*\n${footerTemplate.trim()}`;
  }

  return body;
}

/**
 * Generates Daily Slot Completion Recap Markdown
 */
export function generateWhatsAppRecapMarkdown(
  tanggalStr: string,
  groupedData: InstrukturJadwalGroup[]
): string {
  const tglFormatted = formatHariTanggalIndo(tanggalStr);

  let totalSelesai = 0;
  let totalTerjadwal = 0;
  let totalBatal = 0;

  groupedData.forEach((g) => {
    g.sesiList.forEach((s) => {
      if (s.status_sesi === 'selesai') totalSelesai++;
      else if (s.status_sesi === 'batal') totalBatal++;
      else totalTerjadwal++;
    });
  });

  let body = `*REKAP PENYELESAIAN SLOT HARIAN*\n`;
  body += `Amanah Drive Palembang\n`;
  body += `Tanggal: *${tglFormatted}*\n`;
  body += `────────────────────────\n`;
  body += `📊 *Ringkasan Status:*\n`;
  body += `✅ Selesai: *${totalSelesai} Sesi*\n`;
  body += `⏳ Terjadwal: *${totalTerjadwal} Sesi*\n`;
  if (totalBatal > 0) body += `❌ Batal: *${totalBatal} Sesi*\n`;
  body += `────────────────────────\n\n`;

  const sortedGroups = [...groupedData].sort((a, b) =>
    a.instrukturNama.localeCompare(b.instrukturNama)
  );

  sortedGroups.forEach((group) => {
    const sortedSesi = sortSesiBySlotUrutan(group.sesiList);
    body += `👨‍🏫 *${group.instrukturNama.toUpperCase()}*:\n`;

    if (sortedSesi.length === 0) {
      body += `  _Tidak ada sesi / Libur_\n\n`;
      return;
    }

    sortedSesi.forEach((sesi) => {
      const slotNama = sesi.slot_waktu?.nama_slot || 'Slot';
      const namaSiswa = sesi.siswa?.nama || 'Siswa';
      const sesiKe = sesi.nomor_sesi_ke || 1;
      const totalSesi = sesi.total_sesi_paket || 10;
      const statusLabel =
        sesi.status_sesi === 'selesai'
          ? '✅ SELESAI'
          : sesi.status_sesi === 'batal'
          ? '❌ BATAL'
          : '⏳ TERJADWAL';

      body += `• ${slotNama}: *${namaSiswa}* (${statusLabel}) [Sesi ${sesiKe}/${totalSesi}]\n`;
    });

    body += `\n`;
  });

  body += `────────────────────────\n`;
  body += `_Laporan otomatis Amanah Drive_`;

  return body;
}
