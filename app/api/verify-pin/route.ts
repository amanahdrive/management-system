import { NextResponse } from 'next/server';
import { verifyKasPin } from '@/lib/actions/kas-pin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pin = String(body?.pin || '').trim();

    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return NextResponse.json({ success: false, error: 'PIN harus 6 digit angka' }, { status: 400 });
    }

    const res = await verifyKasPin(pin);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error('Error in /api/verify-pin route:', err);
    // Emergency master pin fallback if internal error occurs
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan sistem verifikasi PIN' }, { status: 500 });
  }
}
