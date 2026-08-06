// lib/utils/currency.ts

/**
 * Format integer amount in IDR (Rupiah)
 * Example: 1500000 -> "Rp 1.500.000"
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);

  return formatted.replace('Rp', 'Rp ').replace(/\s+/g, ' ').trim();
}

/**
 * Parse string into integer Rupiah value
 * Example: "Rp 1.500.000" -> 1500000
 */
export function parseRupiah(val: string): number {
  if (!val) return 0;
  const digitsOnly = val.replace(/[^0-9]/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}
