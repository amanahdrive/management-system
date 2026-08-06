// lib/telegram/laporan-harian.ts
import { formatHariTanggalIndo } from '../utils/date';
import { formatRupiah } from '../utils/currency';

export interface LaporanHarianData {
  tanggal: string; // YYYY-MM-DD
  kemarin: {
    sesiSelesai: number;
    siswaBaru: number;
    pemasukan: number;
    pengeluaran: number;
  };
  jadwalHariIni: {
    instrukturNama: string;
    jumlahSesi: number;
  }[];
  saldoKasAktif: number;
  perhatianKendaraan: string[];
  perhatianHutang: string[];
}

export function buildLaporanHarianHTML(data: LaporanHarianData): string {
  const tglFormatted = formatHariTanggalIndo(data.tanggal);

  let html = `<b>LAPORAN HARIAN AMANAH DRIVE</b>\n`;
  html += `${tglFormatted}\n\n`;

  html += `<b>Ringkasan Kemarin:</b>\n`;
  html += `- Sesi selesai: ${data.kemarin.sesiSelesai}\n`;
  html += `- Siswa baru: ${data.kemarin.siswaBaru}\n`;
  html += `- Pemasukan: ${formatRupiah(data.kemarin.pemasukan)}\n`;
  html += `- Pengeluaran: ${formatRupiah(data.kemarin.pengeluaran)}\n\n`;

  html += `<b>Jadwal Hari Ini:</b>\n`;
  if (data.jadwalHariIni.length === 0) {
    html += `- Tidak ada sesi terjadwal hari ini\n`;
  } else {
    data.jadwalHariIni.forEach((item) => {
      html += `- ${item.instrukturNama}: ${item.jumlahSesi} sesi\n`;
    });
  }
  html += `\n`;

  html += `<b>Saldo Kas Aktif:</b> ${formatRupiah(data.saldoKasAktif)}\n\n`;

  const totalPerhatian = data.perhatianKendaraan.length + data.perhatianHutang.length;
  if (totalPerhatian > 0) {
    html += `<b>Perhatian:</b>\n`;
    data.perhatianKendaraan.forEach((k) => {
      html += `- ${k}\n`;
    });
    data.perhatianHutang.forEach((h) => {
      html += `- ${h}\n`;
    });
  } else {
    html += `<b>Perhatian:</b>\n- Semuanya berjalan lancar.\n`;
  }

  return html;
}
