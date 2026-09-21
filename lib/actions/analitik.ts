'use server';

import { dbQuery, dbQuerySingle } from '@/lib/db';
import { cacheGet, cacheSet } from '@/lib/utils/cache';
import { getTodayDateString, getJakartaDateParts, addDaysToDateStr, formatDateIndo } from '@/lib/utils/date';
import { getGeneralSettings } from '@/lib/actions/settings';

export interface AnalitikFilter {
  period?: 'this_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'this_year' | 'custom' | 'all';
  startDate?: string;
  endDate?: string;
}

export interface FunnelStage {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  count: number;
  valueNominal: number;
  stepConvRate: number; // % from previous step
  overallConvRate: number; // % from stage 1
  dropOffCount: number;
  dropOffRate: number;
  revenueLeakage: number; // Potential lost booking value
  avgDays?: number;
  accentColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export interface FunnelStudent {
  id: string;
  nama: string;
  noWhatsapp: string;
  tanggalBooking: string;
  namaPaket: string;
  termasukSim: boolean;
  sumber: string;
  statusPembayaranKode: string;
  hargaFinal: number;
  terbayar: number;
  sisaPiutang: number;
  totalSesi: number;
  selesaiSesi: number;
  currentStageId: 'leads' | 'paket' | 'dp' | 'lunas' | 'latihan' | 'lulus';
  currentStageLabel: string;
  daysActive: number;
}

export interface BottleneckItem {
  id: string;
  title: string;
  category: 'keuangan' | 'siswa' | 'jadwal' | 'armada' | 'instruktur';
  categoryLabel: string;
  severity: 'critical' | 'warning' | 'optimization';
  impactMetric: string;
  impactValue: string;
  description: string;
  rootCause: string;
  actionRecommendation: string;
  actionLabel: string;
  actionRoute: string;
}

export interface AnalitikData {
  periodeLabel: string;
  startDate: string;
  endDate: string;
  comparisonMoM: {
    hasComparison: boolean;
    prevPeriodeLabel: string;
    prevStartDate: string;
    prevEndDate: string;
    deltaOmzet: number;
    deltaSiswa: number;
    deltaPemasukan: number;
    deltaPengeluaran: number;
    deltaLabaBersih: number;
    deltaSesiSelesai: number;
    deltaEfisiensiBBM: number;
  };
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
  conversionFunnel: {
    stages: FunnelStage[];
    overallConversionRate: number;
    totalRevenueLeakage: number;
    activeVelocityDays: number;
    funnelStudents: FunnelStudent[];
  };
  sesiFunnel: {
    kapasitasTersedia: number;
    sesiTerjadwal: number;
    sesiSelesai: number;
    sesiBatal: number;
    utilisasiKapasitas: number;
    fulfillmentRate: number;
    cancellationRate: number;
  };
  unitEconomics: {
    arpu: number; // Average Revenue Per Student
    avgCostPerSiswa: number;
    grossMarginPerSesi: number;
    fleetUtilizationRate: number;
    instructorAvgLoad: number;
  };
  agingPiutang: {
    totalPiutang: number;
    siswaUnpaidCount: number;
    brackets: { range: string; label: string; count: number; nominal: number; persentase: number }[];
    topDebtors: { id: string; nama: string; noWhatsapp: string; sisaPiutang: number; status: string; tanggalBooking: string; daysAging: number }[];
  };
  bottlenecks: BottleneckItem[];
  siswaGrowth: {
    byChannel: { channel: string; totalSiswa: number; totalOmzet: number; persentase: number; conversionRate: number }[];
    byPackage: { namaPaket: string; termasukSim: boolean; jumlahSesi: number; totalTerjual: number; totalOmzet: number; persentase: number }[];
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
    cancellationRate: number;
    capacityUtilization: number;
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
    cashflowTrend: { dateKey: string; dateLabel: string; bulanKey: string; bulanLabel: string; pemasukan: number; pengeluaran: number; netProfit: number }[];
    cashflowMonthly: { bulanKey: string; bulanLabel: string; dateKey?: string; dateLabel?: string; pemasukan: number; pengeluaran: number; netProfit: number }[];
    cashflowGrouping: 'daily' | 'monthly';
    cashflowChartTitle: string;
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
  const cacheKey = `analitik_v3_${filter?.period || 'this_month'}_${filter?.startDate || ''}_${filter?.endDate || ''}`;
  const cached = cacheGet<AnalitikData>(cacheKey);
  if (cached) return cached;

  const todayStr = getTodayDateString();
  const dateParts = getJakartaDateParts(todayStr) || { year: new Date().getFullYear(), month: new Date().getMonth() + 1, day: new Date().getDate() };
  const currentYear = dateParts.year;
  const currentMonth = dateParts.month; // 1-12

  let startDate = filter?.startDate || '';
  let endDate = filter?.endDate || '';
  let periodeLabel = 'Semua Periode';
  let cashflowChartTitle = 'Arus Kas';

  // Determine Previous Period for MoM comparison
  let prevStartDate = '';
  let prevEndDate = '';
  let prevPeriodeLabel = '';
  let hasComparison = true;

  const periodType = filter?.period || 'this_month';
  const isDaily =
    periodType === 'this_month' ||
    periodType === 'last_month' ||
    periodType === 'custom' ||
    Boolean(filter?.startDate && filter?.endDate);

  if (periodType === 'this_month' && (!filter?.startDate || !filter?.endDate)) {
    const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
    startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInCurrentMonth).padStart(2, '0')}`;
    periodeLabel = `Bulan Ini (${MONTH_NAMES_INDO[currentMonth - 1]} ${currentYear})`;
    cashflowChartTitle = `Arus Kas Harian (${MONTH_NAMES_INDO[currentMonth - 1]} ${currentYear})`;

    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const daysInLastMonth = new Date(lastMonthYear, lastMonth, 0).getDate();
    prevStartDate = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`;
    prevEndDate = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-${String(daysInLastMonth).padStart(2, '0')}`;
    prevPeriodeLabel = `Bulan Lalu (${MONTH_NAMES_INDO[lastMonth - 1]} ${lastMonthYear})`;
  } else if (periodType === 'last_month') {
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const daysInLastMonth = new Date(lastMonthYear, lastMonth, 0).getDate();
    startDate = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-01`;
    endDate = `${lastMonthYear}-${String(lastMonth).padStart(2, '0')}-${String(daysInLastMonth).padStart(2, '0')}`;
    periodeLabel = `Bulan Lalu (${MONTH_NAMES_INDO[lastMonth - 1]} ${lastMonthYear})`;
    cashflowChartTitle = `Arus Kas Harian (${MONTH_NAMES_INDO[lastMonth - 1]} ${lastMonthYear})`;

