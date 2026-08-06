'use client';

import React from 'react';
import Image from 'next/image';
import { ThemeToggle } from '../shared/ThemeToggle';
import { useUiStore } from '@/lib/store/ui-store';

export function Topbar() {
  const { sidebarOpen } = useUiStore();

  return (
    <header
      className={`h-16 fixed top-0 right-0 z-30 bg-[var(--bg)] border-b border-[var(--border)] flex items-center justify-between px-4 md:px-6 transition-all duration-300 left-0 ${
        sidebarOpen ? 'md:left-64' : 'md:left-20'
      }`}
    >
      {/* Left: Mobile Brand & Page Context */}
      <div className="flex items-center gap-3">
        <div className="md:hidden flex items-center gap-2">
          <Image
            src="/assets/logo-amdri-symbol.png"
            alt="Logo"
            width={32}
            height={32}
            className="object-contain"
          />
          <span className="font-bold text-base text-[var(--brand-primary)]">Amanah Drive</span>
        </div>
      </div>

      {/* Right: Theme Toggle & Admin Badge */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
          <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold flex items-center justify-center">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-[var(--text-primary)]">Admin Staff</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Amanah Drive Palembang</div>
          </div>
        </div>
      </div>
    </header>
  );
}
