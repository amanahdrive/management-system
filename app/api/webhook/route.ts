import { NextRequest, NextResponse } from 'next/server';
import { purgeServerCache } from '@/lib/actions/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/webhook
 * Verification and health-check endpoint.
 * Supports:
 * - Meta/WhatsApp webhook challenge verification (`hub.challenge`, `hub.verify_token`)
 * - Slack/Generic challenge verification (`challenge`)
 * - Status check
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 1. Meta / WhatsApp Business verification
  const hubChallenge = searchParams.get('hub.challenge');
  const hubVerifyToken = searchParams.get('hub.verify_token');
  const expectedSecret = process.env.WEBHOOK_SECRET || process.env.CRON_SECRET;

  if (hubChallenge) {
    if (expectedSecret && hubVerifyToken && hubVerifyToken !== expectedSecret) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    return new NextResponse(hubChallenge, { status: 200 });
  }

  // 2. Generic challenge verification (e.g. Slack Event API)
  const challenge = searchParams.get('challenge');
  if (challenge) {
    return NextResponse.json({ challenge });
  }

  // 3. Health check
  return NextResponse.json({
    status: 'online',
    service: 'Amanah Drive Universal Webhook Gateway',
    timestamp: new Date().toISOString(),
    endpoints: {
      universal: '/api/webhook',
      telegram: '/api/webhook/telegram',
      supabase: '/api/webhook/supabase',
    },
  });
}

/**
 * POST /api/webhook
 * Ingests incoming webhook events from external platforms.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Optional Secret Verification
    const expectedSecret = process.env.WEBHOOK_SECRET || process.env.CRON_SECRET;
    if (expectedSecret) {
      const authHeader = request.headers.get('authorization');
      const customSecret = request.headers.get('x-webhook-secret');
      const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
      const providedSecret = customSecret || bearerSecret;

      if (providedSecret && providedSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized: Invalid secret' }, { status: 401 });
      }
    }

    // 2. Parse Body safely
    const contentType = request.headers.get('content-type') || '';
    let payload: any = null;

    if (contentType.includes('application/json')) {
      payload = await request.json().catch(() => null);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData().catch(() => null);
      if (formData) {
        payload = Object.fromEntries(formData.entries());
      }
    } else {
      const text = await request.text().catch(() => '');
      payload = { raw: text };
    }

    // 3. Optional automated cache purge on mutation events
    if (payload?.event === 'cache.purge' || payload?.action === 'refresh') {
      await purgeServerCache();
    }

    console.log('[Webhook Received]', {
      timestamp: new Date().toISOString(),
      contentType,
      event: payload?.event || payload?.type || 'generic',
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook received successfully',
      event: payload?.event || payload?.type || 'generic',
      receivedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Webhook Error]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal webhook error' },
      { status: 500 }
    );
  }
}
