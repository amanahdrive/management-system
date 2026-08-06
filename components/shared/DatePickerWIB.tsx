'use client';

import React from 'react';
import { formatDateIndo } from '@/lib/utils/date';
import { Calendar } from 'lucide-react';

interface DatePickerWIBProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | null | undefined; // Expects YYYY-MM-DD
  onChange: (val: string) => void;
  label?: string;
  error?: string;
}

export function DatePickerWIB({
  value,
  onChange,
  label,
  error,
  className = '',
  disabled,
  ...props
}: DatePickerWIBProps) {
  const hiddenInputRef = React.useRef<HTMLInputElement>(null);

  // Convert YYYY-MM-DD to Indonesian dd/mm/yyyy for display
  const displayFormatted = value ? formatDateIndo(value) : '';

  const handleDisplayClick = () => {
    if (disabled) return;
    if (hiddenInputRef.current) {
      if (typeof hiddenInputRef.current.showPicker === 'function') {
        try {
          hiddenInputRef.current.showPicker();
        } catch {
          hiddenInputRef.current.focus();
        }
      } else {
        hiddenInputRef.current.focus();
      }
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          {label}
        </label>
      )}

      <div className="relative w-full">
        {/* Visible Input Box displaying strict dd/mm/yyyy format */}
        <div
          onClick={handleDisplayClick}
          className={`w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] font-medium flex items-center justify-between cursor-pointer select-none transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed bg-black/5 dark:bg-white/5' : 'hover:border-[var(--brand-primary)]'
          } ${error ? 'border-[var(--danger)]' : ''} ${className}`}
        >
          <span className={displayFormatted ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>
            {displayFormatted || 'dd/mm/yyyy'}
          </span>
          <Calendar className="w-4 h-4 text-[var(--text-secondary)] shrink-0 ml-2" />
        </div>

        {/* Hidden Native Date Input for Calendar Popover */}
        <input
          ref={hiddenInputRef}
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-auto z-10"
          style={{ clipPath: 'inset(0)' }}
          {...props}
        />
      </div>

      {error && <span className="text-xs text-[var(--danger)] mt-1 block">{error}</span>}
    </div>
  );
}
