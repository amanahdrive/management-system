'use client';

import React from 'react';
import { formatRupiah, parseRupiah } from '@/lib/utils/currency';

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | null | undefined;
  onChange: (val: number) => void;
  label?: string;
  error?: string;
}

export function CurrencyInput({
  value,
  onChange,
  label,
  error,
  placeholder = 'Rp 0',
  className = '',
  disabled,
  ...props
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState<string>('');

  React.useEffect(() => {
    if (value !== undefined && value !== null) {
      setDisplayValue(formatRupiah(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const numericVal = parseRupiah(rawVal);
    setDisplayValue(rawVal ? formatRupiah(numericVal) : '');
    onChange(numericVal);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          {label}
        </label>
      )}
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
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
