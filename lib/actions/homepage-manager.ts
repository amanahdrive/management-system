'use server';

import { dbQuery, dbQuerySingle } from '@/lib/db';
import { cacheGet, cacheSet, cacheInvalidate } from '@/lib/utils/cache';
import { getTodayDateString } from '@/lib/utils/date';
import {
  HomepageLead,
  HomepageLeadStatus,
  HomepageEvent,
  HomepageContactInfo,
  HomepageMapsInfo,
} from '@/types/database';
import { createOrUpdateSiswa } from '@/lib/actions/siswa';
import { revalidatePath } from 'next/cache';

const DEFAULT_CONTACT_INFO: HomepageContactInfo = {
  phone: '628137790961',
  display_phone: '0813-7790-961',
  name: 'Kak Lia (Nur Awalia)',
  role: 'Student Care & Konsultasi Resmi',
  avatar_url: 'https://yhwwhqqffgtiavapgjvc.supabase.co/storage/v1/object/public/assets/staff_models/Lia.webp',
  avatar_position_x: 50,
  avatar_position_y: 20,
  avatar_scale: 100,
};

const DEFAULT_MAPS_INFO: HomepageMapsInfo = {
  address: 'Jl. Demang Lebar Daun No. 45, Palembang, Sumatera Selatan',
  embed_url:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d45078.95267279368!2d104.69953335300335!3d-2.9714931721378597!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e3b758980fc77a1%3A0x3a59dd8b6033f81b!2sAmanah%20Drive%20Palembang%20-%20KURSUS%20MENGEMUDI%20PALEMBANG!5e0!3m2!1sen!2sid!4v1789146853835!5m2!1sen!2sid',
};

/**
 * Fetch list of leads submitted from the public homepage.
 */
export async function getHomepageLeads(
  statusFilter?: string,
  search?: string
): Promise<HomepageLead[]> {
  try {
    let sql = `SELECT * FROM public.homepage_leads WHERE 1=1`;
    const params: any[] = [];

    if (statusFilter && statusFilter !== 'semua') {
      params.push(statusFilter);
      sql += ` AND status = $${params.length}`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      sql += ` AND (nama ILIKE $${params.length} OR whatsapp ILIKE $${params.length} OR paket_nama ILIKE $${params.length} OR catatan ILIKE $${params.length})`;
    }

    sql += ` ORDER BY created_at DESC LIMIT 500`;

    const rows = await dbQuery<HomepageLead>(sql, params);
    return rows || [];
  } catch (err) {
    console.error('[Homepage Manager] Error fetching leads:', err);
    return [];
  }
}

/**
 * Update lead status and optional note.
 */
