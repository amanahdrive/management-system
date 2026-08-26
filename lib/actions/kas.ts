'use server';

import { createServerClient } from '@/lib/supabase/server';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { KasTransaksi, Hutang, KasKategori } from '@/types/database';
import { revalidatePath } from 'next/cache';

const METRICS_CACHE_KEY = 'kas_overview_metrics';

export async function getKasOverviewMetrics() {
  const cached = cacheGet<any>(METRICS_CACHE_KEY);
  if (cached) return cached;

  try {
    const supabase = await createServerClient();

    // Query Saldo, Piutang, Hutang concurrently
    const [txRes, siswaRes, hutangRes] = await Promise.all([
      supabase.from('kas_transaksi').select('tipe, nominal, jenis_pembayaran'),
      supabase.from('siswa').select('harga_final, dp_nominal, status_pembayaran_kode'),
      supabase.from('hutang').select('sisa_hutang').eq('status', 'berjalan'),
    ]);

    const txList = txRes.data;
    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let saldoTunai = 0;
    let saldoNonTunai = 0;

    if (txList && txList.length > 0) {
      txList.forEach((t) => {
        const signed = t.tipe === 'pemasukan' ? t.nominal : -t.nominal;
        if (t.tipe === 'pemasukan') totalPemasukan += t.nominal;
        else totalPengeluaran += t.nominal;
        if (t.jenis_pembayaran === 'non_tunai') saldoNonTunai += signed;
        else saldoTunai += signed;
      });
    }

    const siswaList = siswaRes.data;
    let totalPiutang = 0;
    if (siswaList && siswaList.length > 0) {
      siswaList.forEach((s) => {
        if (s.status_pembayaran_kode === 'dp') {
          totalPiutang += Math.max(0, s.harga_final - (s.dp_nominal || 0));
        } else if (s.status_pembayaran_kode === 'belum_bayar') {
          totalPiutang += s.harga_final || 0;
        }
      });
    }

    const hutangList = hutangRes.data;
    let totalHutang = 0;
    if (hutangList && hutangList.length > 0) {
      hutangList.forEach((h) => {
        totalHutang += h.sisa_hutang || 0;
      });
    }

    const result = {
      saldoAktif: totalPemasukan - totalPengeluaran,
      saldoTunai,
      saldoNonTunai,
      totalPiutang,
      totalHutang,
    };

    if (txList) {
      cacheSet(METRICS_CACHE_KEY, result, 30);
    }
    return result;
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
      .maybeSingle();
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

    cacheInvalidate('siswa*');
    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');

    revalidatePath('/siswa');
    revalidatePath(`/siswa/${siswaId}`);
    revalidatePath('/kas/piutang');
  } catch (err) {
    console.error('Error in syncSiswaPaymentState:', err);
  }
}

export async function getKasKategoriList(): Promise<KasKategori[]> {
  const cached = cacheGet<KasKategori[]>('kas_kategori_list');
  if (cached && cached.length > 0) return cached;

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
      const finalData = hasRefund
        ? data
        : [
            ...data,
            { id: 'kat-refund-siswa', nama_kategori: 'refund_siswa', tipe: 'pengeluaran', created_at: '', updated_at: '' },
          ];
      cacheSet('kas_kategori_list', finalData as KasKategori[], 300);
      return finalData as KasKategori[];
    }

    const fallback = defaultCategories.map((c, i) => ({
      id: `default-${i}`,
      nama_kategori: c.nama_kategori!,
      tipe: c.tipe as any,
      created_at: '',
      updated_at: '',
    }));
    cacheSet('kas_kategori_list', fallback, 300);
    return fallback;
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

    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');
    cacheInvalidate('siswa*');

    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/piutang');
    revalidatePath('/siswa');
    revalidatePath('/dashboard');
    revalidatePath('/finance');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- HUTANG ACTIONS ---
