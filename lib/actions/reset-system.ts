'use server';

import { dbQuery } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export type ResetModuleKey =
  | 'keuangan'
  | 'siswa'
  | 'jadwal'
  | 'kendaraan_log'
  | 'insiden'
  | 'notifikasi'
  | 'master_staff'
  | 'master_paket'
  | 'all';

/**
 * 1. Kosongkan Data Keuangan & Kas (Cashflow, Hutang & Pembayaran)
 */
export async function resetDataKeuangan(): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery("DELETE FROM hutang_pembayaran WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM kas_transaksi WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM hutang WHERE id != '00000000-0000-0000-0000-000000000000'");

    revalidatePath('/kas');
    revalidatePath('/kas/cashflow');
    revalidatePath('/kas/hutang');
    revalidatePath('/kas/piutang');
    revalidatePath('/dashboard');
    revalidatePath('/finance');

    return { success: true };
  } catch (err: any) {
    console.error('Reset keuangan error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 2. Kosongkan Data Siswa & Pendaftaran
 */
export async function resetDataSiswa(): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery("DELETE FROM jadwal_sesi WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("UPDATE insiden SET siswa_id = NULL WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("UPDATE kas_transaksi SET siswa_id = NULL WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM siswa WHERE id != '00000000-0000-0000-0000-000000000000'");

    revalidatePath('/siswa');
    revalidatePath('/jadwal');
    revalidatePath('/dashboard');
    revalidatePath('/instruktur');

    return { success: true };
  } catch (err: any) {
    console.error('Reset siswa error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Kosongkan Data Jadwal Sesi Mengemudi
 */
export async function resetDataJadwal(): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery("DELETE FROM jadwal_sesi WHERE id != '00000000-0000-0000-0000-000000000000'");

    revalidatePath('/jadwal');
    revalidatePath('/dashboard');
    revalidatePath('/instruktur');

    return { success: true };
  } catch (err: any) {
    console.error('Reset jadwal error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. Kosongkan Data Log Harian Kendaraan & Servis Ban
 */
export async function resetDataKendaraanLog(): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery("DELETE FROM kendaraan_log_harian WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM kendaraan_ban WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM kendaraan_status WHERE id != '00000000-0000-0000-0000-000000000000'");

    revalidatePath('/kendaraan');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Reset log kendaraan error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 5. Kosongkan Data Insiden Operasional
 */
export async function resetDataInsiden(): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery("DELETE FROM insiden WHERE id != '00000000-0000-0000-0000-000000000000'");

    revalidatePath('/insiden');
    revalidatePath('/kendaraan');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Reset insiden error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 6. Kosongkan Log Notifikasi Telegram
 */
export async function resetDataNotifikasiLog(): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery("DELETE FROM notifikasi_log WHERE id != '00000000-0000-0000-0000-000000000000'");

    revalidatePath('/settings');

    return { success: true };
  } catch (err: any) {
    console.error('Reset notifikasi log error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 7. Kosongkan Master Data Staff & Instruktur
 */
export async function resetDataMasterStaff(): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery("UPDATE jadwal_sesi SET staff_id = NULL WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("UPDATE insiden SET staff_id = NULL WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM staff_jabatan WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM staff WHERE id != '00000000-0000-0000-0000-000000000000'");

    revalidatePath('/master-data/staff');
    revalidatePath('/master-data/jabatan');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Reset staff error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 8. Kosongkan Master Paket Belajar & Promosi
 */
export async function resetDataMasterPaket(): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery("UPDATE siswa SET paket_id = NULL WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM promosi WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM paket WHERE id != '00000000-0000-0000-0000-000000000000'");

    revalidatePath('/master-data/paket');
    revalidatePath('/master-data/promosi');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (err: any) {
    console.error('Reset paket error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 9. Kosongkan Seluruh Data Database (Reset Total)
 */
export async function resetSystemAllData(): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery("DELETE FROM notifikasi_log WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM insiden WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM hutang_pembayaran WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM kas_transaksi WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM hutang WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM jadwal_sesi WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM siswa WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM kendaraan_ban WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM kendaraan_log_harian WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM kendaraan_status WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM kendaraan WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM staff_jabatan WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM staff WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM jabatan WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM promosi WHERE id != '00000000-0000-0000-0000-000000000000'");
    await dbQuery("DELETE FROM settings WHERE id != '00000000-0000-0000-0000-000000000000'");

    await dbQuery(`
      INSERT INTO settings (key, value, deskripsi) VALUES 
      ('pin_kas', '$2b$10$R8rNaSgluTw0jHqja96RpukOfjeGH0wcgws0OmTZV8qmbgp/dNeFq', 'PIN Kas Default 210100'),
      ('nama_perusahaan', 'Amanah Drive', 'Nama Perusahaan'),
      ('kota_operasional', 'Palembang', 'Kota Operasional')
    `);

    revalidatePath('/dashboard');
    revalidatePath('/siswa');
    revalidatePath('/jadwal');
    revalidatePath('/kendaraan');
    revalidatePath('/kas');
    revalidatePath('/insiden');
    revalidatePath('/master-data/staff');
    revalidatePath('/master-data/jabatan');
    revalidatePath('/master-data/paket');
    revalidatePath('/master-data/kendaraan');
    revalidatePath('/settings');

    return { success: true };
  } catch (err: any) {
    console.error('Reset system error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatcher modular reset
 */
export async function resetModularData(moduleKey: ResetModuleKey): Promise<{ success: boolean; error?: string }> {
  switch (moduleKey) {
    case 'keuangan':
      return resetDataKeuangan();
    case 'siswa':
      return resetDataSiswa();
    case 'jadwal':
      return resetDataJadwal();
    case 'kendaraan_log':
      return resetDataKendaraanLog();
    case 'insiden':
      return resetDataInsiden();
    case 'notifikasi':
      return resetDataNotifikasiLog();
    case 'master_staff':
      return resetDataMasterStaff();
    case 'master_paket':
      return resetDataMasterPaket();
    case 'all':
      return resetSystemAllData();
    default:
      return { success: false, error: 'Modul tidak dikenal' };
  }
}
