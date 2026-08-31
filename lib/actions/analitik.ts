'use server';

import { dbQuery, dbQuerySingle } from '@/lib/db';
import { cacheGet, cacheSet } from '@/lib/utils/cache';
import { getTodayDateString, getJakartaDateParts, addDaysToDateStr } from '@/lib/utils/date';
import { getGeneralSettings } from '@/lib/actions/settings';

export interface AnalitikFilter {
  period?: 'this_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'this_year' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
}

export interface AnalitikData {
  periodeLabel: string;
  startDate: string;
  endDate: string;
  summaryKPI: {
    totalSiswa: number;
    totalOmzet: number;
    totalTerbayar: number;
    totalPiutang: number;
    totalSesiSelesai: number;
    totalSesiTerjadwal: number;
    totalSesiBatal: number;
    completionRateSesi: number;
    totalPengeluaranKas: number;
    labaBersih: number;
    profitMargin: number;
    totalKmOperasional: number;
    totalLiterBBM: number;
    rataRataEfisiensiBBM: number;
  };
  siswaGrowth: {
    byChannel: { channel: string; totalSiswa: number; totalOmzet: number; persentase: number }[];
    byPackage: { namaPaket: string; termasukSim: boolean; totalTerjual: number; totalOmzet: number; persentase: number }[];
    byPaymentStatus: { status: string; label: string; count: number; totalNominal: number; color: string }[];
    completionRate: { totalSiswa: number; siswaLulus: number; siswaOnProgress: number; siswaBelumJadwal: number; rate: number };
    monthlyTrend: { bulanKey: string; bulanLabel: string; totalSiswa: number; omzet: number }[];
  };
  sesiOperations: {
    totalSesi: number;
    sesiSelesai: number;
    sesiTerjadwal: number;
    sesiBatal: number;
    completionRate: number;
    cancellationRate: number;
    bySlotWaktu: { slotId: string; namaSlot: string; urutan: number; totalSesi: number; persentase: number }[];
    byDayOfWeek: { dayIndex: number; dayName: string; totalSesi: number; persentase: number }[];
    monthlyTrend: { bulanKey: string; bulanLabel: string; selesai: number; batal: number; total: number }[];
  };
  instrukturLeaderboard: {
    id: string;
    nama: string;
    totalSesi: number;
    sesiSelesai: number;
    sesiBatal: number;
    sesiMobilOps: number;
    sesiMobilPribadi: number;
    totalSiswa: number;
    hariAktif: number;
    completionRate: number;
    estimasiHonorSesi: number;
    estimasiUangMakan: number;
    totalEstimasiGaji: number;
  }[];
  armadaAnalytics: {
    id: string;
    nama: string;
    plat: string;
    totalSesi: number;
    totalJarakKm: number;
    totalBiayaBBM: number;
    totalLiterBBM: number;
    kmPerLiter: number;
    biayaPerKm: number;
    odometerTerkini: number;
    oliKmTerakhir: number;
    kmSejakGantiOli: number;
    perluPerhatian: boolean;
    alasanPerhatian?: string;
  }[];
  finansialExecutive: {
    totalPemasukan: number;
    totalPengeluaran: number;
    labaBersih: number;
    profitMargin: number;
    expenseBreakdown: { kategori: string; label: string; nominal: number; persentase: number }[];
    cashflowMonthly: { bulanKey: string; bulanLabel: string; pemasukan: number; pengeluaran: number; netProfit: number }[];
  };
  strategicInsights: {
    type: 'positive' | 'warning' | 'info' | 'action';
    title: string;
    description: string;
    recommendation: string;
  }[];
}

