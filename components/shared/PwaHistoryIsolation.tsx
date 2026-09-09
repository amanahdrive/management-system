'use client';

import { useEffect } from 'react';

/**
 * PwaHistoryIsolation
 * 
 * Mengisolasi history browser PWA agar tidak dapat masuk / kembali ke dashboard admin utama
 * melalui tombol Back browser, gesture swipe back, maupun klik berulang kali.
 * Juga mencegah navigasi link tak sengaja yang mengarah ke route admin dashboard.
 */
export function PwaHistoryIsolation() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // 1. Tag state saat ini sebagai root PWA independen
      window.history.replaceState({ pwaRoot: true, origin: 'pwa' }, '', window.location.href);

      // 2. Push trap state agar tombol Back browser langsung memicu event popstate tanpa keluar ke history admin
      window.history.pushState({ pwaTrapped: true, origin: 'pwa' }, '', window.location.href);

      const handlePopState = (e: PopStateEvent) => {
        // Setiap kali tombol back ditekan, kunci kembali di URL PWA saat ini
        window.history.pushState({ pwaTrapped: true, origin: 'pwa' }, '', window.location.href);
      };

      window.addEventListener('popstate', handlePopState);

      // 3. Tangkap dan blokir klik link lokal yang mengarah ke dashboard admin utama
      const handleGlobalLinkClick = (e: MouseEvent) => {
        const target = (e.target as HTMLElement)?.closest('a');
        if (!target) return;

        const href = target.getAttribute('href') || '';

        // Pengecualian: Izinkan navigasi ke POS Pengeluaran dari Portal Finance
        if (href === '/kas/pos' || href.startsWith('/kas/pos/') || href.startsWith('/kas/pos?')) {
          return;
        }

        const adminRoutes = [
          '/dashboard',
          '/kas',
          '/siswa',
          '/sim',
          '/sertifikat',
          '/jadwal',
          '/kendaraan',
          '/insiden',
          '/nota',
          '/master-data',
          '/settings',
          '/analitik',
        ];

        const isTargetingAdmin = adminRoutes.some(
          (route) => href === route || href.startsWith(`${route}/`) || href.startsWith(`${route}?`)
        );

        if (isTargetingAdmin) {
          e.preventDefault();
          e.stopPropagation();
          console.warn('[PWA Isolation Guard] Navigasi ke admin dashboard diblokir:', href);
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
