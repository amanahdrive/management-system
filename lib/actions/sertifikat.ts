'use server';

import { dbQuery } from '@/lib/db';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { getTodayDateString } from '@/lib/utils/date';
import { formatSesiDateRange, generateNomorSertifikat } from '@/lib/utils/certificate';
import { revalidatePath } from 'next/cache';

export type StatusSertifikatEnum = 'siap_cetak' | 'belum_cetak' | 'selesai_cetak';

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
  status_sertifikat: StatusSertifikatEnum;
  nomor_sertifikat: string;
  tanggal_mulai_sesi: string | null;
  tanggal_selesai_sesi: string | null;
  tanggal_kursus_formatted: string;
  instruktur_terbanyak: string;
  instruktur_sesi_count: number;
  instruktur_nama?: string; // alias for instruktur_terbanyak
  is_lulus?: boolean;
  tanggal_cetak_sertifikat: string | null;
  catatan_sertifikat: string | null;
  created_at: string;
}

const SERTIFIKAT_CACHE_KEY = 'sertifikat_siswa_list_v2';

function safeRevalidate() {
  try {
    revalidatePath('/sertifikat');
  } catch {
    // Ignored in non-request contexts
  }
}

/**
 * Fetch list of students with session completion stats and certificate data
 */
export async function getSiswaSertifikatList(): Promise<SiswaSertifikatItem[]> {
  const cached = cacheGet<SiswaSertifikatItem[]>(SERTIFIKAT_CACHE_KEY);
  if (cached && cached.length > 0) return cached;

  try {
    const query = `
      WITH sesi_stats AS (
        SELECT 
          js.siswa_id,
          COUNT(*) AS total_sesi_terdaftar,
          COUNT(*) FILTER (WHERE js.status_sesi = 'selesai') AS total_sesi_selesai,
          COUNT(*) FILTER (WHERE js.status_sesi = 'terjadwal') AS total_sesi_terjadwal,
          MIN(js.tanggal_sesi) AS min_tgl_sesi,
          MAX(js.tanggal_sesi) AS max_tgl_sesi,
          MIN(CASE WHEN js.status_sesi = 'selesai' THEN js.tanggal_sesi END) AS min_tgl_selesai,
          MAX(CASE WHEN js.status_sesi = 'selesai' THEN js.tanggal_sesi END) AS max_tgl_selesai,
          -- Instruktur yang memegang sesi terbanyak (prioritaskan sesi selesai)
          (
            SELECT st.nama 
            FROM jadwal_sesi js2 
            JOIN staff st ON js2.staff_id = st.id 
            WHERE js2.siswa_id = js.siswa_id AND js2.staff_id IS NOT NULL AND js2.status_sesi != 'batal'
            GROUP BY st.id, st.nama 
            ORDER BY 
              COUNT(*) FILTER (WHERE js2.status_sesi = 'selesai') DESC,
              COUNT(*) DESC, 
              MAX(js2.tanggal_sesi) DESC 
            LIMIT 1
          ) AS instruktur_terbanyak,
          (
            SELECT COUNT(*) 
            FROM jadwal_sesi js2 
            WHERE js2.siswa_id = js.siswa_id AND js2.staff_id IS NOT NULL AND js2.status_sesi != 'batal'
            GROUP BY js2.staff_id 
            ORDER BY 
              COUNT(*) FILTER (WHERE js2.status_sesi = 'selesai') DESC,
              COUNT(*) DESC 
            LIMIT 1
          ) AS instruktur_sesi_count
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
        s.status_pembayaran_kode,
        s.status_sertifikat,
        s.nomor_sertifikat,
        s.tanggal_cetak_sertifikat,
        s.catatan_sertifikat,
        s.created_at,
        s.tanggal_rencana_mulai,
        s.tanggal_booking,
        COALESCE(p.nama_paket, 'Paket Kursus') AS paket_nama,
        COALESCE(p.jumlah_sesi, 10) AS jumlah_sesi_paket,
        COALESCE(ss.total_sesi_selesai, 0)::int AS total_sesi_selesai,
        COALESCE(ss.total_sesi_terjadwal, 0)::int AS total_sesi_terjadwal,
        COALESCE(ss.total_sesi_terdaftar, 0)::int AS total_sesi_terdaftar,
        ss.min_tgl_sesi,
        ss.max_tgl_sesi,
        ss.min_tgl_selesai,
        ss.max_tgl_selesai,
        COALESCE(ss.instruktur_terbanyak, 'Belum Ditentukan') AS instruktur_terbanyak,
        COALESCE(ss.instruktur_sesi_count, 0)::int AS instruktur_sesi_count
      FROM siswa s
      LEFT JOIN paket p ON s.paket_id = p.id
      LEFT JOIN sesi_stats ss ON s.id = ss.siswa_id
      WHERE s.is_archived IS NOT TRUE
      ORDER BY 
        CASE 
          WHEN s.status_sertifikat = 'selesai_cetak' THEN 2
          WHEN COALESCE(ss.total_sesi_selesai, 0) >= (COALESCE(p.jumlah_sesi, 10) - 2) AND COALESCE(ss.total_sesi_selesai, 0) > 0 THEN 0
          ELSE 1
        END ASC,
        s.created_at DESC;
    `;

    const rows = await dbQuery<any>(query);

    const items: SiswaSertifikatItem[] = rows.map((r) => {
      const totalSelesai = Number(r.total_sesi_selesai) || 0;
      const jumlahPaket = Number(r.jumlah_sesi_paket) || 10;
      const thresholdSiapCetak = Math.max(1, jumlahPaket - 2);

      // Logika Status Sertifikat:
      // 1. Jika sudah ditandai selesai dicetak -> 'selesai_cetak'
      // 2. Jika sudah mencapai 2 sesi terakhir (>= jumlah_sesi - 2) -> 'siap_cetak'
      // 3. Selain itu -> 'belum_cetak'
      let computedStatus: StatusSertifikatEnum = 'belum_cetak';
      if (r.status_sertifikat === 'selesai_cetak') {
        computedStatus = 'selesai_cetak';
      } else if (totalSelesai >= thresholdSiapCetak && totalSelesai > 0) {
        computedStatus = 'siap_cetak';
      } else {
        computedStatus = 'belum_cetak';
      }

      // Rentang Tanggal Sesi
      const tglMulai = (r.min_tgl_sesi || r.tanggal_rencana_mulai || r.tanggal_booking || '').slice(0, 10);
      const tglSelesai = (r.max_tgl_sesi || r.max_tgl_selesai || r.tanggal_rencana_mulai || r.tanggal_booking || '').slice(0, 10);
      const tanggalFormatted = formatSesiDateRange(tglMulai, tglSelesai);

      // Nomor Sertifikat
      const nomorSertif = (r.nomor_sertifikat && r.nomor_sertifikat.trim())
        ? r.nomor_sertifikat.trim()
        : generateNomorSertifikat(r.kode_siswa, tglSelesai || getTodayDateString());

      return {
        id: r.id,
        kode_siswa: r.kode_siswa,
        nama: r.nama,
        no_whatsapp: r.no_whatsapp || '',
        alamat: r.alamat || '',
        paket_id: r.paket_id,
        paket_nama: r.paket_nama,
        jumlah_sesi_paket: jumlahPaket,
        total_sesi_selesai: totalSelesai,
        total_sesi_terjadwal: Number(r.total_sesi_terjadwal) || 0,
        total_sesi_terdaftar: Number(r.total_sesi_terdaftar) || 0,
        status_pembayaran_kode: r.status_pembayaran_kode || 'belum_bayar',
        status_sertifikat: computedStatus,
        nomor_sertifikat: nomorSertif,
        tanggal_mulai_sesi: tglMulai || null,
        tanggal_selesai_sesi: tglSelesai || null,
        tanggal_kursus_formatted: tanggalFormatted,
        instruktur_terbanyak: r.instruktur_terbanyak,
        instruktur_sesi_count: Number(r.instruktur_sesi_count) || 0,
        instruktur_nama: r.instruktur_terbanyak,
        is_lulus: computedStatus !== 'belum_cetak',
        tanggal_cetak_sertifikat: r.tanggal_cetak_sertifikat || null,
        catatan_sertifikat: r.catatan_sertifikat || null,
        created_at: r.created_at,
      };
    });

    cacheSet(SERTIFIKAT_CACHE_KEY, items, 60);
    return items;
  } catch (err) {
    console.error('Error in getSiswaSertifikatList:', err);
    return [];
  }
}

