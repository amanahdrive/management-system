'use server';

import { dbQuery } from '@/lib/db';
import { cacheGet, cacheSet } from '@/lib/utils/cache';

export interface DashboardMetrics {
  siswaBelumDijadwalkan: number;
  siswaOnProgress: number;
  siswaSelesai: number;
  siswaBaruBulanIni: number;
  totalPendapatanBulanIni: number;
  saldoKasAktif: number;
  sesiTerjadwalHariIni: number;
  sumberLeads: { name: string; value: number }[];
  kendaraanPerluPerhatian: { nama: string; plat: string; alasan: string }[];
  trenPendaftaran: { bulan: string; total: number }[];
  trenCashflow: { bulan: string; pemasukan: number; pengeluaran: number }[];
}

const DASHBOARD_CACHE_KEY = 'dashboard_metrics';

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const cached = cacheGet<DashboardMetrics>(DASHBOARD_CACHE_KEY);
  if (cached) return cached;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);
  const firstDayThisMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  try {
    const [
      siswaList,
      sesiList,
      siswaBaruCount,
      kasMetrics,
      sesiHariIniCount,
      kendaraanList,
      trenSiswaData,
      trenKasData,
    ] = await Promise.all([
      dbQuery<{ id: string; sumber: string; sumber_kustom_text: string; status_pembayaran_kode: string }>(
        'SELECT id, sumber, sumber_kustom_text, status_pembayaran_kode FROM siswa'
      ),
      dbQuery<{ siswa_id: string; status_sesi: string }>(
        "SELECT siswa_id, status_sesi FROM jadwal_sesi WHERE status_sesi != 'batal'"
      ),
      dbQuery<{ count: string }>(
        'SELECT count(*) FROM siswa WHERE tanggal_booking >= $1',
        [firstDayThisMonth]
      ),
      dbQuery<{ pendapatan_bulan_ini: number; saldo_kas_aktif: number }>(
        `SELECT
          COALESCE(SUM(CASE WHEN tipe = 'pemasukan' AND tanggal >= $1 THEN nominal ELSE 0 END), 0) AS pendapatan_bulan_ini,
          COALESCE(SUM(CASE WHEN tipe = 'pemasukan' THEN nominal ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN tipe = 'pengeluaran' THEN nominal ELSE 0 END), 0) AS saldo_kas_aktif
        FROM kas_transaksi`,
        [firstDayThisMonth]
      ),
      dbQuery<{ count: string }>(
        "SELECT count(*) FROM jadwal_sesi WHERE tanggal_sesi::date = $1::date AND status_sesi = 'terjadwal'",
        [todayStr]
      ),
      dbQuery<{ nama_kendaraan: string; plat_nomor: string; odometer_terkini: number; oli_km_terakhir: number }>(
        `SELECT k.nama_kendaraan, k.plat_nomor, ks.odometer_terkini, ks.oli_km_terakhir 
         FROM kendaraan k 
         LEFT JOIN kendaraan_status ks ON k.id = ks.kendaraan_id`
      ),
      dbQuery<{ tanggal_booking: string }>(
        'SELECT tanggal_booking FROM siswa WHERE tanggal_booking >= $1',
        [sixMonthsAgoStr]
      ),
      dbQuery<{ bulan_key: string; pemasukan: number; pengeluaran: number }>(
        `SELECT 
          TO_CHAR(tanggal, 'YYYY-MM') as bulan_key,
          COALESCE(SUM(CASE WHEN tipe = 'pemasukan' THEN nominal ELSE 0 END), 0) as pemasukan,
          COALESCE(SUM(CASE WHEN tipe = 'pengeluaran' THEN nominal ELSE 0 END), 0) as pengeluaran
        FROM kas_transaksi 
        WHERE tanggal >= $1
        GROUP BY TO_CHAR(tanggal, 'YYYY-MM')
        ORDER BY bulan_key ASC`,
        [sixMonthsAgoStr]
      ),
    ]);

    const scheduledSiswaIds = new Set(sesiList.map((s) => s.siswa_id));
    const siswaBelumDijadwalkan = siswaList.filter((s) => !scheduledSiswaIds.has(s.id)).length;

    const onProgressIds = new Set(
      sesiList.filter((s) => s.status_sesi === 'terjadwal').map((s) => s.siswa_id)
    );
    const siswaOnProgress = onProgressIds.size;

    const siswaSelesai = siswaList.filter(
      (s) => s.status_pembayaran_kode === 'lunas' && scheduledSiswaIds.has(s.id) && !onProgressIds.has(s.id)
    ).length;

    const totalPendapatanBulanIni = Number(kasMetrics[0]?.pendapatan_bulan_ini) || 0;
    const saldoKasAktif = Number(kasMetrics[0]?.saldo_kas_aktif) || 0;

    const leadsMap = new Map<string, number>();
    siswaList.forEach((s) => {
      const label =
        s.sumber === 'meta_ads' ? 'Meta Ads'
        : s.sumber === 'tiktok' ? 'TikTok'
        : s.sumber === 'referensi' ? 'Referensi'
        : s.sumber === 'walk_in' ? 'Walk In'
        : s.sumber === 'lainnya' ? (s.sumber_kustom_text || 'Lainnya')
        : 'Organik';
      leadsMap.set(label, (leadsMap.get(label) || 0) + 1);
    });
    const sumberLeads = Array.from(leadsMap.entries()).map(([name, value]) => ({ name, value }));

    const kendaraanPerluPerhatian: { nama: string; plat: string; alasan: string }[] = [];
    kendaraanList.forEach((k) => {
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
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlySiswaMap[k] = 0;
    }
    trenSiswaData.forEach((s) => {
      if (!s.tanggal_booking) return;
      const k = s.tanggal_booking.slice(0, 7);
      if (monthlySiswaMap[k] !== undefined) {
        monthlySiswaMap[k]++;
      }
    });
    const trenPendaftaran = Object.entries(monthlySiswaMap).map(([k, total]) => {
      const mIdx = parseInt(k.split('-')[1], 10) - 1;
      return { bulan: monthNames[mIdx], total };
    });

    const monthlyKasMap: Record<string, { pemasukan: number; pengeluaran: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyKasMap[k] = { pemasukan: 0, pengeluaran: 0 };
    }
    trenKasData.forEach((t) => {
      if (!t.bulan_key) return;
      const k = t.bulan_key;
      if (monthlyKasMap[k]) {
        monthlyKasMap[k].pemasukan = Number(t.pemasukan) || 0;
        monthlyKasMap[k].pengeluaran = Number(t.pengeluaran) || 0;
      }
    });
    const trenCashflow = Object.entries(monthlyKasMap).map(([k, v]) => {
      const mIdx = parseInt(k.split('-')[1], 10) - 1;
      return { bulan: monthNames[mIdx], ...v };
    });

    const result: DashboardMetrics = {
      siswaBelumDijadwalkan,
      siswaOnProgress,
      siswaSelesai,
      siswaBaruBulanIni: parseInt(siswaBaruCount[0]?.count || '0', 10),
      totalPendapatanBulanIni,
      saldoKasAktif,
      sesiTerjadwalHariIni: parseInt(sesiHariIniCount[0]?.count || '0', 10),
      sumberLeads,
      kendaraanPerluPerhatian,
      trenPendaftaran,
      trenCashflow,
    };

    cacheSet(DASHBOARD_CACHE_KEY, result, 30);
    return result;
  } catch (e) {
    console.error('Error fetching dashboard metrics:', e);
    return {
      siswaBelumDijadwalkan: 0,
      siswaOnProgress: 0,
      siswaSelesai: 0,
      siswaBaruBulanIni: 0,
      totalPendapatanBulanIni: 0,
      saldoKasAktif: 0,
      sesiTerjadwalHariIni: 0,
      sumberLeads: [],
      kendaraanPerluPerhatian: [],
      trenPendaftaran: [],
      trenCashflow: [],
    };
  }
}
