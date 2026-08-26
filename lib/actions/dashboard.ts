'use server';

import { createAdminClient } from '@/lib/supabase/server';
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

  // Calculate start of current month and 6 months ago
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().slice(0, 10);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  try {
    const supabase = createAdminClient();

    // Run all queries concurrently with minimum field selection
    const [
      siswaRes,
      scheduledIdsRes,
      siswaBaruRes,
      kasMonthlyRes,
      kasSaldoRes,
      sesiHariIniRes,
      kendaraanRes,
      trenSiswaRes,
      trenKasRes,
    ] = await Promise.all([
      // 1. Siswa belum dijadwalkan — count from siswa not in jadwal_sesi
      supabase.from('siswa').select('id, sumber, sumber_kustom_text, status_pembayaran_kode', { count: 'planned' }),

      // 2. Siswa IDs yang sudah ada jadwal (active/non-cancelled)
      supabase.from('jadwal_sesi').select('siswa_id, status_sesi').neq('status_sesi', 'batal'),

      // 3. Siswa baru bulan ini
      supabase
        .from('siswa')
        .select('id', { count: 'exact', head: true })
        .gte('tanggal_booking', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`),

      // 4. Pendapatan bulan ini
      supabase
        .from('kas_transaksi')
        .select('nominal, tipe')
        .eq('tipe', 'pemasukan')
        .gte('tanggal', `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`),

      // 5. Saldo total (all time)
      supabase.from('kas_transaksi').select('nominal, tipe'),

      // 6. Sesi terjadwal hari ini
      supabase
        .from('jadwal_sesi')
        .select('id', { count: 'exact', head: true })
        .eq('tanggal_sesi', todayStr)
        .eq('status_sesi', 'terjadwal'),

      // 7. Kendaraan status
      supabase.from('kendaraan').select('nama_kendaraan, plat_nomor, status:kendaraan_status(odometer_terkini, oli_km_terakhir)'),

      // 8. Trend pendaftaran (6 bulan)
      supabase
        .from('siswa')
        .select('tanggal_booking')
        .gte('tanggal_booking', sixMonthsAgoStr),

      // 9. Trend cashflow (6 bulan)
      supabase
        .from('kas_transaksi')
        .select('tanggal, tipe, nominal')
        .gte('tanggal', sixMonthsAgoStr),
    ]);

    const siswaList = siswaRes.data || [];
    const sesiList = scheduledIdsRes.data || [];
    const siswaBaruBulanIni = siswaBaruRes.count || 0;
    const kasMonthly = kasMonthlyRes.data || [];
    const kasAll = kasSaldoRes.data || [];
    const sesiTerjadwalHariIni = sesiHariIniRes.count || 0;
    const kendaraanList = kendaraanRes.data || [];
    const trenSiswaData = trenSiswaRes.data || [];
    const trenKasData = trenKasRes.data || [];

    // Siswa scheduling status
    const scheduledSiswaIds = new Set(sesiList.map((s) => s.siswa_id));

    // Active (on progress) = has schedules but not fully done
    const siswaBelumDijadwalkan = siswaList.filter((s) => !scheduledSiswaIds.has(s.id)).length;

    // Sessions per student — find students who have at least one non-completed session
    const onProgressIds = new Set(
      sesiList.filter((s) => s.status_sesi === 'terjadwal').map((s) => s.siswa_id)
    );
    const siswaOnProgress = onProgressIds.size;

    // Selesai = lunas AND has schedules
    const siswaSelesai = siswaList.filter(
      (s) => s.status_pembayaran_kode === 'lunas' && scheduledSiswaIds.has(s.id) && !onProgressIds.has(s.id)
    ).length;

    // Financial
    const totalPendapatanBulanIni = kasMonthly.reduce((sum, t) => sum + (t.nominal || 0), 0);
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    kasAll.forEach((t) => {
      if (t.tipe === 'pemasukan') totalPemasukan += t.nominal || 0;
      else totalPengeluaran += t.nominal || 0;
    });
    const saldoKasAktif = totalPemasukan - totalPengeluaran;

    // Leads
    const leadsMap = new Map<string, number>();
    siswaList.forEach((s) => {
      const label =
        s.sumber === 'meta_ads' ? 'Meta Ads'
        : s.sumber === 'tiktok' ? 'TikTok'
        : s.sumber === 'referensi' ? 'Referensi'
        : s.sumber_kustom_text || 'Lainnya';
      leadsMap.set(label, (leadsMap.get(label) || 0) + 1);
    });
    const sumberLeads = Array.from(leadsMap.entries()).map(([name, value]) => ({ name, value }));

    // Vehicle attention
    const kendaraanPerluPerhatian: { nama: string; plat: string; alasan: string }[] = [];
    kendaraanList.forEach((k: any) => {
      const st = k.status;
      if (st) {
        const selisihOli = (st.odometer_terkini || 0) - (st.oli_km_terakhir || 0);
        if (selisihOli > 5000) {
          kendaraanPerluPerhatian.push({
            nama: k.nama_kendaraan,
            plat: k.plat_nomor,
            alasan: `Servis oli lewat ${selisihOli.toLocaleString('id-ID')} km`,
          });
        }
      }
    });

    // Tren (6 months)
    const trenPendaftaranMap = new Map<string, number>();
    const trenCashflowMap = new Map<string, { pemasukan: number; pengeluaran: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = monthNames[d.getMonth()];
      trenPendaftaranMap.set(mLabel, 0);
      trenCashflowMap.set(mLabel, { pemasukan: 0, pengeluaran: 0 });
    }

    trenSiswaData.forEach((s) => {
      if (s.tanggal_booking) {
        const d = new Date(s.tanggal_booking);
        const mLabel = monthNames[d.getMonth()];
        if (trenPendaftaranMap.has(mLabel)) {
          trenPendaftaranMap.set(mLabel, (trenPendaftaranMap.get(mLabel) || 0) + 1);
        }
      }
    });

    trenKasData.forEach((t) => {
      if (t.tanggal) {
        const d = new Date(t.tanggal);
        const mLabel = monthNames[d.getMonth()];
        if (trenCashflowMap.has(mLabel)) {
          const current = trenCashflowMap.get(mLabel)!;
          if (t.tipe === 'pemasukan') current.pemasukan += t.nominal || 0;
          else current.pengeluaran += t.nominal || 0;
        }
      }
    });

    const result = {
      siswaBelumDijadwalkan,
      siswaOnProgress,
      siswaSelesai,
      siswaBaruBulanIni,
      totalPendapatanBulanIni,
      saldoKasAktif,
      sesiTerjadwalHariIni,
      sumberLeads,
      kendaraanPerluPerhatian,
      trenPendaftaran: Array.from(trenPendaftaranMap.entries()).map(([bulan, total]) => ({ bulan, total })),
      trenCashflow: Array.from(trenCashflowMap.entries()).map(([bulan, data]) => ({
        bulan,
        pemasukan: data.pemasukan,
        pengeluaran: data.pengeluaran,
      })),
    };

    cacheSet(DASHBOARD_CACHE_KEY, result, 30);
    return result;
  } catch (e) {
    console.error('Error in getDashboardMetrics:', e);
  }

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
