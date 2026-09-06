'use server';

import { dbQuery, dbQuerySingle } from '@/lib/db';
import { cacheGet, cacheSet } from '@/lib/utils/cache';
import { getTodayDateString, getJakartaDateParts } from '@/lib/utils/date';

export interface SesiHariIniItem {
  id: string;
  siswaId: string;
  namaSiswa: string;
  kodeSiswa: string;
  noWhatsapp: string;
  nomorSesiKe: number;
  totalSesiPaket: number;
  namaInstruktur: string;
  namaKendaraan: string;
  platNomor: string;
  namaSlot: string;
  urutanSlot: number;
  statusSesi: 'terjadwal' | 'selesai' | 'batal';
  tipeKendaraan: string;
}

export interface DashboardMetrics {
  siswaBelumDijadwalkan: number;
  siswaOnProgress: number;
  siswaSelesai: number;
  siswaBaruBulanIni: number;
  totalPendapatanBulanIni: number;
  totalPengeluaranBulanIni: number;
  labaBersihBulanIni: number;
  saldoKasAktif: number;
  sesiTerjadwalHariIni: number;
  sesiSelesaiHariIni: number;
  sesiHariIniList: SesiHariIniItem[];
  sumberLeads: { name: string; value: number }[];
  kendaraanPerluPerhatian: { nama: string; plat: string; alasan: string }[];
  trenPendaftaran: { bulan: string; total: number }[];
  trenCashflow: { bulan: string; pemasukan: number; pengeluaran: number; net: number }[];
  siswaSiapSimCount: number;
  siswaBelumLunasCount: number;
  totalArmadaAktif: number;
}

