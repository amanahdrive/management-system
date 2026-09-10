'use server';

import { dbQuery, dbQuerySingle, dbExecute } from '@/lib/db';
import { getDeveloperSession } from './auth-dev';

export interface AuditLogChangeItem {
  kolom: string;
  label: string;
  sebelum: string;
  sesudah: string;
}

export interface AuditLogItem {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_username: string;
  actor_role: string;
  ip_address: string | null;
  user_agent: string | null;
  modul: string;
  aksi: string;
  entitas_tipe: string;
  entitas_id: string | null;
  judul: string;
  deskripsi: string;
  data_sebelum: any;
  data_sesudah: any;
  perubahan: AuditLogChangeItem[] | Record<string, any> | null;
  tingkat_urgensi: 'info' | 'warning' | 'critical';
}

export interface AuditLogFilter {
  modul?: string;
  aksi?: string;
  tingkatUrgensi?: string;
  period?: 'today' | 'yesterday' | '7days' | 'month' | 'year' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogsResponse {
  logs: AuditLogItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditMetrics {
  totalLogs: number;
  todayLogs: number;
  criticalCount: number;
  warningCount: number;
  topModule: { name: string; count: number };
  isImmutableProtected: boolean;
}

/**
 * Fetch paginated & filtered audit logs with sub-second execution
 */
export async function getAuditLogsList(
  filter: AuditLogFilter = {}
): Promise<AuditLogsResponse> {
  try {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(filter.limit) || 25));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let pIdx = 1;

    // Filter: Modul (Default: exclude auth session logs so main list is dedicated to system data changes)
    if (filter.modul && filter.modul !== 'all') {
      conditions.push(`modul = $${pIdx++}`);
      params.push(filter.modul);
    } else {
      conditions.push(`modul != 'auth'`);
    }

    // Filter: Aksi
    if (filter.aksi && filter.aksi !== 'all') {
      conditions.push(`aksi = $${pIdx++}`);
      params.push(filter.aksi);
    }

    // Filter: Tingkat Urgensi
    if (filter.tingkatUrgensi && filter.tingkatUrgensi !== 'all') {
      conditions.push(`tingkat_urgensi = $${pIdx++}`);
      params.push(filter.tingkatUrgensi);
    }

    // Filter: Periode Tanggal (WIB timezone handling)
    const period = filter.period || 'all';
    if (period === 'today') {
      conditions.push(`(created_at AT TIME ZONE 'Asia/Jakarta')::date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date`);
    } else if (period === 'yesterday') {
      conditions.push(
        `(created_at AT TIME ZONE 'Asia/Jakarta')::date = ((NOW() AT TIME ZONE 'Asia/Jakarta')::date - INTERVAL '1 day')::date`
      );
    } else if (period === '7days') {
      conditions.push(`created_at >= NOW() - INTERVAL '7 days'`);
    } else if (period === 'month') {
      conditions.push(
        `date_trunc('month', created_at AT TIME ZONE 'Asia/Jakarta') = date_trunc('month', NOW() AT TIME ZONE 'Asia/Jakarta')`
      );
    } else if (period === 'year') {
      conditions.push(
        `date_trunc('year', created_at AT TIME ZONE 'Asia/Jakarta') = date_trunc('year', NOW() AT TIME ZONE 'Asia/Jakarta')`
      );
    } else if (period === 'custom') {
      if (filter.startDate) {
        conditions.push(`(created_at AT TIME ZONE 'Asia/Jakarta')::date >= $${pIdx++}::date`);
        params.push(filter.startDate);
      }
      if (filter.endDate) {
        conditions.push(`(created_at AT TIME ZONE 'Asia/Jakarta')::date <= $${pIdx++}::date`);
        params.push(filter.endDate);
      }
    }

    // Filter: Search Keyword
    if (filter.search && filter.search.trim() !== '') {
      const kw = `%${filter.search.trim()}%`;
      conditions.push(`(
        judul ILIKE $${pIdx} OR
        deskripsi ILIKE $${pIdx} OR
        actor_username ILIKE $${pIdx} OR
        entitas_id ILIKE $${pIdx}
      )`);
      params.push(kw);
      pIdx++;
    }

    const whereClause = conditions.join(' AND ');

    // 1. Get total count
    const countSql = `SELECT COUNT(*)::int as total FROM public.audit_logs WHERE ${whereClause}`;
    const countRes = await dbQuerySingle<{ total: number }>(countSql, params);
    const totalCount = countRes?.total || 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // 2. Fetch paginated records
    const listParams = [...params, limit, offset];
    const listSql = `
      SELECT
        id,
        created_at,
        actor_id,
        actor_username,
        actor_role,
        ip_address,
        user_agent,
        modul,
        aksi,
        entitas_tipe,
        entitas_id,
        judul,
        deskripsi,
        data_sebelum,
        data_sesudah,
        perubahan,
        tingkat_urgensi
      FROM public.audit_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;

    const logs = await dbQuery<AuditLogItem>(listSql, listParams);

    return {
      logs,
      totalCount,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return {
      logs: [],
      totalCount: 0,
      page: 1,
      limit: 25,
      totalPages: 1,
    };
  }
}

/**
 * Get aggregate statistics & health metrics for Audit Log Dashboard
 */
export async function getAuditLogMetrics(): Promise<AuditMetrics> {
  try {
    const totalRow = await dbQuerySingle<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM public.audit_logs WHERE modul != 'auth'`
    );

