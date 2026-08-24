'use server';

import { createServerClient } from '@/lib/supabase/server';
import { KasTransaksi, Hutang, KasKategori } from '@/types/database';
import { revalidatePath } from 'next/cache';

export async function getKasOverviewMetrics() {
  try {
    const supabase = await createServerClient();

    // Query Saldo — breakdown by tipe and jenis_pembayaran
    const { data: txList } = await supabase
      .from('kas_transaksi')
      .select('tipe, nominal, jenis_pembayaran');

    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let saldoTunai = 0;
    let saldoNonTunai = 0;

    if (txList) {
      txList.forEach((t) => {
        const signed = t.tipe === 'pemasukan' ? t.nominal : -t.nominal;
        if (t.tipe === 'pemasukan') totalPemasukan += t.nominal;
        else totalPengeluaran += t.nominal;
        if (t.jenis_pembayaran === 'non_tunai') saldoNonTunai += signed;
        else saldoTunai += signed;
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
      saldoTunai,
      saldoNonTunai,
      totalPiutang,
      totalHutang,
    };
  } catch (e) {
    console.error('Error fetching kas overview metrics:', e);
  }

  return {
    saldoAktif: 0,
    saldoTunai: 0,
    saldoNonTunai: 0,
    totalPiutang: 0,
    totalHutang: 0,
  };
}

export async function syncSiswaPaymentState(siswaId: string): Promise<void> {
  try {
    const supabase = await createServerClient();

    // Fetch student
    const { data: siswa } = await supabase
      .from('siswa')
      .select('id, harga_final, status_pembayaran_kode')
      .eq('id', siswaId)
      .single();
    if (!siswa) return;

    // Fetch all transactions for this student
    const { data: txs } = await supabase
      .from('kas_transaksi')
      .select('tipe, kategori, nominal, tanggal')
      .eq('siswa_id', siswaId)
      .order('tanggal', { ascending: true });

    let totalPemasukan = 0;
    let totalRefund = 0;
    let hasRefund = false;
    let lastPayDate: string | null = null;

    if (txs && txs.length > 0) {
      txs.forEach((tx) => {
        if (tx.tipe === 'pemasukan') {
          totalPemasukan += tx.nominal || 0;
          lastPayDate = tx.tanggal;
        } else if (
          tx.tipe === 'pengeluaran' &&
          (tx.kategori === 'refund_siswa' || tx.kategori.includes('refund') || tx.kategori.includes('batal'))
        ) {
          totalRefund += tx.nominal || 0;
          hasRefund = true;
        }
      });
    }

    const netPaid = Math.max(0, totalPemasukan - totalRefund);
    const hargaFinal = siswa.harga_final || 0;

    let newStatus = 'belum_bayar';
    let newDpNominal: number | null = null;
    let newDpTanggal: string | null = null;

    if (hasRefund && netPaid === 0) {
      newStatus = 'batal';
      newDpNominal = null;
      newDpTanggal = null;
    } else if (netPaid >= hargaFinal && hargaFinal > 0) {
      newStatus = 'lunas';
      newDpNominal = netPaid;
      newDpTanggal = lastPayDate;
    } else if (netPaid > 0) {
      newStatus = 'dp';
      newDpNominal = netPaid;
      newDpTanggal = lastPayDate;
    } else {
      newStatus = 'belum_bayar';
      newDpNominal = null;
      newDpTanggal = null;
    }

    await supabase
      .from('siswa')
      .update({
        status_pembayaran_kode: newStatus,
        dp_nominal: newDpNominal,
        dp_tanggal: newDpTanggal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', siswaId);

    revalidatePath('/siswa');
    revalidatePath(`/siswa/${siswaId}`);
    revalidatePath('/kas/piutang');
  } catch (err) {
    console.error('Error in syncSiswaPaymentState:', err);
  }
}

export async function getKasKategoriList(): Promise<KasKategori[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('kas_kategori').select('*').order('nama_kategori');

    const defaultCategories: Partial<KasKategori>[] = [
      { nama_kategori: 'dp_siswa', tipe: 'pemasukan' },
      { nama_kategori: 'pelunasan_siswa', tipe: 'pemasukan' },
      { nama_kategori: 'refund_siswa', tipe: 'pengeluaran' },
      { nama_kategori: 'operasional', tipe: 'pengeluaran' },
      { nama_kategori: 'bbm', tipe: 'pengeluaran' },
      { nama_kategori: 'gaji', tipe: 'pengeluaran' },
      { nama_kategori: 'cicilan_hutang', tipe: 'pengeluaran' },
      { nama_kategori: 'lainnya', tipe: 'keduanya' },
    ];

    if (!error && data && data.length > 0) {
      const hasRefund = data.some((k) => k.nama_kategori === 'refund_siswa');
      if (!hasRefund) {
        return [
          ...data,
          { id: 'kat-refund-siswa', nama_kategori: 'refund_siswa', tipe: 'pengeluaran', created_at: '', updated_at: '' },
        ] as KasKategori[];
      }
      return data as KasKategori[];
    }

    return defaultCategories.map((c, i) => ({
      id: `default-${i}`,
      nama_kategori: c.nama_kategori!,
      tipe: c.tipe as any,
      created_at: '',
      updated_at: '',
    }));
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

    if (txData.siswa_id) {
      await syncSiswaPaymentState(txData.siswa_id);
    }

    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/piutang');
    revalidatePath('/siswa');
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
  nominal: number,
  jenisPembayaran: 'tunai' | 'non_tunai' = 'non_tunai'
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
        jenis_pembayaran: jenisPembayaran,
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

export async function updateKasTransaksi(
  id: string,
  updates: Partial<KasTransaksi>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();

    // Fetch old tx to check previous siswa_id
    const { data: oldTx } = await supabase.from('kas_transaksi').select('siswa_id').eq('id', id).single();

    const { siswa, hutang, ...cleanUpdates } = updates as any;
    const { error } = await supabase
      .from('kas_transaksi')
      .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    if (oldTx?.siswa_id) {
      await syncSiswaPaymentState(oldTx.siswa_id);
    }
    if (cleanUpdates.siswa_id && cleanUpdates.siswa_id !== oldTx?.siswa_id) {
      await syncSiswaPaymentState(cleanUpdates.siswa_id);
    }

    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/piutang');
    revalidatePath('/siswa');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteKasTransaksi(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();

    // Fetch tx to check if it is linked to a siswa
    const { data: tx } = await supabase.from('kas_transaksi').select('siswa_id').eq('id', id).single();

    const { error } = await supabase.from('kas_transaksi').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    if (tx?.siswa_id) {
      await syncSiswaPaymentState(tx.siswa_id);
    }

    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/piutang');
    revalidatePath('/siswa');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
