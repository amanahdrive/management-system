import { NextResponse } from 'next/server';
import {
  getKasOverviewMetrics,
  getKasTransaksiList,
  getKasKategoriList,
  getHutangList,
  getDpKustomList,
  getStaffKasbonSummary,
} from '@/lib/actions/kas';
import { getSiswaList } from '@/lib/actions/siswa';
import { getPaketList, getStaffList, getKendaraanMasterList } from '@/lib/actions/master-data';
import { getRekeningList } from '@/lib/actions/rekening';
import {
  DEFAULT_KAS_KATEGORI,
  DEFAULT_REKENING_LIST,
  calculateLocalKasMetrics,
} from '@/lib/constants/finance';
import { getPosPengeluaranList } from '@/lib/actions/pos-pengeluaran';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      txSettled,
      katSettled,
      sisSettled,
      pakSettled,
      hutSettled,
      dpkSettled,
      rekSettled,
      stfSettled,
      ksbSettled,
      kndSettled,
      ovSettled,
      posSettled,
    ] = await Promise.allSettled([
      getKasTransaksiList(),
      getKasKategoriList(),
      getSiswaList(),
      getPaketList(),
      getHutangList(),
      getDpKustomList(),
      getRekeningList(),
      getStaffList(),
      getStaffKasbonSummary(),
      getKendaraanMasterList(),
      getKasOverviewMetrics(),
      getPosPengeluaranList({ status: 'belum_bayar' }),
    ]);

    const transaksi = txSettled.status === 'fulfilled' ? txSettled.value : [];
    const kategori =
      katSettled.status === 'fulfilled' && katSettled.value.length > 0
        ? katSettled.value
        : DEFAULT_KAS_KATEGORI;
    const siswa = sisSettled.status === 'fulfilled' ? sisSettled.value : [];
    const paket = pakSettled.status === 'fulfilled' ? pakSettled.value : [];
    const hutang = hutSettled.status === 'fulfilled' ? hutSettled.value : [];
    const dpKustom = dpkSettled.status === 'fulfilled' ? dpkSettled.value : [];
    const rekening =
      rekSettled.status === 'fulfilled' && rekSettled.value.length > 0
        ? rekSettled.value
        : DEFAULT_REKENING_LIST;
    const staff = stfSettled.status === 'fulfilled' ? stfSettled.value : [];
    const staffKasbon = ksbSettled.status === 'fulfilled' ? ksbSettled.value : [];
    const kendaraan = kndSettled.status === 'fulfilled' ? kndSettled.value : [];
    const posPengeluaran = posSettled.status === 'fulfilled' ? posSettled.value : [];

    const metrics =
      ovSettled.status === 'fulfilled' && ovSettled.value?.saldoAktif !== undefined
        ? ovSettled.value
        : calculateLocalKasMetrics(transaksi, siswa, hutang, staffKasbon, posPengeluaran);

    return NextResponse.json({
      success: true,
      metrics,
      transaksi,
      kategori,
      siswa,
      paket,
      hutang,
      rekening,
      dpKustom,
      staff,
      staffKasbon,
      kendaraan,
      posPengeluaran,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Error in /api/finance/data route:', err);
    return NextResponse.json({
      success: false,
      metrics: calculateLocalKasMetrics([], [], []),
      transaksi: [],
      kategori: DEFAULT_KAS_KATEGORI,
      siswa: [],
      paket: [],
      hutang: [],
      rekening: DEFAULT_REKENING_LIST,
      dpKustom: [],
      error: err?.message || 'Gagal memuat data keuangan',
    });
  }
}
