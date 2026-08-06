'use client';

import React from 'react';

interface DatePickerWIBProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | null | undefined; // YYYY-MM-DD
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
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          {label}
        </label>
      )}
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] disabled:opacity-50 ${
          error ? 'border-[var(--danger)]' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-[var(--danger)] mt-1 block">{error}</span>}
    </div>
  );
}
