// lib/utils/whatsapp-markdown.ts
import { JadwalSesi } from '@/types/database';
import { formatHariTanggalIndo } from './date';

export interface InstrukturJadwalGroup {
  instrukturNama: string;
  sesiList: JadwalSesi[];
}

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
  body += `Tanggal: ${tglFormatted}\n`;
  body += `----------------------------------------\n`;
  body += `*Jadwal Sesi Kursus:*\n\n`;

  if (groupedData.length === 0) {
    body += `_Belum ada jadwal sesi untuk tanggal ini._\n\n`;
  } else {
    groupedData.forEach((group) => {
      body += `Instruktur: *${group.instrukturNama.toUpperCase()}*\n\n`;

      group.sesiList.forEach((sesi) => {
        const namaSiswa = sesi.siswa?.nama || 'Siswa Kustom';
        const kodeSiswa = sesi.siswa?.kode_siswa || '-';
        const noWa = sesi.siswa?.no_whatsapp || '-';
        const alamat = sesi.siswa?.alamat || '-';

        const totalSesi = sesi.total_sesi_paket || 10;
        const sesiKe = sesi.nomor_sesi_ke || 1;

        let slotDisplay = '';
        let jamMulai = '';
        let jamSelesai = '';

        if (sesi.slot_waktu) {
          if (sesi.slot_waktu_akhir && sesi.slot_waktu_akhir.id !== sesi.slot_waktu.id) {
            slotDisplay = `${sesi.slot_waktu.nama_slot.replace(/Slot\s*/i, '')} - ${sesi.slot_waktu_akhir.nama_slot.replace(/Slot\s*/i, '')}`;
            jamMulai = sesi.slot_waktu.jam_mulai.substring(0, 5);
            jamSelesai = sesi.slot_waktu_akhir.jam_selesai.substring(0, 5);
          } else {
            slotDisplay = sesi.slot_waktu.nama_slot.replace(/Slot\s*/i, '');
            jamMulai = sesi.slot_waktu.jam_mulai.substring(0, 5);
            jamSelesai = sesi.slot_waktu.jam_selesai.substring(0, 5);
          }
        }

        let jenisMobilLabel = 'Manual';
        if (sesi.jenis_mobil === 'matic') jenisMobilLabel = 'Matic';
        if (sesi.jenis_mobil === 'mobil_sendiri') jenisMobilLabel = 'Mobil Sendiri';

        body += `• *${namaSiswa}* (${kodeSiswa})\n`;
        body += `  Sesi: ${sesiKe}/${totalSesi} | Slot ${slotDisplay}: ${jamMulai} - ${jamSelesai}\n`;
        body += `  Paket: ${totalSesi}x | Mobil: ${jenisMobilLabel}\n`;
        body += `  Alamat: ${alamat}\n`;
        body += `  No. WA: ${noWa}\n\n`;
      });
    });
  }

  body += `----------------------------------------\n`;
  body += `*Catatan Instruktur:*\n`;
  body += `${catatanFooter}`;

  return body;
}
