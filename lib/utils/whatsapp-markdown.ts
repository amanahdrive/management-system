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
  footerTemplate?: string,
  staffFilterNama?: string
): string {
  const tglFormatted = formatHariTanggalIndo(tanggalStr);

  const defaultFooter =
    '• Instruktur Hubungi Siswa sebelum berangkat.\n' +
    '• Laporan keluar Basecamp beserta foto odometer.\n' +
    '• Laporan saat sesi dimulai.\n' +
    '• Laporan saat sesi selesai.\n' +
    '• Laporan kembali ke Basecamp beserta foto odometer.';

  const catatanFooter = footerTemplate?.trim() || defaultFooter;

  let body = `*JADWAL OPERASIONAL HARIAN AMANAH DRIVE*\n`;
  body += `Tanggal: *${tglFormatted}*\n`;
  if (staffFilterNama) {
    body += `Instruktur: *${staffFilterNama.toUpperCase()}*\n`;
  }
  body += `\n────────────────────────\n\n`;

  // Saring hanya sesi yang berstatus 'terjadwal' (abaikan sesi 'selesai' dan 'batal')
  const activeGroups = groupedData
    .map((g) => ({
      ...g,
      sesiList: sortSesiBySlotUrutan(
        g.sesiList.filter((s) => s.status_sesi === 'terjadwal')
      ),
    }))
    .filter((g) => g.sesiList.length > 0)
    .sort((a, b) => a.instrukturNama.localeCompare(b.instrukturNama));

  if (activeGroups.length === 0) {
    body += `_Tidak ada sesi mengemudi terjadwal pada tanggal ini._\n\n`;
  } else {
    activeGroups.forEach((group, idx) => {
      if (idx > 0) {
        body += `────────────────────────\n\n`;
      }

      body += `*Instruktur: ${group.instrukturNama.toUpperCase()}*\n\n`;

      group.sesiList.forEach((sesi) => {
        const namaSiswa = sesi.siswa?.nama || 'Siswa';
        const noWa = sesi.siswa?.no_whatsapp || '-';
        const alamat = sesi.siswa?.alamat || '-';
        const totalPaket = sesi.total_sesi_paket || 10;
        const sesiKe = sesi.nomor_sesi_ke || 1;

        let slotHeader = 'Slot Sesi';
        if (sesi.slot_waktu) {
          const namaSlotAwal = sesi.slot_waktu.nama_slot;
          const jamMulai = sesi.slot_waktu.jam_mulai
            ? sesi.slot_waktu.jam_mulai.substring(0, 5).replace(':', '.')
            : '';
          let jamSelesai = sesi.slot_waktu.jam_selesai
            ? sesi.slot_waktu.jam_selesai.substring(0, 5).replace(':', '.')
            : '';

          if (sesi.slot_waktu_akhir && sesi.slot_waktu_akhir.id !== sesi.slot_waktu.id) {
            const namaSlotAkhir = sesi.slot_waktu_akhir.nama_slot;
            if (sesi.slot_waktu_akhir.jam_selesai) {
              jamSelesai = sesi.slot_waktu_akhir.jam_selesai.substring(0, 5).replace(':', '.');
            }
            const timeStr = jamMulai && jamSelesai ? ` (${jamMulai} - ${jamSelesai})` : '';
            slotHeader = `${namaSlotAwal} s/d ${namaSlotAkhir}${timeStr}`;
          } else {
            const timeStr = jamMulai && jamSelesai ? ` (${jamMulai} - ${jamSelesai})` : '';
            slotHeader = `${namaSlotAwal}${timeStr}`;
          }
        }

        body += `• *${slotHeader}*\n`;
        body += `Siswa: *${namaSiswa}*\n`;
        body += `Sesi: ${sesiKe}/${totalPaket}\n`;
        body += `Alamat: *${alamat}*\n`;
        body += `No. WA: *${noWa}*\n\n`;
      });
    });
  }

  body += `────────────────────────\n\n`;
  body += `*SOP & Catatan Instruktur:*\n`;
  body += `${catatanFooter}`;

  return body;
}

/**
 * Generates Weekly or Custom Range WhatsApp Schedule Markdown
 */
