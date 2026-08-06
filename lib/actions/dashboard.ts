'use server';

import { createServerClient } from '@/lib/supabase/server';

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

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  try {
    const supabase = await createServerClient();

    // 1. Fetch tables
    const { data: siswaData } = await supabase.from('siswa').select('*, paket(*)');
    const { data: sesiData } = await supabase.from('jadwal_sesi').select('*');
    const { data: kasData } = await supabase.from('kas_transaksi').select('*');
    const { data: kendaraanData } = await supabase.from('kendaraan').select('*, status:kendaraan_status(*)');

    const siswaList = siswaData || [];
    const sesiList = sesiData || [];
    const kasList = kasData || [];
    const kendaraanList = kendaraanData || [];

    // Calculate metrics
    const siswaScheduledIds = new Set(sesiList.map((s) => s.siswa_id));
    const siswaBelumDijadwalkan = siswaList.filter((s) => !siswaScheduledIds.has(s.id)).length;

    const siswaOnProgress = siswaList.filter((s) => siswaScheduledIds.has(s.id)).length;
    const siswaSelesai = siswaList.filter((s) => s.status_pembayaran_kode === 'lunas' && siswaScheduledIds.has(s.id)).length;

    const siswaBaruBulanIni = siswaList.filter((s) => {
      if (!s.tanggal_booking) return false;
      const d = new Date(s.tanggal_booking);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    // Financial Metrics
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let totalPendapatanBulanIni = 0;

    kasList.forEach((t) => {
      const d = new Date(t.tanggal);
      if (t.tipe === 'pemasukan') {
        totalPemasukan += t.nominal;
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          totalPendapatanBulanIni += t.nominal;
        }
      } else {
        totalPengeluaran += t.nominal;
      }
    });

    const saldoKasAktif = totalPemasukan - totalPengeluaran;
    const sesiTerjadwalHariIni = sesiList.filter((s) => s.tanggal_sesi === todayStr && s.status_sesi === 'terjadwal').length;

    // Leads Conversion Grouping
    const leadsMap = new Map<string, number>();
    siswaList.forEach((s) => {
      const label =
        s.sumber === 'meta_ads'
          ? 'Meta Ads'
          : s.sumber === 'tiktok'
          ? 'TikTok'
          : s.sumber === 'referensi'
          ? 'Referensi'
          : s.sumber_kustom_text || 'Lainnya';
      leadsMap.set(label, (leadsMap.get(label) || 0) + 1);
    });
    const sumberLeads = Array.from(leadsMap.entries()).map(([name, value]) => ({ name, value }));

    // Kendaraan Attention List
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

    // Tren Pendaftaran & Cashflow (Past 6 Months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const trenPendaftaranMap = new Map<string, number>();
    const trenCashflowMap = new Map<string, { pemasukan: number; pengeluaran: number }>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = `${monthNames[d.getMonth()]}`;
      trenPendaftaranMap.set(mLabel, 0);
      trenCashflowMap.set(mLabel, { pemasukan: 0, pengeluaran: 0 });
    }

    siswaList.forEach((s) => {
      if (s.tanggal_booking) {
        const d = new Date(s.tanggal_booking);
        const mLabel = `${monthNames[d.getMonth()]}`;
        if (trenPendaftaranMap.has(mLabel)) {
          trenPendaftaranMap.set(mLabel, (trenPendaftaranMap.get(mLabel) || 0) + 1);
        }
      }
    });

    kasList.forEach((t) => {
      if (t.tanggal) {
        const d = new Date(t.tanggal);
        const mLabel = `${monthNames[d.getMonth()]}`;
        if (trenCashflowMap.has(mLabel)) {
          const current = trenCashflowMap.get(mLabel)!;
          if (t.tipe === 'pemasukan') current.pemasukan += t.nominal;
          else current.pengeluaran += t.nominal;
        }
      }
    });

    const trenPendaftaran = Array.from(trenPendaftaranMap.entries()).map(([bulan, total]) => ({
      bulan,
      total,
    }));

    const trenCashflow = Array.from(trenCashflowMap.entries()).map(([bulan, data]) => ({
      bulan,
      pemasukan: data.pemasukan,
      pengeluaran: data.pengeluaran,
    }));

    return {
      siswaBelumDijadwalkan,
      siswaOnProgress,
      siswaSelesai,
      siswaBaruBulanIni,
      totalPendapatanBulanIni,
      saldoKasAktif,
      sesiTerjadwalHariIni,
      sumberLeads,
      kendaraanPerluPerhatian,
      trenPendaftaran,
      trenCashflow,
    };
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
