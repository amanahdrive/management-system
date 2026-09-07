import { NextRequest, NextResponse } from 'next/server';
import { purgeServerCache } from '@/lib/actions/cache';

export const dynamic = 'force-dynamic';

interface SupabaseWebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, any> | null;
  old_record: Record<string, any> | null;
}

/**
 * GET /api/webhook/supabase
 * Returns webhook status and guidance for Supabase Database Webhook setup
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'management-amanahdrive.vercel.app';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const webhookUrl = `${protocol}://${host}/api/webhook/supabase`;

  return NextResponse.json({
    status: 'online',
    service: 'Amanah Drive Supabase Database Webhook Gateway',
    webhookUrl,
    description: 'Endpoint ini menerima trigger database HTTP dari Supabase Database Webhooks.',
    supportedTables: ['jadwal_sesi', 'siswa', 'kas_transaksi', 'pos_pengeluaran', 'hutang', 'kendaraan_log'],
    instructions: {
      step1: 'Buka Supabase Dashboard -> Database -> Webhooks',
      step2: 'Pilih "Create a new webhook"',
      step3: `Masukkan Webhook URL: ${webhookUrl}`,
      step4: 'Pilih event (INSERT, UPDATE, DELETE) pada tabel yang ingin dipantau',
      step5: '(Opsional) Masukkan HTTP Header: x-webhook-secret = <rahasia_anda>',
    },
  });
}

/**
 * POST /api/webhook/supabase
 * Ingests Supabase Database Webhook payloads and triggers cache invalidation
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Secret validation
    const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
    if (expectedSecret) {
      const authHeader = request.headers.get('authorization');
      const customSecret = request.headers.get('x-webhook-secret') || request.headers.get('x-supabase-webhook-secret');
      const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const providedSecret = customSecret || bearerSecret;

      if (providedSecret && providedSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized: Invalid webhook secret' }, { status: 401 });
      }
    }

    const payload: SupabaseWebhookPayload = await request.json();

    console.log('[Supabase Webhook Triggered]', {
      table: payload.table,
      type: payload.type,
      id: payload.record?.id || payload.old_record?.id,
      timestamp: new Date().toISOString(),
    });

    // 2. Automatically invalidate cache and revalidate paths
    await purgeServerCache();

    return NextResponse.json({
      success: true,
      table: payload.table,
      type: payload.type,
      message: `Database webhook processed for table ${payload.table} (${payload.type})`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Supabase Webhook Error]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process Supabase webhook' },
      { status: 500 }
    );
  }
}