export function generateWhatsAppRangeScheduleMarkdown(
  startDateStr: string,
  endDateStr: string,
  daysData: { tanggal: string; groups: InstrukturJadwalGroup[] }[],
  isWeeklySundaySaturday: boolean = false,
  staffFilterNama?: string,
  footerTemplate?: string
): string {
  const startFmt = formatHariTanggalIndo(startDateStr);
  const endFmt = formatHariTanggalIndo(endDateStr);

  const titleHeader = isWeeklySundaySaturday
    ? '*REKAP JADWAL MINGGUAN (MINGGU - SABTU)*'
    : '*REKAP JADWAL SESI (RENTANG TANGGAL)*';

  // Compute total statistics across all days
  let grandTotal = 0;
  let totalSelesai = 0;
  let totalTerjadwal = 0;
  let totalBatal = 0;

  daysData.forEach((day) => {
    day.groups.forEach((g) => {
      g.sesiList.forEach((s) => {
        grandTotal++;
        if (s.status_sesi === 'selesai') totalSelesai++;
        else if (s.status_sesi === 'batal') totalBatal++;
        else totalTerjadwal++;
      });
    });
  });

  let body = `${titleHeader}\n`;
  body += `Amanah Drive Palembang\n`;
  body += `Periode: *${startFmt}* s/d *${endFmt}*\n`;
  if (staffFilterNama) {
    body += `Instruktur: *${staffFilterNama.toUpperCase()}*\n`;
  }
  body += `════════════════════════\n`;
  body += `*Ringkasan Periode:*\n`;
  body += `• Total Sesi: *${grandTotal} Sesi*\n`;
  body += `• Selesai: *${totalSelesai}*\n`;
  body += `• Terjadwal: *${totalTerjadwal}*\n`;
  if (totalBatal > 0) body += `• Batal: *${totalBatal}*\n`;
  body += `════════════════════════\n\n`;

  if (grandTotal === 0) {
    body += `_Tidak ada jadwal sesi mengemudi pada rentang periode ini._\n\n`;
  } else {
    daysData.forEach((day) => {
      const tglHeader = formatHariTanggalIndo(day.tanggal);
      const dayTotalSesi = day.groups.reduce((acc, g) => acc + g.sesiList.length, 0);

      body += `*${tglHeader.toUpperCase()}* (${dayTotalSesi} Sesi)\n`;
      body += `────────────────────────\n`;

      if (day.groups.length === 0 || dayTotalSesi === 0) {
        body += `  _Tidak ada jadwal sesi / Libur_\n\n`;
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
            const kodeSiswa = sesi.siswa?.kode_siswa || '-';
            const noWa = sesi.siswa?.no_whatsapp || '-';
            const alamat = sesi.siswa?.alamat || '-';
            const slotNama = sesi.slot_waktu?.nama_slot || 'Slot';
            const jamMulai = sesi.slot_waktu?.jam_mulai?.substring(0, 5) || '';
            const jamSelesai = (sesi.slot_waktu_akhir || sesi.slot_waktu)?.jam_selesai?.substring(0, 5) || '';
            const sesiKe = sesi.nomor_sesi_ke || 1;
            const totalSesi = sesi.total_sesi_paket || 10;
            const statusText = sesi.status_sesi === 'selesai' ? '[SELESAI]' : sesi.status_sesi === 'batal' ? '[BATAL]' : '[TERJADWAL]';

            body += `  ${statusText} *${slotNama}* (${jamMulai}-${jamSelesai} WIB)\n`;
            body += `     Siswa: ${namaSiswa} (${kodeSiswa}) [Sesi ${sesiKe}/${totalSesi}]\n`;
            body += `     Alamat: ${alamat} | No. WA: ${noWa}\n`;
          });
        }
        body += `\n`;
      });
    });
  }

  const defaultFooter =
    '• Minta share lokasi kepada klien sebelum berangkat.\n' +
    '• Laporan keluar Basecamp beserta foto odometer.\n' +
    '• Laporan saat sesi dimulai dan selesai.';
  const catatanFooter = footerTemplate?.trim() || defaultFooter;

  body += `════════════════════════\n`;
  body += `*SOP Instruktur:*\n${catatanFooter}`;

  return body;
}

/**
 * Legacy wrapper for Weekly WhatsApp Schedule
 */
export function generateWhatsAppWeeklyScheduleMarkdown(
  startDateStr: string,
  endDateStr: string,
  daysData: { tanggal: string; groups: InstrukturJadwalGroup[] }[],
  footerTemplate?: string,
  staffFilterNama?: string
): string {
  return generateWhatsAppRangeScheduleMarkdown(
    startDateStr,
    endDateStr,
    daysData,
    true,
    staffFilterNama,
    footerTemplate
  );
}

import { formatRupiah } from './currency';

export interface RecapRates {
  feeOperasional: number;
  feePribadi: number;
  uangMakanHarian: number;
}

/**
 * Generates Structured Slot & Session Completion Recap Markdown with Instructor Salary & Meal Allowance
 */
