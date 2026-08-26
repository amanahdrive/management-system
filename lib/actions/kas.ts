'use server';

import { dbQuery, dbQuerySingle, dbExecute } from '@/lib/db';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { KasTransaksi, Hutang, KasKategori } from '@/types/database';
import { revalidatePath } from 'next/cache';

const METRICS_CACHE_KEY = 'kas_overview_metrics';

export async function getKasOverviewMetrics() {
  const cached = cacheGet<any>(METRICS_CACHE_KEY);
  if (cached) return cached;

  try {
    const [txList, siswaList, hutangList] = await Promise.all([
      dbQuery<{ tipe: string; nominal: number; jenis_pembayaran: string }>(
        'SELECT tipe, nominal, jenis_pembayaran FROM kas_transaksi'
      ),
      dbQuery<{ harga_final: number; dp_nominal: number | null; status_pembayaran_kode: string }>(
        'SELECT harga_final, dp_nominal, status_pembayaran_kode FROM siswa'
      ),
      dbQuery<{ sisa_hutang: number }>(
        "SELECT sisa_hutang FROM hutang WHERE status = 'berjalan'"
      ),
    ]);

    let totalPemasukan = 0;
    let totalPengeluaran = 0;
    let saldoTunai = 0;
    let saldoNonTunai = 0;

    if (txList && txList.length > 0) {
      txList.forEach((t) => {
        const nom = Number(t.nominal) || 0;
        const signed = t.tipe === 'pemasukan' ? nom : -nom;
        if (t.tipe === 'pemasukan') totalPemasukan += nom;
        else totalPengeluaran += nom;
        if (t.jenis_pembayaran === 'non_tunai') saldoNonTunai += signed;
        else saldoTunai += signed;
      });
    }

    let totalPiutang = 0;
    if (siswaList && siswaList.length > 0) {
      siswaList.forEach((s) => {
        const hrg = Number(s.harga_final) || 0;
        const dp = Number(s.dp_nominal) || 0;
        if (s.status_pembayaran_kode === 'dp') {
          totalPiutang += Math.max(0, hrg - dp);
        } else if (s.status_pembayaran_kode === 'belum_bayar') {
          totalPiutang += hrg;
        }
      });
    }

    let totalHutang = 0;
    if (hutangList && hutangList.length > 0) {
      hutangList.forEach((h) => {
        totalHutang += Number(h.sisa_hutang) || 0;
      });
    }

    const result = {
      saldoAktif: totalPemasukan - totalPengeluaran,
      saldoTunai,
      saldoNonTunai,
      totalPiutang,
      totalHutang,
    };

    cacheSet(METRICS_CACHE_KEY, result, 30);
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
    const siswa = await dbQuerySingle<{ id: string; harga_final: number; status_pembayaran_kode: string }>(
      'SELECT id, harga_final, status_pembayaran_kode FROM siswa WHERE id = $1',
      [siswaId]
    );
    if (!siswa) return;

    const txs = await dbQuery<{ tipe: string; kategori: string; nominal: number; tanggal: string }>(
      'SELECT tipe, kategori, nominal, tanggal FROM kas_transaksi WHERE siswa_id = $1 ORDER BY tanggal ASC',
      [siswaId]
    );

    let totalPemasukan = 0;
    let totalRefund = 0;
    let hasRefund = false;
    let lastPayDate: string | null = null;

    if (txs && txs.length > 0) {
      txs.forEach((tx) => {
        const nom = Number(tx.nominal) || 0;
        if (tx.tipe === 'pemasukan') {
          totalPemasukan += nom;
          lastPayDate = tx.tanggal;
        } else if (
          tx.tipe === 'pengeluaran' &&
          (tx.kategori === 'refund_siswa' || (tx.kategori && tx.kategori.includes('refund')) || (tx.kategori && tx.kategori.includes('batal')))
        ) {
          totalRefund += nom;
          hasRefund = true;
        }
      });
    }

    const netPaid = Math.max(0, totalPemasukan - totalRefund);
    const hargaFinal = Number(siswa.harga_final) || 0;

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

    await dbQuery(
      `UPDATE siswa 
       SET status_pembayaran_kode = $1, dp_nominal = $2, dp_tanggal = $3, updated_at = NOW() 
       WHERE id = $4`,
      [newStatus, newDpNominal, newDpTanggal, siswaId]
    );

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
    const data = await dbQuery<KasKategori>('SELECT * FROM kas_kategori ORDER BY nama_kategori ASC');

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

    if (data && data.length > 0) {
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
    const whereClauses: string[] = [];
    const params: any[] = [];

    if (filters?.startDate) {
      params.push(filters.startDate);
      whereClauses.push(`k.tanggal >= $${params.length}`);
    }
    if (filters?.endDate) {
      params.push(filters.endDate);
      whereClauses.push(`k.tanggal <= $${params.length}`);
    }
    if (filters?.tipe && filters.tipe !== 'semua') {
      params.push(filters.tipe);
      whereClauses.push(`k.tipe = $${params.length}`);
    }
    if (filters?.kategori && filters.kategori !== 'semua') {
      params.push(filters.kategori);
      whereClauses.push(`k.kategori = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT 
        k.*,
        CASE WHEN s.id IS NOT NULL THEN to_jsonb(s) ELSE NULL END AS siswa,
        CASE WHEN h.id IS NOT NULL THEN to_jsonb(h) ELSE NULL END AS hutang
      FROM kas_transaksi k
      LEFT JOIN siswa s ON k.siswa_id = s.id
      LEFT JOIN hutang h ON k.hutang_id = h.id
      ${whereSql}
      ORDER BY k.tanggal DESC, k.created_at DESC;
    `;

    const rows = await dbQuery<KasTransaksi>(sql, params);
    return rows;
  } catch (e) {
    console.error('Error fetching kas transaksi:', e);
    return [];
  }
}

export async function addKasTransaksi(
  txData: Partial<KasTransaksi>
): Promise<{ success: boolean; error?: string }> {
  try {
    const keys = Object.keys(txData).filter((k) => (txData as any)[k] !== undefined);
    const values = keys.map((k) => (txData as any)[k]);
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    await dbQuery(`INSERT INTO kas_transaksi (${cols}) VALUES (${placeholders})`, values);

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
    console.error('Error in addKasTransaksi:', err);
    return { success: false, error: err.message };
  }
}

// --- HUTANG ACTIONS ---
export async function getHutangList(): Promise<Hutang[]> {
  const cached = cacheGet<Hutang[]>('hutang_list');
  if (cached) return cached;

  try {
    const data = await dbQuery<Hutang>('SELECT * FROM hutang ORDER BY created_at DESC');
    cacheSet('hutang_list', data, 60);
    return data;
  } catch (e) {
    console.error('Error fetching hutang list:', e);
    return [];
  }
}

export async function addHutang(hutangData: Partial<Hutang>): Promise<{ success: boolean; error?: string }> {
  try {
    const total = Number(hutangData.total_hutang) || 0;
    const cicilan = Number(hutangData.cicilan_per_bulan) || 0;
    const tempo = Number(hutangData.jatuh_tempo_bulanan) || 1;

    await dbQuery(
      `INSERT INTO hutang (nama_hutang, jenis, total_hutang, sisa_hutang, tanggal_mulai, jatuh_tempo_bulanan, cicilan_per_bulan, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        hutangData.nama_hutang || 'Hutang Baru',
        hutangData.jenis || 'lainnya',
        total,
        total,
        hutangData.tanggal_mulai || new Date().toISOString().slice(0, 10),
        tempo,
        cicilan,
        'berjalan',
      ]
    );

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
    const h = await dbQuerySingle<{ id: string; sisa_hutang: number; nama_hutang: string }>(
      'SELECT id, sisa_hutang, nama_hutang FROM hutang WHERE id = $1',
      [hutangId]
    );
    if (!h) return { success: false, error: 'Hutang tidak ditemukan' };

    const newSisa = Math.max(0, (Number(h.sisa_hutang) || 0) - nominal);
    const newStatus = newSisa === 0 ? 'lunas' : 'berjalan';

    const kasTx = await dbQuerySingle<{ id: string }>(
      `INSERT INTO kas_transaksi (tanggal, tipe, kategori, keterangan, nominal, jenis_pembayaran, pic_tipe, pic_nama, hutang_id, sumber_otomatis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        tanggalBayar,
        'pengeluaran',
        'cicilan_hutang',
        `Bayar Cicilan Hutang: ${h.nama_hutang}`,
        nominal,
        jenisPembayaran,
        'finance',
        'Finance Admin',
        hutangId,
        true,
      ]
    );

    if (!kasTx) return { success: false, error: 'Gagal membuat transaksi kas' };

    await dbQuery(
      `INSERT INTO hutang_pembayaran (hutang_id, tanggal_bayar, nominal, kas_transaksi_id)
       VALUES ($1, $2, $3, $4)`,
      [hutangId, tanggalBayar, nominal, kasTx.id]
    );

    await dbQuery(
      'UPDATE hutang SET sisa_hutang = $1, status = $2, updated_at = NOW() WHERE id = $3',
      [newSisa, newStatus, hutangId]
    );

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
    const oldTx = await dbQuerySingle<{ id: string; siswa_id: string }>(
      'SELECT id, siswa_id FROM kas_transaksi WHERE id = $1',
      [id]
    );

    const { siswa, hutang, ...cleanUpdates } = updates as any;
    const keys = Object.keys(cleanUpdates).filter((k) => cleanUpdates[k] !== undefined);
    
    if (keys.length > 0) {
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = keys.map((k) => cleanUpdates[k]);
      values.push(id);
      await dbQuery(`UPDATE kas_transaksi SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}`, values);
    }

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
    const tx = await dbQuerySingle<{ id: string; siswa_id: string }>(
      'SELECT id, siswa_id FROM kas_transaksi WHERE id = $1',
      [id]
    );

    await dbQuery('DELETE FROM kas_transaksi WHERE id = $1', [id]);

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
    const txList = await dbQuery<KasTransaksi>(
      "SELECT * FROM kas_transaksi WHERE tipe = 'pemasukan' AND siswa_id IS NULL ORDER BY tanggal ASC"
    );

    if (!txList || txList.length === 0) return [];

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
      let hargaPaket = Number(dpTx.nominal) * 2;

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

      const pelunasanTxs = txList.filter(
        (t) =>
          (t.kategori === 'pelunasan_siswa' || t.kategori === 'pelunasan_kustom' || (t.keterangan && t.keterangan.toLowerCase().includes('pelunasan'))) &&
          t.keterangan &&
          (t.keterangan.includes(dpTx.id) || (nama && nama !== 'Customer Kustom' && t.keterangan.toLowerCase().includes(nama.toLowerCase())))
      );

      const totalPelunasan = pelunasanTxs.reduce((sum, p) => sum + (Number(p.nominal) || 0), 0);
      const totalPaid = Number(dpTx.nominal) + totalPelunasan;
      const sisaTagihan = Math.max(0, hargaPaket - totalPaid);

      result.push({
        id: dpTx.id,
        nama,
        namaPaket,
        hargaPaket,
        dpNominal: Number(dpTx.nominal),
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
