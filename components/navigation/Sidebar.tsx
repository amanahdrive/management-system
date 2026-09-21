'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { getVisibleMenuItems, MenuItem } from '@/lib/navigation/menu-registry';
import { ASSETS } from '@/lib/assets';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUiStore();
  const { user } = useAuthStore();

  // Dynamic menu items based on user's active roles
  const menuItems = React.useMemo(() => {
    return getVisibleMenuItems(user?.roles || []);
  }, [user?.roles]);

  // Dropdown open states mapped by menu item id
  const [expandedMenus, setExpandedMenus] = React.useState<Record<string, boolean>>({});
  const [logoSrc, setLogoSrc] = React.useState<string>(ASSETS.logo.symbol);

  // Auto-expand menu that contains the active route
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
  }, [pathname, menuItems]);

  const toggleMenuExpand = (id: string) => {
    if (!sidebarOpen) {
      setSidebarOpen(true);
      setExpandedMenus((prev) => ({ ...prev, [id]: true }));
      return;
    }
    setExpandedMenus((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const navItemClass = (isActive: boolean) =>
    `group relative flex items-center ${
      sidebarOpen ? 'gap-3 px-3.5' : 'justify-center px-0'
    } py-2 text-xs font-medium transition-all rounded-xl border-l-2 ${
      isActive
        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold shadow-2xs'
        : 'border-transparent text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
    }`;

  const dropdownHeaderClass = (isActive: boolean) =>
    `w-full flex items-center ${
      sidebarOpen ? 'justify-between px-3.5' : 'justify-center px-0'
    } py-2.5 text-xs font-medium transition-colors border-l-2 ${
      isActive
        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
        : 'border-transparent text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
    }`;

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-[var(--liquid-glass-bg)] backdrop-blur-2xl border-r border-[var(--liquid-glass-border)] shadow-xs transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`h-16 flex items-center border-b border-[var(--liquid-glass-border)] ${
          sidebarOpen ? 'justify-between px-4' : 'justify-center px-2'
        }`}
      >
        {sidebarOpen ? (
          <>
            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20">
                <Image
                  src={logoSrc}
                  alt="Amanah Drive Logo"
                  width={32}
                  height={32}
                  unoptimized
                  onError={() => {
                    if (logoSrc !== '/logo-amdri-symbol.png') {
                      setLogoSrc('/logo-amdri-symbol.png');
                    }
                  }}
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
              <span className="font-brand font-bold text-base text-[var(--brand-primary)] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                Amanah Drive
              </span>
            </Link>
            <button
              onClick={toggleSidebar}
              aria-label="Ciutkan Sidebar"
              className="p-1.5 border border-[var(--liquid-glass-border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] rounded-xl transition-colors shrink-0 cursor-pointer"
              title="Ciutkan Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={toggleSidebar}
            aria-label="Buka Sidebar"
            title="Klik untuk membuka Sidebar"
            className="flex items-center justify-center p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="relative w-8 h-8 shrink-0 flex items-center justify-center overflow-hidden rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20">
              <Image
                src={logoSrc}
                alt="Amanah Drive Logo"
                width={32}
                height={32}
                unoptimized
                onError={() => {
                  if (logoSrc !== '/logo-amdri-symbol.png') {
                    setLogoSrc('/logo-amdri-symbol.png');
                  }
                }}
                className="w-full h-full object-contain p-0.5"
              />
            </div>
          </button>
        )}
      </div>

      {/* Dynamic Navigation Links */}
      <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;

          // Single direct route
          if (!item.subItems || item.subItems.length === 0) {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href || '/dashboard'}
                className={navItemClass(isActive)}
                title={!sidebarOpen ? item.title : undefined}
              >
                <Icon className="w-4 h-4 min-w-[16px]" />
                {sidebarOpen && (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="whitespace-nowrap">{item.title}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          }

          // Dropdown menu container
          const isChildActive = item.subItems.some(
            (sub) => pathname === sub.href || pathname.startsWith(`${sub.href}/`)
          );
          const isExpanded = expandedMenus[item.id] ?? false;

          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => toggleMenuExpand(item.id)}
                className={dropdownHeaderClass(isChildActive)}
                title={!sidebarOpen ? item.title : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 min-w-[16px]" />
                  {sidebarOpen && <span className="whitespace-nowrap">{item.title}</span>}
                </div>
                {sidebarOpen && (
                  isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  )
                )}
              </button>

              {sidebarOpen && isExpanded && (
                <div className="pl-4 pt-1 space-y-1 border-l border-[var(--border)] ml-5 my-1.5">
                  {item.subItems.map((sub) => {
                    const SubIcon = sub.icon;
                    const isSubActive =
                      pathname === sub.href || pathname.startsWith(`${sub.href}/`);

                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`flex items-center justify-between px-3 py-1.5 text-xs font-normal transition-all rounded-lg border-l ${
                          isSubActive
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-light)] text-[var(--brand-primary)] font-semibold'
                            : 'border-transparent text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <SubIcon className="w-3.5 h-3.5" />
                          <span>{sub.title}</span>
                        </div>
                        {sub.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
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
      </nav>

      {/* System Identification Footer (Bottom Left) */}
      <div className="p-3.5 border-t border-[var(--liquid-glass-border)] bg-black/[0.02] dark:bg-white/[0.02]">
        {sidebarOpen ? (
          <div className="text-left space-y-0.5 animate-in fade-in duration-150">
            <h4 className="text-xs font-bold tracking-tight text-[var(--text-primary)]">
              Amanah Drive Console
            </h4>
            <p className="text-[10px] text-[var(--text-secondary)] leading-tight">
              Sistem Operasional & Manajemen Internal
            </p>
            <p className="text-[9px] font-semibold text-[var(--brand-primary)] uppercase tracking-wider pt-0.5">
              CV Amanah Drive
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title="Amanah Drive Console - CV Amanah Drive">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[var(--brand-primary)] flex items-center justify-center font-bold text-[10px] shadow-2xs">
              ADC
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
