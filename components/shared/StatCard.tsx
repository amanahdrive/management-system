'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  isHero?: boolean;
  onClick?: () => void;
  href?: string;
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
  href,
  className = '',
}: StatCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  const isClickable = Boolean(href || onClick);

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="eyebrow-label text-[10px] font-mono tracking-widest text-[var(--text-muted)] font-semibold group-hover:text-[var(--brand-primary)] transition-colors flex items-center gap-1">
          <span>{label}</span>
          {isClickable && (
            <ArrowUpRight className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-[var(--brand-primary)] shrink-0" />
          )}
        </span>
        {icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--brand-primary-light)] text-[var(--brand-primary)] shrink-0 border border-[var(--brand-primary)]/20 shadow-xs group-hover:scale-105 group-hover:border-[var(--brand-primary)]/40 transition-all">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-lg sm:text-xl md:text-2xl font-mono font-bold text-[var(--text-primary)] tabular-nums tracking-tight break-words group-hover:text-[var(--brand-primary)] transition-colors">
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
    </>
  );

  const sharedClasses = `group relative liquid-glass-card transition-all rounded-2xl shadow-xs ${
    isHero
      ? 'border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/20'
      : 'hover:border-[var(--brand-primary)]'
  } p-5 md:p-6 flex flex-col justify-between ${
    isClickable
      ? 'cursor-pointer active:scale-98 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1'
      : ''
  } ${className}`;

  if (href) {
    return (
      <Link href={href} className={sharedClasses} tabIndex={0}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={sharedClasses}
    >
      {cardContent}
    </div>
  );
}
