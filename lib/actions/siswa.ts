'use server';

import { createServerClient } from '@/lib/supabase/server';
import { Siswa } from '@/types/database';
import { revalidatePath } from 'next/cache';

export async function getSiswaList(): Promise<Siswa[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('siswa')
      .select('*, paket(*), promosi(*), status_pembayaran:status_pembayaran_master(*)')
      .order('created_at', { ascending: false });

    if (!error && data) return data as Siswa[];
  } catch (e) {
    console.error('Error fetching siswa list:', e);
  }
  return [];
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
  } catch (e) {
    console.error('Error fetching siswa by id:', e);
  }
  return null;
}

export async function createOrUpdateSiswa(
  siswaData: Partial<Siswa>
): Promise<{ success: boolean; data?: Siswa; error?: string }> {
  try {
    const supabase = await createServerClient();

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

export async function deleteSiswa(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('siswa').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/siswa');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
