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
      className={`group relative overflow-hidden rounded-[24px] transition-all duration-300 ${
        isHero
          ? 'bg-gradient-to-b from-[var(--bento-hero-bg)] to-[var(--bg)] border border-[var(--brand-primary)]/20 shadow-[0_4px_20px_var(--brand-glow)]'
          : 'bg-[var(--bento-bg)] border border-[var(--bento-border)] hover:border-[var(--brand-primary)]/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]'
      } p-5 md:p-6 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {/* Subtle ambient light gradient accent on hover */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-28 h-28 rounded-full bg-[var(--brand-primary)]/5 blur-2xl group-hover:bg-[var(--brand-primary)]/10 transition-colors pointer-events-none" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <span className="eyebrow-label text-[11px] font-bold tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
        {icon && (
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[var(--brand-primary-light)] text-[var(--brand-primary)] shrink-0 border border-[var(--brand-primary)]/10 shadow-xs transition-transform duration-300 group-hover:scale-105">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 relative z-10">
        <div className="text-2xl md:text-3xl font-mono font-bold text-[var(--text-primary)] tabular-num tracking-tight">
          {value}
        </div>

        {(description || trend) && (
          <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
            {trend && (
              <span
                className={`font-semibold px-2.5 py-0.5 rounded-full text-[10px] tracking-wide inline-flex items-center gap-1 ${
                  trendType === 'positive'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : trendType === 'negative'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                }`}
              >
                {trend}
              </span>
            )}
            {description && (
              <span className="text-[var(--text-muted)] text-[11px] font-medium leading-tight">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
