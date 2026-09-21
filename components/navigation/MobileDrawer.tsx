'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  X,
  ChevronDown,
  ChevronUp,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { logoutAction } from '@/lib/actions/auth';
import { getVisibleMenuItems } from '@/lib/navigation/menu-registry';
import { sound } from '@/lib/sound/SoundFX';

export function MobileDrawer() {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileDrawerOpen, setMobileDrawerOpen } = useUiStore();
  const { user } = useAuthStore();

  const menuItems = React.useMemo(() => {
    return getVisibleMenuItems(user?.roles || []);
  }, [user?.roles]);

  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>({});

  // Auto-expand active menu
  React.useEffect(() => {
    const newExpanded: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.subItems) {
        const isChildActive = item.subItems.some(
          (sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`)
        );
        if (isChildActive) {
          newExpanded[item.id] = true;
        }
      }
    });
    setExpandedMenus((prev) => ({ ...prev, ...newExpanded }));
  }, [pathname, menuItems, mobileDrawerOpen]);

  const toggleMenuExpand = (id: string) => {
    setExpandedMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = async () => {
    sound.click?.();
    setMobileDrawerOpen(false);
    await logoutAction();
    router.replace('/');
  };

  React.useEffect(() => {
    if (!mobileDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileDrawerOpen, setMobileDrawerOpen]);

  if (!mobileDrawerOpen) return null;

  return (
    <div
      className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={() => setMobileDrawerOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Menu Navigasi Mobile"
    >
      <div
        className="w-4/5 max-w-xs bg-[var(--bg)] h-full p-4 flex flex-col justify-between animate-in slide-in-from-right duration-250 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)]">Amanah Console</h3>
              <p className="text-[11px] text-[var(--text-secondary)]">Menu Navigasi Terpadu</p>
            </div>
            <button
              onClick={() => setMobileDrawerOpen(false)}
              aria-label="Tutup Menu Navigasi"
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          {/* Dynamic Navigation Items */}
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;

              // Single Route Item
              if (!item.subItems || item.subItems.length === 0) {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href || '/dashboard'}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              }

              // Dropdown Container
              const isChildActive = item.subItems.some(
                (sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`)
              );
              const isExpanded = expandedMenus[item.id] ?? false;

              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggleMenuExpand(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                      isChildActive
                        ? 'bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                        : 'text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="pl-6 pt-1 space-y-1 border-l-2 border-[var(--border)] ml-4 my-1">
                      {item.subItems.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive =
                          pathname === sub.href || pathname.startsWith(`${sub.href}/`);

                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setMobileDrawerOpen(false)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                              isSubActive
                                ? 'bg-[var(--brand-primary)] text-white font-semibold'
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <SubIcon className="w-3.5 h-3.5" />
                              <span>{sub.title}</span>
                            </div>
                            {sub.badge && (
                              <span className="text-[9px] px-1 py-0.2 rounded font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                                {sub.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* User Card & Logout Button */}
        <div className="pt-4 border-t border-[var(--border)] mt-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs uppercase">
              {user?.nama?.slice(0, 2) || 'AD'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                {user?.nama || 'User'}
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {user?.roles?.includes('developer') ? (
                  <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    Developer
                  </span>
                ) : (
                  user?.roles?.map((r) => (
                    <span
                      key={r}
                      className="text-[9px] px-1 py-0.2 rounded font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 capitalize"
                    >
                      {r}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </div>
    </div>
  );
}
