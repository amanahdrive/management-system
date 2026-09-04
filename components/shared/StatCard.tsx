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
      className={`relative border transition-all rounded-[6px] shadow-xs ${
        isHero
          ? 'bg-[var(--bento-hero-bg)] border-[var(--brand-primary)]'
          : 'bg-[var(--bento-bg)] border-[var(--bento-border)] hover:border-[var(--brand-primary)]'
      } p-4 md:p-5 flex flex-col justify-between ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow-label text-[10px] font-mono tracking-widest text-[var(--text-muted)]">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-[4px] flex items-center justify-center bg-[var(--brand-primary-light)] text-[var(--brand-primary)] shrink-0 border border-[var(--brand-primary)]/20">
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
                className={`font-mono text-[10px] font-medium px-1.5 py-0.5 rounded-[3px] border ${
                  trendType === 'positive'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : trendType === 'negative'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
                }`}
              >
                {trend}
              </span>
            )}
            {description && (
              <span className="text-[var(--text-muted)] text-[11px] font-normal leading-tight">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