export async function updateLeadStatus(
  leadId: string,
  status: HomepageLeadStatus,
  catatan?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (catatan !== undefined) {
      await dbQuery(
        `UPDATE public.homepage_leads
         SET status = $1, catatan = $2, updated_at = NOW()
         WHERE id = $3`,
        [status, catatan, leadId]
      );
    } else {
      await dbQuery(
        `UPDATE public.homepage_leads
         SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [status, leadId]
      );
    }

    cacheInvalidate('homepage_*');
    revalidatePath('/homepage-manager/submissions');
    revalidatePath('/homepage-manager/tracking');

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Delete a lead record.
 */
export async function deleteLead(leadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await dbQuery(`DELETE FROM public.homepage_leads WHERE id = $1`, [leadId]);
    cacheInvalidate('homepage_*');
    revalidatePath('/homepage-manager/submissions');
    revalidatePath('/homepage-manager/tracking');
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Convert a submitted homepage lead into an active Siswa in the internal system.
 */
export async function convertLeadToSiswa(
  leadId: string,
  payload: {
    paket_id: string;
    harga_final: number;
    tanggal_rencana_mulai?: string;
    catatan?: string;
  }
): Promise<{ success: boolean; siswaId?: string; error?: string }> {
  try {
    const lead = await dbQuerySingle<HomepageLead>(
      `SELECT * FROM public.homepage_leads WHERE id = $1`,
      [leadId]
    );

    if (!lead) {
      return { success: false, error: 'Data lead tidak ditemukan' };
    }

    const res = await createOrUpdateSiswa({
      nama: lead.nama,
      no_whatsapp: lead.whatsapp,
      alamat: lead.alamat_jemput || 'Palembang',
      paket_id: payload.paket_id,
      harga_final: payload.harga_final,
      tanggal_booking: getTodayDateString(),
      tanggal_rencana_mulai: payload.tanggal_rencana_mulai || getTodayDateString(),
      sumber: 'meta_ads',
      catatan: `[Lead Homepage] Pilihan Armada: ${lead.kendaraan_nama || '-'}. Slot: ${lead.slot_waktu_nama || '-'}. ${
        payload.catatan ? `Catatan admin: ${payload.catatan}` : ''
      }`,
    });

    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'Gagal membuat data siswa' };
    }

    // Mark lead status as 'siswa'
    await dbQuery(
      `UPDATE public.homepage_leads
       SET status = 'siswa', updated_at = NOW()
       WHERE id = $1`,
      [leadId]
    );

    cacheInvalidate('homepage_*');
    revalidatePath('/homepage-manager/submissions');
    revalidatePath('/homepage-manager/tracking');
    revalidatePath('/siswa');

    return { success: true, siswaId: res.data.id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Comprehensive conversion and tracking analytics for the homepage.
 */
export async function getHomepageTrackingStats() {
  try {
    // 1. Total leads summary
    const summary = await dbQuerySingle<{
      total_leads: number;
      leads_today: number;
      leads_week: number;
      leads_month: number;
      status_baru: number;
      status_dihubungi: number;
      status_siswa: number;
      status_batal: number;
    }>(`
      SELECT
        COUNT(*)::int AS total_leads,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END)::int AS leads_today,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END)::int AS leads_week,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END)::int AS leads_month,
        COUNT(CASE WHEN status = 'baru' THEN 1 END)::int AS status_baru,
        COUNT(CASE WHEN status = 'dihubungi' THEN 1 END)::int AS status_dihubungi,
        COUNT(CASE WHEN status = 'siswa' THEN 1 END)::int AS status_siswa,
        COUNT(CASE WHEN status = 'batal' THEN 1 END)::int AS status_batal
      FROM public.homepage_leads
    `);

    // 2. Daily trend (past 14 days)
    const dailyRows = await dbQuery<{ tanggal: string; total: number; jadi_siswa: number }>(`
      SELECT
        TO_CHAR(d.day, 'YYYY-MM-DD') AS tanggal,
        COALESCE(COUNT(l.id), 0)::int AS total,
        COALESCE(COUNT(CASE WHEN l.status = 'siswa' THEN 1 END), 0)::int AS jadi_siswa
      FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day'::interval) d(day)
      LEFT JOIN public.homepage_leads l ON DATE(l.created_at) = DATE(d.day)
      GROUP BY d.day
      ORDER BY d.day ASC
    `);

    // 3. Package interest distribution
    const packageStats = await dbQuery<{ paket_nama: string; total: number }>(`
      SELECT
        COALESCE(paket_nama, 'Belum Pilih Paket') AS paket_nama,
        COUNT(*)::int AS total
      FROM public.homepage_leads
      GROUP BY paket_nama
      ORDER BY total DESC
      LIMIT 8
    `);

    // 4. Interaction events breakdown
    const eventStats = await dbQuery<{ event_name: string; total: number }>(`
      SELECT
        COALESCE(event_type, 'unknown') AS event_name,
        COUNT(*)::int AS total
      FROM public.homepage_events
      GROUP BY event_type
      ORDER BY total DESC
    `);

    // 5. Recent interaction stream
    const recentEvents = await dbQuery<{
      id: string;
      event_name: string;
      source: string;
      event_data: any;
      created_at: string;
    }>(`
      SELECT
        id,
        COALESCE(event_type, 'unknown') AS event_name,
        COALESCE(event_source, 'homepage') AS source,
        metadata AS event_data,
        created_at
      FROM public.homepage_events
      ORDER BY created_at DESC
      LIMIT 15
    `);

    return {
      summary: summary || {
        total_leads: 0,
        leads_today: 0,
        leads_week: 0,
        leads_month: 0,
        status_baru: 0,
        status_dihubungi: 0,
        status_siswa: 0,
        status_batal: 0,
      },
      dailyTrend: dailyRows || [],
      packageStats: packageStats || [],
      eventStats: eventStats || [],
      recentEvents: recentEvents || [],
    };
  } catch (err) {
    console.error('[Homepage Manager] Error fetching stats:', err);
    return {
      summary: {
        total_leads: 0,
        leads_today: 0,
        leads_week: 0,
        leads_month: 0,
        status_baru: 0,
        status_dihubungi: 0,
        status_siswa: 0,
        status_batal: 0,
      },
      dailyTrend: [],
      packageStats: [],
      eventStats: [],
      recentEvents: [],
    };
  }
}

/**
 * Fetch homepage settings (contact & map).
 */
export async function getHomepageSettings(): Promise<{
  contact_info: HomepageContactInfo;
  maps_info: HomepageMapsInfo;
}> {
  try {
    const rows = await dbQuery<{ key: string; value: any }>(`
      SELECT key, value
      FROM public.homepage_settings
      WHERE key IN ('contact_info', 'maps_info')
    `);

    let contact_info = { ...DEFAULT_CONTACT_INFO };
    let maps_info = { ...DEFAULT_MAPS_INFO };

    if (rows && rows.length > 0) {
      for (const row of rows) {
        if (row.key === 'contact_info' && row.value) {
          contact_info = { ...DEFAULT_CONTACT_INFO, ...row.value };
        }
        if (row.key === 'maps_info' && row.value) {
          maps_info = { ...DEFAULT_MAPS_INFO, ...row.value };
        }
      }
    }

    return { contact_info, maps_info };
  } catch (err) {
    console.error('[Homepage Manager] Error fetching settings:', err);
    return {
      contact_info: DEFAULT_CONTACT_INFO,
      maps_info: DEFAULT_MAPS_INFO,
    };
  }
}

/**
 * Update homepage settings (contact & map) with instantaneous reflection.
 */
export async function updateHomepageSettings(payload: {
  contact_info?: HomepageContactInfo;
  maps_info?: HomepageMapsInfo;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (payload.contact_info) {
      await dbQuery(
        `INSERT INTO public.homepage_settings (key, value, updated_at)
         VALUES ('contact_info', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(payload.contact_info)]
      );
    }

    if (payload.maps_info) {
      await dbQuery(
        `INSERT INTO public.homepage_settings (key, value, updated_at)
         VALUES ('maps_info', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify(payload.maps_info)]
      );
    }

    cacheInvalidate('homepage_*');
    revalidatePath('/homepage-manager/information');

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
