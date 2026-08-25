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
  nominalDibayar: number | null,
  tanggalBayar: string | null,
  jenisPembayaran: 'tunai' | 'non_tunai' = 'non_tunai'
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
    const updatePayload: Record<string, any> = {
      status_pembayaran_kode: statusKode,
      updated_at: new Date().toISOString(),
    };

    if (statusKode === 'dp') {
      updatePayload.dp_nominal = nominalDibayar;
      updatePayload.dp_tanggal = tanggalBayar || new Date().toISOString().slice(0, 10);
    } else if (statusKode === 'belum_bayar' || statusKode === 'batal') {
      updatePayload.dp_nominal = null;
      updatePayload.dp_tanggal = null;
    }

    const { data: updatedSiswa, error: updateErr } = await supabase
      .from('siswa')
      .update(updatePayload)
      .eq('id', siswaId)
      .select()
      .single();

    if (updateErr || !updatedSiswa) {
      return { success: false, error: updateErr?.message || 'Gagal memperbarui status pembayaran' };
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

export async function getSiswaPaymentHistory(siswaId: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('kas_transaksi')
      .select('*')
      .eq('siswa_id', siswaId)
      .order('tanggal', { ascending: false });

    if (!error && data) return data;
  } catch (e) {
    console.error('Error fetching siswa payment history:', e);
  }
  return [];
}

export async function createOrUpdateSiswa(
  siswaData: Partial<Siswa> & { jenis_pembayaran?: 'tunai' | 'non_tunai' }
): Promise<{ success: boolean; data?: Siswa; error?: string }> {
  try {
    const supabase = await createServerClient();

    const isNew = !siswaData.id;
    const selectedJenisPembayaran = siswaData.jenis_pembayaran || 'non_tunai';

    // Clean joined objects and non-table fields from payload before upserting
    const {
      paket,
      promosi,
      status_pembayaran,
      jenis_pembayaran,
      ...cleanPayload
    } = siswaData as any;

    let savedSiswa: Siswa | null = null;
    let error: any = null;

    if (!isNew) {
      // UPDATE existing student - don't allow modifying payment status directly from student profile
      delete cleanPayload.status_pembayaran_kode;
      delete cleanPayload.dp_nominal;
      delete cleanPayload.dp_tanggal;

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
      // INSERT new student - always start with 'belum_bayar' status (payments are exclusively recorded via Kas & Keuangan)
      cleanPayload.status_pembayaran_kode = 'belum_bayar';
      cleanPayload.dp_nominal = null;
      cleanPayload.dp_tanggal = null;

      // Generate unique kode_siswa with proper numeric ordering
      if (!cleanPayload.kode_siswa) {
        const { data: allCodes } = await supabase
          .from('siswa')
          .select('kode_siswa')
          .like('kode_siswa', 'SS%');

        let maxNum = 0;
        if (allCodes && allCodes.length > 0) {
          for (const row of allCodes) {
            const match = (row.kode_siswa || '').match(/\d+/);
            if (match) {
              const num = parseInt(match[0], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        }
        cleanPayload.kode_siswa = `SS${String(maxNum + 1).padStart(3, '0')}`;
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
