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

export async function updateSiswaPayment(
  siswaId: string,
  statusKode: string,
  dpNominal: number | null,
  dpTanggal: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();

    // 1. Fetch current student record
    const { data: currentSiswa, error: fetchErr } = await supabase
      .from('siswa')
      .select('*')
      .eq('id', siswaId)
      .single();

    if (fetchErr || !currentSiswa) {
      return { success: false, error: 'Data siswa tidak ditemukan di database' };
    }

    // 2. Update student status & payment details in Supabase
    const { data: updatedSiswa, error: updateErr } = await supabase
      .from('siswa')
      .update({
        status_pembayaran_kode: statusKode,
        dp_nominal: statusKode === 'dp' || statusKode === 'lunas' ? dpNominal : null,
        dp_tanggal: statusKode === 'dp' || statusKode === 'lunas' ? dpTanggal : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', siswaId)
      .select()
      .single();

    if (updateErr || !updatedSiswa) {
      return { success: false, error: updateErr?.message || 'Gagal memperbarui status pembayaran' };
    }

    // 3. Automatically record transaction in Kas & Cashflow
    if ((statusKode === 'dp' || statusKode === 'lunas') && dpNominal && dpNominal > 0) {
      const payDate = dpTanggal || new Date().toISOString().slice(0, 10);
      const isLunas = statusKode === 'lunas';
      const labelTx = isLunas
        ? `Pelunasan Kursus - ${updatedSiswa.nama} (${updatedSiswa.kode_siswa})`
        : `Pembayaran DP Kursus - ${updatedSiswa.nama} (${updatedSiswa.kode_siswa})`;

      await supabase.from('kas_transaksi').insert({
        tanggal: payDate,
        tipe: 'pemasukan',
        kategori: 'pembayaran_siswa',
        keterangan: labelTx,
        nominal: dpNominal,
        pic_tipe: 'admin',
        pic_nama: 'Admin Staff',
        siswa_id: updatedSiswa.id,
        sumber_otomatis: true,
      });
    }

    revalidatePath('/siswa');
    revalidatePath(`/siswa/${siswaId}`);
    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/piutang');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createOrUpdateSiswa(
  siswaData: Partial<Siswa>
): Promise<{ success: boolean; data?: Siswa; error?: string }> {
  try {
    const supabase = await createServerClient();

    // Clean joined objects from payload before upserting
    const {
      paket,
      promosi,
      status_pembayaran,
      ...cleanPayload
    } = siswaData as any;

    let savedSiswa: Siswa | null = null;
    let error: any = null;

    if (cleanPayload.id) {
      // UPDATE existing student
      const res = await supabase
        .from('siswa')
        .update({
          ...cleanPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cleanPayload.id)
        .select()
        .single();

      savedSiswa = res.data as Siswa;
      error = res.error;
    } else {
      // INSERT new student - generate unique kode_siswa based on latest record to avoid duplicates
      if (!cleanPayload.kode_siswa) {
        const { data: latestRecords } = await supabase
          .from('siswa')
          .select('kode_siswa')
          .order('kode_siswa', { ascending: false })
          .limit(1);

        let nextNum = 1;
        if (latestRecords && latestRecords.length > 0) {
          const latestKode = latestRecords[0].kode_siswa || 'SS000';
          const match = latestKode.match(/\d+/);
          if (match) {
            nextNum = parseInt(match[0], 10) + 1;
          }
        }
        cleanPayload.kode_siswa = `SS${String(nextNum).padStart(3, '0')}`;
      }

      const res = await supabase
        .from('siswa')
        .insert(cleanPayload)
        .select()
        .single();

      savedSiswa = res.data as Siswa;
      error = res.error;
    }

    if (error || !savedSiswa) {
      return { success: false, error: error?.message || 'Gagal menyimpan data siswa' };
    }

    // Automatic Kas Transaction logic for new registration or profile edit with payment
    const statusKode = savedSiswa.status_pembayaran_kode;
    const nominalPay = savedSiswa.dp_nominal || (statusKode === 'lunas' ? savedSiswa.harga_final : 0);
    const payDate = savedSiswa.dp_tanggal || new Date().toISOString().slice(0, 10);

    if ((statusKode === 'dp' || statusKode === 'lunas') && nominalPay > 0) {
      const isLunas = statusKode === 'lunas';
      const labelTx = isLunas
        ? `Pelunasan Kursus - ${savedSiswa.nama} (${savedSiswa.kode_siswa})`
        : `Pembayaran DP Kursus - ${savedSiswa.nama} (${savedSiswa.kode_siswa})`;

      await supabase.from('kas_transaksi').insert({
        tanggal: payDate,
        tipe: 'pemasukan',
        kategori: 'pembayaran_siswa',
        keterangan: labelTx,
        nominal: nominalPay,
        pic_tipe: 'admin',
        pic_nama: 'Admin Staff',
        siswa_id: savedSiswa.id,
        sumber_otomatis: true,
      });
    }

    revalidatePath('/siswa');
    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/piutang');
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
