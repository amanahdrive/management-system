'use server';

import { createServerClient } from '@/lib/supabase/server';
import { KasTransaksi, Hutang, KasKategori } from '@/types/database';
import { revalidatePath } from 'next/cache';

export async function getKasOverviewMetrics() {
  try {
    const supabase = await createServerClient();

    // Query Saldo
    const { data: txList } = await supabase.from('kas_transaksi').select('tipe, nominal');
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    if (txList) {
      txList.forEach((t) => {
        if (t.tipe === 'pemasukan') totalPemasukan += t.nominal;
        else totalPengeluaran += t.nominal;
      });
    }

    // Query Piutang
    const { data: siswaList } = await supabase.from('siswa').select('harga_final, dp_nominal, status_pembayaran_kode');
    let totalPiutang = 0;
    if (siswaList) {
      siswaList.forEach((s) => {
        if (s.status_pembayaran_kode === 'dp') {
          totalPiutang += s.harga_final - (s.dp_nominal || 0);
        } else if (s.status_pembayaran_kode === 'belum_bayar') {
          totalPiutang += s.harga_final;
        }
      });
    }

    // Query Hutang
    const { data: hutangList } = await supabase.from('hutang').select('sisa_hutang').eq('status', 'berjalan');
    let totalHutang = 0;
    if (hutangList) {
      hutangList.forEach((h) => {
        totalHutang += h.sisa_hutang;
      });
    }

    return {
      saldoAktif: totalPemasukan - totalPengeluaran,
      totalPiutang,
      totalHutang,
    };
  } catch (e) {
    console.error('Error fetching kas overview metrics:', e);
  }

  return {
    saldoAktif: 0,
    totalPiutang: 0,
    totalHutang: 0,
  };
}

export async function getKasKategoriList(): Promise<KasKategori[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('kas_kategori').select('*').order('nama_kategori');
    if (!error && data) return data as KasKategori[];
  } catch (e) {
    console.error('Error fetching kas kategori:', e);
  }
  return [];
}

export async function getKasTransaksiList(filters?: {
  startDate?: string;
  endDate?: string;
  tipe?: string;
  kategori?: string;
  sumberOtomatis?: boolean;
}): Promise<KasTransaksi[]> {
  try {
    const supabase = await createServerClient();
    let q = supabase
      .from('kas_transaksi')
      .select('*, siswa(*), hutang(*)')
      .order('tanggal', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.startDate) q = q.gte('tanggal', filters.startDate);
    if (filters?.endDate) q = q.lte('tanggal', filters.endDate);
    if (filters?.tipe && filters.tipe !== 'semua') q = q.eq('tipe', filters.tipe);
    if (filters?.kategori && filters.kategori !== 'semua') q = q.eq('kategori', filters.kategori);

    const { data, error } = await q;
    if (!error && data) return data as KasTransaksi[];
  } catch (e) {
    console.error('Error fetching kas transaksi:', e);
  }
  return [];
}

export async function addKasTransaksi(
  txData: Partial<KasTransaksi>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('kas_transaksi').insert(txData);

    if (error) return { success: false, error: error.message };

    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- HUTANG ACTIONS ---
export async function getHutangList(): Promise<Hutang[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('hutang').select('*').order('created_at', { ascending: false });
    if (!error && data) return data as Hutang[];
  } catch (e) {
    console.error('Error fetching hutang list:', e);
  }
  return [];
}

export async function addHutang(hutangData: Partial<Hutang>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const payload = {
      ...hutangData,
      sisa_hutang: hutangData.total_hutang || 0,
      status: 'berjalan' as const,
    };
    const { error } = await supabase.from('hutang').insert(payload);
    if (error) return { success: false, error: error.message };

    revalidatePath('/kas/hutang');
    revalidatePath('/kas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function payHutangCicilan(
  hutangId: string,
  tanggalBayar: string,
  nominal: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();

    // 1. Get current hutang
    const { data: h } = await supabase.from('hutang').select('sisa_hutang, nama_hutang').eq('id', hutangId).single();
    if (!h) return { success: false, error: 'Hutang tidak ditemukan' };

    const newSisa = Math.max(0, h.sisa_hutang - nominal);
    const newStatus = newSisa === 0 ? 'lunas' : 'berjalan';

    // 2. Insert kas_transaksi pengeluaran
    const { data: kasTx, error: kasErr } = await supabase
      .from('kas_transaksi')
      .insert({
        tanggal: tanggalBayar,
        tipe: 'pengeluaran',
        kategori: 'cicilan_hutang',
        keterangan: `Bayar Cicilan Hutang: ${h.nama_hutang}`,
        nominal,
        pic_tipe: 'finance',
        pic_nama: 'Finance Admin',
        hutang_id: hutangId,
        sumber_otomatis: true,
      })
      .select()
      .single();

    if (kasErr) return { success: false, error: kasErr.message };

    // 3. Insert hutang_pembayaran record
    await supabase.from('hutang_pembayaran').insert({
      hutang_id: hutangId,
      tanggal_bayar: tanggalBayar,
      nominal,
      kas_transaksi_id: kasTx.id,
    });

    // 4. Update hutang sisa_hutang
    await supabase
      .from('hutang')
      .update({ sisa_hutang: newSisa, status: newStatus })
      .eq('id', hutangId);

    revalidatePath('/kas/hutang');
    revalidatePath('/kas');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteKasTransaksi(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('kas_transaksi').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
