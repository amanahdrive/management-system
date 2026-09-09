import { NextResponse } from 'next/server';
import { addKasTransaksi, updateKasTransaksi, deleteKasTransaksi } from '@/lib/actions/kas';
import { sendPushToRole } from '@/lib/services/push-notification';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await addKasTransaksi(body);

    if (result.success) {
      // Fire-and-forget push notification to finance devices
      const nominalFmt = Number(body.nominal || 0).toLocaleString('id-ID');
      const isIncome = body.tipe === 'pemasukan';
      const channelId = isIncome ? 'finance-money-in' : 'finance-urgent';
      const title = isIncome
        ? `💰 Pemasukan Baru: Rp ${nominalFmt}`
        : `💸 Pengeluaran Baru: Rp ${nominalFmt}`;
      const desc = body.keterangan || body.kategori || 'Transaksi baru tercatat';

      sendPushToRole({
        title,
        body: desc,
        channelId,
        priority: 'high',
        data: {
          type: 'TRANSACTION_CREATED',
          tipe: body.tipe,
          nominal: body.nominal,
        },
      }).catch((err) => console.error('Error broadcasting push notification:', err));
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in POST /api/finance/transaksi:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan transaksi' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID transaksi wajib disertakan' },
        { status: 400 }
      );
    }

    const result = await updateKasTransaksi(id, updates);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in PUT /api/finance/transaksi:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui transaksi' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID transaksi wajib disertakan' },
        { status: 400 }
      );
    }

    const result = await deleteKasTransaksi(id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in DELETE /api/finance/transaksi:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus transaksi' },
      { status: 500 }
    );
  }
}
