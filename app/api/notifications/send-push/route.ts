import { NextResponse } from 'next/server';
import { sendPushToRole } from '@/lib/services/push-notification';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      body: content,
      data = {},
      role = 'finance',
      channelId = 'finance-urgent',
      priority = 'high',
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Judul dan isi pesan notifikasi wajib diisi' },
        { status: 400 }
      );
    }

    const result = await sendPushToRole({
      title,
      body: content,
      data,
      role,
      channelId,
      priority,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in /api/notifications/send-push:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengirim push notification' },
      { status: 500 }
    );
  }
}