export function generateWhatsAppRecapMarkdown(
  startDateStr: string,
  endDateStr: string,
  groupedData: InstrukturJadwalGroup[],
  rates: RecapRates = { feeOperasional: 50000, feePribadi: 70000, uangMakanHarian: 15000 },
  staffFilterNama?: string
): string {
  const isSingleDay = startDateStr === endDateStr;
  const periodeText = isSingleDay
    ? formatHariTanggalIndo(startDateStr)
    : `${formatDateIndo(startDateStr)} s/d ${formatDateIndo(endDateStr)}`;

  let grandTotalSesi = 0;
  let grandTotalSlot = 0;
  let grandTotalHonor = 0;

  let body = `*📋 REKAP KINERJA & ESTIMASI HONOR INSTRUKTUR*\n`;
  body += `*Amanah Drive Palembang*\n`;
  body += `Periode: *${periodeText}*\n`;
  if (staffFilterNama) {
    body += `Instruktur: *${staffFilterNama.toUpperCase()}*\n`;
  }
  body += `────────────────────────\n\n`;

  const sortedGroups = [...groupedData].sort((a, b) =>
    a.instrukturNama.localeCompare(b.instrukturNama)
  );

  sortedGroups.forEach((group, index) => {
    const allSesi = group.sesiList;
    const selesaiSesi = allSesi.filter((s) => s.status_sesi === 'selesai');

    let slotCount = 0;
    let operasionalSesiCount = 0;
    let pribadiSesiCount = 0;
    const activeDatesSet = new Set<string>();
    const siswaNamesSet = new Set<string>();

    selesaiSesi.forEach((s) => {
      // Slot calculation: if multi-slot (e.g. slot 1 & 2), calculate 2 slots, else 1
      const isDoubleSlot = Boolean(s.slot_waktu_id_akhir && s.slot_waktu_id_akhir !== s.slot_waktu_id);
      slotCount += isDoubleSlot ? 2 : 1;

      if (s.tipe_kendaraan === 'pribadi' || s.jenis_mobil === 'mobil_sendiri') {
        pribadiSesiCount += 1;
      } else {
        operasionalSesiCount += 1;
      }

      if (s.tanggal_sesi) {
        activeDatesSet.add(s.tanggal_sesi);
      }

      if (s.siswa?.nama) {
        siswaNamesSet.add(s.siswa.nama.trim());
      }
    });

    const activeDays = activeDatesSet.size;
    const totalSesi = selesaiSesi.length;
    const siswaListArray = Array.from(siswaNamesSet);

    const feeOperasional = operasionalSesiCount * rates.feeOperasional;
    const feePribadi = pribadiSesiCount * rates.feePribadi;
    const uangMakan = activeDays * rates.uangMakanHarian;
    const totalHonorInstruktur = feeOperasional + feePribadi + uangMakan;

    grandTotalSesi += totalSesi;
    grandTotalSlot += slotCount;
    grandTotalHonor += totalHonorInstruktur;

    body += `*${index + 1}. ${group.instrukturNama.toUpperCase()}*\n`;

    if (totalSesi === 0) {
      const terjadwalCount = allSesi.filter((s) => s.status_sesi === 'terjadwal').length;
      if (terjadwalCount > 0) {
        body += `• Status: _${terjadwalCount} sesi terjadwal (belum selesai)_\n\n`;
      } else {
        body += `• Status: _Tidak ada sesi / Libur_\n\n`;
      }
      return;
    }

    body += `• Hari Bertugas Aktif: *${activeDays} Hari*\n`;
    body += `• Total Slot Selesai: *${slotCount} Slot* (${totalSesi} Sesi)\n`;
    if (pribadiSesiCount > 0) {
      body += `  - Mobil Operasional: ${operasionalSesiCount} Sesi\n`;
      body += `  - Mobil Pribadi: ${pribadiSesiCount} Sesi\n`;
    }

    if (siswaListArray.length > 0) {
      body += `• Siswa Ditangani (${siswaListArray.length} Orang):\n`;
      body += `  _${siswaListArray.join(', ')}_\n`;
    }

    body += `• *Estimasi Honor & Uang Makan:*\n`;
    if (operasionalSesiCount > 0) {
      body += `  - Fee Mobil Operasional: ${formatRupiah(feeOperasional)} (${operasionalSesiCount} sesi x ${formatRupiah(rates.feeOperasional)})\n`;
    }
    if (pribadiSesiCount > 0) {
      body += `  - Fee Mobil Pribadi: ${formatRupiah(feePribadi)} (${pribadiSesiCount} sesi x ${formatRupiah(rates.feePribadi)})\n`;
    }
    if (activeDays > 0) {
      body += `  - Uang Makan: ${formatRupiah(uangMakan)} (${activeDays} hari x ${formatRupiah(rates.uangMakanHarian)})\n`;
    }
    body += `  👉 *Total: ${formatRupiah(totalHonorInstruktur)}*\n\n`;
  });

  body += `────────────────────────\n`;
  body += `*GRAND TOTAL OPERASIONAL:*\n`;
  body += `• Total Slot Selesai: *${grandTotalSlot} Slot* (${grandTotalSesi} Sesi)\n`;
  body += `• Total Estimasi Honor & Uang Makan: *${formatRupiah(grandTotalHonor)}*\n`;
  body += `────────────────────────\n`;
  body += `_Laporan rekap otomatis Amanah Drive_`;

  return body;
}