export async function getHutangList(): Promise<Hutang[]> {
  const cached = cacheGet<Hutang[]>('hutang_list');
  if (cached) return cached;

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('hutang').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      cacheSet('hutang_list', data as Hutang[], 60);
      return data as Hutang[];
    }
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

    cacheInvalidate('hutang*');
    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');

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
    const { data: h } = await supabase.from('hutang').select('sisa_hutang, nama_hutang').eq('id', hutangId).maybeSingle();
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
      .maybeSingle();

    if (kasErr || !kasTx) return { success: false, error: kasErr?.message || 'Gagal membuat transaksi kas' };

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

    cacheInvalidate('hutang*');
    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');

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
    const { data: oldTx } = await supabase.from('kas_transaksi').select('siswa_id').eq('id', id).maybeSingle();

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

    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');
    cacheInvalidate('siswa*');

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
    const { data: tx } = await supabase.from('kas_transaksi').select('siswa_id').eq('id', id).maybeSingle();

    const { error } = await supabase.from('kas_transaksi').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    if (tx?.siswa_id) {
      await syncSiswaPaymentState(tx.siswa_id);
    }

    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');
    cacheInvalidate('siswa*');

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

export interface DpKustomItem {
  id: string; // ID of the DP transaction
  nama: string;
  namaPaket: string;
  hargaPaket: number;
  dpNominal: number;
  totalPaid: number;
  sisaTagihan: number;
  tanggalDp: string;
  isLunas: boolean;
}

export async function getDpKustomList(): Promise<DpKustomItem[]> {
  const cached = cacheGet<DpKustomItem[]>('dp_kustom_list');
  if (cached) return cached;

  try {
    const supabase = await createServerClient();
    // Query all non-student pemasukan transactions
    const { data: txList } = await supabase
      .from('kas_transaksi')
      .select('*')
      .eq('tipe', 'pemasukan')
      .is('siswa_id', null)
      .order('tanggal', { ascending: true });

    if (!txList || txList.length === 0) return [];

    // Filter DP Kustom transactions
    const dpTxs = txList.filter(
      (t) =>
        t.kategori === 'dp_siswa' ||
        t.kategori === 'dp_kustom' ||
        (t.keterangan && t.keterangan.toLowerCase().includes('dp kustom'))
    );

    const result: DpKustomItem[] = [];

    for (const dpTx of dpTxs) {
      let nama = 'Customer Kustom';
      let namaPaket = 'Paket Kursus';
      let hargaPaket = dpTx.nominal * 2;

      const ket = dpTx.keterangan || '';

      const pipeParts = ket.split('|').map((s: string) => s.trim());
      if (pipeParts.length >= 2) {
        const namePart = pipeParts[0].replace(/^dp\s*kustom\s*[-:]\s*/i, '').replace(/^nama\s*:\s*/i, '').trim();
        if (namePart) nama = namePart;

        for (const part of pipeParts.slice(1)) {
          if (/^paket\s*:\s*/i.test(part)) {
            namaPaket = part.replace(/^paket\s*:\s*/i, '').trim();
          } else if (/^(?:total|tagihan|harga|biaya)\s*:\s*/i.test(part)) {
            const rawVal = part.replace(/^(?:total|tagihan|harga|biaya)\s*:\s*/i, '').replace(/[^0-9]/g, '');
            const parsed = parseInt(rawVal, 10);
            if (!isNaN(parsed) && parsed > 0) hargaPaket = parsed;
          }
        }
      } else {
        const simpleMatch = ket.match(/DP Kustom\s*-\s*([^(|]+)(?:\(([^)]+)\))?/i);
        if (simpleMatch) {
          if (simpleMatch[1]) nama = simpleMatch[1].trim();
          if (simpleMatch[2]) namaPaket = simpleMatch[2].trim();
        }
      }

      // Find any pelunasan transactions linked to this DP
      const pelunasanTxs = txList.filter(
        (t) =>
          (t.kategori === 'pelunasan_siswa' || t.kategori === 'pelunasan_kustom' || (t.keterangan && t.keterangan.toLowerCase().includes('pelunasan'))) &&
          t.keterangan &&
          (t.keterangan.includes(dpTx.id) || (nama && nama !== 'Customer Kustom' && t.keterangan.toLowerCase().includes(nama.toLowerCase())))
      );

      const totalPelunasan = pelunasanTxs.reduce((sum, p) => sum + (p.nominal || 0), 0);
      const totalPaid = dpTx.nominal + totalPelunasan;
      const sisaTagihan = Math.max(0, hargaPaket - totalPaid);

      result.push({
        id: dpTx.id,
        nama,
        namaPaket,
        hargaPaket,
        dpNominal: dpTx.nominal,
        totalPaid,
        sisaTagihan,
        tanggalDp: dpTx.tanggal,
        isLunas: sisaTagihan <= 0,
      });
    }

    cacheSet('dp_kustom_list', result, 60);
    return result;
  } catch (err) {
    console.error('Error in getDpKustomList:', err);
    return [];
  }
}
