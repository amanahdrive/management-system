'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { Insiden, StatusPenangananEnum } from '@/types/database';
import { revalidatePath } from 'next/cache';
import { formatHariTanggalIndo, formatDateIndo } from '../utils/date';
import { formatRupiah } from '../utils/currency';

export interface InsidenFilter {
  status?: string;
  kategori?: string;
  tingkatKeparahan?: string;
  startDate?: string;
  endDate?: string;
  kendaraanId?: string;
  staffId?: string;
  siswaId?: string;
  search?: string;
}

export async function getInsidenList(filter?: InsidenFilter): Promise<Insiden[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('insiden')
      .select('*, kendaraan(*), staff(*), siswa(*), jadwal_sesi(*)')
      .order('tanggal_insiden', { ascending: false })
      .order('created_at', { ascending: false });

    if (filter?.status && filter.status !== 'semua') {
      query = query.eq('status_penanganan', filter.status);
    }

    if (filter?.kategori && filter.kategori !== 'semua') {
      query = query.eq('kategori', filter.kategori);
    }

    if (filter?.tingkatKeparahan && filter.tingkatKeparahan !== 'semua') {
      query = query.eq('tingkat_keparahan', filter.tingkatKeparahan);
    }

    if (filter?.kendaraanId && filter.kendaraanId !== 'semua') {
      query = query.eq('kendaraan_id', filter.kendaraanId);
    }

    if (filter?.staffId && filter.staffId !== 'semua') {
      query = query.eq('staff_id', filter.staffId);
    }

    if (filter?.startDate) {
      query = query.gte('tanggal_insiden', filter.startDate);
    }

    if (filter?.endDate) {
      query = query.lte('tanggal_insiden', filter.endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching insiden list:', error);
      return [];
    }

    let result = (data as Insiden[]) || [];

    if (filter?.search && filter.search.trim() !== '') {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.kode_insiden.toLowerCase().includes(q) ||
          item.lokasi_kejadian.toLowerCase().includes(q) ||
          item.deskripsi_kejadian.toLowerCase().includes(q) ||
          item.kendaraan?.nama_kendaraan.toLowerCase().includes(q) ||
          item.kendaraan?.plat_nomor.toLowerCase().includes(q) ||
          item.staff?.nama.toLowerCase().includes(q) ||
          item.siswa?.nama.toLowerCase().includes(q)
      );
    }

    return result;
  } catch (err) {
    console.error('Unexpected error fetching insiden list:', err);
    return [];
  }
}

export async function getInsidenById(id: string): Promise<Insiden | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('insiden')
      .select('*, kendaraan(*), staff(*), siswa(*), jadwal_sesi(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching insiden by id:', error);
      return null;
    }

    return (data as Insiden) || null;
  } catch (err) {
    console.error('Unexpected error in getInsidenById:', err);
    return null;
  }
}

