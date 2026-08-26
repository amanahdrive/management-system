'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface TimePicker24HProps {
  value?: string; // Format "HH:mm", e.g. "06:00", "21:00"
  onChange: (time: string) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export function TimePicker24H({
  value = '08:00',
  onChange,
  disabled = false,
  className = '',
  size = 'md',
}: TimePicker24HProps) {
  // Parse initial value
  const [currentH, currentM] = React.useMemo(() => {
    if (!value || typeof value !== 'string') return ['08', '00'];
    const parts = value.split(':');
    const h = parts[0] ? parts[0].padStart(2, '0').slice(0, 2) : '08';
    const m = parts[1] ? parts[1].padStart(2, '0').slice(0, 2) : '00';
    return [h, m];
  }, [value]);

  const handleHourChange = (newH: string) => {
    onChange(`${newH}:${currentM}`);
  };

  const handleMinuteChange = (newM: string) => {
    onChange(`${currentH}:${newM}`);
  };

  const isSmall = size === 'sm';

  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-2xs transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--brand-primary)]'
      } ${className}`}
    >
      <Clock className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-[var(--text-secondary)] ml-1 shrink-0`} />

      {/* Hour 00 - 23 (Format 24 Jam) */}
      <select
        value={currentH}
        disabled={disabled}
        onChange={(e) => handleHourChange(e.target.value)}
        className={`${
          isSmall ? 'px-1 py-0.5 text-[11px]' : 'px-1.5 py-1 text-xs'
        } font-bold rounded bg-transparent text-[var(--text-primary)] focus:outline-none focus:bg-[var(--bg-subtle)] cursor-pointer tabular-num`}
      >
        {HOURS_24.map((h) => (
          <option key={h} value={h} className="bg-[var(--bg)] text-[var(--text-primary)]">
            {h}
          </option>
        ))}
      </select>

      <span className="font-bold text-xs text-[var(--text-secondary)] -mx-0.5">:</span>

      {/* Minute 00 - 59 */}
      <select
        value={currentM}
        disabled={disabled}
        onChange={(e) => handleMinuteChange(e.target.value)}
        className={`${
          isSmall ? 'px-1 py-0.5 text-[11px]' : 'px-1.5 py-1 text-xs'
        } font-bold rounded bg-transparent text-[var(--text-primary)] focus:outline-none focus:bg-[var(--bg-subtle)] cursor-pointer tabular-num`}
      >
        {MINUTES_60.map((m) => (
          <option key={m} value={m} className="bg-[var(--bg)] text-[var(--text-primary)]">
            {m}
          </option>
        ))}
      </select>

      <span className="text-[10px] font-semibold text-[var(--text-secondary)] mr-1 uppercase">
        WIB
      </span>
    </div>
  );
}
