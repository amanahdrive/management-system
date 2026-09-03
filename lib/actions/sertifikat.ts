'use server';

import { dbQuery } from '@/lib/db';
import { cacheGet, cacheSet } from '@/lib/utils/cache';
import { getTodayDateString } from '@/lib/utils/date';
import { formatSesiDateRange, generateNomorSertifikat } from '@/lib/utils/certificate';

export interface SiswaSertifikatItem {
  id: string; // siswa_id
  kode_siswa: string;
  nama: string;
  no_whatsapp: string;
  alamat?: string;
  paket_id: string;
  paket_nama: string;
  jumlah_sesi_paket: number;
  total_sesi_selesai: number;
  total_sesi_terjadwal: number;
  total_sesi_terdaftar: number;
  status_pembayaran_kode: string;
  tanggal_mulai_sesi: string | null;
  tanggal_selesai_sesi: string | null;
  tanggal_range_formatted: string;
  instruktur_id: string | null;
  instruktur_nama: string;
  nomor_sertifikat: string;
  is_lulus: boolean;
}

export interface CertificateData {
  nomorSertifikat: string;
  namaSiswa: string;
  kodeSiswa: string;
  paketNama: string;
  tanggalRangeSesi: string;
  tanggalCetak: string;
  namaInstruktur: string;
  namaPimpinan: string;
  predikat: string;
  lokasi: string;
}

/**
 * Fetch list of students with session completion stats for certificate generation
 */
export async function getSiswaSertifikatList(): Promise<SiswaSertifikatItem[]> {
  const cacheKey = 'sertifikat_siswa_list';
  const cached = cacheGet<SiswaSertifikatItem[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  try {
    const query = `
      WITH sesi_stats AS (
        SELECT 
          js.siswa_id,
          COUNT(*) AS total_sesi_terdaftar,
          COUNT(*) FILTER (WHERE js.status_sesi = 'selesai') AS total_sesi_selesai,
          COUNT(*) FILTER (WHERE js.status_sesi = 'terjadwal') AS total_sesi_terjadwal,
          MIN(CASE WHEN js.status_sesi = 'selesai' THEN js.tanggal_sesi END) AS min_tgl_selesai,
          MAX(CASE WHEN js.status_sesi = 'selesai' THEN js.tanggal_sesi END) AS max_tgl_selesai,
          MIN(js.tanggal_sesi) AS min_tgl_sesi,
          MAX(js.tanggal_sesi) AS max_tgl_sesi,
          -- Mode / most frequent instructor for this student
          (
            SELECT js2.staff_id 
            FROM jadwal_sesi js2 
            WHERE js2.siswa_id = js.siswa_id AND js2.staff_id IS NOT NULL 
            GROUP BY js2.staff_id 
            ORDER BY COUNT(*) DESC, MAX(js2.tanggal_sesi) DESC 
            LIMIT 1
          ) AS primary_staff_id
        FROM jadwal_sesi js
        WHERE js.status_sesi != 'batal'
        GROUP BY js.siswa_id
      )
      SELECT 
        s.id,
        s.kode_siswa,
        s.nama,
        s.no_whatsapp,
        s.alamat,
        s.paket_id,
        COALESCE(p.nama_paket, 'Paket Kursus') AS paket_nama,
        COALESCE(p.jumlah_sesi, 10) AS jumlah_sesi_paket,
        COALESCE(ss.total_sesi_selesai, 0)::int AS total_sesi_selesai,
        COALESCE(ss.total_sesi_terjadwal, 0)::int AS total_sesi_terjadwal,
        COALESCE(ss.total_sesi_terdaftar, 0)::int AS total_sesi_terdaftar,
        s.status_pembayaran_kode,
        COALESCE(ss.min_tgl_selesai::text, ss.min_tgl_sesi::text, s.tanggal_rencana_mulai::text, s.tanggal_booking::text) AS tanggal_mulai_sesi,
        COALESCE(ss.max_tgl_selesai::text, ss.max_tgl_sesi::text, s.tanggal_rencana_mulai::text, s.tanggal_booking::text) AS tanggal_selesai_sesi,
        ss.primary_staff_id AS instruktur_id,
        COALESCE(st.nama, 'Syawal Putra') AS instruktur_nama
      FROM siswa s
      LEFT JOIN paket p ON s.paket_id = p.id
      LEFT JOIN sesi_stats ss ON s.id = ss.siswa_id
      LEFT JOIN staff st ON ss.primary_staff_id = st.id
      ORDER BY 
        CASE WHEN COALESCE(ss.total_sesi_selesai, 0) >= COALESCE(p.jumlah_sesi, 10) AND COALESCE(ss.total_sesi_selesai, 0) > 0 THEN 0 ELSE 1 END ASC,
        s.created_at DESC;
    `;

    const rows = await dbQuery<any>(query);

    const items: SiswaSertifikatItem[] = rows.map((r) => {
      const totalSelesai = Number(r.total_sesi_selesai) || 0;
      const jumlahPaket = Number(r.jumlah_sesi_paket) || 10;
      const isLulus = (totalSelesai >= jumlahPaket && totalSelesai > 0) || (totalSelesai > 0 && r.total_sesi_terjadwal === 0);

      const tglMulai = r.tanggal_mulai_sesi ? r.tanggal_mulai_sesi.slice(0, 10) : null;
      const tglSelesai = r.tanggal_selesai_sesi ? r.tanggal_selesai_sesi.slice(0, 10) : null;

      const dateRangeFormatted = formatSesiDateRange(tglMulai, tglSelesai);
      const nomorSertif = generateNomorSertifikat(r.kode_siswa, tglSelesai || getTodayDateString());

      return {
        id: r.id,
        kode_siswa: r.kode_siswa,
        nama: r.nama,
        no_whatsapp: r.no_whatsapp,
        alamat: r.alamat,
        paket_id: r.paket_id,
        paket_nama: r.paket_nama,
        jumlah_sesi_paket: jumlahPaket,
        total_sesi_selesai: totalSelesai,
        total_sesi_terjadwal: Number(r.total_sesi_terjadwal) || 0,
        total_sesi_terdaftar: Number(r.total_sesi_terdaftar) || 0,
        status_pembayaran_kode: r.status_pembayaran_kode || 'belum_bayar',
        tanggal_mulai_sesi: tglMulai,
        tanggal_selesai_sesi: tglSelesai,
        tanggal_range_formatted: dateRangeFormatted,
        instruktur_id: r.instruktur_id,
        instruktur_nama: r.instruktur_nama || 'Syawal Putra',
        nomor_sertifikat: nomorSertif,
        is_lulus: isLulus,
      };
    });

    cacheSet(cacheKey, items, 60);
    return items;
  } catch (err) {
    console.error('Error in getSiswaSertifikatList:', err);
    return [];
  }
}
