import React from 'react';

export type BadgeVariant = 'dot' | 'subtle' | 'outline' | 'solid';
export type BadgeColor =
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'blue'
  | 'purple'
  | 'zinc'
  | 'sky'
  | 'teal'
  | 'indigo';
export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  color?: BadgeColor;
  size?: BadgeSize;
  icon?: React.ReactNode;
  dotPing?: boolean;
  children: React.ReactNode;
}

const COLOR_MAP: Record<
  BadgeColor,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
    solidBg: string;
    solidText: string;
  }
> = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
    solidBg: 'bg-emerald-600 dark:bg-emerald-500',
    solidText: 'text-white',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
    dot: 'bg-amber-500',
    solidBg: 'bg-amber-600 dark:bg-amber-500',
    solidText: 'text-white',
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/60',
    dot: 'bg-rose-500',
    solidBg: 'bg-rose-600 dark:bg-rose-500',
    solidText: 'text-white',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/60',
    dot: 'bg-blue-500',
    solidBg: 'bg-blue-600 dark:bg-blue-500',
    solidText: 'text-white',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/60',
    dot: 'bg-purple-500',
    solidBg: 'bg-purple-600 dark:bg-purple-500',
    solidText: 'text-white',
  },
  zinc: {
    bg: 'bg-zinc-100 dark:bg-zinc-800/50',
    text: 'text-zinc-700 dark:text-zinc-300',
    border: 'border-zinc-200 dark:border-zinc-700',
    dot: 'bg-zinc-400 dark:bg-zinc-500',
    solidBg: 'bg-zinc-700 dark:bg-zinc-600',
    solidText: 'text-white',
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800/60',
    dot: 'bg-sky-500',
    solidBg: 'bg-sky-600 dark:bg-sky-500',
    solidText: 'text-white',
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800/60',
    dot: 'bg-teal-500',
    solidBg: 'bg-teal-600 dark:bg-teal-500',
    solidText: 'text-white',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    dot: 'bg-indigo-500',
    solidBg: 'bg-indigo-600 dark:bg-indigo-500',
    solidText: 'text-white',
  },
};

const SIZE_MAP: Record<BadgeSize, { container: string; text: string; dot: string }> = {
  xs: {
    container: 'px-1.5 py-0.5 gap-1',
    text: 'text-[11px] font-semibold leading-tight',
    dot: 'w-1.5 h-1.5',
  },
  sm: {
    container: 'px-2 py-0.5 gap-1.5',
    text: 'text-xs font-semibold leading-normal',
    dot: 'w-2 h-2',
  },
  md: {
    container: 'px-2.5 py-1 gap-1.5',
    text: 'text-xs font-semibold leading-normal',
    dot: 'w-2 h-2',
  },
};

/**
 * Enterprise Badge Component
 * Pengganti pill rounded-full dengan alternatif Micro-Rounded Tags (rounded-md)
 * dan Status Indicator Dots ala Linear, Stripe, dan Vercel.
 */
export function Badge({
  variant = 'dot',
  color = 'zinc',
  size = 'sm',
  icon,
  dotPing = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  const c = COLOR_MAP[color] || COLOR_MAP.zinc;
  const s = SIZE_MAP[size] || SIZE_MAP.sm;

  if (variant === 'dot') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold select-none transition-colors ${s.text} ${c.text} ${className}`}
        {...props}
      >
        <span className="relative flex shrink-0 items-center justify-center">
          {dotPing && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${c.dot}`}
            />
          )}
          <span className={`relative inline-block rounded-full ${s.dot} ${c.dot}`} />
        </span>
        {icon && <span className="shrink-0 flex items-center">{icon}</span>}
        <span className="truncate">{children}</span>
      </span>
    );
  }

  let variantStyle = '';
  switch (variant) {
    case 'outline':
      variantStyle = `bg-transparent ${c.text} border ${c.border}`;
      break;
    case 'solid':
      variantStyle = `${c.solidBg} ${c.solidText} border-transparent shadow-2xs`;
      break;
    case 'subtle':
    default:
      variantStyle = `${c.bg} ${c.text} border ${c.border}`;
      break;
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 font-medium tracking-normal select-none transition-colors ${s.text} ${variantStyle} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0 flex items-center mr-1">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
}
