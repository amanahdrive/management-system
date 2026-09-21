'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/navigation/Sidebar';
import { Topbar } from '@/components/navigation/Topbar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { MobileDrawer } from '@/components/navigation/MobileDrawer';
import { useUiStore } from '@/lib/store/ui-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { getCurrentUser } from '@/lib/actions/auth';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useUiStore();
  const { user, setUser, loading, setLoading } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  // Load and verify current user session
  React.useEffect(() => {
    let isMounted = true;

    async function loadAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!isMounted) return;

        if (!currentUser) {
          router.replace('/');
          return;
        }

        setUser(currentUser);
      } catch (err) {
        console.error('Failed to load session:', err);
        if (isMounted) router.replace('/');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAuth();

    return () => {
      isMounted = false;
    };
  }, [router, setUser, setLoading]);

  // If loading session, show clean centered loader
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
          <p className="text-xs text-[var(--text-secondary)] font-medium">Memuat sesi Amanah Drive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)]">
      <Sidebar />
      <Topbar />

      <main
        className={`pt-20 pb-32 md:pb-8 px-4 md:px-6 transition-all duration-300 ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-20'
        }`}
      >
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>

      <BottomNav />
      <MobileDrawer />
    </div>
  );
}
