'use server';

import { dbQuery, dbQuerySingle, dbExecute } from '@/lib/db';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { KasTransaksi, Hutang, KasKategori, HutangPembayaran, Staff, StaffKasbonSummary } from '@/types/database';
import { DEFAULT_KAS_KATEGORI } from '@/lib/constants/finance';
import { getTodayDateString } from '@/lib/utils/date';
import { getRekeningList } from '@/lib/actions/rekening';
import { revalidatePath } from 'next/cache';

const METRICS_CACHE_KEY = 'kas_overview_metrics';

export async function getKasOverviewMetrics() {
  try {
    const sql = `
      WITH kas_calc AS (
        SELECT
          COALESCE(SUM(CASE WHEN tipe = 'pemasukan' THEN nominal ELSE 0 END), 0) AS total_masuk,
          COALESCE(SUM(CASE WHEN tipe = 'pengeluaran' THEN nominal ELSE 0 END), 0) AS total_keluar,
          COALESCE(SUM(CASE WHEN tipe = 'pemasukan' AND COALESCE(jenis_pembayaran, 'tunai') = 'tunai' THEN nominal 
                            WHEN tipe = 'pengeluaran' AND COALESCE(jenis_pembayaran, 'tunai') = 'tunai' THEN -nominal ELSE 0 END), 0) AS saldo_tunai,
          COALESCE(SUM(CASE WHEN tipe = 'pemasukan' AND jenis_pembayaran = 'non_tunai' THEN nominal 
                            WHEN tipe = 'pengeluaran' AND jenis_pembayaran = 'non_tunai' THEN -nominal ELSE 0 END), 0) AS saldo_non_tunai
        FROM kas_transaksi
      ),
      piutang_calc AS (
        SELECT
          COALESCE(SUM(
            CASE 
              WHEN status_pembayaran_kode = 'dp' THEN GREATEST(0, COALESCE(harga_final, 0) - COALESCE(dp_nominal, 0))
              WHEN status_pembayaran_kode = 'belum_bayar' THEN COALESCE(harga_final, 0)
              ELSE 0 
            END
          ), 0) AS total_piutang
        FROM siswa
      ),
      hutang_calc AS (
        SELECT
          COALESCE(SUM(COALESCE(sisa_hutang, 0)), 0) AS total_hutang
        FROM hutang
        WHERE status = 'berjalan'
      )
      SELECT 
        (k.total_masuk - k.total_keluar)::numeric AS "saldoAktif",
        k.saldo_tunai::numeric AS "saldoTunai",
        k.saldo_non_tunai::numeric AS "saldoNonTunai",
        p.total_piutang::numeric AS "totalPiutang",
        h.total_hutang::numeric AS "totalHutang"
      FROM kas_calc k, piutang_calc p, hutang_calc h;
    `;

    const row = await dbQuerySingle<{
      saldoAktif: number;
      saldoTunai: number;
      saldoNonTunai: number;
      totalPiutang: number;
      totalHutang: number;
    }>(sql);

    if (row) {
      return {
        saldoAktif: Number((row as any).saldoAktif ?? (row as any).saldoaktif ?? (row as any).saldo_aktif ?? 0),
        saldoTunai: Number((row as any).saldoTunai ?? (row as any).saldotunai ?? (row as any).saldo_tunai ?? 0),
        saldoNonTunai: Number((row as any).saldoNonTunai ?? (row as any).saldonontunai ?? (row as any).saldo_non_tunai ?? 0),
        totalPiutang: Number((row as any).totalPiutang ?? (row as any).totalpiutang ?? (row as any).total_piutang ?? 0),
        totalHutang: Number((row as any).totalHutang ?? (row as any).totalhutang ?? (row as any).total_hutang ?? 0),
      };
    }
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

export async function syncHutangPaymentState(hutangId: string): Promise<void> {
  try {
    const hutang = await dbQuerySingle<{ id: string; total_hutang: number; nama_hutang: string }>(
      'SELECT id, total_hutang, nama_hutang FROM hutang WHERE id = $1',
      [hutangId]
    );
    if (!hutang) return;

    // Hitung total cicilan terbayar dari kas_transaksi untuk hutang ini
    const txs = await dbQuery<{ nominal: number }>(
      "SELECT nominal FROM kas_transaksi WHERE hutang_id = $1 AND tipe = 'pengeluaran'",
      [hutangId]
    );

    const totalPaid = (txs || []).reduce((sum, tx) => sum + (Number(tx.nominal) || 0), 0);
    const totalHutang = Number(hutang.total_hutang) || 0;
    const newSisa = Math.max(0, totalHutang - totalPaid);
    const newStatus = newSisa === 0 && totalHutang > 0 ? 'lunas' : 'berjalan';

    await dbQuery(
      'UPDATE hutang SET sisa_hutang = $1, status = $2, updated_at = NOW() WHERE id = $3',
      [newSisa, newStatus, hutangId]
    );

    cacheInvalidate('hutang*');
    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');

    revalidatePath('/kas/hutang');
    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/finance');
  } catch (err) {
    console.error('Error in syncHutangPaymentState:', err);
  }
}

export async function getKasKategoriList(): Promise<KasKategori[]> {
  const cached = cacheGet<KasKategori[]>('kas_kategori_list');
  if (cached && cached.length > 0) return cached;

  try {
    const data = await dbQuery<KasKategori>('SELECT * FROM kas_kategori ORDER BY nama_kategori ASC');

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

    cacheSet('kas_kategori_list', DEFAULT_KAS_KATEGORI, 300);
    return DEFAULT_KAS_KATEGORI;
  } catch (e) {
    console.error('Error fetching kas kategori:', e);
    return DEFAULT_KAS_KATEGORI;
  }
}

export async function getStaffKasbonSummary(): Promise<StaffKasbonSummary[]> {
  try {
    const res = await dbQuery<any>(`
      SELECT s.id, s.nama,
             COALESCE(SUM(CASE WHEN k.kategori = 'kasbon' AND k.tipe = 'pengeluaran' THEN k.nominal ELSE 0 END), 0)::int as total_kasbon,
             COALESCE(SUM(
               CASE 
                 WHEN k.kategori = 'gaji' THEN COALESCE(k.potongan_kasbon, 0)
                 WHEN k.kategori = 'pengembalian_kasbon' AND k.tipe = 'pemasukan' THEN k.nominal
                 WHEN COALESCE(k.potongan_kasbon, 0) > 0 AND k.kategori != 'gaji' THEN k.potongan_kasbon
                 ELSE 0 
               END
             ), 0)::int as total_potongan,
             (
               COALESCE(SUM(CASE WHEN k.kategori = 'kasbon' AND k.tipe = 'pengeluaran' THEN k.nominal ELSE 0 END), 0) - 
               COALESCE(SUM(
                 CASE 
                   WHEN k.kategori = 'gaji' THEN COALESCE(k.potongan_kasbon, 0)
                   WHEN k.kategori = 'pengembalian_kasbon' AND k.tipe = 'pemasukan' THEN k.nominal
                   WHEN COALESCE(k.potongan_kasbon, 0) > 0 AND k.kategori != 'gaji' THEN k.potongan_kasbon
                   ELSE 0 
                 END
               ), 0)
             )::int as sisa_kasbon
      FROM staff s
      LEFT JOIN kas_transaksi k ON s.id = k.staff_id
      WHERE s.aktif = true
      GROUP BY s.id, s.nama
      ORDER BY s.nama ASC
    `);
    return res || [];
  } catch (err) {
    console.error('Error fetching staff kasbon summary:', err);
    return [];
  }
}

export async function getStaffKasbonHistory(staffId: string): Promise<KasTransaksi[]> {
  try {
    const rows = await dbQuery<KasTransaksi>(`
      SELECT 
        k.*,
        st.nama as staff_nama
      FROM kas_transaksi k
      LEFT JOIN staff st ON k.staff_id = st.id
      WHERE k.staff_id = $1 
        AND (
          k.kategori = 'kasbon' 
          OR k.kategori = 'gaji' 
          OR k.kategori = 'pengembalian_kasbon' 
          OR COALESCE(k.potongan_kasbon, 0) > 0 
          OR k.keterangan ILIKE '%kasbon%'
        )
      ORDER BY k.tanggal DESC, k.created_at DESC;
    `, [staffId]);
    return rows || [];
  } catch (err) {
    console.error('Error fetching staff kasbon history:', err);
    return [];
  }
}

export async function recordPelunasanKasbonDirect(
  staffId: string,
  nominal: number,
  tanggal: string,
  keterangan?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const staff = await dbQuerySingle<{ id: string; nama: string }>(
      'SELECT id, nama FROM staff WHERE id = $1',
      [staffId]
    );
    if (!staff) return { success: false, error: 'Staff tidak ditemukan' };

    await dbQuery(
      `INSERT INTO kas_transaksi (
        tanggal, tipe, kategori, keterangan, nominal, potongan_kasbon, jenis_pembayaran, pic_tipe, pic_nama, staff_id, sumber_otomatis
      ) VALUES (
        $1, 'pengeluaran', 'pengembalian_kasbon', $2, 0, $3, 'tunai', 'finance', 'Finance Internal', $4, true
      )`,
      [
        tanggal || getTodayDateString(),
        keterangan || `Pelunasan Kasbon Non-Kas (Internal) - ${staff.nama}`,
        nominal,
        staffId
      ]
    );

    cacheInvalidate('kas*');
    cacheInvalidate('staff*');
    cacheInvalidate('dashboard*');
    cacheInvalidate('finance*');

    revalidatePath('/kas');
    revalidatePath('/kas/piutang');
    revalidatePath('/kas/cashflow');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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
        CASE WHEN h.id IS NOT NULL THEN to_jsonb(h) ELSE NULL END AS hutang,
        CASE WHEN st.id IS NOT NULL THEN to_jsonb(st) ELSE NULL END AS staff
      FROM kas_transaksi k
      LEFT JOIN siswa s ON k.siswa_id = s.id
      LEFT JOIN hutang h ON k.hutang_id = h.id
      LEFT JOIN staff st ON k.staff_id = st.id
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
    const { siswa, hutang, staff, id: _id, created_at, updated_at, ...cleanData } = txData as any;

    if (!cleanData.siswa_id || cleanData.siswa_id === '' || cleanData.siswa_id === 'null' || cleanData.siswa_id === 'undefined') {
      cleanData.siswa_id = null;
    }
    if (!cleanData.hutang_id || cleanData.hutang_id === '' || cleanData.hutang_id === 'null' || cleanData.hutang_id === 'undefined') {
      cleanData.hutang_id = null;
    }
    if (!cleanData.staff_id || cleanData.staff_id === '' || cleanData.staff_id === 'null' || cleanData.staff_id === 'undefined') {
      cleanData.staff_id = null;
    }
    if (cleanData.potongan_kasbon !== undefined) {
      cleanData.potongan_kasbon = Number(cleanData.potongan_kasbon) || 0;
    }
    if (
      !cleanData.rekening_id ||
      cleanData.rekening_id === '' ||
      cleanData.rekening_id === 'undefined' ||
      cleanData.rekening_id === 'null' ||
      cleanData.jenis_pembayaran === 'tunai'
    ) {
      cleanData.rekening_id = null;
    }

    const keys = Object.keys(cleanData).filter((k) => cleanData[k] !== undefined);
    const values = keys.map((k) => cleanData[k]);
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const inserted = await dbQuerySingle<{ id: string }>(
      `INSERT INTO kas_transaksi (${cols}) VALUES (${placeholders}) RETURNING id`,
      values
    );

    if (cleanData.siswa_id) {
      await syncSiswaPaymentState(cleanData.siswa_id);
    }

    if (cleanData.hutang_id && inserted?.id) {
      await dbQuery(
        `INSERT INTO hutang_pembayaran (hutang_id, tanggal_bayar, nominal, kas_transaksi_id)
         VALUES ($1, $2, $3, $4)`,
        [cleanData.hutang_id, cleanData.tanggal || getTodayDateString(), cleanData.nominal, inserted.id]
      );
      await syncHutangPaymentState(cleanData.hutang_id);
    }

    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');
    cacheInvalidate('siswa*');
    cacheInvalidate('hutang*');
    cacheInvalidate('staff*');

    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/piutang');
    revalidatePath('/kas/hutang');
    revalidatePath('/siswa');
    revalidatePath('/dashboard');
    revalidatePath('/finance');
    return { success: true };
  } catch (err: any) {
    console.error('Error in addKasTransaksi:', err);
    return { success: false, error: err.message };
  }
}

export async function setorTunaiKas(data: {
  nominal: number;
  rekening_id: string;
  tanggal: string;
  pic_nama?: string;
  keterangan?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const nominal = Math.round(Number(data.nominal));
    if (!nominal || nominal <= 0) {
      return { success: false, error: 'Nominal setor tunai harus lebih dari Rp 0' };
    }
    if (!data.rekening_id) {
      return { success: false, error: 'Silakan pilih rekening bank tujuan setor' };
    }

    const currentMetrics = await getKasOverviewMetrics();
    if (nominal > currentMetrics.saldoTunai) {
      return {
        success: false,
        error: `Nominal setor tunai melebihi saldo kas tunai saat ini (Maksimal: Rp ${currentMetrics.saldoTunai.toLocaleString('id-ID')})`,
      };
    }

    const allRek = await getRekeningList();
    const rek = allRek.find((r) => r.id === data.rekening_id);
    const bankLabel = rek ? `${rek.nama_bank} ${rek.nomor_rekening} (${rek.atas_nama})` : 'Rekening Bank';
    const pic = data.pic_nama?.trim() || 'Admin Staff';
    const tanggal = data.tanggal || getTodayDateString();
    const extraKet = data.keterangan?.trim() ? ` - ${data.keterangan.trim()}` : '';

    const ketKeluar = `Setor Tunai ke ${bankLabel}${extraKet}`;
    const ketMasuk = `Penerimaan Setor Tunai dari Kas Fisik${extraKet}`;

    await dbQuery(
      `INSERT INTO kas_transaksi (
         tanggal, tipe, kategori, keterangan, nominal, jenis_pembayaran, pic_tipe, pic_nama, sumber_otomatis
       ) VALUES ($1, 'pengeluaran', 'setor_tunai', $2, $3, 'tunai', 'admin', $4, false)`,
      [tanggal, ketKeluar, nominal, pic]
    );

    await dbQuery(
      `INSERT INTO kas_transaksi (
         tanggal, tipe, kategori, keterangan, nominal, jenis_pembayaran, rekening_id, pic_tipe, pic_nama, sumber_otomatis
       ) VALUES ($1, 'pemasukan', 'setor_tunai', $2, $3, 'non_tunai', $4, 'admin', $5, false)`,
      [tanggal, ketMasuk, nominal, data.rekening_id, pic]
    );

    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');

    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/piutang');
    revalidatePath('/finance');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Error in setorTunaiKas:', err);
    return { success: false, error: err.message || 'Gagal memproses transaksi setor tunai' };
  }
}

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
        hutangData.tanggal_mulai || getTodayDateString(),
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

export async function updateHutang(
  id: string,
  updates: Partial<Hutang>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { id: _, created_at, updated_at, ...cleanUpdates } = updates as any;
    const keys = Object.keys(cleanUpdates).filter((k) => cleanUpdates[k] !== undefined);

    if (keys.length > 0) {
      const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const values = keys.map((k) => cleanUpdates[k]);
      values.push(id);
      await dbQuery(`UPDATE hutang SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}`, values);
    }

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

export async function deleteHutang(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Delete associated payment logs in hutang_pembayaran
    await dbQuery('DELETE FROM hutang_pembayaran WHERE hutang_id = $1', [id]);
    // 2. Unlink kas_transaksi so transaction history isn't deleted
    await dbQuery('UPDATE kas_transaksi SET hutang_id = NULL WHERE hutang_id = $1', [id]);
    // 3. Delete the hutang record
    await dbQuery('DELETE FROM hutang WHERE id = $1', [id]);

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

export interface HutangPembayaranDetail extends HutangPembayaran {
  nama_hutang?: string;
  jenis_pembayaran?: string;
  pic_nama?: string;
}

export async function getHutangPembayaranList(): Promise<HutangPembayaranDetail[]> {
  try {
    const rows = await dbQuery<HutangPembayaranDetail>(`
      SELECT 
        hp.*,
        h.nama_hutang,
        COALESCE(kt.jenis_pembayaran, 'non_tunai') AS jenis_pembayaran,
        COALESCE(kt.pic_nama, 'Finance Admin') AS pic_nama
      FROM hutang_pembayaran hp
      LEFT JOIN hutang h ON hp.hutang_id = h.id
      LEFT JOIN kas_transaksi kt ON hp.kas_transaksi_id = kt.id
      ORDER BY hp.tanggal_bayar DESC, hp.created_at DESC
    `);
    return rows;
  } catch (err) {
    console.error('Error fetching hutang pembayaran list:', err);
    return [];
  }
}

export async function updateHutangPembayaran(
  id: string,
  updates: { nominal: number; tanggal_bayar: string; jenis_pembayaran?: 'tunai' | 'non_tunai' }
): Promise<{ success: boolean; error?: string }> {
  try {
    const old = await dbQuerySingle<HutangPembayaran>(
      'SELECT * FROM hutang_pembayaran WHERE id = $1',
      [id]
    );
    if (!old) return { success: false, error: 'Data pembayaran cicilan tidak ditemukan' };

    const nominalBaru = Number(updates.nominal) || 0;
    const nominalLama = Number(old.nominal) || 0;
    const diff = nominalBaru - nominalLama;

    if (diff !== 0 && old.hutang_id) {
      const h = await dbQuerySingle<{ id: string; sisa_hutang: number }>(
        'SELECT id, sisa_hutang FROM hutang WHERE id = $1',
        [old.hutang_id]
      );
      if (h) {
        const sisaBaru = Math.max(0, (Number(h.sisa_hutang) || 0) - diff);
        const statusBaru = sisaBaru <= 0 ? 'lunas' : 'berjalan';
        await dbQuery(
          'UPDATE hutang SET sisa_hutang = $1, status = $2, updated_at = NOW() WHERE id = $3',
          [sisaBaru, statusBaru, old.hutang_id]
        );
      }
    }

    if (old.kas_transaksi_id) {
      await dbQuery(
        'UPDATE kas_transaksi SET nominal = $1, tanggal = $2, jenis_pembayaran = COALESCE($3, jenis_pembayaran), updated_at = NOW() WHERE id = $4',
        [nominalBaru, updates.tanggal_bayar, updates.jenis_pembayaran || null, old.kas_transaksi_id]
      );
    }

    await dbQuery(
      'UPDATE hutang_pembayaran SET nominal = $1, tanggal_bayar = $2, updated_at = NOW() WHERE id = $3',
      [nominalBaru, updates.tanggal_bayar, id]
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

export async function deleteHutangPembayaran(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const old = await dbQuerySingle<HutangPembayaran>(
      'SELECT * FROM hutang_pembayaran WHERE id = $1',
      [id]
    );
    if (!old) return { success: false, error: 'Data pembayaran cicilan tidak ditemukan' };

    // Reverse sisa hutang
    if (old.hutang_id) {
      const h = await dbQuerySingle<{ id: string; sisa_hutang: number }>(
        'SELECT id, sisa_hutang FROM hutang WHERE id = $1',
        [old.hutang_id]
      );
      if (h) {
        const sisaBaru = (Number(h.sisa_hutang) || 0) + (Number(old.nominal) || 0);
        await dbQuery(
          'UPDATE hutang SET sisa_hutang = $1, status = $2, updated_at = NOW() WHERE id = $3',
          [sisaBaru, 'berjalan', old.hutang_id]
        );
      }
    }

    // Delete kas transaksi record
    if (old.kas_transaksi_id) {
      await dbQuery('DELETE FROM kas_transaksi WHERE id = $1', [old.kas_transaksi_id]);
    }

    // Delete hutang pembayaran record
    await dbQuery('DELETE FROM hutang_pembayaran WHERE id = $1', [id]);

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
    const oldTx = await dbQuerySingle<{ id: string; siswa_id: string; hutang_id: string }>(
      'SELECT id, siswa_id, hutang_id FROM kas_transaksi WHERE id = $1',
      [id]
    );

    const { siswa, hutang, staff, id: _id, created_at, updated_at, ...cleanUpdates } = updates as any;

    if (!cleanUpdates.siswa_id || cleanUpdates.siswa_id === '' || cleanUpdates.siswa_id === 'null' || cleanUpdates.siswa_id === 'undefined') {
      cleanUpdates.siswa_id = null;
    }
    if (!cleanUpdates.hutang_id || cleanUpdates.hutang_id === '' || cleanUpdates.hutang_id === 'null' || cleanUpdates.hutang_id === 'undefined') {
      cleanUpdates.hutang_id = null;
    }
    if (!cleanUpdates.staff_id || cleanUpdates.staff_id === '' || cleanUpdates.staff_id === 'null' || cleanUpdates.staff_id === 'undefined') {
      cleanUpdates.staff_id = null;
    }
    if (cleanUpdates.potongan_kasbon !== undefined) {
      cleanUpdates.potongan_kasbon = Number(cleanUpdates.potongan_kasbon) || 0;
    }
    if (
      !cleanUpdates.rekening_id ||
      cleanUpdates.rekening_id === '' ||
      cleanUpdates.rekening_id === 'undefined' ||
      cleanUpdates.rekening_id === 'null' ||
      cleanUpdates.jenis_pembayaran === 'tunai'
    ) {
      cleanUpdates.rekening_id = null;
    }
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

    // Update or sync hutang_pembayaran if linked
    const targetHutangId = cleanUpdates.hutang_id !== undefined ? cleanUpdates.hutang_id : oldTx?.hutang_id;
    if (targetHutangId) {
      const existingHp = await dbQuerySingle<{ id: string }>(
        'SELECT id FROM hutang_pembayaran WHERE kas_transaksi_id = $1',
        [id]
      );
      if (existingHp) {
        await dbQuery(
          `UPDATE hutang_pembayaran 
           SET hutang_id = $1, nominal = COALESCE($2, nominal), tanggal_bayar = COALESCE($3, tanggal_bayar), updated_at = NOW() 
           WHERE kas_transaksi_id = $4`,
          [targetHutangId, cleanUpdates.nominal ?? null, cleanUpdates.tanggal ?? null, id]
        );
      } else {
        await dbQuery(
          `INSERT INTO hutang_pembayaran (hutang_id, tanggal_bayar, nominal, kas_transaksi_id)
           VALUES ($1, $2, $3, $4)`,
          [targetHutangId, cleanUpdates.tanggal || getTodayDateString(), cleanUpdates.nominal || 0, id]
        );
      }
    } else if (oldTx?.hutang_id && cleanUpdates.hutang_id === null) {
      await dbQuery('DELETE FROM hutang_pembayaran WHERE kas_transaksi_id = $1', [id]);
    }

    if (oldTx?.hutang_id) {
      await syncHutangPaymentState(oldTx.hutang_id);
    }
    if (cleanUpdates.hutang_id && cleanUpdates.hutang_id !== oldTx?.hutang_id) {
      await syncHutangPaymentState(cleanUpdates.hutang_id);
    }

    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');
    cacheInvalidate('siswa*');
    cacheInvalidate('hutang*');
    cacheInvalidate('staff*');

    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/piutang');
    revalidatePath('/kas/hutang');
    revalidatePath('/siswa');
    revalidatePath('/dashboard');
    revalidatePath('/finance');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteKasTransaksi(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const tx = await dbQuerySingle<{ id: string; siswa_id: string; hutang_id: string; staff_id: string }>(
      'SELECT id, siswa_id, hutang_id, staff_id FROM kas_transaksi WHERE id = $1',
      [id]
    );

    await dbQuery('DELETE FROM hutang_pembayaran WHERE kas_transaksi_id = $1', [id]);
    await dbQuery('DELETE FROM kas_transaksi WHERE id = $1', [id]);

    if (tx?.siswa_id) {
      await syncSiswaPaymentState(tx.siswa_id);
    }
    if (tx?.hutang_id) {
      await syncHutangPaymentState(tx.hutang_id);
    }

    cacheInvalidate('kas*');
    cacheInvalidate('dashboard*');
    cacheInvalidate('siswa*');
    cacheInvalidate('hutang*');
    cacheInvalidate('staff*');

    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/piutang');
    revalidatePath('/kas/hutang');
    revalidatePath('/siswa');
    revalidatePath('/dashboard');
    revalidatePath('/finance');
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
        const namePart = pipeParts[0]
          .replace(/^(?:pembayaran\s+)?\[?dp\s*kustom\]?\s*[-:]?\s*/i, '')
          .replace(/^nama\s*(?:customer|siswa)?\s*:\s*/i, '')
          .trim();
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
        const simpleMatch = ket.match(/(?:pembayaran\s+)?\[?dp\s*kustom\]?\s*[-:]?\s*([^(|]+)(?:\(([^)]+)\))?/i);
        if (simpleMatch && simpleMatch[1]) {
          const rawName = simpleMatch[1].trim();
          if (rawName) nama = rawName;
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
