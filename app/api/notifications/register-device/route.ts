import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token || '').trim();
    const role = String(body?.role || 'finance').trim();
    const deviceName = body?.deviceName ? String(body.deviceName).slice(0, 100) : null;
    const platform = body?.platform ? String(body.platform).slice(0, 20) : 'android';

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Push token is required' },
        { status: 400 }
      );
    }

    // Upsert token
    await dbQuery(
      `INSERT INTO device_push_tokens (token, role, device_name, platform, is_active, last_used_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       ON CONFLICT (token) DO UPDATE
       SET 
         is_active = true,
         role = EXCLUDED.role,
         device_name = COALESCE(EXCLUDED.device_name, device_push_tokens.device_name),
         platform = COALESCE(EXCLUDED.platform, device_push_tokens.platform),
         last_used_at = NOW(),
         updated_at = NOW()`,
      [token, role, deviceName, platform]
    );

    return NextResponse.json({
      success: true,
      message: 'Device push token registered successfully',
    });
  } catch (err: any) {
    console.error('Error in /api/notifications/register-device:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal meregistrasi token perangkat' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token || '').trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Push token is required' },
        { status: 400 }
      );
    }

    await dbQuery(
      `UPDATE device_push_tokens SET is_active = false, updated_at = NOW() WHERE token = $1`,
      [token]
    );

    return NextResponse.json({
      success: true,
      message: 'Device unregistered successfully',
    });
  } catch (err: any) {
    console.error('Error in unregister device:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal unregister token perangkat' },
      { status: 500 }
    );
  }
}
