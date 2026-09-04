'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5" />;

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="p-2 rounded-xl border border-[var(--liquid-glass-border)] bg-white/40 dark:bg-black/20 hover:bg-white/60 dark:hover:bg-black/40 backdrop-blur-md transition-all text-[var(--text-primary)] shadow-xs active:scale-95"
      title={isDark ? 'Beralih ke Mode Terang (Default)' : 'Beralih ke Mode Gelap (Graphite Console)'}
      aria-label={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-teal-700" />
      )}
    </button>
  );
}