    const twoMonthsAgoYear = lastMonth === 1 ? lastMonthYear - 1 : lastMonthYear;
    const twoMonthsAgo = lastMonth === 1 ? 12 : lastMonth - 1;
    const daysInTwoMonthsAgo = new Date(twoMonthsAgoYear, twoMonthsAgo, 0).getDate();
    prevStartDate = `${twoMonthsAgoYear}-${String(twoMonthsAgo).padStart(2, '0')}-01`;
    prevEndDate = `${twoMonthsAgoYear}-${String(twoMonthsAgo).padStart(2, '0')}-${String(daysInTwoMonthsAgo).padStart(2, '0')}`;
    prevPeriodeLabel = `${MONTH_NAMES_INDO[twoMonthsAgo - 1]} ${twoMonthsAgoYear}`;
  } else if (periodType === 'custom' || (filter?.startDate && filter?.endDate)) {
    let s = filter?.startDate || `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    let e = filter?.endDate || todayStr;
    if (e < s) {
      const tmp = s;
      s = e;
      e = tmp;
    }
    const maxEnd = addDaysToDateStr(s, 180);
    if (e > maxEnd) e = maxEnd;
    startDate = s;
    endDate = e;
    periodeLabel = `Periode Kustom (${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)})`;
    cashflowChartTitle = `Arus Kas Harian (${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)})`;

    const spanDays = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
    prevEndDate = addDaysToDateStr(startDate, -1);
    prevStartDate = addDaysToDateStr(prevEndDate, -spanDays + 1);
    prevPeriodeLabel = `${spanDays} Hari Sebelumnya`;
  } else if (periodType === 'q1') {
    startDate = `${currentYear}-01-01`;
    endDate = `${currentYear}-03-31`;
    periodeLabel = `Kuartal 1 (Jan - Mar ${currentYear})`;
    cashflowChartTitle = `Arus Kas Bulanan (${periodeLabel})`;
    prevStartDate = `${currentYear - 1}-10-01`;
    prevEndDate = `${currentYear - 1}-12-31`;
    prevPeriodeLabel = `Kuartal 4 ${currentYear - 1}`;
  } else if (periodType === 'q2') {
    startDate = `${currentYear}-04-01`;
    endDate = `${currentYear}-06-30`;
    periodeLabel = `Kuartal 2 (Apr - Jun ${currentYear})`;
    cashflowChartTitle = `Arus Kas Bulanan (${periodeLabel})`;
    prevStartDate = `${currentYear}-01-01`;
    prevEndDate = `${currentYear}-03-31`;
    prevPeriodeLabel = `Kuartal 1 ${currentYear}`;
  } else if (periodType === 'q3') {
    startDate = `${currentYear}-07-01`;
    endDate = `${currentYear}-09-30`;
    periodeLabel = `Kuartal 3 (Jul - Sep ${currentYear})`;
    cashflowChartTitle = `Arus Kas Bulanan (${periodeLabel})`;
    prevStartDate = `${currentYear}-04-01`;
    prevEndDate = `${currentYear}-06-30`;
    prevPeriodeLabel = `Kuartal 2 ${currentYear}`;
  } else if (periodType === 'q4') {
    startDate = `${currentYear}-10-01`;
    endDate = `${currentYear}-12-31`;
    periodeLabel = `Kuartal 4 (Okt - Des ${currentYear})`;
    cashflowChartTitle = `Arus Kas Bulanan (${periodeLabel})`;
    prevStartDate = `${currentYear}-07-01`;
    prevEndDate = `${currentYear}-09-30`;
    prevPeriodeLabel = `Kuartal 3 ${currentYear}`;
  } else if (periodType === 'this_year') {
    startDate = `${currentYear}-01-01`;
    endDate = `${currentYear}-12-31`;
    periodeLabel = `Tahun Ini (${currentYear})`;
    cashflowChartTitle = `Arus Kas Bulanan (Tahun ${currentYear})`;
    prevStartDate = `${currentYear - 1}-01-01`;
    prevEndDate = `${currentYear - 1}-12-31`;
    prevPeriodeLabel = `Tahun ${currentYear - 1}`;
  } else {
    startDate = '2025-01-01';
    endDate = todayStr;
    periodeLabel = 'Semua Waktu (Historis Lengkap)';
    cashflowChartTitle = 'Arus Kas Bulanan (Semua Waktu)';
    hasComparison = false;
  }

  // Load General Settings for Instructors
  const settings = await getGeneralSettings();
  const feeMobilOps = settings.gajiInstrukturOperasional || 50000;
  const feeMobilPribadi = settings.gajiInstrukturPribadi || 70000;
  const uangMakanPerHari = settings.uangMakanInstrukturHarian || 15000;
  const minSlotUangMakan = settings.minSlotUangMakan || 2;

  try {
    // 1. Fetch Students in Current Period with Package & Progress Info
    const siswaRows = await dbQuery<{
      id: string;
      nama: string;
      no_whatsapp: string;
      tanggal_booking: string;
      harga_final: number;
      status_pembayaran_kode: string;
      dp_nominal: number | null;
      sumber: string | null;
      sumber_kustom_text: string | null;
      paket_id: string;
      nama_paket: string;
      termasuk_sim: boolean;
      jumlah_sesi: number;
      status_sim: string;
      is_archived: boolean;
    }>(`
      SELECT 
        s.id, s.nama, s.no_whatsapp, s.tanggal_booking, s.harga_final, s.status_pembayaran_kode, s.dp_nominal,
        COALESCE(s.sumber::text, 'organik') as sumber, s.sumber_kustom_text, s.paket_id,
        p.nama_paket, p.termasuk_sim, COALESCE(p.jumlah_sesi, 10) as jumlah_sesi,
        COALESCE(s.status_sim, 'belum') as status_sim,
        COALESCE(s.is_archived, false) as is_archived
      FROM siswa s
      JOIN paket p ON s.paket_id = p.id
      WHERE s.tanggal_booking >= $1 AND s.tanggal_booking <= $2
    `, [startDate, endDate]);

    // 2. Fetch Aggregated Student Session Counts (from ALL schedules to detect progression)
    const studentSessionAgg = await dbQuery<{
      siswa_id: string;
      total_sesi: number;
      selesai_sesi: number;
      latest_sesi: string | null;
    }>(`
      SELECT 
        siswa_id,
        COUNT(*) as total_sesi,
        COUNT(CASE WHEN status_sesi = 'selesai' THEN 1 END) as selesai_sesi,
        MAX(tanggal_sesi) as latest_sesi
      FROM jadwal_sesi
      GROUP BY siswa_id
    `);
    const studentSessionMap = new Map<string, { total: number; selesai: number; latest: string | null }>();
    studentSessionAgg.forEach((r) => {
      studentSessionMap.set(r.siswa_id, {
        total: Number(r.total_sesi) || 0,
        selesai: Number(r.selesai_sesi) || 0,
        latest: r.latest_sesi,
      });
    });

    // 3. Fetch Sessions in Period
    const sesiRows = await dbQuery<{
      id: string;
      siswa_id: string;
      staff_id: string;
      kendaraan_id: string | null;
      tipe_kendaraan: string | null;
      tanggal_sesi: string;
      slot_waktu_id: string | null;
      slot_waktu_id_akhir: string | null;
      status_sesi: string;
      nama_staff: string;
      nama_kendaraan: string | null;
      plat_nomor: string | null;
    }>(`
      SELECT 
        js.id, js.siswa_id, js.staff_id, js.kendaraan_id, js.tipe_kendaraan,
        js.tanggal_sesi, js.slot_waktu_id, js.slot_waktu_id_akhir, js.status_sesi,
        st.nama as nama_staff,
        k.nama_kendaraan, k.plat_nomor
      FROM jadwal_sesi js
      LEFT JOIN staff st ON js.staff_id = st.id
      LEFT JOIN kendaraan k ON js.kendaraan_id = k.id
      WHERE js.tanggal_sesi >= $1 AND js.tanggal_sesi <= $2
    `, [startDate, endDate]);

    // 4. Fetch Slot Master
    const slotRows = await dbQuery<{ id: string; nama_slot: string; urutan: number }>('SELECT id, nama_slot, urutan FROM slot_waktu ORDER BY urutan ASC');

    // 5. Fetch Staff list (Active Instructors)
    const staffList = await dbQuery<{ id: string; nama: string }>(`
      SELECT s.id, s.nama FROM staff s
      JOIN staff_jabatan sj ON s.id = sj.staff_id
      JOIN jabatan j ON sj.jabatan_id = j.id
      WHERE LOWER(j.nama_jabatan) LIKE '%instruktur%' AND s.aktif = TRUE
      GROUP BY s.id, s.nama
      ORDER BY s.nama ASC
    `);

    // 6. Fetch Kendaraan & Logs
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

    // 7. Fetch Cashflow Transactions in Period
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

    // 8. Fetch Historical Monthly Trends (Last 6 Months)
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

    // 9. Fetch Previous Period Aggregates for MoM Comparison
    let prevOmzet = 0;
    let prevSiswa = 0;
    let prevPemasukan = 0;
    let prevPengeluaran = 0;
    let prevLaba = 0;
    let prevSesiSelesai = 0;
    let prevKmOperasional = 0;
    let prevLiterBBM = 0;

    if (hasComparison && prevStartDate && prevEndDate) {
      const prevSiswaRes = await dbQuerySingle<{ count: number; omzet: number }>(`
        SELECT COUNT(*) as count, COALESCE(SUM(harga_final), 0) as omzet
        FROM siswa
        WHERE tanggal_booking >= $1 AND tanggal_booking <= $2
      `, [prevStartDate, prevEndDate]);
      if (prevSiswaRes) {
        prevSiswa = Number(prevSiswaRes.count) || 0;
        prevOmzet = Number(prevSiswaRes.omzet) || 0;
      }

      const prevKasRes = await dbQuerySingle<{ pemasukan: number; pengeluaran: number }>(`
        SELECT 
          COALESCE(SUM(CASE WHEN tipe = 'pemasukan' THEN nominal ELSE 0 END), 0) as pemasukan,
          COALESCE(SUM(CASE WHEN tipe = 'pengeluaran' THEN nominal ELSE 0 END), 0) as pengeluaran
        FROM kas_transaksi
        WHERE tanggal >= $1 AND tanggal <= $2
      `, [prevStartDate, prevEndDate]);
      if (prevKasRes) {
        prevPemasukan = Number(prevKasRes.pemasukan) || 0;
        prevPengeluaran = Number(prevKasRes.pengeluaran) || 0;
        prevLaba = prevPemasukan - prevPengeluaran;
      }

      const prevSesiRes = await dbQuerySingle<{ selesai: number }>(`
        SELECT COUNT(*) as selesai
        FROM jadwal_sesi
        WHERE tanggal_sesi >= $1 AND tanggal_sesi <= $2 AND status_sesi = 'selesai'
      `, [prevStartDate, prevEndDate]);
      if (prevSesiRes) {
        prevSesiSelesai = Number(prevSesiRes.selesai) || 0;
      }

      const prevBBMRes = await dbQuerySingle<{ km: number; liter: number }>(`
        SELECT COALESCE(SUM(jarak_tempuh), 0) as km, COALESCE(SUM(bbm_liter), 0) as liter
        FROM kendaraan_log_harian
        WHERE tanggal >= $1 AND tanggal <= $2
      `, [prevStartDate, prevEndDate]);
      if (prevBBMRes) {
        prevKmOperasional = Number(prevBBMRes.km) || 0;
        prevLiterBBM = Number(prevBBMRes.liter) || 0;
      }
    }

    // --- AGGREGATIONS & CALCULATIONS ---

    // A. Student Summary & Funnel Calculations
    let totalSiswa = siswaRows.length;
    let totalOmzet = 0;
    let totalTerbayar = 0;
    let lunasCount = 0;
    let dpCount = 0;
    let belumBayarCount = 0;
    let activeScheduledCount = 0;
    let graduatedCount = 0;

    const channelMap: Record<string, { totalSiswa: number; totalOmzet: number; lunas: number }> = {};
    const packageMap: Record<string, { namaPaket: string; termasukSim: boolean; jumlahSesi: number; totalTerjual: number; totalOmzet: number }> = {};
    const debtorsList: AnalitikData['agingPiutang']['topDebtors'] = [];

    siswaRows.forEach((s) => {
      totalOmzet += s.harga_final;
      const progress = studentSessionMap.get(s.id);
      const scheduledSessions = progress ? progress.total : 0;
      const completedSessions = progress ? progress.selesai : 0;

      if (scheduledSessions > 0) {
        activeScheduledCount++;
      }

      // Check Graduation: either marked archived, sim done, or completed quota
      if (s.is_archived || s.status_sim === 'selesai' || completedSessions >= s.jumlah_sesi) {
        graduatedCount++;
      }

      // Payment Status
      let terbayarSiswa = 0;
      if (s.status_pembayaran_kode === 'lunas') {
        terbayarSiswa = s.harga_final;
        totalTerbayar += s.harga_final;
        lunasCount++;
      } else if (s.status_pembayaran_kode === 'dp') {
        terbayarSiswa = s.dp_nominal || 0;
        totalTerbayar += terbayarSiswa;
        dpCount++;
      } else {
        belumBayarCount++;
      }

      const sisaPiutangSiswa = s.harga_final - terbayarSiswa;
      if (sisaPiutangSiswa > 0) {
        const daysAging = Math.max(0, Math.round((new Date(todayStr).getTime() - new Date(s.tanggal_booking).getTime()) / 86400000));
        debtorsList.push({
          id: s.id,
          nama: s.nama,
          noWhatsapp: s.no_whatsapp,
          sisaPiutang: sisaPiutangSiswa,
          status: s.status_pembayaran_kode === 'dp' ? 'DP Sebagian' : 'Belum Bayar',
          tanggalBooking: s.tanggal_booking,
          daysAging,
        });
      }

      // Channel
      let ch = s.sumber || 'organik';
      if (ch === 'meta_ads') ch = 'Meta Ads';
      else if (ch === 'tiktok') ch = 'TikTok';
      else if (ch === 'referensi') ch = 'Referensi';
      else if (ch === 'kustom') ch = s.sumber_kustom_text || 'Kustom';
      else ch = 'Organik';

      if (!channelMap[ch]) channelMap[ch] = { totalSiswa: 0, totalOmzet: 0, lunas: 0 };
      channelMap[ch].totalSiswa++;
      channelMap[ch].totalOmzet += s.harga_final;
      if (s.status_pembayaran_kode === 'lunas') channelMap[ch].lunas++;

      // Package
      const pkg = s.nama_paket || 'Khusus';
      if (!packageMap[pkg]) {
        packageMap[pkg] = { namaPaket: pkg, termasukSim: s.termasuk_sim, jumlahSesi: s.jumlah_sesi, totalTerjual: 0, totalOmzet: 0 };
      }
      packageMap[pkg].totalTerjual++;
      packageMap[pkg].totalOmzet += s.harga_final;
    });

    const totalPiutang = totalOmzet - totalTerbayar;

    // Sort Debtors by Highest Sisa Piutang
    debtorsList.sort((a, b) => b.sisaPiutang - a.sisaPiutang);

    // Aging Piutang Brackets
    const bracket0to7 = debtorsList.filter((d) => d.daysAging <= 7);
    const bracket8to14 = debtorsList.filter((d) => d.daysAging >= 8 && d.daysAging <= 14);
    const bracket15to30 = debtorsList.filter((d) => d.daysAging >= 15 && d.daysAging <= 30);
    const bracket30plus = debtorsList.filter((d) => d.daysAging > 30);

    const agingBrackets = [
      { range: '0-7', label: '1 - 7 Hari (Baru)', count: bracket0to7.length, nominal: bracket0to7.reduce((acc, d) => acc + d.sisaPiutang, 0), persentase: totalPiutang > 0 ? Math.round((bracket0to7.reduce((acc, d) => acc + d.sisaPiutang, 0) / totalPiutang) * 100) : 0 },
      { range: '8-14', label: '8 - 14 Hari (Waspada)', count: bracket8to14.length, nominal: bracket8to14.reduce((acc, d) => acc + d.sisaPiutang, 0), persentase: totalPiutang > 0 ? Math.round((bracket8to14.reduce((acc, d) => acc + d.sisaPiutang, 0) / totalPiutang) * 100) : 0 },
      { range: '15-30', label: '15 - 30 Hari (Mendesak)', count: bracket15to30.length, nominal: bracket15to30.reduce((acc, d) => acc + d.sisaPiutang, 0), persentase: totalPiutang > 0 ? Math.round((bracket15to30.reduce((acc, d) => acc + d.sisaPiutang, 0) / totalPiutang) * 100) : 0 },
      { range: '>30', label: '> 30 Hari (Macet)', count: bracket30plus.length, nominal: bracket30plus.reduce((acc, d) => acc + d.sisaPiutang, 0), persentase: totalPiutang > 0 ? Math.round((bracket30plus.reduce((acc, d) => acc + d.sisaPiutang, 0) / totalPiutang) * 100) : 0 },
    ];

    // Multi-Stage Student Conversion Funnel Construction
    const dpOrPaidCount = dpCount + lunasCount;
    const bookingOmzet = totalOmzet;
    const terbayarOmzet = totalTerbayar;
    const leakageUnpaid = totalOmzet - terbayarOmzet;

    const funnelStages: FunnelStage[] = [
      {
        id: 'leads',
        name: '1. Pendaftaran Siswa (Leads Terdata)',
        shortLabel: 'Pendaftaran',
        description: 'Seluruh siswa terdata masuk ke sistem dari berbagai saluran promosi',
        count: totalSiswa,
        valueNominal: totalOmzet,
        stepConvRate: 100,
        overallConvRate: 100,
        dropOffCount: 0,
        dropOffRate: 0,
        revenueLeakage: 0,
        avgDays: 1,
        accentColor: '#8B5CF6',
        gradientFrom: '#8B5CF6',
        gradientTo: '#7C3AED',
      },
      {
        id: 'paket',
        name: '2. Pemilihan Paket Kursus (Booking)',
        shortLabel: 'Booking Paket',
        description: 'Siswa resmi memilih paket kursus dan jatah sesi pelatihan',
        count: totalSiswa,
        valueNominal: bookingOmzet,
        stepConvRate: 100,
        overallConvRate: 100,
        dropOffCount: 0,
        dropOffRate: 0,
        revenueLeakage: 0,
        avgDays: 2,
        accentColor: '#6366F1',
        gradientFrom: '#6366F1',
        gradientTo: '#4F46E5',
      },
      {
        id: 'dp',
        name: '3. Komitmen Uang Muka (DP)',
        shortLabel: 'Komitmen DP',
        description: 'Siswa membayar DP pertama sebagai bukti keseriusan',
        count: dpOrPaidCount,
        valueNominal: terbayarOmzet,
        stepConvRate: totalSiswa > 0 ? Math.round((dpOrPaidCount / totalSiswa) * 1000) / 10 : 0,
        overallConvRate: totalSiswa > 0 ? Math.round((dpOrPaidCount / totalSiswa) * 1000) / 10 : 0,
        dropOffCount: belumBayarCount,
        dropOffRate: totalSiswa > 0 ? Math.round((belumBayarCount / totalSiswa) * 1000) / 10 : 0,
        revenueLeakage: leakageUnpaid,
        avgDays: 4,
        accentColor: '#3B82F6',
        gradientFrom: '#3B82F6',
        gradientTo: '#2563EB',
      },
      {
        id: 'lunas',
        name: '4. Pelunasan Penuh (Paid in Full)',
        shortLabel: 'Lunas 100%',
        description: 'Siswa telah melunasi 100% total biaya kursus',
        count: lunasCount,
        valueNominal: siswaRows.filter((s) => s.status_pembayaran_kode === 'lunas').reduce((a, b) => a + b.harga_final, 0),
        stepConvRate: dpOrPaidCount > 0 ? Math.round((lunasCount / dpOrPaidCount) * 1000) / 10 : 0,
        overallConvRate: totalSiswa > 0 ? Math.round((lunasCount / totalSiswa) * 1000) / 10 : 0,
        dropOffCount: dpCount,
        dropOffRate: dpOrPaidCount > 0 ? Math.round((dpCount / dpOrPaidCount) * 1000) / 10 : 0,
        revenueLeakage: totalPiutang,
        avgDays: 7,
        accentColor: '#0EA5E9',
        gradientFrom: '#0EA5E9',
        gradientTo: '#0284C7',
      },
      {
        id: 'latihan',
        name: '5. Aktivasi Sesi Belajar (First Drive)',
        shortLabel: 'Aktivasi Latihan',
        description: 'Siswa aktif dijadwalkan dan memulai latihan mengemudi lapangan',
        count: activeScheduledCount,
        valueNominal: Math.round((activeScheduledCount / (totalSiswa || 1)) * totalOmzet),
        stepConvRate: dpOrPaidCount > 0 ? Math.round((activeScheduledCount / dpOrPaidCount) * 1000) / 10 : 0,
        overallConvRate: totalSiswa > 0 ? Math.round((activeScheduledCount / totalSiswa) * 1000) / 10 : 0,
        dropOffCount: Math.max(0, dpOrPaidCount - activeScheduledCount),
        dropOffRate: dpOrPaidCount > 0 ? Math.round((Math.max(0, dpOrPaidCount - activeScheduledCount) / dpOrPaidCount) * 1000) / 10 : 0,
        revenueLeakage: Math.round((Math.max(0, dpOrPaidCount - activeScheduledCount) / (totalSiswa || 1)) * totalOmzet),
        avgDays: 14,
        accentColor: '#0F7A73',
        gradientFrom: '#0F7A73',
        gradientTo: '#0D9488',
      },
      {
        id: 'lulus',
        name: '6. Tamat / Kelulusan Siswa (Alumni)',
        shortLabel: 'Lulus / Alumni',
        description: 'Siswa menyelesaikan seluruh jatah sesi & proses SIM',
        count: graduatedCount,
        valueNominal: Math.round((graduatedCount / (totalSiswa || 1)) * totalOmzet),
        stepConvRate: activeScheduledCount > 0 ? Math.round((graduatedCount / activeScheduledCount) * 1000) / 10 : 0,
        overallConvRate: totalSiswa > 0 ? Math.round((graduatedCount / totalSiswa) * 1000) / 10 : 0,
        dropOffCount: Math.max(0, activeScheduledCount - graduatedCount),
        dropOffRate: activeScheduledCount > 0 ? Math.round((Math.max(0, activeScheduledCount - graduatedCount) / activeScheduledCount) * 1000) / 10 : 0,
        revenueLeakage: 0,
        avgDays: 21,
        accentColor: '#10B981',
        gradientFrom: '#10B981',
        gradientTo: '#059669',
      },
    ];

    const overallConversionRate = totalSiswa > 0 ? Math.round((graduatedCount / totalSiswa) * 1000) / 10 : 0;

    // Detailed Student List for Funnel Drilldown Table
    const funnelStudents: FunnelStudent[] = siswaRows.map((s) => {
      const progress = studentSessionMap.get(s.id);
      const scheduledSessions = progress ? progress.total : 0;
      const completedSessions = progress ? progress.selesai : 0;
      let terbayarSiswa = 0;
      if (s.status_pembayaran_kode === 'lunas') {
        terbayarSiswa = s.harga_final;
      } else if (s.status_pembayaran_kode === 'dp') {
        terbayarSiswa = s.dp_nominal || 0;
      }
      const sisaPiutang = Math.max(0, s.harga_final - terbayarSiswa);
      const isGraduated = s.is_archived || s.status_sim === 'selesai' || completedSessions >= s.jumlah_sesi;

      let stageId: 'leads' | 'paket' | 'dp' | 'lunas' | 'latihan' | 'lulus' = 'leads';
      let stageLabel = 'Pendaftaran';

      if (isGraduated) {
        stageId = 'lulus';
        stageLabel = 'Lulus / Alumni';
      } else if (scheduledSessions > 0) {
        stageId = 'latihan';
        stageLabel = 'Aktivasi Latihan';
      } else if (s.status_pembayaran_kode === 'lunas') {
        stageId = 'lunas';
        stageLabel = 'Lunas Penuh';
      } else if (s.status_pembayaran_kode === 'dp') {
        stageId = 'dp';
        stageLabel = 'Komitmen DP';
      } else if (s.paket_id) {
        stageId = 'paket';
        stageLabel = 'Booking Paket';
      }

      const daysActive = Math.max(0, Math.round((new Date(todayStr).getTime() - new Date(s.tanggal_booking).getTime()) / 86400000));

      let ch = s.sumber || 'organik';
      if (ch === 'meta_ads') ch = 'Meta Ads';
      else if (ch === 'tiktok') ch = 'TikTok';
      else if (ch === 'referensi') ch = 'Referensi';
      else if (ch === 'kustom') ch = s.sumber_kustom_text || 'Kustom';
      else ch = 'Organik';

      return {
        id: s.id,
        nama: s.nama,
        noWhatsapp: s.no_whatsapp,
        tanggalBooking: s.tanggal_booking,
        namaPaket: s.nama_paket || 'Kursus Mengemudi',
        termasukSim: Boolean(s.termasuk_sim),
        sumber: ch,
        statusPembayaranKode: s.status_pembayaran_kode,
        hargaFinal: s.harga_final,
        terbayar: terbayarSiswa,
        sisaPiutang,
        totalSesi: s.jumlah_sesi || 10,
        selesaiSesi: completedSessions,
        currentStageId: stageId,
        currentStageLabel: stageLabel,
        daysActive,
      };
    });

    // Marketing Channels Breakdown
    const byChannel = Object.entries(channelMap).map(([channel, data]) => ({
      channel,
      totalSiswa: data.totalSiswa,
      totalOmzet: data.totalOmzet,
      persentase: totalSiswa > 0 ? Math.round((data.totalSiswa / totalSiswa) * 100) : 0,
      conversionRate: data.totalSiswa > 0 ? Math.round((data.lunas / data.totalSiswa) * 100) : 0,
    })).sort((a, b) => b.totalSiswa - a.totalSiswa);

    // Packages Breakdown
    const byPackage = Object.values(packageMap).map((pkg) => ({
      namaPaket: pkg.namaPaket,
      termasukSim: pkg.termasukSim,
      jumlahSesi: pkg.jumlahSesi,
      totalTerjual: pkg.totalTerjual,
      totalOmzet: pkg.totalOmzet,
      persentase: totalSiswa > 0 ? Math.round((pkg.totalTerjual / totalSiswa) * 100) : 0,
    })).sort((a, b) => b.totalTerjual - a.totalTerjual);

    const byPaymentStatus = [
      { status: 'lunas', label: 'Lunas Penuh', count: lunasCount, totalNominal: totalTerbayar, color: '#10B981' },
      { status: 'dp', label: 'DP (Sebagian)', count: dpCount, totalNominal: totalTerbayar, color: '#F59E0B' },
      { status: 'belum_bayar', label: 'Belum Bayar', count: belumBayarCount, totalNominal: 0, color: '#EF4444' },
    ];

    // B. Session Operations & Operational Funnel
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

    // Approximate Working Days in Range
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    const approxDaysInRange = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
    const activeStaffCount = staffList.length || 4;
    const slotsPerDay = slotRows.length || 6;
    const totalTheoreticalCapacity = activeStaffCount * slotsPerDay * approxDaysInRange;

    const sesiFunnel = {
      kapasitasTersedia: totalTheoreticalCapacity,
      sesiTerjadwal: totalSesi,
      sesiSelesai,
      sesiBatal,
      utilisasiKapasitas: totalTheoreticalCapacity > 0 ? Math.round((totalSesi / totalTheoreticalCapacity) * 100) : 0,
      fulfillmentRate: totalSesi > 0 ? Math.round((sesiSelesai / totalSesi) * 100) : 0,
      cancellationRate: cancellationRateSesi,
    };

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

    // C. Instructor Leaderboard & Workload
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
      dailySlotsMap: Map<string, number>;
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
        dailySlotsMap: new Map(),
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
          const isDouble = Boolean(ses.slot_waktu_id_akhir && ses.slot_waktu_id_akhir !== ses.slot_waktu_id);
          const slotDelta = isDouble ? 2 : 1;
          if (ses.tanggal_sesi) {
            const dateKey = ses.tanggal_sesi.slice(0, 10);
            item.dailySlotsMap.set(dateKey, (item.dailySlotsMap.get(dateKey) || 0) + slotDelta);
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
      let qualifyingDays = 0;
      ins.dailySlotsMap.forEach((slots) => {
        if (slots >= minSlotUangMakan) qualifyingDays += 1;
      });
      const estimasiUangMakan = qualifyingDays * uangMakanPerHari;
      const totalEstimasiGaji = estimasiHonorSesi + estimasiUangMakan;
      const maxSlotsPerInstructor = slotsPerDay * approxDaysInRange;
      const capacityUtilization = maxSlotsPerInstructor > 0 ? Math.round((ins.totalSesi / maxSlotsPerInstructor) * 100) : 0;

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
        cancellationRate: ins.totalSesi > 0 ? Math.round((ins.sesiBatal / ins.totalSesi) * 100) : 0,
        capacityUtilization,
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

    // Cashflow Trend Calculation
    let cashflowTrend: AnalitikData['finansialExecutive']['cashflowTrend'] = [];

    if (isDaily) {
      const dailyKasMap = new Map<string, { pemasukan: number; pengeluaran: number }>();
      kasRows.forEach((k) => {
        const dKey = k.tanggal.slice(0, 10);
        const prev = dailyKasMap.get(dKey) || { pemasukan: 0, pengeluaran: 0 };
        const nom = Number(k.nominal) || 0;
        if (k.tipe === 'pemasukan') {
          prev.pemasukan += nom;
        } else {
          prev.pengeluaran += nom;
        }
        dailyKasMap.set(dKey, prev);
      });

      let curr = startDate;
      while (curr <= endDate) {
        const parts = curr.split('-');
        const d = parseInt(parts[2], 10);
        const m = parseInt(parts[1], 10) - 1;
        const val = dailyKasMap.get(curr) || { pemasukan: 0, pengeluaran: 0 };
        const label = `${String(d).padStart(2, '0')} ${MONTH_SHORT[m]}`;

        cashflowTrend.push({
          dateKey: curr,
          dateLabel: label,
          bulanKey: curr,
          bulanLabel: label,
          pemasukan: val.pemasukan,
          pengeluaran: val.pengeluaran,
          netProfit: val.pemasukan - val.pengeluaran,
        });

        curr = addDaysToDateStr(curr, 1);
      }
    } else {
      const monthlyKasMap = new Map<string, { pemasukan: number; pengeluaran: number }>();
      kasRows.forEach((k) => {
        const mKey = k.tanggal.slice(0, 7);
        const prev = monthlyKasMap.get(mKey) || { pemasukan: 0, pengeluaran: 0 };
        const nom = Number(k.nominal) || 0;
        if (k.tipe === 'pemasukan') {
          prev.pemasukan += nom;
        } else {
          prev.pengeluaran += nom;
        }
        monthlyKasMap.set(mKey, prev);
      });

      const startYear = parseInt(startDate.slice(0, 4), 10);
      const startMonth = parseInt(startDate.slice(5, 7), 10);
      const endYear = parseInt(endDate.slice(0, 4), 10);
      const endMonth = parseInt(endDate.slice(5, 7), 10);

      let y = startYear;
      let m = startMonth;
      while (y < endYear || (y === endYear && m <= endMonth)) {
        const bKey = `${y}-${String(m).padStart(2, '0')}`;
        const val = monthlyKasMap.get(bKey) || { pemasukan: 0, pengeluaran: 0 };
        const label = `${MONTH_SHORT[m - 1]} ${y}`;

        cashflowTrend.push({
          dateKey: bKey,
          dateLabel: label,
          bulanKey: bKey,
          bulanLabel: label,
          pemasukan: val.pemasukan,
          pengeluaran: val.pengeluaran,
          netProfit: val.pemasukan - val.pengeluaran,
        });

        m++;
        if (m > 12) {
          m = 1;
          y++;
        }
      }
    }

    const cashflowMonthly = cashflowTrend;

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

    // F. MoM Deltas Calculation
    const calcDelta = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    const prevEfisiensiBBM = prevLiterBBM > 0 ? Math.round((prevKmOperasional / prevLiterBBM) * 100) / 100 : 0;

    const comparisonMoM = {
      hasComparison,
      prevPeriodeLabel,
      prevStartDate,
      prevEndDate,
      deltaOmzet: calcDelta(totalOmzet, prevOmzet),
      deltaSiswa: calcDelta(totalSiswa, prevSiswa),
      deltaPemasukan: calcDelta(totalPemasukanKas, prevPemasukan),
      deltaPengeluaran: calcDelta(totalPengeluaranKas, prevPengeluaran),
      deltaLabaBersih: calcDelta(labaBersih, prevLaba),
      deltaSesiSelesai: calcDelta(sesiSelesai, prevSesiSelesai),
      deltaEfisiensiBBM: calcDelta(rataRataEfisiensiBBM, prevEfisiensiBBM),
    };

    // G. Unit Economics Calculation
    const arpu = totalSiswa > 0 ? Math.round(totalOmzet / totalSiswa) : 0;
    const avgCostPerSiswa = totalSiswa > 0 ? Math.round(totalPengeluaranKas / totalSiswa) : 0;
    const revenuePerSesi = sesiSelesai > 0 ? Math.round(totalOmzet / sesiSelesai) : 0;
    const costPerSesi = sesiSelesai > 0 ? Math.round(totalPengeluaranKas / sesiSelesai) : 0;
    const grossMarginPerSesi = revenuePerSesi - costPerSesi;
    const fleetUtilizationRate = totalTheoreticalCapacity > 0 ? Math.round((sesiSelesai / totalTheoreticalCapacity) * 100) : 0;
    const instructorAvgLoad = activeStaffCount > 0 ? Math.round(sesiSelesai / activeStaffCount) : 0;

    // H. Enterprise Bottlenecks & Friction Diagnostic Engine
    const bottlenecks: BottleneckItem[] = [];

    // Bottleneck 1: Revenue Leakage (Piutang Menumpuk)
    if (totalPiutang > 0) {
      const piutangRatio = totalOmzet > 0 ? Math.round((totalPiutang / totalOmzet) * 100) : 0;
      const isCritical = piutangRatio > 35;
      bottlenecks.push({
        id: 'revenue_leakage_piutang',
        title: 'Kebocoran Kas: Piutang Belum Tertagih',
        category: 'keuangan',
        categoryLabel: 'Keuangan & Kas',
        severity: isCritical ? 'critical' : 'warning',
        impactMetric: 'Total Piutang Tertahan',
        impactValue: `Rp ${totalPiutang.toLocaleString('id-ID')} (${piutangRatio}% dari Omzet)`,
        description: `Terdapat ${debtorsList.length} siswa dengan pembayaran belum lunas (${dpCount} DP, ${belumBayarCount} Belum Bayar). Sebanyak ${bracket15to30.length + bracket30plus.length} siswa sudah menunggak di atas 14 hari.`,
        rootCause: 'Siswa diperbolehkan mengikuti sesi latihan sebelum melunasi 100% sisa biaya kursus.',
        actionRecommendation: 'Terapkan kebijakan wajib lunas sebelum sesi ke-3 atau kirim tagihan WhatsApp otomatis kepada siswa status DP.',
        actionLabel: 'Buka Manajemen Siswa',
        actionRoute: '/siswa',
      });
    }

    // Bottleneck 2: Inactive / Stagnant Students
    let stagnantStudentsCount = 0;
    siswaRows.forEach((s) => {
      const prog = studentSessionMap.get(s.id);
      const isCompleted = s.is_archived || s.status_sim === 'selesai' || (prog && prog.selesai >= s.jumlah_sesi);
      if (!isCompleted) {
        if (prog && prog.latest) {
          const daysSinceLastSession = Math.round((new Date(todayStr).getTime() - new Date(prog.latest).getTime()) / 86400000);
          if (daysSinceLastSession >= 14) stagnantStudentsCount++;
        } else {
          // No session yet and booking date is >14 days ago
          const daysSinceBooking = Math.round((new Date(todayStr).getTime() - new Date(s.tanggal_booking).getTime()) / 86400000);
          if (daysSinceBooking >= 14) stagnantStudentsCount++;
        }
      }
    });

    if (stagnantStudentsCount > 0) {
      bottlenecks.push({
        id: 'stagnant_students',
        title: 'Stagnasi Belajar: Siswa Aktif Terhenti >14 Hari',
        category: 'siswa',
        categoryLabel: 'Perjalanan Siswa',
        severity: stagnantStudentsCount > 5 ? 'critical' : 'warning',
        impactMetric: 'Siswa Gantung',
        impactValue: `${stagnantStudentsCount} Siswa`,
        description: `${stagnantStudentsCount} siswa belum menyelesaikan kursus namun tidak memiliki jadwal sesi dalam 14 hari terakhir. Risiko churn dan lupa materi mengemudi sangat tinggi.`,
        rootCause: 'Tidak adanya sistem peringatan re-scheduling proaktif saat siswa absen latihan selama 2 minggu berturut-turut.',
        actionRecommendation: 'Instruksikan tim admin untuk menghubungi siswa melalui WhatsApp guna menjadwalkan ulang sesi tersisa.',
        actionLabel: 'Periksa Jadwal Belajar',
        actionRoute: '/jadwal',
      });
    }

    // Bottleneck 3: Dead Slots & Low Capacity Utilization
    const deadSlots = bySlotWaktu.filter((s) => s.persentase < 12);
    if (deadSlots.length > 0 && totalSesi > 10) {
      const deadSlotNames = deadSlots.map((s) => s.namaSlot).join(', ');
      bottlenecks.push({
        id: 'dead_slots_capacity',
        title: 'Inefisiensi Kapasitas: Jam Belajar Sepi Peminat',
        category: 'jadwal',
        categoryLabel: 'Operasional Sesi',
        severity: 'optimization',
        impactMetric: 'Slot Underutilized',
        impactValue: `${deadSlots.length} Slot Waktu (${deadSlotNames})`,
        description: `Slot waktu [${deadSlotNames}] hanya menyumbang porsi sangat kecil (<12%) dari total latihan mengemudi, menyebabkan armada dan instruktur idle (menganggur).`,
        rootCause: 'Jam belajar bertepatan dengan jam kerja/sekolah tanpa adanya insentif khusus bagi calon siswa.',
        actionRecommendation: 'Buka paket promosi diskon khusus "Happy Hour Slot Pagi/Sore" untuk menarik siswa fleksibel dan mengoptimalkan aset.',
        actionLabel: 'Atur Master Slot & Paket',
        actionRoute: '/paket',
      });
    }

    // Bottleneck 4: High Cancellation Friction
    if (cancellationRateSesi > 10 && totalSesi > 10) {
      bottlenecks.push({
        id: 'cancellation_friction',
        title: 'Friksi Jadwal: Tingkat Pembatalan Sesi Tinggi',
        category: 'instruktur',
        categoryLabel: 'Instruktur & Jadwal',
        severity: cancellationRateSesi > 20 ? 'critical' : 'warning',
        impactMetric: 'Tingkat Batal',
        impactValue: `${cancellationRateSesi}% (${sesiBatal} Sesi Batal)`,
        description: `Terdapat ${sesiBatal} sesi yang dibatalkan pada periode ini. Hal ini menyebabkan pemborosan alokasi mobil dan jam kerja instruktur.`,
        rootCause: 'Ketidakhadiran mendadak tanpa konfirmasi H-1 atau kendala bentrok jadwal siswa.',
        actionRecommendation: 'Aktifkan reminder konfirmasi kehadiran H-1 otomatis via WA dan berlakukan kuota reschedule maksimal 2 kali.',
        actionLabel: 'Pantau Jadwal Sesi',
        actionRoute: '/jadwal',
      });
    }

    // Bottleneck 5: Fleet Health & Fuel Inefficiency
    const urgentFleet = armadaAnalytics.filter((a) => a.perluPerhatian);
    const inefficientFleet = armadaAnalytics.filter((a) => a.kmPerLiter > 0 && a.kmPerLiter < 7.5);

    if (urgentFleet.length > 0 || inefficientFleet.length > 0) {
      bottlenecks.push({
        id: 'fleet_health_risk',
        title: 'Beban Operasional Armada: Mobil Perlu Servis & Boros BBM',
        category: 'armada',
        categoryLabel: 'Armada & Pemeliharaan',
        severity: urgentFleet.length > 0 ? 'critical' : 'warning',
        impactMetric: 'Unit Berisiko',
        impactValue: `${urgentFleet.length} Butuh Servis, ${inefficientFleet.length} Boros BBM`,
        description: `Kendaraan [${urgentFleet.map((f) => f.nama).join(', ')}] telah melampaui batas jarak servis oli. ${inefficientFleet.length > 0 ? `Unit [${inefficientFleet.map((f) => f.nama).join(', ')}] mencatat efisiensi BBM di bawah standar (<7.5 km/L).` : ''}`,
        rootCause: 'Penundaan servis rutin dan filter udara/oli kotor meningkatkan gesekan mesin dan konsumsi bahan bakar.',
        actionRecommendation: 'Kirim unit ke bengkel rekanan minggu ini untuk tune-up dan ganti oli guna menekan biaya operasional BBM harian.',
        actionLabel: 'Buka Manajemen Armada',
        actionRoute: '/kendaraan',
      });
    }

    // Strategic Insights (Bahan Rapat & Evaluasi Bisnis)
    const strategicInsights: AnalitikData['strategicInsights'] = [];

    if (byChannel.length > 0) {
      const topChannel = byChannel[0];
      strategicInsights.push({
        type: 'positive',
        title: `Saluran Marketing Juara: ${topChannel.channel} (${topChannel.persentase}% Siswa)`,
        description: `${topChannel.channel} menghasilkan ${topChannel.totalSiswa} siswa baru dengan kontribusi omzet Rp ${topChannel.totalOmzet.toLocaleString('id-ID')} dan rasio pelunasan ${topChannel.conversionRate}%.`,
        recommendation: `Tingkatkan anggaran kampanye di ${topChannel.channel} dan replikasi materi iklan pemenang ke channel lain.`,
      });
    }

    if (byPackage.length > 0) {
      const topPackage = byPackage[0];
      strategicInsights.push({
        type: 'info',
        title: `Paket Paling Laris: ${topPackage.namaPaket}`,
        description: `Menyumbang ${topPackage.persentase}% dari total pendaftaran dengan omzet Rp ${topPackage.totalOmzet.toLocaleString('id-ID')}.`,
        recommendation: topPackage.termasukSim
          ? 'Paket bundling SIM terbukti menjadi pendorong konversi tertinggi. Jaga kecepatan proses administrasi SIM.'
          : 'Tawarkan opsi add-on pengurusan SIM pada paket ini untuk meningkatkan Average Revenue Per User (ARPU).',
      });
    }

    const result: AnalitikData = {
      periodeLabel,
      startDate,
      endDate,
      comparisonMoM,
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
      conversionFunnel: {
        stages: funnelStages,
        overallConversionRate,
        totalRevenueLeakage: leakageUnpaid,
        activeVelocityDays: 21,
        funnelStudents,
      },
      sesiFunnel,
      unitEconomics: {
        arpu,
        avgCostPerSiswa,
        grossMarginPerSesi,
        fleetUtilizationRate,
        instructorAvgLoad,
      },
      agingPiutang: {
        totalPiutang,
        siswaUnpaidCount: debtorsList.length,
        brackets: agingBrackets,
        topDebtors: debtorsList.slice(0, 8),
      },
      bottlenecks,
      siswaGrowth: {
        byChannel,
        byPackage,
        byPaymentStatus,
        completionRate: {
          totalSiswa,
          siswaLulus: graduatedCount,
          siswaOnProgress: activeScheduledCount,
          siswaBelumJadwal: belumBayarCount,
          rate: overallConversionRate,
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
        cashflowTrend,
        cashflowMonthly,
        cashflowGrouping: isDaily ? 'daily' : 'monthly',
        cashflowChartTitle,
      },
      strategicInsights,
    };

    cacheSet(cacheKey, result, 120);
    return result;
  } catch (err: any) {
    console.error('Error generating analitik data:', err);
    throw err;
  }
}
