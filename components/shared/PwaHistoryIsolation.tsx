'use client';

import { useEffect } from 'react';

/**
 * Memeriksa apakah sesi browser saat ini berada dalam mode Finance PWA / App
 */
export function isFinanceModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.location.pathname.startsWith('/finance') ||
      sessionStorage.getItem('amanah_finance_mode') === 'true' ||
      localStorage.getItem('amanah_finance_mode') === 'true'
    );
  } catch {
    return false;
  }
}

/**
 * PwaHistoryIsolation
 * 
 * Mengisolasi history browser PWA agar tidak dapat masuk / kembali ke dashboard admin utama
 * melalui tombol Back browser, gesture swipe back, maupun klik berulang kali.
 * Khusus Finance App: mengunci sesi eksklusif hanya pada modul Kas & Keuangan.
 */
export function PwaHistoryIsolation() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const pathname = window.location.pathname;
      const isFinancePath = pathname.startsWith('/finance');
      const isKasOrNotaPath = pathname.startsWith('/kas') || pathname.startsWith('/nota');
      const isFinance = isFinancePath || sessionStorage.getItem('amanah_finance_mode') === 'true';

      // 1. Jika pengguna membuka /finance, aktifkan tanda sesi mode Finance
      if (isFinancePath) {
        try {
          sessionStorage.setItem('amanah_finance_mode', 'true');
          localStorage.setItem('amanah_finance_mode', 'true');
          document.cookie = 'amanah_finance_mode=true; path=/; max-age=86400; SameSite=Lax';
        } catch {}
      }

      // 2. Tag state saat ini sebagai root PWA independen
      window.history.replaceState({ pwaRoot: true, origin: 'pwa', isFinance }, '', window.location.href);

      // 3. Push trap state agar tombol Back browser langsung memicu event popstate tanpa keluar ke history admin
      window.history.pushState({ pwaTrapped: true, origin: 'pwa', isFinance }, '', window.location.href);

      const handlePopState = (e: PopStateEvent) => {
        const currentPath = window.location.pathname;

        if (isFinance) {
          if (currentPath === '/finance' || currentPath.startsWith('/finance')) {
            // Di halaman utama /finance: kunci kembali di URL finance saat ini
            window.history.pushState({ pwaTrapped: true, origin: 'pwa', isFinance: true }, '', window.location.href);
          } else if (currentPath.startsWith('/kas') || currentPath.startsWith('/nota')) {
            // Di halaman submenu Kas/Nota: jika ditekan back, arahkan kembali ke /finance
            window.location.replace('/finance');
          } else {
            // Jika browser popstate memulihkan rute admin (/dashboard, /siswa, dll.), mental ke /finance
            window.location.replace('/finance');
          }
          return;
        }

        // Default PWA popstate (Portal Instruktur): kunci kembali di URL saat ini
        window.history.pushState({ pwaTrapped: true, origin: 'pwa' }, '', window.location.href);
      };

      window.addEventListener('popstate', handlePopState);

      // 4. Tangkap dan blokir klik link lokal yang mengarah ke dashboard admin utama
      const handleGlobalLinkClick = (e: MouseEvent) => {
        const target = (e.target as HTMLElement)?.closest('a');
        if (!target) return;

        const href = target.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        const adminRoutes = [
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
        ];

        if (isFinance) {
          // Izinkan navigasi sesama modul Kas & Keuangan, Nota, dan Finance
          const isAllowedFinanceRoute =
            href === '/finance' ||
            href.startsWith('/finance/') ||
            href.startsWith('/finance?') ||
            href === '/kas' ||
            href.startsWith('/kas/') ||
            href.startsWith('/kas?') ||
            href === '/nota' ||
            href.startsWith('/nota/') ||
            href.startsWith('/nota?');

          if (isAllowedFinanceRoute) {
            return;
          }

          // Blokir akses ke rute admin konsol lain dan kembalikan ke finance
          const isTargetingAdmin = adminRoutes.some(
            (route) => href === route || href.startsWith(`${route}/`) || href.startsWith(`${route}?`)
          );

          if (isTargetingAdmin) {
            e.preventDefault();
            e.stopPropagation();
            console.warn('[Finance Guard] Navigasi ke admin dashboard diblokir:', href);
            window.location.replace('/finance');
            return;
          }
        } else {
          // Mode Instruktur / PWA Biasa: blokir seluruh rute admin
          const allBlocked = [...adminRoutes, '/kas', '/nota'];
          const isTargetingAdmin = allBlocked.some(
            (route) => href === route || href.startsWith(`${route}/`) || href.startsWith(`${route}?`)
          );

          if (isTargetingAdmin) {
            e.preventDefault();
            e.stopPropagation();
            console.warn('[PWA Isolation Guard] Navigasi ke admin dashboard diblokir:', href);
          }
        }
      };

      document.addEventListener('click', handleGlobalLinkClick, true);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        document.removeEventListener('click', handleGlobalLinkClick, true);
      };
    } catch (err) {
      console.warn('[PWA Isolation Guard] Gagal menginisialisasi guard:', err);
    }
  }, []);

  return null;
}