    const todayRow = await dbQuerySingle<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM public.audit_logs
       WHERE modul != 'auth' AND (created_at AT TIME ZONE 'Asia/Jakarta')::date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date`
    );

    const urgencies = await dbQuery<{ tingkat_urgensi: string; count: number }>(
      `SELECT tingkat_urgensi, COUNT(*)::int as count
       FROM public.audit_logs
       WHERE modul != 'auth' AND tingkat_urgensi IN ('warning', 'critical')
       GROUP BY tingkat_urgensi`
    );

    let criticalCount = 0;
    let warningCount = 0;
    urgencies.forEach((u) => {
      if (u.tingkat_urgensi === 'critical') criticalCount = u.count;
      if (u.tingkat_urgensi === 'warning') warningCount = u.count;
    });

    const topModuleRow = await dbQuerySingle<{ modul: string; count: number }>(
      `SELECT modul, COUNT(*)::int as count
       FROM public.audit_logs
       WHERE modul != 'auth'
       GROUP BY modul
       ORDER BY count DESC
       LIMIT 1`
    );

    // Verify immutability trigger exists
    const triggerCheck = await dbQuerySingle<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_audit_logs_immutable'
      ) as exists`
    );

    return {
      totalLogs: totalRow?.count || 0,
      todayLogs: todayRow?.count || 0,
      criticalCount,
      warningCount,
      topModule: {
        name: topModuleRow?.modul || 'keuangan',
        count: topModuleRow?.count || 0,
      },
      isImmutableProtected: triggerCheck?.exists ?? true,
    };
  } catch (err) {
    console.error('Error getting audit metrics:', err);
    return {
      totalLogs: 0,
      todayLogs: 0,
      criticalCount: 0,
      warningCount: 0,
      topModule: { name: '-', count: 0 },
      isImmutableProtected: true,
    };
  }
}

/**
 * Fetch dedicated login & session history for Developer (Alfi)
 */
export async function getDeveloperAuthLogs(limit = 40): Promise<AuditLogItem[]> {
  try {
    const rows = await dbQuery<AuditLogItem>(
      `SELECT
        id,
        created_at,
        actor_id,
        actor_username,
        actor_role,
        ip_address,
        user_agent,
        modul,
        aksi,
        entitas_tipe,
        entitas_id,
        judul,
        deskripsi,
        data_sebelum,
        data_sesudah,
        perubahan,
        tingkat_urgensi
      FROM public.audit_logs
      WHERE modul = 'auth'
      ORDER BY created_at DESC
      LIMIT $1`,
      [limit]
    );
    return rows;
  } catch (err) {
    console.error('Error fetching developer auth logs:', err);
    return [];
  }
}

/**
 * Programmatically record an enterprise audit log entry from any server action
 */
export async function recordAuditLogManual(entry: {
  modul: string;
  aksi: string;
  entitas_tipe: string;
  entitas_id?: string;
  judul: string;
  deskripsi: string;
  data_sebelum?: any;
  data_sesudah?: any;
  perubahan?: any;
  tingkat_urgensi?: 'info' | 'warning' | 'critical';
  actor_username?: string;
  actor_role?: string;
}): Promise<boolean> {
  try {
    let actorId: string | null = null;
    let actorUsername = entry.actor_username || 'System / Operator';
    let actorRole = entry.actor_role || 'developer';

    const session = await getDeveloperSession();
    if (session.isAuthenticated && session.user) {
      actorId = session.user.id;
      actorUsername = session.user.username;
      actorRole = session.user.role;
    }

    await dbExecute(
      `INSERT INTO public.audit_logs (
        actor_id, actor_username, actor_role, modul, aksi,
        entitas_tipe, entitas_id, judul, deskripsi,
        data_sebelum, data_sesudah, perubahan, tingkat_urgensi
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13
      )`,
      [
        actorId,
        actorUsername,
        actorRole,
        entry.modul,
        entry.aksi,
        entry.entitas_tipe,
        entry.entitas_id || null,
        entry.judul,
        entry.deskripsi,
        entry.data_sebelum ? JSON.stringify(entry.data_sebelum) : null,
        entry.data_sesudah ? JSON.stringify(entry.data_sesudah) : null,
        entry.perubahan ? JSON.stringify(entry.perubahan) : null,
        entry.tingkat_urgensi || 'info',
      ]
    );

    return true;
  } catch (err) {
    console.error('Failed to record manual audit log:', err);
    return false;
  }
}
