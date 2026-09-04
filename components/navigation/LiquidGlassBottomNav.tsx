'use client';

import React from 'react';
import Link from 'next/link';
import { sound } from '@/lib/sound/SoundFX';
import { LucideIcon } from 'lucide-react';

export interface LiquidNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  badge?: string | number;
}

export interface LiquidGlassBottomNavProps {
  leftItems: [LiquidNavItem, LiquidNavItem];
  rightItems: [LiquidNavItem, LiquidNavItem];
  centerAction: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    title?: string;
  };
  activeId: string;
}

export function LiquidGlassBottomNav({
  leftItems,
  rightItems,
  centerAction,
  activeId,
}: LiquidGlassBottomNavProps) {
  const CenterIcon = centerAction.icon;

  // SVG dimensions for fluid scooped notch dock
  // Width: 380, Height: 68, Radius: 26, Center: 190, ScoopDepth: 26, ScoopWidth: 42
  const pathD = `M 26,0 L 148,0 C 164,0 174,26 190,26 C 206,26 216,0 232,0 L 354,0 A 26,26 0 0,1 380,26 L 380,42 A 26,26 0 0,1 354,68 L 26,68 A 26,26 0 0,1 0,42 L 0,26 A 26,26 0 0,1 26,0 Z`;

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-3 pointer-events-none select-none">
      <div className="pointer-events-auto relative w-full max-w-[384px] h-[68px]">
        {/* 1. Backdrop Blur & Frosted Glass SVG Container */}
        <div className="absolute inset-0 filter drop-shadow-[0_16px_36px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_20px_48px_rgba(0,0,0,0.6)]">
          <svg
            viewBox="0 0 380 68"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Specular Rim Light Gradient along Top Scoop & Edges */}
              <linearGradient id="liquidRimGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
                <stop offset="35%" stopColor="rgba(255, 255, 255, 0.55)" />
                <stop offset="70%" stopColor="rgba(255, 255, 255, 0.2)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 0.08)" />
              </linearGradient>

              {/* Frosted Glass Body Tint Gradient with subtle Brand Emerald tone */}
              <linearGradient id="liquidGlassBody" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--liquid-glass-dock-bg)" />
                <stop offset="50%" stopColor="var(--liquid-glass-bg)" />
                <stop offset="100%" stopColor="var(--liquid-glass-dock-bg)" />
              </linearGradient>

              {/* Frosted Glass Micro-Grain Filter */}
              <filter id="liquidFrostedGrain" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" result="noise" />
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.04 0" />
                <feComposite in2="SourceGraphic" in="glare" operator="in" />
              </filter>
            </defs>

            {/* Glass Background Path with backdrop-blur */}
            <path
              d={pathD}
              fill="url(#liquidGlassBody)"
              className="backdrop-blur-3xl saturate-200"
              style={{
                backdropFilter: 'blur(32px) saturate(200%)',
                WebkitBackdropFilter: 'blur(32px) saturate(200%)',
              }}
            />

            {/* Specular Rim Stroke */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#liquidRimGrad)"
              strokeWidth="1.2"
              className="opacity-90 dark:opacity-40"
            />
          </svg>
        </div>

        {/* 2. Elevated Circular Center Floating Action Button nestled in the Scoop */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-4 z-20">
          <button
            type="button"
            onClick={() => {
              sound.playConfirmChime();
              centerAction.onClick();
            }}
            className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#0F7A73] via-[#10B981] to-[#0A5954] text-white flex items-center justify-center border-2 border-white/50 shadow-[0_8px_24px_rgba(15,122,115,0.45),_inset_0_2px_2px_rgba(255,255,255,0.65)] hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            title={centerAction.title || centerAction.label}
            aria-label={centerAction.label}
          >
            <CenterIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300 stroke-[2.2]" />
          </button>
        </div>

        {/* 3. Navigation Items Row (2 Left, 2 Right flanking the Scoop) */}
        <div className="relative z-10 w-full h-full flex items-center justify-between px-2 pt-1">
          {/* Left Slot: 2 Items */}
          <div className="flex-1 flex items-center justify-around pr-8">
            {leftItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeId === item.id;
              const content = (
                <div className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition-all">
                  <Icon
                    className={`w-5 h-5 transition-all ${
                      isActive
                        ? 'text-[var(--brand-primary)] stroke-[2.5] scale-110 drop-shadow-[0_2px_8px_var(--brand-glow)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] stroke-[1.8]'
                    }`}
                  />
                  <span
                    className={`text-[9.5px] font-medium tracking-tight transition-all ${
                      isActive
                        ? 'text-[var(--brand-primary)] font-bold'
                        : 'text-[var(--text-secondary)] opacity-80'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-[var(--brand-primary)] absolute -bottom-0.5" />
                  )}
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[8px] font-bold bg-emerald-600 text-white rounded-full shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
              );

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      sound.playMechanicalTick();
                      item.onClick?.();
                    }}
                    className="flex items-center justify-center active:scale-95 transition-transform"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    sound.playMechanicalTick();
                    item.onClick?.();
                  }}
                  className="flex items-center justify-center active:scale-95 transition-transform"
                >
                  {content}
                </button>
              );
            })}
          </div>

          {/* Right Slot: 2 Items */}
          <div className="flex-1 flex items-center justify-around pl-8">
            {rightItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeId === item.id;
              const content = (
                <div className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition-all">
                  <Icon
                    className={`w-5 h-5 transition-all ${
                      isActive
                        ? 'text-[var(--brand-primary)] stroke-[2.5] scale-110 drop-shadow-[0_2px_8px_var(--brand-glow)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] stroke-[1.8]'
                    }`}
                  />
                  <span
                    className={`text-[9.5px] font-medium tracking-tight transition-all ${
                      isActive
                        ? 'text-[var(--brand-primary)] font-bold'
                        : 'text-[var(--text-secondary)] opacity-80'
                    }`}
                  >
                    {item.label}
                  </span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-[var(--brand-primary)] absolute -bottom-0.5" />
                  )}
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[8px] font-bold bg-emerald-600 text-white rounded-full shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
              );

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      sound.playMechanicalTick();
                      item.onClick?.();
                    }}
                    className="flex items-center justify-center active:scale-95 transition-transform"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    sound.playMechanicalTick();
                    item.onClick?.();
                  }}
                  className="flex items-center justify-center active:scale-95 transition-transform"
                >
                  {content}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
