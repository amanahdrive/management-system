'use server';

import { createServerClient } from '@/lib/supabase/server';
import { Paket, Promosi, Jabatan, Staff, StatusPembayaranMaster, SlotWaktu, Kendaraan } from '@/types/database';
import { revalidatePath } from 'next/cache';

// --- SEED FALLBACK DATA ---
const SEED_PAKET: Paket[] = [
  {
    id: 'p1',
    nama_paket: 'Basic (5x)',
    jumlah_sesi: 5,
    termasuk_sim: false,
    harga_normal: 950000,
    harga_promo: 800000,
    jenis_mobil: ['manual', 'matic'],
    is_custom: false,
    aktif: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p2',
    nama_paket: 'Basic + SIM (5x)',
    jumlah_sesi: 5,
    termasuk_sim: true,
    harga_normal: 1700000,
    harga_promo: null,
    jenis_mobil: ['manual', 'matic'],
    is_custom: false,
    aktif: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p3',
    nama_paket: 'Pro (10x)',
    jumlah_sesi: 10,
    termasuk_sim: false,
    harga_normal: 1600000,
    harga_promo: null,
    jenis_mobil: ['manual', 'matic'],
    is_custom: false,
    aktif: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p4',
    nama_paket: 'Pro + SIM (10x)',
    jumlah_sesi: 10,
    termasuk_sim: true,
    harga_normal: 2300000,
    harga_promo: null,
    jenis_mobil: ['manual', 'matic'],
    is_custom: false,
    aktif: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p5',
    nama_paket: 'Refresh / Pelancaran (3x)',
    jumlah_sesi: 3,
    termasuk_sim: false,
    harga_normal: 500000,
    harga_promo: null,
    jenis_mobil: ['manual', 'matic', 'mobil_sendiri'],
    is_custom: false,
    aktif: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'p6',
    nama_paket: 'Khusus',
    jumlah_sesi: 0,
    termasuk_sim: false,
    harga_normal: 0,
    harga_promo: null,
    jenis_mobil: ['manual', 'matic', 'mobil_sendiri'],
    is_custom: true,
    aktif: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const SEED_JABATAN: Jabatan[] = [
  { id: 'j1', nama_jabatan: 'Owner', aktif: true, created_at: '', updated_at: '' },
  { id: 'j2', nama_jabatan: 'Manager Utama', aktif: true, created_at: '', updated_at: '' },
  { id: 'j3', nama_jabatan: 'Manager Keuangan', aktif: true, created_at: '', updated_at: '' },
  { id: 'j4', nama_jabatan: 'Manager Bisnis', aktif: true, created_at: '', updated_at: '' },
  { id: 'j5', nama_jabatan: 'Instruktur', aktif: true, created_at: '', updated_at: '' },
  { id: 'j6', nama_jabatan: 'Admin', aktif: true, created_at: '', updated_at: '' },
  { id: 'j7', nama_jabatan: 'Social Media Specialist', aktif: true, created_at: '', updated_at: '' },
  { id: 'j8', nama_jabatan: 'Content Creator', aktif: true, created_at: '', updated_at: '' },
  { id: 'j9', nama_jabatan: 'Fleet Officer (Pengawas Kendaraan Operasional)', aktif: true, created_at: '', updated_at: '' },
];

const SEED_STAFF: Staff[] = [
  {
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
    jabatan_list: [{ id: 'j5', nama_jabatan: 'Instruktur', aktif: true, created_at: '', updated_at: '' }],
  },
  {
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
    jabatan_list: [{ id: 'j5', nama_jabatan: 'Instruktur', aktif: true, created_at: '', updated_at: '' }],
  },
  {
    id: 'st3',
    nama: 'Alfi',
    foto_url: null,
    tahun_bergabung: 2024,
    no_whatsapp: '081234567892',
    alamat: 'Palembang',
    tanda_tangan_url: null,
    aktif: true,
    created_at: '',
    updated_at: '',
    jabatan_list: [{ id: 'j5', nama_jabatan: 'Instruktur', aktif: true, created_at: '', updated_at: '' }],
  },
];

const SEED_SLOT: SlotWaktu[] = [
  { id: 'sl1', nama_slot: 'Slot 1', jam_mulai: '09:00:00', jam_selesai: '10:30:00', kategori: 'reguler', urutan: 1, aktif: true, created_at: '', updated_at: '' },
  { id: 'sl2', nama_slot: 'Slot 2', jam_mulai: '11:00:00', jam_selesai: '12:30:00', kategori: 'reguler', urutan: 2, aktif: true, created_at: '', updated_at: '' },
  { id: 'sl3', nama_slot: 'Slot 3', jam_mulai: '13:30:00', jam_selesai: '15:00:00', kategori: 'reguler', urutan: 3, aktif: true, created_at: '', updated_at: '' },
  { id: 'sl4', nama_slot: 'Slot 4', jam_mulai: '15:30:00', jam_selesai: '17:00:00', kategori: 'reguler', urutan: 4, aktif: true, created_at: '', updated_at: '' },
  { id: 'sl5', nama_slot: 'Slot 5', jam_mulai: '18:30:00', jam_selesai: '20:00:00', kategori: 'malam', urutan: 5, aktif: true, created_at: '', updated_at: '' },
  { id: 'sl6', nama_slot: 'Slot 6', jam_mulai: '20:30:00', jam_selesai: '22:00:00', kategori: 'malam', urutan: 6, aktif: true, created_at: '', updated_at: '' },
];

const SEED_STATUS_PEMBAYARAN: StatusPembayaranMaster[] = [
  { id: 'sp1', kode: 'belum_bayar', label: 'Belum Bayar', warna_badge: '#C13D3D', urutan: 1, created_at: '', updated_at: '' },
  { id: 'sp2', kode: 'dp', label: 'DP (Uang Muka)', warna_badge: '#B9821B', urutan: 2, created_at: '', updated_at: '' },
  { id: 'sp3', kode: 'lunas', label: 'Lunas', warna_badge: '#1B8A5A', urutan: 3, created_at: '', updated_at: '' },
  { id: 'sp4', kode: 'batal', label: 'Batal', warna_badge: '#5C6E6B', urutan: 4, created_at: '', updated_at: '' },
];

// --- PAKET ACTIONS ---
export async function getPaketList(): Promise<Paket[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('paket').select('*').order('created_at', { ascending: true });
    if (!error && data && data.length > 0) return data as Paket[];
  } catch (e) {
    console.warn('[Supabase Fallback] paket data');
  }
  return SEED_PAKET;
}

export async function upsertPaket(paket: Partial<Paket>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('paket').upsert(paket);
    if (error) return { success: false, error: error.message };
    revalidatePath('/master-data/paket');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- PROMOSI ACTIONS ---
export async function getPromosiList(): Promise<Promosi[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('promosi').select('*').order('created_at', { ascending: false });
    if (!error && data) return data as Promosi[];
  } catch (e) {}
  return [];
}

export async function upsertPromosi(promosi: Partial<Promosi>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('promosi').upsert(promosi);
    if (error) return { success: false, error: error.message };
    revalidatePath('/master-data/promosi');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- JABATAN ACTIONS ---
export async function getJabatanList(): Promise<Jabatan[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('jabatan').select('*').order('nama_jabatan', { ascending: true });
    if (!error && data && data.length > 0) return data as Jabatan[];
  } catch (e) {}
  return SEED_JABATAN;
}

export async function upsertJabatan(jabatan: Partial<Jabatan>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('jabatan').upsert(jabatan);
    if (error) return { success: false, error: error.message };
    revalidatePath('/master-data/jabatan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- STAFF ACTIONS ---
export async function getStaffList(): Promise<Staff[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('staff')
      .select('*, staff_jabatan(jabatan(*))')
      .order('nama', { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((st: any) => ({
        ...st,
        jabatan_list: st.staff_jabatan ? st.staff_jabatan.map((sj: any) => sj.jabatan) : [],
      }));
    }
  } catch (e) {}
  return SEED_STAFF;
}

export async function getInstrukturList(): Promise<Staff[]> {
  const allStaff = await getStaffList();
  return allStaff.filter(
    (st) => st.aktif && st.jabatan_list?.some((j) => j.nama_jabatan === 'Instruktur')
  );
}

export async function upsertStaff(
  staff: Partial<Staff>,
  jabatanIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: savedStaff, error } = await supabase.from('staff').upsert(staff).select().single();
    if (error || !savedStaff) return { success: false, error: error?.message || 'Gagal menyimpan staff' };

    // Update junction staff_jabatan
    await supabase.from('staff_jabatan').delete().eq('staff_id', savedStaff.id);
    if (jabatanIds && jabatanIds.length > 0) {
      const inserts = jabatanIds.map((jId) => ({
        staff_id: savedStaff.id,
        jabatan_id: jId,
      }));
      await supabase.from('staff_jabatan').insert(inserts);
    }

    revalidatePath('/master-data/staff');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- SLOT WAKTU ACTIONS ---
export async function getSlotWaktuList(): Promise<SlotWaktu[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('slot_waktu').select('*').order('urutan', { ascending: true });
    if (!error && data && data.length > 0) return data as SlotWaktu[];
  } catch (e) {}
  return SEED_SLOT;
}

export async function upsertSlotWaktu(slot: Partial<SlotWaktu>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('slot_waktu').upsert(slot);
    if (error) return { success: false, error: error.message };
    revalidatePath('/master-data/slot-waktu');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --- STATUS PEMBAYARAN MASTER ACTIONS ---
export async function getStatusPembayaranMaster(): Promise<StatusPembayaranMaster[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('status_pembayaran_master').select('*').order('urutan', { ascending: true });
    if (!error && data && data.length > 0) return data as StatusPembayaranMaster[];
  } catch (e) {}
  return SEED_STATUS_PEMBAYARAN;
}

// --- KENDARAAN MASTER ACTIONS ---
export async function getKendaraanMasterList(): Promise<Kendaraan[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('kendaraan').select('*, status:kendaraan_status(*)').order('nama_kendaraan', { ascending: true });
    if (!error && data && data.length > 0) return data as Kendaraan[];
  } catch (e) {}
  return [
    {
      id: 'k1',
      nama_kendaraan: 'Toyota Calya',
      tahun_produksi: 2022,
      status_pembelian: 'baru',
      tahun_pembelian: 2022,
      plat_nomor: 'BG 1234 XY',
      tipe_transmisi: 'manual',
      warna: 'Hitam',
      foto_url: null,
      aktif: true,
      created_at: '',
      updated_at: '',
      status: {
        id: 'ks1',
        kendaraan_id: 'k1',
        odometer_terkini: 34200,
        oli_tanggal_terakhir: '2026-05-10',
        oli_km_terakhir: 31000,
        cuci_tanggal_terakhir: '2026-08-01',
        bensin_tanggal_terakhir: '2026-08-05',
        bensin_jenis_terakhir: 'pertalite',
        bensin_nominal_terakhir: 150000,
        bensin_liter_terakhir: 15,
        created_at: '',
        updated_at: '',
      },
    },
    {
      id: 'k2',
      nama_kendaraan: 'Daihatsu Sigra',
      tahun_produksi: 2023,
      status_pembelian: 'baru',
      tahun_pembelian: 2023,
      plat_nomor: 'BG 5678 AB',
      tipe_transmisi: 'matic',
      warna: 'Putih',
      foto_url: null,
      aktif: true,
      created_at: '',
      updated_at: '',
      status: {
        id: 'ks2',
        kendaraan_id: 'k2',
        odometer_terkini: 18500,
        oli_tanggal_terakhir: '2026-06-20',
        oli_km_terakhir: 17000,
        cuci_tanggal_terakhir: '2026-08-04',
        bensin_tanggal_terakhir: '2026-08-06',
        bensin_jenis_terakhir: 'pertamax',
        bensin_nominal_terakhir: 200000,
        bensin_liter_terakhir: 12.27,
        created_at: '',
        updated_at: '',
      },
    },
  ];
}

export async function upsertKendaraanMaster(kendaraan: Partial<Kendaraan>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data: saved, error } = await supabase.from('kendaraan').upsert(kendaraan).select().single();
    if (error || !saved) return { success: false, error: error?.message || 'Gagal menyimpan kendaraan' };

    // Ensure status row exists
    await supabase.from('kendaraan_status').insert({ kendaraan_id: saved.id }).single();

    revalidatePath('/master-data/kendaraan');
    revalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteKendaraan(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from('kendaraan').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/master-data/kendaraan');
    revalidatePath('/kendaraan');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
