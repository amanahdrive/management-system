'use server';

import { createServerClient } from '@/lib/supabase/server';
import { JadwalSesi } from '@/types/database';
import { revalidatePath } from 'next/cache';
import { generateWhatsAppJadwalMarkdown, InstrukturJadwalGroup } from '../utils/whatsapp-markdown';

const SEED_JADWAL: JadwalSesi[] = [
  {
    id: 'jd1',
    siswa_id: 's1',
    staff_id: 'st1',
    kendaraan_id: 'k1',
    jenis_mobil: 'manual',
    tanggal_sesi: new Date().toISOString().slice(0, 10),
    slot_waktu_id: 'sl1',
    slot_waktu_id_akhir: null,
    nomor_sesi_ke: 1,
    total_sesi_paket: 5,
    status_sesi: 'terjadwal',
    catatan_sesi: 'Sesi perdana pengenalan instrumen',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    siswa: {
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
      catatan: null,
      created_at: '',
      updated_at: '',
    },
    instruktur: {
      id: 'st1',
      nama: 'Syawal',
      foto_url: null,
      tahun_bergabung: 2023,
      no_whatsapp: '081234567890',
      alamat: 'Palembang',
      tanda_tangan_url: null,
      aktif: true,
      created_at: '',
      updated_at: '',
    },
    slot_waktu: {
      id: 'sl1',
      nama_slot: 'Slot 1',
      jam_mulai: '09:00:00',
      jam_selesai: '10:30:00',
      kategori: 'reguler',
      urutan: 1,
      aktif: true,
      created_at: '',
      updated_at: '',
    },
  },
  {
    id: 'jd2',
    siswa_id: 's2',
    staff_id: 'st2',
    kendaraan_id: 'k2',
    jenis_mobil: 'matic',
    tanggal_sesi: new Date().toISOString().slice(0, 10),
    slot_waktu_id: 'sl2',
    slot_waktu_id_akhir: null,
    nomor_sesi_ke: 1,
    total_sesi_paket: 10,
    status_sesi: 'terjadwal',
    catatan_sesi: 'Latihan parkir paralel',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    siswa: {
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
      catatan: null,
      created_at: '',
      updated_at: '',
    },
    instruktur: {
      id: 'st2',
      nama: 'Riski',
      foto_url: null,
      tahun_bergabung: 2023,
      no_whatsapp: '081234567891',
      alamat: 'Palembang',
      tanda_tangan_url: null,
      aktif: true,
      created_at: '',
      updated_at: '',
    },
    slot_waktu: {
      id: 'sl2',
      nama_slot: 'Slot 2',
      jam_mulai: '11:00:00',
      jam_selesai: '12:30:00',
      kategori: 'reguler',
      urutan: 2,
      aktif: true,
      created_at: '',
      updated_at: '',
    },
  },
];

export async function getJadwalByTanggal(
  tanggal: string,
  staffId?: string
): Promise<JadwalSesi[]> {
  try {
    const supabase = await createServerClient();
    let query = supabase
      .from('jadwal_sesi')
      .select(
        '*, siswa(*), instruktur:staff(*), kendaraan(*), slot_waktu:slot_waktu!slot_waktu_id(*), slot_waktu_akhir:slot_waktu!slot_waktu_id_akhir(*)'
      )
      .eq('tanggal_sesi', tanggal);

    if (staffId && staffId !== 'semua') {
      query = query.eq('staff_id', staffId);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) return data as JadwalSesi[];
  } catch (e) {}

  let filtered = SEED_JADWAL.filter((j) => j.tanggal_sesi === tanggal);
  if (staffId && staffId !== 'semua') {
    filtered = filtered.filter((j) => j.staff_id === staffId);
  }
  return filtered.length > 0 ? filtered : SEED_JADWAL;
}

export async function upsertJadwalSesi(
  jadwal: Partial<JadwalSesi>
): Promise<{ success: boolean; data?: JadwalSesi; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: saved, error } = await supabase
      .from('jadwal_sesi')
      .upsert(jadwal)
      .select()
      .single();

    if (error || !saved) return { success: false, error: error?.message || 'Gagal menyimpan jadwal' };

    revalidatePath('/jadwal');
    revalidatePath(`/jadwal/${saved.id}`);
    revalidatePath('/dashboard');

    return { success: true, data: saved as JadwalSesi };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteJadwalSesi(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('jadwal_sesi').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/jadwal');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function generateWhatsAppScheduleText(
  tanggalStr: string,
  staffId?: string
): Promise<string> {
  const jadwalList = await getJadwalByTanggal(tanggalStr, staffId);
  const activeSesi = jadwalList.filter((j) => j.status_sesi === 'terjadwal');

  const groupMap = new Map<string, { nama: string; list: JadwalSesi[] }>();

  activeSesi.forEach((sesi) => {
    const instNama = sesi.instruktur?.nama || 'Instruktur';
    const instId = sesi.staff_id;

    if (!groupMap.has(instId)) {
      groupMap.set(instId, { nama: instNama, list: [] });
    }
    groupMap.get(instId)!.list.push(sesi);
  });

  const groupedData: InstrukturJadwalGroup[] = Array.from(groupMap.values()).map((g) => ({
    instrukturNama: g.nama,
    sesiList: g.list,
  }));

  let footerTemplate: string | undefined;
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'wa_footer_template')
      .single();
    if (data?.value) footerTemplate = data.value;
  } catch (e) {}

  return generateWhatsAppJadwalMarkdown(tanggalStr, groupedData, footerTemplate);
}
