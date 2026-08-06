'use server';

import { createServerClient } from '@/lib/supabase/server';
import { Siswa } from '@/types/database';
import { revalidatePath } from 'next/cache';

const SEED_SISWA: Siswa[] = [
  {
    id: 's1',
    kode_siswa: 'SS001',
    nama: 'Budi Santoso',
    tanggal_booking: '2026-08-01',
    tanggal_rencana_mulai: '2026-08-05',
    no_whatsapp: '081299887766',
    alamat: 'Jl. Merdeka No. 12, Palembang',
    paket_id: 'p1',
    harga_final: 800000,
    harga_manual_override: false,
    promosi_id: null,
    status_pembayaran_kode: 'lunas',
    dp_nominal: null,
    dp_tanggal: null,
    sumber: 'meta_ads',
    sumber_kustom_text: null,
    catatan: 'Prioritas latihan jam pagi',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    paket: {
      id: 'p1',
      nama_paket: 'Basic (5x)',
      jumlah_sesi: 5,
      termasuk_sim: false,
      harga_normal: 950000,
      harga_promo: 800000,
      jenis_mobil: ['manual', 'matic'],
      is_custom: false,
      aktif: true,
      created_at: '',
      updated_at: '',
    },
    status_pembayaran: {
      id: 'sp3',
      kode: 'lunas',
      label: 'Lunas',
      warna_badge: '#1B8A5A',
      urutan: 3,
      created_at: '',
      updated_at: '',
    },
  },
  {
    id: 's2',
    kode_siswa: 'SS002',
    nama: 'Siti Rahma',
    tanggal_booking: '2026-08-03',
    tanggal_rencana_mulai: '2026-08-07',
    no_whatsapp: '085211223344',
    alamat: 'Jl. Angkatan 45 No. 8, Palembang',
    paket_id: 'p3',
    harga_final: 1600000,
    harga_manual_override: false,
    promosi_id: null,
    status_pembayaran_kode: 'dp',
    dp_nominal: 500000,
    dp_tanggal: '2026-08-03',
    sumber: 'tiktok',
    sumber_kustom_text: null,
    catatan: 'Mau paket matic',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    paket: {
      id: 'p3',
      nama_paket: 'Pro (10x)',
      jumlah_sesi: 10,
      termasuk_sim: false,
      harga_normal: 1600000,
      harga_promo: null,
      jenis_mobil: ['manual', 'matic'],
      is_custom: false,
      aktif: true,
      created_at: '',
      updated_at: '',
    },
    status_pembayaran: {
      id: 'sp2',
      kode: 'dp',
      label: 'DP (Uang Muka)',
      warna_badge: '#B9821B',
      urutan: 2,
      created_at: '',
      updated_at: '',
    },
  },
];

export async function getSiswaList(): Promise<Siswa[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('siswa')
      .select('*, paket(*), promosi(*), status_pembayaran:status_pembayaran_master(*)')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) return data as Siswa[];
  } catch (e) {}
  return SEED_SISWA;
}

export async function getSiswaById(id: string): Promise<Siswa | null> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('siswa')
      .select('*, paket(*), promosi(*), status_pembayaran:status_pembayaran_master(*)')
      .eq('id', id)
      .single();

    if (!error && data) return data as Siswa;
  } catch (e) {}
  return SEED_SISWA.find((s) => s.id === id) || null;
}

export async function createOrUpdateSiswa(
  siswaData: Partial<Siswa>
): Promise<{ success: boolean; data?: Siswa; error?: string }> {
  try {
    const supabase = await createServerClient();
    const isNew = !siswaData.id;

    // Save Siswa
    const { data: savedSiswa, error } = await supabase
      .from('siswa')
      .upsert(siswaData)
      .select()
      .single();

    if (error || !savedSiswa) {
      return { success: false, error: error?.message || 'Gagal menyimpan data siswa' };
    }

    // Automatic Kas Transaction logic
    const statusKode = savedSiswa.status_pembayaran_kode;
    if (statusKode === 'dp' && savedSiswa.dp_nominal) {
      // Check if DP kas entry exists
      const { data: existingKas } = await supabase
        .from('kas_transaksi')
        .select('id')
        .eq('siswa_id', savedSiswa.id)
        .eq('kategori', 'dp_siswa')
        .single();

      if (!existingKas) {
        await supabase.from('kas_transaksi').insert({
          tanggal: savedSiswa.dp_tanggal || new Date().toISOString().slice(0, 10),
          tipe: 'pemasukan',
          kategori: 'dp_siswa',
          keterangan: `DP Kursus Siswa - ${savedSiswa.nama} (${savedSiswa.kode_siswa})`,
          nominal: savedSiswa.dp_nominal,
          pic_tipe: 'admin',
          pic_nama: 'Admin Siswa',
          siswa_id: savedSiswa.id,
          sumber_otomatis: true,
        });
      }
    } else if (statusKode === 'lunas') {
      const pelunasanNominal = savedSiswa.dp_nominal
        ? savedSiswa.harga_final - savedSiswa.dp_nominal
        : savedSiswa.harga_final;

      const { data: existingPelunasan } = await supabase
        .from('kas_transaksi')
        .select('id')
        .eq('siswa_id', savedSiswa.id)
        .eq('kategori', 'pelunasan_siswa')
        .single();

      if (!existingPelunasan && pelunasanNominal > 0) {
        await supabase.from('kas_transaksi').insert({
          tanggal: new Date().toISOString().slice(0, 10),
          tipe: 'pemasukan',
          kategori: 'pelunasan_siswa',
          keterangan: `Pelunasan Kursus Siswa - ${savedSiswa.nama} (${savedSiswa.kode_siswa})`,
          nominal: pelunasanNominal,
          pic_tipe: 'admin',
          pic_nama: 'Admin Siswa',
          siswa_id: savedSiswa.id,
          sumber_otomatis: true,
        });
      }
    }

    revalidatePath('/siswa');
    revalidatePath('/kas');
    revalidatePath('/dashboard');

    return { success: true, data: savedSiswa as Siswa };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