/**
 * Toggle atau ubah status cetak sertifikat siswa
 */
export async function updateStatusSertifikat(
  siswaId: string,
  newStatus: 'selesai_cetak' | 'belum_cetak',
  nomorSertifikat?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const isSelesai = newStatus === 'selesai_cetak';
    const tglCetak = isSelesai ? new Date().toISOString() : null;

    if (nomorSertifikat && nomorSertifikat.trim()) {
      await dbQuery(
        `UPDATE siswa 
         SET status_sertifikat = $1, 
             nomor_sertifikat = $2, 
             tanggal_cetak_sertifikat = $3, 
             updated_at = NOW() 
         WHERE id = $4`,
        [newStatus, nomorSertifikat.trim(), tglCetak, siswaId]
      );
    } else {
      await dbQuery(
        `UPDATE siswa 
         SET status_sertifikat = $1, 
             tanggal_cetak_sertifikat = $2, 
             updated_at = NOW() 
         WHERE id = $3`,
        [newStatus, tglCetak, siswaId]
      );
    }

    cacheInvalidate('sertifikat_*');
    cacheInvalidate('siswa_*');
    safeRevalidate();
    return { success: true };
  } catch (err: any) {
    console.error('Error updateStatusSertifikat:', err);
    return { success: false, error: err?.message || 'Gagal mengubah status sertifikat' };
  }
}

/**
 * Edit nomor sertifikat atau catatan sertifikat siswa
 */
export async function updateNomorSertifikat(
  siswaId: string,
  nomorSertifikat: string,
  catatan?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery(
      `UPDATE siswa 
       SET nomor_sertifikat = $1, 
           catatan_sertifikat = $2, 
           updated_at = NOW() 
       WHERE id = $3`,
      [nomorSertifikat.trim(), catatan ? catatan.trim() : null, siswaId]
    );

    cacheInvalidate('sertifikat_*');
    cacheInvalidate('siswa_*');
    safeRevalidate();
    return { success: true };
  } catch (err: any) {
    console.error('Error updateNomorSertifikat:', err);
    return { success: false, error: err?.message || 'Gagal memperbarui nomor sertifikat' };
  }
}
