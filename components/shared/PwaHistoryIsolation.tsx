'use client';

import { useEffect } from 'react';
import {
  isAdminRoute,
  isStandalonePwa,
  clearFinanceMode,
  setFinanceMode,
  checkIsFinanceMode,
} from '@/lib/utils/finance-mode';

/**
 * Memeriksa apakah sesi browser saat ini berada dalam mode Finance PWA / App
 */
export function isFinanceModeActive(): boolean {
  return checkIsFinanceMode();
}

/**
 * PwaHistoryIsolation
 * 
 * Mengisolasi history browser PWA agar tidak dapat masuk / kembali ke dashboard admin utama
 * melalui tombol Back browser saat terinstall sebagai standalone PWA.
 * Pada browser desktop tab biasa, tidak mengunci atau merusak navigasi normal admin.
 */
export function PwaHistoryIsolation() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const pathname = window.location.pathname;
      const isFinancePath = pathname.startsWith('/finance');
      const isStandalone = isStandalonePwa();

      // Jika membuka rute admin (/dashboard, /siswa, dll.), pastikan mode finance bersih!
      if (isAdminRoute(pathname)) {
        clearFinanceMode();
        return;
      }

      // 1. Jika pengguna membuka /finance, aktifkan tanda sesi mode Finance
      if (isFinancePath) {
        setFinanceMode();
      }

      const isFinance = checkIsFinanceMode(pathname);

      // Jika bukan standalone PWA (yakni browser web desktop biasa),
      // JANGAN pasang history trap dan JANGAN blokir klik link admin.
      if (!isStandalone) {
        // Pantau klik link admin untuk membersihkan flag finance seketika
        const handleDesktopLinkClick = (e: MouseEvent) => {
          const target = (e.target as HTMLElement)?.closest('a');
          if (!target) return;
          const href = target.getAttribute('href') || '';
          if (isAdminRoute(href)) {
            clearFinanceMode();
          }
        };

        document.addEventListener('click', handleDesktopLinkClick, true);
        return () => {
          document.removeEventListener('click', handleDesktopLinkClick, true);
        };
      }

      // ==========================================
      // DI BAWAH INI KHUSUS STANDALONE PWA MODE (MOBILE APP)
      // ==========================================

      // 2. Tag state saat ini sebagai root PWA independen
      window.history.replaceState({ pwaRoot: true, origin: 'pwa', isFinance }, '', window.location.href);

      // 3. Push trap state agar tombol Back browser langsung memicu event popstate tanpa keluar ke history admin
      window.history.pushState({ pwaTrapped: true, origin: 'pwa', isFinance }, '', window.location.href);

      const handlePopState = () => {
        const currentPath = window.location.pathname;

        if (isAdminRoute(currentPath)) {
          clearFinanceMode();
          return;
        }

        if (isFinance) {
          if (currentPath === '/finance' || currentPath.startsWith('/finance')) {
            window.history.pushState({ pwaTrapped: true, origin: 'pwa', isFinance: true }, '', window.location.href);
          } else if (currentPath.startsWith('/kas') || currentPath.startsWith('/nota')) {
            window.location.replace('/finance');
          }
          return;
        }

        // Default PWA popstate (Portal Instruktur)
        window.history.pushState({ pwaTrapped: true, origin: 'pwa' }, '', window.location.href);
      };

      window.addEventListener('popstate', handlePopState);

      // 4. Tangkap klik link admin pada standalone PWA
      const handleGlobalLinkClick = (e: MouseEvent) => {
        const target = (e.target as HTMLElement)?.closest('a');
        if (!target) return;

        const href = target.getAttribute('href') || '';
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

        if (isAdminRoute(href)) {
          // Jika pengguna PWA mengklik link kembali ke admin, bersihkan flag
          clearFinanceMode();
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