const DASHBOARD_CACHE_KEY = 'dashboard_metrics_v2';

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const cached = cacheGet<DashboardMetrics>(DASHBOARD_CACHE_KEY);
  if (cached) return cached;

  const todayStr = getTodayDateString();
  const jakartaParts = getJakartaDateParts(todayStr);
  const currentYear = jakartaParts?.year ?? new Date().getFullYear();
  const currentMonth = (jakartaParts?.month ?? 1) - 1;

  const sixMonthsAgoYear = currentMonth < 5 ? currentYear - 1 : currentYear;
  const sixMonthsAgoMonth = currentMonth < 5 ? currentMonth + 7 : currentMonth - 5;
  const sixMonthsAgoStr = `${sixMonthsAgoYear}-${String(sixMonthsAgoMonth + 1).padStart(2, '0')}-01`;
  const firstDayThisMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  try {
    const [
      summaryRow,
      leadsRows,
      kasMetrics,
      sesiHariIniData,
      kendaraanList,
      trenSiswaData,
      trenKasData,
    ] = await Promise.all([
      // 1. Consolidated student & session progress KPIs (replaces 4 raw table fetches)
      dbQuerySingle<{
        siswa_belum_dijadwalkan: number;
        siswa_on_progress: number;
        siswa_selesai: number;
        siswa_baru_bulan_ini: number;
        siswa_siap_sim: number;
        siswa_belum_lunas: number;
      }>(`
        WITH siswa_calc AS (
          SELECT
            s.id,
            s.status_pembayaran_kode,
            COALESCE(s.status_sim, 'belum') AS status_sim,
            COALESCE(p.termasuk_sim, false) AS termasuk_sim,
            s.tanggal_booking,
            COALESCE(ss.has_sessions, false) AS has_sessions,
            COALESCE(ss.has_pending, false) AS has_pending
          FROM siswa s
          LEFT JOIN paket p ON s.paket_id = p.id
          LEFT JOIN (
            SELECT 
              siswa_id, 
              true AS has_sessions,
              BOOL_OR(status_sesi = 'terjadwal') AS has_pending
            FROM jadwal_sesi
            WHERE status_sesi != 'batal'
            GROUP BY siswa_id
          ) ss ON s.id = ss.siswa_id
        )
        SELECT
          COUNT(*) FILTER (WHERE NOT has_sessions)::int AS siswa_belum_dijadwalkan,
          COUNT(*) FILTER (WHERE has_pending)::int AS siswa_on_progress,
          COUNT(*) FILTER (WHERE status_pembayaran_kode = 'lunas' AND has_sessions AND NOT has_pending)::int AS siswa_selesai,
          COUNT(*) FILTER (WHERE tanggal_booking >= $1)::int AS siswa_baru_bulan_ini,
          COUNT(*) FILTER (WHERE termasuk_sim AND status_pembayaran_kode = 'lunas' AND status_sim != 'selesai')::int AS siswa_siap_sim,
          COUNT(*) FILTER (WHERE status_pembayaran_kode != 'lunas')::int AS siswa_belum_lunas
        FROM siswa_calc;
      `, [firstDayThisMonth]),

      // 2. Lead channels aggregated in SQL
      dbQuery<{ sumber: string; sumber_kustom_text: string | null; total: number }>(`
        SELECT 
          COALESCE(sumber::text, 'organik') AS sumber,
          sumber_kustom_text,
          COUNT(*)::int AS total
        FROM siswa
        GROUP BY COALESCE(sumber::text, 'organik'), sumber_kustom_text;
      `),

      // 3. Cashflow metrics
      dbQuerySingle<{ pendapatan_bulan_ini: number; pengeluaran_bulan_ini: number; saldo_kas_aktif: number }>(
        `SELECT
          COALESCE(SUM(CASE WHEN tipe = 'pemasukan' AND tanggal >= $1 THEN nominal ELSE 0 END), 0) AS pendapatan_bulan_ini,
          COALESCE(SUM(CASE WHEN tipe = 'pengeluaran' AND tanggal >= $1 THEN nominal ELSE 0 END), 0) AS pengeluaran_bulan_ini,
          COALESCE(SUM(CASE WHEN tipe = 'pemasukan' THEN nominal ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN tipe = 'pengeluaran' THEN nominal ELSE 0 END), 0) AS saldo_kas_aktif
        FROM kas_transaksi`,
        [firstDayThisMonth]
      ),

      // 4. Today's sessions
      dbQuery<{
        id: string;
        siswa_id: string;
        nama_siswa: string;
        kode_siswa: string;
        no_whatsapp: string;
        nomor_sesi_ke: number;
        total_sesi_paket: number;
        nama_staff: string;
        nama_kendaraan: string | null;
        plat_nomor: string | null;
        nama_slot: string;
        urutan_slot: number;
        status_sesi: 'terjadwal' | 'selesai' | 'batal';
        tipe_kendaraan: string | null;
      }>(`
        SELECT 
          js.id, js.siswa_id, s.nama as nama_siswa, s.kode_siswa, s.no_whatsapp,
          js.nomor_sesi_ke, js.total_sesi_paket,
          st.nama as nama_staff,
          k.nama_kendaraan, k.plat_nomor,
          sw.nama_slot, sw.urutan as urutan_slot,
          js.status_sesi, js.tipe_kendaraan
        FROM jadwal_sesi js
        JOIN siswa s ON js.siswa_id = s.id
        LEFT JOIN staff st ON js.staff_id = st.id
        LEFT JOIN kendaraan k ON js.kendaraan_id = k.id
        LEFT JOIN slot_waktu sw ON js.slot_waktu_id = sw.id
        WHERE js.tanggal_sesi = $1
        ORDER BY sw.urutan ASC, js.created_at ASC
      `, [todayStr]),

      // 5. Fleet status
      dbQuery<{ id: string; nama_kendaraan: string; plat_nomor: string; odometer_terkini: number; oli_km_terakhir: number }>(
        `SELECT k.id, k.nama_kendaraan, k.plat_nomor, 
           COALESCE(ks.odometer_terkini, 0) as odometer_terkini, 
           COALESCE(ks.oli_km_terakhir, 0) as oli_km_terakhir 
         FROM kendaraan k 
         LEFT JOIN kendaraan_status ks ON k.id = ks.kendaraan_id`
      ),

      // 6. Registration trend (aggregated monthly by SQL)
      dbQuery<{ bulan_key: string; total: number }>(`
        SELECT 
          TO_CHAR(tanggal_booking, 'YYYY-MM') as bulan_key,
          COUNT(*)::int as total
        FROM siswa 
        WHERE tanggal_booking >= $1
        GROUP BY TO_CHAR(tanggal_booking, 'YYYY-MM')
        ORDER BY bulan_key ASC
      `, [sixMonthsAgoStr]),

      // 7. Cashflow trend (aggregated monthly by SQL)
      dbQuery<{ bulan_key: string; pemasukan: number; pengeluaran: number }>(`
        SELECT 
          TO_CHAR(tanggal, 'YYYY-MM') as bulan_key,
          COALESCE(SUM(CASE WHEN tipe = 'pemasukan' THEN nominal ELSE 0 END), 0) as pemasukan,
          COALESCE(SUM(CASE WHEN tipe = 'pengeluaran' THEN nominal ELSE 0 END), 0) as pengeluaran
        FROM kas_transaksi 
        WHERE tanggal >= $1
        GROUP BY TO_CHAR(tanggal, 'YYYY-MM')
        ORDER BY bulan_key ASC
      `, [sixMonthsAgoStr]),
    ]);

    const totalPendapatanBulanIni = Number(kasMetrics?.pendapatan_bulan_ini) || 0;
    const totalPengeluaranBulanIni = Number(kasMetrics?.pengeluaran_bulan_ini) || 0;
    const labaBersihBulanIni = totalPendapatanBulanIni - totalPengeluaranBulanIni;
    const saldoKasAktif = Number(kasMetrics?.saldo_kas_aktif) || 0;

    let sesiTerjadwalHariIni = 0;
    let sesiSelesaiHariIni = 0;

    const sesiHariIniList: SesiHariIniItem[] = sesiHariIniData.map((s: any) => {
      if (s.status_sesi === 'selesai') sesiSelesaiHariIni++;
      else if (s.status_sesi === 'terjadwal') sesiTerjadwalHariIni++;

      return {
        id: s.id,
        siswaId: s.siswa_id,
        namaSiswa: s.nama_siswa,
        kodeSiswa: s.kode_siswa,
        noWhatsapp: s.no_whatsapp,
        nomorSesiKe: s.nomor_sesi_ke,
        totalSesiPaket: s.total_sesi_paket,
        namaInstruktur: s.nama_staff || 'Instruktur',
        namaKendaraan: s.nama_kendaraan || (s.tipe_kendaraan === 'pribadi' ? 'Mobil Pribadi' : 'Armada'),
        platNomor: s.plat_nomor || '-',
        namaSlot: s.nama_slot || 'Slot',
        urutanSlot: s.urutan_slot || 1,
        statusSesi: s.status_sesi,
        tipeKendaraan: s.tipe_kendaraan || 'operasional',
      };
    });

    const leadsMap = new Map<string, number>();
    leadsRows.forEach((r: any) => {
      let label = 'Organik';
      if (r.sumber === 'meta_ads') label = 'Meta Ads';
      else if (r.sumber === 'tiktok') label = 'TikTok';
      else if (r.sumber === 'referensi') label = 'Referensi';
      else if (r.sumber === 'kustom') label = r.sumber_kustom_text || 'Kustom';
      leadsMap.set(label, (leadsMap.get(label) || 0) + Number(r.total || 0));
    });
    const sumberLeads = Array.from(leadsMap.entries()).map(([name, value]) => ({ name, value }));

    const kendaraanPerluPerhatian: { nama: string; plat: string; alasan: string }[] = [];
    kendaraanList.forEach((k: any) => {
      const odo = k.odometer_terkini || 0;
      const oli = k.oli_km_terakhir || 0;
      if (odo - oli >= 4500 && oli > 0) {
        kendaraanPerluPerhatian.push({
          nama: k.nama_kendaraan,
          plat: k.plat_nomor,
          alasan: `Oli mendekati batas (${odo - oli} km sejak ganti terakhir)`,
        });
      }
    });

    const monthlySiswaMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlySiswaMap[k] = 0;
    }
    trenSiswaData.forEach((s: any) => {
      if (monthlySiswaMap[s.bulan_key] !== undefined) {
        monthlySiswaMap[s.bulan_key] = Number(s.total || 0);
      }
    });
    const trenPendaftaran = Object.entries(monthlySiswaMap).map(([k, total]) => {
      const mIdx = parseInt(k.split('-')[1], 10) - 1;
      return { bulan: monthNames[mIdx], total };
    });

    const trenCashflow = trenKasData.map((t: any) => {
      const mIdx = parseInt(t.bulan_key.split('-')[1], 10) - 1;
      const pem = Number(t.pemasukan) || 0;
      const peng = Number(t.pengeluaran) || 0;
      return {
        bulan: monthNames[mIdx],
        pemasukan: pem,
        pengeluaran: peng,
        net: pem - peng,
      };
    });

    const result: DashboardMetrics = {
      siswaBelumDijadwalkan: Number(summaryRow?.siswa_belum_dijadwalkan || 0),
      siswaOnProgress: Number(summaryRow?.siswa_on_progress || 0),
      siswaSelesai: Number(summaryRow?.siswa_selesai || 0),
      siswaBaruBulanIni: Number(summaryRow?.siswa_baru_bulan_ini || 0),
      totalPendapatanBulanIni,
      totalPengeluaranBulanIni,
      labaBersihBulanIni,
      saldoKasAktif,
      sesiTerjadwalHariIni,
      sesiSelesaiHariIni,
      sesiHariIniList,
      sumberLeads,
      kendaraanPerluPerhatian,
      trenPendaftaran,
      trenCashflow,
      siswaSiapSimCount: Number(summaryRow?.siswa_siap_sim || 0),
      siswaBelumLunasCount: Number(summaryRow?.siswa_belum_lunas || 0),
      totalArmadaAktif: kendaraanList.length,
    };

    cacheSet(DASHBOARD_CACHE_KEY, result, 30);
    return result;
  } catch (err: any) {
    console.error('Error generating dashboard metrics:', err);
    throw err;
  }
}