const MONTH_NAMES_INDO = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export async function getAnalitikData(filter?: AnalitikFilter): Promise<AnalitikData> {
  const todayStr = getTodayDateString();
  const dateParts = getJakartaDateParts(todayStr) || { year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate() };
  const currentYear = dateParts.year;
  const currentMonth = dateParts.month; // 1-12

  let startDate = filter?.startDate || '';
  let endDate = filter?.endDate || '';
  let periodeLabel = 'Semua Periode';

  const periodType = filter?.period || 'this_month';

  if (periodType === 'this_month' && (!startDate || !endDate)) {
    startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    endDate = todayStr;
    periodeLabel = `Bulan Ini (${MONTH_NAMES_INDO[currentMonth - 1]} ${currentYear})`;
  } else if (periodType === 'last_month') {
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const daysInLastMonth = new Date(lastMonthYear, lastMonth, 0).getDate();
    startDate = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`;
    endDate = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-${String(daysInLastMonth).padStart(2, '0')}`;
    periodeLabel = `Bulan Lalu (${MONTH_NAMES_INDO[lastMonth - 1]} ${lastMonthYear})`;
  } else if (periodType === 'q1') {
    startDate = `${currentYear}-01-01`;
    endDate = `${currentYear}-03-31`;
    periodeLabel = `Kuartal 1 (Jan - Mar ${currentYear})`;
  } else if (periodType === 'q2') {
    startDate = `${currentYear}-04-01`;
    endDate = `${currentYear}-06-30`;
    periodeLabel = `Kuartal 2 (Apr - Jun ${currentYear})`;
  } else if (periodType === 'q3') {
    startDate = `${currentYear}-07-01`;
    endDate = `${currentYear}-09-30`;
    periodeLabel = `Kuartal 3 (Jul - Sep ${currentYear})`;
  } else if (periodType === 'q4') {
    startDate = `${currentYear}-10-01`;
    endDate = `${currentYear}-12-31`;
    periodeLabel = `Kuartal 4 (Okt - Des ${currentYear})`;
  } else if (periodType === 'this_year') {
    startDate = `${currentYear}-01-01`;
    endDate = todayStr;
    periodeLabel = `Tahun Ini (YTD ${currentYear})`;
  } else if (periodType === 'all') {
    startDate = '2025-01-01';
    endDate = todayStr;
    periodeLabel = 'Semua Waktu (Historis Lengkap)';
  } else if (filter?.startDate && filter?.endDate) {
    startDate = filter.startDate;
    endDate = filter.endDate;
    periodeLabel = `Periode ${startDate} s/d ${endDate}`;
  }

  // Load General Settings for Instructors
  const settings = await getGeneralSettings();
  const feeMobilOps = settings.gajiInstrukturOperasional || 50000;
  const feeMobilPribadi = settings.gajiInstrukturPribadi || 70000;
  const uangMakanPerHari = settings.uangMakanInstrukturHarian || 15000;

  try {
    // 1. Fetch Students
    const siswaRows = await dbQuery<{
      id: string;
      nama: string;
      tanggal_booking: string;
      harga_final: number;
      status_pembayaran_kode: string;
      dp_nominal: number | null;
      sumber: string | null;
      sumber_kustom_text: string | null;
      paket_id: string;
      nama_paket: string;
      termasuk_sim: boolean;
    }>(`
      SELECT 
        s.id, s.nama, s.tanggal_booking, s.harga_final, s.status_pembayaran_kode, s.dp_nominal,
        COALESCE(s.sumber::text, 'organik') as sumber, s.sumber_kustom_text, s.paket_id,
        p.nama_paket, p.termasuk_sim
      FROM siswa s
      JOIN paket p ON s.paket_id = p.id
      WHERE s.tanggal_booking >= $1 AND s.tanggal_booking <= $2
    `, [startDate, endDate]);

    // 2. Fetch Sessions in Period
    const sesiRows = await dbQuery<{
      id: string;
      siswa_id: string;
      staff_id: string;
      kendaraan_id: string | null;
      tipe_kendaraan: string | null;
      tanggal_sesi: string;
      slot_waktu_id: string | null;
      status_sesi: string;
      nama_staff: string;
      nama_kendaraan: string | null;
      plat_nomor: string | null;
    }>(`
      SELECT 
        js.id, js.siswa_id, js.staff_id, js.kendaraan_id, js.tipe_kendaraan,
        js.tanggal_sesi, js.slot_waktu_id, js.status_sesi,
        st.nama as nama_staff,
        k.nama_kendaraan, k.plat_nomor
      FROM jadwal_sesi js
      LEFT JOIN staff st ON js.staff_id = st.id
      LEFT JOIN kendaraan k ON js.kendaraan_id = k.id
      WHERE js.tanggal_sesi >= $1 AND js.tanggal_sesi <= $2
    `, [startDate, endDate]);

    // 3. Fetch Slot Master
    const slotRows = await dbQuery<{ id: string; nama_slot: string; urutan: number }>('SELECT id, nama_slot, urutan FROM slot_waktu ORDER BY urutan ASC');

    // 4. Fetch Staff list
    const staffList = await dbQuery<{ id: string; nama: string }>(`
      SELECT s.id, s.nama FROM staff s
      JOIN staff_jabatan sj ON s.id = sj.staff_id
      JOIN jabatan j ON sj.jabatan_id = j.id
      WHERE LOWER(j.nama_jabatan) LIKE '%instruktur%' AND s.aktif = TRUE
      GROUP BY s.id, s.nama
      ORDER BY s.nama ASC
    `);

    // 5. Fetch Kendaraan & Logs
    const kendaraanList = await dbQuery<{
      id: string;
      nama_kendaraan: string;
      plat_nomor: string;
      odometer_terkini: number;
      oli_km_terakhir: number;
    }>(`
      SELECT k.id, k.nama_kendaraan, k.plat_nomor, 
        COALESCE(ks.odometer_terkini, 0) as odometer_terkini, 
        COALESCE(ks.oli_km_terakhir, 0) as oli_km_terakhir
      FROM kendaraan k
      LEFT JOIN kendaraan_status ks ON k.id = ks.kendaraan_id
      ORDER BY k.nama_kendaraan ASC
    `);

    const logKendaraan = await dbQuery<{
      kendaraan_id: string;
      jarak_tempuh: number;
      biaya_bbm: number;
      liter_bbm: number;
    }>(`
      SELECT kendaraan_id, 
        COALESCE(SUM(jarak_tempuh), 0) as jarak_tempuh,
        COALESCE(SUM(bbm_nominal), 0) as biaya_bbm,
        COALESCE(SUM(bbm_liter), 0) as liter_bbm
      FROM kendaraan_log_harian
      WHERE tanggal >= $1 AND tanggal <= $2
      GROUP BY kendaraan_id
    `, [startDate, endDate]);

    // 6. Fetch Cashflow Transactions
    const kasRows = await dbQuery<{
      id: string;
      tanggal: string;
      tipe: string;
      kategori: string;
      nominal: number;
    }>(`
      SELECT id, tanggal, tipe, kategori, nominal
      FROM kas_transaksi
      WHERE tanggal >= $1 AND tanggal <= $2
      ORDER BY tanggal ASC
    `, [startDate, endDate]);

    // 7. Fetch 6 Months Trend for Siswa and Cashflow
    const sixMonthsAgoStr = addDaysToDateStr(todayStr, -180);
    const trendSiswaRaw = await dbQuery<{ bulan_key: string; total_siswa: number; total_omzet: number }>(`
      SELECT 
        TO_CHAR(tanggal_booking, 'YYYY-MM') as bulan_key,
        COUNT(*) as total_siswa,
        COALESCE(SUM(harga_final), 0) as total_omzet
      FROM siswa
      WHERE tanggal_booking >= $1
      GROUP BY TO_CHAR(tanggal_booking, 'YYYY-MM')
      ORDER BY bulan_key ASC
    `, [sixMonthsAgoStr]);

    const trendKasRaw = await dbQuery<{ bulan_key: string; pemasukan: number; pengeluaran: number }>(`
      SELECT 
        TO_CHAR(tanggal, 'YYYY-MM') as bulan_key,
        COALESCE(SUM(CASE WHEN tipe = 'pemasukan' THEN nominal ELSE 0 END), 0) as pemasukan,
        COALESCE(SUM(CASE WHEN tipe = 'pengeluaran' THEN nominal ELSE 0 END), 0) as pengeluaran
      FROM kas_transaksi
      WHERE tanggal >= $1
      GROUP BY TO_CHAR(tanggal, 'YYYY-MM')
      ORDER BY bulan_key ASC
    `, [sixMonthsAgoStr]);

    // --- AGGREGATIONS ---

    // A. Student Summary
    let totalSiswa = siswaRows.length;
    let totalOmzet = 0;
    let totalTerbayar = 0;
    let lunasCount = 0;
    let dpCount = 0;
    let belumBayarCount = 0;

    const channelMap: Record<string, { totalSiswa: number; totalOmzet: number }> = {};
    const packageMap: Record<string, { namaPaket: string; termasukSim: boolean; totalTerjual: number; totalOmzet: number }> = {};

    siswaRows.forEach((s) => {
      totalOmzet += s.harga_final;
      if (s.status_pembayaran_kode === 'lunas') {
        totalTerbayar += s.harga_final;
        lunasCount++;
      } else if (s.status_pembayaran_kode === 'dp') {
        totalTerbayar += s.dp_nominal || 0;
        dpCount++;
      } else {
        belumBayarCount++;
      }

      // Channel
      let ch = s.sumber || 'organik';
      if (ch === 'meta_ads') ch = 'Meta Ads';
      else if (ch === 'tiktok') ch = 'TikTok';
      else if (ch === 'referensi') ch = 'Referensi';
      else if (ch === 'kustom') ch = s.sumber_kustom_text || 'Kustom';
      else ch = 'Organik';

      if (!channelMap[ch]) channelMap[ch] = { totalSiswa: 0, totalOmzet: 0 };
      channelMap[ch].totalSiswa++;
      channelMap[ch].totalOmzet += s.harga_final;

      // Package
      const pkg = s.nama_paket || 'Khusus';
      if (!packageMap[pkg]) {
        packageMap[pkg] = { namaPaket: pkg, termasukSim: s.termasuk_sim, totalTerjual: 0, totalOmzet: 0 };
      }
      packageMap[pkg].totalTerjual++;
      packageMap[pkg].totalOmzet += s.harga_final;
    });

    const totalPiutang = totalOmzet - totalTerbayar;

    const byChannel = Object.entries(channelMap).map(([channel, data]) => ({
      channel,
      totalSiswa: data.totalSiswa,
      totalOmzet: data.totalOmzet,
      persentase: totalSiswa > 0 ? Math.round((data.totalSiswa / totalSiswa) * 100) : 0,
    })).sort((a, b) => b.totalSiswa - a.totalSiswa);

    const byPackage = Object.values(packageMap).map((pkg) => ({
      namaPaket: pkg.namaPaket,
      termasukSim: pkg.termasukSim,
      totalTerjual: pkg.totalTerjual,
      totalOmzet: pkg.totalOmzet,
      persentase: totalSiswa > 0 ? Math.round((pkg.totalTerjual / totalSiswa) * 100) : 0,
    })).sort((a, b) => b.totalTerjual - a.totalTerjual);

    const byPaymentStatus = [
      { status: 'lunas', label: 'Lunas', count: lunasCount, totalNominal: totalTerbayar, color: '#1B8A5A' },
      { status: 'dp', label: 'DP (Sebagian)', count: dpCount, totalNominal: totalTerbayar, color: '#B9821B' },
      { status: 'belum_bayar', label: 'Belum Bayar', count: belumBayarCount, totalNominal: 0, color: '#C13D3D' },
    ];

    // B. Session Operations
    let totalSesi = sesiRows.length;
    let sesiSelesai = 0;
    let sesiTerjadwal = 0;
    let sesiBatal = 0;

    const slotCountMap: Record<string, number> = {};
    const dayCountMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    sesiRows.forEach((ses) => {
      if (ses.status_sesi === 'selesai') sesiSelesai++;
      else if (ses.status_sesi === 'terjadwal') sesiTerjadwal++;
      else if (ses.status_sesi === 'batal') sesiBatal++;

      if (ses.slot_waktu_id) {
        slotCountMap[ses.slot_waktu_id] = (slotCountMap[ses.slot_waktu_id] || 0) + 1;
      }

      if (ses.tanggal_sesi) {
        const d = new Date(ses.tanggal_sesi).getDay();
        dayCountMap[d] = (dayCountMap[d] || 0) + 1;
      }
    });

    const completionRateSesi = totalSesi > 0 ? Math.round((sesiSelesai / totalSesi) * 100) : 0;
    const cancellationRateSesi = totalSesi > 0 ? Math.round((sesiBatal / totalSesi) * 100) : 0;

    const bySlotWaktu = slotRows.map((s) => ({
      slotId: s.id,
      namaSlot: s.nama_slot,
      urutan: s.urutan,
      totalSesi: slotCountMap[s.id] || 0,
      persentase: totalSesi > 0 ? Math.round(((slotCountMap[s.id] || 0) / totalSesi) * 100) : 0,
    }));

    const byDayOfWeek = [1, 2, 3, 4, 5, 6, 0].map((dIdx) => ({
      dayIndex: dIdx,
      dayName: DAY_NAMES[dIdx],
      totalSesi: dayCountMap[dIdx] || 0,
      persentase: totalSesi > 0 ? Math.round(((dayCountMap[dIdx] || 0) / totalSesi) * 100) : 0,
    }));

    // C. Instructor Leaderboard
    const instrukturMap: Record<string, {
      id: string;
      nama: string;
      totalSesi: number;
      sesiSelesai: number;
      sesiBatal: number;
      sesiMobilOps: number;
      sesiMobilPribadi: number;
      siswaSet: Set<string>;
      hariSet: Set<string>;
    }> = {};

    staffList.forEach((st) => {
      instrukturMap[st.id] = {
        id: st.id,
        nama: st.nama,
        totalSesi: 0,
        sesiSelesai: 0,
        sesiBatal: 0,
        sesiMobilOps: 0,
        sesiMobilPribadi: 0,
        siswaSet: new Set(),
        hariSet: new Set(),
      };
    });

    sesiRows.forEach((ses) => {
      if (ses.staff_id && instrukturMap[ses.staff_id]) {
        const item = instrukturMap[ses.staff_id];
        item.totalSesi++;
        if (ses.status_sesi === 'selesai') {
          item.sesiSelesai++;
          if (ses.tipe_kendaraan === 'pribadi') {
            item.sesiMobilPribadi++;
          } else {
            item.sesiMobilOps++;
          }
        } else if (ses.status_sesi === 'batal') {
          item.sesiBatal++;
        }
        if (ses.siswa_id) item.siswaSet.add(ses.siswa_id);
        if (ses.tanggal_sesi) item.hariSet.add(ses.tanggal_sesi.slice(0, 10));
      }
    });

    const instrukturLeaderboard = Object.values(instrukturMap).map((ins) => {
      const estimasiHonorSesi = (ins.sesiMobilOps * feeMobilOps) + (ins.sesiMobilPribadi * feeMobilPribadi);
      const estimasiUangMakan = ins.hariSet.size * uangMakanPerHari;
      const totalEstimasiGaji = estimasiHonorSesi + estimasiUangMakan;

      return {
        id: ins.id,
        nama: ins.nama,
        totalSesi: ins.totalSesi,
        sesiSelesai: ins.sesiSelesai,
        sesiBatal: ins.sesiBatal,
        sesiMobilOps: ins.sesiMobilOps,
        sesiMobilPribadi: ins.sesiMobilPribadi,
        totalSiswa: ins.siswaSet.size,
        hariAktif: ins.hariSet.size,
        completionRate: ins.totalSesi > 0 ? Math.round((ins.sesiSelesai / ins.totalSesi) * 100) : 0,
        estimasiHonorSesi,
        estimasiUangMakan,
        totalEstimasiGaji,
      };
    }).sort((a, b) => b.sesiSelesai - a.sesiSelesai || b.totalSesi - a.totalSesi);

    // D. Armada & BBM Analytics
    const armadaLogMap: Record<string, { jarak: number; biaya: number; liter: number }> = {};
    logKendaraan.forEach((l) => {
      armadaLogMap[l.kendaraan_id] = {
        jarak: Number(l.jarak_tempuh) || 0,
        biaya: Number(l.biaya_bbm) || 0,
        liter: Number(l.liter_bbm) || 0,
      };
    });

    const armadaSesiMap: Record<string, number> = {};
    sesiRows.forEach((ses) => {
      if (ses.kendaraan_id && ses.status_sesi === 'selesai') {
        armadaSesiMap[ses.kendaraan_id] = (armadaSesiMap[ses.kendaraan_id] || 0) + 1;
      }
    });

    let totalKmOperasional = 0;
    let totalLiterBBM = 0;
    let totalBiayaBBMArmada = 0;

    const armadaAnalytics = kendaraanList.map((k) => {
      const l = armadaLogMap[k.id] || { jarak: 0, biaya: 0, liter: 0 };
      const sesCount = armadaSesiMap[k.id] || 0;

      totalKmOperasional += l.jarak;
      totalLiterBBM += l.liter;
      totalBiayaBBMArmada += l.biaya;

      const kmPerLiter = l.liter > 0 ? Math.round((l.jarak / l.liter) * 100) / 100 : 0;
      const biayaPerKm = l.jarak > 0 ? Math.round(l.biaya / l.jarak) : 0;

      const kmSejakGantiOli = k.odometer_terkini > 0 && k.oli_km_terakhir > 0 ? k.odometer_terkini - k.oli_km_terakhir : 0;
      const perluPerhatian = kmSejakGantiOli >= 4500;
      const alasanPerhatian = perluPerhatian ? `Mendekati batas ganti oli (${kmSejakGantiOli.toLocaleString('id-ID')} km sejak ganti terakhir)` : undefined;

      return {
        id: k.id,
        nama: k.nama_kendaraan,
        plat: k.plat_nomor,
        totalSesi: sesCount,
        totalJarakKm: l.jarak,
        totalBiayaBBM: l.biaya,
        totalLiterBBM: l.liter,
        kmPerLiter,
        biayaPerKm,
        odometerTerkini: k.odometer_terkini,
        oliKmTerakhir: k.oli_km_terakhir,
        kmSejakGantiOli,
        perluPerhatian,
        alasanPerhatian,
      };
    });

    const rataRataEfisiensiBBM = totalLiterBBM > 0 ? Math.round((totalKmOperasional / totalLiterBBM) * 100) / 100 : 0;

    // E. Financial Executive Analytics
    let totalPemasukanKas = 0;
    let totalPengeluaranKas = 0;
    const expenseCategoryMap: Record<string, number> = {};

    kasRows.forEach((k) => {
      const nom = Number(k.nominal) || 0;
      if (k.tipe === 'pemasukan') {
        totalPemasukanKas += nom;
      } else {
        totalPengeluaranKas += nom;
        const kat = k.kategori || 'lainnya';
        expenseCategoryMap[kat] = (expenseCategoryMap[kat] || 0) + nom;
      }
    });

    const labaBersih = totalPemasukanKas - totalPengeluaranKas;
    const profitMargin = totalPemasukanKas > 0 ? Math.round((labaBersih / totalPemasukanKas) * 100) : 0;

    const expenseLabels: Record<string, string> = {
      bbm: 'BBM Kendaraan',
      gaji: 'Gaji & Honor Instruktur',
      operasional: 'Operasional & Kantor',
      perawatan_kendaraan: 'Perawatan & Servis Armada',
      cicilan_hutang: 'Cicilan & Hutang',
      lainnya: 'Pengeluaran Lainnya',
    };

    const expenseBreakdown = Object.entries(expenseCategoryMap).map(([kat, nominal]) => ({
      kategori: kat,
      label: expenseLabels[kat] || kat.replace(/_/g, ' ').toUpperCase(),
      nominal,
      persentase: totalPengeluaranKas > 0 ? Math.round((nominal / totalPengeluaranKas) * 100) : 0,
    })).sort((a, b) => b.nominal - a.nominal);

    // Monthly Cashflow Trend
    const cashflowMonthly = trendKasRaw.map((t) => {
      const [y, m] = t.bulan_key.split('-');
      const mIdx = parseInt(m, 10) - 1;
      const pem = Number(t.pemasukan) || 0;
      const peng = Number(t.pengeluaran) || 0;
      return {
        bulanKey: t.bulan_key,
        bulanLabel: `${MONTH_SHORT[mIdx]} ${y}`,
        pemasukan: pem,
        pengeluaran: peng,
        netProfit: pem - peng,
      };
    });

    const monthlyTrendSiswa = trendSiswaRaw.map((t) => {
      const [y, m] = t.bulan_key.split('-');
      const mIdx = parseInt(m, 10) - 1;
      return {
        bulanKey: t.bulan_key,
        bulanLabel: `${MONTH_SHORT[mIdx]} ${y}`,
        totalSiswa: Number(t.total_siswa) || 0,
        omzet: Number(t.total_omzet) || 0,
      };
    });

    // F. Strategic Insights (Bahan Rapat & Evaluasi Bisnis)
    const strategicInsights: AnalitikData['strategicInsights'] = [];

    // 1. Marketing Insight
    if (byChannel.length > 0) {
      const topChannel = byChannel[0];
      strategicInsights.push({
        type: 'positive',
        title: `Channel Marketing Utama: ${topChannel.channel} (${topChannel.persentase}% Siswa)`,
        description: `${topChannel.channel} menghasilkan ${topChannel.totalSiswa} siswa baru dengan kontribusi omzet Rp ${topChannel.totalOmzet.toLocaleString('id-ID')}.`,
        recommendation: `Tingkatkan anggaran kampanye di ${topChannel.channel} dan optimalkan funnel landing page untuk mendongkrak konversi.`,
      });
    }

    // 2. Package Insight
    if (byPackage.length > 0) {
      const topPackage = byPackage[0];
      strategicInsights.push({
        type: 'info',
        title: `Paket Paling Diminati: ${topPackage.namaPaket}`,
        description: `Menyumbang ${topPackage.persentase}% dari total pendaftaran dengan total omzet Rp ${topPackage.totalOmzet.toLocaleString('id-ID')}.`,
        recommendation: topPackage.termasukSim
          ? 'Paket bundling SIM terbukti menarik minat tertinggi. Pertahankan kemitraan Satpas dan efisiensi pengurusan SIM.'
          : 'Buat variasi bundling diskon atau opsi tambahan SIM pada paket ini untuk meningkatkan Average Revenue Per User (ARPU).',
      });
    }

    // 3. Receivables / Piutang Alert
    if (totalPiutang > 0) {
      const piutangRatio = totalOmzet > 0 ? Math.round((totalPiutang / totalOmzet) * 100) : 0;
      strategicInsights.push({
        type: piutangRatio > 30 ? 'warning' : 'info',
        title: `Piutang Belum Tertagih: Rp ${totalPiutang.toLocaleString('id-ID')} (${piutangRatio}%)`,
        description: `Terdapat ${dpCount} siswa status DP dan ${belumBayarCount} siswa status Belum Bayar.`,
        recommendation: 'Instruksikan tim admin untuk follow up pelunasan sebelum siswa memasuki sesi ke-3 atau sebelum penerbitan berkas SIM.',
      });
    }

    // 4. Operational Completion Rate
    if (completionRateSesi < 80 && totalSesi > 5) {
      strategicInsights.push({
        type: 'warning',
        title: `Completion Rate Sesi: ${completionRateSesi}% (Batal/Reschedule: ${cancellationRateSesi}%)`,
        description: `Terdapat ${sesiBatal} sesi dibatalkan pada periode ini.`,
        recommendation: 'Evaluasi alasan pembatalan sesi bersama para instruktur saat rapat bulanan guna memperkuat komitmen jadwal siswa.',
      });
    } else {
      strategicInsights.push({
        type: 'positive',
        title: `Disiplin Jadwal Baik: ${completionRateSesi}% Sesi Terlaksana Sukses`,
        description: `Tingkat pembatalan rendah (${cancellationRateSesi}%), membuktikan alokasi armada dan instruktur berjalan optimal.`,
        recommendation: 'Pertahankan sistem pengingat otomatis H-1 WhatsApp agar tingkat ketidakhadiran siswa tetap minimal.',
      });
    }

    // 5. Fleet Health Check
    const urgentFleet = armadaAnalytics.filter((a) => a.perluPerhatian);
    if (urgentFleet.length > 0) {
      strategicInsights.push({
        type: 'action',
        title: `Perawatan Armada: ${urgentFleet.length} Kendaraan Butuh Ganti Oli/Servis`,
        description: urgentFleet.map((f) => `${f.nama} (${f.plat}) - ${f.kmSejakGantiOli} km`).join(', '),
        recommendation: 'Jadwalkan servis rutin armada minggu ini untuk mencegah penurunan efisiensi BBM dan risiko kendala saat sesi mengemudi.',
      });
    }

    return {
      periodeLabel,
      startDate,
      endDate,
      summaryKPI: {
        totalSiswa,
        totalOmzet,
        totalTerbayar,
        totalPiutang,
        totalSesiSelesai: sesiSelesai,
        totalSesiTerjadwal: sesiTerjadwal,
        totalSesiBatal: sesiBatal,
        completionRateSesi,
        totalPengeluaranKas,
        labaBersih,
        profitMargin,
        totalKmOperasional,
        totalLiterBBM,
        rataRataEfisiensiBBM,
      },
      siswaGrowth: {
        byChannel,
        byPackage,
        byPaymentStatus,
        completionRate: {
          totalSiswa,
          siswaLulus: lunasCount,
          siswaOnProgress: dpCount,
          siswaBelumJadwal: belumBayarCount,
          rate: totalSiswa > 0 ? Math.round((lunasCount / totalSiswa) * 100) : 0,
        },
        monthlyTrend: monthlyTrendSiswa,
      },
      sesiOperations: {
        totalSesi,
        sesiSelesai,
        sesiTerjadwal,
        sesiBatal,
        completionRate: completionRateSesi,
        cancellationRate: cancellationRateSesi,
        bySlotWaktu,
        byDayOfWeek,
        monthlyTrend: cashflowMonthly.map((c) => ({
          bulanKey: c.bulanKey,
          bulanLabel: c.bulanLabel,
          selesai: sesiSelesai,
          batal: sesiBatal,
          total: totalSesi,
        })),
      },
      instrukturLeaderboard,
      armadaAnalytics,
      finansialExecutive: {
        totalPemasukan: totalPemasukanKas,
        totalPengeluaran: totalPengeluaranKas,
        labaBersih,
        profitMargin,
        expenseBreakdown,
        cashflowMonthly,
      },
      strategicInsights,
    };
  } catch (err: any) {
    console.error('Error generating analitik data:', err);
    throw err;
  }
}
