/**
 * Finance Mode Utilities
 * Mengelola state mode Amanah Finance PWA dan memastikan tidak mengunci / membajak
 * navigasi Dashboard Admin Konsol pada web desktop browser.
 */

export const ADMIN_ROUTES = [
  '/dashboard',
  '/siswa',
  '/sim',
  '/sertifikat',
  '/jadwal',
  '/kendaraan',
  '/insiden',
  '/master-data',
  '/settings',
  '/analitik',
  '/homepage-manager',
];

/**
 * Memeriksa apakah suatu pathname merupakan rute Admin Console utama
 */
export function isAdminRoute(pathname?: string | null): boolean {
  if (!pathname) return false;
  const cleanPath = pathname.split('?')[0].split('#')[0];
  if (cleanPath === '/' || cleanPath === '') return true;
  return ADMIN_ROUTES.some((route) => cleanPath === route || cleanPath.startsWith(`${route}/`));
}

/**
 * Memeriksa apakah browser sedang berjalan dalam display mode standalone (PWA terinstalasi)
 */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  } catch {
    return false;
  }
}

let isDispatchingFinanceMode = false;

/**
 * Menghapus seluruh flag / tanda mode finance dari storage browser dan memberitahu komponen lain.
 * Dilengkapi guard idempotensi untuk mencegah rekursi dispatch event.
 */
export function clearFinanceMode(): void {
  if (typeof window === 'undefined') return;
  try {
    const wasSession = sessionStorage.getItem('amanah_finance_mode') === 'true';
    const wasLocal = localStorage.getItem('amanah_finance_mode') === 'true';
    const wasCookie = document.cookie.includes('amanah_finance_mode=true');

    // Jika sudah bersih, jangan dispatch event lagi (memutus loop rekursif)
    if (!wasSession && !wasLocal && !wasCookie) {
      return;
    }

    sessionStorage.removeItem('amanah_finance_mode');
    localStorage.removeItem('amanah_finance_mode');
    document.cookie = 'amanah_finance_mode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';

    if (!isDispatchingFinanceMode) {
      isDispatchingFinanceMode = true;
      try {
        window.dispatchEvent(new CustomEvent('amanah:finance-mode-change', { detail: { isFinance: false } }));
      } finally {
        isDispatchingFinanceMode = false;
      }
    }
  } catch {}
}

/**
 * Mengaktifkan tanda mode finance (khusus saat membuka rute /finance)
 */
export function setFinanceMode(): void {
  if (typeof window === 'undefined') return;
  try {
    const isAlreadySession = sessionStorage.getItem('amanah_finance_mode') === 'true';
    const isAlreadyLocal = localStorage.getItem('amanah_finance_mode') === 'true';

    sessionStorage.setItem('amanah_finance_mode', 'true');
    localStorage.setItem('amanah_finance_mode', 'true');
    document.cookie = 'amanah_finance_mode=true; path=/; max-age=86400; SameSite=Lax';

    if (!isAlreadySession || !isAlreadyLocal) {
      if (!isDispatchingFinanceMode) {
        isDispatchingFinanceMode = true;
        try {
          window.dispatchEvent(new CustomEvent('amanah:finance-mode-change', { detail: { isFinance: true } }));
        } finally {
          isDispatchingFinanceMode = false;
        }
      }
    }
  } catch {}
}

/**
 * Memeriksa status aktif mode Finance (Fungsi Pure Query tanpa side effect):
 * - Jika berada di rute Admin (/dashboard, /siswa, dll): FALSE.
 * - Jika berada di /finance: TRUE.
 * - Jika berada di modul Kas / Nota: TRUE HANYA jika flag finance memang aktif di storage.
 * - Rute lain: FALSE.
 */
export function checkIsFinanceMode(pathname?: string | null): boolean {
  if (typeof window === 'undefined') return false;
  const currentPath = pathname || window.location.pathname;

  // Jika membuka rute admin utama, mode finance PASTI false (tanpa efek samping memicu dispatchEvent)
  if (isAdminRoute(currentPath)) {
    return false;
  }

  // Jika URL saat ini diawali /finance, mode finance aktif
  if (currentPath.startsWith('/finance')) {
    return true;
  }

  // Jika URL saat ini diawali /kas atau /nota, cek storage apakah sesi finance tersimpan
  if (currentPath.startsWith('/kas') || currentPath.startsWith('/nota')) {
    try {
      return (
        sessionStorage.getItem('amanah_finance_mode') === 'true' ||
        localStorage.getItem('amanah_finance_mode') === 'true'
      );
    } catch {
      return false;
    }
  }

  return false;
}
