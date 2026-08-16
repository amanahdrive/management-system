'use client';

import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 eyebrow-label mb-1.5" aria-label="Breadcrumb">
            {breadcrumbs.map((b, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[var(--text-muted)] opacity-60">/</span>}
                {b.href ? (
                  <a href={b.href} className="hover:text-[var(--brand-primary)] transition-colors">
                    {b.label}
                  </a>
                ) : (
                  <span className="text-[var(--text-primary)] font-semibold">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-2xl md:text-3xl font-brand font-bold tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        {description && (
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
