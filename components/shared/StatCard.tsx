'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  isHero?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label,
  value,
  description,
  trend,
  trendType = 'neutral',
  icon,
  isHero = false,
  onClick,
  className = '',
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`relative liquid-glass-card transition-all rounded-2xl shadow-xs ${
        isHero
          ? 'border-[var(--brand-primary)]'
          : 'hover:border-[var(--brand-primary)]'
      } p-5 md:p-6 flex flex-col justify-between ${
        onClick ? 'cursor-pointer active:scale-98' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow-label text-[10px] font-mono tracking-widest text-[var(--text-muted)] font-semibold">
          {label}
        </span>
        {icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--brand-primary-light)] text-[var(--brand-primary)] shrink-0 border border-[var(--brand-primary)]/20 shadow-xs">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-xl md:text-2xl font-mono font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
          {value}
        </div>

        {(description || trend) && (
          <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
            {trend && (
              <span
                className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  trendType === 'positive'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                    : trendType === 'negative'
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40'
                    : 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/40'
                }`}
              >
                {trend}
              </span>
            )}
            {description && (
              <span className="text-[var(--text-secondary)] text-[11px] font-normal leading-tight">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
