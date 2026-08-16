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
      className={`${
        isHero ? 'bento-hero' : 'bento-tile'
      } p-5 flex flex-col justify-between ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow-label">{label}</span>
        {icon && (
          <div className="p-2 rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)] shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="text-2xl md:text-3xl font-brand font-bold text-[var(--text-primary)] tabular-num tracking-tight">
          {value}
        </div>

        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            {trend && (
              <span
                className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
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
