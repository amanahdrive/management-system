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

/**
 * Convert number into Indonesian written words (Terbilang)
 * Example: 1500000 -> "Satu Juta Lima Ratus Ribu Rupiah"
 */
export function terbilangRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount) || amount === 0) {
    return 'Nol Rupiah';
  }

  const angka = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  function bilangan(n: number): string {
    if (n < 12) {
      return angka[n];
    } else if (n < 20) {
      return bilangan(n - 10) + ' Belas';
    } else if (n < 100) {
      return bilangan(Math.floor(n / 10)) + ' Puluh' + (n % 10 > 0 ? ' ' + bilangan(n % 10) : '');
    } else if (n < 200) {
      return 'Seratus' + (n - 100 > 0 ? ' ' + bilangan(n - 100) : '');
    } else if (n < 1000) {
      return bilangan(Math.floor(n / 100)) + ' Ratus' + (n % 100 > 0 ? ' ' + bilangan(n % 100) : '');
    } else if (n < 2000) {
      return 'Seribu' + (n - 1000 > 0 ? ' ' + bilangan(n - 1000) : '');
    } else if (n < 1000000) {
      return bilangan(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 > 0 ? ' ' + bilangan(n % 1000) : '');
    } else if (n < 1000000000) {
      return bilangan(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 > 0 ? ' ' + bilangan(n % 1000000) : '');
    } else if (n < 1000000000000) {
      return bilangan(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 > 0 ? ' ' + bilangan(n % 1000000000) : '');
    }
    return '';
  }

  const absVal = Math.abs(Math.floor(amount));
  const hasil = bilangan(absVal).trim();
  return (amount < 0 ? 'Minus ' : '') + hasil + ' Rupiah';
}