async function generateNextKodeInsiden(): Promise<string> {
  const supabase = createAdminClient();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `INS-${yearMonth}-`;

  const { data } = await supabase
    .from('insiden')
    .select('kode_insiden')
    .ilike('kode_insiden', `${prefix}%`)
    .order('kode_insiden', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    return `${prefix}001`;
  }

  const lastKode = data[0].kode_insiden;
  const parts = lastKode.split('-');
  const seqStr = parts[parts.length - 1];
  const nextSeq = (parseInt(seqStr, 10) || 0) + 1;

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

export async function createInsiden(
  payload: Omit<Insiden, 'id' | 'kode_insiden' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: Insiden; error?: string }> {
  try {
    const supabase = createAdminClient();
    const kode_insiden = await generateNextKodeInsiden();

    const insertData = {
      ...payload,
      kode_insiden,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('insiden')
      .insert(insertData)
      .select('*, kendaraan(*), staff(*), siswa(*)')
      .single();

    if (error) {
      console.error('Error creating insiden:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/insiden');
    revalidatePath('/kendaraan');
    revalidatePath('/dashboard');

    return { success: true, data: data as Insiden };
  } catch (err: any) {
    console.error('Unexpected error in createInsiden:', err);
    return { success: false, error: err.message || 'Gagal menyimpan data insiden' };
  }
}

export async function updateInsiden(
  id: string,
  payload: Partial<Insiden>
): Promise<{ success: boolean; data?: Insiden; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Remove joined fields before updating
    const { kendaraan, staff, siswa, jadwal_sesi, ...cleanPayload } = payload;

    const { data, error } = await supabase
      .from('insiden')
      .update({
        ...cleanPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, kendaraan(*), staff(*), siswa(*)')
      .single();

    if (error) {
      console.error('Error updating insiden:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/insiden');
    revalidatePath('/kendaraan');
    revalidatePath('/dashboard');

    return { success: true, data: data as Insiden };
  } catch (err: any) {
    console.error('Unexpected error in updateInsiden:', err);
    return { success: false, error: err.message || 'Gagal memperbarui data insiden' };
  }
}

export async function updateInsidenStatus(
  id: string,
  status: StatusPenangananEnum,
  tindakanPenanganan?: string,
  biayaAktual?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const updateData: Record<string, any> = {
      status_penanganan: status,
      updated_at: new Date().toISOString(),
    };

    if (tindakanPenanganan !== undefined) {
      updateData.tindakan_penanganan = tindakanPenanganan;
    }

    if (biayaAktual !== undefined) {
      updateData.biaya_aktual = biayaAktual;
    }

    const { error } = await supabase
      .from('insiden')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/insiden');
    revalidatePath('/kendaraan');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteInsiden(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('insiden').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/insiden');
    revalidatePath('/kendaraan');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getInsidenStats(): Promise<{
  totalInsiden: number;
  dalamPenanganan: number;
  selesai: number;
  totalEstimasiBiaya: number;
  totalBiayaAktual: number;
  kategoriCounts: Record<string, number>;
  keparahanCounts: Record<string, number>;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('insiden')
      .select('status_penanganan, kategori, tingkat_keparahan, estimasi_biaya, biaya_aktual');

    if (error || !data) {
      return {
        totalInsiden: 0,
        dalamPenanganan: 0,
        selesai: 0,
        totalEstimasiBiaya: 0,
        totalBiayaAktual: 0,
        kategoriCounts: {},
        keparahanCounts: {},
      };
    }

    let totalInsiden = data.length;
    let dalamPenanganan = 0;
    let selesai = 0;
    let totalEstimasiBiaya = 0;
    let totalBiayaAktual = 0;
    const kategoriCounts: Record<string, number> = {};
    const keparahanCounts: Record<string, number> = {};

    data.forEach((row) => {
      if (['selesai', 'klaim_asuransi'].includes(row.status_penanganan)) {
        selesai++;
      } else {
        dalamPenanganan++;
      }

      totalEstimasiBiaya += Number(row.estimasi_biaya || 0);
      totalBiayaAktual += Number(row.biaya_aktual || 0);

      const kat = row.kategori || 'lainnya';
      kategoriCounts[kat] = (kategoriCounts[kat] || 0) + 1;

      const kep = row.tingkat_keparahan || 'ringan';
      keparahanCounts[kep] = (keparahanCounts[kep] || 0) + 1;
    });

    return {
      totalInsiden,
      dalamPenanganan,
      selesai,
      totalEstimasiBiaya,
      totalBiayaAktual,
      kategoriCounts,
      keparahanCounts,
    };
  } catch (err) {
    return {
      totalInsiden: 0,
      dalamPenanganan: 0,
      selesai: 0,
      totalEstimasiBiaya: 0,
      totalBiayaAktual: 0,
      kategoriCounts: {},
      keparahanCounts: {},
    };
  }
}

export async function generateWhatsAppInsidenText(id: string): Promise<string> {
  const ins = await getInsidenById(id);
  if (!ins) return 'Data insiden tidak ditemukan';

  const tgl = formatHariTanggalIndo(ins.tanggal_insiden);
  const keparahanBadge =
    ins.tingkat_keparahan === 'kritis'
      ? '🔴 KRITIS'
      : ins.tingkat_keparahan === 'berat'
      ? '🟠 BERAT'
      : ins.tingkat_keparahan === 'sedang'
      ? '🟡 SEDANG'
      : '🟢 RINGAN';

  const statusLabel =
    ins.status_penanganan === 'selesai'
      ? '✅ SELESAI'
      : ins.status_penanganan === 'klaim_asuransi'
      ? '🛡️ KLAIM ASURANSI'
      : ins.status_penanganan === 'dalam_perbaikan'
      ? '🛠️ DALAM PERBAIKAN'
      : ins.status_penanganan === 'dalam_investigasi'
      ? '🔍 DALAM INVESTIGASI'
      : '📋 DILAPORKAN';

  let body = `*LAPORAN INSIDEN OPERASIONAL*\n`;
  body += `*Amanah Drive Palembang*\n`;
  body += `Kode: *${ins.kode_insiden}*\n`;
  body += `────────────────────────\n`;
  body += `📅 Waktu: *${tgl}* pukul *${ins.jam_insiden || '08:00'} WIB*\n`;
  body += `📍 Lokasi: *${ins.lokasi_kejadian}*\n`;
  body += `⚠️ Tingkat Keparahan: *${keparahanBadge}*\n`;
  body += `🏷️ Kategori: *${ins.kategori.toUpperCase().replace('_', ' ')}*\n`;
  body += `────────────────────────\n`;
  body += `🚗 Armada Mobil: *${ins.kendaraan?.nama_kendaraan || '-'}* (${ins.kendaraan?.plat_nomor || '-'})\n`;
  body += `👨‍🏫 Instruktur/Staff: *${ins.staff?.nama || '-'}*\n`;
  if (ins.siswa) {
    body += `👤 Siswa Terlibat: *${ins.siswa.nama}* (${ins.siswa.kode_siswa})\n`;
  }
  body += `────────────────────────\n`;
  body += `📝 *Deskripsi & Kronologi Kejadian:*\n`;
  body += `${ins.deskripsi_kejadian}\n\n`;

  if (ins.kondisi_kendaraan) {
    body += `🔧 *Kondisi Armada:* ${ins.kondisi_kendaraan}\n`;
  }
  if (ins.kondisi_pengemudi) {
    body += `🩺 *Kondisi Pengemudi/Siswa:* ${ins.kondisi_pengemudi}\n`;
  }

  body += `────────────────────────\n`;
  body += `💰 Estimasi Biaya: *${formatRupiah(ins.estimasi_biaya || 0)}*\n`;
  if (ins.biaya_aktual && ins.biaya_aktual > 0) {
    body += `💵 Biaya Aktual: *${formatRupiah(ins.biaya_aktual)}*\n`;
  }
  body += `🛡️ Penanggung Biaya: *${ins.penanggung_biaya.toUpperCase().replace('_', ' ')}*\n`;
  body += `📊 Status Penanganan: *${statusLabel}*\n`;

  if (ins.tindakan_penanganan) {
    body += `🛠️ *Tindakan Penanganan:* ${ins.tindakan_penanganan}\n`;
  }

  if (ins.catatan) {
    body += `\n📌 *Catatan:* ${ins.catatan}\n`;
  }

  body += `────────────────────────\n`;
  body += `_Laporan Sistem Manajemen Amanah Drive_`;

  return body;
}
