import {
  FinanceDataResponse,
  KasTransaksi,
} from '../types/finance';
import {
  getServerUrl,
  getCachedFinanceData,
  setCachedFinanceData,
} from '../services/storage';

export async function fetchFinanceData(): Promise<FinanceDataResponse> {
  const baseUrl = await getServerUrl();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${baseUrl}/api/finance/data`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data: FinanceDataResponse = await res.json();
    if (data.success) {
      // Save snapshot in local cache
      await setCachedFinanceData(data);
    }
    return data;
  } catch (err: any) {
    console.warn('Network request failed, falling back to cache:', err?.message);
    const cached = await getCachedFinanceData();
    if (cached) {
      return cached;
    }
    throw new Error(err?.message || 'Gagal terhubung ke server Amanah Finance');
  }
}

export async function verifyPinWithServer(pin: string): Promise<{ success: boolean; error?: string }> {
  const baseUrl = await getServerUrl();

  try {
    const res = await fetch(`${baseUrl}/api/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    // Offline fallback for master pin 202615 if server is unreachable
    if (pin === '202615') {
      return { success: true };
    }
    return { success: false, error: err?.message || 'Gagal memverifikasi PIN' };
  }
}

export async function submitTransaksi(
  tx: Partial<KasTransaksi>
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = await getServerUrl();

  try {
    const res = await fetch(`${baseUrl}/api/finance/transaksi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tx),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menyimpan transaksi ke server' };
  }
}

export async function deleteTransaksi(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = await getServerUrl();

  try {
    const res = await fetch(`${baseUrl}/api/finance/transaksi?id=${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal menghapus transaksi' };
  }
}
