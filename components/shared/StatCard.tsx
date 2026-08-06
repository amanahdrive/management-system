'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
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
  onClick,
  className = '',
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card-container flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-[var(--brand-primary)]' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs md:text-sm font-medium text-[var(--text-secondary)]">{label}</span>
        {icon && (
          <div className="p-2 rounded-md bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">{value}</div>

        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1 text-xs">
            {trend && (
              <span
                className={`font-semibold ${
                  trendType === 'positive'
                    ? 'text-[var(--success)]'
                    : trendType === 'negative'
                    ? 'text-[var(--danger)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {trend}
              </span>
            )}
            {description && <span className="text-[var(--text-secondary)]">{description}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
